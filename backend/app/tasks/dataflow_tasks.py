"""
DataFlow相关的Celery任务
"""
from celery import current_task
from app.celery_app import celery
from app.services.dataflow_pipeline_service import DataFlowPipelineService
import logging

logger = logging.getLogger(__name__)

@celery.task(bind=True, name='dataflow.run_pipeline_task')
def run_dataflow_pipeline_task(self, task_id: str):
    """
    运行DataFlow流水线任务
    
    Args:
        task_id: DataFlow任务ID
        
    Returns:
        处理结果
    """
    # 创建Flask应用上下文
    from app import create_app
    app = create_app()
    
    with app.app_context():
        try:
            logger.info(f"开始执行DataFlow任务: {task_id}")
            
            # 创建服务实例
            service = DataFlowPipelineService()
            
            # 处理任务
            result = service.process_pipeline_task(task_id)
            
            logger.info(f"DataFlow任务完成: {task_id}")
            return result
            
        except Exception as e:
            logger.error(f"DataFlow任务执行失败 {task_id}: {str(e)}")
            # 确保任务状态被正确更新
            try:
                from app.models.task import Task, TaskStatus
                from app.db import db
                
                task = Task.query.get(task_id)
                if task:
                    task.status = TaskStatus.FAILED
                    task.error_message = str(e)
                    db.session.commit()
            except Exception as update_error:
                logger.error(f"更新任务状态失败: {update_error}")
            
            raise

@celery.task(bind=True, name='dataflow.process_library_batch')
def process_library_batch_task(self, library_id: str, pipeline_type: str, config: dict):
    """
    批量处理文件库的Markdown文件
    
    Args:
        library_id: 文件库ID
        pipeline_type: 流水线类型
        config: 配置参数
        
    Returns:
        处理结果
    """
    # 创建Flask应用上下文
    from app import create_app
    app = create_app()
    
    with app.app_context():
        try:
            logger.info(f"开始批量处理文件库: {library_id}")
            
            from app.models.library_file import LibraryFile
            from app.services.dataflow_pipeline_service import DataFlowPipelineService
            
            # 获取文件库中的所有Markdown文件
            markdown_files = LibraryFile.query.filter_by(
                library_id=library_id,
                converted_format='markdown'
            ).all()
            
            if not markdown_files:
                return {'success': False, 'message': '没有找到可处理的Markdown文件'}
            
            # 创建服务实例
            service = DataFlowPipelineService()
            
            # 创建并启动任务
            file_ids = [f.id for f in markdown_files]
            task = service.create_pipeline_task(
                library_id=library_id,
                file_ids=file_ids,
                pipeline_type=pipeline_type,
                config=config,
                created_by='batch_task'
            )
            
            # 直接处理任务
            result = service.process_pipeline_task(task.id)
            
            logger.info(f"批量处理完成: {library_id}")
            return {
                'success': True,
                'task_id': task.id,
                'result': result
            }
            
        except Exception as e:
            logger.error(f"批量处理失败 {library_id}: {str(e)}")
            raise 