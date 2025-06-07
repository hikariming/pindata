"""
数据集服务层
"""
import os
import shutil
from typing import List, Dict, Optional, Tuple
from datetime import datetime
from sqlalchemy import desc, asc, or_, func
from werkzeug.datastructures import FileStorage

from app.db import db
from app.models.dataset import Dataset, DatasetVersion, DatasetTag, DatasetLike, DatasetDownload
from app.services.storage_service import StorageService


class DatasetService:
    """数据集服务"""
    
    def __init__(self):
        self.storage_service = StorageService()
    
    def get_datasets(self, 
                    page: int = 1, 
                    per_page: int = 20,
                    search: Optional[str] = None,
                    sort_by: str = 'trending',
                    filter_by: str = 'all',
                    task_type: Optional[str] = None,
                    featured: Optional[bool] = None,
                    language: Optional[str] = None,
                    user_id: Optional[str] = None) -> Dict:
        """
        获取数据集列表
        """
        # 构建查询
        query = Dataset.query
        
        # 搜索功能
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    Dataset.name.ilike(search_term),
                    Dataset.description.ilike(search_term),
                    Dataset.owner.ilike(search_term)
                )
            )
        
        # 筛选功能
        if filter_by == 'my-datasets' and user_id:
            query = query.filter(Dataset.owner == user_id)
        elif filter_by == 'liked' and user_id:
            # 查询用户点赞的数据集
            liked_dataset_ids = db.session.query(DatasetLike.dataset_id).filter(
                DatasetLike.user_id == user_id
            ).subquery()
            query = query.filter(Dataset.id.in_(liked_dataset_ids))
        
        # 任务类型筛选
        if task_type and task_type != 'all':
            query = query.filter(Dataset.task_type == task_type)
        
        # 推荐筛选
        if featured is not None:
            query = query.filter(Dataset.featured == featured)
        
        # 语言筛选
        if language:
            query = query.filter(Dataset.language == language)
        
        # 排序
        if sort_by == 'newest':
            query = query.order_by(desc(Dataset.created_at))
        elif sort_by == 'downloads':
            query = query.order_by(desc(Dataset.downloads))
        elif sort_by == 'likes':
            query = query.order_by(desc(Dataset.likes))
        elif sort_by == 'updated':
            query = query.order_by(desc(Dataset.updated_at))
        else:  # trending: 综合排序
            query = query.order_by(
                desc(Dataset.featured),
                desc(Dataset.likes + Dataset.downloads * 0.1),
                desc(Dataset.updated_at)
            )
        
        # 分页
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        
        return {
            'datasets': [dataset.to_dict() for dataset in pagination.items],
            'total': pagination.total,
            'page': page,
            'per_page': per_page,
            'pages': pagination.pages,
            'has_next': pagination.has_next,
            'has_prev': pagination.has_prev
        }
    
    def get_dataset_by_id(self, dataset_id: int) -> Optional[Dataset]:
        """根据ID获取数据集"""
        return Dataset.query.get(dataset_id)
    
    def create_dataset(self, data: Dict) -> Dataset:
        """
        创建数据集
        """
        # 对于导入数据集，不需要检查名称唯一性，因为名称会从源获取
        is_import = data.get('import_method') is not None
        
        if not is_import:
            # 检查名称唯一性（仅对空数据集）
            existing = Dataset.query.filter_by(
                name=data['name'], 
                owner=data['owner']
            ).first()
            if existing:
                raise ValueError('该拥有者下已存在同名数据集')
        
        # 创建数据集
        dataset = Dataset(
            name=data.get('name', ''),  # 导入时可能为空，会在任务中更新
            owner=data.get('owner', ''),
            description=data.get('description', ''),
            license=data.get('license'),
            task_type=data.get('task_type'),
            language=data.get('language'),
            featured=data.get('featured', False),
            size='0B',
            downloads=0,
            likes=0
        )
        
        db.session.add(dataset)
        db.session.flush()  # 获取ID
        
        # 添加标签
        tags = data.get('tags', [])
        for tag_name in tags:
            tag = DatasetTag(dataset_id=dataset.id, name=tag_name)
            db.session.add(tag)
        
        # 创建初始版本
        initial_version = DatasetVersion(
            dataset_id=dataset.id,
            version='v1.0',
            pipeline_config={},
            stats={}
        )
        db.session.add(initial_version)
        
        db.session.commit()
        
        # 如果是导入数据集，启动导入任务
        if is_import:
            self._start_import_task(dataset, data)
        
        return dataset
    
    def update_dataset(self, dataset_id: int, data: Dict) -> Dataset:
        """
        更新数据集
        """
        dataset = Dataset.query.get_or_404(dataset_id)
        
        # 检查名称唯一性（如果更新了名称）
        if 'name' in data and data['name'] != dataset.name:
            existing = Dataset.query.filter_by(
                name=data['name'], 
                owner=dataset.owner
            ).first()
            if existing:
                raise ValueError('该拥有者下已存在同名数据集')
        
        # 更新字段
        for key, value in data.items():
            if key == 'tags':
                # 更新标签
                DatasetTag.query.filter_by(dataset_id=dataset.id).delete()
                for tag_name in value:
                    tag = DatasetTag(dataset_id=dataset.id, name=tag_name)
                    db.session.add(tag)
            else:
                setattr(dataset, key, value)
        
        db.session.commit()
        return dataset
    
    def delete_dataset(self, dataset_id: int) -> bool:
        """
        删除数据集
        """
        dataset = Dataset.query.get_or_404(dataset_id)
        
        # 删除相关文件
        try:
            self._delete_dataset_files(dataset)
        except Exception as e:
            print(f"删除数据集文件失败: {e}")
        
        db.session.delete(dataset)
        db.session.commit()
        return True
    
    def like_dataset(self, dataset_id: int, user_id: str) -> Dict:
        """
        点赞数据集
        """
        dataset = Dataset.query.get_or_404(dataset_id)
        
        # 检查是否已经点赞
        existing_like = DatasetLike.query.filter_by(
            dataset_id=dataset_id,
            user_id=user_id
        ).first()
        
        if existing_like:
            return {'message': '已经点赞过了', 'likes': dataset.likes}
        
        # 创建点赞记录
        like = DatasetLike(dataset_id=dataset_id, user_id=user_id)
        db.session.add(like)
        
        # 更新点赞数
        dataset.likes += 1
        db.session.commit()
        
        return {'message': '点赞成功', 'likes': dataset.likes}
    
    def unlike_dataset(self, dataset_id: int, user_id: str) -> Dict:
        """
        取消点赞数据集
        """
        dataset = Dataset.query.get_or_404(dataset_id)
        
        # 查找点赞记录
        like = DatasetLike.query.filter_by(
            dataset_id=dataset_id,
            user_id=user_id
        ).first()
        
        if not like:
            return {'message': '尚未点赞', 'likes': dataset.likes}
        
        # 删除点赞记录
        db.session.delete(like)
        
        # 更新点赞数
        if dataset.likes > 0:
            dataset.likes -= 1
        
        db.session.commit()
        
        return {'message': '取消点赞成功', 'likes': dataset.likes}
    
    def record_download(self, dataset_id: int, user_id: str, 
                       ip_address: str, user_agent: str) -> Dict:
        """
        记录数据集下载
        """
        dataset = Dataset.query.get_or_404(dataset_id)
        
        # 创建下载记录
        download = DatasetDownload(
            dataset_id=dataset_id,
            user_id=user_id,
            ip_address=ip_address,
            user_agent=user_agent
        )
        db.session.add(download)
        
        # 更新下载数
        dataset.downloads += 1
        db.session.commit()
        
        return {'message': '下载记录成功', 'downloads': dataset.downloads}
    
    def upload_dataset_file(self, dataset_id: int, file: FileStorage, 
                           version: str = None) -> Dict:
        """
        上传数据集文件
        """
        dataset = Dataset.query.get_or_404(dataset_id)
        
        if not file or not file.filename:
            raise ValueError('没有选择文件')
        
        # 生成文件路径
        file_path = self._generate_file_path(dataset, file.filename)
        
        # 保存文件
        full_path = os.path.join(self.storage_service.base_path, file_path)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        file.save(full_path)
        
        # 计算文件大小
        file_size = os.path.getsize(full_path)
        formatted_size = self._format_file_size(file_size)
        
        # 更新数据集大小
        dataset.size = formatted_size
        
        # 创建新版本（如果指定了版本号）
        if version:
            dataset_version = DatasetVersion(
                dataset_id=dataset_id,
                version=version,
                file_path=file_path,
                stats={'file_size': file_size}
            )
            db.session.add(dataset_version)
        
        db.session.commit()
        
        return {
            'message': '文件上传成功',
            'file_path': file_path,
            'size': formatted_size
        }
    
    def get_dataset_stats(self) -> Dict:
        """
        获取数据集统计信息
        """
        total_datasets = Dataset.query.count()
        total_downloads = db.session.query(func.sum(Dataset.downloads)).scalar() or 0
        total_likes = db.session.query(func.sum(Dataset.likes)).scalar() or 0
        
        # 按任务类型统计
        task_type_stats = db.session.query(
            Dataset.task_type,
            func.count(Dataset.id).label('count')
        ).group_by(Dataset.task_type).all()
        
        # 按语言统计
        language_stats = db.session.query(
            Dataset.language,
            func.count(Dataset.id).label('count')
        ).filter(Dataset.language.isnot(None)).group_by(Dataset.language).all()
        
        return {
            'total_datasets': total_datasets,
            'total_downloads': total_downloads,
            'total_likes': total_likes,
            'task_type_stats': [
                {'task_type': stat[0], 'count': stat[1]} 
                for stat in task_type_stats if stat[0]
            ],
            'language_stats': [
                {'language': stat[0], 'count': stat[1]} 
                for stat in language_stats if stat[0]
            ]
        }
    
    def _generate_file_path(self, dataset: Dataset, filename: str) -> str:
        """生成文件路径"""
        # datasets/owner/dataset_name/filename
        safe_owner = self._safe_filename(dataset.owner)
        safe_name = self._safe_filename(dataset.name)
        return f"datasets/{safe_owner}/{safe_name}/{filename}"
    
    def _safe_filename(self, filename: str) -> str:
        """生成安全的文件名"""
        import re
        # 只保留字母、数字、下划线和连字符
        safe_name = re.sub(r'[^\w\-.]', '_', filename)
        return safe_name[:100]  # 限制长度
    
    def _format_file_size(self, size_bytes: int) -> str:
        """格式化文件大小"""
        if size_bytes == 0:
            return "0B"
        
        size_names = ["B", "KB", "MB", "GB", "TB"]
        import math
        i = int(math.floor(math.log(size_bytes, 1024)))
        p = math.pow(1024, i)
        s = round(size_bytes / p, 2)
        
        return f"{s}{size_names[i]}"
    
    def _delete_dataset_files(self, dataset: Dataset):
        """删除数据集相关文件"""
        # 获取数据集文件目录
        dataset_dir = os.path.join(
            self.storage_service.base_path, 
            "datasets",
            self._safe_filename(dataset.owner),
            self._safe_filename(dataset.name)
        )
        
        if os.path.exists(dataset_dir):
            shutil.rmtree(dataset_dir)
    
    def _start_import_task(self, dataset: Dataset, data: Dict):
        """启动数据集导入任务"""
        from app.models import Task as TaskModel, TaskType
        from app.tasks.dataset_import_tasks import import_dataset_task
        
        # 创建任务记录
        task = TaskModel(
            name=f"导入数据集: {data.get('import_url', 'Unknown')}",
            type=TaskType.DATA_IMPORT,
            config={
                'dataset_id': dataset.id,
                'import_method': data.get('import_method'),
                'import_url': data.get('import_url'),
                'created_by': 'system'
            }
        )
        
        db.session.add(task)
        db.session.flush()  # 获取task.id
        
        # 启动Celery任务
        celery_task = import_dataset_task.delay(
            dataset_id=dataset.id,
            import_method=data.get('import_method'),
            import_url=data.get('import_url'),
            task_id=task.id
        )
        
        # 更新任务的Celery ID
        task.config['celery_task_id'] = celery_task.id
        
        db.session.commit()
        
        return task 