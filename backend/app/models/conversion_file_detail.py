from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, Enum, JSON, Integer, ForeignKey
from sqlalchemy.orm import relationship
import uuid
from app.db import db
from .conversion_job import ConversionStatus

class ConversionFileDetail(db.Model):
    """文档转换文件详情模型"""
    __tablename__ = 'conversion_file_details'
    
    id = Column(String(36), primary_key=True)  # UUID
    conversion_job_id = Column(String(36), ForeignKey('conversion_jobs.id'), nullable=False)
    library_file_id = Column(String(36), ForeignKey('library_files.id'), nullable=False)
    
    # 转换状态
    status = Column(Enum(ConversionStatus), default=ConversionStatus.PENDING)
    
    # 转换结果
    converted_object_name = Column(String(500))  # 转换后文件在MinIO中的对象名
    converted_file_size = Column(Integer)  # 转换后文件大小
    
    # 页面处理信息（用于分批处理）
    total_pages = Column(Integer)  # 总页数
    processed_pages = Column(Integer, default=0)  # 已处理页数
    current_batch = Column(Integer, default=0)  # 当前批次
    
    # 错误信息
    error_message = Column(Text)
    
    # 时间戳
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    
    # 关系
    conversion_job = relationship('ConversionJob', backref='file_details')
    library_file = relationship('LibraryFile', backref='conversion_details')
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.id:
            self.id = str(uuid.uuid4())
    
    def to_dict(self):
        return {
            'id': self.id,
            'conversion_job_id': self.conversion_job_id,
            'library_file_id': self.library_file_id,
            'status': self.status.value if self.status else None,
            'converted_object_name': self.converted_object_name,
            'converted_file_size': self.converted_file_size,
            'total_pages': self.total_pages,
            'processed_pages': self.processed_pages,
            'current_batch': self.current_batch,
            'error_message': self.error_message,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'library_file': self.library_file.to_dict() if self.library_file else None
        } 