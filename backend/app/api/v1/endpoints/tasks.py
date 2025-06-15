from flask import jsonify, request, Blueprint
from flasgger import swag_from
from app.api.v1 import api_v1
from app.models import Task, TaskStatus, ConversionJob, ConversionStatus
from app.db import db
from app.utils.response import success_response, error_response
import logging
from flask_restful import Api, Resource
from celery.result import AsyncResult
from app.celery_app import celery

logger = logging.getLogger(__name__)

# 创建蓝图
tasks_bp = Blueprint('tasks', __name__)
api = Api(tasks_bp)

class TaskStatusResource(Resource):
    """任务状态查询资源"""
    
    def options(self, task_id):
        """处理 CORS 预检请求"""
        return {}, 200
    
    @swag_from({
        'tags': ['任务管理'],
        'summary': '查询任务状态',
        'parameters': [{
            'name': 'task_id',
            'in': 'path',
            'type': 'string',
            'required': True,
            'description': '任务ID'
        }],
        'responses': {
            200: {'description': '任务状态查询成功'},
            404: {'description': '任务不存在'}
        }
    })
    def get(self, task_id):
        """查询任务状态"""
        try:
            # 获取任务结果
            task_result = AsyncResult(task_id, app=celery)
            
            # 构建响应数据
            response_data = {
                'task_id': task_id,
                'state': task_result.state,
                'ready': task_result.ready(),
                'successful': task_result.successful() if task_result.ready() else None,
                'failed': task_result.failed() if task_result.ready() else None
            }
            
            # 根据任务状态添加额外信息
            if task_result.state == 'PENDING':
                response_data['meta'] = {
                    'status': '任务等待中...'
                }
            elif task_result.state == 'PROGRESS':
                response_data['meta'] = task_result.info or {}
            elif task_result.state == 'SUCCESS':
                response_data['result'] = task_result.result
                response_data['meta'] = {
                    'status': '任务完成'
                }
            elif task_result.state == 'FAILURE':
                response_data['meta'] = {
                    'error': str(task_result.info) if task_result.info else '任务执行失败',
                    'status': '任务失败'
                }
                response_data['traceback'] = task_result.traceback
            else:
                response_data['meta'] = task_result.info or {}
            
            return response_data, 200
            
        except Exception as e:
            return {
                'error': f'查询任务状态失败: {str(e)}',
                'task_id': task_id
            }, 500

@api_v1.route('/tasks', methods=['GET'])
@swag_from({
    'tags': ['任务'],
    'summary': '获取任务列表',
    'parameters': [{
        'name': 'page',
        'in': 'query',
        'type': 'integer',
        'default': 1
    }, {
        'name': 'per_page',
        'in': 'query',
        'type': 'integer',
        'default': 20
    }, {
        'name': 'status',
        'in': 'query',
        'type': 'string',
        'enum': ['pending', 'running', 'completed', 'failed', 'cancelled']
    }, {
        'name': 'type',
        'in': 'query',
        'type': 'string'
    }, {
        'name': 'search',
        'in': 'query',
        'type': 'string'
    }],
    'responses': {
        200: {
            'description': '成功获取任务列表'
        }
    }
})
def get_tasks():
    """获取任务列表"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        status = request.args.get('status')
        task_type = request.args.get('type')
        search = request.args.get('search', '').strip()
        
        query = Task.query
        
        # 状态过滤
        if status:
            query = query.filter(Task.status == TaskStatus(status))
        
        # 类型过滤
        if task_type:
            query = query.filter(Task.type == task_type)
        
        # 搜索过滤
        if search:
            query = query.filter(Task.name.contains(search))
        
        pagination = query.order_by(Task.created_at.desc()).paginate(
            page=page, 
            per_page=per_page,
            error_out=False
        )
        
        # 构建任务列表，包含详细信息
        tasks_list = []
        for task in pagination.items:
            task_dict = task.to_dict()
            
            # 如果是转换任务，添加转换相关信息
            if hasattr(task, 'conversion_job') and task.conversion_job:
                conversion_job = task.conversion_job
                # 确保conversion_job不是列表，如果是列表则取第一个
                if isinstance(conversion_job, list):
                    conversion_job = conversion_job[0] if conversion_job else None
                
                if conversion_job:
                    task_dict.update({
                        'library_id': conversion_job.library_id,
                        'library_name': conversion_job.library.name if conversion_job.library else None,
                        'conversion_method': conversion_job.method,
                        'file_count': conversion_job.file_count,
                        'completed_count': conversion_job.completed_count,
                        'failed_count': conversion_job.failed_count,
                        'current_file_name': conversion_job.current_file_name,
                        'progress_percentage': conversion_job.progress_percentage,
                        'celery_task_id': conversion_job.celery_task_id
                    })
        
            tasks_list.append(task_dict)
        
        return jsonify({
            'success': True,
            'data': {
                'tasks': tasks_list,
                'pagination': {
                    'page': page,
                    'per_page': per_page,
                    'total': pagination.total,
                    'total_pages': pagination.pages,
                    'has_next': pagination.has_next,
                    'has_prev': pagination.has_prev
                }
            }
        })
        
    except Exception as e:
        logger.error(f"获取任务列表失败: {str(e)}")
        return error_response('服务器内部错误111'+str(e)), 500

@api_v1.route('/tasks/<int:task_id>', methods=['GET'])
@swag_from({
    'tags': ['任务'],
    'summary': '获取任务详情',
    'parameters': [{
        'name': 'task_id',
        'in': 'path',
        'type': 'integer',
        'required': True
    }],
    'responses': {
        200: {
            'description': '成功获取任务详情'
        },
        404: {
            'description': '任务不存在'
        }
    }
})
def get_task(task_id):
    """获取任务详情"""
    try:
        task = Task.query.get_or_404(task_id)
        task_dict = task.to_dict()
        
        # 如果是转换任务，添加详细信息
        if hasattr(task, 'conversion_job') and task.conversion_job:
            conversion_job = task.conversion_job
            # 确保conversion_job不是列表，如果是列表则取第一个
            if isinstance(conversion_job, list):
                conversion_job = conversion_job[0] if conversion_job else None
            
            if conversion_job:
                task_dict.update({
                    'library_id': conversion_job.library_id,
                    'library_name': conversion_job.library.name if conversion_job.library else None,
                    'conversion_method': conversion_job.method,
                    'file_count': conversion_job.file_count,
                    'completed_count': conversion_job.completed_count,
                    'failed_count': conversion_job.failed_count,
                    'current_file_name': conversion_job.current_file_name,
                    'progress_percentage': conversion_job.progress_percentage,
                    'celery_task_id': conversion_job.celery_task_id,
                    'file_details': [detail.to_dict() for detail in conversion_job.file_details]
                })
        
        return success_response(data=task_dict)
        
    except Exception as e:
        logger.error(f"获取任务详情失败: {str(e)}")
        return error_response('服务器内部错误222'), 500

@api_v1.route('/tasks/<int:task_id>', methods=['DELETE'])
@swag_from({
    'tags': ['任务'],
    'summary': '删除任务',
    'parameters': [{
        'name': 'task_id',
        'in': 'path',
        'type': 'integer',
        'required': True
    }],
    'responses': {
        200: {
            'description': '成功删除任务'
        },
        400: {
            'description': '任务正在运行，无法删除'
        },
        404: {
            'description': '任务不存在'
        }
    }
})
def delete_task(task_id):
    """删除任务"""
    try:
        task = Task.query.get_or_404(task_id)
        
        # 检查任务状态，只允许删除已完成、失败或已取消的任务
        if task.status in [TaskStatus.RUNNING, TaskStatus.PENDING]:
            return error_response('正在运行或排队中的任务无法删除，请先取消任务'), 400
        
        # 如果是转换任务，需要先删除相关的转换记录
        if hasattr(task, 'conversion_job') and task.conversion_job:
            conversion_job = task.conversion_job
            # 确保conversion_job不是列表，如果是列表则取第一个
            if isinstance(conversion_job, list):
                conversion_job = conversion_job[0] if conversion_job else None
            
            if conversion_job:
                for file_detail in conversion_job.file_details:
                    db.session.delete(file_detail)
                db.session.delete(conversion_job)
        
        # 删除主任务记录
        db.session.delete(task)
        db.session.commit()
        
        logger.info(f"任务已删除: {task_id}")
        return success_response(message='任务删除成功')
        
    except Exception as e:
        logger.error(f"删除任务失败: {str(e)}")
        db.session.rollback()
        return error_response('服务器内部错误333'), 500

@api_v1.route('/tasks/<int:task_id>/cancel', methods=['POST'])
@swag_from({
    'tags': ['任务'],
    'summary': '取消任务',
    'parameters': [{
        'name': 'task_id',
        'in': 'path',
        'type': 'integer',
        'required': True
    }],
    'responses': {
        200: {
            'description': '成功取消任务'
        },
        400: {
            'description': '任务无法取消'
        },
        404: {
            'description': '任务不存在'
        }
    }
})
def cancel_task(task_id):
    """取消任务"""
    try:
        task = Task.query.get_or_404(task_id)
        
        # 只能取消pending或running状态的任务
        if task.status not in [TaskStatus.PENDING, TaskStatus.RUNNING]:
            return error_response('只能取消等待中或运行中的任务'), 400
        
        # 如果是转换任务，取消转换任务
        if hasattr(task, 'conversion_job') and task.conversion_job:
            conversion_job = task.conversion_job
            # 确保conversion_job不是列表，如果是列表则取第一个
            if isinstance(conversion_job, list):
                conversion_job = conversion_job[0] if conversion_job else None
            
            if conversion_job:
                # 取消Celery任务
                if conversion_job.celery_task_id:
                    from app.celery_app import celery
                    celery.control.revoke(conversion_job.celery_task_id, terminate=True)
                    logger.info(f"已取消Celery任务: {conversion_job.celery_task_id}")
                
                # 更新转换任务状态
                conversion_job.status = ConversionStatus.CANCELLED
                
                # 取消所有未处理的文件
                for file_detail in conversion_job.file_details:
                    if file_detail.status in [ConversionStatus.PENDING, ConversionStatus.PROCESSING]:
                        file_detail.status = ConversionStatus.CANCELLED
        
        # 更新主任务状态
        task.status = TaskStatus.CANCELLED
        db.session.commit()
        
        logger.info(f"任务已取消: {task_id}")
        return success_response(message='任务取消成功')
        
    except Exception as e:
        logger.error(f"取消任务失败: {str(e)}")
        db.session.rollback()
        return error_response('服务器内部错误44'), 500

@api_v1.route('/tasks/statistics', methods=['GET'])
@swag_from({
    'tags': ['任务'],
    'summary': '获取任务统计信息',
    'responses': {
        200: {
            'description': '成功获取任务统计信息'
        }
    }
})
def get_task_statistics():
    """获取任务统计信息"""
    try:
        statistics = {
            'total': Task.query.count(),
            'pending': Task.query.filter(Task.status == TaskStatus.PENDING).count(),
            'running': Task.query.filter(Task.status == TaskStatus.RUNNING).count(),
            'completed': Task.query.filter(Task.status == TaskStatus.COMPLETED).count(),
            'failed': Task.query.filter(Task.status == TaskStatus.FAILED).count(),
            'cancelled': Task.query.filter(Task.status == TaskStatus.CANCELLED).count(),
        }
        
        return success_response(data=statistics)
        
    except Exception as e:
        logger.error(f"获取任务统计失败: {str(e)}")
        return error_response('服务器内部错误55'), 500

@api_v1.route('/tasks/batch/delete', methods=['POST'])
@swag_from({
    'tags': ['任务'],
    'summary': '批量删除任务',
    'parameters': [{
        'name': 'task_ids',
        'in': 'body',
        'required': True,
        'schema': {
            'type': 'object',
            'properties': {
                'task_ids': {
                    'type': 'array',
                    'items': {
                        'type': 'integer'
                    }
                }
            }
        }
    }],
    'responses': {
        200: {
            'description': '批量删除成功'
        }
    }
})
def batch_delete_tasks_post():
    """批量删除任务（POST方法）"""
    return batch_delete_tasks()

@api_v1.route('/tasks/batch', methods=['DELETE'])
@swag_from({
    'tags': ['任务'],
    'summary': '批量删除任务',
    'parameters': [{
        'name': 'task_ids',
        'in': 'body',
        'required': True,
        'schema': {
            'type': 'object',
            'properties': {
                'task_ids': {
                    'type': 'array',
                    'items': {
                        'type': 'integer'
                    }
                }
            }
        }
    }],
    'responses': {
        200: {
            'description': '批量删除成功'
        }
    }
})
def batch_delete_tasks():
    """批量删除任务"""
    try:
        data = request.get_json()
        task_ids = data.get('task_ids', [])
        
        if not task_ids:
            return error_response('请提供要删除的任务ID列表'), 400
        
        # 获取所有要删除的任务
        tasks = Task.query.filter(Task.id.in_(task_ids)).all()
        
        deleted_count = 0
        failed_count = 0
        
        for task in tasks:
            try:
                # 检查任务状态
                if task.status in [TaskStatus.RUNNING, TaskStatus.PENDING]:
                    failed_count += 1
                    continue
                
                # 删除相关记录
                if hasattr(task, 'conversion_job') and task.conversion_job:
                    conversion_job = task.conversion_job
                    # 确保conversion_job不是列表，如果是列表则取第一个
                    if isinstance(conversion_job, list):
                        conversion_job = conversion_job[0] if conversion_job else None
                    
                    if conversion_job:
                        for file_detail in conversion_job.file_details:
                            db.session.delete(file_detail)
                        db.session.delete(conversion_job)
                
                db.session.delete(task)
                deleted_count += 1
                
            except Exception as e:
                logger.error(f"删除任务 {task.id} 失败: {str(e)}")
                failed_count += 1
        
        db.session.commit()
        
        message = f'成功删除 {deleted_count} 个任务'
        if failed_count > 0:
            message += f'，{failed_count} 个任务删除失败'
        
        return success_response(
            message=message,
            data={
                'deleted_count': deleted_count,
                'failed_count': failed_count
            }
        )
        
    except Exception as e:
        logger.error(f"批量删除任务失败: {str(e)}")
        db.session.rollback()
        return error_response('服务器内部错误666'), 500

# 注册路由
api.add_resource(TaskStatusResource, '/tasks/<string:task_id>/status') 