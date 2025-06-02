from flask import Blueprint, request, send_file, make_response
from flask_restful import Api, Resource
from app.services.storage_service import storage_service
from app.utils.response import error_response
import logging
import tempfile
import os

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
            # 从路径中提取桶名和对象名
            parts = object_path.split('/', 1)
            if len(parts) == 2 and parts[0] == 'converted':
                # 转换后的文件存储在raw-data桶中
                bucket_name = 'raw-data'
                object_name = object_path
            else:
                # 原始文件
                bucket_name = 'raw-data'
                object_name = object_path
            
            # 创建临时文件
            with tempfile.NamedTemporaryFile(delete=False) as tmp_file:
                # 从MinIO下载文件
                storage_service.download_file(
                    bucket_name,
                    object_name,
                    tmp_file.name
                )
                
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
                    '.md': 'text/markdown; charset=utf-8'
                }
                
                content_type = mime_types.get(file_ext, 'application/octet-stream')
                
                # 如果是markdown文件，以文本形式返回
                if file_ext == '.md':
                    with open(tmp_file.name, 'r', encoding='utf-8') as f:
                        content = f.read()
                    os.unlink(tmp_file.name)
                    
                    response = make_response(content)
                    response.headers['Content-Type'] = content_type
                    return response
                else:
                    # 其他文件以二进制形式返回
                    response = send_file(
                        tmp_file.name,
                        mimetype=content_type,
                        as_attachment=True,
                        download_name=os.path.basename(object_name)
                    )
                    
                    # 注册清理函数
                    @response.call_on_close
                    def cleanup():
                        try:
                            os.unlink(tmp_file.name)
                        except:
                            pass
                    
                    return response
                
        except Exception as e:
            logger.error(f"下载文件失败: {str(e)}")
            return error_response(f'下载文件失败: {str(e)}'), 500

# 注册路由
api.add_resource(StorageDownloadResource, '/storage/download/<path:object_path>') 