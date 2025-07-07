"""
DataFlow流水线服务
"""
import os
import json
import tempfile
from typing import List, Dict, Optional, Any
from datetime import datetime
import uuid
import logging

from flask import current_app
from app.db import db
from app.models.task import Task, TaskStatus, TaskType
from app.models.dataflow_result import DataFlowResult, DataFlowQualityMetrics
from app.models.library import Library
from app.models.library_file import LibraryFile
from app.services.storage_service import storage_service

# 导入PipelineType枚举
from enum import Enum

class PipelineType(Enum):
    PRETRAIN_FILTER = "PRETRAIN_FILTER"
    PRETRAIN_SYNTHETIC = "PRETRAIN_SYNTHETIC"
    SFT_FILTER = "SFT_FILTER"
    SFT_SYNTHETIC = "SFT_SYNTHETIC"

# dataflow_integration将在运行时导入

logger = logging.getLogger(__name__)

def _clean_nul_chars(value):
    """递归清理字符串、字典和列表中的NUL字符"""
    if isinstance(value, str):
        return value.replace('\x00', '')
    elif isinstance(value, dict):
        return {k: _clean_nul_chars(v) for k, v in value.items()}
    elif isinstance(value, list):
        return [_clean_nul_chars(i) for i in value]
    else:
        return value

class DataFlowPipelineService:
    """DataFlow流水线服务"""
    
    def __init__(self):
        try:
            import sys
            import os
            # 添加项目根目录到路径
            root_path = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
            if root_path not in sys.path:
                sys.path.insert(0, root_path)
            from dataflow_integration import dataflow_integration
            self.integration = dataflow_integration
        except ImportError as e:
            logger.warning(f"DataFlow集成模块导入失败: {e}")
            self.integration = None
    
    def create_pipeline_task(
        self, 
        library_id: str, 
        file_ids: List[str], 
        pipeline_type: str,
        config: Dict[str, Any],
        task_name: str = None,
        description: str = None,
        created_by: str = "system"
    ) -> Task:
        """
        创建DataFlow流水线任务
        
        Args:
            library_id: 文件库ID
            file_ids: 文件ID列表
            pipeline_type: 流水线类型
            config: 流水线配置
            task_name: 任务名称
            description: 任务描述
            created_by: 创建者
            
        Returns:
            创建的任务对象
        """
        try:
            # 验证流水线类型
            pipeline_enum = PipelineType(pipeline_type)
            
            # 将PipelineType映射到TaskType
            task_type = TaskType(pipeline_type)
            
            # 获取文件库信息
            library = Library.query.get(library_id)
            if not library:
                raise ValueError(f"文件库不存在: {library_id}")
            
            # 验证文件
            files = LibraryFile.query.filter(
                LibraryFile.id.in_(file_ids),
                LibraryFile.library_id == library_id
            ).all()
            
            if len(files) != len(file_ids):
                raise ValueError("部分文件不存在或不属于指定文件库")
            
            # 只处理已完成转换的Markdown文件
            from app.models.library_file import ProcessStatus
            markdown_files = [f for f in files if f.converted_format == 'markdown' 
                             and f.process_status == ProcessStatus.COMPLETED 
                             and f.converted_object_name]
            if not markdown_files:
                # 提供更详细的错误信息
                pending_files = [f for f in files if f.process_status != ProcessStatus.COMPLETED]
                no_markdown_files = [f for f in files if f.converted_format != 'markdown']
                
                error_msg = "未找到可处理的Markdown文件。"
                if pending_files:
                    error_msg += f" 有 {len(pending_files)} 个文件未完成转换。"
                if no_markdown_files:
                    error_msg += f" 有 {len(no_markdown_files)} 个文件不是Markdown格式。"
                    
                raise ValueError(error_msg)
            
            # 生成任务名称
            if not task_name:
                task_name = f"{pipeline_enum.value}_{library.name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            
            # 创建任务
            task = Task(
                name=task_name,
                description=description or f"对文件库 {library.name} 执行 {pipeline_enum.value} 流水线处理",
                type=task_type,
                library_id=library_id,
                file_ids=[f.id for f in markdown_files],
                created_by=created_by,
                config=config,
                total_files=len(markdown_files),
                status=TaskStatus.PENDING
            )
            
            db.session.add(task)
            db.session.commit()
            
            logger.info(f"创建DataFlow任务成功: {task.id}")
            return task
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"创建DataFlow任务失败: {str(e)}")
            raise
    
    def start_pipeline_task(self, task_id: str) -> bool:
        """
        启动流水线任务
        
        Args:
            task_id: 任务ID
            
        Returns:
            是否启动成功
        """
        try:
            task = Task.query.get(task_id)
            if not task:
                raise ValueError(f"任务不存在: {task_id}")
            
            if task.status != TaskStatus.PENDING:
                raise ValueError(f"任务状态不允许启动: {task.status.value}")
            
            # 使用Celery异步执行任务
            from app.tasks.dataflow_tasks import run_dataflow_pipeline_task
            
            celery_task = run_dataflow_pipeline_task.delay(task_id)
            
            # 更新任务状态
            task.status = TaskStatus.RUNNING
            task.started_at = datetime.utcnow()
            task.celery_task_id = celery_task.id
            
            db.session.commit()
            
            logger.info(f"启动DataFlow任务成功: {task_id}")
            return True
            
        except Exception as e:
            logger.error(f"启动DataFlow任务失败: {str(e)}")
            return False
    
    def process_pipeline_task(self, task_id: str) -> Dict[str, Any]:
        """
        处理流水线任务（在Celery任务中调用）
        
        Args:
            task_id: 任务ID
            
        Returns:
            处理结果
        """
        task = None
        try:
            # 获取任务
            task = Task.query.get(task_id)
            if not task:
                raise ValueError(f"任务不存在: {task_id}")
            
            # 获取需要处理的文件
            files = LibraryFile.query.filter(
                LibraryFile.id.in_(task.file_ids)
            ).all()
            
            # 创建DataFlow管道
            logger.info(f"创建DataFlow管道: {task.type.value}")
            
            if task.type.value == PipelineType.PRETRAIN_FILTER.value:
                pipeline = self.integration.create_pretrain_filter_pipeline()
            elif task.type.value == PipelineType.SFT_FILTER.value:
                pipeline = self.integration.create_sft_filter_pipeline()
            else:
                # 对于其他类型，先使用模拟模式
                pipeline = self.integration.create_pretrain_filter_pipeline()
                logger.warning(f"管道类型 {task.type.value} 暂未实现，使用预训练过滤管道")
            
            # 处理所有文件
            results = []
            for file in files:
                try:
                    result = self._process_single_file(task, file, pipeline, task.type.value)
                    results.append(result)
                except Exception as e:
                    logger.error(f"处理文件失败: {file.id}, 错误: {e}")
                    results.append({
                        'file_id': file.id,
                        'status': 'failed',
                        'error': str(e)
                    })
            
            # 更新任务状态
            task.status = TaskStatus.COMPLETED
            task.completed_at = datetime.utcnow()
            task.processed_files = len(results)
            
            # 将结果存储到任务中，方便后续查询
            task.config = task.config or {}
            task.config['processing_results'] = results
            
            db.session.commit()
            
            logger.info(f"DataFlow任务完成: {task_id}")
            return {
                'task_id': task_id,
                'status': 'completed',
                'results': results,
                'total_files': len(files),
                'processed_files': len(results)
            }
            
        except Exception as e:
            logger.error(f"处理DataFlow任务失败: {task_id}, 错误: {str(e)}")
            
            # 更新任务状态为失败
            if task:
                task.status = TaskStatus.FAILED
                task.completed_at = datetime.utcnow()
                task.error_message = str(e)
                db.session.commit()
            
            # 返回可序列化的错误结果
            return {
                'task_id': task_id,
                'status': 'failed',
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }
    
    def _process_single_file(self, task: Task, file: LibraryFile, pipeline: Any, pipeline_type: str) -> Dict[str, Any]:
        """
        处理单个文件
        
        Args:
            task: 任务对象
            file: 文件对象
            pipeline: DataFlow管道
            pipeline_type: 流水线类型
            
        Returns:
            处理结果
        """
        start_time = datetime.utcnow()
        file_content = None
        try:
            # 获取文件内容 - 优先使用转换后的文件
            if file.converted_object_name and file.converted_format == 'markdown':
                # 使用转换后的Markdown文件
                # 注意：转换后的文件存储在datasets bucket中，而不是原始文件的bucket
                from flask import current_app
                converted_bucket = current_app.config.get('MINIO_DATASETS_BUCKET', 'datasets')
                file_content = storage_service.get_file_content(converted_bucket, file.converted_object_name)
                if not file_content:
                    raise ValueError(f"无法获取转换后的文件内容: {file.id}")
                logger.info(f"使用转换后的Markdown文件: bucket={converted_bucket}, object={file.converted_object_name}")
            else:
                # 如果没有转换后的文件，使用原始文件
                file_content = storage_service.get_file_content(file.minio_bucket, file.minio_object_name)
                if not file_content:
                    raise ValueError(f"无法获取原始文件内容: {file.id}")
                logger.warning(f"使用原始文件（未转换）: bucket={file.minio_bucket}, object={file.minio_object_name}")
                
                # 如果原始文件不是文本格式，应该报错
                if file.file_type.lower() not in ['txt', 'md', 'markdown']:
                    raise ValueError(f"文件未完成转换或不是文本格式，无法处理: {file.original_filename}")

            # 清理可能存在的NUL字符
            file_content = file_content.replace('\x00', '')
            
            # 验证文件内容不为空
            if not file_content.strip():
                raise ValueError(f"文件内容为空: {file.id}")
                
            logger.info(f"成功获取文件内容，长度: {len(file_content)} 字符")

            # 使用DataFlow集成处理文件内容
            logger.info(f"使用DataFlow处理文件: {file.filename}")
            
            # 直接使用传入的pipeline处理文件内容
            processed_result = pipeline.process(file_content)
            
            # 格式化处理结果
            if isinstance(processed_result, list) and len(processed_result) > 0:
                # 如果返回的是列表，提取第一个元素的raw_content
                if isinstance(processed_result[0], dict) and 'raw_content' in processed_result[0]:
                    formatted_result = processed_result[0]['raw_content']
                else:
                    formatted_result = str(processed_result[0])
            else:
                formatted_result = str(processed_result)
            
            # 生成结果数据
            result_data = {
                'file_id': file.id,
                'filename': file.filename,
                'original_content': file_content[:200] + '...' if len(file_content) > 200 else file_content,
                'processed_content': formatted_result,
                'pipeline_type': pipeline_type,
                'timestamp': datetime.now().isoformat(),
                'status': 'success'
            }
            
            # 计算质量分数
            quality_score = self._calculate_quality_score(file_content, formatted_result)
            result_data['quality_score'] = quality_score
            
            # 计算处理时间
            processing_time = (datetime.now() - start_time).total_seconds()
            result_data['processing_time'] = processing_time
            
            # 准备上传
            timestamp_str = datetime.now().strftime('%Y%m%d_%H%M%S')
            bucket_name = current_app.config.get('MINIO_DEFAULT_BUCKET', 'pindata-bucket')
            
            # 1. 存储完整的JSON元数据
            json_object_name = f"dataflow_results/{task.id}/{file.id}_{timestamp_str}.json"
            result_json = json.dumps(result_data, ensure_ascii=False, indent=2)
            storage_service.upload_content(
                content=result_json.encode('utf-8'),
                bucket=bucket_name,
                object_name=json_object_name,
                content_type='application/json'
            )

            # 2. 存储纯文本的处理结果，用于下载
            original_filename = result_data.get('filename', 'result.txt')
            _, extension = os.path.splitext(original_filename)
            if extension.lower() not in ['.txt', '.md', '.json', '.html', '.xml']:
                extension = '.txt'
            txt_object_name = f"dataflow_results/{task.id}/{file.id}_{timestamp_str}{extension}"
            
            if isinstance(formatted_result, str):
                storage_service.upload_content(
                    content=formatted_result.encode('utf-8'),
                    bucket=bucket_name,
                    object_name=txt_object_name,
                    content_type='text/plain'
                )
            else:
                # 如果结果不是字符串，也存为JSON
                storage_service.upload_content(
                    content=json.dumps(formatted_result, ensure_ascii=False).encode('utf-8'),
                    bucket=bucket_name,
                    object_name=txt_object_name,
                    content_type='application/json'
                )

            logger.info(f"文件处理成功: {file.id}")
            
            # 返回可序列化的字典，包含下载所需的MinIO信息
            return {
                'file_id': file.id,
                'library_file_id': file.id,
                'filename': original_filename,
                'status': 'completed',
                'quality_score': quality_score,
                'processing_time': processing_time,
                'pipeline_type': pipeline_type,
                'timestamp': datetime.now().isoformat(),
                'content_length': len(file_content),
                'processed_length': len(formatted_result) if isinstance(formatted_result, str) else 0,
                'minio_bucket': bucket_name,
                'minio_object_name': txt_object_name,
                'minio_json_object_name': json_object_name
            }
            
        except Exception as e:
            logger.error(f"处理文件失败: {file.id}, 错误: {str(e)}")
            
            # 返回可序列化的错误结果
            return {
                'file_id': file.id,
                'filename': file.filename,
                'status': 'failed',
                'error': str(e),
                'pipeline_type': pipeline_type,
                'timestamp': datetime.now().isoformat(),
                'processing_time': (datetime.now() - start_time).total_seconds() if 'start_time' in locals() else 0
            }
    
    def _call_dataflow_pipeline(self, content: str, config: Dict[str, Any]) -> Any:
        """
        调用DataFlow流水线处理
        
        Args:
            content: 文件内容
            config: 处理配置
            
        Returns:
            处理结果
        """
        if not self.integration:
            raise ValueError("DataFlow集成模块未初始化")
        
        try:
            # 根据流水线类型调用不同的处理方法
            pipeline_type = config.get('pipeline_type')
            pipeline_config = config.get('config', {})

            pipeline_type_lower = pipeline_type.lower()
            
            supported_dataflow_pipelines = ["pretrain_filter", "pretrain_synthetic", "reasoning", "knowledge_base"]
            
            if pipeline_type_lower in supported_dataflow_pipelines:
                return self.integration.process_text_data(
                    text_data=content,
                    pipeline_type=pipeline_type_lower,
                    config=pipeline_config
                )
            elif pipeline_type in ['SFT_FILTER', 'SFT_SYNTHETIC']:
                logger.warning(f"Pipeline type {pipeline_type} is not yet supported in dataflow_integration.py, returning original content.")
                return content
                
        except Exception as e:
            logger.error(f"DataFlow处理失败: {str(e)}")
            raise
    
    def _calculate_quality_score(self, original_content: str, processed_content: Any) -> float:
        """
        计算质量分数
        
        Args:
            original_content: 原始内容
            processed_content: 处理后内容
            
        Returns:
            质量分数 (0-100)
        """
        try:
            # 简单的质量评估逻辑
            if not processed_content:
                return 0.0
            
            # 基于内容长度的基础分数
            if isinstance(processed_content, str):
                content_length = len(processed_content)
            elif isinstance(processed_content, dict):
                content_length = len(json.dumps(processed_content))
            else:
                content_length = len(str(processed_content))
            
            # 基础分数 (0-50)
            base_score = min(50, content_length / 100)
            
            # 如果处理后内容比原内容更长，加分
            if content_length > len(original_content):
                length_bonus = min(25, (content_length - len(original_content)) / len(original_content) * 25)
            else:
                length_bonus = 0
            
            # 完整性分数 (0-25)
            completeness_score = 25 if content_length > 0 else 0
            
            total_score = base_score + length_bonus + completeness_score
            return min(100.0, total_score)
            
        except Exception as e:
            logger.error(f"计算质量分数失败: {str(e)}")
            return 0.0
    
    def _calculate_quality_metrics(self, results: List[DataFlowResult]) -> Dict[str, Any]:
        """
        计算整体质量指标
        
        Args:
            results: 处理结果列表
            
        Returns:
            质量指标字典
        """
        if not results:
            return {}
        
        try:
            quality_scores = [r.quality_score for r in results if r.quality_score is not None]
            
            if not quality_scores:
                return {}
            
            return {
                'average_quality_score': sum(quality_scores) / len(quality_scores),
                'min_quality_score': min(quality_scores),
                'max_quality_score': max(quality_scores),
                'total_processed': len(results),
                'quality_distribution': {
                    'high': len([s for s in quality_scores if s >= 80]),
                    'medium': len([s for s in quality_scores if 50 <= s < 80]),
                    'low': len([s for s in quality_scores if s < 50])
                }
            }
            
        except Exception as e:
            logger.error(f"计算质量指标失败: {str(e)}")
            return {}
    
    def get_task_status(self, task_id: str) -> Optional[Dict[str, Any]]:
        """
        获取任务状态
        
        Args:
            task_id: 任务ID
            
        Returns:
            任务状态信息
        """
        try:
            task = Task.query.get(task_id)
            if not task:
                return None
            
            return task.to_dict()
            
        except Exception as e:
            logger.error(f"获取任务状态失败: {str(e)}")
            return None
    
    def get_task_results(self, task_id: str) -> List[Dict[str, Any]]:
        """
        获取任务结果
        
        Args:
            task_id: 任务ID
            
        Returns:
            任务结果列表
        """
        try:
            # 获取任务
            task = Task.query.get(task_id)
            if not task:
                return []
            
            # 如果任务还没完成，返回空列表
            if task.status != TaskStatus.COMPLETED:
                return []
            
            # 从任务配置中获取存储的结果
            if task.config and 'processing_results' in task.config:
                return task.config['processing_results']
            
            # 如果没有存储的结果，返回空列表
            return []
            
        except Exception as e:
            logger.error(f"获取任务结果失败: {str(e)}")
            return []
    
    def cancel_task(self, task_id: str) -> bool:
        """
        取消任务
        
        Args:
            task_id: 任务ID
            
        Returns:
            是否取消成功
        """
        try:
            task = Task.query.get(task_id)
            if not task:
                return False
            
            # 如果任务正在运行，尝试取消Celery任务
            if task.celery_task_id and task.status == TaskStatus.RUNNING:
                try:
                    from app.celery_app import celery
                    celery.control.revoke(task.celery_task_id, terminate=True)
                except Exception as e:
                    logger.warning(f"取消Celery任务失败: {str(e)}")
            
            # 更新任务状态
            task.status = TaskStatus.CANCELLED
            task.completed_at = datetime.utcnow()
            task.error_message = "任务被用户取消"
            
            db.session.commit()
            
            logger.info(f"任务取消成功: {task_id}")
            return True
            
        except Exception as e:
            logger.error(f"取消任务失败: {str(e)}")
            return False
    
    def get_library_tasks(self, library_id: str) -> List[Dict[str, Any]]:
        """
        获取文件库的任务列表
        
        Args:
            library_id: 文件库ID
            
        Returns:
            任务列表
        """
        try:
            tasks = Task.query.filter_by(library_id=library_id).order_by(
                Task.created_at.desc()
            ).all()
            
            return [task.to_dict() for task in tasks]
            
        except Exception as e:
            logger.error(f"获取文件库任务失败: {str(e)}")
            return []
    
    def get_pipeline_config_template(self, pipeline_type: str) -> Dict[str, Any]:
        """
        获取流水线配置模板
        
        Args:
            pipeline_type: 流水线类型
            
        Returns:
            配置模板
        """
        templates = {
            'PRETRAIN_FILTER': {
                'min_length': 100,
                'max_length': 10000,
                'language': 'zh',
                'quality_threshold': 0.7,
                'remove_duplicates': True
            },
            'PRETRAIN_SYNTHETIC': {
                'generation_count': 5,
                'creativity_level': 0.8,
                'language': 'zh',
                'output_format': 'text'
            },
            'SFT_FILTER': {
                'min_quality_score': 0.8,
                'max_examples': 1000,
                'remove_sensitive': True,
                'language': 'zh'
            },
            'SFT_SYNTHETIC': {
                'instruction_types': ['qa', 'summarization', 'translation'],
                'examples_per_type': 10,
                'language': 'zh'
            }
        }
        
        return templates.get(pipeline_type, {})

# 创建服务实例
dataflow_pipeline_service = DataFlowPipelineService() 