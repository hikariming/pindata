from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON, Boolean, BigInteger, Enum
from sqlalchemy.orm import relationship
from app.db import db
import enum
import uuid

class VersionType(enum.Enum):
    """版本类型"""
    MAJOR = "major"  # 主版本：重大数据变更
    MINOR = "minor"  # 次版本：增量数据或小改动
    PATCH = "patch"  # 补丁版本：数据修复

class EnhancedDatasetVersion(db.Model):
    """增强的数据集版本模型"""
    __tablename__ = 'enhanced_dataset_versions'
    __table_args__ = {'extend_existing': True}
    
    id = Column(String(36), primary_key=True)  # UUID
    dataset_id = Column(Integer, ForeignKey('datasets.id'), nullable=False)
    version = Column(String(50), nullable=False)  # 语义化版本号，如 v1.2.3
    version_type = Column(Enum(VersionType), default=VersionType.MINOR)
    
    # 版本关系
    parent_version_id = Column(String(36), ForeignKey('enhanced_dataset_versions.id'))
    parent_version = relationship('EnhancedDatasetVersion', remote_side=[id])
    
    # Git-like 信息
    commit_hash = Column(String(64), unique=True)  # 类似Git commit hash
    commit_message = Column(Text)  # 版本提交信息
    author = Column(String(255))  # 版本作者
    
    # 数据信息
    total_size = Column(BigInteger, default=0)  # 总数据大小
    file_count = Column(Integer, default=0)  # 文件数量
    data_checksum = Column(String(64))  # 数据校验和
    
    # 配置和统计
    pipeline_config = Column(JSON)  # 数据处理管道配置
    stats = Column(JSON)  # 统计信息（样本数、分布等）
    version_metadata = Column(JSON)  # 版本元数据（改名避免冲突）
    
    # 标签和注释
    tags = Column(JSON)  # 版本标签
    annotations = Column(JSON)  # 数据标注信息
    
    # 状态管理
    is_default = Column(Boolean, default=False)  # 是否为默认版本
    is_draft = Column(Boolean, default=False)  # 是否为草稿版本
    is_deprecated = Column(Boolean, default=False)  # 是否已废弃
    
    # 时间戳
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 关系
    dataset = relationship('Dataset', backref='enhanced_versions')
    files = relationship('EnhancedDatasetFile', back_populates='version', cascade='all, delete-orphan')
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.id:
            self.id = str(uuid.uuid4())
        if not self.commit_hash:
            self.commit_hash = self._generate_commit_hash()
    
    def _generate_commit_hash(self):
        """生成类似Git的commit hash"""
        import hashlib
        import time
        content = f"{self.dataset_id}{self.version}{time.time()}"
        return hashlib.sha256(content.encode()).hexdigest()[:16]
    
    def get_version_info(self):
        """获取版本详细信息"""
        return {
            'version': self.version,
            'commit_hash': self.commit_hash,
            'commit_message': self.commit_message,
            'author': self.author,
            'version_type': self.version_type.value if self.version_type else None,
            'parent_version': self.parent_version.version if self.parent_version else None,
            'file_count': self.file_count,
            'total_size': self._format_size(self.total_size),
            'is_default': self.is_default,
            'is_draft': self.is_draft,
            'is_deprecated': self.is_deprecated,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    def _format_size(self, size_bytes):
        """格式化文件大小"""
        if not size_bytes:
            return "0B"
        for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
            if size_bytes < 1024.0:
                return f"{size_bytes:.1f} {unit}"
            size_bytes /= 1024.0
        return f"{size_bytes:.1f} PB"
    
    def to_dict(self):
        return {
            'id': self.id,
            'dataset_id': self.dataset_id,
            'version': self.version,
            'version_type': self.version_type.value if self.version_type else None,
            'commit_hash': self.commit_hash,
            'commit_message': self.commit_message,
            'author': self.author,
            'parent_version_id': self.parent_version_id,
            'parent_version': self.parent_version.version if self.parent_version else None,
            'total_size': self.total_size,
            'total_size_formatted': self._format_size(self.total_size),
            'file_count': self.file_count,
            'data_checksum': self.data_checksum,
            'pipeline_config': self.pipeline_config,
            'stats': self.stats,
            'metadata': self.version_metadata,
            'tags': self.tags,
            'annotations': self.annotations,
            'is_default': self.is_default,
            'is_draft': self.is_draft,
            'is_deprecated': self.is_deprecated,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'files': [f.to_dict() for f in self.files] if self.files else []
        }

class EnhancedDatasetFile(db.Model):
    """数据集文件模型"""
    __tablename__ = 'enhanced_dataset_files'
    __table_args__ = {'extend_existing': True}
    
    id = Column(String(36), primary_key=True)
    version_id = Column(String(36), ForeignKey('enhanced_dataset_versions.id'), nullable=False)
    
    # 文件基本信息
    filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)  # 相对于数据集的路径
    file_type = Column(String(50), nullable=False)  # text, image, pointcloud, audio, video
    file_size = Column(BigInteger)
    checksum = Column(String(64))  # 文件MD5或SHA256
    
    # MinIO存储信息
    minio_bucket = Column(String(100), default='datasets')
    minio_object_name = Column(String(500), nullable=False)
    
    # 文件元数据
    file_metadata = Column(JSON)  # 文件特定的元数据（改名避免冲突）
    preview_data = Column(JSON)  # 预览数据（前几行/缩略图等）
    
    # 标注信息
    annotations = Column(JSON)  # 文件级别的标注
    
    # 时间戳
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # 关系
    version = relationship('EnhancedDatasetVersion', back_populates='files')
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.id:
            self.id = str(uuid.uuid4())
    
    def to_dict(self):
        return {
            'id': self.id,
            'version_id': self.version_id,
            'filename': self.filename,
            'file_path': self.file_path,
            'file_type': self.file_type,
            'file_size': self.file_size,
            'file_size_formatted': self._format_size(self.file_size),
            'checksum': self.checksum,
            'minio_bucket': self.minio_bucket,
            'minio_object_name': self.minio_object_name,
            'metadata': self.file_metadata,
            'preview_data': self.preview_data,
            'annotations': self.annotations,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    def _format_size(self, size_bytes):
        """格式化文件大小"""
        if not size_bytes:
            return "0B"
        for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
            if size_bytes < 1024.0:
                return f"{size_bytes:.1f} {unit}"
            size_bytes /= 1024.0
        return f"{size_bytes:.1f} PB" 