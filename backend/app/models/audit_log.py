from sqlalchemy import Column, String, DateTime, Text, JSON, Enum as SQLEnum, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
import uuid

from app.db import db


class AuditStatus(enum.Enum):
    SUCCESS = "success"
    FAILED = "failed"


class AuditLog(db.Model):
    __tablename__ = 'audit_logs'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey('users.id'), index=True)
    organization_id = Column(String(36), ForeignKey('organizations.id'), index=True)
    action = Column(String(100), nullable=False, index=True)  # 操作类型
    resource_type = Column(String(50))  # 资源类型
    resource_id = Column(String(255))   # 资源ID
    old_values = Column(JSON)           # 修改前的值
    new_values = Column(JSON)           # 修改后的值
    ip_address = Column(String(45))
    user_agent = Column(Text)
    request_id = Column(String(36), index=True)  # 关联系统日志
    status = Column(SQLEnum(AuditStatus), default=AuditStatus.SUCCESS)
    error_message = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id], back_populates="created_audit_logs")
    organization = relationship("Organization", foreign_keys=[organization_id])
    
    def to_dict(self, include_user=False, include_organization=False):
        result = {
            'id': self.id,
            'user_id': self.user_id,
            'organization_id': self.organization_id,
            'action': self.action,
            'resource_type': self.resource_type,
            'resource_id': self.resource_id,
            'old_values': self.old_values,
            'new_values': self.new_values,
            'ip_address': self.ip_address,
            'user_agent': self.user_agent,
            'request_id': self.request_id,
            'status': self.status.value,
            'error_message': self.error_message,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
        
        if include_user and self.user:
            result['user'] = self.user.to_dict()
        
        if include_organization and self.organization:
            result['organization'] = self.organization.to_dict()
        
        return result
    
    def __repr__(self):
        return f'<AuditLog {self.action}-{self.resource_type}:{self.resource_id}>'
    
    # 索引
    __table_args__ = (
        db.Index('idx_resource', 'resource_type', 'resource_id'),
    )