from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import desc, and_, or_, func
from datetime import datetime
from app.models.data_governance_project import DataGovernanceProject, ProjectStatus
from app.models.project_team_member import ProjectTeamMember, ProjectRole, MemberStatus
from app.models.user import User
from app.models.organization import Organization


class DataGovernanceService:
    """数据治理工程服务"""

    def __init__(self, db: Session):
        self.db = db

    def get_projects(
        self,
        user_id: int,
        organization_id: Optional[int] = None,
        status_filter: Optional[str] = None,
        search_term: Optional[str] = None,
        sort_by: str = "updated",
        limit: int = 50,
        offset: int = 0,
    ) -> Dict[str, Any]:
        """获取用户可访问的数据治理工程列表"""

        # 基础查询 - 获取用户有权限访问的项目
        query = (
            self.db.query(DataGovernanceProject)
            .join(
                ProjectTeamMember,
                DataGovernanceProject.id == ProjectTeamMember.project_id,
            )
            .filter(
                ProjectTeamMember.user_id == str(user_id),
                ProjectTeamMember.status == MemberStatus.ACTIVE,
            )
        )

        # 组织过滤
        if organization_id:
            query = query.filter(
                DataGovernanceProject.organization_id == str(organization_id)
            )

        # 状态过滤
        if status_filter and status_filter != "all":
            query = query.filter(
                DataGovernanceProject.status == ProjectStatus[status_filter.upper()]
            )

        # 搜索过滤
        if search_term:
            search_pattern = f"%{search_term}%"
            query = query.filter(
                or_(
                    DataGovernanceProject.name.ilike(search_pattern),
                    DataGovernanceProject.description.ilike(search_pattern),
                )
            )

        # 排序
        if sort_by == "updated":
            query = query.order_by(desc(DataGovernanceProject.updated_at))
        elif sort_by == "created":
            query = query.order_by(desc(DataGovernanceProject.created_at))
        elif sort_by == "name":
            query = query.order_by(DataGovernanceProject.name)

        # 获取总数
        total_count = query.count()

        # 分页
        projects = query.offset(offset).limit(limit).all()

        # 构建返回数据
        projects_data = []
        for project in projects:
            # 获取团队成员信息
            team_members = (
                self.db.query(ProjectTeamMember)
                .join(User, ProjectTeamMember.user_id == User.id)
                .filter(
                    ProjectTeamMember.project_id == project.id,
                    ProjectTeamMember.status == MemberStatus.ACTIVE,
                )
                .all()
            )

            # 获取项目所有者
            owner = next(
                (tm for tm in team_members if tm.role == ProjectRole.OWNER), None
            )

            project_data = {
                "id": project.id,
                "name": project.name,
                "description": project.description,
                "status": project.status.value.lower(),
                "createdAt": project.created_at.isoformat()
                if project.created_at
                else None,
                "updatedAt": project.updated_at.isoformat()
                if project.updated_at
                else None,
                "owner": {
                    "id": owner.user.id,
                    "username": owner.user.username,
                    "fullName": owner.user.full_name or owner.user.username,
                    "email": owner.user.email,
                    "role": owner.role.value.lower(),
                    "joinedAt": owner.joined_at.isoformat()
                    if owner.joined_at
                    else None,
                }
                if owner
                else None,
                "team": [
                    {
                        "id": tm.user.id,
                        "username": tm.user.username,
                        "fullName": tm.user.full_name or tm.user.username,
                        "email": tm.user.email,
                        "role": tm.role.value.lower(),
                        "joinedAt": tm.joined_at.isoformat() if tm.joined_at else None,
                    }
                    for tm in team_members
                ],
                "metrics": {
                    "totalDataSize": project.total_data_size or 0,
                    "processedFiles": project.processed_files or 0,
                    "totalFiles": project.total_files or 0,
                    "dataQualityScore": project.data_quality_score or 0,
                    "lastProcessedAt": project.last_processed_at.isoformat()
                    if project.last_processed_at
                    else None,
                    "processingProgress": project.processing_progress or 0,
                },
                "pipeline": [],  # TODO: 实现管道阶段数据
                "dataSource": [],  # TODO: 实现数据源数据
            }
            projects_data.append(project_data)

        return {
            "projects": projects_data,
            "total": total_count,
            "limit": limit,
            "offset": offset,
        }

    def get_project_by_id(
        self, project_id: str, user_id: str
    ) -> Optional[Dict[str, Any]]:
        """根据ID获取项目详情"""

        # 检查用户是否有权限访问此项目
        project = (
            self.db.query(DataGovernanceProject)
            .join(
                ProjectTeamMember,
                DataGovernanceProject.id == ProjectTeamMember.project_id,
            )
            .filter(
                DataGovernanceProject.id == str(project_id),
                ProjectTeamMember.user_id == str(user_id),
                ProjectTeamMember.status == MemberStatus.ACTIVE,
            )
            .first()
        )

        if not project:
            return None

        # 获取团队成员信息
        team_members = (
            self.db.query(ProjectTeamMember)
            .join(User, ProjectTeamMember.user_id == User.id)
            .filter(
                ProjectTeamMember.project_id == project.id,
                ProjectTeamMember.status == MemberStatus.ACTIVE,
            )
            .all()
        )

        # 获取项目所有者
        owner = next((tm for tm in team_members if tm.role == ProjectRole.OWNER), None)

        return {
            "id": project.id,
            "name": project.name,
            "description": project.description,
            "status": project.status.value.lower(),
            "createdAt": project.created_at.isoformat() if project.created_at else None,
            "updatedAt": project.updated_at.isoformat() if project.updated_at else None,
            "owner": {
                "id": owner.user.id,
                "username": owner.user.username,
                "fullName": owner.user.full_name or owner.user.username,
                "email": owner.user.email,
                "role": owner.role.value.lower(),
                "joinedAt": owner.joined_at.isoformat() if owner.joined_at else None,
            }
            if owner
            else None,
            "team": [
                {
                    "id": tm.user.id,
                    "username": tm.user.username,
                    "fullName": tm.user.full_name or tm.user.username,
                    "email": tm.user.email,
                    "role": tm.role.value.lower(),
                    "joinedAt": tm.joined_at.isoformat() if tm.joined_at else None,
                }
                for tm in team_members
            ],
            "metrics": {
                "totalDataSize": project.total_data_size or 0,
                "processedFiles": project.processed_files or 0,
                "totalFiles": project.total_files or 0,
                "dataQualityScore": project.data_quality_score or 0,
                "lastProcessedAt": project.last_processed_at.isoformat()
                if project.last_processed_at
                else None,
                "processingProgress": project.processing_progress or 0,
            },
            "config": project.project_config or {},
            "pipeline": [],  # TODO: 实现管道阶段数据
            "dataSource": [],  # TODO: 实现数据源数据
        }

    def create_project(
        self,
        name: str,
        description: str,
        user_id: int,
        organization_id: str,
        config: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """创建新的数据治理工程"""

        # 创建项目
        project = DataGovernanceProject(
            name=name,
            description=description,
            owner_id=str(user_id),  # 设置项目所有者
            organization_id=organization_id,  # organization_id 已经是字符串
            status=ProjectStatus.DRAFT,
            project_config=config or {},
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )

        self.db.add(project)
        self.db.flush()  # 获取项目ID

        # 添加创建者为项目所有者
        team_member = ProjectTeamMember(
            project_id=project.id,
            user_id=str(user_id),
            role=ProjectRole.OWNER,
            status=MemberStatus.ACTIVE,
            joined_at=datetime.utcnow(),
        )

        self.db.add(team_member)
        self.db.commit()

        # 返回创建的项目信息
        return self.get_project_by_id(project.id, str(user_id))

    def update_project(
        self, project_id: str, user_id: str, **kwargs
    ) -> Optional[Dict[str, Any]]:
        """更新数据治理工程"""

        # 检查用户是否有权限更新此项目（只有OWNER和ADMIN可以更新）
        team_member = (
            self.db.query(ProjectTeamMember)
            .filter(
                ProjectTeamMember.project_id == str(project_id),
                ProjectTeamMember.user_id == str(user_id),
                ProjectTeamMember.status == MemberStatus.ACTIVE,
                ProjectTeamMember.role.in_([ProjectRole.OWNER, ProjectRole.ADMIN]),
            )
            .first()
        )

        if not team_member:
            return None

        # 获取项目
        project = (
            self.db.query(DataGovernanceProject)
            .filter(DataGovernanceProject.id == str(project_id))
            .first()
        )

        if not project:
            return None

        # 更新字段
        updatable_fields = ["name", "description", "status", "project_config"]
        for field in updatable_fields:
            if field in kwargs:
                if field == "status" and isinstance(kwargs[field], str):
                    # 状态字符串转换为枚举
                    try:
                        setattr(project, field, ProjectStatus[kwargs[field].upper()])
                    except KeyError:
                        continue
                elif field == "config":
                    # Handle legacy config field name
                    setattr(project, "project_config", kwargs[field])
                else:
                    setattr(project, field, kwargs[field])

        project.updated_at = datetime.utcnow()
        self.db.commit()

        return self.get_project_by_id(project_id, user_id)

    def delete_project(self, project_id: str, user_id: str) -> bool:
        """删除数据治理工程（只有OWNER可以删除）"""

        # 检查用户是否为项目所有者
        team_member = (
            self.db.query(ProjectTeamMember)
            .filter(
                ProjectTeamMember.project_id == str(project_id),
                ProjectTeamMember.user_id == str(user_id),
                ProjectTeamMember.status == MemberStatus.ACTIVE,
                ProjectTeamMember.role == ProjectRole.OWNER,
            )
            .first()
        )

        if not team_member:
            return False

        # 获取项目
        project = (
            self.db.query(DataGovernanceProject)
            .filter(DataGovernanceProject.id == str(project_id))
            .first()
        )

        if not project:
            return False

        # 删除项目（级联删除团队成员等关联数据）
        self.db.delete(project)
        self.db.commit()

        return True

    def get_user_project_stats(
        self, user_id: int, organization_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """获取用户的项目统计信息"""

        # 基础查询
        query = (
            self.db.query(DataGovernanceProject)
            .join(
                ProjectTeamMember,
                DataGovernanceProject.id == ProjectTeamMember.project_id,
            )
            .filter(
                ProjectTeamMember.user_id == str(user_id),
                ProjectTeamMember.status == MemberStatus.ACTIVE,
            )
        )

        if organization_id:
            query = query.filter(
                DataGovernanceProject.organization_id == organization_id
            )

        projects = query.all()

        # 统计数据
        total_projects = len(projects)
        active_projects = len([p for p in projects if p.status == ProjectStatus.ACTIVE])
        draft_projects = len([p for p in projects if p.status == ProjectStatus.DRAFT])
        completed_projects = len(
            [p for p in projects if p.status == ProjectStatus.COMPLETED]
        )

        total_data_size = sum(p.total_data_size or 0 for p in projects)
        total_files = sum(p.total_files or 0 for p in projects)
        processed_files = sum(p.processed_files or 0 for p in projects)

        # 获取所有团队成员数（去重）
        all_team_members = set()
        for project in projects:
            members = (
                self.db.query(ProjectTeamMember)
                .filter(
                    ProjectTeamMember.project_id == project.id,
                    ProjectTeamMember.status == MemberStatus.ACTIVE,
                )
                .all()
            )
            for member in members:
                all_team_members.add(member.user_id)

        return {
            "totalProjects": total_projects,
            "activeProjects": active_projects,
            "draftProjects": draft_projects,
            "completedProjects": completed_projects,
            "totalDataSize": total_data_size,
            "totalFiles": total_files,
            "processedFiles": processed_files,
            "teamMembersCount": len(all_team_members),
        }
