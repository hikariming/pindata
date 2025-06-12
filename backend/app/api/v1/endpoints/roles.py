from flask import Blueprint, request, jsonify, g

from app.services.user_service import UserService
from app.utils.response import success_response, error_response
from .auth import login_required, permission_required
from app.models.role import Role
from app.models.permission import Permission  
from app.models.role_permission import RolePermission
from app.db import db


roles_bp = Blueprint('roles', __name__)


@roles_bp.route('/roles', methods=['GET'])
@login_required
@permission_required('role.manage')
def get_roles():
    """获取角色列表"""
    try:
        # 获取查询参数
        include_permissions = request.args.get('include_permissions', 'false').lower() == 'true'
        role_type = request.args.get('type')
        status = request.args.get('status')
        
        # 构建查询
        query = Role.query
        
        if role_type:
            query = query.filter_by(type=role_type)
        if status:
            query = query.filter_by(status=status)
        
        roles = query.order_by(Role.name).all()
        
        # 转换为字典格式
        roles_data = [role.to_dict(include_permissions=include_permissions) for role in roles]
        
        return success_response(roles_data)
        
    except Exception as e:
        return error_response(f"获取角色列表失败: {str(e)}"), 500


@roles_bp.route('/roles', methods=['POST'])
@login_required
@permission_required('role.manage')
def create_role():
    """创建角色"""
    try:
        data = request.get_json()
        
        # 验证必填字段
        required_fields = ['name', 'code']
        for field in required_fields:
            if not data.get(field):
                return error_response(f"{field}不能为空"), 400
        
        # 检查代码是否已存在
        existing = Role.query.filter_by(code=data['code']).first()
        if existing:
            return error_response("角色代码已存在"), 400
        
        # 创建角色
        role = Role(
            name=data['name'],
            code=data['code'],
            description=data.get('description'),
            created_by=g.user_id
        )
        
        db.session.add(role)
        db.session.flush()  # 获取角色ID
        
        # 分配权限
        permission_ids = data.get('permission_ids', [])
        if permission_ids:
            for permission_id in permission_ids:
                # 验证权限是否存在
                permission = Permission.query.get(permission_id)
                if not permission:
                    return error_response(f"权限ID {permission_id} 不存在"), 400
                
                role_permission = RolePermission(
                    role_id=role.id,
                    permission_id=permission_id,
                    granted_by=g.user_id
                )
                db.session.add(role_permission)
        
        db.session.commit()
        
        return success_response(role.to_dict(include_permissions=True), message="角色创建成功")
        
    except Exception as e:
        db.session.rollback()
        return error_response(f"创建角色失败: {str(e)}"), 500


@roles_bp.route('/roles/<role_id>', methods=['GET'])
@login_required
@permission_required('role.manage')
def get_role(role_id):
    """获取角色详情"""
    try:
        role = Role.query.get(role_id)
        
        if not role:
            return error_response("角色不存在"), 404
        
        include_permissions = request.args.get('include_permissions', 'true').lower() == 'true'
        
        return success_response(role.to_dict(include_permissions=include_permissions))
        
    except Exception as e:
        return error_response(f"获取角色详情失败: {str(e)}"), 500


@roles_bp.route('/roles/<role_id>', methods=['PUT'])
@login_required
@permission_required('role.manage')
def update_role(role_id):
    """更新角色信息"""
    try:
        role = Role.query.get(role_id)
        
        if not role:
            return error_response("角色不存在"), 404
        
        # 系统角色不能修改
        if role.type.value == 'system':
            return error_response("系统角色不能修改"), 400
        
        data = request.get_json()
        
        # 更新基本字段
        if 'name' in data:
            role.name = data['name']
        if 'description' in data:
            role.description = data['description']
        
        # 如果修改了代码，需要检查唯一性
        if 'code' in data and data['code'] != role.code:
            existing = Role.query.filter(
                Role.code == data['code'],
                Role.id != role_id
            ).first()
            if existing:
                return error_response("角色代码已存在"), 400
            
            role.code = data['code']
        
        # 更新权限
        if 'permission_ids' in data:
            # 删除现有权限
            RolePermission.query.filter_by(role_id=role_id).delete()
            
            # 添加新权限
            permission_ids = data['permission_ids']
            for permission_id in permission_ids:
                # 验证权限是否存在
                permission = Permission.query.get(permission_id)
                if not permission:
                    return error_response(f"权限ID {permission_id} 不存在"), 400
                
                role_permission = RolePermission(
                    role_id=role_id,
                    permission_id=permission_id,
                    granted_by=g.user_id
                )
                db.session.add(role_permission)
        
        role.updated_by = g.user_id
        
        db.session.commit()
        
        return success_response(role.to_dict(include_permissions=True), message="角色信息更新成功")
        
    except Exception as e:
        db.session.rollback()
        return error_response(f"更新角色失败: {str(e)}"), 500


@roles_bp.route('/roles/<role_id>', methods=['DELETE'])
@login_required
@permission_required('role.manage')
def delete_role(role_id):
    """删除角色"""
    try:
        role = Role.query.get(role_id)
        
        if not role:
            return error_response("角色不存在"), 404
        
        # 系统角色不能删除
        if role.type.value == 'system':
            return error_response("系统角色不能删除"), 400
        
        # 检查是否有用户使用此角色
        if role.user_roles:
            return error_response("不能删除有用户的角色"), 400
        
        # 删除角色权限关联
        RolePermission.query.filter_by(role_id=role_id).delete()
        
        # 删除角色
        db.session.delete(role)
        db.session.commit()
        
        return success_response(message="角色删除成功")
        
    except Exception as e:
        db.session.rollback()
        return error_response(f"删除角色失败: {str(e)}"), 500


@roles_bp.route('/roles/<role_id>/permissions', methods=['GET'])
@login_required
@permission_required('role.manage')
def get_role_permissions(role_id):
    """获取角色权限列表"""
    try:
        role = Role.query.get(role_id)
        
        if not role:
            return error_response("角色不存在"), 404
        
        permissions = [rp.permission.to_dict() for rp in role.role_permissions]
        
        return success_response({'permissions': permissions})
        
    except Exception as e:
        return error_response(f"获取角色权限失败: {str(e)}"), 500