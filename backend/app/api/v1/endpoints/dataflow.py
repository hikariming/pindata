"""
DataFlow流水线API端点
"""
from flask import Blueprint, request, jsonify, current_app
from app.services.dataflow_pipeline_service import DataFlowPipelineService
from app.models.task import Task, TaskStatus
from app.utils.response import success_response, error_response
import logging

logger = logging.getLogger(__name__)

dataflow_bp = Blueprint('dataflow', __name__)

@dataflow_bp.route('/pipeline/types', methods=['GET', 'OPTIONS'])
def get_pipeline_types():
    """获取所有支持的流水线类型"""
    if request.method == 'OPTIONS':
        return {}, 200
    
    try:
        pipeline_types = [
            {
                'type': 'PRETRAIN_FILTER',
                'name': '预训练数据过滤',
                'description': '对原始预训练文本进行去重、改写和过滤操作，得到高质量预训练文本数据'
            },
            {
                'type': 'PRETRAIN_SYNTHETIC',
                'name': '预训练数据合成',
                'description': '使用QA对话形式复述预训练文档，合成对话形式预训练数据'
            },
            {
                'type': 'SFT_FILTER',
                'name': 'SFT数据过滤',
                'description': '对原始SFT格式数据进行质量过滤，得到高质量SFT数据'
            },
            {
                'type': 'SFT_SYNTHETIC',
                'name': 'SFT数据合成',
                'description': '根据原始预训练文本输入，合成高质量SFT数据'
            }
        ]
        
        return success_response(pipeline_types)
        
    except Exception as e:
        logger.error(f"获取流水线类型失败: {str(e)}")
        return error_response(str(e))

@dataflow_bp.route('/pipeline/config/<pipeline_type>', methods=['GET', 'OPTIONS'])
def get_pipeline_config_template(pipeline_type):
    """获取流水线配置模板"""
    if request.method == 'OPTIONS':
        return {}, 200
    
    try:
        service = DataFlowPipelineService()
        template = service.get_pipeline_config_template(pipeline_type)
        
        if not template:
            return error_response("不支持的流水线类型")
        
        return success_response(template)
        
    except Exception as e:
        logger.error(f"获取配置模板失败: {str(e)}")
        return error_response(str(e))

@dataflow_bp.route('/tasks', methods=['POST', 'OPTIONS'])
def create_pipeline_task():
    """创建流水线任务"""
    if request.method == 'OPTIONS':
        return {}, 200
    
    try:
        data = request.get_json()
        
        required_fields = ['library_id', 'file_ids', 'pipeline_type', 'config']
        for field in required_fields:
            if field not in data:
                return error_response(f"缺少必要字段: {field}")
        
        service = DataFlowPipelineService()
        
        task = service.create_pipeline_task(
            library_id=data['library_id'],
            file_ids=data['file_ids'],
            pipeline_type=data['pipeline_type'],
            config=data['config'],
            task_name=data.get('task_name'),
            description=data.get('description'),
            created_by=data.get('created_by', 'api')
        )
        
        return success_response(task.to_dict())
        
    except Exception as e:
        logger.error(f"创建任务失败: {str(e)}")
        return error_response(str(e))

@dataflow_bp.route('/tasks/<task_id>/start', methods=['POST', 'OPTIONS'])
def start_pipeline_task(task_id):
    """启动流水线任务"""
    if request.method == 'OPTIONS':
        return {}, 200
    
    try:
        service = DataFlowPipelineService()
        success = service.start_pipeline_task(task_id)
        
        if success:
            return success_response({"message": "任务启动成功"})
        else:
            return error_response("任务启动失败")
        
    except Exception as e:
        logger.error(f"启动任务失败: {str(e)}")
        return error_response(str(e))

@dataflow_bp.route('/tasks/<task_id>/status', methods=['GET', 'OPTIONS'])
def get_task_status(task_id):
    """获取任务状态"""
    if request.method == 'OPTIONS':
        return {}, 200
    
    try:
        service = DataFlowPipelineService()
        status = service.get_task_status(task_id)
        
        if status:
            return success_response(status)
        else:
            return error_response("任务不存在")
        
    except Exception as e:
        logger.error(f"获取任务状态失败: {str(e)}")
        return error_response(str(e))

@dataflow_bp.route('/tasks/<task_id>/results', methods=['GET', 'OPTIONS'])
def get_task_results(task_id):
    """获取任务结果"""
    if request.method == 'OPTIONS':
        return {}, 200
    
    try:
        service = DataFlowPipelineService()
        results = service.get_task_results(task_id)
        
        return success_response(results)
        
    except Exception as e:
        logger.error(f"获取任务结果失败: {str(e)}")
        return error_response(str(e))

@dataflow_bp.route('/tasks/<task_id>/cancel', methods=['POST', 'OPTIONS'])
def cancel_task(task_id):
    """取消任务"""
    if request.method == 'OPTIONS':
        return {}, 200
    
    try:
        service = DataFlowPipelineService()
        success = service.cancel_task(task_id)
        
        if success:
            return success_response({"message": "任务取消成功"})
        else:
            return error_response("任务取消失败")
        
    except Exception as e:
        logger.error(f"取消任务失败: {str(e)}")
        return error_response(str(e))

@dataflow_bp.route('/libraries/<library_id>/tasks', methods=['GET', 'OPTIONS'])
def get_library_tasks(library_id):
    """获取文件库的所有任务"""
    if request.method == 'OPTIONS':
        return {}, 200
    
    try:
        service = DataFlowPipelineService()
        tasks = service.get_library_tasks(library_id)
        
        return success_response(tasks)
        
    except Exception as e:
        logger.error(f"获取文件库任务失败: {str(e)}")
        return error_response(str(e))

@dataflow_bp.route('/libraries/<library_id>/batch-process', methods=['POST', 'OPTIONS'])
def batch_process_library(library_id):
    """批量处理文件库"""
    if request.method == 'OPTIONS':
        return {}, 200
    
    try:
        data = request.get_json()
        
        pipeline_type = data.get('pipeline_type', 'PRETRAIN_FILTER')
        config = data.get('config', {})
        
        # 启动批量处理任务
        from app.tasks.dataflow_tasks import process_library_batch_task
        
        celery_task = process_library_batch_task.delay(
            library_id=library_id,
            pipeline_type=pipeline_type,
            config=config
        )
        
        return success_response({
            "message": "批量处理任务已启动",
            "celery_task_id": celery_task.id
        })
        
    except Exception as e:
        logger.error(f"批量处理失败: {str(e)}")
        return error_response(str(e))

@dataflow_bp.route('/tasks/<task_id>/download', methods=['GET', 'OPTIONS'])
def download_task_results(task_id):
    """下载任务结果"""
    if request.method == 'OPTIONS':
        return {}, 200
    
    try:
        service = DataFlowPipelineService()
        
        # 获取任务信息
        task_info = service.get_task_status(task_id)
        if not task_info:
            return error_response("任务不存在")
        
        # 获取结果
        results = service.get_task_results(task_id)
        if not results:
            return error_response("没有找到结果")
        
        # 构造下载链接
        download_links = []
        for result in results:
            if result.get('status') == 'completed' and result.get('minio_object_name'):
                download_links.append({
                    'file_id': result.get('library_file_id'),
                    'object_name': result.get('minio_object_name'),
                    'download_url': f"/api/v1/storage/download/{result.get('minio_bucket')}/{result.get('minio_object_name')}"
                })
        
        return success_response({
            'task_info': task_info,
            'download_links': download_links
        })
        
    except Exception as e:
        logger.error(f"获取下载链接失败: {str(e)}")
        return error_response(str(e))

@dataflow_bp.route('/health', methods=['GET', 'OPTIONS'])
def health_check():
    """健康检查"""
    if request.method == 'OPTIONS':
        return {}, 200
    
    try:
        # 检查DataFlow集成状态
        try:
            import sys
            import os
            root_path = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))))
            if root_path not in sys.path:
                sys.path.insert(0, root_path)
            from dataflow_integration import dataflow_integration
            health_status = dataflow_integration.health_check()
        except ImportError:
            health_status = {'dataflow_available': False, 'version': 'unavailable'}
        
        return success_response({
            'status': 'healthy',
            'dataflow_available': health_status.get('dataflow_available', False),
            'version': health_status.get('version', 'unknown')
        })
        
    except Exception as e:
        logger.error(f"健康检查失败: {str(e)}")
        return error_response(str(e))

@dataflow_bp.route('/stats', methods=['GET', 'OPTIONS'])
def get_stats():
    """获取统计信息"""
    if request.method == 'OPTIONS':
        return {}, 200
    
    try:
        # 获取任务统计
        from app.db import db
        from sqlalchemy import func
        
        # 只统计DataFlow相关的任务（通过任务类型过滤）
        from app.models.task import TaskType
        dataflow_task_types = [
            TaskType.PRETRAIN_FILTER,
            TaskType.PRETRAIN_SYNTHETIC, 
            TaskType.SFT_FILTER,
            TaskType.SFT_SYNTHETIC
        ]
        
        task_stats = db.session.query(
            Task.status,
            func.count(Task.id).label('count')
        ).filter(Task.type.in_(dataflow_task_types)).group_by(Task.status).all()
        
        stats = {
            'total_tasks': sum(stat.count for stat in task_stats),
            'by_status': {stat.status.value: stat.count for stat in task_stats}
        }
        
        return success_response(stats)
        
    except Exception as e:
        logger.error(f"获取统计信息失败: {str(e)}")
        return error_response(str(e)) 