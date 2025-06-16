import tempfile
import os
import urllib.parse
from flask import Blueprint, request, send_file, make_response, current_app
from flask_restful import Api, Resource
from app.services.storage_service import storage_service
from app.utils.response import error_response
import logging

logger = logging.getLogger(__name__)

# 创建蓝图
storage_bp = Blueprint('storage', __name__)
api = Api(storage_bp)

def safe_filename_for_disposition(filename):
    """
    安全地编码文件名用于 Content-Disposition 响应头
    处理中文字符，避免 UnicodeEncodeError
    """
    try:
        # 首先尝试使用 ASCII 编码
        filename.encode('ascii')
        # 如果成功，直接返回
        return f'attachment; filename="{filename}"'
    except UnicodeEncodeError:
        # 如果包含非 ASCII 字符，使用 RFC 2231 编码
        encoded_filename = urllib.parse.quote(filename.encode('utf-8'))
        return f"attachment; filename*=UTF-8''{encoded_filename}"

class StorageDownloadResource(Resource):
    """存储下载资源"""
    
    def options(self, object_path):
        """处理 CORS 预检请求"""
        return {}, 200
    
    def get(self, object_path):
        """下载文件"""
        try:
            # URL解码对象路径
            object_name = urllib.parse.unquote(object_path)
            logger.info(f"下载请求: 原始路径={object_path}, 解码后={object_name}")
            
            # 可能的bucket列表，按优先级排序
            possible_buckets = [
                current_app.config.get('MINIO_DATASETS_BUCKET', 'datasets'),
                current_app.config.get('MINIO_RAW_DATA_BUCKET', 'raw-data'),
                current_app.config.get('MINIO_BUCKET_NAME', 'pindata-bucket')
            ]
            
            downloaded_file = None
            actual_bucket = None
            
            # 尝试从不同的bucket中下载文件
            for bucket_name in possible_buckets:
                try:
                    logger.info(f"尝试从bucket '{bucket_name}' 下载文件: {object_name}")
                    
                    # 检查文件是否存在
                    if storage_service.file_exists_in_bucket(bucket_name, object_name):
                        # 创建临时文件
                        tmp_file = tempfile.NamedTemporaryFile(delete=False)
                        
                        # 从MinIO下载文件
                        storage_service.download_file(
                            bucket_name,
                            object_name,
                            tmp_file.name
                        )
                        
                        downloaded_file = tmp_file.name
                        actual_bucket = bucket_name
                        logger.info(f"文件下载成功，来源bucket: {bucket_name}")
                        break
                        
                except Exception as e:
                    logger.warning(f"从bucket '{bucket_name}' 下载失败: {str(e)}")
                    continue
            
            if not downloaded_file:
                error_msg = f"文件不存在: {object_name}，已尝试的buckets: {possible_buckets}"
                logger.error(error_msg)
                return error_response(error_msg), 404
            
            # 获取文件扩展名和基础文件名
            file_ext = os.path.splitext(object_name)[1].lower()
            base_filename = os.path.basename(object_name)
            
            # 设置MIME类型
            mime_types = {
                '.pdf': 'application/pdf',
                '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                '.doc': 'application/msword',
                '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                '.ppt': 'application/vnd.ms-powerpoint',
                '.txt': 'text/plain',
                '.md': 'text/markdown; charset=utf-8',
                '.json': 'application/json',
                '.jsonl': 'application/json'
            }
            
            content_type = mime_types.get(file_ext, 'application/octet-stream')
            
            # 如果是文本类文件，以文本形式返回
            if file_ext in ['.md', '.json', '.jsonl', '.txt']:
                with open(downloaded_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                os.unlink(downloaded_file)
                
                response = make_response(content)
                response.headers['Content-Type'] = content_type
                response.headers['Content-Disposition'] = safe_filename_for_disposition(base_filename)
                return response
            else:
                # 其他文件以二进制形式返回
                # 为了避免 send_file 的中文文件名问题，我们手动构建响应
                try:
                    with open(downloaded_file, 'rb') as f:
                        file_data = f.read()
                    os.unlink(downloaded_file)
                    
                    response = make_response(file_data)
                    response.headers['Content-Type'] = content_type
                    response.headers['Content-Disposition'] = safe_filename_for_disposition(base_filename)
                    return response
                except Exception as e:
                    # 如果手动处理失败，回退到 send_file（不过先清理临时文件）
                    try:
                        os.unlink(downloaded_file)
                    except:
                        pass
                    logger.error(f"手动处理文件失败，错误: {str(e)}")
                    raise
                
        except Exception as e:
            logger.error(f"下载文件失败: {str(e)}")
            return error_response(f'下载文件失败: {str(e)}'), 500

# 注册路由
api.add_resource(StorageDownloadResource, '/storage/download/<path:object_path>') 