from typing import List, Dict, Optional, Tuple
from sqlalchemy import func, or_, desc, asc
from sqlalchemy.orm import Session
from app.db import db
from app.models import Library, LibraryFile, DataType
from app.models.library_file import ProcessStatus
import uuid
from datetime import datetime

class LibraryService:
    """文件库服务类"""
    
    @staticmethod
    def get_statistics() -> Dict:
        """获取总体统计信息"""
        # 查询所有文件库统计
        libraries = Library.query.all()
        total_libraries = len(libraries)
        
        # 计算总文件数和处理状态
        total_files = sum(lib.file_count for lib in libraries)
        total_processed = sum(lib.processed_count for lib in libraries)
        
        # 计算总大小
        total_size_bytes = sum(lib.total_size for lib in libraries)
        total_size = LibraryService._format_size(total_size_bytes)
        
        # 计算转换率
        conversion_rate = round((total_processed / total_files * 100) if total_files > 0 else 0, 1)
        
        return {
            'total_libraries': total_libraries,
            'total_files': total_files,
            'total_processed': total_processed,
            'total_size': total_size,
            'conversion_rate': conversion_rate
        }
    
    @staticmethod
    def _format_size(size_bytes: int) -> str:
        """格式化文件大小"""
        for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
            if size_bytes < 1024.0:
                return f"{size_bytes:.1f} {unit}"
            size_bytes /= 1024.0
        return f"{size_bytes:.1f} PB"
    
    @staticmethod
    def get_libraries(
        page: int = 1, 
        per_page: int = 20, 
        name: Optional[str] = None,
        data_type: Optional[str] = None,
        tags: Optional[List[str]] = None,
        sort_by: str = 'created_at',
        sort_order: str = 'desc'
    ) -> Tuple[List[Library], int]:
        """获取文件库列表（分页）"""
        query = Library.query
        
        # 应用过滤条件
        if name:
            query = query.filter(Library.name.ilike(f'%{name}%'))
        
        if data_type:
            query = query.filter(Library.data_type == DataType(data_type))
        
        if tags:
            # PostgreSQL JSON数组查询
            for tag in tags:
                query = query.filter(Library.tags.op('?')(tag))
        
        # 应用排序
        sort_column = getattr(Library, sort_by, Library.created_at)
        if sort_order == 'desc':
            query = query.order_by(desc(sort_column))
        else:
            query = query.order_by(asc(sort_column))
        
        # 分页
        pagination = query.paginate(
            page=page, 
            per_page=per_page, 
            error_out=False
        )
        
        return pagination.items, pagination.total
    
    @staticmethod
    def get_library_by_id(library_id: str) -> Optional[Library]:
        """根据ID获取文件库"""
        return Library.query.filter_by(id=library_id).first()
    
    @staticmethod
    def create_library(name: str, description: Optional[str] = None, 
                      data_type: str = 'training', tags: Optional[List[str]] = None) -> Library:
        """创建文件库"""
        # 检查名称是否已存在
        existing = Library.query.filter_by(name=name).first()
        if existing:
            raise ValueError(f"文件库名称 '{name}' 已存在")
        
        library = Library(
            name=name,
            description=description,
            data_type=DataType(data_type),
            tags=tags or []
        )
        
        db.session.add(library)
        db.session.commit()
        
        return library
    
    @staticmethod
    def update_library(library_id: str, **kwargs) -> Optional[Library]:
        """更新文件库"""
        library = Library.query.filter_by(id=library_id).first()
        if not library:
            return None
        
        # 检查名称冲突
        if 'name' in kwargs and kwargs['name'] != library.name:
            existing = Library.query.filter_by(name=kwargs['name']).first()
            if existing:
                raise ValueError(f"文件库名称 '{kwargs['name']}' 已存在")
        
        # 更新字段
        for key, value in kwargs.items():
            if hasattr(library, key):
                if key == 'data_type' and value:
                    setattr(library, key, DataType(value))
                else:
                    setattr(library, key, value)
        
        library.updated_at = datetime.utcnow()
        db.session.commit()
        
        return library
    
    @staticmethod
    def delete_library(library_id: str) -> bool:
        """删除文件库"""
        library = Library.query.filter_by(id=library_id).first()
        if not library:
            return False
        
        # 删除关联的文件（由于设置了cascade，会自动删除）
        db.session.delete(library)
        db.session.commit()
        
        return True
    
    @staticmethod
    def get_library_files(
        library_id: str,
        page: int = 1,
        per_page: int = 20,
        filename: Optional[str] = None,
        file_type: Optional[str] = None,
        process_status: Optional[str] = None,
        sort_by: str = 'uploaded_at',
        sort_order: str = 'desc'
    ) -> Tuple[List[LibraryFile], int]:
        """获取文件库中的文件列表"""
        query = LibraryFile.query.filter_by(library_id=library_id)
        
        # 应用过滤条件
        if filename:
            query = query.filter(LibraryFile.filename.ilike(f'%{filename}%'))
        
        if file_type:
            query = query.filter(LibraryFile.file_type == file_type)
        
        if process_status:
            query = query.filter(LibraryFile.process_status == ProcessStatus(process_status))
        
        # 应用排序
        sort_column = getattr(LibraryFile, sort_by, LibraryFile.uploaded_at)
        if sort_order == 'desc':
            query = query.order_by(desc(sort_column))
        else:
            query = query.order_by(asc(sort_column))
        
        # 分页
        pagination = query.paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )
        
        return pagination.items, pagination.total
    
    @staticmethod
    def add_file_to_library(
        library_id: str,
        filename: str,
        original_filename: str,
        file_type: str,
        file_size: int,
        minio_object_name: str,
        minio_bucket: str = 'raw-data'
    ) -> LibraryFile:
        """向文件库添加文件"""
        library = Library.query.filter_by(id=library_id).first()
        if not library:
            raise ValueError("文件库不存在")
        
        library_file = LibraryFile(
            filename=filename,
            original_filename=original_filename,
            file_type=file_type,
            file_size=file_size,
            minio_object_name=minio_object_name,
            minio_bucket=minio_bucket,
            library_id=library_id
        )
        
        db.session.add(library_file)
        db.session.commit()
        
        # 更新文件库统计信息
        library.update_statistics()
        
        return library_file
    
    @staticmethod
    def update_file_process_status(
        file_id: str,
        status: str,
        converted_object_name: Optional[str] = None,
        conversion_error: Optional[str] = None
    ) -> Optional[LibraryFile]:
        """更新文件处理状态"""
        library_file = LibraryFile.query.filter_by(id=file_id).first()
        if not library_file:
            return None
        
        library_file.process_status = ProcessStatus(status)
        
        if status == 'completed':
            library_file.processed_at = datetime.utcnow()
            library_file.converted_object_name = converted_object_name
            library_file.converted_format = 'markdown'  # 默认转换为markdown
        elif status == 'failed':
            library_file.conversion_error = conversion_error
        
        db.session.commit()
        
        # 更新文件库统计信息
        library_file.library.update_statistics()
        
        return library_file
    
    @staticmethod
    def update_file(file_id: str, **kwargs) -> Optional[LibraryFile]:
        """更新文件信息"""
        library_file = LibraryFile.query.filter_by(id=file_id).first()
        if not library_file:
            return None
        
        # 更新字段
        for key, value in kwargs.items():
            if hasattr(library_file, key) and value is not None:
                setattr(library_file, key, value)
        
        library_file.updated_at = datetime.utcnow()
        db.session.commit()
        
        return library_file
    
    @staticmethod
    def delete_file(file_id: str) -> bool:
        """删除文件"""
        library_file = LibraryFile.query.filter_by(id=file_id).first()
        if not library_file:
            return False
        
        library = library_file.library
        db.session.delete(library_file)
        db.session.commit()
        
        # 更新文件库统计信息
        library.update_statistics()
        
        return True 