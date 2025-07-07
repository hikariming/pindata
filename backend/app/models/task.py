import uuid
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, Enum, JSON, ForeignKey, Float
from sqlalchemy.orm import relationship
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
    DATASET_GENERATION = "DATASET_GENERATION"  # 数据集自动生成
    # DataFlow 相关类型
    PRETRAIN_FILTER = "PRETRAIN_FILTER"
    PRETRAIN_SYNTHETIC = "PRETRAIN_SYNTHETIC"
    SFT_FILTER = "SFT_FILTER"
    SFT_SYNTHETIC = "SFT_SYNTHETIC"
    # 中文DataFlow 相关类型
    CHINESE_DATAFLOW = "CHINESE_DATAFLOW"

class Task(db.Model):
    """统一任务模型"""
    __tablename__ = 'tasks'
    
    # 基础字段
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False, comment="任务名称")
    description = Column(Text, comment="任务描述")
    type = Column(Enum(TaskType), nullable=False, comment="任务类型")
    status = Column(Enum(TaskStatus), nullable=False, default=TaskStatus.PENDING, comment="任务状态")
    progress = Column(Integer, default=0, comment="进度百分比 0-100")
    
    # 关联字段
    library_id = Column(String(36), ForeignKey('libraries.id'), comment="文件库ID")
    file_ids = Column(JSON, comment="处理的文件ID列表")
    created_by = Column(String(100), comment="创建者")
    
    # 配置和结果
    config = Column(JSON, comment="任务配置")
    result = Column(JSON, comment="任务结果")
    results = Column(JSON, comment="处理结果摘要")
    quality_metrics = Column(JSON, comment="质量指标")
    
    # 状态信息
    current_file = Column(String(255), comment="当前处理文件")
    error_message = Column(Text, comment="错误信息")
    
    # 统计信息
    total_files = Column(Integer, default=0, comment="总文件数")
    processed_files = Column(Integer, default=0, comment="已处理文件数")
    failed_files = Column(Integer, default=0, comment="失败文件数")
    
    # 时间字段
    created_at = Column(DateTime, default=datetime.utcnow, comment="创建时间")
    started_at = Column(DateTime, comment="开始时间")
    completed_at = Column(DateTime, comment="完成时间")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, comment="更新时间")
    
    # Celery任务字段
    celery_task_id = Column(String(255), comment="Celery任务ID")
    
    # 关系
    library = relationship('Library', foreign_keys=[library_id])
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'type': self.type.value if self.type else None,
            'status': self.status.value if self.status else None,
            'progress': self.progress,
            'library_id': self.library_id,
            'file_ids': self.file_ids,
            'created_by': self.created_by,
            'config': self.config,
            'result': self.result,
            'results': self.results,
            'quality_metrics': self.quality_metrics,
            'current_file': self.current_file,
            'error_message': self.error_message,
            'total_files': self.total_files,
            'processed_files': self.processed_files,
            'failed_files': self.failed_files,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'celery_task_id': self.celery_task_id,
        }

    def update_progress(self):
        """更新进度百分比"""
        if self.total_files > 0:
            self.progress = int(((self.processed_files + self.failed_files) / self.total_files) * 100)
        else:
            self.progress = 0 