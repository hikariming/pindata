import os
import tempfile
import logging
import uuid
from datetime import datetime
from typing import List, Dict, Optional, Tuple
from app.models import (
    LibraryFile, ProcessStatus, Task, TaskType, TaskStatus, 
    ConversionJob, ConversionStatus, ConversionFileDetail,
    LLMConfig
)
from app.services.storage_service import storage_service
from app.services.llm_conversion_service import llm_conversion_service
from app.db import db
import markitdown
import asyncio

logger = logging.getLogger(__name__)

class ConversionService:
    """文档转换服务"""
    
    def __init__(self):
        self.markitdown = markitdown.MarkItDown()
    
    def create_conversion_job(
        self,
        library_id: str,
        file_ids: List[str],
        method: str,
        conversion_config: Dict
    ) -> ConversionJob:
        """创建转换任务"""
        try:
            # 创建主任务
            task = Task(
                name=f"文档转换 - {method}",
                type=TaskType.DOCUMENT_CONVERSION,
                status=TaskStatus.PENDING,
                config={
                    'library_id': library_id,
                    'file_ids': file_ids,
                    'method': method,
                    'conversion_config': conversion_config
                }
            )
            db.session.add(task)
            db.session.flush()
            
            # 创建转换任务
            conversion_job = ConversionJob(
                library_id=library_id,
                task_id=task.id,
                method=method,
                llm_config_id=conversion_config.get('llmConfigId'),
                conversion_config=conversion_config,
                file_count=len(file_ids),
                status=ConversionStatus.PENDING
            )
            db.session.add(conversion_job)
            db.session.flush()
            
            # 为每个文件创建详情记录
            for file_id in file_ids:
                file_detail = ConversionFileDetail(
                    conversion_job_id=conversion_job.id,
                    library_file_id=file_id,
                    status=ConversionStatus.PENDING
                )
                db.session.add(file_detail)
            
            db.session.commit()
            
            # 在使用时导入，避免循环导入
            from app.tasks import process_conversion_job
            
            # 使用 Celery 异步启动转换任务
            celery_task = process_conversion_job.delay(conversion_job.id)
            
            # 保存 Celery 任务 ID
            conversion_job.celery_task_id = celery_task.id
            db.session.commit()
            
            logger.info(f"已提交转换任务到队列: {conversion_job.id}, Celery任务ID: {celery_task.id}")
            
            return conversion_job
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"创建转换任务失败: {str(e)}")
            raise
    
    def _process_conversion_job(self, job_id: str):
        """处理转换任务（在后台线程中运行）"""
        try:
            # 获取任务信息
            job = ConversionJob.query.get(job_id)
            if not job:
                logger.error(f"转换任务不存在: {job_id}")
                return
            
            # 更新任务状态
            job.status = ConversionStatus.PROCESSING
            job.started_at = datetime.utcnow()
            job.task.status = TaskStatus.RUNNING
            job.task.started_at = datetime.utcnow()
            db.session.commit()
            
            # 处理每个文件
            for file_detail in job.file_details:
                try:
                    self._convert_single_file(file_detail, job)
                    job.completed_count += 1
                except Exception as e:
                    logger.error(f"转换文件失败 {file_detail.library_file_id}: {str(e)}")
                    file_detail.status = ConversionStatus.FAILED
                    file_detail.error_message = str(e)
                    job.failed_count += 1
                
                # 更新进度
                job.update_progress()
                job.task.progress = int(job.progress_percentage)
                db.session.commit()
            
            # 更新任务完成状态
            if job.failed_count == 0:
                job.status = ConversionStatus.COMPLETED
                job.task.status = TaskStatus.COMPLETED
            else:
                job.status = ConversionStatus.COMPLETED
                job.task.status = TaskStatus.COMPLETED
                job.error_message = f"{job.failed_count} 个文件转换失败"
            
            job.completed_at = datetime.utcnow()
            job.task.completed_at = datetime.utcnow()
            db.session.commit()
            
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
    
    def _convert_single_file(self, file_detail: ConversionFileDetail, job: ConversionJob):
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
                markdown_content = self._convert_with_markitdown(
                    tmp_file.name,
                    library_file.file_type,
                    job.conversion_config
                )
            else:  # vision_llm
                markdown_content = self._convert_with_llm(
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
    
    def _convert_with_markitdown(
        self, 
        file_path: str, 
        file_type: str,
        config: Dict
    ) -> str:
        """使用markitdown转换文档"""
        try:
            result = self.markitdown.convert(file_path)
            return result.text_content
        except Exception as e:
            logger.error(f"Markitdown转换失败: {str(e)}")
            raise
    
    def _convert_with_llm(
        self,
        file_path: str,
        file_type: str,
        config: Dict,
        llm_config_id: str,
        file_detail: ConversionFileDetail
    ) -> str:
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
    
    def get_conversion_job(self, job_id: str) -> Optional[ConversionJob]:
        """获取转换任务信息"""
        return ConversionJob.query.get(job_id)
    
    def cancel_conversion_job(self, job_id: str) -> bool:
        """取消转换任务"""
        try:
            job = ConversionJob.query.get(job_id)
            if not job:
                return False
            
            if job.status in [ConversionStatus.PENDING, ConversionStatus.PROCESSING]:
                job.status = ConversionStatus.CANCELLED
                job.task.status = TaskStatus.CANCELLED
                
                # 取消所有未处理的文件
                for file_detail in job.file_details:
                    if file_detail.status in [ConversionStatus.PENDING, ConversionStatus.PROCESSING]:
                        file_detail.status = ConversionStatus.CANCELLED
                
                # 取消 Celery 任务
                if job.celery_task_id:
                    from app.celery_app import celery
                    celery.control.revoke(job.celery_task_id, terminate=True)
                    logger.info(f"已取消 Celery 任务: {job.celery_task_id}")
                
                db.session.commit()
                
                return True
            
            return False
        except Exception as e:
            logger.error(f"取消转换任务失败 {job_id}: {str(e)}")
            return False

# 单例模式
conversion_service = ConversionService() 