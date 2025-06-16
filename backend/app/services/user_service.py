from typing import Dict, List, Optional
from werkzeug.security import generate_password_hash
from sqlalchemy import or_, and_

from app.db import db
from app.models import (
    User, UserStatus, Organization, Role, UserRole, UserOrganization,
    ResourcePermission, AuditLog, UserOrgStatus
)


class UserService:
    """用户管理服务"""
    
    @staticmethod
    def create_user(data: Dict) -> Dict:
        """创建用户"""
        # 检查用户名和邮箱是否已存在
        existing = User.query.filter(
            or_(User.username == data['username'], User.email == data['email'])
        ).first()
        
        if existing:
            raise ValueError("用户名或邮箱已存在")
        
        # 检查是否是第一个用户
        user_count = User.query.count()
        is_first_user = user_count == 0
        
        # 创建用户
        user = User(
            username=data['username'],
            email=data['email'],
            password_hash=generate_password_hash(data['password']),
            full_name=data.get('full_name'),
            phone=data.get('phone'),
            created_by=data.get('created_by')
        )
        
        db.session.add(user)
        db.session.flush()
        
        # 分配角色：第一个用户自动为超级管理员，其他用户为普通用户
        if is_first_user:
            # 第一个用户自动获得超级管理员权限
            super_admin_role = Role.query.filter_by(code='super_admin').first()
            if super_admin_role:
                user_role = UserRole(
                    user_id=user.id,
                    role_id=super_admin_role.id,
                    granted_by=user.id  # 自己给自己分配
                )
                db.session.add(user_role)
            default_role_code = 'super_admin'
        else:
            # 其他用户分配默认角色
            default_role_code = data.get('role_code', 'user')
            default_role = Role.query.filter_by(code=default_role_code).first()
            if default_role:
                user_role = UserRole(
                    user_id=user.id,
                    role_id=default_role.id,
                    granted_by=data.get('created_by')
                )
                db.session.add(user_role)
        
        # 加入组织
        if data.get('organization_id'):
            user_org = UserOrganization(
                user_id=user.id,
                organization_id=data['organization_id'],
                is_primary=True,
                position=data.get('position')
            )
            db.session.add(user_org)
        elif is_first_user:
            # 第一个用户自动加入默认组织
            root_org = Organization.query.filter_by(code='root').first()
            if root_org:
                user_org = UserOrganization(
                    user_id=user.id,
                    organization_id=root_org.id,
                    is_primary=True,
                    position='超级管理员'
                )
                db.session.add(user_org)
        
        db.session.commit()
        
        # 记录审计日志
        UserService._log_audit('user.create', user.id, None, user.to_dict(), 
                              data.get('created_by'))
        
        return user.to_dict()
    
    @staticmethod
    def update_user(user_id: str, data: Dict, operator_id: str = None) -> Dict:
        """更新用户信息"""
        user = User.query.get(user_id)
        if not user:
            raise ValueError("用户不存在")
        
        old_data = user.to_dict()
        
        # 更新基本信息
        if 'full_name' in data:
            user.full_name = data['full_name']
        if 'phone' in data:
            user.phone = data['phone']
        if 'avatar_url' in data:
            user.avatar_url = data['avatar_url']
        if 'status' in data:
            user.status = UserStatus(data['status'])
        
        # 更新密码
        if 'password' in data:
            user.password_hash = generate_password_hash(data['password'])
        
        user.updated_by = operator_id
        db.session.commit()
        
        # 记录审计日志
        UserService._log_audit('user.update', user.id, old_data, user.to_dict(), 
                              operator_id)
        
        return user.to_dict()
    
    @staticmethod
    def delete_user(user_id: str, operator_id: str = None) -> bool:
        """删除用户（软删除）"""
        user = User.query.get(user_id)
        if not user:
            raise ValueError("用户不存在")
        
        old_data = user.to_dict()
        
        # 软删除：设置状态为inactive
        user.status = UserStatus.INACTIVE
        user.updated_by = operator_id
        
        # 撤销所有会话
        from app.services.auth_service import AuthService
        AuthService.revoke_all_sessions(user_id)
        
        db.session.commit()
        
        # 记录审计日志
        UserService._log_audit('user.delete', user.id, old_data, user.to_dict(), 
                              operator_id)
        
        return True
    
    @staticmethod
    def get_users(page: int = 1, per_page: int = 20, **filters) -> Dict:
        """获取用户列表"""
        query = User.query
        
        # 应用过滤条件
        if filters.get('status'):
            query = query.filter(User.status == UserStatus(filters['status']))
        
        if filters.get('search'):
            search = f"%{filters['search']}%"
            query = query.filter(
                or_(
                    User.username.like(search),
                    User.email.like(search),
                    User.full_name.like(search)
                )
            )
        
        if filters.get('organization_id'):
            query = query.join(UserOrganization).filter(
                UserOrganization.organization_id == filters['organization_id']
            )
        
        # 分页
        pagination = query.paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return {
            'users': [user.to_dict() for user in pagination.items],
            'total': pagination.total,
            'pages': pagination.pages,
            'current_page': page,
            'per_page': per_page
        }
    
    @staticmethod
    def get_user_by_id(user_id: str) -> Optional[Dict]:
        """根据ID获取用户详情"""
        user = User.query.get(user_id)
        if not user:
            return None
        
        user_data = user.to_dict()
        
        # 添加角色信息
        user_roles = db.session.query(UserRole).filter_by(
            user_id=user_id, status='ACTIVE'
        ).all()
        user_data['roles'] = [
            {
                'id': ur.role.id,
                'name': ur.role.name,
                'code': ur.role.code,
                'organization_id': ur.organization_id
            }
            for ur in user_roles
        ]
        
        # 添加组织信息
        user_orgs = db.session.query(UserOrganization).filter_by(
            user_id=user_id, status=UserOrgStatus.ACTIVE
        ).all()
        user_data['organizations'] = [
            {
                'id': uo.organization.id,
                'name': uo.organization.name,
                'code': uo.organization.code,
                'is_primary': uo.is_primary,
                'position': uo.position
            }
            for uo in user_orgs
        ]
        
        return user_data
    
    @staticmethod
    def assign_role(user_id: str, role_id: str, organization_id: str = None,
                   granted_by: str = None) -> bool:
        """为用户分配角色"""
        # 检查用户和角色是否存在
        user = User.query.get(user_id)
        role = Role.query.get(role_id)
        
        if not user or not role:
            raise ValueError("用户或角色不存在")
        
        # 检查是否已经分配
        existing = UserRole.query.filter_by(
            user_id=user_id,
            role_id=role_id,
            organization_id=organization_id
        ).first()
        
        if existing:
            if existing.status.value == 'ACTIVE':
                raise ValueError("用户已拥有该角色")
            else:
                # 重新激活
                existing.status = 'ACTIVE'
                existing.granted_by = granted_by
                existing.granted_at = db.func.now()
        else:
            # 创建新分配
            user_role = UserRole(
                user_id=user_id,
                role_id=role_id,
                organization_id=organization_id,
                granted_by=granted_by
            )
            db.session.add(user_role)
        
        db.session.commit()
        
        # 记录审计日志
        UserService._log_audit('user.assign_role', user_id, None, 
                              {'role_id': role_id, 'organization_id': organization_id}, 
                              granted_by)
        
        return True
    
    @staticmethod
    def revoke_role(user_id: str, role_id: str, organization_id: str = None,
                   revoked_by: str = None) -> bool:
        """撤销用户角色"""
        user_role = UserRole.query.filter_by(
            user_id=user_id,
            role_id=role_id,
            organization_id=organization_id,
            status='ACTIVE'
        ).first()
        
        if not user_role:
            raise ValueError("用户角色分配不存在")
        
        user_role.status = 'INACTIVE'
        db.session.commit()
        
        # 记录审计日志
        UserService._log_audit('user.revoke_role', user_id, 
                              {'role_id': role_id, 'organization_id': organization_id}, 
                              None, revoked_by)
        
        return True
    
    @staticmethod
    def join_organization(user_id: str, organization_id: str, position: str = None,
                         is_primary: bool = False) -> bool:
        """用户加入组织"""
        # 检查是否已加入
        existing = UserOrganization.query.filter_by(
            user_id=user_id,
            organization_id=organization_id
        ).first()
        
        if existing:
            if existing.status == UserOrgStatus.ACTIVE:
                raise ValueError("用户已在该组织中")
            else:
                # 重新激活
                existing.status = UserOrgStatus.ACTIVE
                existing.position = position
                existing.is_primary = is_primary
        else:
            # 创建新关系
            user_org = UserOrganization(
                user_id=user_id,
                organization_id=organization_id,
                position=position,
                is_primary=is_primary
            )
            db.session.add(user_org)
        
        db.session.commit()
        return True
    
    @staticmethod
    def leave_organization(user_id: str, organization_id: str) -> bool:
        """用户离开组织"""
        user_org = UserOrganization.query.filter_by(
            user_id=user_id,
            organization_id=organization_id,
            status=UserOrgStatus.ACTIVE
        ).first()
        
        if not user_org:
            raise ValueError("用户不在该组织中")
        
        user_org.status = UserOrgStatus.INACTIVE
        db.session.commit()
        return True
    
    @staticmethod
    def _log_audit(action: str, user_id: str, old_values: Dict = None, 
                  new_values: Dict = None, operator_id: str = None):
        """记录审计日志"""
        audit_log = AuditLog(
            user_id=operator_id,
            action=action,
            resource_type='user',
            resource_id=user_id,
            old_values=old_values,
            new_values=new_values
        )
        db.session.add(audit_log)
        db.session.commit()