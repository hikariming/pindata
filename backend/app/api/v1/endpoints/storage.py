import tempfile
import os
import urllib.parse
from flask import Blueprint, request, send_file, make_response
from flask_restful import Api, Resource
from app.services.storage_service import storage_service
from app.utils.response import error_response
import logging

logger = logging.getLogger(__name__)

# 创建蓝图
storage_bp = Blueprint('storage', __name__)
api = Api(storage_bp)

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
            possible_buckets = ['datasets', 'raw-data', 'llama-dataset']
            
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
            
            # 获取文件扩展名
            file_ext = os.path.splitext(object_name)[1].lower()
            
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
                response.headers['Content-Disposition'] = f'attachment; filename="{os.path.basename(object_name)}"'
                return response
            else:
                # 其他文件以二进制形式返回
                response = send_file(
                    downloaded_file,
                    mimetype=content_type,
                    as_attachment=True,
                    download_name=os.path.basename(object_name)
                )
                
                # 注册清理函数
                @response.call_on_close
                def cleanup():
                    try:
                        os.unlink(downloaded_file)
                    except:
                        pass
                
                return response
                
        except Exception as e:
            logger.error(f"下载文件失败: {str(e)}")
            return error_response(f'下载文件失败: {str(e)}'), 500

# 注册路由
api.add_resource(StorageDownloadResource, '/storage/download/<path:object_path>') 