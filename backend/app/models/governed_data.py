from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, Enum, Float, Integer, Boolean, JSON, ForeignKey
from sqlalchemy.orm import relationship
import enum
import uuid

from app.db import db


class DataType(enum.Enum):
    """数据类型枚举"""
    STRUCTURED = "structured"      # 结构化数据（数据库表）
    SEMI_STRUCTURED = "semi_structured"  # 半结构化（JSON、XML、Markdown）
    UNSTRUCTURED = "unstructured"  # 非结构化（文本、图片、视频）
    VECTOR = "vector"             # 向量化数据


class GovernanceStatus(enum.Enum):
    """治理状态枚举"""
    PENDING = "pending"           # 待处理
    PROCESSING = "processing"     # 处理中
    COMPLETED = "completed"       # 已完成
    FAILED = "failed"            # 处理失败
    VALIDATED = "validated"       # 已验证


class GovernedData(db.Model):
    """治理后数据模型"""
    __tablename__ = 'governed_data'
    
    # 基础信息
    id = Column(String(36), primary_key=True)
    project_id = Column(String(36), ForeignKey('data_governance_projects.id'), nullable=False)
    raw_data_id = Column(Integer, ForeignKey('raw_data.id'))  # 关联原始数据
    
    # 数据信息
    name = Column(String(255), nullable=False)
    description = Column(Text)
    data_type = Column(Enum(DataType), nullable=False)
    governance_status = Column(Enum(GovernanceStatus), default=GovernanceStatus.PENDING)
    
    # 存储信息
    storage_path = Column(String(500))  # 存储路径
    file_size = Column(Integer, default=0)  # 文件大小（字节）
    checksum = Column(String(64))  # 文件校验和
    
    # 治理信息
    governance_pipeline = Column(JSON)  # 治理流程配置
    governance_metadata = Column(JSON)  # 治理元数据
    quality_score = Column(Float, default=0.0)  # 质量分数
    validation_results = Column(JSON)  # 验证结果
    
    # 数据模式
    schema_definition = Column(JSON)  # 数据模式定义
    sample_data = Column(JSON)  # 样本数据
    statistics = Column(JSON)  # 统计信息
    
    # 标签和分类
    tags = Column(JSON)  # 标签列表
    category = Column(String(100))  # 数据类别
    business_domain = Column(String(100))  # 业务域
    
    # 时间戳
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    processed_at = Column(DateTime)  # 处理完成时间
    
    # 关系
    project = relationship("DataGovernanceProject", back_populates="governed_data")
    raw_data = relationship("RawData", foreign_keys=[raw_data_id])
    knowledge_items = relationship("KnowledgeItem", back_populates="governed_data", cascade="all, delete-orphan")
    quality_assessments = relationship("DataQualityAssessment", back_populates="governed_data", cascade="all, delete-orphan")
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.id:
            self.id = str(uuid.uuid4())
    
    def to_dict(self):
        return {
            'id': self.id,
            'project_id': self.project_id,
            'raw_data_id': self.raw_data_id,
            'name': self.name,
            'description': self.description,
            'data_type': self.data_type.value if self.data_type else None,
            'governance_status': self.governance_status.value if self.governance_status else None,
            'storage_path': self.storage_path,
            'file_size': self.file_size,
            'checksum': self.checksum,
            'governance_pipeline': self.governance_pipeline,
            'governance_metadata': self.governance_metadata,
            'quality_score': self.quality_score,
            'validation_results': self.validation_results,
            'schema_definition': self.schema_definition,
            'sample_data': self.sample_data,
            'statistics': self.statistics,
            'tags': self.tags,
            'category': self.category,
            'business_domain': self.business_domain,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'processed_at': self.processed_at.isoformat() if self.processed_at else None,
        } 