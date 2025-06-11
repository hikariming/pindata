from sqlalchemy import Column, String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.db import db


class RolePermission(db.Model):
    __tablename__ = 'role_permissions'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    role_id = Column(String(36), ForeignKey('roles.id'), nullable=False, index=True)
    permission_id = Column(String(36), ForeignKey('permissions.id'), nullable=False, index=True)
    granted_by = Column(String(36), ForeignKey('users.id'))
    granted_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    role = relationship("Role", back_populates="role_permissions")
    permission = relationship("Permission", back_populates="role_permissions")
    granter = relationship("User", foreign_keys=[granted_by])
    
    def to_dict(self, include_role=False, include_permission=False):
        result = {
            'id': self.id,
            'role_id': self.role_id,
            'permission_id': self.permission_id,
            'granted_by': self.granted_by,
            'granted_at': self.granted_at.isoformat() if self.granted_at else None
        }
        
        if include_role and self.role:
            result['role'] = self.role.to_dict()
        
        if include_permission and self.permission:
            result['permission'] = self.permission.to_dict()
        
        return result
    
    def __repr__(self):
        return f'<RolePermission {self.role_id}-{self.permission_id}>'
    
    # 约束
    __table_args__ = (
        UniqueConstraint('role_id', 'permission_id', name='uk_role_permission'),
    )