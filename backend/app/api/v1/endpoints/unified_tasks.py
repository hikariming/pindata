"""
统一任务API端点 - 支持DataFlow和中文DataFlow任务
"""
from flask import Blueprint, request, current_app
from app.services.dataflow_pipeline_service import DataFlowPipelineService
from app.services.storage_service import storage_service
from app.utils.response import success_response, error_response
from app.models.task import Task, TaskStatus, TaskType
from app.db import db
import logging
import tempfile
import os
import zipfile
import re

logger = logging.getLogger(__name__)

unified_tasks_bp = Blueprint('unified_tasks', __name__)

@unified_tasks_bp.route('/tasks/<task_id>/download-zip', methods=['GET', 'OPTIONS'])
def download_unified_task_results_zip(task_id):
    """统一的任务结果打包下载（支持DataFlow和中文DataFlow）"""
    if request.method == 'OPTIONS':
        return {}, 200
    
    try:
        # 首先查询任务信息
        task = Task.query.get(task_id)
        if not task:
            return error_response("任务不存在")
        
        # 检查任务状态
        if task.status != TaskStatus.COMPLETED:
            status_name = {
                'pending': '待处理',
                'running': '运行中',
                'failed': '失败',
                'cancelled': '已取消'
            }.get(task.status.value, '未知状态')
            return error_response(f"任务尚未完成，当前状态: {status_name}")
        
        # 根据任务类型调用不同的下载逻辑
        if task.type == TaskType.CHINESE_DATAFLOW:
            return _download_chinese_dataflow_zip(task)
        else:
            # 原始DataFlow任务
            return _download_original_dataflow_zip(task)
        
    except Exception as e:
        logger.error(f"统一打包下载失败: {str(e)}")
        return error_response(str(e))

def _download_chinese_dataflow_zip(task):
    """下载中文DataFlow任务结果"""
    try:
        # 中文DataFlow的结果存储在 pindata-bucket/chinese_dataflow_results/{task_id} 路径下
        bucket_name = current_app.config.get('MINIO_DEFAULT_BUCKET', 'pindata-bucket')
        folder_prefix = f"chinese_dataflow_results/{task.id}/"
        
        logger.info(f"中文DataFlow任务 {task.id} 开始从路径 {folder_prefix} 列出文件")
        
        # 从MinIO列出该路径下的所有文件
        file_objects = storage_service.list_objects(bucket_name, folder_prefix)
        
        # 如果按任务ID找不到文件，尝试列出所有中文DataFlow结果
        if not file_objects:
            logger.info(f"在路径 {folder_prefix} 没有找到文件，尝试列出所有中文DataFlow结果")
            all_chinese_objects = storage_service.list_objects(bucket_name, "chinese_dataflow_results/")
            
            if not all_chinese_objects:
                return error_response(f"任务已完成但没有在chinese_dataflow_results路径找到任何结果文件")
            
            # 找到最新的结果文件夹
            folders = {}
            for obj in all_chinese_objects:
                path_parts = obj.object_name.split('/')
                if len(path_parts) >= 3:  # chinese_dataflow_results/task_id/filename
                    folder_id = path_parts[1]
                    if folder_id not in folders:
                        folders[folder_id] = []
                    folders[folder_id].append(obj)
            
            if not folders:
                return error_response(f"任务已完成但没有找到有效的中文DataFlow结果文件")
            
            # 使用最新的文件夹（或者文件最多的文件夹）
            best_folder = max(folders.keys(), key=lambda k: len(folders[k]))
            file_objects = folders[best_folder]
            folder_prefix = f"chinese_dataflow_results/{best_folder}/"
            
            logger.info(f"使用替代路径 {folder_prefix}，找到 {len(file_objects)} 个文件")
        else:
            logger.info(f"在路径 {folder_prefix} 找到 {len(file_objects)} 个文件")
        
        # 创建临时zip文件
        temp_zip = tempfile.NamedTemporaryFile(delete=False, suffix='.zip')
        temp_zip.close()
        
        try:
            with zipfile.ZipFile(temp_zip.name, 'w', zipfile.ZIP_DEFLATED) as zip_file:
                for file_obj in file_objects:
                    object_name = file_obj.object_name
                    
                    try:
                        # 下载文件内容
                        file_content = storage_service.get_file_content(bucket_name, object_name)
                        
                        if file_content:
                            # 生成zip内的文件名（去掉路径前缀）
                            zip_filename = object_name.replace(folder_prefix, '')
                            
                            # 添加文件到zip
                            zip_file.writestr(zip_filename, file_content.encode('utf-8'))
                            logger.info(f"添加中文DataFlow文件到zip: {zip_filename}")
                            
                    except Exception as file_error:
                        logger.error(f"下载中文DataFlow文件失败: {object_name}, 错误: {str(file_error)}")
                        continue
            
            return _create_zip_response(temp_zip.name, task, "chinese_dataflow_results")
            
        except Exception as zip_error:
            logger.error(f"创建中文DataFlow zip文件失败: {str(zip_error)}")
            _cleanup_temp_file(temp_zip.name)
            return error_response(f"创建压缩包失败: {str(zip_error)}")
    
    except Exception as e:
        logger.error(f"下载中文DataFlow任务失败: {str(e)}")
        return error_response(str(e))

def _download_original_dataflow_zip(task):
    """下载原始DataFlow任务结果"""
    try:
        # 英文DataFlow的结果存储在 pindata-bucket/dataflow_results/{task_id} 路径下
        bucket_name = current_app.config.get('MINIO_DEFAULT_BUCKET', 'pindata-bucket')
        folder_prefix = f"dataflow_results/{task.id}/"
        
        logger.info(f"英文DataFlow任务 {task.id} 开始从路径 {folder_prefix} 列出文件")
        
        # 从MinIO列出该路径下的所有文件
        file_objects = storage_service.list_objects(bucket_name, folder_prefix)
        
        # 如果按任务ID找不到文件，尝试列出所有英文DataFlow结果
        if not file_objects:
            logger.info(f"在路径 {folder_prefix} 没有找到文件，尝试列出所有英文DataFlow结果")
            all_dataflow_objects = storage_service.list_objects(bucket_name, "dataflow_results/")
            
            if not all_dataflow_objects:
                return error_response(f"任务已完成但没有在dataflow_results路径找到任何结果文件")
            
            # 找到最新的结果文件夹
            folders = {}
            for obj in all_dataflow_objects:
                path_parts = obj.object_name.split('/')
                if len(path_parts) >= 3:  # dataflow_results/task_id/filename
                    folder_id = path_parts[1]
                    if folder_id not in folders:
                        folders[folder_id] = []
                    folders[folder_id].append(obj)
            
            if not folders:
                return error_response(f"任务已完成但没有找到有效的英文DataFlow结果文件")
            
            # 使用最新的文件夹（或者文件最多的文件夹）
            best_folder = max(folders.keys(), key=lambda k: len(folders[k]))
            file_objects = folders[best_folder]
            folder_prefix = f"dataflow_results/{best_folder}/"
            
            logger.info(f"使用替代路径 {folder_prefix}，找到 {len(file_objects)} 个文件")
        else:
            logger.info(f"在路径 {folder_prefix} 找到 {len(file_objects)} 个文件")
        
        # 创建临时zip文件
        temp_zip = tempfile.NamedTemporaryFile(delete=False, suffix='.zip')
        temp_zip.close()
        
        try:
            with zipfile.ZipFile(temp_zip.name, 'w', zipfile.ZIP_DEFLATED) as zip_file:
                for file_obj in file_objects:
                    object_name = file_obj.object_name
                    
                    try:
                        # 从MinIO下载文件内容
                        file_content = storage_service.get_file(
                            object_name, 
                            bucket_name=bucket_name
                        )
                        
                        if file_content:
                            # 生成zip内的文件名（去掉路径前缀）
                            zip_filename = object_name.replace(folder_prefix, '')
                            
                            # 添加到zip文件
                            zip_file.writestr(zip_filename, file_content)
                            logger.info(f"添加英文DataFlow文件到zip: {zip_filename}")
                            
                    except Exception as file_error:
                        logger.error(f"下载英文DataFlow文件失败: {object_name}, 错误: {str(file_error)}")
                        continue
            
            return _create_zip_response(temp_zip.name, task, "dataflow_results")
            
        except Exception as zip_error:
            logger.error(f"创建英文DataFlow zip文件失败: {str(zip_error)}")
            _cleanup_temp_file(temp_zip.name)
            return error_response(f"创建压缩包失败: {str(zip_error)}")
    
    except Exception as e:
        logger.error(f"下载英文DataFlow任务失败: {str(e)}")
        return error_response(str(e))

def _create_zip_response(temp_zip_path, task, default_prefix):
    """创建zip文件响应"""
    try:
        # 检查zip文件是否有内容
        if os.path.getsize(temp_zip_path) == 0:
            _cleanup_temp_file(temp_zip_path)
            return error_response("没有成功下载到任何文件")
        
        # 生成下载文件名 - 使用ASCII安全的文件名
        task_name = task.name or default_prefix
        # 移除或替换所有非ASCII字符
        safe_task_name = re.sub(r'[^\w\-_\s]', '', task_name)
        safe_task_name = re.sub(r'\s+', '_', safe_task_name)   # 空格替换为下划线
        safe_task_name = safe_task_name.encode('ascii', 'ignore').decode('ascii')  # 移除非ASCII字符
        
        if not safe_task_name or len(safe_task_name) < 2:  # 如果文件名太短或为空
            safe_task_name = default_prefix
        
        download_filename = f"{safe_task_name}_{task.id[:8]}.zip"  # 只使用任务ID的前8位
        
        # 读取zip文件内容并直接返回响应
        with open(temp_zip_path, 'rb') as f:
            zip_data = f.read()
        
        from flask import Response
        
        response = Response(
            zip_data,
            mimetype='application/zip',
            headers={
                'Content-Disposition': f'attachment; filename="{download_filename}"',
                'Content-Length': str(len(zip_data))
            }
        )
        
        # 立即清理临时文件
        _cleanup_temp_file(temp_zip_path)
        
        return response
    
    except Exception as e:
        logger.error(f"创建zip响应失败: {str(e)}")
        _cleanup_temp_file(temp_zip_path)
        return error_response(f"创建下载响应失败: {str(e)}")

def _cleanup_temp_file(file_path):
    """清理临时文件"""
    try:
        if os.path.exists(file_path):
            os.unlink(file_path)
    except Exception as cleanup_error:
        logger.warning(f"清理临时文件失败: {str(cleanup_error)}")

@unified_tasks_bp.route('/tasks/<task_id>/status', methods=['GET', 'OPTIONS'])
def get_unified_task_status(task_id):
    """获取统一任务状态（支持DataFlow和中文DataFlow）"""
    if request.method == 'OPTIONS':
        return {}, 200
    
    try:
        task = Task.query.get(task_id)
        if not task:
            return error_response("任务不存在")
        
        # 添加任务类型信息
        task_dict = task.to_dict()
        task_dict['task_type_category'] = 'chinese_dataflow' if task.type == TaskType.CHINESE_DATAFLOW else 'dataflow'
        
        return success_response(task_dict)
        
    except Exception as e:
        logger.error(f"获取统一任务状态失败: {str(e)}")
        return error_response(str(e)) 