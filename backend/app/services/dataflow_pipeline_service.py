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
from app.models.dataflow_result import DataFlowResult, DataFlowQualityMetrics, PipelineType
from app.models.library import Library
from app.models.library_file import LibraryFile
from app.services.storage_service import storage_service
# dataflow_integration将在运行时导入

logger = logging.getLogger(__name__)

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
            
            # 只处理Markdown文件
            markdown_files = [f for f in files if f.converted_format == 'markdown']
            if not markdown_files:
                raise ValueError("未找到可处理的Markdown文件")
            
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
            
            # 更新任务状态
            task.status = TaskStatus.RUNNING
            task.started_at = datetime.utcnow()
            db.session.commit()
            
            # 获取需要处理的文件
            files = LibraryFile.query.filter(
                LibraryFile.id.in_(task.file_ids)
            ).all()
            
            results = []
            total_files = len(files)
            processed_count = 0
            failed_count = 0
            
            # 处理每个文件
            for i, file in enumerate(files):
                try:
                    # 更新进度
                    task.current_file = file.original_filename
                    task.progress = int((i / total_files) * 100)
                    db.session.commit()
                    
                    # 处理单个文件
                    result = self._process_single_file(task, file)
                    results.append(result)
                    processed_count += 1
                    
                except Exception as e:
                    logger.error(f"处理文件失败 {file.id}: {str(e)}")
                    failed_count += 1
                    
                    # 更新失败统计
                    task.failed_files = failed_count
                    db.session.commit()
            
            # 更新任务统计
            task.processed_files = processed_count
            task.failed_files = failed_count
            task.progress = 100
            
            # 生成结果摘要
            results_summary = {
                'total_files': total_files,
                'processed_files': processed_count,
                'failed_files': failed_count,
                'success_rate': (processed_count / total_files * 100) if total_files > 0 else 0
            }
            
            # 计算质量指标
            quality_metrics = self._calculate_quality_metrics(results)
            
            # 更新任务状态
            task.status = TaskStatus.COMPLETED if failed_count == 0 else TaskStatus.FAILED
            task.completed_at = datetime.utcnow()
            task.results = results_summary
            task.quality_metrics = quality_metrics
            
            db.session.commit()
            
            logger.info(f"任务处理完成: {task_id}, 成功: {processed_count}, 失败: {failed_count}")
            
            return {
                'task_id': task_id,
                'status': task.status.value,
                'results': results_summary,
                'quality_metrics': quality_metrics
            }
            
        except Exception as e:
            logger.error(f"处理任务失败 {task_id}: {str(e)}")
            
            # 更新任务状态为失败
            if task:
                task.status = TaskStatus.FAILED
                task.error_message = str(e)
                task.completed_at = datetime.utcnow()
                db.session.commit()
            
            raise
    
    def _process_single_file(self, task: Task, file: LibraryFile) -> DataFlowResult:
        """
        处理单个文件
        
        Args:
            task: 任务对象
            file: 文件对象
            
        Returns:
            处理结果
        """
        start_time = datetime.utcnow()
        
        try:
            # 获取文件内容
            file_content = storage_service.get_file_content(file.minio_bucket, file.minio_object_name)
            if not file_content:
                raise ValueError(f"无法获取文件内容: {file.id}")
            
            # 根据任务类型确定处理方式
            pipeline_type = task.type.value
            
            # 准备处理配置
            process_config = {
                'pipeline_type': pipeline_type,
                'config': task.config or {}
            }
            
            # 调用DataFlow处理
            processed_result = self._call_dataflow_pipeline(file_content, process_config)
            
            # 计算质量分数
            quality_score = self._calculate_quality_score(file_content, processed_result)
            
            # 计算处理时间
            processing_time = (datetime.utcnow() - start_time).total_seconds()
            
            # 存储处理结果
            result_object_name = f"dataflow_results/{task.id}/{file.id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            
            # 将结果存储到MinIO
            result_data = {
                'original_file_id': file.id,
                'processed_content': processed_result,
                'quality_score': quality_score,
                'processing_time': processing_time,
                'metadata': {
                    'pipeline_type': pipeline_type,
                    'config': task.config
                }
            }
            
            result_json = json.dumps(result_data, ensure_ascii=False, indent=2)
            storage_service.upload_content(
                bucket=file.minio_bucket,
                object_name=result_object_name,
                content=result_json.encode('utf-8'),
                content_type='application/json'
            )
            
            # 创建结果记录
            result = DataFlowResult(
                task_id=task.id,
                original_file_id=file.id,
                library_file_id=file.id,
                original_content=file_content,
                processed_content=json.dumps(processed_result) if isinstance(processed_result, dict) else str(processed_result),
                quality_score=quality_score,
                processing_time=processing_time,
                result_metadata={'pipeline_type': pipeline_type, 'config': task.config},
                output_format='json',
                minio_bucket=file.minio_bucket,
                minio_object_name=result_object_name,
                file_size=len(result_json.encode('utf-8')),
                status='completed',
                processed_at=datetime.utcnow()
            )
            
            db.session.add(result)
            db.session.commit()
            
            logger.info(f"文件处理成功: {file.id}")
            return result
            
        except Exception as e:
            logger.error(f"文件处理失败 {file.id}: {str(e)}")
            
            # 创建失败记录
            result = DataFlowResult(
                task_id=task.id,
                original_file_id=file.id,
                library_file_id=file.id,
                original_content=file_content if 'file_content' in locals() else None,
                status='failed',
                error_message=str(e),
                processing_time=(datetime.utcnow() - start_time).total_seconds(),
                processed_at=datetime.utcnow()
            )
            
            db.session.add(result)
            db.session.commit()
            
            raise
    
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
            
            if pipeline_type == 'PRETRAIN_FILTER':
                return self.integration.run_pretrain_filter(content, pipeline_config)
            elif pipeline_type == 'PRETRAIN_SYNTHETIC':
                return self.integration.run_pretrain_synthetic(content, pipeline_config)
            elif pipeline_type == 'SFT_FILTER':
                return self.integration.run_sft_filter(content, pipeline_config)
            elif pipeline_type == 'SFT_SYNTHETIC':
                return self.integration.run_sft_synthetic(content, pipeline_config)
            else:
                raise ValueError(f"不支持的流水线类型: {pipeline_type}")
                
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
            results = DataFlowResult.query.filter_by(task_id=task_id).all()
            return [result.to_dict() for result in results]
            
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