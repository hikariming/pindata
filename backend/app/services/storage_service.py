import os
import uuid
from io import BytesIO
from minio import Minio
from minio.error import S3Error
from flask import current_app, has_app_context
from typing import BinaryIO, Tuple, Optional
import logging

logger = logging.getLogger(__name__)

class StorageService:
    """MinIO 存储服务"""
    
    def __init__(self):
        self.client = None
    
    def _get_client(self):
        """获取 MinIO 客户端（延迟初始化）"""
        if self.client is None:
            self._initialize_client()
        return self.client
    
    def _initialize_client(self):
        """初始化 MinIO 客户端"""
        try:
            if not has_app_context():
                raise Exception("需要在 Flask 应用上下文中初始化")
                
            self.client = Minio(
                endpoint=current_app.config['MINIO_ENDPOINT'],
                access_key=current_app.config['MINIO_ACCESS_KEY'],
                secret_key=current_app.config['MINIO_SECRET_KEY'],
                secure=current_app.config['MINIO_SECURE']
            )
            
            # 确保存储桶存在
            bucket_name = current_app.config['MINIO_BUCKET_NAME']
            if not self.client.bucket_exists(bucket_name):
                self.client.make_bucket(bucket_name)
                logger.info(f"创建存储桶: {bucket_name}")
                
        except Exception as e:
            logger.error(f"初始化 MinIO 客户端失败: {str(e)}")
            raise
    
    def upload_file(self, file_data: BinaryIO, original_filename: str, 
                   content_type: str = None, library_id: str = None) -> Tuple[str, int]:
        """
        上传文件到 MinIO
        
        Args:
            file_data: 文件数据流
            original_filename: 原始文件名
            content_type: 文件类型
            library_id: 文件库ID
            
        Returns:
            Tuple[str, int]: (object_name, file_size)
        """
        try:
            client = self._get_client()
            
            # 生成唯一的对象名
            file_extension = os.path.splitext(original_filename)[1]
            object_name = f"{library_id}/{uuid.uuid4().hex}{file_extension}" if library_id else f"temp/{uuid.uuid4().hex}{file_extension}"
            
            # 读取文件数据和大小
            file_data.seek(0)
            file_content = file_data.read()
            file_size = len(file_content)
            
            # 上传到 MinIO
            bucket_name = current_app.config['MINIO_BUCKET_NAME']
            client.put_object(
                bucket_name,
                object_name,
                BytesIO(file_content),
                file_size,
                content_type=content_type
            )
            
            logger.info(f"文件上传成功: {object_name}, 大小: {file_size} bytes")
            return object_name, file_size
            
        except S3Error as e:
            logger.error(f"MinIO 上传文件失败: {str(e)}")
            raise Exception(f"文件上传失败: {str(e)}")
        except Exception as e:
            logger.error(f"上传文件失败: {str(e)}")
            raise
    
    def get_file(self, object_name: str) -> bytes:
        """
        从 MinIO 获取文件
        
        Args:
            object_name: 对象名
            
        Returns:
            bytes: 文件内容
        """
        try:
            client = self._get_client()
            bucket_name = current_app.config['MINIO_BUCKET_NAME']
            response = client.get_object(bucket_name, object_name)
            return response.read()
        except S3Error as e:
            logger.error(f"MinIO 获取文件失败: {str(e)}")
            raise Exception(f"文件获取失败: {str(e)}")
        except Exception as e:
            logger.error(f"获取文件失败: {str(e)}")
            raise
    
    def delete_file(self, object_name: str) -> bool:
        """
        从 MinIO 删除文件
        
        Args:
            object_name: 对象名
            
        Returns:
            bool: 删除是否成功
        """
        try:
            client = self._get_client()
            bucket_name = current_app.config['MINIO_BUCKET_NAME']
            client.remove_object(bucket_name, object_name)
            logger.info(f"文件删除成功: {object_name}")
            return True
        except S3Error as e:
            logger.error(f"MinIO 删除文件失败: {str(e)}")
            return False
        except Exception as e:
            logger.error(f"删除文件失败: {str(e)}")
            return False
    
    def get_file_url(self, object_name: str, expires: int = 3600) -> str:
        """
        获取文件的预签名 URL
        
        Args:
            object_name: 对象名
            expires: 过期时间（秒）
            
        Returns:
            str: 预签名 URL
        """
        try:
            client = self._get_client()
            bucket_name = current_app.config['MINIO_BUCKET_NAME']
            url = client.presigned_get_object(bucket_name, object_name, expires=expires)
            return url
        except S3Error as e:
            logger.error(f"MinIO 获取预签名URL失败: {str(e)}")
            raise Exception(f"获取文件URL失败: {str(e)}")
        except Exception as e:
            logger.error(f"获取文件URL失败: {str(e)}")
            raise
    
    def file_exists(self, object_name: str) -> bool:
        """
        检查文件是否存在
        
        Args:
            object_name: 对象名
            
        Returns:
            bool: 文件是否存在
        """
        try:
            client = self._get_client()
            bucket_name = current_app.config['MINIO_BUCKET_NAME']
            client.stat_object(bucket_name, object_name)
            return True
        except S3Error:
            return False
        except Exception:
            return False

# 创建全局存储服务实例
storage_service = StorageService() 