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
    
    def get_file_content(self, bucket_name: str, object_name: str) -> str:
        """
        从 MinIO 获取文件内容并返回字符串
        
        Args:
            bucket_name: 存储桶名
            object_name: 对象名
            
        Returns:
            str: 文件内容字符串
        """
        try:
            # 获取文件字节数据
            file_bytes = self.get_file(object_name, bucket_name)
            
            # 尝试解码为字符串
            try:
                content = file_bytes.decode('utf-8')
            except UnicodeDecodeError:
                # 如果UTF-8解码失败，尝试其他编码
                try:
                    content = file_bytes.decode('gbk')
                except UnicodeDecodeError:
                    content = file_bytes.decode('utf-8', errors='ignore')
            
            return content
            
        except Exception as e:
            logger.error(f"获取文件内容失败: {str(e)}")
            raise
    
    def upload_content(self, bucket: str, object_name: str, content: bytes, content_type: str = None):
        """
        上传内容到 MinIO
        
        Args:
            bucket: 存储桶名
            object_name: 对象名
            content: 内容字节
            content_type: 内容类型
        """
        try:
            client = self._get_client()
            
            # 确保bucket存在
            if not self._bucket_exists(bucket):
                client.make_bucket(bucket)
                logger.info(f"创建bucket: {bucket}")
            
            # 上传内容
            client.put_object(
                bucket,
                object_name,
                BytesIO(content),
                len(content),
                content_type=content_type
            )
            
            logger.info(f"内容上传成功: {object_name}, 大小: {len(content)} bytes")
            
        except Exception as e:
            logger.error(f"上传内容失败: {str(e)}")
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
            
            # 使用配置的 bucket，确保与其他方法一致
            bucket_name = current_app.config.get('MINIO_RAW_DATA_BUCKET', 'raw-data')
            
            # 确保bucket存在
            if not self._bucket_exists(bucket_name):
                client.make_bucket(bucket_name)
                logger.info(f"创建bucket: {bucket_name}")
            
            # 上传到 MinIO
            client.put_object(
                bucket_name,
                object_name,
                BytesIO(file_content),
                file_size,
                content_type=content_type
            )
            
            logger.info(f"文件上传成功: {object_name}, 大小: {file_size} bytes, bucket: {bucket_name}")
            return object_name, file_size
            
        except S3Error as e:
            logger.error(f"MinIO 上传文件失败: {str(e)}")
            raise Exception(f"文件上传失败: {str(e)}")
        except Exception as e:
            logger.error(f"上传文件失败: {str(e)}")
            raise
    
    def _bucket_exists(self, bucket_name: str) -> bool:
        """检查bucket是否存在"""
        try:
            client = self._get_client()
            return client.bucket_exists(bucket_name)
        except Exception as e:
            logger.error(f"检查bucket是否存在时出错: {str(e)}")
            return False
    
    def get_file(self, object_name: str, bucket_name: str = None) -> bytes:
        """
        从 MinIO 获取文件
        
        Args:
            object_name: 对象名
            bucket_name: 指定的存储桶名，如果为None则尝试多个可能的桶
            
        Returns:
            bytes: 文件内容
        """
        try:
            client = self._get_client()
            
            # 如果指定了bucket，直接使用
            if bucket_name:
                response = client.get_object(bucket_name, object_name)
                return response.read()
            
            # 否则按优先级尝试不同的bucket
            possible_buckets = [
                current_app.config.get('MINIO_RAW_DATA_BUCKET', 'raw-data'),
                current_app.config.get('MINIO_DATASETS_BUCKET', 'datasets'),
                current_app.config.get('MINIO_BUCKET_NAME', 'pindata-bucket')
            ]
            
            last_error = None
            for bucket in possible_buckets:
                try:
                    logger.info(f"尝试从bucket '{bucket}' 获取文件: {object_name}")
                    response = client.get_object(bucket, object_name)
                    logger.info(f"文件获取成功，来源bucket: {bucket}")
                    return response.read()
                except S3Error as e:
                    last_error = e
                    logger.warning(f"从bucket '{bucket}' 获取文件失败: {str(e)}")
                    continue
                except Exception as e:
                    last_error = e
                    logger.warning(f"从bucket '{bucket}' 获取文件失败: {str(e)}")
                    continue
            
            # 所有bucket都尝试失败
            error_msg = f"文件获取失败: {object_name}，已尝试的buckets: {possible_buckets}"
            if last_error:
                error_msg += f"，最后错误: {str(last_error)}"
            logger.error(error_msg)
            raise Exception(error_msg)
            
        except Exception as e:
            if "文件获取失败:" in str(e):
                # 如果是我们自己抛出的错误，直接传递
                raise
            else:
                logger.error(f"获取文件失败: {str(e)}")
                raise Exception(f"文件获取失败: {str(e)}")
    
    def download_file(self, bucket_name: str, object_name: str, local_file_path: str) -> bool:
        """
        从 MinIO 下载文件到本地路径
        
        Args:
            bucket_name: 存储桶名
            object_name: 对象名
            local_file_path: 本地文件路径
            
        Returns:
            bool: 下载是否成功
        """
        try:
            client = self._get_client()
            client.fget_object(bucket_name, object_name, local_file_path)
            logger.info(f"文件下载成功: {object_name} -> {local_file_path}")
            return True
        except S3Error as e:
            logger.error(f"MinIO 下载文件失败: {str(e)}")
            raise Exception(f"文件下载失败: {str(e)}")
        except Exception as e:
            logger.error(f"下载文件失败: {str(e)}")
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
    
    def file_exists_in_bucket(self, bucket_name: str, object_name: str) -> bool:
        """
        检查文件是否存在于指定bucket中
        
        Args:
            bucket_name: 存储桶名
            object_name: 对象名
            
        Returns:
            bool: 文件是否存在
        """
        try:
            client = self._get_client()
            client.stat_object(bucket_name, object_name)
            return True
        except S3Error:
            return False
        except Exception:
            return False
    
    def upload_file_from_path(self, local_file_path: str, object_name: str, 
                            content_type: str = None, bucket_name: str = None) -> int:
        """
        从本地文件路径上传文件到 MinIO
        
        Args:
            local_file_path: 本地文件路径
            object_name: MinIO中的对象名
            content_type: 文件类型
            bucket_name: 指定的bucket名称，如果为None则使用默认配置
            
        Returns:
            int: 文件大小
        """
        try:
            client = self._get_client()
            
            # 获取文件大小
            file_size = os.path.getsize(local_file_path)
            
            # 确定要使用的bucket
            if bucket_name is None:
                bucket_name = current_app.config.get('MINIO_DATASETS_BUCKET', 'datasets')
            
            # 确保bucket存在
            if not client.bucket_exists(bucket_name):
                client.make_bucket(bucket_name)
                logger.info(f"创建bucket: {bucket_name}")
            
            # 上传到 MinIO
            client.fput_object(
                bucket_name,
                object_name,
                local_file_path,
                content_type=content_type
            )
            
            logger.info(f"文件上传成功: {object_name}, 大小: {file_size} bytes")
            return file_size
            
        except S3Error as e:
            logger.error(f"MinIO 上传文件失败: {str(e)}")
            raise Exception(f"文件上传失败: {str(e)}")
        except Exception as e:
            logger.error(f"上传文件失败: {str(e)}")
            raise

# 创建全局存储服务实例
storage_service = StorageService() 