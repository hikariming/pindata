"""
中文DataFlow Celery任务
"""
import os
import json
import logging
from datetime import datetime
from typing import Dict, Any

from celery import Task
from flask import current_app
from app.celery_app import celery
from app.db import db
from app.models import Task as TaskModel, TaskStatus
from app.models.library_file import LibraryFile
from app.services.chinese_dataflow_service import chinese_dataflow_service
from app.services.storage_service import storage_service

logger = logging.getLogger(__name__)

class ChineseDataFlowTask(Task):
    """中文DataFlow任务基类"""
    _flask_app = None

    @property
    def flask_app(self):
        if self._flask_app is None:
            from app import create_app
            self._flask_app = create_app()
        return self._flask_app

@celery.task(bind=True, base=ChineseDataFlowTask)
def process_chinese_dataflow_batch(self, task_id: str):
    """
    批量处理中文DataFlow任务
    
    Args:
        task_id: 任务ID
    """
    with self.flask_app.app_context():
        try:
            # 获取任务
            task = TaskModel.query.get(task_id)
            if not task:
                logger.error(f"任务不存在: {task_id}")
                return

            logger.info(f"开始处理中文DataFlow批量任务: {task_id}")
            
            # 获取任务配置
            pipeline_type = task.config.get('pipeline_type')
            config = task.config.get('config', {})
            
            # 获取需要处理的文件
            files = LibraryFile.query.filter(
                LibraryFile.id.in_(task.file_ids)
            ).all()
            
            if not files:
                task.status = TaskStatus.FAILED
                task.error_message = "没有找到需要处理的文件"
                task.completed_at = datetime.utcnow()
                db.session.commit()
                return
            
            # 处理所有文件
            results = []
            processed_count = 0
            failed_count = 0
            
            for i, file in enumerate(files):
                try:
                    # 更新进度
                    progress = int((i / len(files)) * 100)
                    task.progress = progress
                    task.current_file = file.filename
                    db.session.commit()
                    
                    # 处理单个文件
                    result = _process_single_file_chinese(task, file, pipeline_type, config)
                    results.append(result)
                    
                    if result.get('status') == 'completed':
                        processed_count += 1
                    else:
                        failed_count += 1
                        
                    logger.info(f"文件处理完成: {file.filename}, 状态: {result.get('status')}")
                    
                except Exception as e:
                    logger.error(f"处理文件失败: {file.filename}, 错误: {str(e)}")
                    failed_count += 1
                    results.append({
                        'file_id': file.id,
                        'filename': file.filename,
                        'status': 'failed',
                        'error': str(e),
                        'timestamp': datetime.now().isoformat()
                    })

            # 更新任务状态
            task.status = TaskStatus.COMPLETED
            task.completed_at = datetime.utcnow()
            task.processed_files = processed_count
            task.failed_files = failed_count
            task.progress = 100
            task.current_file = None
            
            # 保存结果
            task.config = task.config or {}
            task.config['processing_results'] = results
            
            db.session.commit()
            
            logger.info(f"中文DataFlow批量任务完成: {task_id}, 成功: {processed_count}, 失败: {failed_count}")
            
        except Exception as e:
            logger.error(f"中文DataFlow批量任务失败: {task_id}, 错误: {str(e)}")
            
            # 更新任务状态为失败
            task = TaskModel.query.get(task_id)
            if task:
                task.status = TaskStatus.FAILED
                task.completed_at = datetime.utcnow()
                task.error_message = str(e)
                db.session.commit()

def _process_single_file_chinese(task: TaskModel, file: LibraryFile, pipeline_type: str, config: Dict[str, Any]) -> Dict[str, Any]:
    """
    处理单个文件
    
    Args:
        task: 任务对象
        file: 文件对象
        pipeline_type: 流水线类型
        config: 配置
        
    Returns:
        处理结果
    """
    start_time = datetime.now()
    
    try:
        # 获取文件内容
        if file.converted_object_name and file.converted_format == 'markdown':
            # 使用转换后的Markdown文件
            from flask import current_app
            converted_bucket = current_app.config.get('MINIO_DATASETS_BUCKET', 'datasets')
            file_content = storage_service.get_file_content(converted_bucket, file.converted_object_name)
            if not file_content:
                raise ValueError(f"无法获取转换后的文件内容: {file.id}")
            logger.info(f"使用转换后的Markdown文件: {file.converted_object_name}")
        else:
            # 使用原始文件
            file_content = storage_service.get_file_content(file.minio_bucket, file.minio_object_name)
            if not file_content:
                raise ValueError(f"无法获取原始文件内容: {file.id}")
            logger.warning(f"使用原始文件: {file.minio_object_name}")
        
        # 清理可能存在的NUL字符
        file_content = file_content.replace('\x00', '')
        
        if not file_content.strip():
            raise ValueError(f"文件内容为空: {file.id}")
        
        logger.info(f"获取文件内容成功，长度: {len(file_content)} 字符")

        # 根据流水线类型处理文件
        if pipeline_type == 'CHINESE_PRETRAIN_FILTER':
            process_result = chinese_dataflow_service.process_chinese_pretrain_filter(file_content, config)
        elif pipeline_type == 'CHINESE_PRETRAIN_SYNTHESIS':
            process_result = chinese_dataflow_service.process_chinese_pretrain_synthesis(file_content, config)
        elif pipeline_type == 'CHINESE_CUSTOM_TASK':
            task_type = config.get('task_type', 'chinese_clean')
            process_result = chinese_dataflow_service.process_custom_task(file_content, task_type, config)
        else:
            raise ValueError(f"不支持的流水线类型: {pipeline_type}")
        
        # 检查处理结果
        if process_result.get('status') in ['failed', 'error']:
            return {
                'file_id': file.id,
                'filename': file.filename,
                'status': 'failed',
                'error': process_result.get('message') or process_result.get('error', '处理失败'),
                'processing_time': (datetime.now() - start_time).total_seconds(),
                'timestamp': datetime.now().isoformat()
            }
        
        # 获取处理后的内容
        processed_content = process_result.get('processed_text', '')
        if not processed_content:
            # 对于合成任务，可能有其他格式的结果
            if pipeline_type == 'CHINESE_PRETRAIN_SYNTHESIS':
                synthesized_content = process_result.get('synthesized_content', [])
                if synthesized_content:
                    processed_content = '\n\n'.join([item.get('content', '') for item in synthesized_content])
        
        if not processed_content:
            return {
                'file_id': file.id,
                'filename': file.filename,
                'status': 'failed',
                'error': '处理结果为空',
                'processing_time': (datetime.now() - start_time).total_seconds(),
                'timestamp': datetime.now().isoformat()
            }
        
        # 上传处理结果到MinIO
        timestamp_str = datetime.now().strftime('%Y%m%d_%H%M%S')
        bucket_name = current_app.config.get('MINIO_DEFAULT_BUCKET', 'pindata-bucket')
        
        # 生成文件名
        original_filename = file.filename
        name_without_ext = os.path.splitext(original_filename)[0]
        result_filename = f"{name_without_ext}_{pipeline_type.lower()}_{timestamp_str}.txt"
        
        # 上传处理结果
        result_object_name = f"chinese_dataflow_results/{task.id}/{file.id}_{timestamp_str}.txt"
        storage_service.upload_content(
            content=processed_content.encode('utf-8'),
            bucket=bucket_name,
            object_name=result_object_name,
            content_type='text/plain; charset=utf-8'
        )
        
        # 上传详细结果（JSON格式）
        json_object_name = f"chinese_dataflow_results/{task.id}/{file.id}_{timestamp_str}.json"
        detailed_result = {
            'file_id': file.id,
            'filename': original_filename,
            'pipeline_type': pipeline_type,
            'config': config,
            'original_content': file_content[:500] + '...' if len(file_content) > 500 else file_content,
            'processed_content': processed_content,
            'processing_result': process_result,
            'timestamp': datetime.now().isoformat()
        }
        
        storage_service.upload_content(
            content=json.dumps(detailed_result, ensure_ascii=False, indent=2).encode('utf-8'),
            bucket=bucket_name,
            object_name=json_object_name,
            content_type='application/json; charset=utf-8'
        )
        
        # 计算质量分数
        quality_score = process_result.get('quality_score', 0.0)
        
        logger.info(f"文件处理成功: {file.id}, 质量分数: {quality_score}")
        
        return {
            'file_id': file.id,
            'library_file_id': file.id,
            'filename': result_filename,
            'original_filename': original_filename,
            'status': 'completed',
            'quality_score': quality_score,
            'processing_time': (datetime.now() - start_time).total_seconds(),
            'pipeline_type': pipeline_type,
            'timestamp': datetime.now().isoformat(),
            'content_length': len(file_content),
            'processed_length': len(processed_content),
            'minio_bucket': bucket_name,
            'minio_object_name': result_object_name,
            'minio_json_object_name': json_object_name
        }
        
    except Exception as e:
        logger.error(f"处理文件失败: {file.id}, 错误: {str(e)}")
        
        return {
            'file_id': file.id,
            'filename': file.filename,
            'status': 'failed',
            'error': str(e),
            'pipeline_type': pipeline_type,
            'timestamp': datetime.now().isoformat(),
            'processing_time': (datetime.now() - start_time).total_seconds()
        } 