"""
中文DataFlow API端点
"""
from flask import Blueprint, request, jsonify, current_app
from app.services.chinese_dataflow_service import chinese_dataflow_service
from app.services.storage_service import storage_service
from app.utils.response import success_response, error_response
from app.models.task import Task, TaskStatus, TaskType
from app.models.library_file import LibraryFile
from app.db import db
import logging
import json
import tempfile
import os
import zipfile
import re
from datetime import datetime

logger = logging.getLogger(__name__)

chinese_dataflow_bp = Blueprint('chinese_dataflow', __name__)

@chinese_dataflow_bp.route('/pipeline/types', methods=['GET', 'OPTIONS'])
def get_chinese_pipeline_types():
    """获取中文DataFlow支持的流水线类型"""
    if request.method == 'OPTIONS':
        return {}, 200
    
    try:
        pipeline_types = [
            {
                'type': 'CHINESE_PRETRAIN_FILTER',
                'name': '预训练数据过滤（支持中文）',
                'description': '对中文预训练文本进行质量过滤，去除低质量内容',
                'features': ['中文友好', '质量评估', '智能过滤'],
                'category': 'filter'
            },
            {
                'type': 'CHINESE_PRETRAIN_SYNTHESIS',
                'name': '预训练数据合成（支持中文）',
                'description': '基于中文文本生成问答对话、摘要和知识点',
                'features': ['问答生成', '摘要提取', '知识点整理'],
                'category': 'synthesis'
            },
            {
                'type': 'CHINESE_CUSTOM_TASK',
                'name': '自定义任务（支持中文）',
                'description': '自定义中文文本处理任务，如清理、分词、信息提取等',
                'features': ['文本清理', '分词处理', '信息提取', '格式化'],
                'category': 'custom'
            }
        ]
        
        return success_response(pipeline_types)
        
    except Exception as e:
        logger.error(f"获取中文流水线类型失败: {str(e)}")
        return error_response(str(e))

@chinese_dataflow_bp.route('/pipeline/config/<pipeline_type>', methods=['GET', 'OPTIONS'])
def get_chinese_pipeline_config(pipeline_type):
    """获取中文流水线配置模板"""
    if request.method == 'OPTIONS':
        return {}, 200
    
    try:
        config_templates = {
            'CHINESE_PRETRAIN_FILTER': {
                'min_chars': {
                    'type': 'number',
                    'default': 20,
                    'min': 10,
                    'max': 1000,
                    'description': '最小字符数'
                },
                'min_sentences': {
                    'type': 'number',
                    'default': 1,
                    'min': 1,
                    'max': 10,
                    'description': '最小句子数'
                },
                'max_sentences': {
                    'type': 'number',
                    'default': 1000,
                    'min': 10,
                    'max': 10000,
                    'description': '最大句子数'
                },
                'max_special_ratio': {
                    'type': 'number',
                    'default': 0.3,
                    'min': 0.1,
                    'max': 0.9,
                    'step': 0.1,
                    'description': '最大特殊字符比例'
                },
                'min_quality_score': {
                    'type': 'number',
                    'default': 0.3,
                    'min': 0.1,
                    'max': 1.0,
                    'step': 0.1,
                    'description': '最小质量分数'
                }
            },
            'CHINESE_PRETRAIN_SYNTHESIS': {
                'generate_qa': {
                    'type': 'boolean',
                    'default': True,
                    'description': '生成问答对话'
                },
                'generate_summary': {
                    'type': 'boolean',
                    'default': True,
                    'description': '生成摘要'
                },
                'generate_knowledge': {
                    'type': 'boolean',
                    'default': True,
                    'description': '提取知识点'
                }
            },
            'CHINESE_CUSTOM_TASK': {
                'task_type': {
                    'type': 'select',
                    'options': [
                        {'value': 'chinese_clean', 'label': '中文文本清理'},
                        {'value': 'chinese_segment', 'label': '中文分词'},
                        {'value': 'chinese_extract', 'label': '信息提取'},
                        {'value': 'chinese_format', 'label': '格式化'}
                    ],
                    'default': 'chinese_clean',
                    'description': '任务类型'
                },
                'remove_english': {
                    'type': 'boolean',
                    'default': False,
                    'description': '移除英文字符'
                },
                'remove_numbers': {
                    'type': 'boolean',
                    'default': False,
                    'description': '移除数字'
                },
                'normalize_punctuation': {
                    'type': 'boolean',
                    'default': True,
                    'description': '标准化标点符号'
                }
            }
        }
        
        template = config_templates.get(pipeline_type, {})
        return success_response(template)
        
    except Exception as e:
        logger.error(f"获取中文流水线配置失败: {str(e)}")
        return error_response(str(e))

@chinese_dataflow_bp.route('/process/single', methods=['POST', 'OPTIONS'])
def process_single_text():
    """处理单个文本"""
    if request.method == 'OPTIONS':
        return {}, 200
    
    try:
        data = request.get_json()
        if not data:
            return error_response("请求数据不能为空")
        
        text = data.get('text', '')
        pipeline_type = data.get('pipeline_type', '')
        config = data.get('config', {})
        
        if not text:
            return error_response("文本内容不能为空")
        
        if not pipeline_type:
            return error_response("流水线类型不能为空")
        
        # 根据流水线类型处理文本
        if pipeline_type == 'CHINESE_PRETRAIN_FILTER':
            result = chinese_dataflow_service.process_chinese_pretrain_filter(text, config)
        elif pipeline_type == 'CHINESE_PRETRAIN_SYNTHESIS':
            result = chinese_dataflow_service.process_chinese_pretrain_synthesis(text, config)
        elif pipeline_type == 'CHINESE_CUSTOM_TASK':
            task_type = config.get('task_type', 'chinese_clean')
            result = chinese_dataflow_service.process_custom_task(text, task_type, config)
        else:
            return error_response(f"不支持的流水线类型: {pipeline_type}")
        
        return success_response(result)
        
    except Exception as e:
        logger.error(f"处理单个文本失败: {str(e)}")
        return error_response(str(e))

@chinese_dataflow_bp.route('/process/batch', methods=['POST', 'OPTIONS'])
def process_batch_files():
    """批量处理文件"""
    if request.method == 'OPTIONS':
        return {}, 200
    
    try:
        data = request.get_json()
        if not data:
            return error_response("请求数据不能为空")
        
        library_id = data.get('library_id', '')
        file_ids = data.get('file_ids', [])
        pipeline_type = data.get('pipeline_type', '')
        config = data.get('config', {})
        task_name = data.get('task_name', '')
        
        if not library_id:
            return error_response("文件库ID不能为空")
        
        if not file_ids:
            return error_response("文件ID列表不能为空")
        
        if not pipeline_type:
            return error_response("流水线类型不能为空")
        
        # 创建任务
        task = Task(
            name=task_name or f"中文DataFlow任务_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            description=f"中文DataFlow批量处理任务: {pipeline_type}",
            type=TaskType.CHINESE_DATAFLOW,
            library_id=library_id,
            file_ids=file_ids,
            config={
                'pipeline_type': pipeline_type,
                'config': config,
                'chinese_dataflow': True
            },
            total_files=len(file_ids),
            status=TaskStatus.PENDING
        )
        
        db.session.add(task)
        db.session.commit()
        
        # 启动异步任务
        from app.tasks.chinese_dataflow_tasks import process_chinese_dataflow_batch
        celery_task = process_chinese_dataflow_batch.delay(task.id)
        
        # 更新任务状态
        task.status = TaskStatus.RUNNING
        task.started_at = datetime.utcnow()
        task.celery_task_id = celery_task.id
        
        db.session.commit()
        
        return success_response({
            'task_id': task.id,
            'task_name': task.name,
            'status': task.status.value,
            'celery_task_id': celery_task.id
        })
        
    except Exception as e:
        logger.error(f"批量处理文件失败: {str(e)}")
        return error_response(str(e))

@chinese_dataflow_bp.route('/tasks/<task_id>/status', methods=['GET', 'OPTIONS'])
def get_task_status(task_id):
    """获取任务状态"""
    if request.method == 'OPTIONS':
        return {}, 200
    
    try:
        task = Task.query.get(task_id)
        if not task:
            return error_response("任务不存在")
        
        return success_response(task.to_dict())
        
    except Exception as e:
        logger.error(f"获取任务状态失败: {str(e)}")
        return error_response(str(e))

@chinese_dataflow_bp.route('/tasks/<task_id>/results', methods=['GET', 'OPTIONS'])
def get_task_results(task_id):
    """获取任务结果"""
    if request.method == 'OPTIONS':
        return {}, 200
    
    try:
        task = Task.query.get(task_id)
        if not task:
            return error_response("任务不存在")
        
        # 从任务配置中获取结果
        if task.config and 'processing_results' in task.config:
            results = task.config['processing_results']
            return success_response({
                'task_info': task.to_dict(),
                'results': results
            })
        else:
            return success_response({
                'task_info': task.to_dict(),
                'results': []
            })
        
    except Exception as e:
        logger.error(f"获取任务结果失败: {str(e)}")
        return error_response(str(e))

@chinese_dataflow_bp.route('/tasks/<task_id>/download', methods=['GET', 'OPTIONS'])
def download_task_results(task_id):
    """下载任务结果"""
    if request.method == 'OPTIONS':
        return {}, 200
    
    try:
        task = Task.query.get(task_id)
        if not task:
            return error_response("任务不存在")
        
        if task.status != TaskStatus.COMPLETED:
            return error_response("任务尚未完成")
        
        # 获取结果
        if not task.config or 'processing_results' not in task.config:
            return error_response("没有找到结果")
        
        results = task.config['processing_results']
        successful_results = [r for r in results if r.get('status') == 'completed' and r.get('minio_object_name')]
        
        if not successful_results:
            return error_response("没有可下载的结果文件")
        
        # 构造下载链接
        download_links = []
        for result in successful_results:
            download_links.append({
                'file_id': result.get('file_id'),
                'filename': result.get('filename'),
                'download_url': f"/api/v1/storage/download/{result.get('minio_object_name')}"
            })
        
        return success_response({
            'task_info': task.to_dict(),
            'download_links': download_links
        })
        
    except Exception as e:
        logger.error(f"获取下载链接失败: {str(e)}")
        return error_response(str(e))

@chinese_dataflow_bp.route('/tasks/<task_id>/download-zip', methods=['GET', 'OPTIONS'])
def download_task_results_zip(task_id):
    """打包下载中文DataFlow任务结果（zip格式）"""
    if request.method == 'OPTIONS':
        return {}, 200
    
    try:
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
        
        # 获取结果
        if not task.config or 'processing_results' not in task.config:
            return error_response("任务已完成但没有找到结果文件")
        
        results = task.config['processing_results']
        
        # 过滤出成功的结果
        successful_results = [
            result for result in results 
            if result.get('status') == 'completed' and result.get('minio_object_name')
        ]
        
        if not successful_results:
            failed_count = len([r for r in results if r.get('status') == 'failed'])
            total_count = len(results)
            return error_response(f"没有可下载的结果文件。总共 {total_count} 个文件，其中 {failed_count} 个处理失败")
        
        # 创建临时zip文件
        import tempfile
        import zipfile
        import os
        
        temp_zip = tempfile.NamedTemporaryFile(delete=False, suffix='.zip')
        temp_zip.close()
        
        try:
            with zipfile.ZipFile(temp_zip.name, 'w', zipfile.ZIP_DEFLATED) as zip_file:
                for result in successful_results:
                    # 中文DataFlow结果存储在默认bucket中
                    minio_bucket = result.get('minio_bucket') or current_app.config.get('MINIO_DEFAULT_BUCKET', 'pindata-bucket')
                    minio_object_name = result.get('minio_object_name')
                    json_object_name = result.get('minio_json_object_name')  # JSON详细结果
                    
                    if not minio_object_name:
                        continue
                    
                    try:
                        # 下载处理后的文本文件
                        file_content = storage_service.get_file_content(minio_bucket, minio_object_name)
                        
                        if file_content:
                            # 生成zip内的文件名
                            original_filename = result.get('original_filename', 'unknown.txt')
                            processed_filename = result.get('filename', os.path.basename(minio_object_name))
                            
                            # 添加处理后的文本文件到zip
                            zip_file.writestr(processed_filename, file_content.encode('utf-8'))
                            logger.info(f"添加处理文件到zip: {processed_filename}")
                            
                        # 下载JSON详细结果文件（如果存在）
                        if json_object_name:
                            try:
                                json_content = storage_service.get_file_content(minio_bucket, json_object_name)
                                if json_content:
                                    json_filename = f"{os.path.splitext(processed_filename)[0]}_details.json"
                                    zip_file.writestr(json_filename, json_content.encode('utf-8'))
                                    logger.info(f"添加详细结果到zip: {json_filename}")
                            except Exception as json_error:
                                logger.warning(f"下载JSON文件失败: {json_object_name}, 错误: {str(json_error)}")
                            
                    except Exception as file_error:
                        logger.error(f"下载文件失败: {minio_object_name}, 错误: {str(file_error)}")
                        continue
            
            # 检查zip文件是否有内容
            if os.path.getsize(temp_zip.name) == 0:
                return error_response("没有成功下载到任何文件")
            
            # 生成下载文件名 - 使用ASCII安全的文件名
            task_name = task.name or 'chinese_dataflow_task'
            # 移除或替换所有非ASCII字符
            import re
            safe_task_name = re.sub(r'[^\w\-_\s]', '', task_name)
            safe_task_name = re.sub(r'\s+', '_', safe_task_name)   # 空格替换为下划线
            safe_task_name = safe_task_name.encode('ascii', 'ignore').decode('ascii')  # 移除非ASCII字符
            
            if not safe_task_name or len(safe_task_name) < 2:  # 如果文件名太短或为空
                safe_task_name = "chinese_dataflow_results"
            
            download_filename = f"{safe_task_name}_{task_id[:8]}.zip"  # 只使用任务ID的前8位
            
            # 读取zip文件内容并直接返回响应
            with open(temp_zip.name, 'rb') as f:
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
            try:
                if os.path.exists(temp_zip.name):
                    os.unlink(temp_zip.name)
            except Exception as cleanup_error:
                logger.warning(f"清理临时文件失败: {str(cleanup_error)}")
            
            return response
            
        except Exception as zip_error:
            logger.error(f"创建zip文件失败: {str(zip_error)}")
            # 确保清理临时文件
            try:
                if os.path.exists(temp_zip.name):
                    os.unlink(temp_zip.name)
            except Exception as cleanup_error:
                logger.warning(f"清理临时文件失败: {str(cleanup_error)}")
            return error_response(f"创建压缩包失败: {str(zip_error)}")
        
    except Exception as e:
        logger.error(f"打包下载失败: {str(e)}")
        return error_response(str(e))

@chinese_dataflow_bp.route('/health', methods=['GET', 'OPTIONS'])
def health_check():
    """健康检查"""
    if request.method == 'OPTIONS':
        return {}, 200
    
    try:
        return success_response({
            'status': 'healthy',
            'service': 'chinese_dataflow',
            'version': '1.0.0',
            'features': ['中文预训练过滤', '中文预训练合成', '中文自定义任务']
        })
        
    except Exception as e:
        logger.error(f"健康检查失败: {str(e)}")
        return error_response(str(e)) 