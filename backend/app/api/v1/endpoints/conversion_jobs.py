from flask import Blueprint, request, jsonify
from flask_restful import Api, Resource
from marshmallow import ValidationError
from app.services.conversion_service import conversion_service
from app.api.v1.schemas.conversion_schemas import (
    ConversionJobCreateSchema, ConversionJobQuerySchema
)
from app.models import ConversionJob, LibraryFile, SystemLog
from app.utils.response import success_response, error_response
import logging

logger = logging.getLogger(__name__)

# 创建蓝图
conversion_jobs_bp = Blueprint('conversion_jobs', __name__)
api = Api(conversion_jobs_bp)

class ConversionJobListResource(Resource):
    """转换任务列表资源"""
    
    def options(self):
        """处理 CORS 预检请求"""
        return {}, 200
    
    def get(self):
        """获取转换任务列表"""
        try:
            # 验证查询参数
            schema = ConversionJobQuerySchema()
            args = schema.load(request.args)
            
            # 构建查询
            query = ConversionJob.query
            
            # 筛选条件
            if args.get('library_id'):
                query = query.filter(ConversionJob.library_id == args['library_id'])
            
            if args.get('status'):
                query = query.filter(ConversionJob.status == args['status'])
            
            # 排序
            query = query.order_by(ConversionJob.created_at.desc())
            
            # 分页
            page = args.get('page', 1)
            per_page = args.get('per_page', 20)
            pagination = query.paginate(
                page=page, per_page=per_page, error_out=False
            )
            
            # 转换为字典
            jobs = [job.to_dict() for job in pagination.items]
            
            return {
                'success': True,
                'data': {
                    'jobs': jobs,
                    'pagination': {
                        'page': pagination.page,
                        'per_page': pagination.per_page,
                        'total': pagination.total,
                        'pages': pagination.pages,
                        'has_next': pagination.has_next,
                        'has_prev': pagination.has_prev
                    }
                }
            }, 200
            
        except ValidationError as e:
            return error_response('参数验证失败', errors=e.messages), 400


class ConversionJobResource(Resource):
    """单个转换任务资源"""
    
    def options(self, job_id):
        """处理 CORS 预检请求"""
        return {}, 200
    
    def get(self, job_id):
        """获取单个转换任务"""
        try:
            job = conversion_service.get_conversion_job(job_id)
            if not job:
                return error_response('转换任务不存在'), 404
            
            # 获取文件详情
            job_dict = job.to_dict()
            job_dict['file_details'] = [detail.to_dict() for detail in job.file_details]
            
            return success_response(data=job_dict), 200
        except Exception as e:
            logger.error(f"获取转换任务失败: {str(e)}")
            return error_response('服务器内部错误1'), 500

class ConversionJobCancelResource(Resource):
    """取消转换任务"""
    
    def options(self, job_id):
        """处理 CORS 预检请求"""
        return {}, 200
    
    def post(self, job_id):
        """取消转换任务"""
        try:
            success = conversion_service.cancel_conversion_job(job_id)
            if success:
                SystemLog.log_info(
                    f"取消转换任务: {job_id}",
                    "ConversionJob",
                    extra_data={'job_id': job_id}
                )
                return success_response(message='转换任务已取消'), 200
            else:
                return error_response('无法取消该任务'), 400
                
        except Exception as e:
            logger.error(f"取消转换任务失败: {str(e)}")
            return error_response('服务器内部错误2'), 500

class LibraryFileConversionResource(Resource):
    """文件库文件转换资源"""
    
    def options(self, library_id):
        """处理 CORS 预检请求"""
        return {}, 200
    
    def post(self, library_id):
        """创建文件转换任务"""
        try:
            # 验证请求数据
            schema = ConversionJobCreateSchema()
            data = schema.load(request.json)
            
            # 验证文件是否存在
            file_ids = data['file_ids']
            files = LibraryFile.query.filter(
                LibraryFile.id.in_(file_ids),
                LibraryFile.library_id == library_id
            ).all()
            
            if len(files) != len(file_ids):
                return error_response('部分文件不存在'), 400
            
            # 创建转换任务
            job = conversion_service.create_conversion_job(
                library_id=library_id,
                file_ids=file_ids,
                method=data['conversion_config']['method'],
                conversion_config=data['conversion_config']
            )
            
            # 记录日志
            SystemLog.log_info(
                f"创建文档转换任务，文件数: {len(file_ids)}",
                "ConversionJob",
                extra_data={
                    'job_id': job.id,
                    'library_id': library_id,
                    'method': data['conversion_config']['method']
                }
            )
            
            return success_response(
                message='转换任务已创建',
                data=job.to_dict()
            ), 201
            
        except ValidationError as e:
            return error_response('参数验证失败', errors=e.messages), 400
        except Exception as e:
            logger.error(f"创建转换任务失败: {str(e)}")
            return error_response('服务器内部错误3'), 500

# 注册资源
api.add_resource(ConversionJobListResource, '/conversion-jobs')
api.add_resource(ConversionJobResource, '/conversion-jobs/<string:job_id>')
api.add_resource(ConversionJobCancelResource, '/conversion-jobs/<string:job_id>/cancel')
api.add_resource(LibraryFileConversionResource, '/libraries/<string:library_id>/files/convert-to-markdown') 