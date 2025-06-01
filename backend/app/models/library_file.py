from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text, Enum, BigInteger, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.db import db
import enum

class ProcessStatus(enum.Enum):
    """文件处理状态枚举"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class LibraryFile(db.Model):
    """文件库中的文件模型"""
    __tablename__ = 'library_files'
    
    id = Column(String(36), primary_key=True)  # UUID
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)  # 原始文件名
    file_type = Column(String(50), nullable=False)  # 文件类型：pdf, docx, pptx等
    file_size = Column(BigInteger)  # 文件大小（字节）
    
    # 存储相关
    minio_object_name = Column(String(500), nullable=False)  # MinIO中的对象名
    minio_bucket = Column(String(100), default='raw-data')  # MinIO存储桶
    
    # 转换相关
    process_status = Column(Enum(ProcessStatus), default=ProcessStatus.PENDING)
    converted_format = Column(String(50))  # 转换后格式：markdown等
    converted_object_name = Column(String(500))  # 转换后文件的MinIO对象名
    conversion_error = Column(Text)  # 转换错误信息
    
    # 元数据
    page_count = Column(Integer)  # 页数（适用于PDF、PPT等）
    word_count = Column(Integer)  # 字数
    language = Column(String(10))  # 语言
    
    # 关系
    library_id = Column(String(36), ForeignKey('libraries.id'), nullable=False)
    library = relationship('Library', back_populates='files')
    
    # 时间字段
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    processed_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.id:
            import uuid
            self.id = str(uuid.uuid4())
    
    def get_file_size_human(self):
        """获取人类可读的文件大小"""
        size = self.file_size or 0
        for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
            if size < 1024.0:
                return f"{size:.1f} {unit}"
            size /= 1024.0
        return f"{size:.1f} PB"
    
    def get_status_label(self):
        """获取状态标签"""
        status_labels = {
            ProcessStatus.PENDING: '等待处理',
            ProcessStatus.PROCESSING: '处理中',
            ProcessStatus.COMPLETED: '已完成',
            ProcessStatus.FAILED: '处理失败'
        }
        return status_labels.get(self.process_status, '未知')
    
    def to_dict(self):
        return {
            'id': self.id,
            'filename': self.filename,
            'original_filename': self.original_filename,
            'file_type': self.file_type,
            'file_size': self.file_size,
            'file_size_human': self.get_file_size_human(),
            'minio_object_name': self.minio_object_name,
            'minio_bucket': self.minio_bucket,
            'process_status': self.process_status.value if self.process_status else None,
            'process_status_label': self.get_status_label(),
            'converted_format': self.converted_format,
            'converted_object_name': self.converted_object_name,
            'conversion_error': self.conversion_error,
            'page_count': self.page_count,
            'word_count': self.word_count,
            'language': self.language,
            'library_id': self.library_id,
            'uploaded_at': self.uploaded_at.isoformat() if self.uploaded_at else None,
            'processed_at': self.processed_at.isoformat() if self.processed_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        } 