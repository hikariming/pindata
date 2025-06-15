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

# 多模态数据集生成任务已暂时移除，功能开发中
# 该功能暂时移除以避免 Celery 启动错误


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
# 该功能暂时移除以避免 Celery 启动错误

