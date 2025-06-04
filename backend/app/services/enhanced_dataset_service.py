import os
import hashlib
import zipfile
import tempfile
from typing import List, Dict, Any, Optional, Tuple
from werkzeug.datastructures import FileStorage
from flask import current_app
import logging

from app.db import db
from app.models.dataset import Dataset
from app.models.dataset_version import EnhancedDatasetVersion, EnhancedDatasetFile, VersionType
from app.services.storage_service import storage_service
from app.services.data_preview_service import DataPreviewService
import uuid
from datetime import datetime

logger = logging.getLogger(__name__)

class EnhancedDatasetService:
    """增强的数据集服务"""
    
    @staticmethod
    def create_dataset_version(
        dataset_id: int,
        version: str,
        commit_message: str,
        author: str,
        version_type: str = "minor",
        parent_version_id: Optional[str] = None,
        files: Optional[List[FileStorage]] = None,
        pipeline_config: Optional[Dict] = None,
        metadata: Optional[Dict] = None
    ) -> EnhancedDatasetVersion:
        """
        创建数据集版本（类似git commit）
        
        Args:
            dataset_id: 数据集ID
            version: 版本号（如 v1.2.3）
            commit_message: 提交信息
            author: 作者
            version_type: 版本类型（major/minor/patch）
            parent_version_id: 父版本ID
            files: 上传的文件列表
            pipeline_config: 数据处理管道配置
            metadata: 版本元数据
        """
        try:
            # 验证数据集存在
            dataset = Dataset.query.get_or_404(dataset_id)
            
            # 检查版本号是否已存在
            existing_version = EnhancedDatasetVersion.query.filter_by(
                dataset_id=dataset_id,
                version=version
            ).first()
            if existing_version:
                raise ValueError(f"版本 {version} 已存在")
            
            # 创建版本对象
            dataset_version = EnhancedDatasetVersion(
                dataset_id=dataset_id,
                version=version,
                version_type=VersionType(version_type),
                parent_version_id=parent_version_id,
                commit_message=commit_message,
                author=author,
                pipeline_config=pipeline_config or {},
                version_metadata=metadata or {}
            )
            
            db.session.add(dataset_version)
            db.session.flush()  # 获取版本ID
            
            # 处理文件上传
            if files:
                total_size = 0
                file_count = 0
                
                for file in files:
                    if file and file.filename:
                        dataset_file = EnhancedDatasetService._upload_dataset_file(
                            dataset_version, file
                        )
                        total_size += dataset_file.file_size or 0
                        file_count += 1
                        
                        # 生成预览数据
                        try:
                            preview_data = DataPreviewService.generate_preview(dataset_file)
                            DataPreviewService.save_preview_data(dataset_file, preview_data)
                        except Exception as e:
                            logger.warning(f"生成预览失败: {str(e)}")
                
                # 更新版本统计信息
                dataset_version.total_size = total_size
                dataset_version.file_count = file_count
                dataset_version.data_checksum = EnhancedDatasetService._calculate_version_checksum(
                    dataset_version
                )
            
            # 如果是第一个版本，设为默认版本
            if not EnhancedDatasetVersion.query.filter_by(dataset_id=dataset_id).count():
                dataset_version.is_default = True
            
            db.session.commit()
            
            logger.info(f"数据集版本创建成功: {dataset.name} v{version}")
            return dataset_version
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"创建数据集版本失败: {str(e)}")
            raise
    
    @staticmethod
    def _upload_dataset_file(version: EnhancedDatasetVersion, file: FileStorage) -> EnhancedDatasetFile:
        """上传数据集文件"""
        try:
            # 生成文件路径
            file_extension = os.path.splitext(file.filename)[1]
            relative_path = f"datasets/{version.dataset_id}/versions/{version.id}/{file.filename}"
            object_name = f"datasets/{version.dataset_id}/v{version.version}/{uuid.uuid4().hex}{file_extension}"
            
            # 上传到MinIO
            uploaded_object, file_size = storage_service.upload_file(
                file_data=file,
                original_filename=file.filename,
                content_type=file.content_type
            )
            
            # 计算文件校验和
            file.stream.seek(0)
            checksum = hashlib.md5(file.stream.read()).hexdigest()
            file.stream.seek(0)
            
            # 确定文件类型
            file_type = EnhancedDatasetService._determine_file_type(file.filename)
            
            # 创建文件记录
            dataset_file = EnhancedDatasetFile(
                version_id=version.id,
                filename=file.filename,
                file_path=relative_path,
                file_type=file_type,
                file_size=file_size,
                checksum=checksum,
                minio_bucket='datasets',
                minio_object_name=uploaded_object,
                file_metadata=EnhancedDatasetService._extract_file_metadata(file, file_type)
            )
            
            db.session.add(dataset_file)
            db.session.flush()
            
            return dataset_file
            
        except Exception as e:
            logger.error(f"上传数据集文件失败: {str(e)}")
            raise
    
    @staticmethod
    def _determine_file_type(filename: str) -> str:
        """根据文件名确定文件类型"""
        ext = os.path.splitext(filename)[1].lower()
        
        # 文本类型
        text_exts = ['.txt', '.csv', '.json', '.jsonl', '.md', '.xml']
        if ext in text_exts:
            return 'text'
        
        # 图像类型
        image_exts = ['.jpg', '.jpeg', '.png', '.bmp', '.gif', '.tiff', '.webp']
        if ext in image_exts:
            return 'image'
        
        # 点云类型
        pointcloud_exts = ['.ply', '.pcd', '.xyz', '.las', '.obj']
        if ext in pointcloud_exts:
            return 'pointcloud'
        
        # 音频类型
        audio_exts = ['.wav', '.mp3', '.flac', '.ogg', '.m4a']
        if ext in audio_exts:
            return 'audio'
        
        # 视频类型
        video_exts = ['.mp4', '.avi', '.mov', '.mkv', '.wmv']
        if ext in video_exts:
            return 'video'
        
        # 压缩包类型
        archive_exts = ['.zip', '.tar', '.gz', '.rar', '.7z']
        if ext in archive_exts:
            return 'archive'
        
        return 'unknown'
    
    @staticmethod
    def _extract_file_metadata(file: FileStorage, file_type: str) -> Dict[str, Any]:
        """提取文件元数据"""
        metadata = {
            'original_filename': file.filename,
            'content_type': file.content_type,
            'file_type': file_type
        }
        
        # 根据文件类型提取特定元数据
        if file_type == 'image':
            try:
                from PIL import Image
                with tempfile.NamedTemporaryFile() as tmp:
                    file.save(tmp.name)
                    file.seek(0)
                    
                    with Image.open(tmp.name) as img:
                        metadata.update({
                            'width': img.width,
                            'height': img.height,
                            'mode': img.mode,
                            'format': img.format
                        })
            except Exception as e:
                logger.warning(f"提取图像元数据失败: {str(e)}")
        
        return metadata
    
    @staticmethod
    def _calculate_version_checksum(version: EnhancedDatasetVersion) -> str:
        """计算版本数据校验和"""
        try:
            # 收集所有文件的校验和
            file_checksums = []
            for file in version.files:
                if file.checksum:
                    file_checksums.append(file.checksum)
            
            # 计算整体校验和
            if file_checksums:
                combined = ''.join(sorted(file_checksums))
                return hashlib.sha256(combined.encode()).hexdigest()
            
            return ''
            
        except Exception as e:
            logger.error(f"计算版本校验和失败: {str(e)}")
            return ''
    
    @staticmethod
    def get_dataset_preview(dataset_id: int, version_id: Optional[str] = None, max_items: int = 10) -> Dict[str, Any]:
        """获取数据集预览"""
        try:
            dataset = Dataset.query.get_or_404(dataset_id)
            
            # 获取指定版本或默认版本
            if version_id:
                version = EnhancedDatasetVersion.query.get_or_404(version_id)
            else:
                version = EnhancedDatasetVersion.query.filter_by(
                    dataset_id=dataset_id,
                    is_default=True
                ).first()
                
                if not version:
                    version = EnhancedDatasetVersion.query.filter_by(
                        dataset_id=dataset_id
                    ).order_by(EnhancedDatasetVersion.created_at.desc()).first()
            
            if not version:
                return {
                    'dataset': dataset.to_dict(),
                    'version': None,
                    'preview': {
                        'message': '数据集暂无版本',
                        'total_files': 0,
                        'preview_files': 0,
                        'files': []
                    }
                }
            
            # 获取文件预览
            file_previews = []
            for file in version.files[:max_items]:
                if file.preview_data:
                    # 使用缓存的预览数据
                    file_previews.append({
                        'file': file.to_dict(),
                        'preview': file.preview_data
                    })
                else:
                    # 生成新的预览数据
                    try:
                        preview_data = DataPreviewService.generate_preview(file, max_items=5)
                        DataPreviewService.save_preview_data(file, preview_data)
                        file_previews.append({
                            'file': file.to_dict(),
                            'preview': preview_data
                        })
                    except Exception as e:
                        logger.warning(f"生成文件预览失败: {str(e)}")
                        file_previews.append({
                            'file': file.to_dict(),
                            'preview': {
                                'type': 'error',
                                'message': f'预览生成失败: {str(e)}',
                                'items': []
                            }
                        })
            
            return {
                'dataset': dataset.to_dict(),
                'version': version.to_dict(),
                'preview': {
                    'total_files': version.file_count,
                    'preview_files': len(file_previews),
                    'files': file_previews
                }
            }
            
        except Exception as e:
            logger.error(f"获取数据集预览失败: {str(e)}")
            raise 