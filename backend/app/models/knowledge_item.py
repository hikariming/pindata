from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, Enum, Float, Integer, Boolean, JSON, ForeignKey
from sqlalchemy.orm import relationship
import enum
import uuid

from app.db import db


class KnowledgeType(enum.Enum):
    """知识类型枚举"""
    METADATA = "metadata"           # 元数据知识（数据字典、血缘）
    STRUCTURED = "structured"       # 结构化知识（业务规则、标准规范）
    SEMANTIC = "semantic"          # 语义知识（RAG向量、知识图谱）
    MULTIMEDIA = "multimedia"      # 多媒体知识（图文、视频、培训材料）


class KnowledgeStatus(enum.Enum):
    """知识状态枚举"""
    DRAFT = "draft"               # 草稿
    PUBLISHED = "published"       # 已发布
    ARCHIVED = "archived"         # 已归档
    DEPRECATED = "deprecated"     # 已废弃


class KnowledgeItem(db.Model):
    """知识项模型"""
    __tablename__ = 'knowledge_items'
    
    # 基础信息
    id = Column(String(36), primary_key=True)
    project_id = Column(String(36), ForeignKey('data_governance_projects.id'), nullable=False)
    governed_data_id = Column(String(36), ForeignKey('governed_data.id'))  # 关联治理数据
    
    # 知识信息
    title = Column(String(255), nullable=False)
    description = Column(Text)
    content = Column(Text)  # 主要内容
    knowledge_type = Column(Enum(KnowledgeType), nullable=False)
    status = Column(Enum(KnowledgeStatus), default=KnowledgeStatus.DRAFT)
    
    # 分类和标签
    category = Column(String(100))  # 知识类别
    subcategory = Column(String(100))  # 子类别
    tags = Column(JSON)  # 标签列表
    keywords = Column(JSON)  # 关键词列表
    
    # 语义信息
    vector_embedding = Column(JSON)  # 向量表示
    semantic_hash = Column(String(64))  # 语义哈希
    similarity_threshold = Column(Float, default=0.8)  # 相似度阈值
    
    # 多媒体信息
    media_files = Column(JSON)  # 关联的媒体文件
    preview_data = Column(JSON)  # 预览数据
    
    # 关联关系
    related_items = Column(JSON)  # 相关知识项ID列表
    parent_id = Column(String(36), ForeignKey('knowledge_items.id'))  # 父知识项
    
    # 版本控制
    version = Column(String(20), default="1.0")
    version_history = Column(JSON)  # 版本历史
    
    # 访问控制
    visibility = Column(String(20), default="private")  # public, private, team
    access_permissions = Column(JSON)  # 访问权限配置
    
    # 统计信息
    view_count = Column(Integer, default=0)  # 查看次数
    like_count = Column(Integer, default=0)  # 点赞次数
    share_count = Column(Integer, default=0)  # 分享次数
    
    # 时间戳
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    published_at = Column(DateTime)  # 发布时间
    
    # 创建者信息
    created_by = Column(String(36), ForeignKey('users.id'))
    updated_by = Column(String(36), ForeignKey('users.id'))
    
    # 关系
    project = relationship("DataGovernanceProject")
    governed_data = relationship("GovernedData", back_populates="knowledge_items")
    creator = relationship("User", foreign_keys=[created_by])
    updater = relationship("User", foreign_keys=[updated_by])
    children = relationship("KnowledgeItem", backref="parent", remote_side=[id])
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.id:
            self.id = str(uuid.uuid4())
    
    def to_dict(self):
        return {
            'id': self.id,
            'project_id': self.project_id,
            'governed_data_id': self.governed_data_id,
            'title': self.title,
            'description': self.description,
            'content': self.content,
            'knowledge_type': self.knowledge_type.value if self.knowledge_type else None,
            'status': self.status.value if self.status else None,
            'category': self.category,
            'subcategory': self.subcategory,
            'tags': self.tags,
            'keywords': self.keywords,
            'vector_embedding': self.vector_embedding,
            'semantic_hash': self.semantic_hash,
            'similarity_threshold': self.similarity_threshold,
            'media_files': self.media_files,
            'preview_data': self.preview_data,
            'related_items': self.related_items,
            'parent_id': self.parent_id,
            'version': self.version,
            'version_history': self.version_history,
            'visibility': self.visibility,
            'access_permissions': self.access_permissions,
            'view_count': self.view_count,
            'like_count': self.like_count,
            'share_count': self.share_count,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'published_at': self.published_at.isoformat() if self.published_at else None,
            'created_by': self.created_by,
            'updated_by': self.updated_by,
        } 