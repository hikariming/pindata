from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, Enum, Float, Integer, Boolean, JSON, ForeignKey
from sqlalchemy.orm import relationship
import enum
import uuid

from app.db import db


class QualityDimension(enum.Enum):
    """质量维度枚举"""
    COMPLETENESS = "completeness"     # 完整性
    ACCURACY = "accuracy"             # 准确性
    CONSISTENCY = "consistency"       # 一致性
    TIMELINESS = "timeliness"        # 时效性
    VALIDITY = "validity"            # 有效性
    UNIQUENESS = "uniqueness"        # 唯一性


class AssessmentMethod(enum.Enum):
    """评估方法枚举"""
    RULE_BASED = "rule_based"        # 基于规则
    AI_POWERED = "ai_powered"        # AI驱动
    STATISTICAL = "statistical"      # 统计分析
    MANUAL = "manual"                # 人工评估


class AssessmentStatus(enum.Enum):
    """评估状态枚举"""
    PENDING = "pending"              # 待评估
    RUNNING = "running"              # 评估中
    COMPLETED = "completed"          # 已完成
    FAILED = "failed"               # 评估失败


class DataQualityAssessment(db.Model):
    """数据质量评估模型"""
    __tablename__ = 'data_quality_assessments'
    
    # 基础信息
    id = Column(String(36), primary_key=True)
    project_id = Column(String(36), ForeignKey('data_governance_projects.id'), nullable=False)
    governed_data_id = Column(String(36), ForeignKey('governed_data.id'))
    
    # 评估信息
    assessment_name = Column(String(255), nullable=False)
    description = Column(Text)
    quality_dimension = Column(Enum(QualityDimension), nullable=False)
    assessment_method = Column(Enum(AssessmentMethod), nullable=False)
    status = Column(Enum(AssessmentStatus), default=AssessmentStatus.PENDING)
    
    # 评估配置
    assessment_config = Column(JSON)  # 评估配置参数
    rule_definitions = Column(JSON)   # 质量规则定义
    llm_prompts = Column(JSON)       # AI评估提示词
    
    # 评估结果
    overall_score = Column(Float, default=0.0)        # 总体质量分数
    dimension_scores = Column(JSON)                   # 各维度分数
    detailed_results = Column(JSON)                   # 详细评估结果
    issues_found = Column(JSON)                       # 发现的质量问题
    recommendations = Column(JSON)                    # 改进建议
    
    # AI评估信息
    llm_model_used = Column(String(100))              # 使用的LLM模型
    ai_reasoning = Column(Text)                       # AI推理过程
    confidence_score = Column(Float)                  # 置信度分数
    
    # 统计信息
    total_records = Column(Integer, default=0)        # 总记录数
    processed_records = Column(Integer, default=0)    # 已处理记录数
    error_records = Column(Integer, default=0)        # 错误记录数
    
    # 性能指标
    processing_time = Column(Float)                   # 处理时间（秒）
    memory_usage = Column(Integer)                    # 内存使用（MB）
    
    # 版本控制
    version = Column(String(20), default="1.0")
    baseline_assessment_id = Column(String(36))       # 基线评估ID
    
    # 时间戳
    created_at = Column(DateTime, default=datetime.utcnow)
    started_at = Column(DateTime)                     # 开始时间
    completed_at = Column(DateTime)                   # 完成时间
    
    # 创建者信息
    created_by = Column(String(36), ForeignKey('users.id'))
    
    # 关系
    project = relationship("DataGovernanceProject", back_populates="quality_assessments")
    governed_data = relationship("GovernedData", back_populates="quality_assessments")
    creator = relationship("User", foreign_keys=[created_by])
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.id:
            self.id = str(uuid.uuid4())
    
    def to_dict(self):
        return {
            'id': self.id,
            'project_id': self.project_id,
            'governed_data_id': self.governed_data_id,
            'assessment_name': self.assessment_name,
            'description': self.description,
            'quality_dimension': self.quality_dimension.value if self.quality_dimension else None,
            'assessment_method': self.assessment_method.value if self.assessment_method else None,
            'status': self.status.value if self.status else None,
            'assessment_config': self.assessment_config,
            'rule_definitions': self.rule_definitions,
            'llm_prompts': self.llm_prompts,
            'overall_score': self.overall_score,
            'dimension_scores': self.dimension_scores,
            'detailed_results': self.detailed_results,
            'issues_found': self.issues_found,
            'recommendations': self.recommendations,
            'llm_model_used': self.llm_model_used,
            'ai_reasoning': self.ai_reasoning,
            'confidence_score': self.confidence_score,
            'total_records': self.total_records,
            'processed_records': self.processed_records,
            'error_records': self.error_records,
            'processing_time': self.processing_time,
            'memory_usage': self.memory_usage,
            'version': self.version,
            'baseline_assessment_id': self.baseline_assessment_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'created_by': self.created_by,
        } 