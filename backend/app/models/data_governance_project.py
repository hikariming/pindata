from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, Enum, Float, Integer, Boolean, JSON, ForeignKey
from sqlalchemy.orm import relationship
import enum
import uuid

from app.db import db


class ProjectStatus(enum.Enum):
    """项目状态枚举"""
    ACTIVE = "active"
    DRAFT = "draft"
    COMPLETED = "completed"
    ARCHIVED = "archived"


class DataGovernanceProject(db.Model):
    """数据治理项目模型"""
    __tablename__ = 'data_governance_projects'
    
    # 基础信息
    id = Column(String(36), primary_key=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    status = Column(Enum(ProjectStatus), default=ProjectStatus.DRAFT)
    
    # 关联信息
    owner_id = Column(String(36), ForeignKey('users.id'), nullable=False)
    organization_id = Column(String(36), ForeignKey('organizations.id'))
    
    # 项目配置
    project_config = Column(JSON)  # 项目特定配置
    pipeline_config = Column(JSON)  # 管道配置
    quality_config = Column(JSON)  # 质量评估配置
    
    # 统计指标
    total_data_size = Column(Integer, default=0)  # 总数据大小（字节）
    processed_files = Column(Integer, default=0)  # 已处理文件数
    total_files = Column(Integer, default=0)  # 总文件数
    data_quality_score = Column(Float, default=0.0)  # 数据质量分数
    processing_progress = Column(Float, default=0.0)  # 处理进度
    
    # 时间戳
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_processed_at = Column(DateTime)
    
    # 关系
    owner = relationship("User", foreign_keys=[owner_id])
    organization = relationship("Organization", foreign_keys=[organization_id])
    data_sources = relationship("ProjectDataSource", back_populates="project", cascade="all, delete-orphan")
    pipeline_stages = relationship("ProjectPipelineStage", back_populates="project", cascade="all, delete-orphan")
    team_members = relationship("ProjectTeamMember", back_populates="project", cascade="all, delete-orphan")
    governed_data = relationship("GovernedData", back_populates="project", cascade="all, delete-orphan")
    quality_assessments = relationship("DataQualityAssessment", back_populates="project", cascade="all, delete-orphan")
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.id:
            self.id = str(uuid.uuid4())
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'status': self.status.value if self.status else None,
            'owner_id': self.owner_id,
            'organization_id': self.organization_id,
            'project_config': self.project_config,
            'pipeline_config': self.pipeline_config,
            'quality_config': self.quality_config,
            'total_data_size': self.total_data_size,
            'processed_files': self.processed_files,
            'total_files': self.total_files,
            'data_quality_score': self.data_quality_score,
            'processing_progress': self.processing_progress,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'last_processed_at': self.last_processed_at.isoformat() if self.last_processed_at else None,
        } 