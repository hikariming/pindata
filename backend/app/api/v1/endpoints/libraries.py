from flask import Blueprint, request, jsonify, current_app
from flask_restful import Api, Resource
from marshmallow import ValidationError
from werkzeug.utils import secure_filename
import os
from app.api.v1.schemas.library_schemas import (
    LibraryCreateSchema, LibraryUpdateSchema, LibraryQuerySchema,
    LibraryFileQuerySchema, LibraryStatisticsSchema, LibraryFileUpdateSchema
)
from app.services.library_service import LibraryService
from app.services.storage_service import storage_service
from app.utils.response import success_response, error_response, paginated_response
import logging

logger = logging.getLogger(__name__)

# 允许的文件类型和对应的 MIME 类型
ALLOWED_EXTENSIONS = {
    # 文档类型
    'pdf': 'application/pdf',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'doc': 'application/msword',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'ppt': 'application/vnd.ms-powerpoint',
    'txt': 'text/plain',
    'md': 'text/markdown',
    
    # 图片类型
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'bmp': 'image/bmp',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    
    # 视频类型
    'mp4': 'video/mp4',
    'avi': 'video/x-msvideo',
    'mov': 'video/quicktime',
    'wmv': 'video/x-ms-wmv',
    'flv': 'video/x-flv',
    'webm': 'video/webm'
}

def allowed_file(filename):
    """检查文件是否允许上传"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def get_content_type(filename):
    """根据文件名获取内容类型"""
    ext = filename.rsplit('.', 1)[1].lower() if '.' in filename else ''
    return ALLOWED_EXTENSIONS.get(ext, 'application/octet-stream')

# 创建蓝图
libraries_bp = Blueprint('libraries', __name__)
api = Api(libraries_bp)

class LibraryListResource(Resource):
    """文件库列表资源"""
    
    def options(self):
        """处理 CORS 预检请求"""
        return {}, 200
    
    def get(self):
        """获取文件库列表"""
        try:
            # 验证查询参数
            schema = LibraryQuerySchema()
            args = schema.load(request.args)
            
            # 获取文件库列表
            libraries, total = LibraryService.get_libraries(
                page=args['page'],
                per_page=args['per_page'],
                name=args.get('name'),
                data_type=args.get('data_type'),
                tags=args.get('tags'),
                sort_by=args['sort_by'],
                sort_order=args['sort_order']
            )
            
            # 转换为字典格式
            libraries_data = [lib.to_dict() for lib in libraries]
            
            return paginated_response(
                data=libraries_data,
                page=args['page'],
                per_page=args['per_page'],
                total=total
            )
            
        except ValidationError as e:
            return error_response(message="参数验证失败", errors=e.messages), 400
        except Exception as e:
            logger.error(f"获取文件库列表失败: {str(e)}")
            return error_response(message="获取文件库列表失败"), 500
    
    def post(self):
        """创建文件库"""
        try:
            # 验证请求数据
            schema = LibraryCreateSchema()
            data = schema.load(request.json)
            
            # 创建文件库
            library = LibraryService.create_library(
                name=data['name'],
                description=data.get('description'),
                data_type=data['data_type'],
                tags=data.get('tags', [])
            )
            
            return success_response(
                data=library.to_dict(),
                message="文件库创建成功"
            ), 201
            
        except ValidationError as e:
            return error_response(message="参数验证失败", errors=e.messages), 400
        except ValueError as e:
            return error_response(message=str(e)), 400
        except Exception as e:
            logger.error(f"创建文件库失败: {str(e)}")
            return error_response(message="创建文件库失败"), 500

class LibraryDetailResource(Resource):
    """文件库详情资源"""
    
    def options(self, library_id):
        """处理 CORS 预检请求"""
        return {}, 200
    
    def get(self, library_id):
        """获取文件库详情"""
        try:
            library = LibraryService.get_library_by_id(library_id)
            if not library:
                return error_response(message="文件库不存在"), 404
            
            return success_response(
                data=library.to_dict_detailed(),
                message="获取文件库详情成功"
            )
            
        except Exception as e:
            logger.error(f"获取文件库详情失败: {str(e)}")
            return error_response(message="获取文件库详情失败"), 500
    
    def put(self, library_id):
        """更新文件库"""
        try:
            # 验证请求数据
            schema = LibraryUpdateSchema()
            data = schema.load(request.json)
            
            # 更新文件库
            library = LibraryService.update_library(library_id, **data)
            if not library:
                return error_response(message="文件库不存在"), 404
            
            return success_response(
                data=library.to_dict(),
                message="文件库更新成功"
            )
            
        except ValidationError as e:
            return error_response(message="参数验证失败", errors=e.messages), 400
        except ValueError as e:
            return error_response(message=str(e)), 400
        except Exception as e:
            logger.error(f"更新文件库失败: {str(e)}")
            return error_response(message="更新文件库失败"), 500
    
    def delete(self, library_id):
        """删除文件库"""
        try:
            success = LibraryService.delete_library(library_id)
            if not success:
                return error_response(message="文件库不存在"), 404
            
            return success_response(message="文件库删除成功")
            
        except Exception as e:
            logger.error(f"删除文件库失败: {str(e)}")
            return error_response(message="删除文件库失败"), 500

class LibraryFilesResource(Resource):
    """文件库文件资源"""
    
    def options(self, library_id):
        """处理 CORS 预检请求"""
        return {}, 200
    
    def get(self, library_id):
        """获取文件库中的文件列表"""
        try:
            # 验证查询参数
            schema = LibraryFileQuerySchema()
            args = schema.load(request.args)
            
            # 获取文件列表
            files, total = LibraryService.get_library_files(
                library_id=library_id,
                page=args['page'],
                per_page=args['per_page'],
                filename=args.get('filename'),
                file_type=args.get('file_type'),
                process_status=args.get('process_status'),
                sort_by=args['sort_by'],
                sort_order=args['sort_order']
            )
            
            # 转换为字典格式
            files_data = [file.to_dict() for file in files]
            
            return paginated_response(
                data=files_data,
                page=args['page'],
                per_page=args['per_page'],
                total=total
            )
            
        except ValidationError as e:
            return error_response(message="参数验证失败", errors=e.messages), 400
        except Exception as e:
            logger.error(f"获取文件列表失败: {str(e)}")
            return error_response(message="获取文件列表失败"), 500
    
    def post(self, library_id):
        """上传文件到文件库"""
        try:
            # 检查文件库是否存在
            library = LibraryService.get_library_by_id(library_id)
            if not library:
                return error_response(message="文件库不存在"), 404
            
            # 检查是否有文件上传
            if 'files' not in request.files:
                return error_response(message="没有选择文件"), 400
            
            files = request.files.getlist('files')
            if not files or all(f.filename == '' for f in files):
                return error_response(message="没有选择文件"), 400
            
            uploaded_files = []
            errors = []
            
            for file in files:
                if file.filename == '':
                    continue
                    
                try:
                    # 验证文件类型
                    if not allowed_file(file.filename):
                        errors.append(f"文件 {file.filename} 类型不支持")
                        continue
                    
                    # 安全化文件名
                    original_filename = file.filename
                    secure_filename_str = secure_filename(original_filename)
                    
                    # 获取文件类型
                    file_extension = original_filename.rsplit('.', 1)[1].lower() if '.' in original_filename else ''
                    content_type = get_content_type(original_filename)
                    
                    # 上传到 MinIO
                    object_name, file_size = storage_service.upload_file(
                        file_data=file,
                        original_filename=original_filename,
                        content_type=content_type,
                        library_id=library_id
                    )
                    
                    # 保存文件信息到数据库
                    library_file = LibraryService.add_file_to_library(
                        library_id=library_id,
                        filename=secure_filename_str,
                        original_filename=original_filename,
                        file_type=file_extension,
                        file_size=file_size,
                        minio_object_name=object_name,
                        minio_bucket=current_app.config.get('MINIO_RAW_DATA_BUCKET', 'raw-data')
                    )
                    
                    uploaded_files.append(library_file.to_dict())
                    
                except Exception as e:
                    logger.error(f"上传文件 {file.filename} 失败: {str(e)}")
                    errors.append(f"文件 {file.filename} 上传失败: {str(e)}")
            
            # 返回结果
            response_data = {
                'uploaded_files': uploaded_files,
                'total_uploaded': len(uploaded_files),
                'errors': errors
            }
            
            if uploaded_files:
                message = f"成功上传 {len(uploaded_files)} 个文件"
                if errors:
                    message += f"，{len(errors)} 个文件上传失败"
                return success_response(data=response_data, message=message), 201
            else:
                return error_response(
                    message="所有文件上传失败", 
                    errors=errors
                ), 400
                
        except Exception as e:
            logger.error(f"文件上传失败: {str(e)}")
            return error_response(message="文件上传失败"), 500

class LibraryFileResource(Resource):
    """单个文件资源"""
    
    def options(self, library_id, file_id):
        """处理 CORS 预检请求"""
        return {}, 200
    
    def get(self, library_id, file_id):
        """获取单个文件详情"""
        try:
            from app.models import LibraryFile
            file = LibraryFile.query.filter_by(
                id=file_id,
                library_id=library_id
            ).first()
            
            if not file:
                return error_response('文件不存在'), 404
            
            return success_response(data=file.to_dict()), 200
            
        except Exception as e:
            logger.error(f"获取文件详情失败: {str(e)}")
            return error_response('服务器内部错误'), 500
    
    def put(self, library_id, file_id):
        """更新文件信息"""
        try:
            # 验证请求数据
            schema = LibraryFileUpdateSchema()
            data = schema.load(request.json)
            
            # 更新文件
            file = LibraryService.update_file(file_id, **data)
            if not file:
                return error_response(message="文件不存在"), 404
            
            # 检查文件是否属于指定的文件库
            if file.library_id != library_id:
                return error_response(message="文件不属于指定的文件库"), 403
            
            return success_response(
                data=file.to_dict(),
                message="文件更新成功"
            )
            
        except ValidationError as e:
            return error_response(message="参数验证失败", errors=e.messages), 400
        except Exception as e:
            logger.error(f"更新文件失败: {str(e)}")
            return error_response(message="更新文件失败"), 500
    
    def delete(self, library_id, file_id):
        """删除文件"""
        try:
            success = LibraryService.delete_file(file_id)
            if not success:
                return error_response(message="文件不存在"), 404
            
            return success_response(message="文件删除成功")
            
        except Exception as e:
            logger.error(f"删除文件失败: {str(e)}")
            return error_response(message="删除文件失败"), 500

class LibraryStatisticsResource(Resource):
    """文件库统计资源"""
    
    def options(self):
        """处理 CORS 预检请求"""
        return {}, 200
    
    def get(self):
        """获取文件库统计信息"""
        try:
            statistics = LibraryService.get_statistics()
            
            return success_response(
                data=statistics,
                message="获取统计信息成功"
            )
            
        except Exception as e:
            logger.error(f"获取统计信息失败: {str(e)}")
            return error_response(message="获取统计信息失败"), 500

# 注册路由
api.add_resource(LibraryListResource, '/libraries')
api.add_resource(LibraryDetailResource, '/libraries/<string:library_id>')
api.add_resource(LibraryFilesResource, '/libraries/<string:library_id>/files')
api.add_resource(LibraryFileResource, '/libraries/<string:library_id>/files/<string:file_id>')
api.add_resource(LibraryStatisticsResource, '/libraries/statistics') 