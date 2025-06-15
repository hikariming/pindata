from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, BigInteger, ForeignKey, Text, JSON, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.db import db
import enum

class FileType(enum.Enum):
    """文件类型枚举"""
    # 文档类型
    DOCUMENT_MD = "document_md"
    DOCUMENT_PDF = "document_pdf"
    DOCUMENT_DOCX = "document_docx"
    DOCUMENT_XLSX = "document_xlsx"
    DOCUMENT_PPTX = "document_pptx"
    DOCUMENT_TXT = "document_txt"
    
    # 图片类型
    IMAGE_JPG = "image_jpg"
    IMAGE_PNG = "image_png"
    IMAGE_GIF = "image_gif"
    IMAGE_BMP = "image_bmp"
    IMAGE_SVG = "image_svg"
    IMAGE_WEBP = "image_webp"
    
    # 视频类型
    VIDEO_MP4 = "video_mp4"
    VIDEO_AVI = "video_avi"
    VIDEO_MOV = "video_mov"
    VIDEO_WMV = "video_wmv"
    VIDEO_FLV = "video_flv"
    VIDEO_WEBM = "video_webm"
    
    # 数据源类型（预留）
    DATABASE_TABLE = "database_table"
    API_SOURCE = "api_source"
    
    # 其他类型
    OTHER = "other"

class ProcessingStatus(enum.Enum):
    """处理状态枚举"""
    PENDING = "pending"           # 待处理
    PROCESSING = "processing"     # 处理中
    COMPLETED = "completed"       # 已完成
    FAILED = "failed"            # 处理失败
    ANALYZING = "analyzing"       # 分析中
    EXTRACTING = "extracting"     # 提取中

class RawData(db.Model):
    """原始数据模型"""
    __tablename__ = 'raw_data'
    
    id = Column(Integer, primary_key=True)
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255))  # 原始文件名
    file_type = Column(SQLEnum(FileType), nullable=False)  # 使用枚举
    file_category = Column(String(50))  # 文件分类: document, image, video, database, api
    file_size = Column(BigInteger)  # 文件大小（字节）
    minio_object_name = Column(String(500), nullable=False)  # MinIO中的对象名
    dataset_id = Column(Integer, ForeignKey('datasets.id'))
    
    # 数据源关联
    data_source_id = Column(String(36), ForeignKey('project_data_sources.id'))
    
    # 扩展数据源配置关联（用于数据库表和API数据源）
    data_source_config_id = Column(String(36), ForeignKey('data_source_configs.id'))
    
    # 关联文件库中的文件
    library_file_id = Column(String(36), ForeignKey('library_files.id'))
    
    # 文件基础信息
    checksum = Column(String(64))  # 文件校验和
    mime_type = Column(String(100))  # MIME类型
    encoding = Column(String(50))  # 文件编码
    
    # 处理状态
    processing_status = Column(SQLEnum(ProcessingStatus), default=ProcessingStatus.PENDING)
    processing_error = Column(Text)  # 处理错误信息
    processing_progress = Column(Integer, default=0)  # 处理进度 0-100
    
    # 文件元数据（根据文件类型存储不同信息）
    file_metadata = Column(JSON)  # 通用元数据
    extraction_metadata = Column(JSON)  # 提取的元数据
    
    # 预览和内容
    preview_content = Column(Text)  # 文件预览内容
    thumbnail_path = Column(String(500))  # 缩略图路径
    sample_data = Column(JSON)  # 样本数据
    extracted_text = Column(Text)  # 提取的文本内容
    
    # 文档特定字段
    page_count = Column(Integer)  # 页数（文档/PDF）
    word_count = Column(Integer)  # 字数
    
    # 图片特定字段
    image_width = Column(Integer)  # 图片宽度
    image_height = Column(Integer)  # 图片高度
    color_mode = Column(String(20))  # 颜色模式
    
    # 视频特定字段
    duration = Column(Integer)  # 视频时长（秒）
    video_width = Column(Integer)  # 视频宽度
    video_height = Column(Integer)  # 视频高度
    frame_rate = Column(String(20))  # 帧率
    video_codec = Column(String(50))  # 视频编码
    audio_codec = Column(String(50))  # 音频编码
    
    # 数据库和API数据源特定字段
    record_count = Column(Integer)  # 记录数量（数据库表/API响应）
    schema_info = Column(JSON)  # 数据结构信息
    api_response_time = Column(Integer)  # API响应时间（毫秒）
    data_source_metadata = Column(JSON)  # 数据源特定元数据
    
    # 质量和置信度
    content_quality_score = Column(Integer, default=0)  # 内容质量分数 0-100
    extraction_confidence = Column(Integer, default=0)  # 提取置信度 0-100
    
    upload_at = Column(DateTime, default=datetime.utcnow)
    processed_at = Column(DateTime)  # 处理完成时间
    
    # 关系
    dataset = relationship('Dataset')
    data_source = relationship('ProjectDataSource', foreign_keys=[data_source_id])
    data_source_config = relationship('DataSourceConfig', foreign_keys=[data_source_config_id])
    library_file = relationship('LibraryFile', foreign_keys=[library_file_id])
    
    @property
    def file_category_display(self):
        """获取文件分类的显示名称"""
        category_map = {
            'document': '文档',
            'image': '图片', 
            'video': '视频',
            'database': '数据库',
            'api': 'API',
            'other': '其他'
        }
        return category_map.get(self.file_category, '未知')
    
    @property
    def is_supported_preview(self):
        """是否支持预览"""
        preview_types = {
            FileType.DOCUMENT_MD, FileType.DOCUMENT_TXT, FileType.DOCUMENT_PDF,
            FileType.IMAGE_JPG, FileType.IMAGE_PNG, FileType.IMAGE_GIF, 
            FileType.IMAGE_BMP, FileType.IMAGE_SVG, FileType.IMAGE_WEBP,
            FileType.DATABASE_TABLE, FileType.API_SOURCE  # 数据库表和API数据源也支持预览
        }
        return self.file_type in preview_types
    
    @property
    def preview_type(self):
        """获取预览类型"""
        if self.file_type in [FileType.DOCUMENT_MD, FileType.DOCUMENT_TXT]:
            return 'text'
        elif self.file_type == FileType.DOCUMENT_PDF:
            return 'pdf'
        elif 'image' in self.file_type.value:
            return 'image'
        elif 'video' in self.file_type.value:
            return 'video'
        elif self.file_type == FileType.DATABASE_TABLE:
            return 'table'
        elif self.file_type == FileType.API_SOURCE:
            return 'api'
        else:
            return 'none'
    
    def to_dict(self):
        return {
            'id': self.id,
            'filename': self.filename,
            'original_filename': self.original_filename,
            'file_type': self.file_type.value if self.file_type else None,
            'file_category': self.file_category,
            'file_category_display': self.file_category_display,
            'file_size': self.file_size,
            'minio_object_name': self.minio_object_name,
            'dataset_id': self.dataset_id,
            'data_source_id': self.data_source_id,
            'data_source_config_id': self.data_source_config_id,
            'library_file_id': self.library_file_id,
            'checksum': self.checksum,
            'mime_type': self.mime_type,
            'encoding': self.encoding,
            'processing_status': self.processing_status.value if self.processing_status else None,
            'processing_error': self.processing_error,
            'processing_progress': self.processing_progress,
            'file_metadata': self.file_metadata,
            'extraction_metadata': self.extraction_metadata,
            'preview_content': self.preview_content,
            'thumbnail_path': self.thumbnail_path,
            'sample_data': self.sample_data,
            'extracted_text': self.extracted_text,
            'page_count': self.page_count,
            'word_count': self.word_count,
            'image_width': self.image_width,
            'image_height': self.image_height,
            'color_mode': self.color_mode,
            'duration': self.duration,
            'video_width': self.video_width,
            'video_height': self.video_height,
            'frame_rate': self.frame_rate,
            'video_codec': self.video_codec,
            'audio_codec': self.audio_codec,
            'record_count': self.record_count,
            'schema_info': self.schema_info,
            'api_response_time': self.api_response_time,
            'data_source_metadata': self.data_source_metadata,
            'content_quality_score': self.content_quality_score,
            'extraction_confidence': self.extraction_confidence,
            'is_supported_preview': self.is_supported_preview,
            'preview_type': self.preview_type,
            'upload_at': self.upload_at.isoformat() if self.upload_at else None,
            'processed_at': self.processed_at.isoformat() if self.processed_at else None,
        } 