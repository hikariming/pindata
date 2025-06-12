from sqlalchemy import Column, String, Integer, Text, DateTime, Enum as SQLEnum, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
import uuid

from app.db import db


class OrganizationStatus(enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"


class Organization(db.Model):
    __tablename__ = 'organizations'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    code = Column(String(100), unique=True, index=True)
    description = Column(Text)
    parent_id = Column(String(36), ForeignKey('organizations.id'), index=True)
    path = Column(String(1000), index=True)  # 层级路径，如 /root/dept1/team1
    level = Column(Integer, default=1, index=True)
    sort_order = Column(Integer, default=0)
    status = Column(SQLEnum(OrganizationStatus), default=OrganizationStatus.ACTIVE)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(String(36))
    updated_by = Column(String(36))
    
    # Self-referential relationship
    parent = relationship("Organization", remote_side="Organization.id", back_populates="children")
    children = relationship("Organization", back_populates="parent", cascade="all, delete-orphan")
    
    # Relationships
    user_organizations = relationship("UserOrganization", back_populates="organization", cascade="all, delete-orphan")
    user_roles = relationship("UserRole", back_populates="organization")
    
    def to_dict(self, include_children=False):
        result = {
            'id': self.id,
            'name': self.name,
            'code': self.code,
            'description': self.description,
            'parent_id': self.parent_id,
            'path': self.path,
            'level': self.level,
            'sort_order': self.sort_order,
            'status': self.status.value,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
        
        if include_children:
            result['children'] = [child.to_dict() for child in self.children]
        
        return result
    
    def get_ancestors(self):
        """获取所有上级组织"""
        ancestors = []
        current = self.parent
        while current:
            ancestors.append(current)
            current = current.parent
        return ancestors
    
    def get_descendants(self):
        """获取所有下级组织"""
        descendants = []
        for child in self.children:
            descendants.append(child)
            descendants.extend(child.get_descendants())
        return descendants
    
    def __repr__(self):
        return f'<Organization {self.name}>'