from datetime import datetime, timedelta
from typing import Dict, Optional, List
import jwt
import hashlib
from werkzeug.security import check_password_hash, generate_password_hash

from app.db import db
from app.models import User, UserSession, Role, Permission, UserRole, RolePermission
from app.models.user import UserStatus
from config.config import get_config


class AuthService:
    """认证服务"""
    
    @staticmethod
    def authenticate(username: str, password: str) -> Optional[Dict]:
        """用户认证"""
        user = User.query.filter(
            (User.username == username) | (User.email == username)
        ).first()
        
        if not user or not check_password_hash(user.password_hash, password):
            return None
        
        if user.status != UserStatus.ACTIVE:
            return None
        
        # 更新最后登录时间
        user.last_login_at = datetime.utcnow()
        db.session.commit()
        
        return user.to_dict()
    
    @staticmethod
    def create_session(user_id: str, device_info: str = None, 
                      ip_address: str = None, user_agent: str = None) -> Dict:
        """创建用户会话"""
        config = get_config()
        
        # 生成tokens
        access_token = AuthService._generate_access_token(user_id)
        refresh_token = AuthService._generate_refresh_token(user_id)
        
        # 计算token哈希
        access_token_hash = hashlib.sha256(access_token.encode()).hexdigest()
        refresh_token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
        
        # 创建会话记录
        session = UserSession(
            user_id=user_id,
            access_token_hash=access_token_hash,
            refresh_token_hash=refresh_token_hash,
            device_info=device_info,
            ip_address=ip_address,
            user_agent=user_agent,
            expires_at=datetime.utcnow() + timedelta(days=7)  # 7天过期
        )
        
        db.session.add(session)
        db.session.commit()
        
        return {
            'access_token': access_token,
            'refresh_token': refresh_token,
            'session_id': session.id,
            'expires_at': session.expires_at.isoformat()
        }
    
    @staticmethod
    def verify_token(token: str) -> Optional[Dict]:
        """验证access token"""
        try:
            config = get_config()
            payload = jwt.decode(token, config.SECRET_KEY, algorithms=['HS256'])
            user_id = payload.get('user_id')
            
            # 检查会话是否存在且有效
            token_hash = hashlib.sha256(token.encode()).hexdigest()
            session = UserSession.query.filter_by(
                access_token_hash=token_hash,
                user_id=user_id
            ).first()
            
            if not session or not session.is_active():
                return None
            
            # 更新最后活动时间
            session.update_activity()
            db.session.commit()
            
            return {
                'user_id': user_id,
                'session_id': session.id,
                'exp': payload.get('exp')
            }
            
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None
    
    @staticmethod
    def refresh_token(refresh_token: str) -> Optional[Dict]:
        """刷新token"""
        try:
            config = get_config()
            payload = jwt.decode(refresh_token, config.SECRET_KEY, algorithms=['HS256'])
            user_id = payload.get('user_id')
            
            # 检查refresh token会话
            token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
            session = UserSession.query.filter_by(
                refresh_token_hash=token_hash,
                user_id=user_id
            ).first()
            
            if not session or not session.is_active():
                return None
            
            # 生成新的access token
            new_access_token = AuthService._generate_access_token(user_id)
            new_access_token_hash = hashlib.sha256(new_access_token.encode()).hexdigest()
            
            # 更新会话
            session.access_token_hash = new_access_token_hash
            session.update_activity()
            db.session.commit()
            
            return {
                'access_token': new_access_token,
                'session_id': session.id
            }
            
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None
    
    @staticmethod
    def revoke_session(session_id: str, user_id: str = None) -> bool:
        """撤销会话"""
        query = UserSession.query.filter_by(id=session_id)
        if user_id:
            query = query.filter_by(user_id=user_id)
        
        session = query.first()
        if session:
            session.revoke()
            db.session.commit()
            return True
        return False
    
    @staticmethod
    def revoke_all_sessions(user_id: str) -> int:
        """撤销用户所有会话"""
        sessions = UserSession.query.filter_by(user_id=user_id).all()
        count = 0
        for session in sessions:
            if session.is_active():
                session.revoke()
                count += 1
        db.session.commit()
        return count
    
    @staticmethod
    def get_user_permissions(user_id: str) -> List[str]:
        """获取用户权限列表"""
        permissions = set()
        
        # 获取用户角色权限
        from app.models.user_role import UserRoleStatus
        user_roles = db.session.query(UserRole).filter_by(
            user_id=user_id, 
            status=UserRoleStatus.ACTIVE
        ).all()
        
        for user_role in user_roles:
            if user_role.is_expired():
                continue
                
            role_permissions = db.session.query(RolePermission).filter_by(
                role_id=user_role.role_id
            ).all()
            
            for rp in role_permissions:
                permissions.add(rp.permission.code)
        
        return list(permissions)
    
    @staticmethod
    def check_permission(user_id: str, permission_code: str) -> bool:
        """检查用户是否有特定权限"""
        user_permissions = AuthService.get_user_permissions(user_id)
        return permission_code in user_permissions
    
    @staticmethod
    def check_resource_permission(user_id: str, resource_type: str, 
                                 resource_id: str, permission_type: str) -> bool:
        """检查资源级权限"""
        from app.models import ResourcePermission
        
        permission = ResourcePermission.query.filter_by(
            user_id=user_id,
            resource_type=resource_type,
            resource_id=resource_id,
            status='ACTIVE'
        ).first()
        
        if not permission:
            return False
        
        if permission.is_expired():
            return False
        
        # 权限级别检查: owner > admin > write > read
        permission_levels = {
            'read': 1,
            'write': 2, 
            'admin': 3,
            'owner': 4
        }
        
        user_level = permission_levels.get(permission.permission_type.value, 0)
        required_level = permission_levels.get(permission_type, 0)
        
        return user_level >= required_level
    
    @staticmethod
    def _generate_access_token(user_id: str) -> str:
        """生成access token"""
        config = get_config()
        payload = {
            'user_id': user_id,
            'type': 'access',
            'exp': datetime.utcnow() + timedelta(hours=24)  # 24小时过期
        }
        return jwt.encode(payload, config.SECRET_KEY, algorithm='HS256')
    
    @staticmethod
    def _generate_refresh_token(user_id: str) -> str:
        """生成refresh token"""
        config = get_config()
        payload = {
            'user_id': user_id,
            'type': 'refresh', 
            'exp': datetime.utcnow() + timedelta(days=30)  # 30天过期
        }
        return jwt.encode(payload, config.SECRET_KEY, algorithm='HS256')