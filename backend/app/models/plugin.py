from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, JSON, Enum
import enum
from app.db import db

class PluginType(enum.Enum):
    """插件类型枚举"""
    PARSER = "parser"
    CLEANER = "cleaner"
    DISTILLER = "distiller"

class Plugin(db.Model):
    """插件模型"""
    __tablename__ = 'plugins'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False, unique=True)
    display_name = Column(String(255), nullable=False)
    type = Column(Enum(PluginType), nullable=False)
    description = Column(Text)
    version = Column(String(50), nullable=False)
    author = Column(String(255))
    is_builtin = Column(Boolean, default=False)
    is_enabled = Column(Boolean, default=True)
    config_schema = Column(JSON)  # 配置模式
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'display_name': self.display_name,
            'type': self.type.value if self.type else None,
            'description': self.description,
            'version': self.version,
            'author': self.author,
            'is_builtin': self.is_builtin,
            'is_enabled': self.is_enabled,
            'config_schema': self.config_schema,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        } 