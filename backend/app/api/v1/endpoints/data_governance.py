from flask import Blueprint, request, jsonify, g
from typing import Optional, Dict, Any
from sqlalchemy import func, or_
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


@data_governance_bp.route("/governance/projects/<string:project_id>/raw-data", methods=["GET"])
@login_required
@permission_required("governance.read")
def get_project_raw_data(project_id):
    """获取项目关联的原始数据列表"""
    try:
        from app.models.raw_data import RawData
        from app.models.project_data_source import ProjectDataSource
        from app.models.library import Library
        from sqlalchemy import func
        
        # 验证项目权限
        service = DataGovernanceService(db.session)
        project = service.get_project_by_id(str(project_id), str(g.user_id))
        if not project:
            return error_response("项目不存在或无权限访问", 404)
        
        # 获取查询参数
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 50, type=int)
        file_category = request.args.get('file_category', type=str)
        search = request.args.get('search', type=str)
        
        # 获取项目的数据源列表
        data_sources_query = ProjectDataSource.query.filter_by(project_id=str(project_id))
        project_data_sources = data_sources_query.all()
        
        # 格式化数据源信息
        data_sources_list = []
        for ds in project_data_sources:
            ds_dict = {
                'id': ds.id,
                'name': ds.name,
                'description': ds.description,
                'source_type': ds.source_type.value if ds.source_type else None,
                'status': ds.status.value if ds.status else None,
                'config': ds.config or {},
                'file_count': ds.file_count,
                'total_size': ds.total_size or 0,
                'created_at': ds.created_at.isoformat() if ds.created_at else None,
                'last_sync_at': ds.last_sync_at.isoformat() if ds.last_sync_at else None,
                'library_info': None
            }
            
            # 如果是从Library导入的数据源，获取Library详细信息
            if ds.config and 'library_id' in ds.config:
                library = Library.query.filter_by(id=ds.config['library_id']).first()
                if library:
                    ds_dict['library_info'] = {
                        'id': library.id,
                        'name': library.name,
                        'description': library.description,
                        'data_type': library.data_type.value if library.data_type else None,
                        'tags': library.tags or [],
                        'file_count': library.file_count,
                        'total_size': library.get_total_size_human(),
                        'processed_count': library.processed_count,
                        'processing_count': library.processing_count,
                        'pending_count': library.pending_count,
                        'md_count': library.md_count,
                        'created_at': library.created_at.isoformat() if library.created_at else None,
                        'last_updated': library.last_updated.strftime('%Y-%m-%d') if library.last_updated else None
                    }
            
            data_sources_list.append(ds_dict)
        
        # 基础查询：获取项目关联的原始数据
        query = (
            db.session.query(RawData)
            .join(ProjectDataSource, RawData.data_source_id == ProjectDataSource.id)
            .filter(ProjectDataSource.project_id == str(project_id))
        )
        
        # 应用过滤条件
        if file_category and file_category != 'all':
            query = query.filter(RawData.file_category == file_category)
        
        if search:
            search_pattern = f'%{search}%'
            query = query.filter(
                or_(
                    RawData.filename.ilike(search_pattern),
                    RawData.original_filename.ilike(search_pattern)
                )
            )
        
        # 分页查询
        pagination = query.order_by(RawData.upload_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        # 统计信息
        stats_query = (
            db.session.query(RawData)
            .join(ProjectDataSource, RawData.data_source_id == ProjectDataSource.id)
            .filter(ProjectDataSource.project_id == str(project_id))
        )
        
        total_files = stats_query.count()
        
        # 按分类统计
        by_category = {}
        categories = ['document', 'image', 'video', 'database', 'api']
        for category in categories:
            count = stats_query.filter(RawData.file_category == category).count()
            by_category[category] = count
        
        # 按状态统计
        by_status = {}
        from app.models.raw_data import ProcessingStatus
        for status in ProcessingStatus:
            count = stats_query.filter(RawData.processing_status == status).count()
            by_status[status.value] = count
        
        # 计算总大小
        total_size_result = stats_query.with_entities(func.sum(RawData.file_size)).scalar()
        total_size = total_size_result or 0
        
        # 格式化原始数据
        raw_data_list = []
        for raw_data in pagination.items:
            data_dict = raw_data.to_dict()
            # 添加数据源信息
            data_source = next((ds for ds in data_sources_list if ds['id'] == raw_data.data_source_id), None)
            data_dict['data_source_info'] = data_source
            raw_data_list.append(data_dict)
        
        response_data = {
            'raw_data': raw_data_list,
            'data_sources': data_sources_list,  # 添加数据源列表
            'total': pagination.total,
            'page': page,
            'per_page': per_page,
            'pages': pagination.pages,
            'stats': {
                'total_files': total_files,
                'total_data_sources': len(data_sources_list),
                'by_category': by_category,
                'by_status': by_status,
                'total_size': total_size
            }
        }
        
        return success_response(response_data)
        
    except Exception as e:
        return error_response(f"获取项目原始数据失败: {str(e)}", 500)


@data_governance_bp.route("/governance/projects/<string:project_id>/libraries", methods=["POST"])
@login_required
@permission_required("governance.update")
def add_libraries_to_project(project_id):
    """添加Library到项目作为数据源"""
    try:
        from app.models.library import Library
        from app.models.library_file import LibraryFile
        from app.models.project_data_source import ProjectDataSource, DataSourceType, DataSourceStatus
        from app.models.raw_data import RawData, FileType, ProcessingStatus
        import uuid
        
        data = request.get_json()
        if not data or 'library_ids' not in data:
            return error_response("请提供要添加的Library ID列表", 400)
        
        library_ids = data.get('library_ids', [])
        if not library_ids:
            return error_response("Library ID列表不能为空", 400)
        
        # 验证项目权限
        service = DataGovernanceService(db.session)
        project = service.get_project_by_id(str(project_id), str(g.user_id))
        if not project:
            return error_response("项目不存在或无权限访问", 404)
        
        added_count = 0
        errors = []
        
        for library_id in library_ids:
            try:
                # 验证Library是否存在
                library = Library.query.filter_by(id=library_id).first()
                if not library:
                    errors.append(f"Library {library_id} 不存在")
                    continue
                
                # 检查是否已经添加过
                existing_data_source = ProjectDataSource.query.filter_by(
                    project_id=project_id,
                    name=f"Library: {library.name}"
                ).first()
                
                if existing_data_source:
                    errors.append(f"Library '{library.name}' 已经添加到项目中")
                    continue
                
                # 创建项目数据源
                data_source = ProjectDataSource(
                    id=str(uuid.uuid4()),
                    project_id=project_id,
                    name=f"Library: {library.name}",
                    description=f"从文件库 '{library.name}' 导入的数据源",
                    source_type=DataSourceType.UPLOAD,
                    status=DataSourceStatus.CONNECTED,
                    config={
                        'library_id': library_id,
                        'library_name': library.name,
                        'data_type': library.data_type.value if library.data_type else 'training'
                    },
                    file_count=library.file_count,
                    total_size=library.total_size or 0
                )
                
                db.session.add(data_source)
                db.session.flush()  # 获取data_source.id
                
                # 将Library中的文件转换为RawData
                library_files = LibraryFile.query.filter_by(library_id=library_id).all()
                
                for lib_file in library_files:
                    # 检查是否已经存在对应的RawData
                    existing_raw_data = RawData.query.filter_by(
                        library_file_id=lib_file.id
                    ).first()
                    
                    if existing_raw_data:
                        # 更新关联到新的数据源
                        existing_raw_data.data_source_id = data_source.id
                        continue
                    
                    # 映射文件类型
                    file_type_mapping = {
                        'pdf': FileType.DOCUMENT_PDF,
                        'docx': FileType.DOCUMENT_DOCX,
                        'xlsx': FileType.DOCUMENT_XLSX,
                        'pptx': FileType.DOCUMENT_PPTX,
                        'txt': FileType.DOCUMENT_TXT,
                        'md': FileType.DOCUMENT_MD,
                        'jpg': FileType.IMAGE_JPG,
                        'jpeg': FileType.IMAGE_JPG,
                        'png': FileType.IMAGE_PNG,
                        'gif': FileType.IMAGE_GIF,
                        'bmp': FileType.IMAGE_BMP,
                        'svg': FileType.IMAGE_SVG,
                        'webp': FileType.IMAGE_WEBP,
                        'mp4': FileType.VIDEO_MP4,
                        'avi': FileType.VIDEO_AVI,
                        'mov': FileType.VIDEO_MOV,
                        'wmv': FileType.VIDEO_WMV,
                        'flv': FileType.VIDEO_FLV,
                        'webm': FileType.VIDEO_WEBM,
                    }
                    
                    file_type = file_type_mapping.get(lib_file.file_type.lower(), FileType.OTHER)
                    
                    # 确定文件分类
                    if file_type.value.startswith('document_'):
                        file_category = 'document'
                    elif file_type.value.startswith('image_'):
                        file_category = 'image'
                    elif file_type.value.startswith('video_'):
                        file_category = 'video'
                    else:
                        file_category = 'other'
                    
                    # 创建RawData记录
                    raw_data = RawData(
                        filename=lib_file.filename,
                        original_filename=lib_file.original_filename,
                        file_type=file_type,
                        file_category=file_category,
                        file_size=lib_file.file_size or 0,
                        minio_object_name=lib_file.minio_object_name,
                        data_source_id=data_source.id,
                        library_file_id=lib_file.id,
                        processing_status=ProcessingStatus.COMPLETED if lib_file.process_status.value == 'completed' else ProcessingStatus.PENDING,
                        processing_progress=100 if lib_file.process_status.value == 'completed' else 0,
                        page_count=lib_file.page_count,
                        word_count=lib_file.word_count,
                        content_quality_score=80,  # 默认质量分数
                        extraction_confidence=90,  # 默认提取置信度
                        extracted_text=f"从文件库导入的文件: {lib_file.original_filename}" if lib_file.converted_format == 'markdown' else None,
                        upload_at=lib_file.uploaded_at or lib_file.created_at,
                        processed_at=lib_file.processed_at
                    )
                    
                    db.session.add(raw_data)
                
                added_count += 1
                
            except Exception as e:
                errors.append(f"添加Library {library_id} 失败: {str(e)}")
                db.session.rollback()
                continue
        
        if added_count > 0:
            db.session.commit()
        
        message = f"成功添加 {added_count} 个Library到项目"
        if errors:
            message += f"，{len(errors)} 个失败"
        
        return success_response({
            'added_count': added_count,
            'errors': errors
        }, message=message)
        
    except Exception as e:
        db.session.rollback()
        return error_response(f"添加Library到项目失败: {str(e)}", 500)


@data_governance_bp.route("/governance/projects/<string:project_id>/raw-data/<int:raw_data_id>", methods=["DELETE"])
@login_required
@permission_required("governance.update")
def remove_raw_data_from_project(project_id, raw_data_id):
    """从项目中移除原始数据"""
    try:
        from app.models.raw_data import RawData
        from app.models.project_data_source import ProjectDataSource
        
        # 验证项目权限
        service = DataGovernanceService(db.session)
        project = service.get_project_by_id(str(project_id), str(g.user_id))
        if not project:
            return error_response("项目不存在或无权限访问", 404)
        
        # 查找原始数据记录
        raw_data = (
            db.session.query(RawData)
            .join(ProjectDataSource, RawData.data_source_id == ProjectDataSource.id)
            .filter(
                RawData.id == raw_data_id,
                ProjectDataSource.project_id == str(project_id)
            )
            .first()
        )
        
        if not raw_data:
            return error_response("原始数据不存在或不属于此项目", 404)
        
        # 删除原始数据记录
        db.session.delete(raw_data)
        
        # 检查是否需要删除关联的数据源（如果数据源下没有其他文件）
        data_source = ProjectDataSource.query.filter_by(id=raw_data.data_source_id).first()
        if data_source:
            remaining_files = RawData.query.filter_by(data_source_id=data_source.id).count()
            if remaining_files <= 1:  # 只剩当前要删除的文件
                db.session.delete(data_source)
        
        db.session.commit()
        
        return success_response(None, message="成功从项目中移除数据源")
        
    except Exception as e:
        db.session.rollback()
        return error_response(f"移除数据源失败: {str(e)}", 500)


@data_governance_bp.route("/governance/projects/<string:project_id>/raw-data/<int:raw_data_id>/preview", methods=["GET"])
@login_required  
@permission_required("governance.read")
def get_raw_data_preview(project_id, raw_data_id):
    """获取原始数据文件预览"""
    try:
        from app.models.raw_data import RawData
        from app.models.project_data_source import ProjectDataSource
        
        # 验证项目权限
        service = DataGovernanceService(db.session)
        project = service.get_project_by_id(str(project_id), str(g.user_id))
        if not project:
            return error_response("项目不存在或无权限访问", 404)
        
        # 查找原始数据记录
        raw_data = (
            db.session.query(RawData)
            .join(ProjectDataSource, RawData.data_source_id == ProjectDataSource.id)
            .filter(
                RawData.id == raw_data_id,
                ProjectDataSource.project_id == str(project_id)
            )
            .first()
        )
        
        if not raw_data:
            return error_response("原始数据不存在或不属于此项目", 404)
        
        # 构建预览数据
        preview_data = {
            'type': 'none',
            'content': None,
            'thumbnail_url': None,
            'extracted_text': None,
            'width': None,
            'height': None,
            'color_mode': None,
            'duration': None,
            'page_count': raw_data.page_count,
            'word_count': raw_data.word_count
        }
        
        # 根据文件类型提供不同的预览
        if raw_data.file_category == 'document':
            preview_data['type'] = 'text'
            if raw_data.extracted_text:
                # 截取前2000个字符作为预览
                preview_data['extracted_text'] = raw_data.extracted_text[:2000]
                if len(raw_data.extracted_text) > 2000:
                    preview_data['extracted_text'] += "..."
            elif raw_data.preview_content:
                preview_data['content'] = raw_data.preview_content[:2000]
                if len(raw_data.preview_content) > 2000:
                    preview_data['content'] += "..."
            else:
                preview_data['extracted_text'] = f"文档文件: {raw_data.original_filename or raw_data.filename}\n\n暂无预览内容"
        
        elif raw_data.file_category == 'image':
            preview_data['type'] = 'image'
            preview_data['width'] = raw_data.image_width
            preview_data['height'] = raw_data.image_height
            preview_data['color_mode'] = raw_data.color_mode
            if raw_data.thumbnail_path:
                preview_data['thumbnail_url'] = f"/api/v1/files/thumbnail/{raw_data.id}"
            else:
                # 暂时返回占位图URL
                preview_data['thumbnail_url'] = f"/api/v1/raw-data/{raw_data.id}/thumbnail"
        
        elif raw_data.file_category == 'video':
            preview_data['type'] = 'video'
            preview_data['duration'] = raw_data.duration
            preview_data['width'] = raw_data.video_width
            preview_data['height'] = raw_data.video_height
            if raw_data.thumbnail_path:
                preview_data['thumbnail_url'] = f"/api/v1/files/thumbnail/{raw_data.id}"
        
        else:
            preview_data['type'] = 'text'
            preview_data['content'] = f"文件类型: {raw_data.file_category}\n文件名: {raw_data.original_filename or raw_data.filename}\n大小: {raw_data.file_size} 字节"
        
        return success_response(preview_data)
        
    except Exception as e:
        return error_response(f"获取文件预览失败: {str(e)}", 500)
