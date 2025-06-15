from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON, Boolean, BigInteger
from sqlalchemy.orm import relationship
from enum import Enum
from app.db import db

class DatasetType(Enum):
    """数据集类型枚举"""
    MULTIMODAL = 'multimodal'
    TEXT = 'text'
    IMAGE = 'image'
    VIDEO = 'video'
    AUDIO = 'audio'
    TABULAR = 'tabular'
    
class DatasetFormat(Enum):
    """数据集格式枚举"""
    JSONL = 'jsonl'
    JSON = 'json'
    CSV = 'csv'
    PARQUET = 'parquet'
    TSV = 'tsv'

class Dataset(db.Model):
    """数据集模型"""
    __tablename__ = 'datasets'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    owner = Column(String(255), nullable=False)  # 数据集拥有者
    description = Column(Text)
    size = Column(String(50))  # 数据集大小，如 "699MB"
    downloads = Column(Integer, default=0)  # 下载次数
    likes = Column(Integer, default=0)  # 点赞数
    license = Column(String(100))  # 许可证类型
    task_type = Column(String(100))  # 任务类型
    language = Column(String(50))  # 语言
    featured = Column(Boolean, default=False)  # 是否推荐
    
    # 新增字段，用于多模态数据集生成
    dataset_type = Column(String(50))  # 数据集类型
    dataset_format = Column(String(50))  # 数据集格式
    status = Column(String(50), default='pending')  # 生成状态
    generation_progress = Column(Integer, default=0)  # 生成进度 0-100
    file_path = Column(String(500))  # 生成的文件路径
    file_size = Column(BigInteger)  # 文件大小（字节）
    record_count = Column(Integer)  # 记录数量
    error_message = Column(Text)  # 错误信息
    meta_data = Column(JSON)  # 元数据
    completed_at = Column(DateTime)  # 完成时间
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 关系
    versions = relationship('DatasetVersion', back_populates='dataset', cascade='all, delete-orphan')
    tags = relationship('DatasetTag', back_populates='dataset', cascade='all, delete-orphan')
    likes_rel = relationship('DatasetLike', back_populates='dataset', cascade='all, delete-orphan')
    downloads_rel = relationship('DatasetDownload', back_populates='dataset', cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'owner': self.owner,
            'description': self.description,
            'size': self.size,
            'downloads': self.downloads,
            'likes': self.likes,
            'license': self.license,
            'taskType': self.task_type,
            'language': self.language,
            'featured': self.featured,
            'lastUpdated': self._format_time_ago(self.updated_at),
            'created': self.created_at.strftime('%Y-%m-%d') if self.created_at else None,
            'versions': len(self.versions) if self.versions else 0,
            'tags': [tag.name for tag in self.tags] if self.tags else []
        }
    
    def to_detail_dict(self):
        """详细信息，包含所有字段"""
        base_dict = self.to_dict()
        base_dict.update({
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'version_list': [version.to_dict() for version in self.versions] if self.versions else []
        })
        return base_dict
    
    def _format_time_ago(self, dt):
        """格式化时间为相对时间"""
        if not dt:
            return None
        
        now = datetime.utcnow()
        diff = now - dt
        
        if diff.days > 0:
            return f"{diff.days} days ago"
        elif diff.seconds > 3600:
            hours = diff.seconds // 3600
            return f"{hours} hours ago"
        elif diff.seconds > 60:
            minutes = diff.seconds // 60
            return f"{minutes} minutes ago"
        else:
            return "just now"

class DatasetVersion(db.Model):
    """数据集版本模型"""
    __tablename__ = 'dataset_versions'
    
    id = Column(Integer, primary_key=True)
    dataset_id = Column(Integer, ForeignKey('datasets.id'), nullable=False)
    version = Column(String(50), nullable=False)
    parent_version_id = Column(Integer, ForeignKey('dataset_versions.id'))
    pipeline_config = Column(JSON)  # 管道配置
    stats = Column(JSON)  # 统计信息
    file_path = Column(String(500))  # 文件路径
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # 关系
    dataset = relationship('Dataset', back_populates='versions')
    parent_version = relationship('DatasetVersion', remote_side=[id])
    
    def to_dict(self):
        return {
            'id': self.id,
            'dataset_id': self.dataset_id,
            'version': self.version,
            'parent_version_id': self.parent_version_id,
            'pipeline_config': self.pipeline_config,
            'stats': self.stats,
            'file_path': self.file_path,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class DatasetTag(db.Model):
    """数据集标签模型"""
    __tablename__ = 'dataset_tags'
    
    id = Column(Integer, primary_key=True)
    dataset_id = Column(Integer, ForeignKey('datasets.id'), nullable=False)
    name = Column(String(50), nullable=False)
    
    # 关系
    dataset = relationship('Dataset', back_populates='tags')
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name
        }

class DatasetLike(db.Model):
    """数据集点赞记录"""
    __tablename__ = 'dataset_likes'
    
    id = Column(Integer, primary_key=True)
    dataset_id = Column(Integer, ForeignKey('datasets.id'), nullable=False)
    user_id = Column(String(255))  # 用户ID，暂时用字符串
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # 关系
    dataset = relationship('Dataset', back_populates='likes_rel')

class DatasetDownload(db.Model):
    """数据集下载记录"""
    __tablename__ = 'dataset_downloads'
    
    id = Column(Integer, primary_key=True)
    dataset_id = Column(Integer, ForeignKey('datasets.id'), nullable=False)
    user_id = Column(String(255))  # 用户ID，暂时用字符串
    ip_address = Column(String(45))  # IP地址
    user_agent = Column(Text)  # 用户代理
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # 关系
    dataset = relationship('Dataset', back_populates='downloads_rel') 