from datetime import datetime
from sqlalchemy import Column, String, DateTime, Enum, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
import enum
import uuid

from app.db import db


class ProjectRole(enum.Enum):
    """项目角色枚举"""
    OWNER = "owner"           # 项目负责人
    ADMIN = "admin"          # 管理员
    EDITOR = "editor"        # 编辑者
    VIEWER = "viewer"        # 查看者


class MemberStatus(enum.Enum):
    """成员状态枚举"""
    ACTIVE = "active"        # 活跃
    INACTIVE = "inactive"    # 非活跃
    INVITED = "invited"      # 已邀请
    REMOVED = "removed"      # 已移除


class ProjectTeamMember(db.Model):
    """项目团队成员模型"""
    __tablename__ = 'project_team_members'
    __table_args__ = (
        UniqueConstraint('project_id', 'user_id', name='uq_project_user'),
    )
    
    # 基础信息
    id = Column(String(36), primary_key=True)
    project_id = Column(String(36), ForeignKey('data_governance_projects.id'), nullable=False)
    user_id = Column(String(36), ForeignKey('users.id'), nullable=False)
    
    # 角色信息
    role = Column(Enum(ProjectRole), nullable=False)
    status = Column(Enum(MemberStatus), default=MemberStatus.ACTIVE)
    
    # 时间戳
    joined_at = Column(DateTime, default=datetime.utcnow)
    invited_at = Column(DateTime)
    removed_at = Column(DateTime)
    
    # 邀请信息
    invited_by = Column(String(36), ForeignKey('users.id'))
    invitation_message = Column(String(500))
    
    # 关系
    project = relationship("DataGovernanceProject", back_populates="team_members")
    user = relationship("User", foreign_keys=[user_id])
    inviter = relationship("User", foreign_keys=[invited_by])
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.id:
            self.id = str(uuid.uuid4())
    
    def to_dict(self):
        return {
            'id': self.id,
            'project_id': self.project_id,
            'user_id': self.user_id,
            'role': self.role.value if self.role else None,
            'status': self.status.value if self.status else None,
            'joined_at': self.joined_at.isoformat() if self.joined_at else None,
            'invited_at': self.invited_at.isoformat() if self.invited_at else None,
            'removed_at': self.removed_at.isoformat() if self.removed_at else None,
            'invited_by': self.invited_by,
            'invitation_message': self.invitation_message,
        } 