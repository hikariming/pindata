from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text, Enum, BigInteger, JSON
from sqlalchemy.orm import relationship
from app.db import db
import enum

class DataType(enum.Enum):
    """数据类型枚举"""
    TRAINING = "training"
    EVALUATION = "evaluation"
    MIXED = "mixed"

class ProcessStatus(enum.Enum):
    """处理状态枚举"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class Library(db.Model):
    """文件库模型"""
    __tablename__ = 'libraries'
    
    id = Column(String(36), primary_key=True)  # UUID
    name = Column(String(255), nullable=False, unique=True)
    description = Column(Text)
    data_type = Column(Enum(DataType), nullable=False, default=DataType.TRAINING)
    tags = Column(JSON)  # 存储标签数组
    
    # 统计字段
    file_count = Column(Integer, default=0)
    total_size = Column(BigInteger, default=0)  # 总大小（字节）
    processed_count = Column(Integer, default=0)
    processing_count = Column(Integer, default=0)
    pending_count = Column(Integer, default=0)
    md_count = Column(Integer, default=0)  # Markdown文件数量
    
    # 时间字段
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_updated = Column(DateTime, default=datetime.utcnow)
    
    # 关系
    files = relationship('LibraryFile', back_populates='library', cascade='all, delete-orphan')
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.id:
            import uuid
            self.id = str(uuid.uuid4())
    
    def get_total_size_human(self):
        """获取人类可读的文件大小"""
        size = self.total_size or 0
        for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
            if size < 1024.0:
                return f"{size:.1f} {unit}"
            size /= 1024.0
        return f"{size:.1f} PB"
    
    def update_statistics(self):
        """更新统计信息"""
        from app.models.library_file import ProcessStatus as FileProcessStatus
        
        # 计算文件统计
        files = self.files
        self.file_count = len(files)
        self.total_size = sum(f.file_size or 0 for f in files)
        
        # 计算处理状态统计
        self.processed_count = len([f for f in files if f.process_status == FileProcessStatus.COMPLETED])
        self.processing_count = len([f for f in files if f.process_status == FileProcessStatus.PROCESSING])
        self.pending_count = len([f for f in files if f.process_status == FileProcessStatus.PENDING])
        
        # 计算MD文件数量
        self.md_count = len([f for f in files if f.converted_format == 'markdown' and f.process_status == FileProcessStatus.COMPLETED])
        
        self.last_updated = datetime.utcnow()
        db.session.commit()
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'data_type': self.data_type.value if self.data_type else None,
            'tags': self.tags or [],
            'file_count': self.file_count,
            'total_size': self.get_total_size_human(),
            'processed_count': self.processed_count,
            'processing_count': self.processing_count,
            'pending_count': self.pending_count,
            'md_count': self.md_count,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'last_updated': self.last_updated.strftime('%Y-%m-%d') if self.last_updated else None
        }
    
    def to_dict_detailed(self):
        """详细信息，包含文件列表"""
        result = self.to_dict()
        result['files'] = [f.to_dict() for f in self.files]
        return result 