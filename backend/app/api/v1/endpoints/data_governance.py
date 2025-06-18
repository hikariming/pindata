from flask import Blueprint, request, jsonify, g
from typing import Optional, Dict, Any
from app.services.data_governance_service import DataGovernanceService
from app.db import db
from app.utils.response import success_response, error_response
from app.api.v1.endpoints.auth import login_required, permission_required

data_governance_bp = Blueprint("data_governance", __name__)


@data_governance_bp.route("/governance/projects", methods=["GET"])
@login_required
@permission_required("governance.read")
def get_projects():
    """获取数据治理工程列表"""
    try:
        # 获取查询参数
        organization_id = request.args.get("organization_id", type=int)
        status = request.args.get("status", "all")
        search = request.args.get("search")
        sort_by = request.args.get("sort_by", "updated")
        limit = request.args.get("limit", 50, type=int)
        offset = request.args.get("offset", 0, type=int)

        # 参数验证
        if limit > 100:
            limit = 100
        if limit < 1:
            limit = 1
        if offset < 0:
            offset = 0

        service = DataGovernanceService(db.session)
        result = service.get_projects(
            user_id=g.user_id,
            organization_id=organization_id,
            status_filter=status,
            search_term=search,
            sort_by=sort_by,
            limit=limit,
            offset=offset,
        )
        return success_response(result)
    except Exception as e:
        return error_response(f"获取项目列表失败: {str(e)}", 500)


@data_governance_bp.route("/governance/projects/<string:project_id>", methods=["GET"])
@login_required
@permission_required("governance.read")
def get_project(project_id):
    """获取数据治理工程详情"""
    try:
        service = DataGovernanceService(db.session)
        project = service.get_project_by_id(str(project_id), str(g.user_id))

        if not project:
            return error_response("项目不存在或无权限访问", 404)

        return success_response(project)
    except Exception as e:
        return error_response(f"获取项目详情失败: {str(e)}", 500)


@data_governance_bp.route("/governance/projects", methods=["POST"])
@login_required
@permission_required("governance.create")
def create_project():
    """创建数据治理工程"""
    try:
        data = request.get_json()
        if not data:
            return error_response("请求数据不能为空", 400)

        # 验证必填字段
        name = data.get("name")
        description = data.get("description")
        organization_id = data.get("organization_id")

        if not name or len(name.strip()) == 0:
            return error_response("项目名称不能为空", 400)
        if len(name) > 200:
            return error_response("项目名称长度不能超过200个字符", 400)

        if not description or len(description.strip()) == 0:
            return error_response("项目描述不能为空", 400)
        if len(description) > 1000:
            return error_response("项目描述长度不能超过1000个字符", 400)

        # 如果没有提供组织ID，使用默认组织
        if not organization_id:
            from app.models.organization import Organization
            default_org = Organization.query.filter_by(code='root').first()
            if default_org:
                organization_id = default_org.id
            else:
                return error_response("系统未配置默认组织，请联系管理员", 500)

        config = data.get("config", {})

        service = DataGovernanceService(db.session)
        project = service.create_project(
            name=name.strip(),
            description=description.strip(),
            user_id=g.user_id,
            organization_id=organization_id,
            config=config,
        )
        return success_response(project, message="项目创建成功")
    except Exception as e:
        return error_response(f"创建项目失败: {str(e)}", 500)


@data_governance_bp.route("/governance/projects/<string:project_id>", methods=["PUT"])
@login_required
@permission_required("governance.update")
def update_project(project_id):
    """更新数据治理工程"""
    try:
        data = request.get_json()
        if not data:
            return error_response("请求数据不能为空", 400)

        # 构建更新参数
        update_data = {}

        name = data.get("name")
        if name is not None:
            if len(name.strip()) == 0:
                return error_response("项目名称不能为空", 400)
            if len(name) > 200:
                return error_response("项目名称长度不能超过200个字符", 400)
            update_data["name"] = name.strip()

        description = data.get("description")
        if description is not None:
            if len(description.strip()) == 0:
                return error_response("项目描述不能为空", 400)
            if len(description) > 1000:
                return error_response("项目描述长度不能超过1000个字符", 400)
            update_data["description"] = description.strip()

        status = data.get("status")
        if status is not None:
            if status not in ["active", "draft", "completed", "archived"]:
                return error_response("无效的项目状态", 400)
            update_data["status"] = status

        config = data.get("config")
        if config is not None:
            update_data["config"] = config

        service = DataGovernanceService(db.session)
        project = service.update_project(str(project_id), str(g.user_id), **update_data)

        if not project:
            return error_response("项目不存在或无权限更新", 404)

        return success_response(project, message="项目更新成功")
    except Exception as e:
        return error_response(f"更新项目失败: {str(e)}", 500)


@data_governance_bp.route("/governance/projects/<string:project_id>", methods=["DELETE"])
@login_required
@permission_required("governance.delete")
def delete_project(project_id):
    """删除数据治理工程"""
    try:
        service = DataGovernanceService(db.session)
        success = service.delete_project(str(project_id), str(g.user_id))

        if not success:
            return error_response("项目不存在或无权限删除", 404)

        return success_response(None, message="项目删除成功")
    except Exception as e:
        return error_response(f"删除项目失败: {str(e)}", 500)


@data_governance_bp.route("/governance/stats", methods=["GET"])
@login_required
@permission_required("governance.read")
def get_user_stats():
    """获取用户的项目统计信息"""
    try:
        organization_id = request.args.get("organization_id", type=int)

        service = DataGovernanceService(db.session)
        stats = service.get_user_project_stats(g.user_id, organization_id)
        return success_response(stats)
    except Exception as e:
        return error_response(f"获取统计信息失败: {str(e)}", 500)


@data_governance_bp.route("/governance/organizations", methods=["GET"])
@login_required
@permission_required("governance.read")
def get_user_organizations():
    """获取用户可用的组织列表"""
    try:
        from app.models.organization import Organization
        from app.models.user_organization import UserOrganization
        
        # 获取用户所属的组织
        user_orgs = db.session.query(Organization).join(
            UserOrganization, 
            Organization.id == UserOrganization.organization_id
        ).filter(
            UserOrganization.user_id == str(g.user_id),
            UserOrganization.status == 'ACTIVE'
        ).all()
        
        # 如果用户没有所属组织，返回默认组织
        if not user_orgs:
            default_org = Organization.query.filter_by(code='root').first()
            if default_org:
                user_orgs = [default_org]
        
        organizations_data = [org.to_dict() for org in user_orgs]
        return success_response(organizations_data)
        
    except Exception as e:
        return error_response(f"获取组织列表失败: {str(e)}", 500)


@data_governance_bp.route("/governance/default-organization", methods=["GET"])
@login_required
@permission_required("governance.read")
def get_default_organization():
    """获取默认组织信息"""
    try:
        from app.models.organization import Organization
        
        default_org = Organization.query.filter_by(code='root').first()
        if not default_org:
            return error_response("系统未配置默认组织", 404)
            
        return success_response(default_org.to_dict())
        
    except Exception as e:
        return error_response(f"获取默认组织失败: {str(e)}", 500)
