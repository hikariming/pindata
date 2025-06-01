from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.db import db

class Dataset(db.Model):
    """数据集模型"""
    __tablename__ = 'datasets'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False, unique=True)
    description = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 关系
    versions = relationship('DatasetVersion', back_populates='dataset', cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'version_count': len(self.versions) if self.versions else 0
        }

class DatasetVersion(db.Model):
    """数据集版本模型"""
    __tablename__ = 'dataset_versions'
    
    id = Column(Integer, primary_key=True)
    dataset_id = Column(Integer, ForeignKey('datasets.id'), nullable=False)
    version = Column(String(50), nullable=False)
    parent_version_id = Column(Integer, ForeignKey('dataset_versions.id'))
    pipeline_config = Column(JSON)  # 管道配置
    stats = Column(JSON)  # 统计信息
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
            'created_at': self.created_at.isoformat() if self.created_at else None
        } 