from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, Enum, Float, Integer, Boolean, JSON, ForeignKey
from sqlalchemy.orm import relationship
import enum
import uuid

from app.db import db


class StageType(enum.Enum):
    """管道阶段类型枚举"""
    EXTRACT = "extract"           # 数据提取
    CLEAN = "clean"              # 数据清洗
    TRANSFORM = "transform"       # 数据转换
    VALIDATE = "validate"        # 数据验证
    ENRICH = "enrich"           # 数据丰富
    VECTORIZE = "vectorize"     # 向量化
    OUTPUT = "output"           # 数据输出


class StageStatus(enum.Enum):
    """阶段状态枚举"""
    PENDING = "pending"          # 待执行
    RUNNING = "running"          # 执行中
    COMPLETED = "completed"      # 已完成
    FAILED = "failed"           # 执行失败
    SKIPPED = "skipped"         # 已跳过
    PAUSED = "paused"           # 已暂停


class ProjectPipelineStage(db.Model):
    """项目管道阶段模型"""
    __tablename__ = 'project_pipeline_stages'
    
    # 基础信息
    id = Column(String(36), primary_key=True)
    project_id = Column(String(36), ForeignKey('data_governance_projects.id'), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    
    # 阶段配置
    stage_type = Column(Enum(StageType), nullable=False)
    stage_order = Column(Integer, nullable=False)  # 执行顺序
    status = Column(Enum(StageStatus), default=StageStatus.PENDING)
    
    # 依赖关系
    depends_on = Column(JSON)  # 依赖的前置阶段ID列表
    parallel_execution = Column(Boolean, default=False)  # 是否支持并行执行
    
    # 配置信息
    config = Column(JSON)  # 阶段配置参数
    input_config = Column(JSON)  # 输入配置
    output_config = Column(JSON)  # 输出配置
    
    # 执行信息
    plugin_name = Column(String(255))  # 使用的插件名称
    plugin_version = Column(String(50))  # 插件版本
    execution_params = Column(JSON)  # 执行参数
    
    # 统计信息
    input_count = Column(Integer, default=0)  # 输入数据量
    output_count = Column(Integer, default=0)  # 输出数据量
    error_count = Column(Integer, default=0)  # 错误数量
    processing_time = Column(Float)  # 处理时间（秒）
    
    # 执行结果
    execution_log = Column(Text)  # 执行日志
    error_message = Column(Text)  # 错误信息
    metrics = Column(JSON)  # 执行指标
    
    # 重试配置
    max_retries = Column(Integer, default=3)  # 最大重试次数
    retry_count = Column(Integer, default=0)  # 当前重试次数
    retry_delay = Column(Integer, default=60)  # 重试延迟（秒）
    
    # 时间戳
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    started_at = Column(DateTime)  # 开始执行时间
    completed_at = Column(DateTime)  # 完成时间
    
    # 关系
    project = relationship("DataGovernanceProject", back_populates="pipeline_stages")
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.id:
            self.id = str(uuid.uuid4())
    
    def to_dict(self):
        return {
            'id': self.id,
            'project_id': self.project_id,
            'name': self.name,
            'description': self.description,
            'stage_type': self.stage_type.value if self.stage_type else None,
            'stage_order': self.stage_order,
            'status': self.status.value if self.status else None,
            'depends_on': self.depends_on,
            'parallel_execution': self.parallel_execution,
            'config': self.config,
            'input_config': self.input_config,
            'output_config': self.output_config,
            'plugin_name': self.plugin_name,
            'plugin_version': self.plugin_version,
            'execution_params': self.execution_params,
            'input_count': self.input_count,
            'output_count': self.output_count,
            'error_count': self.error_count,
            'processing_time': self.processing_time,
            'execution_log': self.execution_log,
            'error_message': self.error_message,
            'metrics': self.metrics,
            'max_retries': self.max_retries,
            'retry_count': self.retry_count,
            'retry_delay': self.retry_delay,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
        } 