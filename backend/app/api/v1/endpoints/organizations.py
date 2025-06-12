from flask import Blueprint, request, jsonify, g

from app.services.user_service import UserService
from app.utils.response import success_response, error_response
from .auth import login_required, permission_required
from app.models.organization import Organization
from app.db import db


organizations_bp = Blueprint('organizations', __name__)


@organizations_bp.route('/organizations', methods=['GET'])
@login_required
@permission_required('organization.manage')
def get_organizations():
    """获取组织列表"""
    try:
        # 获取查询参数
        include_children = request.args.get('include_children', 'false').lower() == 'true'
        parent_id = request.args.get('parent_id')
        
        # 构建查询
        query = Organization.query
        
        if parent_id:
            query = query.filter_by(parent_id=parent_id)
        elif not include_children:
            # 如果不包含子组织且没有指定parent_id，则只返回顶级组织
            query = query.filter_by(parent_id=None)
        
        organizations = query.order_by(Organization.sort_order, Organization.name).all()
        
        # 转换为字典格式
        organizations_data = [org.to_dict(include_children=include_children) for org in organizations]
        
        return success_response(organizations_data)
        
    except Exception as e:
        return error_response(f"获取组织列表失败: {str(e)}"), 500


@organizations_bp.route('/organizations', methods=['POST'])
@login_required
@permission_required('organization.manage')
def create_organization():
    """创建组织"""
    try:
        data = request.get_json()
        
        # 验证必填字段
        required_fields = ['name', 'code']
        for field in required_fields:
            if not data.get(field):
                return error_response(f"{field}不能为空"), 400
        
        # 检查代码是否已存在
        existing = Organization.query.filter_by(code=data['code']).first()
        if existing:
            return error_response("组织代码已存在"), 400
        
        # 创建组织
        organization = Organization(
            name=data['name'],
            code=data['code'],
            description=data.get('description'),
            parent_id=data.get('parent_id'),
            sort_order=data.get('sort_order', 0),
            created_by=g.user_id
        )
        
        # 计算层级路径
        if organization.parent_id:
            parent = Organization.query.get(organization.parent_id)
            if parent:
                organization.path = f"{parent.path}/{organization.code}"
                organization.level = parent.level + 1
            else:
                return error_response("父组织不存在"), 400
        else:
            organization.path = f"/{organization.code}"
            organization.level = 1
        
        db.session.add(organization)
        db.session.commit()
        
        return success_response(organization.to_dict(), message="组织创建成功")
        
    except Exception as e:
        db.session.rollback()
        return error_response(f"创建组织失败: {str(e)}"), 500


@organizations_bp.route('/organizations/<organization_id>', methods=['GET'])
@login_required
@permission_required('organization.manage')
def get_organization(organization_id):
    """获取组织详情"""
    try:
        organization = Organization.query.get(organization_id)
        
        if not organization:
            return error_response("组织不存在"), 404
        
        include_children = request.args.get('include_children', 'false').lower() == 'true'
        
        return success_response(organization.to_dict(include_children=include_children))
        
    except Exception as e:
        return error_response(f"获取组织详情失败: {str(e)}"), 500


@organizations_bp.route('/organizations/<organization_id>', methods=['PUT'])
@login_required
@permission_required('organization.manage')
def update_organization(organization_id):
    """更新组织信息"""
    try:
        organization = Organization.query.get(organization_id)
        
        if not organization:
            return error_response("组织不存在"), 404
        
        data = request.get_json()
        
        # 更新字段
        if 'name' in data:
            organization.name = data['name']
        if 'description' in data:
            organization.description = data['description']
        if 'sort_order' in data:
            organization.sort_order = data['sort_order']
        
        # 如果修改了代码，需要检查唯一性
        if 'code' in data and data['code'] != organization.code:
            existing = Organization.query.filter(
                Organization.code == data['code'],
                Organization.id != organization_id
            ).first()
            if existing:
                return error_response("组织代码已存在"), 400
            
            organization.code = data['code']
            # 重新计算路径
            if organization.parent_id:
                parent = Organization.query.get(organization.parent_id)
                organization.path = f"{parent.path}/{organization.code}"
            else:
                organization.path = f"/{organization.code}"
        
        organization.updated_by = g.user_id
        
        db.session.commit()
        
        return success_response(organization.to_dict(), message="组织信息更新成功")
        
    except Exception as e:
        db.session.rollback()
        return error_response(f"更新组织失败: {str(e)}"), 500


@organizations_bp.route('/organizations/<organization_id>', methods=['DELETE'])
@login_required
@permission_required('organization.manage')
def delete_organization(organization_id):
    """删除组织"""
    try:
        organization = Organization.query.get(organization_id)
        
        if not organization:
            return error_response("组织不存在"), 404
        
        # 检查是否有子组织
        if organization.children:
            return error_response("不能删除有子组织的组织"), 400
        
        # 检查是否有关联用户
        if organization.user_organizations:
            return error_response("不能删除有用户的组织"), 400
        
        db.session.delete(organization)
        db.session.commit()
        
        return success_response(message="组织删除成功")
        
    except Exception as e:
        db.session.rollback()
        return error_response(f"删除组织失败: {str(e)}"), 500