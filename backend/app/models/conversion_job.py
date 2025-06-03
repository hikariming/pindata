from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, Enum, JSON, Integer, ForeignKey, Float
from sqlalchemy.orm import relationship, backref
import enum
import uuid
from app.db import db

class ConversionStatus(enum.Enum):
    """转换状态枚举"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class ConversionJob(db.Model):
    """文档转换任务模型"""
    __tablename__ = 'conversion_jobs'
    
    id = Column(String(36), primary_key=True)  # UUID
    library_id = Column(String(36), ForeignKey('libraries.id'), nullable=False)
    task_id = Column(Integer, ForeignKey('tasks.id'), nullable=False)  # 关联到主任务表
    
    # 转换配置
    method = Column(String(50), nullable=False)  # markitdown or vision_llm
    llm_config_id = Column(String(36), ForeignKey('llm_configs.id'))  # 使用的LLM配置
    conversion_config = Column(JSON)  # 转换配置（包含提示词等）
    
    # Celery 任务 ID
    celery_task_id = Column(String(255))  # 存储 Celery 任务 ID
    
    # 文件信息
    file_count = Column(Integer, default=0)  # 总文件数
    completed_count = Column(Integer, default=0)  # 已完成数
    failed_count = Column(Integer, default=0)  # 失败数
    
    # 进度和状态
    status = Column(Enum(ConversionStatus), default=ConversionStatus.PENDING)
    progress_percentage = Column(Float, default=0.0)  # 0-100
    current_file_name = Column(String(255))  # 当前处理的文件名
    
    # 错误信息
    error_message = Column(Text)
    
    # 时间戳
    created_at = Column(DateTime, default=datetime.utcnow)
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 关系
    library = relationship('Library', backref='conversion_jobs')
    task = relationship('Task', backref=backref('conversion_job', uselist=False))
    llm_config = relationship('LLMConfig', backref='conversion_jobs')
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.id:
            self.id = str(uuid.uuid4())
    
    def to_dict(self):
        return {
            'id': self.id,
            'library_id': self.library_id,
            'task_id': self.task_id,
            'method': self.method,
            'llm_config_id': self.llm_config_id,
            'conversion_config': self.conversion_config,
            'celery_task_id': self.celery_task_id,
            'file_count': self.file_count,
            'completed_count': self.completed_count,
            'failed_count': self.failed_count,
            'status': self.status.value if self.status else None,
            'progress_percentage': self.progress_percentage,
            'current_file_name': self.current_file_name,
            'error_message': self.error_message,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    def update_progress(self):
        """更新进度百分比"""
        if self.file_count > 0:
            self.progress_percentage = ((self.completed_count + self.failed_count) / self.file_count) * 100
        else:
            self.progress_percentage = 0 