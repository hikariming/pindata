from sqlalchemy import Column, String, DateTime, Enum as SQLEnum, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
import uuid

from app.db import db


class ResourcePermissionType(enum.Enum):
    OWNER = "owner"
    ADMIN = "admin"
    WRITE = "write"
    READ = "read"


class ResourcePermissionStatus(enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    EXPIRED = "expired"


class ResourcePermission(db.Model):
    __tablename__ = 'resource_permissions'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey('users.id'), nullable=False, index=True)
    resource_type = Column(String(50), nullable=False)  # dataset, library, task等
    resource_id = Column(String(255), nullable=False)   # 资源ID
    permission_type = Column(SQLEnum(ResourcePermissionType), nullable=False, index=True)
    granted_by = Column(String(36), ForeignKey('users.id'))
    granted_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime)
    status = Column(SQLEnum(ResourcePermissionStatus), default=ResourcePermissionStatus.ACTIVE)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id], back_populates="resource_permissions")
    granter = relationship("User", foreign_keys=[granted_by])
    
    def to_dict(self, include_user=False):
        result = {
            'id': self.id,
            'user_id': self.user_id,
            'resource_type': self.resource_type,
            'resource_id': self.resource_id,
            'permission_type': self.permission_type.value,
            'granted_by': self.granted_by,
            'granted_at': self.granted_at.isoformat() if self.granted_at else None,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'status': self.status.value
        }
        
        if include_user and self.user:
            result['user'] = self.user.to_dict()
        
        return result
    
    def is_expired(self):
        if self.expires_at:
            return datetime.utcnow() > self.expires_at
        return False
    
    def __repr__(self):
        return f'<ResourcePermission {self.user_id}-{self.resource_type}:{self.resource_id}>'
    
    # 索引和约束
    __table_args__ = (
        UniqueConstraint('user_id', 'resource_type', 'resource_id', name='uk_user_resource'),
        db.Index('resource_permissions_idx_resource', 'resource_type', 'resource_id'),
    )