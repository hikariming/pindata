from sqlalchemy import Column, String, Boolean, Date, DateTime, Enum as SQLEnum, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
import uuid

from app.db import db


class UserOrgStatus(enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"


class UserOrganization(db.Model):
    __tablename__ = 'user_organizations'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey('users.id'), nullable=False, index=True)
    organization_id = Column(String(36), ForeignKey('organizations.id'), nullable=False, index=True)
    is_primary = Column(Boolean, default=False, index=True)  # 是否主组织
    position = Column(String(100))  # 职位
    joined_at = Column(DateTime, default=datetime.utcnow)
    status = Column(SQLEnum(UserOrgStatus), default=UserOrgStatus.ACTIVE)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="user_organizations")
    organization = relationship("Organization", back_populates="user_organizations")
    
    def to_dict(self, include_user=False, include_organization=False):
        result = {
            'id': self.id,
            'user_id': self.user_id,
            'organization_id': self.organization_id,
            'is_primary': self.is_primary,
            'position': self.position,
            'joined_at': self.joined_at.isoformat() if self.joined_at else None,
            'status': self.status.value,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
        
        if include_user and self.user:
            result['user'] = self.user.to_dict()
        
        if include_organization and self.organization:
            result['organization'] = self.organization.to_dict()
        
        return result
    
    def __repr__(self):
        return f'<UserOrganization {self.user_id}-{self.organization_id}>'
    
    # 约束
    __table_args__ = (
        UniqueConstraint('user_id', 'organization_id', name='uk_user_org'),
    )