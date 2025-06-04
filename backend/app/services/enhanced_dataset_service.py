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

    @staticmethod
    def add_files_to_version(version_id: str, files: List[FileStorage]) -> Dict[str, Any]:
        """
        向现有版本添加多个文件
        
        Args:
            version_id: 版本ID
            files: 文件列表
            
        Returns:
            添加结果
        """
        try:
            # 验证版本存在
            version = EnhancedDatasetVersion.query.get_or_404(version_id)
            
            # 如果版本已废弃，不允许添加文件
            if version.is_deprecated:
                raise ValueError('不能向已废弃的版本添加文件')
            
            added_files = []
            total_size_added = 0
            
            for file in files:
                if file and file.filename:
                    # 检查文件名是否重复
                    existing_file = EnhancedDatasetFile.query.filter_by(
                        version_id=version_id,
                        filename=file.filename
                    ).first()
                    
                    if existing_file:
                        logger.warning(f"文件 {file.filename} 已存在，跳过")
                        continue
                    
                    # 上传文件
                    dataset_file = EnhancedDatasetService._upload_dataset_file(version, file)
                    added_files.append(dataset_file)
                    total_size_added += dataset_file.file_size or 0
                    
                    # 生成预览数据
                    try:
                        preview_data = DataPreviewService.generate_preview(dataset_file)
                        DataPreviewService.save_preview_data(dataset_file, preview_data)
                    except Exception as e:
                        logger.warning(f"生成预览失败: {str(e)}")
            
            # 更新版本统计信息
            version.file_count += len(added_files)
            version.total_size += total_size_added
            version.data_checksum = EnhancedDatasetService._calculate_version_checksum(version)
            version.updated_at = datetime.utcnow()
            
            db.session.commit()
            
            return {
                'version_id': version_id,
                'added_files': [f.to_dict() for f in added_files],
                'total_added': len(added_files),
                'new_file_count': version.file_count,
                'new_total_size': version.total_size,
                'new_total_size_formatted': version._format_size(version.total_size)
            }
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"添加文件到版本失败: {str(e)}")
            raise

    @staticmethod
    def delete_file_from_version(version_id: str, file_id: str) -> Dict[str, Any]:
        """
        从版本中删除文件
        
        Args:
            version_id: 版本ID
            file_id: 文件ID
            
        Returns:
            删除结果
        """
        try:
            # 验证版本和文件存在
            version = EnhancedDatasetVersion.query.get_or_404(version_id)
            file = EnhancedDatasetFile.query.filter_by(
                id=file_id,
                version_id=version_id
            ).first()
            
            if not file:
                raise ValueError('文件不存在或不属于此版本')
            
            # 如果版本已废弃，不允许删除文件
            if version.is_deprecated:
                raise ValueError('不能从已废弃的版本删除文件')
            
            # 从存储中删除文件
            try:
                storage_service.delete_file(file.minio_bucket, file.minio_object_name)
            except Exception as e:
                logger.warning(f"删除存储文件失败: {str(e)}")
            
            # 更新版本统计信息
            version.file_count -= 1
            version.total_size -= (file.file_size or 0)
            version.data_checksum = EnhancedDatasetService._calculate_version_checksum(version)
            version.updated_at = datetime.utcnow()
            
            # 删除数据库记录
            db.session.delete(file)
            db.session.commit()
            
            return {
                'version_id': version_id,
                'deleted_file': file.to_dict(),
                'new_file_count': version.file_count,
                'new_total_size': version.total_size,
                'new_total_size_formatted': version._format_size(version.total_size)
            }
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"删除文件失败: {str(e)}")
            raise

    @staticmethod
    def get_version_files(
        version_id: str,
        file_type: Optional[str] = None,
        page: int = 1,
        page_size: int = 20
    ) -> Dict[str, Any]:
        """
        获取版本中的文件列表（支持分页和过滤）
        
        Args:
            version_id: 版本ID
            file_type: 文件类型过滤
            page: 页码
            page_size: 每页大小
            
        Returns:
            文件列表和分页信息
        """
        try:
            # 验证版本存在
            version = EnhancedDatasetVersion.query.get_or_404(version_id)
            
            # 构建查询
            query = EnhancedDatasetFile.query.filter_by(version_id=version_id)
            
            # 文件类型过滤
            if file_type:
                query = query.filter(EnhancedDatasetFile.file_type == file_type)
            
            # 分页
            pagination = query.paginate(
                page=page,
                per_page=page_size,
                error_out=False
            )
            
            files = pagination.items
            
            # 按文件类型分组统计
            type_stats = db.session.query(
                EnhancedDatasetFile.file_type,
                db.func.count(EnhancedDatasetFile.id).label('count'),
                db.func.sum(EnhancedDatasetFile.file_size).label('total_size')
            ).filter_by(version_id=version_id).group_by(
                EnhancedDatasetFile.file_type
            ).all()
            
            return {
                'version': version.to_dict(),
                'files': [f.to_dict() for f in files],
                'pagination': {
                    'total': pagination.total,
                    'pages': pagination.pages,
                    'current_page': pagination.page,
                    'per_page': pagination.per_page,
                    'has_next': pagination.has_next,
                    'has_prev': pagination.has_prev
                },
                'type_statistics': [
                    {
                        'file_type': stat.file_type,
                        'count': stat.count,
                        'total_size': stat.total_size,
                        'total_size_formatted': EnhancedDatasetVersion()._format_size(stat.total_size or 0)
                    }
                    for stat in type_stats
                ]
            }
            
        except Exception as e:
            logger.error(f"获取文件列表失败: {str(e)}")
            raise

    @staticmethod
    def download_file(file_id: str):
        """
        下载单个文件
        
        Args:
            file_id: 文件ID
            
        Returns:
            文件响应
        """
        try:
            file = EnhancedDatasetFile.query.get_or_404(file_id)
            
            # 使用存储服务生成下载链接或直接返回文件
            return storage_service.get_download_response(
                bucket=file.minio_bucket,
                object_name=file.minio_object_name,
                filename=file.filename
            )
            
        except Exception as e:
            logger.error(f"下载文件失败: {str(e)}")
            raise

    @staticmethod
    def batch_file_operations(
        version_id: str,
        operation: str,
        file_ids: List[str],
        metadata: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        批量操作文件
        
        Args:
            version_id: 版本ID
            operation: 操作类型（delete, update_metadata）
            file_ids: 文件ID列表
            metadata: 元数据（用于更新操作）
            
        Returns:
            操作结果
        """
        try:
            # 验证版本存在
            version = EnhancedDatasetVersion.query.get_or_404(version_id)
            
            if version.is_deprecated:
                raise ValueError('不能对已废弃的版本进行批量操作')
            
            # 获取要操作的文件
            files = EnhancedDatasetFile.query.filter(
                EnhancedDatasetFile.id.in_(file_ids),
                EnhancedDatasetFile.version_id == version_id
            ).all()
            
            if len(files) != len(file_ids):
                raise ValueError('部分文件不存在或不属于此版本')
            
            results = []
            
            if operation == 'delete':
                total_size_removed = 0
                
                for file in files:
                    # 删除存储文件
                    try:
                        storage_service.delete_file(file.minio_bucket, file.minio_object_name)
                    except Exception as e:
                        logger.warning(f"删除存储文件失败: {str(e)}")
                    
                    total_size_removed += (file.file_size or 0)
                    results.append(file.to_dict())
                    db.session.delete(file)
                
                # 更新版本统计
                version.file_count -= len(files)
                version.total_size -= total_size_removed
                
            elif operation == 'update_metadata':
                if not metadata:
                    raise ValueError('更新元数据操作需要提供metadata参数')
                
                for file in files:
                    # 更新文件元数据
                    if file.file_metadata:
                        file.file_metadata.update(metadata)
                    else:
                        file.file_metadata = metadata.copy()
                    
                    results.append(file.to_dict())
            
            else:
                raise ValueError(f'不支持的操作类型: {operation}')
            
            # 重新计算数据校验和
            version.data_checksum = EnhancedDatasetService._calculate_version_checksum(version)
            version.updated_at = datetime.utcnow()
            
            db.session.commit()
            
            return {
                'version_id': version_id,
                'operation': operation,
                'affected_files': results,
                'total_affected': len(results),
                'new_file_count': version.file_count,
                'new_total_size': version.total_size,
                'new_total_size_formatted': version._format_size(version.total_size)
            }
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"批量操作失败: {str(e)}")
            raise

    @staticmethod
    def get_file_analytics(version_id: str) -> Dict[str, Any]:
        """
        获取版本文件分析统计
        
        Args:
            version_id: 版本ID
            
        Returns:
            分析统计数据
        """
        try:
            version = EnhancedDatasetVersion.query.get_or_404(version_id)
            
            # 按文件类型统计
            type_stats = db.session.query(
                EnhancedDatasetFile.file_type,
                db.func.count(EnhancedDatasetFile.id).label('count'),
                db.func.sum(EnhancedDatasetFile.file_size).label('total_size'),
                db.func.avg(EnhancedDatasetFile.file_size).label('avg_size')
            ).filter_by(version_id=version_id).group_by(
                EnhancedDatasetFile.file_type
            ).all()
            
            # 大小分布统计
            size_ranges = [
                (0, 1024, '< 1KB'),
                (1024, 1024*1024, '1KB - 1MB'),
                (1024*1024, 1024*1024*10, '1MB - 10MB'),
                (1024*1024*10, 1024*1024*100, '10MB - 100MB'),
                (1024*1024*100, float('inf'), '> 100MB')
            ]
            
            size_distribution = []
            for min_size, max_size, label in size_ranges:
                if max_size == float('inf'):
                    count = EnhancedDatasetFile.query.filter(
                        EnhancedDatasetFile.version_id == version_id,
                        EnhancedDatasetFile.file_size >= min_size
                    ).count()
                else:
                    count = EnhancedDatasetFile.query.filter(
                        EnhancedDatasetFile.version_id == version_id,
                        EnhancedDatasetFile.file_size >= min_size,
                        EnhancedDatasetFile.file_size < max_size
                    ).count()
                
                size_distribution.append({
                    'range': label,
                    'count': count
                })
            
            return {
                'version': version.to_dict(),
                'type_statistics': [
                    {
                        'file_type': stat.file_type,
                        'count': stat.count,
                        'total_size': stat.total_size,
                        'total_size_formatted': version._format_size(stat.total_size or 0),
                        'average_size': stat.avg_size,
                        'average_size_formatted': version._format_size(stat.avg_size or 0)
                    }
                    for stat in type_stats
                ],
                'size_distribution': size_distribution,
                'summary': {
                    'total_files': version.file_count,
                    'total_size': version.total_size,
                    'total_size_formatted': version._format_size(version.total_size),
                    'average_file_size': version.total_size / version.file_count if version.file_count > 0 else 0
                }
            }
            
        except Exception as e:
            logger.error(f"获取文件分析失败: {str(e)}")
            raise

    @staticmethod
    def get_available_files(
        dataset_id: int,
        exclude_version_id: Optional[str] = None,
        file_type: Optional[str] = None,
        search: Optional[str] = None,
        page: int = 1,
        page_size: int = 20
    ) -> Dict[str, Any]:
        """
        获取数据集的可用文件列表（用于创建版本时选择）
        
        Args:
            dataset_id: 数据集ID
            exclude_version_id: 排除某个版本的文件
            file_type: 文件类型过滤
            search: 文件名搜索
            page: 页码
            page_size: 每页大小
            
        Returns:
            可用文件列表和统计信息
        """
        try:
            # 验证数据集存在
            dataset = Dataset.query.get_or_404(dataset_id)
            
            # 构建查询：获取该数据集下所有版本的文件
            query = db.session.query(EnhancedDatasetFile).join(
                EnhancedDatasetVersion,
                EnhancedDatasetFile.version_id == EnhancedDatasetVersion.id
            ).filter(
                EnhancedDatasetVersion.dataset_id == dataset_id,
                EnhancedDatasetVersion.is_deprecated == False  # 排除已废弃版本的文件
            )
            
            # 排除指定版本的文件
            if exclude_version_id:
                query = query.filter(EnhancedDatasetFile.version_id != exclude_version_id)
            
            # 文件类型过滤
            if file_type:
                query = query.filter(EnhancedDatasetFile.file_type == file_type)
            
            # 文件名搜索
            if search:
                query = query.filter(EnhancedDatasetFile.filename.ilike(f'%{search}%'))
            
            # 去重：同名文件只保留最新的
            subquery = query.distinct(EnhancedDatasetFile.filename).subquery()
            
            # 重新构建查询以支持分页
            final_query = db.session.query(EnhancedDatasetFile).filter(
                EnhancedDatasetFile.id.in_(
                    db.session.query(subquery.c.id)
                )
            ).order_by(EnhancedDatasetFile.created_at.desc())
            
            # 分页
            pagination = final_query.paginate(
                page=page,
                per_page=page_size,
                error_out=False
            )
            
            files = pagination.items
            
            # 按文件类型统计
            type_stats = db.session.query(
                EnhancedDatasetFile.file_type,
                db.func.count(EnhancedDatasetFile.id).label('count')
            ).join(
                EnhancedDatasetVersion,
                EnhancedDatasetFile.version_id == EnhancedDatasetVersion.id
            ).filter(
                EnhancedDatasetVersion.dataset_id == dataset_id,
                EnhancedDatasetVersion.is_deprecated == False
            ).group_by(EnhancedDatasetFile.file_type).all()
            
            # 为每个文件添加版本信息
            files_with_version = []
            for file in files:
                file_dict = file.to_dict()
                file_dict['version_info'] = {
                    'version': file.version.version,
                    'is_default': file.version.is_default,
                    'created_at': file.version.created_at.isoformat()
                }
                files_with_version.append(file_dict)
            
            return {
                'dataset': dataset.to_dict(),
                'files': files_with_version,
                'pagination': {
                    'total': pagination.total,
                    'pages': pagination.pages,
                    'current_page': pagination.page,
                    'per_page': pagination.per_page,
                    'has_next': pagination.has_next,
                    'has_prev': pagination.has_prev
                },
                'type_statistics': [
                    {
                        'file_type': stat.file_type,
                        'count': stat.count
                    }
                    for stat in type_stats
                ],
                'summary': {
                    'total_unique_files': pagination.total,
                    'search_term': search,
                    'file_type_filter': file_type
                }
            }
            
        except Exception as e:
            logger.error(f"获取可用文件列表失败: {str(e)}")
            raise

    @staticmethod
    def create_version_with_existing_files(
        dataset_id: int,
        version: str,
        commit_message: str,
        author: str,
        version_type: str = "minor",
        parent_version_id: Optional[str] = None,
        existing_file_ids: Optional[List[str]] = None,
        new_files: Optional[List[FileStorage]] = None,
        pipeline_config: Optional[Dict] = None,
        metadata: Optional[Dict] = None
    ) -> EnhancedDatasetVersion:
        """
        使用现有文件创建数据集版本
        
        Args:
            dataset_id: 数据集ID
            version: 版本号
            commit_message: 提交信息
            author: 作者
            version_type: 版本类型
            parent_version_id: 父版本ID
            existing_file_ids: 现有文件ID列表
            new_files: 新上传的文件列表
            pipeline_config: 管道配置
            metadata: 元数据
            
        Returns:
            创建的版本对象
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
            
            # 验证现有文件存在且属于该数据集
            existing_files = []
            if existing_file_ids:
                existing_files = db.session.query(EnhancedDatasetFile).join(
                    EnhancedDatasetVersion,
                    EnhancedDatasetFile.version_id == EnhancedDatasetVersion.id
                ).filter(
                    EnhancedDatasetFile.id.in_(existing_file_ids),
                    EnhancedDatasetVersion.dataset_id == dataset_id
                ).all()
                
                if len(existing_files) != len(existing_file_ids):
                    missing_ids = set(existing_file_ids) - {f.id for f in existing_files}
                    raise ValueError(f"文件不存在或不属于该数据集: {missing_ids}")
            
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
            
            total_size = 0
            file_count = 0
            
            # 处理现有文件：创建文件副本引用
            if existing_files:
                for original_file in existing_files:
                    # 创建文件记录的副本，但指向新版本
                    new_file_record = EnhancedDatasetFile(
                        version_id=dataset_version.id,
                        filename=original_file.filename,
                        file_path=f"datasets/{dataset_id}/versions/{dataset_version.id}/{original_file.filename}",
                        file_type=original_file.file_type,
                        file_size=original_file.file_size,
                        checksum=original_file.checksum,
                        minio_bucket=original_file.minio_bucket,
                        minio_object_name=original_file.minio_object_name,  # 引用相同的存储对象
                        file_metadata=original_file.file_metadata.copy() if original_file.file_metadata else {},
                        preview_data=original_file.preview_data.copy() if original_file.preview_data else {}
                    )
                    
                    db.session.add(new_file_record)
                    total_size += new_file_record.file_size or 0
                    file_count += 1
            
            # 处理新上传的文件
            if new_files:
                for file in new_files:
                    if file and file.filename:
                        # 检查文件名是否与现有文件冲突
                        conflicting_existing = any(
                            ef.filename == file.filename for ef in existing_files
                        )
                        if conflicting_existing:
                            logger.warning(f"文件名冲突，跳过上传: {file.filename}")
                            continue
                        
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
            
            logger.info(f"数据集版本创建成功: {dataset.name} v{version} (现有文件: {len(existing_files)}, 新文件: {len(new_files) if new_files else 0})")
            return dataset_version
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"使用现有文件创建版本失败: {str(e)}")
            raise 