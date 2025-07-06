"""
DataFlow结果相关数据模型
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Integer, Float, Text, JSON, ForeignKey
from sqlalchemy.orm import relationship
from app.db import db

class DataFlowResult(db.Model):
    """DataFlow处理结果模型"""
    __tablename__ = 'dataflow_results'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # 关联信息
    task_id = Column(String(36), ForeignKey('tasks.id'), nullable=False, comment="任务ID")
    original_file_id = Column(String(36), comment="原始文件ID")
    library_file_id = Column(String(36), ForeignKey('library_files.id'), comment="库文件ID")
    
    # 内容信息
    original_content = Column(Text, comment="原始内容")
    processed_content = Column(Text, comment="处理后内容")
    
    # 质量信息
    quality_score = Column(Float, comment="质量分数")
    processing_time = Column(Float, comment="处理耗时（秒）")
    
    # 元数据
    result_metadata = Column(JSON, comment="处理元数据")
    output_format = Column(String(50), comment="输出格式")
    
    # 存储信息
    minio_bucket = Column(String(100), comment="MinIO存储桶")
    minio_object_name = Column(String(255), comment="MinIO对象名")
    file_size = Column(Integer, comment="文件大小")
    
    # 状态信息
    status = Column(String(20), default="completed", comment="处理状态")
    error_message = Column(Text, comment="错误信息")
    
    # 时间信息
    created_at = Column(DateTime, default=datetime.utcnow, comment="创建时间")
    processed_at = Column(DateTime, comment="处理时间")
    
    # 关联关系
    task = relationship("Task", foreign_keys=[task_id])
    
    def to_dict(self):
        """转换为字典"""
        return {
            'id': self.id,
            'task_id': self.task_id,
            'original_file_id': self.original_file_id,
            'library_file_id': self.library_file_id,
            'original_content': self.original_content,
            'processed_content': self.processed_content,
            'quality_score': self.quality_score,
            'processing_time': self.processing_time,
            'metadata': self.result_metadata,
            'output_format': self.output_format,
            'minio_bucket': self.minio_bucket,
            'minio_object_name': self.minio_object_name,
            'file_size': self.file_size,
            'status': self.status,
            'error_message': self.error_message,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'processed_at': self.processed_at.isoformat() if self.processed_at else None,
        }

class DataFlowQualityMetrics(db.Model):
    """DataFlow质量指标模型"""
    __tablename__ = 'dataflow_quality_metrics'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # 关联信息
    task_id = Column(String(36), ForeignKey('tasks.id'), nullable=False, comment="任务ID")
    result_id = Column(String(36), ForeignKey('dataflow_results.id'), comment="结果ID")
    
    # 质量指标
    deduplication_rate = Column(Float, comment="去重率")
    filter_rate = Column(Float, comment="过滤率")
    quality_score_avg = Column(Float, comment="平均质量分数")
    quality_score_min = Column(Float, comment="最低质量分数")
    quality_score_max = Column(Float, comment="最高质量分数")
    
    # 内容统计
    original_word_count = Column(Integer, comment="原始词数")
    processed_word_count = Column(Integer, comment="处理后词数")
    compression_ratio = Column(Float, comment="压缩比")
    
    # 语言统计
    language_distribution = Column(JSON, comment="语言分布")
    
    # 其他指标
    custom_metrics = Column(JSON, comment="自定义指标")
    
    # 时间信息
    created_at = Column(DateTime, default=datetime.utcnow, comment="创建时间")
    
    def to_dict(self):
        """转换为字典"""
        return {
            'id': self.id,
            'task_id': self.task_id,
            'result_id': self.result_id,
            'deduplication_rate': self.deduplication_rate,
            'filter_rate': self.filter_rate,
            'quality_score_avg': self.quality_score_avg,
            'quality_score_min': self.quality_score_min,
            'quality_score_max': self.quality_score_max,
            'original_word_count': self.original_word_count,
            'processed_word_count': self.processed_word_count,
            'compression_ratio': self.compression_ratio,
            'language_distribution': self.language_distribution,
            'custom_metrics': self.custom_metrics,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

# 为了兼容性，定义PipelineType枚举
from enum import Enum

class PipelineType(Enum):
    """流水线类型枚举"""
    PRETRAIN_FILTER = "PRETRAIN_FILTER"
    PRETRAIN_SYNTHETIC = "PRETRAIN_SYNTHETIC"
    SFT_FILTER = "SFT_FILTER"
    SFT_SYNTHETIC = "SFT_SYNTHETIC" 