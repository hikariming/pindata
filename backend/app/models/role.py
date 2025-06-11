from sqlalchemy import Column, String, Text, DateTime, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
import uuid

from app.db import db


class RoleType(enum.Enum):
    SYSTEM = "system"
    CUSTOM = "custom"


class RoleStatus(enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"


class Role(db.Model):
    __tablename__ = 'roles'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), nullable=False)
    code = Column(String(50), unique=True, nullable=False, index=True)
    description = Column(Text)
    type = Column(SQLEnum(RoleType), default=RoleType.CUSTOM, index=True)
    status = Column(SQLEnum(RoleStatus), default=RoleStatus.ACTIVE, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(String(36))
    updated_by = Column(String(36))
    
    # Relationships
    user_roles = relationship("UserRole", back_populates="role", cascade="all, delete-orphan")
    role_permissions = relationship("RolePermission", back_populates="role", cascade="all, delete-orphan")
    
    def to_dict(self, include_permissions=False):
        result = {
            'id': self.id,
            'name': self.name,
            'code': self.code,
            'description': self.description,
            'type': self.type.value,
            'status': self.status.value,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
        
        if include_permissions:
            result['permissions'] = [rp.permission.to_dict() for rp in self.role_permissions]
        
        return result
    
    def __repr__(self):
        return f'<Role {self.name}>'