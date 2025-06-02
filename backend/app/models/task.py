from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, Enum, JSON
import enum
from app.db import db

class TaskStatus(enum.Enum):
    """任务状态枚举"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class TaskType(enum.Enum):
    """任务类型枚举"""
    PIPELINE_EXECUTION = "PIPELINE_EXECUTION"
    DATA_IMPORT = "DATA_IMPORT"
    DATA_EXPORT = "DATA_EXPORT"
    DATA_PROCESSING = "DATA_PROCESSING"
    DOCUMENT_CONVERSION = "DOCUMENT_CONVERSION"

class Task(db.Model):
    """任务模型"""
    __tablename__ = 'tasks'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    type = Column(Enum(TaskType), nullable=False)
    status = Column(Enum(TaskStatus), nullable=False, default=TaskStatus.PENDING)
    progress = Column(Integer, default=0)  # 0-100
    config = Column(JSON)  # 任务配置
    result = Column(JSON)  # 任务结果
    error_message = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'type': self.type.value if self.type else None,
            'status': self.status.value if self.status else None,
            'progress': self.progress,
            'config': self.config,
            'result': self.result,
            'error_message': self.error_message,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None
        } 