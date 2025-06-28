from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text, Enum, Float, Boolean, JSON
from app.db import db
import enum
import uuid

class ProviderType(enum.Enum):
    """模型提供商类型枚举"""
    OPENAI = "openai"
    CLAUDE = "claude"
    GEMINI = "gemini"
    OLLAMA = "ollama"
    CUSTOM = "custom"

class ReasoningExtractionMethod(enum.Enum):
    """思考过程提取方法枚举"""
    TAG_BASED = "tag_based"    # 基于标签, 例如 <think>...</think>
    JSON_FIELD = "json_field"  # 基于独立的JSON字段

class LLMConfig(db.Model):
    """大模型配置模型"""
    __tablename__ = 'llm_configs'
    
    id = Column(String(36), primary_key=True)  # UUID
    name = Column(String(255), nullable=False)  # 配置名称
    provider = Column(Enum(ProviderType), nullable=False)  # 提供商类型
    model_name = Column(String(255), nullable=False)  # 模型名称
    api_key = Column(Text, nullable=False)  # API密钥 (加密存储)
    base_url = Column(String(500))  # 基础URL
    
    # 模型参数
    temperature = Column(Float, default=0.7)  # 温度参数
    max_tokens = Column(Integer, default=4096)  # 最大Token数
    
    # 功能支持
    supports_vision = Column(Boolean, default=False)  # 是否支持视觉
    supports_reasoning = Column(Boolean, default=False)  # 是否支持思考过程
    reasoning_extraction_method = Column(Enum(ReasoningExtractionMethod), nullable=True)  # 提取方法
    reasoning_extraction_config = Column(JSON, nullable=True)  # 提取方法的具体配置
    
    # 状态控制
    is_active = Column(Boolean, default=True)  # 是否启用
    is_default = Column(Boolean, default=False)  # 是否为默认配置
    
    # 自定义配置
    custom_headers = Column(JSON)  # 自定义请求头
    provider_config = Column(JSON)  # 提供商特定配置
    
    # 使用统计
    usage_count = Column(Integer, default=0)  # 使用次数
    total_tokens_used = Column(Integer, default=0)  # 总使用Token数
    last_used_at = Column(DateTime)  # 最后使用时间
    
    # 时间戳
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.id:
            self.id = str(uuid.uuid4())
    
    def to_dict(self):
        """转换为字典格式，隐藏敏感信息"""
        return {
            'id': self.id,
            'name': self.name,
            'provider': self.provider.value if self.provider else None,
            'model_name': self.model_name,
            'api_key': self._mask_api_key(),
            'base_url': self.base_url,
            'temperature': self.temperature,
            'max_tokens': self.max_tokens,
            'supports_vision': self.supports_vision,
            'supports_reasoning': self.supports_reasoning,
            'reasoning_extraction_method': self.reasoning_extraction_method.value if self.reasoning_extraction_method else None,
            'reasoning_extraction_config': self.reasoning_extraction_config,
            'is_active': self.is_active,
            'is_default': self.is_default,
            'custom_headers': self.custom_headers,
            'provider_config': self.provider_config,
            'usage_count': self.usage_count,
            'total_tokens_used': self.total_tokens_used,
            'last_used_at': self.last_used_at.isoformat() if self.last_used_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    def to_dict_secure(self):
        """完整信息（包含完整API密钥），仅用于内部使用"""
        result = self.to_dict()
        result['api_key'] = self.api_key
        return result
    
    def _mask_api_key(self):
        """脱敏API密钥"""
        if not self.api_key:
            return None
        if len(self.api_key) <= 8:
            return '*' * len(self.api_key)
        return self.api_key[:4] + '*' * (len(self.api_key) - 8) + self.api_key[-4:]
    
    def update_usage(self, tokens_used=0):
        """更新使用统计"""
        self.usage_count += 1
        self.total_tokens_used += tokens_used
        self.last_used_at = datetime.utcnow()
        db.session.commit()
    
    @classmethod
    def get_default_config(cls):
        """获取默认配置"""
        return cls.query.filter_by(is_default=True, is_active=True).first()
    
    @classmethod
    def set_default(cls, config_id):
        """设置默认配置"""
        # 先清除所有默认设置
        cls.query.update({'is_default': False})
        # 设置新的默认配置
        config = cls.query.get(config_id)
        if config:
            config.is_default = True
            db.session.commit()
            return config
        return None 