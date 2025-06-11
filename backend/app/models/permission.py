from sqlalchemy import Column, String, Text, DateTime, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
import uuid

from app.db import db


class PermissionType(enum.Enum):
    SYSTEM = "system"
    CUSTOM = "custom"


class Permission(db.Model):
    __tablename__ = 'permissions'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), nullable=False)
    code = Column(String(100), unique=True, nullable=False, index=True)
    resource = Column(String(50), nullable=False)  # dataset, library, task, system
    action = Column(String(50), nullable=False)    # create, read, update, delete, manage
    description = Column(Text)
    category = Column(String(50), index=True)      # 权限分类
    type = Column(SQLEnum(PermissionType), default=PermissionType.SYSTEM)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    role_permissions = relationship("RolePermission", back_populates="permission", cascade="all, delete-orphan")
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'code': self.code,
            'resource': self.resource,
            'action': self.action,
            'description': self.description,
            'category': self.category,
            'type': self.type.value,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    def __repr__(self):
        return f'<Permission {self.code}>'
    
    # 索引
    __table_args__ = (
        db.Index('idx_resource_action', 'resource', 'action'),
    )