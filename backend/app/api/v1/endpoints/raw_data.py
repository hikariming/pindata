from flask import jsonify, request, send_file
from flasgger import swag_from
from app.api.v1 import api_v1
from app.models import RawData, FileType, ProcessingStatus
from app.db import db
import os
import io
from PIL import Image
import mimetypes

@api_v1.route('/raw-data', methods=['GET'])
@swag_from({
    'tags': ['原始数据'],
    'summary': '获取原始数据列表',
    'parameters': [{
        'name': 'page',
        'in': 'query',
        'type': 'integer',
        'default': 1
    }, {
        'name': 'per_page',
        'in': 'query',
        'type': 'integer',
        'default': 20
    }, {
        'name': 'dataset_id',
        'in': 'query',
        'type': 'integer'
    }, {
        'name': 'project_id',
        'in': 'query',
        'type': 'string',
        'description': '项目ID'
    }, {
        'name': 'file_category',
        'in': 'query',
        'type': 'string',
        'description': '文件分类: document, image, video, database, api'
    }, {
        'name': 'processing_status',
        'in': 'query',
        'type': 'string',
        'description': '处理状态'
    }],
    'responses': {
        200: {
            'description': '成功获取原始数据列表'
        }
    }
})
def get_raw_data():
    """获取原始数据列表（增强版）"""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    dataset_id = request.args.get('dataset_id', type=int)
    project_id = request.args.get('project_id', type=str)
    file_category = request.args.get('file_category', type=str)
    processing_status = request.args.get('processing_status', type=str)
    
    query = RawData.query
    
    # 过滤条件
    if dataset_id:
        query = query.filter_by(dataset_id=dataset_id)
    if project_id:
        # 通过数据源关联到项目
        query = query.join(RawData.data_source).filter_by(project_id=project_id)
    if file_category:
        query = query.filter_by(file_category=file_category)
    if processing_status:
        query = query.filter_by(processing_status=processing_status)
    
    pagination = query.order_by(RawData.upload_at.desc()).paginate(
        page=page, per_page=per_page
    )
    
    # 统计信息
    stats = {
        'total_files': RawData.query.count(),
        'by_category': {},
        'by_status': {},
        'total_size': 0
    }
    
    # 按分类统计
    categories = ['document', 'image', 'video', 'database', 'api']
    for category in categories:
        count = RawData.query.filter_by(file_category=category).count()
        stats['by_category'][category] = count
    
    # 按状态统计
    for status in ProcessingStatus:
        count = RawData.query.filter_by(processing_status=status).count()
        stats['by_status'][status.value] = count
    
    # 计算总大小
    total_size_result = db.session.query(db.func.sum(RawData.file_size)).scalar()
    stats['total_size'] = total_size_result or 0
    
    return jsonify({
        'raw_data': [data.to_dict() for data in pagination.items],
        'total': pagination.total,
        'page': page,
        'per_page': per_page,
        'pages': pagination.pages,
        'stats': stats
    })

@api_v1.route('/raw-data/<int:data_id>', methods=['GET'])
@swag_from({
    'tags': ['原始数据'],
    'summary': '获取单个原始数据详情',
    'parameters': [{
        'name': 'data_id',
        'in': 'path',
        'type': 'integer',
        'required': True
    }],
    'responses': {
        200: {'description': '成功获取数据详情'},
        404: {'description': '数据不存在'}
    }
})
def get_raw_data_detail(data_id):
    """获取原始数据详情"""
    data = RawData.query.get_or_404(data_id)
    return jsonify(data.to_dict())

@api_v1.route('/raw-data/<int:data_id>/preview', methods=['GET'])
@swag_from({
    'tags': ['原始数据'],
    'summary': '获取文件预览',
    'parameters': [{
        'name': 'data_id',
        'in': 'path',
        'type': 'integer',
        'required': True
    }, {
        'name': 'preview_type',
        'in': 'query',
        'type': 'string',
        'description': 'text, image, thumbnail',
        'default': 'text'
    }],
    'responses': {
        200: {'description': '成功获取预览'},
        404: {'description': '文件不存在'},
        400: {'description': '不支持预览'}
    }
})
def get_file_preview(data_id):
    """获取文件预览"""
    data = RawData.query.get_or_404(data_id)
    preview_type = request.args.get('preview_type', 'text')
    
    if not data.is_supported_preview:
        return jsonify({'error': '该文件类型不支持预览'}), 400
    
    try:
        if preview_type == 'text' and data.preview_content:
            return jsonify({
                'type': 'text',
                'content': data.preview_content,
                'extracted_text': data.extracted_text,
                'word_count': data.word_count
            })
        
        elif preview_type == 'image' and data.preview_type == 'image':
            # 返回图片的基本信息和缩略图路径
            return jsonify({
                'type': 'image',
                'width': data.image_width,
                'height': data.image_height,
                'color_mode': data.color_mode,
                'thumbnail_path': data.thumbnail_path,
                'file_size': data.file_size
            })
        
        elif preview_type == 'thumbnail' and data.thumbnail_path:
            # 返回缩略图文件
            # 这里需要实际的文件服务实现
            return jsonify({
                'thumbnail_url': f"/api/v1/files/thumbnail/{data.id}",
                'thumbnail_path': data.thumbnail_path
            })
        
        else:
            return jsonify({'error': '不支持的预览类型'}), 400
            
    except Exception as e:
        return jsonify({'error': f'预览生成失败: {str(e)}'}), 500

@api_v1.route('/raw-data/<int:data_id>/metadata', methods=['GET'])
@swag_from({
    'tags': ['原始数据'],
    'summary': '获取文件元数据',
    'responses': {
        200: {'description': '成功获取元数据'},
        404: {'description': '文件不存在'}
    }
})
def get_file_metadata(data_id):
    """获取文件详细元数据"""
    data = RawData.query.get_or_404(data_id)
    
    metadata = {
        'basic_info': {
            'filename': data.filename,
            'original_filename': data.original_filename,
            'file_type': data.file_type.value,
            'file_category': data.file_category,
            'file_size': data.file_size,
            'mime_type': data.mime_type,
            'encoding': data.encoding,
            'checksum': data.checksum,
            'upload_at': data.upload_at.isoformat() if data.upload_at else None,
            'processed_at': data.processed_at.isoformat() if data.processed_at else None,
        },
        'processing_info': {
            'status': data.processing_status.value,
            'progress': data.processing_progress,
            'error': data.processing_error,
            'quality_score': data.content_quality_score,
            'extraction_confidence': data.extraction_confidence,
        },
        'type_specific': {}
    }
    
    # 根据文件类型添加特定信息
    if data.file_category == 'document':
        metadata['type_specific'] = {
            'page_count': data.page_count,
            'word_count': data.word_count,
            'has_text': bool(data.extracted_text),
            'text_length': len(data.extracted_text) if data.extracted_text else 0
        }
    elif data.file_category == 'image':
        metadata['type_specific'] = {
            'width': data.image_width,
            'height': data.image_height,
            'color_mode': data.color_mode,
            'has_thumbnail': bool(data.thumbnail_path)
        }
    elif data.file_category == 'video':
        metadata['type_specific'] = {
            'duration': data.duration,
            'width': data.video_width,
            'height': data.video_height,
            'frame_rate': data.frame_rate,
            'video_codec': data.video_codec,
            'audio_codec': data.audio_codec
        }
    
    # 添加原始元数据
    if data.file_metadata:
        metadata['raw_metadata'] = data.file_metadata
    if data.extraction_metadata:
        metadata['extraction_metadata'] = data.extraction_metadata
    
    return jsonify(metadata)

@api_v1.route('/raw-data/<int:data_id>/process', methods=['POST'])
@swag_from({
    'tags': ['原始数据'],
    'summary': '处理文件（提取文本、生成缩略图等）',
    'parameters': [{
        'name': 'data_id',
        'in': 'path',
        'type': 'integer',
        'required': True
    }],
    'responses': {
        200: {'description': '处理任务已启动'},
        404: {'description': '文件不存在'},
        400: {'description': '文件已在处理中'}
    }
})
def process_file(data_id):
    """处理文件（异步任务）"""
    data = RawData.query.get_or_404(data_id)
    
    if data.processing_status == ProcessingStatus.PROCESSING:
        return jsonify({'error': '文件正在处理中'}), 400
    
    # 更新状态为处理中
    data.processing_status = ProcessingStatus.PROCESSING
    data.processing_progress = 0
    db.session.commit()
    
    # 这里应该启动异步任务来处理文件
    # 例如使用Celery任务队列
    # process_file_task.delay(data_id)
    
    return jsonify({
        'message': '文件处理任务已启动',
        'data_id': data_id,
        'status': 'processing'
    })

@api_v1.route('/raw-data/upload', methods=['POST'])
@swag_from({
    'tags': ['原始数据'],
    'summary': '上传文件到原始数据',
    'parameters': [{
        'name': 'file',
        'in': 'formData',
        'type': 'file',
        'required': True
    }, {
        'name': 'project_id',
        'in': 'formData',
        'type': 'string',
        'required': True
    }, {
        'name': 'data_source_id',
        'in': 'formData',
        'type': 'string'
    }],
    'responses': {
        201: {'description': '文件上传成功'},
        400: {'description': '上传失败'}
    }
})
def upload_raw_data():
    """上传原始数据文件"""
    if 'file' not in request.files:
        return jsonify({'error': '没有选择文件'}), 400
    
    file = request.files['file']
    project_id = request.form.get('project_id')
    data_source_id = request.form.get('data_source_id')
    
    if file.filename == '':
        return jsonify({'error': '文件名为空'}), 400
    
    if not project_id:
        return jsonify({'error': '缺少项目ID'}), 400
    
    try:
        # 检测文件类型
        filename = file.filename
        file_ext = os.path.splitext(filename)[1].lower()
        mime_type = mimetypes.guess_type(filename)[0]
        
        # 根据扩展名确定文件类型和分类
        file_type, file_category = detect_file_type(file_ext, mime_type)
        
        # 保存文件到MinIO（这里需要实际的MinIO实现）
        # 临时使用文件名作为对象名
        minio_object_name = f"raw_data/{project_id}/{filename}"
        
        # 创建数据库记录
        raw_data = RawData(
            filename=filename,
            original_filename=filename,
            file_type=file_type,
            file_category=file_category,
            file_size=len(file.read()),
            minio_object_name=minio_object_name,
            data_source_id=data_source_id,
            mime_type=mime_type,
            processing_status=ProcessingStatus.PENDING
        )
        
        # 重置文件指针
        file.seek(0)
        
        db.session.add(raw_data)
        db.session.commit()
        
        return jsonify({
            'message': '文件上传成功',
            'data': raw_data.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'上传失败: {str(e)}'}), 500

def detect_file_type(file_ext, mime_type):
    """检测文件类型和分类"""
    # 文档类型映射
    document_types = {
        '.md': FileType.DOCUMENT_MD,
        '.pdf': FileType.DOCUMENT_PDF,
        '.docx': FileType.DOCUMENT_DOCX,
        '.xlsx': FileType.DOCUMENT_XLSX,
        '.pptx': FileType.DOCUMENT_PPTX,
        '.txt': FileType.DOCUMENT_TXT,
    }
    
    # 图片类型映射
    image_types = {
        '.jpg': FileType.IMAGE_JPG,
        '.jpeg': FileType.IMAGE_JPG,
        '.png': FileType.IMAGE_PNG,
        '.gif': FileType.IMAGE_GIF,
        '.bmp': FileType.IMAGE_BMP,
        '.svg': FileType.IMAGE_SVG,
        '.webp': FileType.IMAGE_WEBP,
    }
    
    # 视频类型映射
    video_types = {
        '.mp4': FileType.VIDEO_MP4,
        '.avi': FileType.VIDEO_AVI,
        '.mov': FileType.VIDEO_MOV,
        '.wmv': FileType.VIDEO_WMV,
        '.flv': FileType.VIDEO_FLV,
        '.webm': FileType.VIDEO_WEBM,
    }
    
    # 检测文件类型
    if file_ext in document_types:
        return document_types[file_ext], 'document'
    elif file_ext in image_types:
        return image_types[file_ext], 'image'
    elif file_ext in video_types:
        return video_types[file_ext], 'video'
    else:
        return FileType.OTHER, 'other' 