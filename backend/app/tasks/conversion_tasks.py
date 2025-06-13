import os
import tempfile
import logging
from datetime import datetime
from celery import Task
from flask import current_app
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
import time

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
            start_time = time.time()
            logger.info(f"开始处理转换任务: {job_id}")
            
            # 获取任务信息
            job = ConversionJob.query.get(job_id)
            if not job:
                logger.error(f"转换任务不存在: {job_id}")
                return {'success': False, 'error': '任务不存在'}
            
            # 记录任务详情
            logger.info(f"任务详情 - 方法: {job.method}, 文件数: {len(job.file_details)}, 库ID: {job.library_id}")
            if job.llm_config_id:
                logger.info(f"使用LLM配置: {job.llm_config_id}")
            
            # 添加开始日志
            job.add_log(f"开始处理转换任务 - 方法: {job.method}, 文件数: {len(job.file_details)}")
            
            # 更新任务状态
            job.status = ConversionStatus.PROCESSING
            job.started_at = datetime.utcnow()
            job.task.status = TaskStatus.RUNNING
            job.task.started_at = datetime.utcnow()
            db.session.commit()
            
            # 处理每个文件
            total_files = len(job.file_details)
            processed_files = 0
            total_processing_time = 0
            
            logger.info(f"开始处理 {total_files} 个文件")
            
            for file_index, file_detail in enumerate(job.file_details, 1):
                file_start_time = time.time()
                
                try:
                    # 记录开始处理的文件
                    file_name = file_detail.library_file.original_filename
                    logger.info(f"处理文件 {file_index}/{total_files}: {file_name}")
                    job.add_log(f"开始处理文件 {file_index}/{total_files}: {file_name}")
                    
                    # 转换单个文件
                    _convert_single_file(self, file_detail, job)
                    job.completed_count += 1
                    processed_files += 1
                    
                    file_duration = time.time() - file_start_time
                    total_processing_time += file_duration
                    
                    logger.info(f"文件处理完成 {file_index}/{total_files}: {file_name}, 耗时: {file_duration:.2f}秒")
                    job.add_log(f"文件处理完成 {file_index}/{total_files}: {file_name}, 耗时: {file_duration:.2f}秒")
                    
                except Exception as e:
                    file_duration = time.time() - file_start_time
                    file_name = file_detail.library_file.original_filename if file_detail.library_file else 'unknown'
                    
                    logger.error(f"转换文件失败 {file_index}/{total_files}: {file_name}, 耗时: {file_duration:.2f}秒, 错误: {str(e)}")
                    job.add_log(f"转换文件失败 {file_index}/{total_files}: {file_name}, 错误: {str(e)}", level='ERROR')
                    file_detail.status = ConversionStatus.FAILED
                    file_detail.error_message = str(e)
                    job.failed_count += 1
                    processed_files += 1
                
                # 更新进度
                job.update_progress()
                job.task.progress = int(job.progress_percentage)
                db.session.commit()
                
                # 计算平均处理时间和预估剩余时间
                if processed_files > 0:
                    avg_time_per_file = total_processing_time / processed_files
                    remaining_files = total_files - processed_files
                    estimated_remaining_time = remaining_files * avg_time_per_file
                    
                    logger.info(f"进度统计 - 已完成: {processed_files}/{total_files} ({job.progress_percentage:.1f}%), "
                              f"平均耗时: {avg_time_per_file:.2f}秒/文件, 预计剩余: {estimated_remaining_time:.2f}秒")
                    
                    # 添加进度日志
                    if processed_files % 1 == 0:  # 每个文件都记录
                        job.add_log(f"进度更新: {processed_files}/{total_files} 文件 ({job.progress_percentage:.1f}%), "
                                  f"预计剩余: {estimated_remaining_time/60:.1f}分钟")
                
                # 更新Celery任务进度
                self.update_state(
                    state='PROGRESS',
                    meta={
                        'current': processed_files,
                        'total': total_files,
                        'progress': job.progress_percentage,
                        'current_file': job.current_file_name,
                        'completed_count': job.completed_count,
                        'failed_count': job.failed_count,
                        'avg_time_per_file': avg_time_per_file if processed_files > 0 else 0,
                        'estimated_remaining_time': estimated_remaining_time if processed_files > 0 else 0
                    }
                )
            
            # 更新任务完成状态
            total_duration = time.time() - start_time
            
            if job.failed_count == 0:
                job.status = ConversionStatus.COMPLETED
                job.task.status = TaskStatus.COMPLETED
                message = f'所有 {job.completed_count} 个文件转换成功'
            else:
                job.status = ConversionStatus.COMPLETED
                job.task.status = TaskStatus.COMPLETED
                job.error_message = f"{job.failed_count} 个文件转换失败"
                message = f"转换完成: 成功 {job.completed_count} 个, 失败 {job.failed_count} 个"
            
            job.completed_at = datetime.utcnow()
            job.task.completed_at = datetime.utcnow()
            db.session.commit()
            
            logger.info(f"转换任务完成: {job_id}, {message}, 总耗时: {total_duration:.2f}秒")
            logger.info(f"性能统计 - 平均处理时间: {total_processing_time/processed_files:.2f}秒/文件, "
                       f"总处理时间: {total_processing_time:.2f}秒")
            
            # 添加完成日志
            job.add_log(f"任务完成: {message}, 总耗时: {total_duration/60:.1f}分钟")
            if processed_files > 0:
                job.add_log(f"性能统计: 平均 {total_processing_time/processed_files:.1f}秒/文件")
            
            return {
                'success': True,
                'job_id': job_id,
                'completed_count': job.completed_count,
                'failed_count': job.failed_count,
                'total_duration': total_duration,
                'avg_time_per_file': total_processing_time / processed_files if processed_files > 0 else 0,
                'message': message
            }
            
        except Exception as e:
            total_duration = time.time() - start_time if 'start_time' in locals() else 0
            logger.error(f"处理转换任务失败 {job_id}: {str(e)}, 总耗时: {total_duration:.2f}秒")
            
            try:
                job = ConversionJob.query.get(job_id)
                if job:
                    job.status = ConversionStatus.FAILED
                    job.error_message = str(e)
                    job.task.status = TaskStatus.FAILED
                    job.task.error_message = str(e)
                    db.session.commit()
            except Exception as commit_error:
                logger.error(f"更新任务失败状态时出错: {str(commit_error)}")
            
            return {'success': False, 'error': str(e), 'duration': total_duration}

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
            current_app.config.get('MINIO_RAW_DATA_BUCKET', 'raw-data'),
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
                content_type='text/markdown; charset=utf-8',
                bucket_name=current_app.config.get('MINIO_DATASETS_BUCKET', 'datasets')
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
        
        # 添加调试信息
        logger.info(f"转换任务中获取到的LLM配置: ID={llm_config.id}, Name={llm_config.name}, Provider={llm_config.provider}")
        logger.info(f"API Key前缀: {llm_config.api_key[:10]}... (长度: {len(llm_config.api_key)})")
        
        # 强制清除LLM客户端缓存，确保使用最新配置
        if hasattr(llm_conversion_service, 'llm_cache') and llm_config.id in llm_conversion_service.llm_cache:
            logger.info(f"清除LLM客户端缓存: {llm_config.id}")
            del llm_conversion_service.llm_cache[llm_config.id]
        
        # 记录文件转换开始
        file_name = os.path.basename(file_path)
        logger.info(f"开始LLM转换 - 文件: {file_name}, 类型: {file_type}")
        logger.info(f"转换配置: enableOCR={config.get('enableOCR', True)}, extractImages={config.get('extractImages', False)}")
        
        # 定义增强的进度回调函数
        def progress_callback(current_page: int, total_pages: int):
            try:
                # 更新文件级别的进度
                file_detail.processed_pages = current_page
                file_detail.total_pages = total_pages
                
                # 计算文件内部进度百分比
                if total_pages > 0:
                    file_progress = (current_page / total_pages) * 100
                    logger.info(f"文件内部进度 - {file_name}: {current_page}/{total_pages} 页 ({file_progress:.1f}%)")
                    
                    # 添加页面进度日志到数据库
                    if hasattr(progress_callback, '_job_ref'):
                        job = progress_callback._job_ref
                        job.add_log(f"页面进度 - {file_name}: {current_page}/{total_pages} 页 ({file_progress:.1f}%)")
                else:
                    file_progress = 0
                
                # 更新数据库
                db.session.commit()
                
                # 记录进度更新
                logger.debug(f"进度回调更新成功 - 文件: {file_name}, 当前页: {current_page}, 总页数: {total_pages}")
                
            except Exception as e:
                logger.warning(f"进度回调失败 - 文件: {file_name}, 错误: {str(e)}")
        
        # 将job引用传递给回调函数（通过属性）
        progress_callback._job_ref = ConversionJob.query.get(file_detail.conversion_job_id)
        
        # 调用LLM转换服务
        start_time = time.time()
        markdown_content = llm_conversion_service.convert_document_with_vision(
            file_path=file_path,
            file_type=file_type,
            llm_config=llm_config,
            conversion_config=config,
            progress_callback=progress_callback
        )
        conversion_duration = time.time() - start_time
        
        # 记录转换完成信息
        logger.info(f"LLM转换完成 - 文件: {file_name}, 耗时: {conversion_duration:.2f}秒, 输出长度: {len(markdown_content)} 字符")
        
        # 更新LLM使用统计
        llm_config.update_usage()
        
        return markdown_content
        
    except Exception as e:
        logger.error(f"LLM转换失败 - 文件: {file_name if 'file_name' in locals() else 'unknown'}: {str(e)}")
        # 记录详细错误信息用于调试
        if 'llm_config' in locals():
            logger.error(f"LLM配置详情: Provider={llm_config.provider}, Model={llm_config.model_name}")
        raise 