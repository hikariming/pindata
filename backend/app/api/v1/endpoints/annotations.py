from flask import jsonify, request
from flasgger import swag_from
from app.api.v1 import api_v1
from app.models import GovernedData, RawData, AnnotationType, AnnotationSource
from app.db import db
from app.services.ai_annotation_service import ai_annotation_service
from datetime import datetime
import uuid
import asyncio


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
    'summary': 'AI辅助生成图片问答标注',
    'parameters': [{
        'name': 'body',
        'in': 'body',
        'required': True,
        'schema': {
            'type': 'object',
            'properties': {
                'raw_data_id': {'type': 'integer', 'description': '原始数据ID'},
                'questions': {
                    'type': 'array',
                    'items': {'type': 'string'},
                    'description': '问题列表，如果为空则生成默认问题'
                },
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
        200: {'description': 'AI标注生成成功'},
        400: {'description': '请求参数错误'},
        404: {'description': '原始数据不存在'}
    }
})
def ai_generate_image_qa():
    """AI辅助生成图片问答标注"""
    data = request.get_json()
    
    raw_data_id = data.get('raw_data_id')
    questions = data.get('questions', [])
    model_provider = data.get('model_provider', 'openai')
    
    # 验证原始数据是否存在
    raw_data = RawData.query.get(raw_data_id)
    if not raw_data:
        return jsonify({'error': '原始数据不存在'}), 404
    
    if raw_data.file_category != 'image':
        return jsonify({'error': '只能对图片数据进行问答标注'}), 400
    
    try:
        # 调用AI服务生成标注
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        result = loop.run_until_complete(
            ai_annotation_service.generate_image_qa(
                raw_data=raw_data,
                questions=questions if questions else None,
                model_provider=model_provider
            )
        )
        
        return jsonify({
            'message': 'AI图片问答标注生成成功',
            'annotation_data': result,
            'suggested_annotation': {
                'raw_data_id': raw_data_id,
                'project_id': raw_data.data_source_id,  # 使用数据源ID作为项目ID
                'questions_answers': result['qa_pairs'],
                'annotation_source': 'ai_generated',
                'metadata': result['metadata']
            }
        })
        
    except Exception as e:
        return jsonify({'error': f'AI标注生成失败: {str(e)}'}), 500


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