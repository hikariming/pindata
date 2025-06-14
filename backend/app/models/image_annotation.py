from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, Float, Integer, Boolean, JSON, ForeignKey, Enum
from sqlalchemy.orm import relationship
import uuid
import enum

from app.db import db


class ImageAnnotationType(enum.Enum):
    """图片标注类型枚举"""
    QA = "QA"
    CAPTION = "CAPTION"
    CLASSIFICATION = "CLASSIFICATION"
    OBJECT_DETECTION = "OBJECT_DETECTION"
    SEGMENTATION = "SEGMENTATION"
    KEYPOINT = "KEYPOINT"
    OCR = "OCR"
    CUSTOM = "CUSTOM"


class AnnotationSource(enum.Enum):
    """标注来源枚举"""
    HUMAN_ANNOTATED = "HUMAN_ANNOTATED"
    AI_GENERATED = "AI_GENERATED"
    AI_ASSISTED = "AI_ASSISTED"
    IMPORTED = "IMPORTED"


class ImageAnnotation(db.Model):
    """图片标注模型"""
    __tablename__ = 'image_annotations'
    
    # 基础信息
    id = Column(String(36), primary_key=True)
    file_id = Column(String(36), nullable=False, index=True)  # 文件ID
    type = Column(Enum(ImageAnnotationType), nullable=False)
    source = Column(Enum(AnnotationSource), nullable=False)
    
    # 标注内容 - 使用JSON存储灵活的标注数据
    content = Column(JSON, nullable=False)  # 标注内容主体
    
    # 空间信息
    region = Column(JSON)  # 边界框或区域信息 {x, y, width, height}
    coordinates = Column(JSON)  # 详细坐标信息（多边形、关键点等）
    
    # 质量信息
    confidence = Column(Float, default=0.0)  # 置信度
    quality_score = Column(Float, default=0.0)  # 质量分数
    is_verified = Column(Boolean, default=False)  # 是否已验证
    
    # 分类信息
    category = Column(String(100))  # 标注类别
    tags = Column(JSON)  # 标签列表
    
    # 元数据
    annotation_metadata = Column(JSON)  # 元数据
    model_info = Column(JSON)  # AI模型信息（如果是AI生成）
    
    # 审核信息
    review_status = Column(String(50), default='pending')  # pending, approved, rejected
    reviewer_id = Column(String(36))
    review_comments = Column(Text)
    reviewed_at = Column(DateTime)
    
    # 时间戳
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(String(36))  # 创建者ID
    updated_by = Column(String(36))  # 更新者ID
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.id:
            self.id = str(uuid.uuid4())
    
    def to_dict(self):
        return {
            'id': self.id,
            'file_id': self.file_id,
            'type': self.type.value if self.type else None,
            'source': self.source.value if self.source else None,
            'content': self.content,
            'region': self.region,
            'coordinates': self.coordinates,
            'confidence': self.confidence,
            'quality_score': self.quality_score,
            'is_verified': self.is_verified,
            'category': self.category,
            'tags': self.tags,
            'annotation_metadata': self.annotation_metadata,
            'model_info': self.model_info,
            'review_status': self.review_status,
            'reviewer_id': self.reviewer_id,
            'review_comments': self.review_comments,
            'reviewed_at': self.reviewed_at.isoformat() if self.reviewed_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'created_by': self.created_by,
            'updated_by': self.updated_by,
        }
    
    def update_from_dict(self, data):
        """从字典更新对象"""
        for key, value in data.items():
            if hasattr(self, key) and key not in ['id', 'created_at', 'created_by']:
                setattr(self, key, value)
        self.updated_at = datetime.utcnow()


class AnnotationHistory(db.Model):
    """标注历史记录"""
    __tablename__ = 'annotation_history'
    
    id = Column(String(36), primary_key=True)
    annotation_id = Column(String(36), ForeignKey('image_annotations.id'), nullable=False)
    action = Column(String(20), nullable=False)  # create, update, delete
    changes = Column(JSON)  # 变更记录
    created_by = Column(String(36), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # 关系
    annotation = relationship("ImageAnnotation", backref="history")
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.id:
            self.id = str(uuid.uuid4())
    
    def to_dict(self):
        return {
            'id': self.id,
            'annotation_id': self.annotation_id,
            'action': self.action,
            'changes': self.changes,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class AnnotationTemplate(db.Model):
    """标注模板"""
    __tablename__ = 'annotation_templates'
    
    id = Column(String(36), primary_key=True)
    name = Column(String(200), nullable=False)
    description = Column(Text)
    type = Column(Enum(ImageAnnotationType), nullable=False)
    
    # 模板配置
    config = Column(JSON, nullable=False)  # 模板配置
    labels = Column(JSON)  # 预定义标签
    default_values = Column(JSON)  # 默认值
    
    # 使用统计
    usage_count = Column(Integer, default=0)
    
    # 时间戳
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(String(36))
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.id:
            self.id = str(uuid.uuid4())
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'type': self.type.value if self.type else None,
            'config': self.config,
            'labels': self.labels,
            'default_values': self.default_values,
            'usage_count': self.usage_count,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'created_by': self.created_by,
        } 