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


class AnnotationType(enum.Enum):
    """标注类型枚举"""
    IMAGE_QA = "image_qa"                    # 图片问答
    IMAGE_CAPTION = "image_caption"          # 图片描述
    IMAGE_CLASSIFICATION = "image_classification"  # 图片分类
    IMAGE_OBJECT_DETECTION = "image_object_detection"  # 目标检测
    VIDEO_TRANSCRIPT = "video_transcript"     # 视频字幕
    VIDEO_QA = "video_qa"                    # 视频问答
    VIDEO_SUMMARY = "video_summary"          # 视频摘要
    VIDEO_SCENE_DETECTION = "video_scene_detection"  # 场景检测
    AUDIO_TRANSCRIPT = "audio_transcript"    # 音频转录
    TEXT_EXTRACTION = "text_extraction"      # 文本提取
    CUSTOM = "custom"                        # 自定义标注


class AnnotationSource(enum.Enum):
    """标注来源枚举"""
    AI_GENERATED = "ai_generated"            # AI生成
    HUMAN_ANNOTATED = "human_annotated"      # 人工标注
    AI_ASSISTED = "ai_assisted"              # AI辅助的人工标注
    IMPORTED = "imported"                    # 导入的标注


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
    
    # 多媒体标注相关字段
    annotation_data = Column(JSON)  # 标注数据主体
    annotation_type = Column(Enum(AnnotationType))  # 标注类型
    annotation_source = Column(Enum(AnnotationSource))  # 标注来源
    ai_annotations = Column(JSON)  # AI生成的标注
    human_annotations = Column(JSON)  # 人工标注
    annotation_confidence = Column(Float, default=0.0)  # 标注置信度
    annotation_metadata = Column(JSON)  # 标注元数据（如模型版本、时间戳等）
    review_status = Column(String(50), default='pending')  # 审核状态: pending, approved, rejected
    reviewer_id = Column(String(36))  # 审核人ID
    review_comments = Column(Text)  # 审核意见
    
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
            # 多媒体标注字段
            'annotation_data': self.annotation_data,
            'annotation_type': self.annotation_type.value if self.annotation_type else None,
            'annotation_source': self.annotation_source.value if self.annotation_source else None,
            'ai_annotations': self.ai_annotations,
            'human_annotations': self.human_annotations,
            'annotation_confidence': self.annotation_confidence,
            'annotation_metadata': self.annotation_metadata,
            'review_status': self.review_status,
            'reviewer_id': self.reviewer_id,
            'review_comments': self.review_comments,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'processed_at': self.processed_at.isoformat() if self.processed_at else None,
        }
    
    @property
    def has_annotations(self):
        """检查是否有标注数据"""
        return bool(self.annotation_data or self.ai_annotations or self.human_annotations)
    
    @property
    def is_multimedia(self):
        """检查是否为多媒体数据"""
        if not self.raw_data:
            return False
        return self.raw_data.file_category in ['image', 'video', 'audio']
    
    @property
    def annotation_summary(self):
        """获取标注摘要"""
        summary = {
            'has_ai_annotations': bool(self.ai_annotations),
            'has_human_annotations': bool(self.human_annotations),
            'annotation_count': 0,
            'review_required': self.review_status == 'pending',
            'confidence_level': 'high' if self.annotation_confidence >= 0.8 else 'medium' if self.annotation_confidence >= 0.6 else 'low'
        }
        
        # 计算标注数量
        if self.annotation_data:
            if isinstance(self.annotation_data, list):
                summary['annotation_count'] = len(self.annotation_data)
            elif isinstance(self.annotation_data, dict):
                summary['annotation_count'] = len(self.annotation_data.get('annotations', []))
        
        return summary
    
    def merge_annotations(self, ai_annotations=None, human_annotations=None):
        """合并AI和人工标注"""
        merged = {}
        
        # 先添加AI标注
        if ai_annotations or self.ai_annotations:
            merged['ai'] = ai_annotations or self.ai_annotations
            
        # 再添加人工标注，人工标注优先级更高
        if human_annotations or self.human_annotations:
            merged['human'] = human_annotations or self.human_annotations
            
        # 合并到annotation_data
        if merged:
            self.annotation_data = merged
            self.annotation_source = AnnotationSource.AI_ASSISTED if (merged.get('ai') and merged.get('human')) else (
                AnnotationSource.HUMAN_ANNOTATED if merged.get('human') else AnnotationSource.AI_GENERATED
            )
        
        return self.annotation_data 