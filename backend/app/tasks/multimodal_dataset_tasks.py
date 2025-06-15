import json
import logging
from typing import Dict, List, Any
from datetime import datetime
from celery import current_task, Task
import asyncio
import os
from io import BytesIO

from app.celery_app import celery
from app.db import db
from app.models import Dataset, RawData, LLMConfig, DatasetType, DatasetFormat, GovernedData, AnnotationType, AnnotationSource, Task, TaskStatus, TaskType
from app.services.ai_annotation_service import AIAnnotationService
from app.services.storage_service import StorageService
from app.models.library_file import LibraryFile

logger = logging.getLogger(__name__)

class MultimodalTask(Task):
    """多模态任务基类，处理Flask应用上下文"""
    _flask_app = None

    @property
    def flask_app(self):
        if self._flask_app is None:
            from app import create_app
            self._flask_app = create_app()
        return self._flask_app

def generate_multimodal_dataset_task(self, dataset_name, dataset_description, 
                                   file_ids, model_config, 
                                   generation_config):
    """
    异步生成多模态数据集
    
    Args:
        dataset_name: 数据集名称
        dataset_description: 数据集描述
        file_ids: 文件ID列表
        model_config: 模型配置
        generation_config: 生成配置
    """
    with self.flask_app.app_context():
        task_id = self.request.id
        logger.info(f"开始生成多模态数据集任务: {task_id}")
        
        try:
            # 更新任务状态
            self.update_state(
                state='PROGRESS',
                meta={
                    'current': 0,
                    'total': len(file_ids),
                    'status': '初始化任务...',
                    'dataset_name': dataset_name
                }
            )
            
            # 获取文件列表
            raw_files = RawData.query.filter(RawData.id.in_(file_ids)).all()
            if not raw_files:
                raise Exception("未找到指定的文件")
            
            # 创建数据集记录
            dataset = Dataset(
                name=dataset_name,
                description=dataset_description,
                owner='system',  # 添加必需的owner字段
                dataset_type=DatasetType.MULTIMODAL.value,
                dataset_format=DatasetFormat.JSONL.value,  # 默认使用JSONL格式
                status='generating',
                generation_progress=0,
                meta_data={
                    'model_config': model_config,
                    'generation_config': generation_config,
                    'total_files': len(file_ids),
                    'task_id': task_id
                }
            )
            db.session.add(dataset)
            db.session.commit()
            
            # 初始化AI服务
            ai_service = AIAnnotationService()
            storage_service = StorageService()
            
            # 处理每个文件
            generated_data = []
            processed_count = 0
            
            for i, raw_file in enumerate(raw_files):
                try:
                    logger.info(f"处理文件 {i+1}/{len(raw_files)}: {raw_file.filename}")
                    
                    # 更新进度
                    self.update_state(
                        state='PROGRESS',
                        meta={
                            'current': i,
                            'total': len(raw_files),
                            'status': f'处理文件: {raw_file.filename}',
                            'dataset_name': dataset_name,
                            'dataset_id': dataset.id
                        }
                    )
                    
                    # 根据文件类型生成数据
                    if raw_file.file_category == 'image':
                        # 创建事件循环运行异步函数
                        loop = asyncio.new_event_loop()
                        asyncio.set_event_loop(loop)
                        try:
                            file_data = loop.run_until_complete(
                                _process_image_file(ai_service, raw_file, model_config, generation_config)
                            )
                        finally:
                            loop.close()
                    elif raw_file.file_category == 'video':
                        # 创建事件循环运行异步函数
                        loop = asyncio.new_event_loop()
                        asyncio.set_event_loop(loop)
                        try:
                            file_data = loop.run_until_complete(
                                _process_video_file(ai_service, raw_file, model_config, generation_config)
                            )
                        finally:
                            loop.close()
                    else:
                        logger.warning(f"不支持的文件类型: {raw_file.file_category}")
                        continue
                    
                    if file_data:
                        generated_data.append(file_data)
                        processed_count += 1
                    
                    # 更新数据集进度
                    progress = int((i + 1) / len(raw_files) * 100)
                    dataset.generation_progress = progress
                    db.session.commit()
                    
                except Exception as e:
                    logger.error(f"处理文件 {raw_file.filename} 失败: {str(e)}")
                    # 继续处理其他文件
                    continue
            
            # 保存生成的数据集
            if generated_data:
                dataset_content = _format_dataset_content(generated_data, generation_config)
                
                # 保存到MinIO
                file_extension = generation_config.get('output_format', 'jsonl')
                filename = f"{dataset_name}.{file_extension}"
                
                content_bytes = dataset_content.encode('utf-8')
                object_name, file_size = storage_service.upload_file(
                    file_data=BytesIO(content_bytes),
                    original_filename=filename,
                    content_type='application/json' if file_extension in ['json', 'jsonl'] else 'text/csv'
                )
                
                # 更新数据集记录
                dataset.status = 'completed'
                dataset.generation_progress = 100
                dataset.file_path = object_name
                dataset.file_size = file_size
                dataset.record_count = len(generated_data)
                dataset.completed_at = datetime.utcnow()
                
                success_message = f"成功生成多模态数据集，处理了 {processed_count}/{len(raw_files)} 个文件"
                
            else:
                dataset.status = 'failed'
                dataset.error_message = "未能从任何文件中生成有效数据"
                success_message = None
            
            db.session.commit()
            
            # 返回最终结果
            result = {
                'dataset_id': dataset.id,
                'dataset_name': dataset_name,
                'status': dataset.status,
                'processed_files': processed_count,
                'total_files': len(raw_files),
                'record_count': dataset.record_count,
                'file_path': dataset.file_path,
                'completed_at': dataset.completed_at.isoformat() if dataset.completed_at else None
            }
            
            if success_message:
                result['message'] = success_message
                logger.info(f"多模态数据集生成完成: {task_id}")
            else:
                result['error'] = dataset.error_message
                logger.error(f"多模态数据集生成失败: {task_id}")
            
            return result
            
        except Exception as e:
            logger.error(f"多模态数据集生成任务失败: {str(e)}")
            
            # 更新数据集状态为失败
            try:
                if 'dataset' in locals():
                    dataset.status = 'failed'
                    dataset.error_message = str(e)
                    db.session.commit()
            except:
                pass
            
            # 更新Celery任务状态
            self.update_state(
                state='FAILURE',
                meta={
                    'error': str(e),
                    'dataset_name': dataset_name
                }
            )
            
            raise Exception(f"多模态数据集生成失败: {str(e)}")


# 显式注册任务，避免装饰器问题
generate_multimodal_dataset_task = celery.task(name='tasks.generate_multimodal_dataset', bind=True, base=MultimodalTask)(generate_multimodal_dataset_task)


async def _process_image_file(ai_service: AIAnnotationService, raw_file: RawData, 
                            model_config: Dict[str, Any], generation_config: Dict[str, Any]) -> Dict[str, Any]:
    """处理图片文件"""
    file_data = {
        'file_id': raw_file.id,
        'filename': raw_file.filename,
        'file_type': 'image',
        'file_path': raw_file.minio_object_name,
        'metadata': {
            'width': raw_file.image_width,
            'height': raw_file.image_height,
            'format': raw_file.file_extension,
            'color_mode': raw_file.color_mode
        },
        'annotations': []
    }
    
    try:
        # 生成图片问答
        qa_per_image = generation_config.get('qa_per_image', 5)
        custom_questions = generation_config.get('custom_questions', [])
        
        # 使用自定义问题或默认问题
        questions = custom_questions if custom_questions else None
        
        qa_result = await ai_service.generate_image_qa(
            raw_data=raw_file,
            questions=questions,
            model_config=model_config
        )
        
        if qa_result.get('qa_pairs'):
            # 限制问答对数量
            qa_pairs = qa_result['qa_pairs'][:qa_per_image]
            file_data['annotations'].append({
                'type': 'question_answer',
                'data': qa_pairs,
                'model_info': qa_result.get('metadata', {})
            })
        
        # 生成图片描述（如果启用）
        if generation_config.get('include_captions', True):
            caption_result = await ai_service.generate_image_caption(
                raw_data=raw_file,
                model_config=model_config
            )
            
            if caption_result.get('caption'):
                file_data['annotations'].append({
                    'type': 'caption',
                    'data': {
                        'caption': caption_result['caption'],
                        'confidence': caption_result.get('confidence', 0.0)
                    },
                    'model_info': caption_result.get('metadata', {})
                })
        
        # 对象检测（如果启用）
        if generation_config.get('include_object_detection', False):
            try:
                detection_result = await ai_service.detect_objects_in_image(
                    raw_data=raw_file
                )
                
                if detection_result.get('detections'):
                    file_data['annotations'].append({
                        'type': 'object_detection',
                        'data': detection_result['detections'],
                        'model_info': detection_result.get('metadata', {})
                    })
            except Exception as e:
                logger.warning(f"对象检测失败: {str(e)}")
        
        return file_data
        
    except Exception as e:
        logger.error(f"处理图片文件失败: {str(e)}")
        file_data['error'] = str(e)
        return file_data


async def _process_video_file(ai_service: AIAnnotationService, raw_file: RawData, 
                            model_config: Dict[str, Any], generation_config: Dict[str, Any]) -> Dict[str, Any]:
    """处理视频文件"""
    file_data = {
        'file_id': raw_file.id,
        'filename': raw_file.filename,
        'file_type': 'video',
        'file_path': raw_file.minio_object_name,
        'metadata': {
            'duration': raw_file.video_duration,
            'width': raw_file.video_width,
            'height': raw_file.video_height,
            'format': raw_file.file_extension,
            'fps': raw_file.video_fps
        },
        'annotations': []
    }
    
    try:
        # 生成视频字幕（如果AI服务支持）
        try:
            transcript_result = await ai_service.generate_video_transcript(
                raw_data=raw_file,
                language='zh'
            )
            
            if transcript_result.get('transcript_segments'):
                file_data['annotations'].append({
                    'type': 'transcript',
                    'data': transcript_result['transcript_segments'],
                    'model_info': transcript_result.get('metadata', {})
                })
        except Exception as e:
            logger.warning(f"视频字幕生成失败: {str(e)}")
        
        # TODO: 可以添加视频关键帧提取和问答生成
        
        return file_data
        
    except Exception as e:
        logger.error(f"处理视频文件失败: {str(e)}")
        file_data['error'] = str(e)
        return file_data


def _format_dataset_content(data: List[Dict[str, Any]], generation_config: Dict[str, Any]) -> str:
    """格式化数据集内容"""
    output_format = generation_config.get('output_format', 'jsonl').lower()
    
    if output_format == 'jsonl':
        # 转换为JSONL格式（每行一个JSON对象）
        lines = []
        for file_data in data:
            for annotation in file_data.get('annotations', []):
                if annotation['type'] == 'question_answer':
                    for qa in annotation['data']:
                        record = {
                            'file_id': file_data['file_id'],
                            'filename': file_data['filename'],
                            'file_type': file_data['file_type'],
                            'question': qa['question'],
                            'answer': qa['answer'],
                            'confidence': qa.get('confidence', 0.0),
                            'model': qa.get('model', ''),
                            'timestamp': qa.get('timestamp', ''),
                            'metadata': file_data.get('metadata', {})
                        }
                        lines.append(json.dumps(record, ensure_ascii=False))
                
                elif annotation['type'] == 'caption':
                    record = {
                        'file_id': file_data['file_id'],
                        'filename': file_data['filename'],
                        'file_type': file_data['file_type'],
                        'type': 'caption',
                        'caption': annotation['data']['caption'],
                        'confidence': annotation['data'].get('confidence', 0.0),
                        'metadata': file_data.get('metadata', {})
                    }
                    lines.append(json.dumps(record, ensure_ascii=False))
        
        return '\n'.join(lines)
    
    elif output_format == 'json':
        # 返回完整的JSON结构
        return json.dumps({
            'dataset_info': {
                'generated_at': datetime.utcnow().isoformat(),
                'total_files': len(data),
                'generation_config': generation_config
            },
            'data': data
        }, ensure_ascii=False, indent=2)
    
    elif output_format == 'csv':
        # 转换为CSV格式（简化版）
        import csv
        from io import StringIO
        
        output = StringIO()
        writer = csv.writer(output)
        
        # 写入标题行
        headers = ['file_id', 'filename', 'file_type', 'type', 'question', 'answer', 'confidence']
        writer.writerow(headers)
        
        # 写入数据行
        for file_data in data:
            for annotation in file_data.get('annotations', []):
                if annotation['type'] == 'question_answer':
                    for qa in annotation['data']:
                        writer.writerow([
                            file_data['file_id'],
                            file_data['filename'],
                            file_data['file_type'],
                            'qa',
                            qa['question'],
                            qa['answer'],
                            qa.get('confidence', 0.0)
                        ])
                elif annotation['type'] == 'caption':
                    writer.writerow([
                        file_data['file_id'],
                        file_data['filename'],
                        file_data['file_type'],
                        'caption',
                        '',
                        annotation['data']['caption'],
                        annotation['data'].get('confidence', 0.0)
                    ])
        
        return output.getvalue()
    
    else:
        raise ValueError(f"不支持的输出格式: {output_format}")


# AI图像问答任务已暂时移除，功能开发中
# 保留任务注册以避免调用时出现未找到任务的错误
def ai_image_qa_task_placeholder(self, *args, **kwargs):
    """AI图像问答任务占位符 - 功能开发中"""
    logger.info("AI图像问答任务被调用，但功能正在开发中")
    return {
        'message': '该功能正在开发中，敬请期待',
        'status': 'under_development',
        'qa_pairs': [],
        'metadata': {
            'error': 'AI图像问答功能正在开发中，暂时无法使用',
            'total_questions': 0,
            'avg_confidence': 0
        }
    }

# 注册占位符任务
ai_image_qa_task = celery.task(name='tasks.ai_image_qa', base=MultimodalTask, bind=True)(ai_image_qa_task_placeholder)

