from sqlalchemy import Column, String, DateTime, Enum as SQLEnum, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
import uuid

from app.db import db


class UserRoleStatus(enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    EXPIRED = "expired"


class UserRole(db.Model):
    __tablename__ = 'user_roles'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey('users.id'), nullable=False, index=True)
    role_id = Column(String(36), ForeignKey('roles.id'), nullable=False, index=True)
    organization_id = Column(String(36), ForeignKey('organizations.id'), index=True)  # 在特定组织下的角色
    granted_by = Column(String(36), ForeignKey('users.id'))  # 授权人
    granted_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime)  # 角色过期时间（可选）
    status = Column(SQLEnum(UserRoleStatus), default=UserRoleStatus.ACTIVE)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id], back_populates="user_roles")
    role = relationship("Role", back_populates="user_roles")
    organization = relationship("Organization", back_populates="user_roles")
    granter = relationship("User", foreign_keys=[granted_by])
    
    def to_dict(self, include_user=False, include_role=False, include_organization=False):
        result = {
            'id': self.id,
            'user_id': self.user_id,
            'role_id': self.role_id,
            'organization_id': self.organization_id,
            'granted_by': self.granted_by,
            'granted_at': self.granted_at.isoformat() if self.granted_at else None,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'status': self.status.value
        }
        
        if include_user and self.user:
            result['user'] = self.user.to_dict()
        
        if include_role and self.role:
            result['role'] = self.role.to_dict()
        
        if include_organization and self.organization:
            result['organization'] = self.organization.to_dict()
        
        return result
    
    def is_expired(self):
        if self.expires_at:
            return datetime.utcnow() > self.expires_at
        return False
    
    def __repr__(self):
        return f'<UserRole {self.user_id}-{self.role_id}>'
    
    # 约束
    __table_args__ = (
        UniqueConstraint('user_id', 'role_id', 'organization_id', name='uk_user_role_org'),
    )