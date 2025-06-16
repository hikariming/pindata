from flask import jsonify, request
from flasgger import swag_from
from app.api.v1 import api_v1
from app.models import GovernedData, RawData, AnnotationType, AnnotationSource
from app.models.library_file import LibraryFile
from app.db import db
from app.services.ai_annotation_service import ai_annotation_service
from app.celery_app import celery
from datetime import datetime
import uuid
import asyncio
import logging

logger = logging.getLogger(__name__)


def find_or_create_raw_data_from_library_file(file_id):
    """从LibraryFile查找或创建对应的RawData记录"""
    # 获取LibraryFile信息
    library_file = LibraryFile.query.get(file_id)
    if not library_file:
        return None
    
    # 检查是否已有对应的RawData记录
    # 使用文件名、大小等特征查找，避免使用不存在的 library_file_id 字段
    existing_raw_data = RawData.query.filter_by(
        filename=library_file.filename,
        file_size=library_file.file_size,
        minio_object_name=library_file.minio_object_name
    ).first()
    
    if existing_raw_data:
        return existing_raw_data
    
    # 根据文件类型确定file_category和file_type
    file_type_mapping = {
        'jpg': ('image', 'IMAGE_JPG'),
        'jpeg': ('image', 'IMAGE_JPG'),
        'png': ('image', 'IMAGE_PNG'),
        'gif': ('image', 'IMAGE_GIF'),
        'bmp': ('image', 'IMAGE_BMP'),
        'svg': ('image', 'IMAGE_SVG'),
        'webp': ('image', 'IMAGE_WEBP'),
        'mp4': ('video', 'VIDEO_MP4'),
        'avi': ('video', 'VIDEO_AVI'),
        'mov': ('video', 'VIDEO_MOV'),
        'wmv': ('video', 'VIDEO_WMV'),
        'flv': ('video', 'VIDEO_FLV'),
        'webm': ('video', 'VIDEO_WEBM'),
        'pdf': ('document', 'DOCUMENT_PDF'),
        'docx': ('document', 'DOCUMENT_DOCX'),
        'xlsx': ('document', 'DOCUMENT_XLSX'),
        'pptx': ('document', 'DOCUMENT_PPTX'),
        'txt': ('document', 'DOCUMENT_TXT'),
        'md': ('document', 'DOCUMENT_MD'),
    }
    
    file_ext = library_file.file_type.lower()
    file_category, file_type_enum = file_type_mapping.get(file_ext, ('other', 'OTHER'))
    
    # 创建新的RawData记录
    from app.models.raw_data import FileType, ProcessingStatus
    raw_data = RawData(
        filename=library_file.filename,
        original_filename=library_file.original_filename,
        file_type=FileType[file_type_enum],
        file_category=file_category,
        file_size=library_file.file_size,
        minio_object_name=library_file.minio_object_name,
        processing_status=ProcessingStatus.COMPLETED  # 假设LibraryFile已经处理过
    )
    
    try:
        db.session.add(raw_data)
        db.session.commit()
        return raw_data
    except Exception as e:
        db.session.rollback()
        raise e


@api_v1.route('/annotations', methods=['GET'])
@swag_from({
    'tags': ['标注管理'],
    'summary': '获取标注列表',
    'parameters': [{
        'name': 'project_id',
        'in': 'query',
        'type': 'string',
        'description': '项目ID'
    }, {
        'name': 'annotation_type',
        'in': 'query',
        'type': 'string',
        'description': '标注类型'
    }, {
        'name': 'annotation_source',
        'in': 'query',
        'type': 'string',
        'description': '标注来源'
    }, {
        'name': 'review_status',
        'in': 'query',
        'type': 'string',
        'description': '审核状态'
    }],
    'responses': {
        200: {'description': '成功获取标注列表'}
    }
})
def get_annotations():
    """获取标注列表"""
    project_id = request.args.get('project_id')
    annotation_type = request.args.get('annotation_type')
    annotation_source = request.args.get('annotation_source')
    review_status = request.args.get('review_status')
    
    query = GovernedData.query.filter(GovernedData.annotation_data.isnot(None))
    
    if project_id:
        query = query.filter_by(project_id=project_id)
    if annotation_type:
        query = query.filter_by(annotation_type=annotation_type)
    if annotation_source:
        query = query.filter_by(annotation_source=annotation_source)
    if review_status:
        query = query.filter_by(review_status=review_status)
    
    annotations = query.order_by(GovernedData.updated_at.desc()).all()
    
    return jsonify({
        'annotations': [annotation.to_dict() for annotation in annotations],
        'total': len(annotations)
    })


@api_v1.route('/annotations/image-qa', methods=['POST'])
@swag_from({
    'tags': ['标注管理'],
    'summary': '创建图片问答标注',
    'parameters': [{
        'name': 'body',
        'in': 'body',
        'required': True,
        'schema': {
            'type': 'object',
            'properties': {
                'raw_data_id': {'type': 'integer', 'description': '原始数据ID'},
                'project_id': {'type': 'string', 'description': '项目ID'},
                'questions_answers': {
                    'type': 'array',
                    'items': {
                        'type': 'object',
                        'properties': {
                            'question': {'type': 'string'},
                            'answer': {'type': 'string'},
                            'confidence': {'type': 'number'},
                            'region': {
                                'type': 'object',
                                'properties': {
                                    'x': {'type': 'number'},
                                    'y': {'type': 'number'},
                                    'width': {'type': 'number'},
                                    'height': {'type': 'number'}
                                }
                            }
                        }
                    }
                },
                'annotation_source': {'type': 'string', 'enum': ['ai_generated', 'human_annotated', 'ai_assisted']},
                'metadata': {'type': 'object'}
            },
            'required': ['raw_data_id', 'project_id', 'questions_answers']
        }
    }],
    'responses': {
        201: {'description': '图片问答标注创建成功'},
        400: {'description': '请求参数错误'},
        404: {'description': '原始数据不存在'}
    }
})
def create_image_qa_annotation():
    """创建图片问答标注"""
    data = request.get_json()
    
    raw_data_id = data.get('raw_data_id')
    project_id = data.get('project_id')
    questions_answers = data.get('questions_answers', [])
    annotation_source = data.get('annotation_source', 'human_annotated')
    metadata = data.get('metadata', {})
    
    # 验证原始数据是否存在且为图片类型
    raw_data = RawData.query.get(raw_data_id)
    if not raw_data:
        return jsonify({'error': '原始数据不存在'}), 404
    
    if raw_data.file_category != 'image':
        return jsonify({'error': '只能对图片数据进行问答标注'}), 400
    
    try:
        # 检查是否已有标注记录
        existing_annotation = GovernedData.query.filter_by(
            raw_data_id=raw_data_id,
            annotation_type=AnnotationType.IMAGE_QA
        ).first()
        
        annotation_data = {
            'type': 'image_qa',
            'questions_answers': questions_answers,
            'timestamp': datetime.utcnow().isoformat(),
            'total_qa_pairs': len(questions_answers)
        }
        
        # 计算平均置信度
        confidences = [qa.get('confidence', 0) for qa in questions_answers if qa.get('confidence')]
        avg_confidence = sum(confidences) / len(confidences) if confidences else 0
        
        if existing_annotation:
            # 更新现有标注
            if annotation_source == 'ai_generated':
                existing_annotation.ai_annotations = annotation_data
            else:
                existing_annotation.human_annotations = annotation_data
            
            existing_annotation.merge_annotations()
            existing_annotation.annotation_confidence = avg_confidence
            existing_annotation.annotation_metadata = metadata
            existing_annotation.updated_at = datetime.utcnow()
            
            annotation = existing_annotation
        else:
            # 创建新的标注记录
            annotation = GovernedData(
                project_id=project_id,
                raw_data_id=raw_data_id,
                name=f"{raw_data.filename}_qa_annotation",
                description=f"图片问答标注 - {len(questions_answers)}个问答对",
                data_type="unstructured",
                annotation_type=AnnotationType.IMAGE_QA,
                annotation_source=AnnotationSource(annotation_source),
                annotation_data=annotation_data,
                annotation_confidence=avg_confidence,
                annotation_metadata=metadata,
                governance_status="completed" if annotation_source == 'human_annotated' else "pending"
            )
            
            if annotation_source == 'ai_generated':
                annotation.ai_annotations = annotation_data
            else:
                annotation.human_annotations = annotation_data
        
        db.session.add(annotation)
        db.session.commit()
        
        return jsonify({
            'message': '图片问答标注创建成功',
            'annotation': annotation.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'创建标注失败: {str(e)}'}), 500


@api_v1.route('/annotations/video-transcript', methods=['POST'])
@swag_from({
    'tags': ['标注管理'],
    'summary': '创建视频字幕标注',
    'parameters': [{
        'name': 'body',
        'in': 'body',
        'required': True,
        'schema': {
            'type': 'object',
            'properties': {
                'raw_data_id': {'type': 'integer', 'description': '原始数据ID'},
                'project_id': {'type': 'string', 'description': '项目ID'},
                'transcript_segments': {
                    'type': 'array',
                    'items': {
                        'type': 'object',
                        'properties': {
                            'start_time': {'type': 'number', 'description': '开始时间（秒）'},
                            'end_time': {'type': 'number', 'description': '结束时间（秒）'},
                            'text': {'type': 'string', 'description': '字幕文本'},
                            'confidence': {'type': 'number', 'description': '置信度'},
                            'speaker': {'type': 'string', 'description': '说话人'}
                        }
                    }
                },
                'annotation_source': {'type': 'string', 'enum': ['ai_generated', 'human_annotated', 'ai_assisted']},
                'language': {'type': 'string', 'description': '语言'},
                'metadata': {'type': 'object'}
            },
            'required': ['raw_data_id', 'project_id', 'transcript_segments']
        }
    }],
    'responses': {
        201: {'description': '视频字幕标注创建成功'},
        400: {'description': '请求参数错误'},
        404: {'description': '原始数据不存在'}
    }
})
def create_video_transcript_annotation():
    """创建视频字幕标注"""
    data = request.get_json()
    
    raw_data_id = data.get('raw_data_id')
    project_id = data.get('project_id')
    transcript_segments = data.get('transcript_segments', [])
    annotation_source = data.get('annotation_source', 'human_annotated')
    language = data.get('language', 'zh-CN')
    metadata = data.get('metadata', {})
    
    # 验证原始数据是否存在且为视频类型
    raw_data = RawData.query.get(raw_data_id)
    if not raw_data:
        return jsonify({'error': '原始数据不存在'}), 404
    
    if raw_data.file_category != 'video':
        return jsonify({'error': '只能对视频数据进行字幕标注'}), 400
    
    try:
        # 检查是否已有标注记录
        existing_annotation = GovernedData.query.filter_by(
            raw_data_id=raw_data_id,
            annotation_type=AnnotationType.VIDEO_TRANSCRIPT
        ).first()
        
        annotation_data = {
            'type': 'video_transcript',
            'language': language,
            'transcript_segments': transcript_segments,
            'timestamp': datetime.utcnow().isoformat(),
            'total_segments': len(transcript_segments),
            'total_duration': max([seg.get('end_time', 0) for seg in transcript_segments]) if transcript_segments else 0
        }
        
        # 计算平均置信度
        confidences = [seg.get('confidence', 0) for seg in transcript_segments if seg.get('confidence')]
        avg_confidence = sum(confidences) / len(confidences) if confidences else 0
        
        if existing_annotation:
            # 更新现有标注
            if annotation_source == 'ai_generated':
                existing_annotation.ai_annotations = annotation_data
            else:
                existing_annotation.human_annotations = annotation_data
            
            existing_annotation.merge_annotations()
            existing_annotation.annotation_confidence = avg_confidence
            existing_annotation.annotation_metadata = metadata
            existing_annotation.updated_at = datetime.utcnow()
            
            annotation = existing_annotation
        else:
            # 创建新的标注记录
            annotation = GovernedData(
                project_id=project_id,
                raw_data_id=raw_data_id,
                name=f"{raw_data.filename}_transcript_annotation",
                description=f"视频字幕标注 - {len(transcript_segments)}个片段",
                data_type="unstructured",
                annotation_type=AnnotationType.VIDEO_TRANSCRIPT,
                annotation_source=AnnotationSource(annotation_source),
                annotation_data=annotation_data,
                annotation_confidence=avg_confidence,
                annotation_metadata=metadata,
                governance_status="completed" if annotation_source == 'human_annotated' else "pending"
            )
            
            if annotation_source == 'ai_generated':
                annotation.ai_annotations = annotation_data
            else:
                annotation.human_annotations = annotation_data
        
        db.session.add(annotation)
        db.session.commit()
        
        return jsonify({
            'message': '视频字幕标注创建成功',
            'annotation': annotation.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'创建标注失败: {str(e)}'}), 500


@api_v1.route('/annotations/<annotation_id>', methods=['GET'])
@swag_from({
    'tags': ['标注管理'],
    'summary': '获取标注详情',
    'parameters': [{
        'name': 'annotation_id',
        'in': 'path',
        'type': 'string',
        'required': True
    }],
    'responses': {
        200: {'description': '成功获取标注详情'},
        404: {'description': '标注不存在'}
    }
})
def get_annotation_detail(annotation_id):
    """获取标注详情"""
    annotation = GovernedData.query.get_or_404(annotation_id)
    return jsonify(annotation.to_dict())


@api_v1.route('/annotations/<annotation_id>', methods=['PUT'])
@swag_from({
    'tags': ['标注管理'],
    'summary': '更新标注',
    'parameters': [{
        'name': 'annotation_id',
        'in': 'path',
        'type': 'string',
        'required': True
    }, {
        'name': 'body',
        'in': 'body',
        'required': True,
        'schema': {
            'type': 'object',
            'properties': {
                'annotation_data': {'type': 'object'},
                'human_annotations': {'type': 'object'},
                'review_status': {'type': 'string'},
                'review_comments': {'type': 'string'},
                'tags': {'type': 'array', 'items': {'type': 'string'}}
            }
        }
    }],
    'responses': {
        200: {'description': '标注更新成功'},
        404: {'description': '标注不存在'}
    }
})
def update_annotation(annotation_id):
    """更新标注"""
    annotation = GovernedData.query.get_or_404(annotation_id)
    data = request.get_json()
    
    try:
        # 更新字段
        if 'annotation_data' in data:
            annotation.annotation_data = data['annotation_data']
        
        if 'human_annotations' in data:
            annotation.human_annotations = data['human_annotations']
            annotation.merge_annotations()  # 重新合并标注
        
        if 'review_status' in data:
            annotation.review_status = data['review_status']
        
        if 'review_comments' in data:
            annotation.review_comments = data['review_comments']
        
        if 'tags' in data:
            annotation.tags = data['tags']
        
        annotation.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'message': '标注更新成功',
            'annotation': annotation.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'更新标注失败: {str(e)}'}), 500


@api_v1.route('/annotations/<annotation_id>/review', methods=['POST'])
@swag_from({
    'tags': ['标注管理'],
    'summary': '审核标注',
    'parameters': [{
        'name': 'annotation_id',
        'in': 'path',
        'type': 'string',
        'required': True
    }, {
        'name': 'body',
        'in': 'body',
        'required': True,
        'schema': {
            'type': 'object',
            'properties': {
                'review_status': {'type': 'string', 'enum': ['approved', 'rejected'], 'description': '审核结果'},
                'review_comments': {'type': 'string', 'description': '审核意见'},
                'reviewer_id': {'type': 'string', 'description': '审核人ID'}
            },
            'required': ['review_status', 'reviewer_id']
        }
    }],
    'responses': {
        200: {'description': '审核完成'},
        404: {'description': '标注不存在'}
    }
})
def review_annotation(annotation_id):
    """审核标注"""
    annotation = GovernedData.query.get_or_404(annotation_id)
    data = request.get_json()
    
    try:
        annotation.review_status = data['review_status']
        annotation.reviewer_id = data['reviewer_id']
        annotation.review_comments = data.get('review_comments', '')
        
        # 如果审核通过，更新治理状态
        if data['review_status'] == 'approved':
            annotation.governance_status = 'validated'
        elif data['review_status'] == 'rejected':
            annotation.governance_status = 'failed'
        
        annotation.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'message': '审核完成',
            'annotation': annotation.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'审核失败: {str(e)}'}), 500


@api_v1.route('/annotations/<annotation_id>', methods=['DELETE'])
@swag_from({
    'tags': ['标注管理'],
    'summary': '删除标注',
    'parameters': [{
        'name': 'annotation_id',
        'in': 'path',
        'type': 'string',
        'required': True
    }],
    'responses': {
        200: {'description': '标注删除成功'},
        404: {'description': '标注不存在'}
    }
})
def delete_annotation(annotation_id):
    """删除标注"""
    annotation = GovernedData.query.get_or_404(annotation_id)
    
    try:
        db.session.delete(annotation)
        db.session.commit()
        
        return jsonify({'message': '标注删除成功'})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'删除标注失败: {str(e)}'}), 500


@api_v1.route('/annotations/ai-assist/image-qa', methods=['POST'])
@swag_from({
    'tags': ['AI辅助标注'],
    'summary': 'AI辅助生成图片问答标注（异步）',
    'parameters': [{
        'name': 'body',
        'in': 'body',
        'required': True,
        'schema': {
            'type': 'object',
            'properties': {
                'raw_data_id': {'type': ['integer', 'string'], 'description': '原始数据ID（整数）或文件库ID（UUID字符串）'},
                'questions': {
                    'type': 'array',
                    'items': {'type': 'string'},
                    'description': '问题列表，如果为空则生成默认问题'
                },
                'model_provider': {
                    'type': 'string',
                    'enum': ['openai', 'anthropic', 'google'],
                    'default': 'openai',
                    'description': 'AI模型提供商（已弃用，使用model_config）'
                },
                'model_config': {
                    'type': 'object',
                    'description': '指定的AI模型配置',
                    'properties': {
                        'id': {'type': 'string', 'description': '模型配置ID'},
                        'name': {'type': 'string', 'description': '模型名称'},
                        'provider': {'type': 'string', 'description': '模型提供商'},
                        'model_name': {'type': 'string', 'description': '模型标识'}
                    },
                    'required': ['id']
                },
                'region': {
                    'type': 'object',
                    'description': '选中的图片区域',
                    'properties': {
                        'x': {'type': 'number'},
                        'y': {'type': 'number'},
                        'width': {'type': 'number'},
                        'height': {'type': 'number'}
                    }
                }
            },
            'required': ['raw_data_id']
        }
    }],
    'responses': {
        202: {'description': 'AI标注任务已提交，返回任务ID'},
        400: {'description': '请求参数错误'},
        404: {'description': '原始数据不存在'}
    }
})
def ai_generate_image_qa():
    """AI辅助生成图片问答标注（待开发）"""
    logger.info("收到AI图像问答请求，但功能暂未开发完成")
    
    return jsonify({
        'message': '该功能正在开发中，敬请期待',
        'status': 'under_development',
        'qa_pairs': [],
        'metadata': {
            'error': 'AI图像问答功能正在开发中，暂时无法使用',
            'total_questions': 0,
            'avg_confidence': 0
        }
    }), 200


@api_v1.route('/annotations/ai-assist/image-caption', methods=['POST'])
@swag_from({
    'tags': ['AI辅助标注'],
    'summary': 'AI辅助生成图片描述标注',
    'parameters': [{
        'name': 'body',
        'in': 'body',
        'required': True,
        'schema': {
            'type': 'object',
            'properties': {
                'raw_data_id': {'type': 'integer', 'description': '原始数据ID'},
                'model_provider': {
                    'type': 'string',
                    'enum': ['openai', 'anthropic', 'google'],
                    'default': 'openai',
                    'description': 'AI模型提供商'
                }
            },
            'required': ['raw_data_id']
        }
    }],
    'responses': {
        200: {'description': 'AI描述生成成功'},
        400: {'description': '请求参数错误'},
        404: {'description': '原始数据不存在'}
    }
})
def ai_generate_image_caption():
    """AI辅助生成图片描述标注"""
    data = request.get_json()
    
    raw_data_id = data.get('raw_data_id')
    model_provider = data.get('model_provider', 'openai')
    
    # 验证原始数据是否存在
    raw_data = RawData.query.get(raw_data_id)
    if not raw_data:
        return jsonify({'error': '原始数据不存在'}), 404
    
    if raw_data.file_category != 'image':
        return jsonify({'error': '只能对图片数据进行描述标注'}), 400
    
    try:
        # 调用AI服务生成标注
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        result = loop.run_until_complete(
            ai_annotation_service.generate_image_caption(
                raw_data=raw_data,
                model_provider=model_provider
            )
        )
        
        return jsonify({
            'message': 'AI图片描述标注生成成功',
            'annotation_data': result
        })
        
    except Exception as e:
        return jsonify({'error': f'AI标注生成失败: {str(e)}'}), 500


@api_v1.route('/annotations/ai-assist/video-transcript', methods=['POST'])
@swag_from({
    'tags': ['AI辅助标注'],
    'summary': 'AI辅助生成视频字幕标注',
    'parameters': [{
        'name': 'body',
        'in': 'body',
        'required': True,
        'schema': {
            'type': 'object',
            'properties': {
                'raw_data_id': {'type': 'integer', 'description': '原始数据ID'},
                'language': {
                    'type': 'string',
                    'default': 'zh',
                    'description': '语言代码'
                }
            },
            'required': ['raw_data_id']
        }
    }],
    'responses': {
        200: {'description': 'AI字幕生成成功'},
        400: {'description': '请求参数错误'},
        404: {'description': '原始数据不存在'}
    }
})
def ai_generate_video_transcript():
    """AI辅助生成视频字幕标注"""
    data = request.get_json()
    
    raw_data_id = data.get('raw_data_id')
    language = data.get('language', 'zh')
    
    # 验证原始数据是否存在
    raw_data = RawData.query.get(raw_data_id)
    if not raw_data:
        return jsonify({'error': '原始数据不存在'}), 404
    
    if raw_data.file_category != 'video':
        return jsonify({'error': '只能对视频数据进行字幕标注'}), 400
    
    try:
        # 调用AI服务生成标注
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        result = loop.run_until_complete(
            ai_annotation_service.generate_video_transcript(
                raw_data=raw_data,
                language=language
            )
        )
        
        return jsonify({
            'message': 'AI视频字幕标注生成成功',
            'annotation_data': result,
            'suggested_annotation': {
                'raw_data_id': raw_data_id,
                'project_id': raw_data.data_source_id,
                'transcript_segments': result['transcript_segments'],
                'annotation_source': 'ai_generated',
                'language': result['language'],
                'metadata': result['metadata']
            }
        })
        
    except Exception as e:
        return jsonify({'error': f'AI标注生成失败: {str(e)}'}), 500


@api_v1.route('/annotations/ai-assist/object-detection', methods=['POST'])
@swag_from({
    'tags': ['AI辅助标注'],
    'summary': 'AI辅助进行图片对象检测',
    'parameters': [{
        'name': 'body',
        'in': 'body',
        'required': True,
        'schema': {
            'type': 'object',
            'properties': {
                'raw_data_id': {'type': 'integer', 'description': '原始数据ID'}
            },
            'required': ['raw_data_id']
        }
    }],
    'responses': {
        200: {'description': 'AI对象检测成功'},
        400: {'description': '请求参数错误'},
        404: {'description': '原始数据不存在'}
    }
})
def ai_detect_objects():
    """AI辅助进行图片对象检测"""
    data = request.get_json()
    
    raw_data_id = data.get('raw_data_id')
    
    # 验证原始数据是否存在
    raw_data = RawData.query.get(raw_data_id)
    if not raw_data:
        return jsonify({'error': '原始数据不存在'}), 404
    
    if raw_data.file_category != 'image':
        return jsonify({'error': '只能对图片数据进行对象检测'}), 400
    
    try:
        # 调用AI服务进行对象检测
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        result = loop.run_until_complete(
            ai_annotation_service.detect_objects_in_image(raw_data=raw_data)
        )
        
        return jsonify({
            'message': 'AI对象检测完成',
            'detection_data': result
        })
        
    except Exception as e:
        return jsonify({'error': f'AI对象检测失败: {str(e)}'}), 500


@api_v1.route('/annotations/validate-data-id', methods=['POST'])
@swag_from({
    'tags': ['AI辅助标注'],
    'summary': '验证数据ID是否存在',
    'parameters': [{
        'name': 'body',
        'in': 'body',
        'required': True,
        'schema': {
            'type': 'object',
            'properties': {
                'raw_data_id': {'type': 'string', 'description': '原始数据ID（支持数字或UUID）'}
            },
            'required': ['raw_data_id']
        }
    }],
    'responses': {
        200: {'description': '数据ID验证结果'},
        400: {'description': '请求参数错误'}
    }
})
def validate_data_id():
    """验证数据ID是否存在并返回相关信息"""
    data = request.get_json()
    raw_data_id = data.get('raw_data_id')
    
    if not raw_data_id:
        return jsonify({'error': '数据ID不能为空'}), 400
    
    result = {
        'exists': False,
        'data_type': None,
        'data_info': None,
        'suggestions': []
    }
    
    try:
        # 尝试多种方式查找数据
        raw_data = None
        
        # 1. 数字ID查找
        if isinstance(raw_data_id, str) and raw_data_id.isdigit():
            raw_data = RawData.query.get(int(raw_data_id))
            if raw_data:
                result['data_type'] = 'raw_data_integer'
                result['exists'] = True
                result['data_info'] = {
                    'id': raw_data.id,
                    'filename': raw_data.filename,
                    'file_category': raw_data.file_category,
                    'file_type': raw_data.file_type.value
                }
        
        # 2. UUID查找 - 先尝试RawData
        elif isinstance(raw_data_id, str) and len(raw_data_id) == 36:
            try:
                raw_data = RawData.query.filter_by(id=raw_data_id).first()
                if raw_data:
                    result['data_type'] = 'raw_data_uuid'
                    result['exists'] = True
                    result['data_info'] = {
                        'id': raw_data.id,
                        'filename': raw_data.filename,
                        'file_category': raw_data.file_category,
                        'file_type': raw_data.file_type.value
                    }
            except:
                pass
            
            # 3. UUID查找 - 尝试GovernedData
            if not raw_data:
                from app.models import GovernedData
                governed_data = GovernedData.query.get(raw_data_id)
                if governed_data:
                    result['data_type'] = 'governed_data'
                    result['data_info'] = {
                        'id': governed_data.id,
                        'name': governed_data.name,
                        'raw_data_id': governed_data.raw_data_id
                    }
                    
                    if governed_data.raw_data_id:
                        raw_data = RawData.query.get(governed_data.raw_data_id)
                        if raw_data:
                            result['exists'] = True
                            result['data_info']['raw_data'] = {
                                'id': raw_data.id,
                                'filename': raw_data.filename,
                                'file_category': raw_data.file_category,
                                'file_type': raw_data.file_type.value
                            }
                        else:
                            result['suggestions'].append(f'GovernedData存在但关联的RawData(ID:{governed_data.raw_data_id})不存在')
                    else:
                        result['suggestions'].append('GovernedData存在但没有关联的raw_data_id')
        
        # 4. 模糊查找
        if not result['exists']:
            # 按文件名查找
            similar_files = RawData.query.filter(
                RawData.filename.contains(str(raw_data_id)[:8])
            ).limit(5).all()
            
            if similar_files:
                result['suggestions'].append('找到相似的文件:')
                for file in similar_files:
                    result['suggestions'].append(f'ID:{file.id}, 文件名:{file.filename}')
        
        if not result['exists'] and not result['suggestions']:
            result['suggestions'] = [
                '数据不存在，可能的原因:',
                '1. 文件已被删除',
                '2. 传递的ID不正确',
                '3. 数据库中没有该记录'
            ]
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({
            'error': f'验证失败: {str(e)}',
            'raw_data_id': raw_data_id
        }), 500