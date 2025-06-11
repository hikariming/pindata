from sqlalchemy import Column, String, DateTime, Text, Enum as SQLEnum, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
import uuid

from app.db import db


class SessionStatus(enum.Enum):
    ACTIVE = "active"
    REVOKED = "revoked"
    EXPIRED = "expired"


class UserSession(db.Model):
    __tablename__ = 'user_sessions'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey('users.id'), nullable=False, index=True)
    access_token_hash = Column(String(255), nullable=False, index=True)
    refresh_token_hash = Column(String(255))
    device_info = Column(Text)  # 设备信息
    ip_address = Column(String(45))  # IPv4/IPv6
    user_agent = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=False, index=True)
    last_activity_at = Column(DateTime, default=datetime.utcnow)
    status = Column(SQLEnum(SessionStatus), default=SessionStatus.ACTIVE, index=True)
    
    # Relationships
    user = relationship("User", back_populates="user_sessions")
    
    def to_dict(self, include_user=False):
        result = {
            'id': self.id,
            'user_id': self.user_id,
            'device_info': self.device_info,
            'ip_address': self.ip_address,
            'user_agent': self.user_agent,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'last_activity_at': self.last_activity_at.isoformat() if self.last_activity_at else None,
            'status': self.status.value
        }
        
        if include_user and self.user:
            result['user'] = self.user.to_dict()
        
        return result
    
    def is_expired(self):
        return datetime.utcnow() > self.expires_at
    
    def is_active(self):
        return self.status == SessionStatus.ACTIVE and not self.is_expired()
    
    def revoke(self):
        self.status = SessionStatus.REVOKED
    
    def update_activity(self):
        self.last_activity_at = datetime.utcnow()
    
    def __repr__(self):
        return f'<UserSession {self.user_id}-{self.id}>'