from flask import Blueprint, request, jsonify, g
from functools import wraps

from app.services.auth_service import AuthService
from app.services.user_service import UserService
from app.utils.response import success_response, error_response
from app.models import User
from app.models.role import Role
from app.models.user_role import UserRole
from app.db import db


auth_bp = Blueprint('auth', __name__)


def login_required(f):
    """登录验证装饰器"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return error_response("缺少认证令牌"), 401
        
        token = auth_header.split(' ')[1]
        token_data = AuthService.verify_token(token)
        
        if not token_data:
            return error_response("无效或已过期的令牌"), 401
        
        # 将用户信息添加到请求上下文
        g.user_id = token_data['user_id']
        g.session_id = token_data['session_id']
        
        return f(*args, **kwargs)
    
    return decorated_function


def permission_required(permission_code: str):
    """权限验证装饰器"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not hasattr(g, 'user_id'):
                return error_response("未认证用户"), 401
            
            if not AuthService.check_permission(g.user_id, permission_code):
                return error_response("权限不足"), 403
            
            return f(*args, **kwargs)
        
        return decorated_function
    return decorator


@auth_bp.route('/login', methods=['POST'])
def login():
    """用户登录"""
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            return error_response("用户名和密码不能为空"), 400
        
        # 认证用户
        user = AuthService.authenticate(username, password)
        if not user:
            return error_response("用户名或密码错误"), 401
        
        # 创建会话
        session_data = AuthService.create_session(
            user_id=user['id'],
            device_info=data.get('device_info'),
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent')
        )
        
        # 获取用户权限
        permissions = AuthService.get_user_permissions(user['id'])
        
        return success_response({
            'user': user,
            'tokens': session_data,
            'permissions': permissions
        })
        
    except Exception as e:
        return error_response(f"登录失败: {str(e)}"), 500


@auth_bp.route('/register', methods=['POST'])
def register():
    """用户注册"""
    try:
        data = request.get_json()
        
        # 验证必填字段
        required_fields = ['username', 'email', 'password']
        for field in required_fields:
            if not data.get(field):
                return error_response(f"{field}不能为空"), 400
        
        # 检查是否是第一个用户
        user_count = User.query.count()
        is_first_user = user_count == 0
        
        # 创建用户
        user = UserService.create_user(data)
        
        # 如果是第一个用户，自动登录并分配管理员角色
        if is_first_user:
            admin_role = Role.query.filter_by(code='admin').first()
            if admin_role:
                user_role = UserRole(user_id=user['id'], role_id=admin_role.id)
                db.session.add(user_role)
                db.session.commit()

            # 自动登录第一个用户
            auth_user = AuthService.authenticate(data['username'], data['password'])
            if auth_user:
                # 创建会话
                session_data = AuthService.create_session(
                    user_id=auth_user['id'],
                    device_info=data.get('device_info'),
                    ip_address=request.remote_addr,
                    user_agent=request.headers.get('User-Agent')
                )
                
                # 获取用户权限
                permissions = AuthService.get_user_permissions(auth_user['id'])
                
                return success_response({
                    'user': auth_user,
                    'tokens': session_data,
                    'permissions': permissions,
                    'is_first_user': True
                }, message="注册成功，您是第一个用户，已自动获得管理员权限")
        
        return success_response(user, message="用户注册成功")
        
    except ValueError as e:
        return error_response(str(e)), 400
    except Exception as e:
        return error_response(f"注册失败: {str(e)}"), 500


@auth_bp.route('/refresh', methods=['POST'])
def refresh_token():
    """刷新访问令牌"""
    try:
        data = request.get_json()
        refresh_token = data.get('refresh_token')
        
        if not refresh_token:
            return error_response("缺少刷新令牌"), 400
        
        # 刷新令牌
        new_tokens = AuthService.refresh_token(refresh_token)
        if not new_tokens:
            return error_response("无效或已过期的刷新令牌"), 401
        
        return success_response(new_tokens)
        
    except Exception as e:
        return error_response(f"令牌刷新失败: {str(e)}"), 500


@auth_bp.route('/logout', methods=['POST'])
@login_required
def logout():
    """用户登出"""
    try:
        # 撤销当前会话
        AuthService.revoke_session(g.session_id, g.user_id)
        
        return success_response(message="登出成功")
        
    except Exception as e:
        return error_response(f"登出失败: {str(e)}"), 500


@auth_bp.route('/logout-all', methods=['POST'])
@login_required
def logout_all():
    """登出所有设备"""
    try:
        # 撤销用户所有会话
        count = AuthService.revoke_all_sessions(g.user_id)
        
        return success_response({'revoked_sessions': count}, 
                               message=f"已登出{count}个设备")
        
    except Exception as e:
        return error_response(f"全部登出失败: {str(e)}"), 500


@auth_bp.route('/me', methods=['GET'])
@login_required
def get_current_user():
    """获取当前用户信息"""
    try:
        user = UserService.get_user_by_id(g.user_id)
        if not user:
            return error_response("用户不存在"), 404
        
        # 获取用户权限
        permissions = AuthService.get_user_permissions(g.user_id)
        user['permissions'] = permissions
        
        return success_response(user)
        
    except Exception as e:
        return error_response(f"获取用户信息失败: {str(e)}"), 500


@auth_bp.route('/me', methods=['PUT'])
@login_required
def update_current_user():
    """更新当前用户信息"""
    try:
        data = request.get_json()
        
        # 只允许更新特定字段
        allowed_fields = ['full_name', 'phone', 'avatar_url']
        update_data = {k: v for k, v in data.items() if k in allowed_fields}
        
        if not update_data:
            return error_response("没有可更新的字段"), 400
        
        user = UserService.update_user(g.user_id, update_data, g.user_id)
        
        return success_response(user, message="用户信息更新成功")
        
    except ValueError as e:
        return error_response(str(e)), 400
    except Exception as e:
        return error_response(f"更新用户信息失败: {str(e)}"), 500


@auth_bp.route('/change-password', methods=['POST'])
@login_required
def change_password():
    """修改密码"""
    try:
        data = request.get_json()
        old_password = data.get('old_password')
        new_password = data.get('new_password')
        
        if not old_password or not new_password:
            return error_response("旧密码和新密码不能为空"), 400
        
        # 验证旧密码
        from werkzeug.security import check_password_hash
        
        user = User.query.get(g.user_id)
        if not check_password_hash(user.password_hash, old_password):
            return error_response("旧密码错误"), 400
        
        # 更新密码
        UserService.update_user(g.user_id, {'password': new_password}, g.user_id)
        
        # 撤销其他会话（除当前会话外）
        from app.models import UserSession
        other_sessions = UserSession.query.filter(
            UserSession.user_id == g.user_id,
            UserSession.id != g.session_id,
            UserSession.status == 'active'
        ).all()
        
        for session in other_sessions:
            session.revoke()
        
        return success_response(message="密码修改成功，其他设备已被登出")
        
    except Exception as e:
        return error_response(f"修改密码失败: {str(e)}"), 500


@auth_bp.route('/sessions', methods=['GET'])
@login_required
def get_user_sessions():
    """获取用户会话列表"""
    try:
        from app.models import UserSession
        
        sessions = UserSession.query.filter_by(user_id=g.user_id).all()
        
        sessions_data = []
        for session in sessions:
            session_data = session.to_dict()
            session_data['is_current'] = session.id == g.session_id
            sessions_data.append(session_data)
        
        return success_response(sessions_data)
        
    except Exception as e:
        return error_response(f"获取会话列表失败: {str(e)}"), 500


@auth_bp.route('/sessions/<session_id>', methods=['DELETE'])
@login_required
def revoke_session(session_id):
    """撤销指定会话"""
    try:
        success = AuthService.revoke_session(session_id, g.user_id)
        
        if success:
            return success_response(message="会话已撤销")
        else:
            return error_response("会话不存在"), 404
        
    except Exception as e:
        return error_response(f"撤销会话失败: {str(e)}"), 500


# 导出装饰器供其他模块使用
__all__ = ['auth_bp', 'login_required', 'permission_required']