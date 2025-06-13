import os
import shutil
import tempfile
import logging
import requests
import time
import zipfile
import subprocess
from datetime import datetime
from typing import Dict, Optional, Any, List
from urllib.parse import urlparse
from celery import Task
from flask import current_app
from huggingface_hub import hf_hub_download, snapshot_download, HfApi
from modelscope.hub.snapshot_download import snapshot_download as ms_snapshot_download
from modelscope.hub.api import HubApi
from modelscope.hub.file_download import model_file_download
from app.celery_app import celery
from app.db import db
from app.models import (
    Dataset, DatasetTag, DatasetVersion, 
    Task as TaskModel, TaskStatus, TaskType
)
from app.services.storage_service import storage_service

logger = logging.getLogger(__name__)

class DatasetImportTask(Task):
    """数据集导入任务基类"""
    _flask_app = None

    @property
    def flask_app(self):
        if self._flask_app is None:
            from app import create_app
            self._flask_app = create_app()
        return self._flask_app

@celery.task(base=DatasetImportTask, bind=True, name='tasks.import_dataset')
def import_dataset_task(self, dataset_id: int, import_method: str, import_url: str, task_id: int):
    """
    导入数据集的Celery任务
    
    Args:
        dataset_id: 数据集ID
        import_method: 导入方法 ('huggingface' 或 'modelscope')
        import_url: 导入URL或路径
        task_id: 关联的任务ID
    """
    with self.flask_app.app_context():
        start_time = time.time()
        task = None
        dataset = None
        
        try:
            logger.info(f"开始导入数据集: dataset_id={dataset_id}, method={import_method}, url={import_url}")
            
            # 获取任务和数据集对象
            task = TaskModel.query.get(task_id)
            dataset = Dataset.query.get(dataset_id)
            
            if not task or not dataset:
                raise Exception(f"任务或数据集不存在: task_id={task_id}, dataset_id={dataset_id}")
            
            # 更新任务状态为运行中
            task.status = TaskStatus.RUNNING
            task.started_at = datetime.utcnow()
            task.progress = 0
            db.session.commit()
            
            # 更新Celery任务状态
            self.update_state(
                state='PROGRESS',
                meta={
                    'current': 0,
                    'total': 100,
                    'status': '开始导入数据集...',
                    'dataset_name': dataset.name
                }
            )
            
            # 根据导入方法执行不同的导入逻辑
            if import_method == 'huggingface':
                result = _import_from_huggingface(self, import_url, dataset, task)
            elif import_method == 'modelscope':
                result = _import_from_modelscope(self, import_url, dataset, task)
            else:
                raise Exception(f"不支持的导入方法: {import_method}")
            
            # 更新任务完成状态
            task.status = TaskStatus.COMPLETED
            task.completed_at = datetime.utcnow()
            task.progress = 100
            task.result = result
            
            total_duration = time.time() - start_time
            logger.info(f"数据集导入完成: {dataset_id}, 耗时: {total_duration:.2f}秒")
            
            db.session.commit()
            
            # 最终状态更新
            self.update_state(
                state='SUCCESS',
                meta={
                    'current': 100,
                    'total': 100,
                    'status': '导入完成',
                    'dataset_name': dataset.name,
                    'duration': total_duration,
                    'result': result
                }
            )
            
            return {
                'success': True,
                'dataset_id': dataset_id,
                'duration': total_duration,
                'result': result
            }
            
        except Exception as e:
            error_message = str(e)
            total_duration = time.time() - start_time
            
            logger.error(f"数据集导入失败: {dataset_id}, 错误: {error_message}, 耗时: {total_duration:.2f}秒")
            
            # 更新任务失败状态
            if task:
                task.status = TaskStatus.FAILED
                task.error_message = error_message
                task.completed_at = datetime.utcnow()
                try:
                    db.session.commit()
                except Exception as commit_error:
                    logger.error(f"更新任务失败状态时出错: {str(commit_error)}")
            
            # 不要手动设置FAILURE状态，让Celery自动处理异常
            # 这样可以避免异常格式问题
            raise Exception(error_message)

def _import_from_huggingface(celery_task, import_url: str, dataset: Dataset, task: TaskModel) -> Dict[str, Any]:
    """从HuggingFace导入数据集"""
    try:
        # 解析数据集路径
        dataset_path = _parse_hf_url(import_url)
        logger.info(f"解析HuggingFace数据集路径: {dataset_path}")
        
        # 更新状态
        celery_task.update_state(
            state='PROGRESS',
            meta={
                'current': 10,
                'total': 100,
                'status': f'正在获取数据集信息: {dataset_path}',
                'dataset_name': dataset.name
            }
        )
        
        # 获取数据集信息
        api = HfApi()
        dataset_info = api.dataset_info(dataset_path)
        
        logger.info(f"获取到数据集信息: {dataset_info.id}")
        
        # 更新数据集基本信息，使用事务来避免重复提交
        try:
            # 获取基础信息
            base_name = dataset_info.id.split('/')[-1] if '/' in dataset_info.id else dataset_info.id
            owner = dataset_info.id.split('/')[0] if '/' in dataset_info.id else 'unknown'
            
            # 生成唯一的数据集名称
            unique_name = _generate_unique_dataset_name(base_name, owner, dataset.id)
            
            # 更新数据集信息
            dataset.name = unique_name
            dataset.owner = owner
            dataset.description = dataset_info.description or '从HuggingFace导入的数据集'
            dataset.license = dataset_info.card_data.get('license') if dataset_info.card_data else None
            dataset.task_type = _extract_task_type_from_hf(dataset_info)
            dataset.language = _extract_language_from_hf(dataset_info)
            dataset.downloads = dataset_info.downloads if hasattr(dataset_info, 'downloads') else 0
            dataset.likes = dataset_info.likes if hasattr(dataset_info, 'likes') else 0
            
            # 添加标签
            if dataset_info.tags:
                for tag_name in dataset_info.tags[:10]:  # 限制标签数量
                    existing_tag = DatasetTag.query.filter_by(
                        dataset_id=dataset.id, name=tag_name
                    ).first()
                    if not existing_tag:
                        tag = DatasetTag(dataset_id=dataset.id, name=tag_name)
                        db.session.add(tag)
            
            # 更新任务进度
            task.progress = 30
            
            # 提交数据库更改，使用重试机制处理并发问题
            retry_count = 3
            for attempt in range(retry_count):
                try:
                    db.session.commit()
                    logger.info(f"数据集信息更新成功: {unique_name} (尝试 {attempt + 1}/{retry_count})")
                    break
                except Exception as commit_error:
                    db.session.rollback()
                    if attempt == retry_count - 1:
                        # 最后一次尝试失败，记录详细错误
                        logger.error(f"数据集信息更新失败，已重试{retry_count}次: {str(commit_error)}")
                        # 如果是唯一约束错误，尝试生成新的唯一名称
                        if "uk_datasets_owner_name" in str(commit_error) or "unique constraint" in str(commit_error).lower():
                            logger.info("检测到唯一约束冲突，尝试生成新的唯一名称")
                            import uuid
                            new_unique_name = f"{base_name}_{uuid.uuid4().hex[:8]}"
                            dataset.name = new_unique_name
                            logger.info(f"使用新的唯一名称重试: {new_unique_name}")
                            try:
                                db.session.commit()
                                logger.info(f"使用新名称更新成功: {new_unique_name}")
                                break
                            except Exception as final_error:
                                logger.error(f"使用新名称仍然失败: {str(final_error)}")
                                raise final_error
                        else:
                            raise commit_error
                    else:
                        logger.warning(f"数据集信息更新失败，尝试 {attempt + 1}/{retry_count}: {str(commit_error)}")
                        time.sleep(1)  # 等待1秒后重试
                        
        except Exception as update_error:
            logger.error(f"更新数据集信息时发生错误: {str(update_error)}")
            raise update_error
        
        # 更新状态
        celery_task.update_state(
            state='PROGRESS',
            meta={
                'current': 30,
                'total': 100,
                'status': f'正在下载数据集: {dataset_path}',
                'dataset_name': dataset.name
            }
        )
        
        # 下载数据集
        try:
            download_info = _download_hf_dataset(celery_task, dataset_path, dataset.id, task)
            # 更新数据集大小
            dataset.size = download_info.get('size', '0B')
        except Exception as download_error:
            logger.warning(f"数据集下载遇到问题，但继续创建记录: {str(download_error)}")
            # 使用默认的下载信息
            download_info = {
                'uploaded_files': [],
                'file_count': 0,
                'total_size': 0,
                'size': '0B'
            }
            dataset.size = '0B'
        
        task.progress = 90
        db.session.commit()
        
        # 创建增强数据集版本记录
        from app.models.dataset_version import EnhancedDatasetVersion, EnhancedDatasetFile
        from app.services.enhanced_dataset_service import EnhancedDatasetService
        import uuid
        
        # 删除普通版本（如果存在）
        old_version = DatasetVersion.query.filter_by(dataset_id=dataset.id).first()
        if old_version:
            db.session.delete(old_version)
        
        # 创建增强版本
        version_id = str(uuid.uuid4())
        commit_hash = uuid.uuid4().hex[:8]  # 生成8位commit hash
        enhanced_version = EnhancedDatasetVersion(
            id=version_id,
            dataset_id=dataset.id,
            version='v1.0',
            commit_hash=commit_hash,
            commit_message=f'从HuggingFace导入数据集: {dataset_info.id}',
            author=dataset.owner,
            total_size=download_info.get('total_size', 0),
            file_count=download_info.get('file_count', 0),
            pipeline_config={
                'import_method': 'huggingface',
                'import_url': import_url,
                'original_dataset_id': dataset_info.id,
                'downloaded_at': datetime.utcnow().isoformat()
            },
            stats={
                'original_downloads': dataset_info.downloads if hasattr(dataset_info, 'downloads') else 0,
                'original_likes': dataset_info.likes if hasattr(dataset_info, 'likes') else 0,
                'file_count': download_info.get('file_count', 0),
                'total_size': download_info.get('total_size', 0)
            },
            is_default=True
        )
        db.session.add(enhanced_version)
        
        # 为每个上传的文件创建记录
        uploaded_files = download_info.get('uploaded_files', [])
        for file_info in uploaded_files:
            # 检测文件类型
            file_ext = os.path.splitext(file_info['filename'])[1].lower()
            if file_ext in ['.txt', '.md']:
                file_type = 'text'
            elif file_ext in ['.csv']:
                file_type = 'csv' 
            elif file_ext in ['.json', '.jsonl']:
                file_type = 'json'
            elif file_ext in ['.jpg', '.jpeg', '.png', '.bmp', '.gif']:
                file_type = 'image'
            elif file_ext in ['.wav', '.mp3', '.flac']:
                file_type = 'audio'
            elif file_ext in ['.mp4', '.avi', '.mov']:
                file_type = 'video'
            else:
                file_type = 'other'
            
            enhanced_file = EnhancedDatasetFile(
                id=str(uuid.uuid4()),
                version_id=version_id,
                filename=file_info['filename'],
                file_path=file_info['file_path'],
                file_type=file_type,
                file_size=file_info['file_size'],
                minio_bucket=current_app.config.get('MINIO_DATASETS_BUCKET', 'datasets'),
                minio_object_name=file_info['minio_object_name']
            )
            db.session.add(enhanced_file)
        
        task.progress = 100
        db.session.commit()
        
        return {
            'source': 'huggingface',
            'original_id': dataset_info.id,
            'downloaded_files': download_info.get('file_count', 0),
            'total_size': download_info.get('total_size', 0),
            'uploaded_files': len(download_info.get('uploaded_files', []))
        }
        
    except Exception as e:
        logger.error(f"从HuggingFace导入数据集失败: {str(e)}")
        raise e

def _import_from_modelscope(celery_task, import_url: str, dataset: Dataset, task: TaskModel) -> Dict[str, Any]:
    """从魔搭社区导入数据集"""
    try:
        # 解析数据集路径
        dataset_path = _parse_ms_url(import_url)
        logger.info(f"解析魔搭社区数据集路径: {dataset_path}")
        
        # 更新状态
        celery_task.update_state(
            state='PROGRESS',
            meta={
                'current': 10,
                'total': 100,
                'status': f'正在获取数据集信息: {dataset_path}',
                'dataset_name': dataset.name
            }
        )
        
        # 获取数据集信息
        api = HubApi()
        dataset_info = None
        try:
            dataset_info_dict = api.get_model(dataset_path)
            if dataset_info_dict:
                dataset_info = {
                    'Name': dataset_info_dict.get('name', dataset_path.split('/')[-1]),
                    'Description': dataset_info_dict.get('description', '从魔搭社区导入的数据集'),
                    'License': dataset_info_dict.get('license'),
                    'Language': dataset_info_dict.get('language', 'Chinese'),
                    'DownloadCount': dataset_info_dict.get('downloadCount', 0),
                    'LikeCount': dataset_info_dict.get('likeCount', 0),
                    'Tags': dataset_info_dict.get('tags', [])
                }
                logger.info(f"成功获取数据集信息: {dataset_info['Name']} (请求路径: {dataset_path})")
        
        except Exception as e:
            logger.warning(f"从ModelScope获取数据集信息失败: {e}")
            dataset_info = None
        
        # 如果无法获取信息，使用默认信息
        if not dataset_info:
            logger.info(f"使用默认信息继续导入数据集: {dataset_path}")
            dataset_info = {
                'Name': dataset_path.split('/')[-1],
                'Description': f'从魔搭社区导入的数据集 ({dataset_path})',
                'License': None,
                'Language': 'Chinese',
                'DownloadCount': 0,
                'LikeCount': 0,
                'Tags': []
            }
        
        # 更新数据集基本信息，使用事务来避免重复提交
        try:
            # 获取基础信息
            base_name = dataset_info.get('Name', dataset_path.split('/')[-1])
            owner = dataset_path.split('/')[0] if '/' in dataset_path else 'unknown'
            
            # 生成唯一的数据集名称
            unique_name = _generate_unique_dataset_name(base_name, owner, dataset.id)
            
            # 更新数据集信息
            dataset.name = unique_name
            dataset.owner = owner
            dataset.description = dataset_info.get('Description', '从魔搭社区导入的数据集')
            dataset.license = dataset_info.get('License')
            dataset.task_type = _extract_task_type_from_ms(dataset_info)
            dataset.language = dataset_info.get('Language', 'Chinese')
            dataset.downloads = dataset_info.get('DownloadCount', 0)
            dataset.likes = dataset_info.get('LikeCount', 0)
            
            # 添加标签
            tags = dataset_info.get('Tags', [])
            if tags:
                for tag_name in tags[:10]:  # 限制标签数量
                    existing_tag = DatasetTag.query.filter_by(
                        dataset_id=dataset.id, name=tag_name
                    ).first()
                    if not existing_tag:
                        tag = DatasetTag(dataset_id=dataset.id, name=tag_name)
                        db.session.add(tag)
            
            # 更新任务进度
            task.progress = 30
            
            # 提交数据库更改，使用重试机制处理并发问题
            retry_count = 3
            for attempt in range(retry_count):
                try:
                    db.session.commit()
                    logger.info(f"数据集信息更新成功: {unique_name} (尝试 {attempt + 1}/{retry_count})")
                    break
                except Exception as commit_error:
                    db.session.rollback()
                    if attempt == retry_count - 1:
                        # 最后一次尝试失败，记录详细错误
                        logger.error(f"数据集信息更新失败，已重试{retry_count}次: {str(commit_error)}")
                        # 如果是唯一约束错误，尝试生成新的唯一名称
                        if "uk_datasets_owner_name" in str(commit_error) or "unique constraint" in str(commit_error).lower():
                            logger.info("检测到唯一约束冲突，尝试生成新的唯一名称")
                            import uuid
                            new_unique_name = f"{base_name}_{uuid.uuid4().hex[:8]}"
                            dataset.name = new_unique_name
                            logger.info(f"使用新的唯一名称重试: {new_unique_name}")
                            try:
                                db.session.commit()
                                logger.info(f"使用新名称更新成功: {new_unique_name}")
                                break
                            except Exception as final_error:
                                logger.error(f"使用新名称仍然失败: {str(final_error)}")
                                raise final_error
                        else:
                            raise commit_error
                    else:
                        logger.warning(f"数据集信息更新失败，尝试 {attempt + 1}/{retry_count}: {str(commit_error)}")
                        time.sleep(1)  # 等待1秒后重试
                        
        except Exception as update_error:
            logger.error(f"更新数据集信息时发生错误: {str(update_error)}")
            raise update_error
        
        # 更新状态
        celery_task.update_state(
            state='PROGRESS',
            meta={
                'current': 30,
                'total': 100,
                'status': f'正在下载数据集: {dataset_path}',
                'dataset_name': dataset.name
            }
        )
        
        # 下载数据集
        try:
            download_info = _download_ms_dataset(celery_task, dataset_path, dataset.id, task)
            # 更新数据集大小
            dataset.size = download_info.get('size', '0B')
        except Exception as download_error:
            logger.warning(f"数据集下载遇到问题，但继续创建记录: {str(download_error)}")
            # 使用默认的下载信息
            download_info = {
                'uploaded_files': [],
                'file_count': 0,
                'total_size': 0,
                'size': '0B'
            }
            dataset.size = '0B'
        
        task.progress = 90
        db.session.commit()
        
        # 创建增强数据集版本记录
        from app.models.dataset_version import EnhancedDatasetVersion, EnhancedDatasetFile
        import uuid
        
        # 删除普通版本（如果存在）
        old_version = DatasetVersion.query.filter_by(dataset_id=dataset.id).first()
        if old_version:
            db.session.delete(old_version)
        
        # 创建增强版本
        version_id = str(uuid.uuid4())
        commit_hash = uuid.uuid4().hex[:8]  # 生成8位commit hash
        enhanced_version = EnhancedDatasetVersion(
            id=version_id,
            dataset_id=dataset.id,
            version='v1.0',
            commit_hash=commit_hash,
            commit_message=f'从魔搭社区导入数据集: {dataset_path}',
            author=dataset.owner,
            total_size=download_info.get('total_size', 0),
            file_count=download_info.get('file_count', 0),
            pipeline_config={
                'import_method': 'modelscope',
                'import_url': import_url,
                'original_dataset_id': dataset_path,
                'downloaded_at': datetime.utcnow().isoformat()
            },
            stats={
                'original_downloads': dataset_info.get('DownloadCount', 0),
                'original_likes': dataset_info.get('LikeCount', 0),
                'file_count': download_info.get('file_count', 0),
                'total_size': download_info.get('total_size', 0)
            },
            is_default=True
        )
        db.session.add(enhanced_version)
        
        # 为每个上传的文件创建记录
        uploaded_files = download_info.get('uploaded_files', [])
        for file_info in uploaded_files:
            # 检测文件类型
            file_ext = os.path.splitext(file_info['filename'])[1].lower()
            if file_ext in ['.txt', '.md']:
                file_type = 'text'
            elif file_ext in ['.csv']:
                file_type = 'csv' 
            elif file_ext in ['.json', '.jsonl']:
                file_type = 'json'
            elif file_ext in ['.jpg', '.jpeg', '.png', '.bmp', '.gif']:
                file_type = 'image'
            elif file_ext in ['.wav', '.mp3', '.flac']:
                file_type = 'audio'
            elif file_ext in ['.mp4', '.avi', '.mov']:
                file_type = 'video'
            else:
                file_type = 'other'
            
            enhanced_file = EnhancedDatasetFile(
                id=str(uuid.uuid4()),
                version_id=version_id,
                filename=file_info['filename'],
                file_path=file_info['file_path'],
                file_type=file_type,
                file_size=file_info['file_size'],
                minio_bucket=current_app.config.get('MINIO_DATASETS_BUCKET', 'datasets'),
                minio_object_name=file_info['minio_object_name']
            )
            db.session.add(enhanced_file)
        
        task.progress = 100
        db.session.commit()
        
        return {
            'source': 'modelscope',
            'original_id': dataset_path,
            'downloaded_files': download_info.get('file_count', 0),
            'total_size': download_info.get('total_size', 0),
            'uploaded_files': len(download_info.get('uploaded_files', []))
        }
        
    except Exception as e:
        logger.error(f"从魔搭社区导入数据集失败: {str(e)}")
        raise e

def _parse_hf_url(import_url: str) -> str:
    """解析HuggingFace URL或路径"""
    if import_url.startswith('https://huggingface.co/datasets/'):
        return import_url.replace('https://huggingface.co/datasets/', '')
    elif import_url.startswith('http'):
        # 其他HTTP URL格式
        parsed = urlparse(import_url)
        path_parts = parsed.path.strip('/').split('/')
        if 'datasets' in path_parts:
            idx = path_parts.index('datasets')
            if idx + 1 < len(path_parts):
                return '/'.join(path_parts[idx + 1:])
    
    # 直接返回作为数据集路径
    return import_url.strip()

def _parse_ms_url(import_url: str) -> str:
    """解析魔搭社区URL或路径"""
    parsed = urlparse(import_url)
    if parsed.scheme in ['http', 'https'] and parsed.netloc in ['www.modelscope.cn', 'modelscope.cn', 'www.modelscope.ai', 'modelscope.ai']:
        path_parts = parsed.path.strip('/').split('/')
        # 期望的路径格式: /datasets/{owner}/{name} 或 /models/{owner}/{name}
        if len(path_parts) >= 3 and path_parts[0] in ['datasets', 'models']:
            return f"{path_parts[1]}/{path_parts[2]}"
    
    # 直接返回作为数据集/模型路径
    return import_url.strip()

def _download_hf_dataset(celery_task, dataset_path: str, dataset_id: int, task: TaskModel) -> Dict[str, Any]:
    """下载HuggingFace数据集"""
    try:
        # 创建临时目录用于下载
        temp_dir = tempfile.mkdtemp(prefix=f'hf_dataset_{dataset_id}_')
        local_dir = os.path.join(temp_dir, 'dataset')
        os.makedirs(local_dir, exist_ok=True)
        
        logger.info(f"使用临时目录下载数据集: {temp_dir}")
        
        # 使用snapshot_download下载整个数据集
        downloaded_path = snapshot_download(
            repo_id=dataset_path,
            repo_type="dataset",
            local_dir=local_dir,
            local_dir_use_symlinks=False
        )
        
        # 统计下载的文件
        file_count = 0
        total_size = 0
        
        for root, dirs, files in os.walk(downloaded_path):
            for file in files:
                file_path = os.path.join(root, file)
                if os.path.exists(file_path):
                    file_count += 1
                    total_size += os.path.getsize(file_path)
        
        # 格式化大小
        size_str = _format_size(total_size)
        
        logger.info(f"HuggingFace数据集下载完成: {file_count}个文件, 总大小: {size_str}")
        
        # 将下载的数据集上传到MinIO（每个文件分别上传）
        uploaded_files = _upload_dataset_files_to_minio(downloaded_path, dataset_id, 'huggingface')
        
        # 清理临时目录
        try:
            shutil.rmtree(temp_dir)
            logger.info(f"已清理临时目录: {temp_dir}")
        except Exception as cleanup_error:
            logger.warning(f"清理临时目录失败: {str(cleanup_error)}")
        
        return {
            'uploaded_files': uploaded_files,
            'file_count': file_count,
            'total_size': total_size,
            'size': size_str
        }
        
    except Exception as e:
        logger.error(f"下载HuggingFace数据集失败: {str(e)}")
        raise e

def _download_ms_dataset(celery_task, dataset_path: str, dataset_id: int, task: TaskModel) -> Dict[str, Any]:
    """下载魔搭社区数据集 (使用 modelscope-cli)"""
    try:
        # 创建临时目录用于下载
        temp_dir = tempfile.mkdtemp(prefix=f'ms_dataset_{dataset_id}_')
        
        logger.info(f"使用shell命令下载数据集 '{dataset_path}' 到临时目录: {temp_dir}")
        
        # 构建 shell 命令 (指定为数据集)
        command = [
            'modelscope',
            'download',
            '--dataset',
            dataset_path,
            '--local_dir',
            temp_dir
        ]

        logger.info(f"执行下载命令: {' '.join(command)}")
        
        # 执行命令
        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            check=True  # Raise exception on non-zero exit code
        )

        logger.info(f"ModelScope CLI下载成功. STDOUT: {result.stdout}")

        # 下载的内容在临时目录中，将其作为下载路径
        downloaded_path = temp_dir
        
        if not os.listdir(downloaded_path):
            raise Exception("下载目录为空，可能下载失败。")

        # 统计下载的文件
        file_count = 0
        total_size = 0
        
        for root, dirs, files in os.walk(downloaded_path):
            for file in files:
                file_path = os.path.join(root, file)
                if os.path.exists(file_path):
                    file_count += 1
                    total_size += os.path.getsize(file_path)
        
        # 格式化大小
        size_str = _format_size(total_size)
        
        logger.info(f"魔搭社区数据集下载完成: {file_count}个文件, 总大小: {size_str}")
        
        # 将下载的数据集上传到MinIO（每个文件分别上传）
        uploaded_files = _upload_dataset_files_to_minio(downloaded_path, dataset_id, 'modelscope')
        
        # 清理临时目录
        try:
            shutil.rmtree(temp_dir)
            logger.info(f"已清理临时目录: {temp_dir}")
        except Exception as cleanup_error:
            logger.warning(f"清理临时目录失败: {str(cleanup_error)}")
        
        return {
            'uploaded_files': uploaded_files,
            'file_count': file_count,
            'total_size': total_size,
            'size': size_str
        }
        
    except subprocess.CalledProcessError as e:
        error_message = f"ModelScope CLI下载失败 (exit code {e.returncode}):\nSTDOUT: {e.stdout}\nSTDERR: {e.stderr}"
        logger.error(error_message)
        raise Exception(error_message) from e
    except Exception as e:
        logger.error(f"下载魔搭社区数据集失败: {str(e)}")
        raise e

def _extract_task_type_from_hf(dataset_info) -> Optional[str]:
    """从HuggingFace数据集信息中提取任务类型"""
    if hasattr(dataset_info, 'card_data') and dataset_info.card_data:
        task_categories = dataset_info.card_data.get('task_categories', [])
        if task_categories:
            return task_categories[0]
    
    if hasattr(dataset_info, 'tags') and dataset_info.tags:
        for tag in dataset_info.tags:
            if 'qa' in tag.lower() or 'question' in tag.lower():
                return 'Question Answering'
            elif 'classification' in tag.lower():
                return 'Text Classification'
            elif 'translation' in tag.lower():
                return 'Translation'
            elif 'summarization' in tag.lower():
                return 'Summarization'
    
    return 'Natural Language Processing'

def _extract_language_from_hf(dataset_info) -> str:
    """从HuggingFace数据集信息中提取语言"""
    if hasattr(dataset_info, 'card_data') and dataset_info.card_data:
        languages = dataset_info.card_data.get('language', [])
        if languages:
            if 'zh' in languages or 'chinese' in languages:
                return 'Chinese'
            elif 'en' in languages or 'english' in languages:
                return 'English'
            else:
                return languages[0].capitalize()
    
    return 'Unknown'

def _extract_task_type_from_ms(dataset_info: Dict) -> str:
    """从魔搭社区数据集信息中提取任务类型"""
    task_info = dataset_info.get('Task', {})
    if isinstance(task_info, list) and task_info:
        return task_info[0]
    elif isinstance(task_info, str):
        return task_info
    
    # 根据标签推断
    tags = dataset_info.get('Tags', [])
    for tag in tags:
        if 'qa' in tag.lower() or '问答' in tag:
            return 'Question Answering'
        elif 'classification' in tag.lower() or '分类' in tag:
            return 'Text Classification'
        elif 'nlp' in tag.lower() or '自然语言' in tag:
            return 'Natural Language Processing'
    
    return 'Natural Language Processing'

def _upload_dataset_files_to_minio(local_path: str, dataset_id: int, source: str) -> List[Dict[str, Any]]:
    """将数据集中的每个文件分别上传到MinIO存储"""
    try:
        logger.info(f"开始上传数据集文件到MinIO: dataset_id={dataset_id}, source={source}")
        
        uploaded_files = []
        
        # 遍历所有文件
        for root, dirs, files in os.walk(local_path):
            for file in files:
                file_path = os.path.join(root, file)
                # 计算相对路径
                rel_path = os.path.relpath(file_path, local_path)
                
                # 生成MinIO对象名
                object_name = f"datasets/{dataset_id}/files/{rel_path}"
                
                # 获取文件信息
                file_size = os.path.getsize(file_path)
                file_ext = os.path.splitext(file)[1].lower()
                
                # 根据文件扩展名确定content_type
                content_type = 'application/octet-stream'
                if file_ext in ['.txt', '.md', '.csv']:
                    content_type = 'text/plain'
                elif file_ext in ['.json', '.jsonl']:
                    content_type = 'application/json'
                elif file_ext in ['.jpg', '.jpeg']:
                    content_type = 'image/jpeg'
                elif file_ext in ['.png']:
                    content_type = 'image/png'
                elif file_ext in ['.zip']:
                    content_type = 'application/zip'
                
                # 上传文件到MinIO的datasets bucket
                actual_size = storage_service.upload_file_from_path(
                    file_path, 
                    object_name,
                    content_type=content_type,
                    bucket_name=current_app.config.get('MINIO_DATASETS_BUCKET', 'datasets')
                )
                
                # 记录上传的文件信息
                uploaded_files.append({
                    'filename': file,
                    'file_path': rel_path,
                    'minio_object_name': object_name,
                    'file_size': file_size,
                    'content_type': content_type
                })
                
                logger.info(f"文件上传成功: {object_name}, 大小: {actual_size} bytes")
        
        logger.info(f"数据集所有文件上传完成: {len(uploaded_files)} 个文件")
        return uploaded_files
        
    except Exception as e:
        logger.error(f"上传数据集文件到MinIO失败: {str(e)}")
        raise e

def _upload_dataset_to_minio(local_path: str, dataset_id: int, source: str) -> str:
    """将数据集上传到MinIO存储"""
    try:
        logger.info(f"开始上传数据集到MinIO: dataset_id={dataset_id}, source={source}")
        
        # 创建压缩包
        temp_zip = tempfile.NamedTemporaryFile(delete=False, suffix='.zip')
        temp_zip.close()
        
        with zipfile.ZipFile(temp_zip.name, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            for root, dirs, files in os.walk(local_path):
                for file in files:
                    file_path = os.path.join(root, file)
                    # 计算相对路径
                    arc_name = os.path.relpath(file_path, local_path)
                    zip_file.write(file_path, arc_name)
        
        # 生成MinIO对象名
        object_name = f"datasets/{dataset_id}/{source}_dataset.zip"
        
        # 上传到MinIO
        file_size = storage_service.upload_file_from_path(
            temp_zip.name, 
            object_name,
            content_type='application/zip'
        )
        
        # 清理临时压缩文件
        try:
            os.unlink(temp_zip.name)
        except Exception as cleanup_error:
            logger.warning(f"清理临时压缩文件失败: {str(cleanup_error)}")
        
        logger.info(f"数据集上传到MinIO成功: {object_name}, 大小: {file_size} bytes")
        return object_name
        
    except Exception as e:
        logger.error(f"上传数据集到MinIO失败: {str(e)}")
        raise e

def _generate_unique_dataset_name(base_name: str, owner: str, current_dataset_id: int) -> str:
    """生成唯一的数据集名称，避免重复"""
    from datetime import datetime
    
    # 首先检查原始名称是否已存在
    existing = Dataset.query.filter_by(owner=owner, name=base_name).filter(Dataset.id != current_dataset_id).first()
    if not existing:
        return base_name
    
    # 如果存在重复，尝试添加时间戳后缀
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    unique_name = f"{base_name}_{timestamp}"
    
    # 再次检查是否唯一
    existing = Dataset.query.filter_by(owner=owner, name=unique_name).filter(Dataset.id != current_dataset_id).first()
    if not existing:
        return unique_name
    
    # 如果时间戳后缀仍然重复，添加递增数字
    counter = 1
    while True:
        test_name = f"{base_name}_{timestamp}_{counter}"
        existing = Dataset.query.filter_by(owner=owner, name=test_name).filter(Dataset.id != current_dataset_id).first()
        if not existing:
            return test_name
        counter += 1
        # 安全起见，限制最大尝试次数
        if counter > 100:
            break
    
    # 如果所有尝试都失败，使用UUID确保唯一性
    import uuid
    return f"{base_name}_{uuid.uuid4().hex[:8]}"

def _format_size(size_bytes: int) -> str:
    """格式化文件大小"""
    if size_bytes == 0:
        return "0B"
    
    size_names = ["B", "KB", "MB", "GB", "TB"]
    import math
    i = int(math.floor(math.log(size_bytes, 1024)))
    p = math.pow(1024, i)
    s = round(size_bytes / p, 2)
    return f"{s}{size_names[i]}" 