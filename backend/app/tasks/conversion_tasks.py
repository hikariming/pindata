import os
import tempfile
import logging
from datetime import datetime
from celery import Task
from app.celery_app import celery
from app.models import (
    ConversionJob, ConversionStatus, ConversionFileDetail,
    LibraryFile, ProcessStatus, Task as TaskModel, TaskStatus,
    LLMConfig
)
from app.services.storage_service import storage_service
from app.services.llm_conversion_service import llm_conversion_service
from app.db import db
import markitdown

logger = logging.getLogger(__name__)

class ConversionTask(Task):
    """自定义任务类，用于处理应用上下文"""
    _flask_app = None
    _markitdown = None

    @property
    def flask_app(self):
        if self._flask_app is None:
            # 延迟导入，避免循环依赖
            from app import create_app
            self._flask_app = create_app()
        return self._flask_app
    
    @property
    def markitdown(self):
        if self._markitdown is None:
            self._markitdown = markitdown.MarkItDown()
        return self._markitdown

@celery.task(base=ConversionTask, bind=True, name='tasks.process_conversion_job')
def process_conversion_job(self, job_id: str):
    """处理转换任务的Celery任务"""
    with self.flask_app.app_context():
        try:
            logger.info(f"开始处理转换任务: {job_id}")
            
            # 获取任务信息
            job = ConversionJob.query.get(job_id)
            if not job:
                logger.error(f"转换任务不存在: {job_id}")
                return {'success': False, 'error': '任务不存在'}
            
            # 更新任务状态
            job.status = ConversionStatus.PROCESSING
            job.started_at = datetime.utcnow()
            job.task.status = TaskStatus.RUNNING
            job.task.started_at = datetime.utcnow()
            db.session.commit()
            
            # 处理每个文件
            total_files = len(job.file_details)
            processed_files = 0
            
            for file_detail in job.file_details:
                try:
                    # 转换单个文件
                    _convert_single_file(self, file_detail, job)
                    job.completed_count += 1
                    processed_files += 1
                    
                except Exception as e:
                    logger.error(f"转换文件失败 {file_detail.library_file_id}: {str(e)}")
                    file_detail.status = ConversionStatus.FAILED
                    file_detail.error_message = str(e)
                    job.failed_count += 1
                    processed_files += 1
                
                # 更新进度
                job.update_progress()
                job.task.progress = int(job.progress_percentage)
                db.session.commit()
                
                # 更新Celery任务进度
                self.update_state(
                    state='PROGRESS',
                    meta={
                        'current': processed_files,
                        'total': total_files,
                        'progress': job.progress_percentage,
                        'current_file': job.current_file_name
                    }
                )
            
            # 更新任务完成状态
            if job.failed_count == 0:
                job.status = ConversionStatus.COMPLETED
                job.task.status = TaskStatus.COMPLETED
                message = '所有文件转换成功'
            else:
                job.status = ConversionStatus.COMPLETED
                job.task.status = TaskStatus.COMPLETED
                job.error_message = f"{job.failed_count} 个文件转换失败"
                message = f"转换完成，{job.failed_count} 个文件失败"
            
            job.completed_at = datetime.utcnow()
            job.task.completed_at = datetime.utcnow()
            db.session.commit()
            
            logger.info(f"转换任务完成: {job_id}, {message}")
            
            return {
                'success': True,
                'job_id': job_id,
                'completed_count': job.completed_count,
                'failed_count': job.failed_count,
                'message': message
            }
            
        except Exception as e:
            logger.error(f"处理转换任务失败 {job_id}: {str(e)}")
            try:
                job = ConversionJob.query.get(job_id)
                if job:
                    job.status = ConversionStatus.FAILED
                    job.error_message = str(e)
                    job.task.status = TaskStatus.FAILED
                    job.task.error_message = str(e)
                    db.session.commit()
            except:
                pass
            
            return {'success': False, 'error': str(e)}

def _convert_single_file(celery_task, file_detail: ConversionFileDetail, job: ConversionJob):
    """转换单个文件"""
    file_detail.status = ConversionStatus.PROCESSING
    file_detail.started_at = datetime.utcnow()
    job.current_file_name = file_detail.library_file.original_filename
    db.session.commit()
    
    library_file = file_detail.library_file
    
    # 下载原始文件
    with tempfile.NamedTemporaryFile(suffix=f".{library_file.file_type}", delete=False) as tmp_file:
        storage_service.download_file(
            'raw-data',  # 使用固定的bucket名称
            library_file.minio_object_name,
            tmp_file.name
        )
        
        # 执行转换
        if job.method == 'markitdown':
            markdown_content = _convert_with_markitdown(
                celery_task,
                tmp_file.name,
                library_file.file_type,
                job.conversion_config
            )
        else:  # vision_llm
            markdown_content = _convert_with_llm(
                tmp_file.name,
                library_file.file_type,
                job.conversion_config,
                job.llm_config_id,
                file_detail
            )
        
        # 保存转换后的文件
        markdown_filename = f"{os.path.splitext(library_file.original_filename)[0]}.md"
        markdown_object_name = f"converted/{library_file.library_id}/{library_file.id}/{markdown_filename}"
        
        # 上传到MinIO
        with tempfile.NamedTemporaryFile(mode='w', suffix='.md', encoding='utf-8', delete=False) as md_file:
            md_file.write(markdown_content)
            md_file.flush()
            
            storage_service.upload_file_from_path(
                md_file.name,
                markdown_object_name,
                content_type='text/markdown; charset=utf-8'
            )
            
            # 获取文件大小
            file_size = os.path.getsize(md_file.name)
        
        # 更新文件详情
        file_detail.converted_object_name = markdown_object_name
        file_detail.converted_file_size = file_size
        file_detail.status = ConversionStatus.COMPLETED
        file_detail.completed_at = datetime.utcnow()
        
        # 更新原始文件记录
        library_file.process_status = ProcessStatus.COMPLETED
        library_file.converted_format = 'markdown'
        library_file.converted_object_name = markdown_object_name
        library_file.converted_file_size = file_size
        library_file.conversion_method = job.method
        library_file.processed_at = datetime.utcnow()
        
        db.session.commit()
        
        # 清理临时文件
        os.unlink(tmp_file.name)
        if 'md_file' in locals():
            os.unlink(md_file.name)

def _convert_with_markitdown(celery_task, file_path: str, file_type: str, config: dict) -> str:
    """使用markitdown转换文档"""
    try:
        result = celery_task.markitdown.convert(file_path)
        return result.text_content
    except Exception as e:
        logger.error(f"Markitdown转换失败: {str(e)}")
        raise

def _convert_with_llm(file_path: str, file_type: str, config: dict, llm_config_id: str, file_detail: ConversionFileDetail) -> str:
    """使用LLM转换文档"""
    try:
        # 获取LLM配置
        llm_config = LLMConfig.query.get(llm_config_id)
        if not llm_config:
            raise ValueError(f"LLM配置不存在: {llm_config_id}")
        
        # 定义进度回调函数
        def progress_callback(current_page: int, total_pages: int):
            file_detail.processed_pages = current_page
            file_detail.total_pages = total_pages
            db.session.commit()
        
        # 调用LLM转换服务
        markdown_content = llm_conversion_service.convert_document_with_vision(
            file_path=file_path,
            file_type=file_type,
            llm_config=llm_config,
            conversion_config=config,
            progress_callback=progress_callback
        )
        
        # 更新LLM使用统计
        llm_config.update_usage()
        
        return markdown_content
        
    except Exception as e:
        logger.error(f"LLM转换失败: {str(e)}")
        raise 