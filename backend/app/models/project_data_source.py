from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, Enum, JSON, ForeignKey, Boolean, Integer
from sqlalchemy.orm import relationship
import enum
import uuid

from app.db import db


class DataSourceType(enum.Enum):
    """数据源类型枚举"""
    UPLOAD = "upload"
    DATABASE = "database"
    API = "api"
    STORAGE = "storage"
    URL = "url"


class DataSourceStatus(enum.Enum):
    """数据源状态枚举"""
    CONNECTED = "connected"
    DISCONNECTED = "disconnected"
    ERROR = "error"
    SYNCING = "syncing"


class ProjectDataSource(db.Model):
    """项目数据源配置模型"""
    __tablename__ = 'project_data_sources'
    
    # 基础信息
    id = Column(String(36), primary_key=True)
    project_id = Column(String(36), ForeignKey('data_governance_projects.id'), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    
    # 数据源配置
    source_type = Column(Enum(DataSourceType), nullable=False)
    status = Column(Enum(DataSourceStatus), default=DataSourceStatus.DISCONNECTED)
    config = Column(JSON)  # 数据源特定配置
    connection_string = Column(Text)  # 连接字符串（加密存储）
    
    # 同步信息
    last_sync_at = Column(DateTime)
    sync_frequency = Column(String(50))  # 同步频率 (hourly, daily, weekly, manual)
    auto_sync_enabled = Column(Boolean, default=False)
    
    # 数据统计
    file_count = Column(Integer, default=0)
    total_size = Column(Integer, default=0)  # 总大小（字节）
    
    # 时间戳
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 关系
    project = relationship("DataGovernanceProject", back_populates="data_sources")
    raw_data_items = relationship("RawData", foreign_keys="RawData.data_source_id", cascade="all, delete-orphan", overlaps="data_source")
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.id:
            self.id = str(uuid.uuid4())
    
    def to_dict(self):
        return {
            'id': self.id,
            'project_id': self.project_id,
            'name': self.name,
            'description': self.description,
            'source_type': self.source_type.value if self.source_type else None,
            'status': self.status.value if self.status else None,
            'config': self.config,
            'last_sync_at': self.last_sync_at.isoformat() if self.last_sync_at else None,
            'sync_frequency': self.sync_frequency,
            'auto_sync_enabled': self.auto_sync_enabled,
            'file_count': self.file_count,
            'total_size': self.total_size,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        } 