from flask import Blueprint, request, jsonify, g

from app.services.user_service import UserService
from app.utils.response import success_response, error_response
from .auth import login_required, permission_required


users_bp = Blueprint('users', __name__)


@users_bp.route('/users', methods=['GET'])
@login_required
@permission_required('user.manage')
def get_users():
    """获取用户列表"""
    try:
        # 获取查询参数
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        status = request.args.get('status')
        search = request.args.get('search')
        organization_id = request.args.get('organization_id')
        
        # 构建过滤条件
        filters = {}
        if status:
            filters['status'] = status
        if search:
            filters['search'] = search
        if organization_id:
            filters['organization_id'] = organization_id
        
        # 获取用户列表
        result = UserService.get_users(page=page, per_page=per_page, **filters)
        
        return success_response(result)
        
    except Exception as e:
        return error_response(f"获取用户列表失败: {str(e)}"), 500


@users_bp.route('/users', methods=['POST'])
@login_required
@permission_required('user.manage')
def create_user():
    """创建用户"""
    try:
        data = request.get_json()
        
        # 验证必填字段
        required_fields = ['username', 'email', 'password']
        for field in required_fields:
            if not data.get(field):
                return error_response(f"{field}不能为空"), 400
        
        # 添加创建者信息
        data['created_by'] = g.user_id
        
        # 创建用户
        user = UserService.create_user(data)
        
        return success_response(user, message="用户创建成功")
        
    except ValueError as e:
        return error_response(str(e)), 400
    except Exception as e:
        return error_response(f"创建用户失败: {str(e)}"), 500


@users_bp.route('/users/<user_id>', methods=['GET'])
@login_required
@permission_required('user.manage')
def get_user(user_id):
    """获取用户详情"""
    try:
        user = UserService.get_user_by_id(user_id)
        
        if not user:
            return error_response("用户不存在"), 404
        
        return success_response(user)
        
    except Exception as e:
        return error_response(f"获取用户详情失败: {str(e)}"), 500


@users_bp.route('/users/<user_id>', methods=['PUT'])
@login_required
@permission_required('user.manage')
def update_user(user_id):
    """更新用户信息"""
    try:
        data = request.get_json()
        
        if not data:
            return error_response("没有提供更新数据"), 400
        
        # 更新用户
        user = UserService.update_user(user_id, data, g.user_id)
        
        return success_response(user, message="用户信息更新成功")
        
    except ValueError as e:
        return error_response(str(e)), 400
    except Exception as e:
        return error_response(f"更新用户失败: {str(e)}"), 500


@users_bp.route('/users/<user_id>', methods=['DELETE'])
@login_required
@permission_required('user.manage')
def delete_user(user_id):
    """删除用户"""
    try:
        # 不能删除自己
        if user_id == g.user_id:
            return error_response("不能删除自己"), 400
        
        success = UserService.delete_user(user_id, g.user_id)
        
        if success:
            return success_response(message="用户删除成功")
        else:
            return error_response("删除用户失败"), 500
        
    except ValueError as e:
        return error_response(str(e)), 400
    except Exception as e:
        return error_response(f"删除用户失败: {str(e)}"), 500


@users_bp.route('/users/<user_id>/roles', methods=['POST'])
@login_required
@permission_required('user.manage')
def assign_user_role(user_id):
    """为用户分配角色"""
    try:
        data = request.get_json()
        role_id = data.get('role_id')
        organization_id = data.get('organization_id')
        
        if not role_id:
            return error_response("角色ID不能为空"), 400
        
        success = UserService.assign_role(
            user_id=user_id,
            role_id=role_id,
            organization_id=organization_id,
            granted_by=g.user_id
        )
        
        if success:
            return success_response(message="角色分配成功")
        else:
            return error_response("角色分配失败"), 500
        
    except ValueError as e:
        return error_response(str(e)), 400
    except Exception as e:
        return error_response(f"角色分配失败: {str(e)}"), 500


@users_bp.route('/users/<user_id>/roles/<role_id>', methods=['DELETE'])
@login_required
@permission_required('user.manage')
def revoke_user_role(user_id, role_id):
    """撤销用户角色"""
    try:
        organization_id = request.args.get('organization_id')
        
        success = UserService.revoke_role(
            user_id=user_id,
            role_id=role_id,
            organization_id=organization_id,
            revoked_by=g.user_id
        )
        
        if success:
            return success_response(message="角色撤销成功")
        else:
            return error_response("角色撤销失败"), 500
        
    except ValueError as e:
        return error_response(str(e)), 400
    except Exception as e:
        return error_response(f"角色撤销失败: {str(e)}"), 500


@users_bp.route('/users/<user_id>/organizations', methods=['POST'])
@login_required
@permission_required('organization.manage')
def join_organization(user_id):
    """用户加入组织"""
    try:
        data = request.get_json()
        organization_id = data.get('organization_id')
        position = data.get('position')
        is_primary = data.get('is_primary', False)
        
        if not organization_id:
            return error_response("组织ID不能为空"), 400
        
        success = UserService.join_organization(
            user_id=user_id,
            organization_id=organization_id,
            position=position,
            is_primary=is_primary
        )
        
        if success:
            return success_response(message="用户已加入组织")
        else:
            return error_response("加入组织失败"), 500
        
    except ValueError as e:
        return error_response(str(e)), 400
    except Exception as e:
        return error_response(f"加入组织失败: {str(e)}"), 500


@users_bp.route('/users/<user_id>/organizations/<organization_id>', methods=['DELETE'])
@login_required
@permission_required('organization.manage')
def leave_organization(user_id, organization_id):
    """用户离开组织"""
    try:
        success = UserService.leave_organization(user_id, organization_id)
        
        if success:
            return success_response(message="用户已离开组织")
        else:
            return error_response("离开组织失败"), 500
        
    except ValueError as e:
        return error_response(str(e)), 400
    except Exception as e:
        return error_response(f"离开组织失败: {str(e)}"), 500


@users_bp.route('/users/<user_id>/permissions', methods=['GET'])
@login_required
@permission_required('user.manage')
def get_user_permissions(user_id):
    """获取用户权限列表"""
    try:
        from app.services.auth_service import AuthService
        
        permissions = AuthService.get_user_permissions(user_id)
        
        return success_response({'permissions': permissions})
        
    except Exception as e:
        return error_response(f"获取用户权限失败: {str(e)}"), 500