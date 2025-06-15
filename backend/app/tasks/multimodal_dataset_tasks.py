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

@celery.task(bind=True, base=MultimodalTask)
def generate_multimodal_dataset_task(self, dataset_name: str, dataset_description: str, 
                                   file_ids: List[int], model_config: Dict[str, Any], 
                                   generation_config: Dict[str, Any]):
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


@celery.task(bind=True, base=MultimodalTask)
def generate_ai_image_qa_task(self, raw_data_id, questions, model_config, region=None, is_library_file=False):
    """
    异步生成AI图像问答标注任务
    
    Args:
        raw_data_id: 原始数据ID或LibraryFile ID
        questions: 问题列表
        model_config: 模型配置
        region: 选中的图片区域
        is_library_file: 是否为LibraryFile
    """
    
    with self.flask_app.app_context():
        task_id = self.request.id
        logger.info(f"开始AI图像问答标注任务: {task_id}")
        
        # 创建任务记录
        task_record = Task(
            name=f'AI图像问答标注-{raw_data_id}',
            type=TaskType.DATA_PROCESSING,
            status=TaskStatus.RUNNING,
            config={
                'celery_task_id': task_id,
                'raw_data_id': raw_data_id,
                'questions': questions,
                'model_config': model_config,
                'region': region,
                'is_library_file': is_library_file,
                'task_sub_type': 'ai_image_qa'
            }
        )
        db.session.add(task_record)
        db.session.commit()
        
        try:
            # 更新任务状态
            self.update_state(
                state='PROGRESS',
                meta={
                    'current': 0,
                    'total': len(questions) if questions else 8,
                    'status': '正在获取数据...',
                    'raw_data_id': raw_data_id
                }
            )
            
            # 获取数据对象
            data_object = None
            if is_library_file:
                data_object = LibraryFile.query.get(raw_data_id)
                if not data_object:
                    raise Exception(f'LibraryFile不存在: {raw_data_id}')
            else:
                data_object = RawData.query.get(raw_data_id)
                if not data_object:
                    raise Exception(f'RawData不存在: {raw_data_id}')
            
            # 初始化AI服务
            ai_service = AIAnnotationService()
            
            # 更新任务状态
            self.update_state(
                state='PROGRESS',
                meta={
                    'current': 1,
                    'total': len(questions) if questions else 8,
                    'status': '正在生成AI标注...',
                    'raw_data_id': raw_data_id
                }
            )
            
            # 生成AI标注
            if is_library_file:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                try:
                    result = loop.run_until_complete(
                        ai_service.generate_image_qa_from_library_file(
                            library_file=data_object,
                            questions=questions if questions else None,
                            model_config=model_config,
                            region=region
                        )
                    )
                finally:
                    loop.close()
            else:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                try:
                    result = loop.run_until_complete(
                        ai_service.generate_image_qa(
                            raw_data=data_object,
                            questions=questions if questions else None,
                            model_config=model_config,
                            region=region
                        )
                    )
                finally:
                    loop.close()
            
            # 更新任务状态
            self.update_state(
                state='PROGRESS',
                meta={
                    'current': len(questions) if questions else 8,
                    'total': len(questions) if questions else 8,
                    'status': '正在保存标注结果...',
                    'raw_data_id': raw_data_id
                }
            )
            
            # 如果是LibraryFile，需要找到或创建对应的RawData
            if is_library_file:
                from app.api.v1.endpoints.annotations import find_or_create_raw_data_from_library_file
                raw_data = find_or_create_raw_data_from_library_file(raw_data_id)
                if not raw_data:
                    raise Exception(f'无法为LibraryFile创建RawData记录: {raw_data_id}')
                actual_raw_data_id = raw_data.id
            else:
                actual_raw_data_id = raw_data_id
                raw_data = data_object
            
            # 创建标注记录
            annotation_data = {
                'type': 'image_qa',
                'questions_answers': result['qa_pairs'],
                'timestamp': datetime.utcnow().isoformat(),
                'total_qa_pairs': len(result['qa_pairs'])
            }
            
            # 计算平均置信度
            confidences = [qa.get('confidence', 0) for qa in result['qa_pairs'] if qa.get('confidence')]
            avg_confidence = sum(confidences) / len(confidences) if confidences else 0
            
            # 检查是否已有标注记录
            existing_annotation = GovernedData.query.filter_by(
                raw_data_id=actual_raw_data_id,
                annotation_type=AnnotationType.IMAGE_QA
            ).first()
            
            if existing_annotation:
                # 更新现有标注
                existing_annotation.ai_annotations = annotation_data
                existing_annotation.merge_annotations()
                existing_annotation.annotation_confidence = avg_confidence
                existing_annotation.annotation_metadata = result['metadata']
                existing_annotation.updated_at = datetime.utcnow()
                annotation = existing_annotation
            else:
                # 创建新的标注记录
                annotation = GovernedData(
                    project_id=data_object.library_id if is_library_file else data_object.data_source_id,
                    raw_data_id=actual_raw_data_id,
                    name=f"{raw_data.filename}_qa_annotation",
                    description=f"AI图片问答标注 - {len(result['qa_pairs'])}个问答对",
                    data_type="unstructured",
                    annotation_type=AnnotationType.IMAGE_QA,
                    annotation_source=AnnotationSource.ai_generated,
                    annotation_data=annotation_data,
                    ai_annotations=annotation_data,
                    annotation_confidence=avg_confidence,
                    annotation_metadata=result['metadata'],
                    governance_status="pending"
                )
            
            db.session.add(annotation)
            db.session.commit()
            
            # 更新任务状态为成功
            task_record.status = TaskStatus.COMPLETED
            task_record.result = {
                'annotation_id': annotation.id,
                'qa_pairs_count': len(result['qa_pairs']),
                'avg_confidence': avg_confidence,
                'metadata': result['metadata']
            }
            task_record.completed_at = datetime.utcnow()
            db.session.commit()
            
            logger.info(f"AI图像问答标注任务完成: {task_id}")
            
            return {
                'celery_task_id': task_id,
                'task_id': task_record.id,
                'annotation_id': annotation.id,
                'annotation_data': result,
                'suggested_annotation': {
                    'raw_data_id': actual_raw_data_id,
                    'project_id': data_object.library_id if is_library_file else data_object.data_source_id,
                    'questions_answers': result['qa_pairs'],
                    'annotation_source': 'ai_generated',
                    'metadata': result['metadata']
                }
            }
            
        except Exception as e:
            logger.error(f"AI图像问答标注任务失败: {str(e)}")
            
            # 更新任务状态为失败
            task_record.status = TaskStatus.FAILED
            task_record.error_message = str(e)
            task_record.completed_at = datetime.utcnow()
            db.session.commit()
            
            # 更新Celery任务状态
            self.update_state(
                state='FAILURE',
                meta={
                    'error': str(e),
                    'raw_data_id': raw_data_id
                }
            )
            
            raise Exception(f"AI图像问答标注任务失败: {str(e)}")