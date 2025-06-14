from flask import jsonify, request
from flasgger import swag_from
from app.api.v1 import api_v1
from app.models.image_annotation import ImageAnnotation, AnnotationHistory, AnnotationTemplate, ImageAnnotationType, AnnotationSource
from app.db import db
from datetime import datetime
import uuid


@api_v1.route('/image-annotations', methods=['GET'])
@swag_from({
    'tags': ['图片标注'],
    'summary': '获取图片标注列表',
    'parameters': [
        {'name': 'file_id', 'in': 'query', 'type': 'string', 'description': '文件ID'},
        {'name': 'type', 'in': 'query', 'type': 'string', 'description': '标注类型'},
        {'name': 'source', 'in': 'query', 'type': 'string', 'description': '标注来源'},
        {'name': 'category', 'in': 'query', 'type': 'string', 'description': '标注类别'},
        {'name': 'review_status', 'in': 'query', 'type': 'string', 'description': '审核状态'},
        {'name': 'page', 'in': 'query', 'type': 'integer', 'default': 1},
        {'name': 'per_page', 'in': 'query', 'type': 'integer', 'default': 20}
    ],
    'responses': {200: {'description': '成功获取标注列表'}}
})
def get_image_annotations():
    """获取图片标注列表"""
    file_id = request.args.get('file_id')
    annotation_type = request.args.get('type')
    source = request.args.get('source')
    category = request.args.get('category')
    review_status = request.args.get('review_status')
    page = int(request.args.get('page', 1))
    per_page = min(int(request.args.get('per_page', 20)), 100)
    
    query = ImageAnnotation.query
    
    if file_id:
        query = query.filter_by(file_id=file_id)
    if annotation_type:
        query = query.filter_by(type=annotation_type)
    if source:
        query = query.filter_by(source=source)
    if category:
        query = query.filter_by(category=category)
    if review_status:
        query = query.filter_by(review_status=review_status)
    
    pagination = query.order_by(ImageAnnotation.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    return jsonify({
        'annotations': [annotation.to_dict() for annotation in pagination.items],
        'pagination': {
            'page': page,
            'per_page': per_page,
            'total': pagination.total,
            'pages': pagination.pages,
            'has_next': pagination.has_next,
            'has_prev': pagination.has_prev
        }
    })


@api_v1.route('/image-annotations', methods=['POST'])
@swag_from({
    'tags': ['图片标注'],
    'summary': '创建图片标注',
    'parameters': [{
        'name': 'body',
        'in': 'body',
        'required': True,
        'schema': {
            'type': 'object',
            'properties': {
                'file_id': {'type': 'string', 'description': '文件ID'},
                'type': {'type': 'string', 'enum': ['qa', 'caption', 'classification', 'object_detection', 'segmentation', 'keypoint', 'ocr', 'custom']},
                'source': {'type': 'string', 'enum': ['human', 'ai', 'detection', 'imported']},
                'content': {'type': 'object', 'description': '标注内容'},
                'region': {'type': 'object', 'description': '区域信息'},
                'coordinates': {'type': 'object', 'description': '坐标信息'},
                'confidence': {'type': 'number', 'description': '置信度'},
                'category': {'type': 'string', 'description': '类别'},
                'tags': {'type': 'array', 'items': {'type': 'string'}},
                'metadata': {'type': 'object'}
            },
            'required': ['file_id', 'type', 'source', 'content']
        }
    }],
    'responses': {
        201: {'description': '标注创建成功'},
        400: {'description': '请求参数错误'}
    }
})
def create_image_annotation():
    """创建图片标注"""
    data = request.get_json()
    
    try:
        annotation = ImageAnnotation(
            file_id=data['file_id'],
            type=ImageAnnotationType(data['type']),
            source=AnnotationSource(data['source']),
            content=data['content'],
            region=data.get('region'),
            coordinates=data.get('coordinates'),
            confidence=data.get('confidence', 0.0),
            category=data.get('category'),
            tags=data.get('tags', []),
            metadata=data.get('metadata', {}),
            created_by=data.get('created_by')
        )
        
        db.session.add(annotation)
        db.session.commit()
        
        # 记录历史
        history = AnnotationHistory(
            annotation_id=annotation.id,
            action='create',
            changes={'created': annotation.to_dict()},
            created_by=data.get('created_by', 'system')
        )
        db.session.add(history)
        db.session.commit()
        
        return jsonify({
            'message': '标注创建成功',
            'annotation': annotation.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'创建标注失败: {str(e)}'}), 400


@api_v1.route('/image-annotations/<annotation_id>', methods=['GET'])
@swag_from({
    'tags': ['图片标注'],
    'summary': '获取标注详情',
    'parameters': [{'name': 'annotation_id', 'in': 'path', 'type': 'string', 'required': True}],
    'responses': {
        200: {'description': '成功获取标注详情'},
        404: {'description': '标注不存在'}
    }
})
def get_image_annotation(annotation_id):
    """获取标注详情"""
    annotation = ImageAnnotation.query.get_or_404(annotation_id)
    return jsonify(annotation.to_dict())


@api_v1.route('/image-annotations/<annotation_id>', methods=['PUT'])
@swag_from({
    'tags': ['图片标注'],
    'summary': '更新图片标注',
    'parameters': [
        {'name': 'annotation_id', 'in': 'path', 'type': 'string', 'required': True},
        {
            'name': 'body',
            'in': 'body',
            'required': True,
            'schema': {
                'type': 'object',
                'properties': {
                    'content': {'type': 'object'},
                    'region': {'type': 'object'},
                    'coordinates': {'type': 'object'},
                    'confidence': {'type': 'number'},
                    'category': {'type': 'string'},
                    'tags': {'type': 'array', 'items': {'type': 'string'}},
                    'metadata': {'type': 'object'},
                    'updated_by': {'type': 'string'}
                }
            }
        }
    ],
    'responses': {
        200: {'description': '标注更新成功'},
        404: {'description': '标注不存在'}
    }
})
def update_image_annotation(annotation_id):
    """更新图片标注"""
    annotation = ImageAnnotation.query.get_or_404(annotation_id)
    data = request.get_json()
    
    # 记录更新前的状态
    old_data = annotation.to_dict()
    
    try:
        annotation.update_from_dict(data)
        db.session.commit()
        
        # 记录历史
        history = AnnotationHistory(
            annotation_id=annotation.id,
            action='update',
            changes={
                'before': old_data,
                'after': annotation.to_dict(),
                'fields_changed': list(data.keys())
            },
            created_by=data.get('updated_by', 'system')
        )
        db.session.add(history)
        db.session.commit()
        
        return jsonify({
            'message': '标注更新成功',
            'annotation': annotation.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'更新标注失败: {str(e)}'}), 400


@api_v1.route('/image-annotations/<annotation_id>', methods=['DELETE'])
@swag_from({
    'tags': ['图片标注'],
    'summary': '删除图片标注',
    'parameters': [{'name': 'annotation_id', 'in': 'path', 'type': 'string', 'required': True}],
    'responses': {
        200: {'description': '标注删除成功'},
        404: {'description': '标注不存在'}
    }
})
def delete_image_annotation(annotation_id):
    """删除图片标注"""
    annotation = ImageAnnotation.query.get_or_404(annotation_id)
    
    try:
        # 记录删除历史
        history = AnnotationHistory(
            annotation_id=annotation.id,
            action='delete',
            changes={'deleted': annotation.to_dict()},
            created_by=request.json.get('deleted_by', 'system') if request.json else 'system'
        )
        db.session.add(history)
        
        db.session.delete(annotation)
        db.session.commit()
        
        return jsonify({'message': '标注删除成功'})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'删除标注失败: {str(e)}'}), 400


@api_v1.route('/image-annotations/batch', methods=['POST'])
@swag_from({
    'tags': ['图片标注'],
    'summary': '批量创建标注',
    'parameters': [{
        'name': 'body',
        'in': 'body',
        'required': True,
        'schema': {
            'type': 'object',
            'properties': {
                'annotations': {
                    'type': 'array',
                    'items': {
                        'type': 'object',
                        'properties': {
                            'file_id': {'type': 'string'},
                            'type': {'type': 'string'},
                            'source': {'type': 'string'},
                            'content': {'type': 'object'}
                        }
                    }
                }
            }
        }
    }],
    'responses': {
        201: {'description': '批量创建成功'},
        400: {'description': '请求参数错误'}
    }
})
def create_batch_annotations():
    """批量创建标注"""
    data = request.get_json()
    annotations_data = data.get('annotations', [])
    
    if not annotations_data:
        return jsonify({'error': '标注数据不能为空'}), 400
    
    created_annotations = []
    failed_annotations = []
    
    for i, annotation_data in enumerate(annotations_data):
        try:
            annotation = ImageAnnotation(
                file_id=annotation_data['file_id'],
                type=ImageAnnotationType(annotation_data['type']),
                source=AnnotationSource(annotation_data['source']),
                content=annotation_data['content'],
                region=annotation_data.get('region'),
                coordinates=annotation_data.get('coordinates'),
                confidence=annotation_data.get('confidence', 0.0),
                category=annotation_data.get('category'),
                tags=annotation_data.get('tags', []),
                metadata=annotation_data.get('metadata', {}),
                created_by=annotation_data.get('created_by')
            )
            
            db.session.add(annotation)
            created_annotations.append(annotation)
            
        except Exception as e:
            failed_annotations.append({
                'index': i,
                'error': str(e),
                'data': annotation_data
            })
    
    try:
        db.session.commit()
        
        return jsonify({
            'message': f'批量创建完成，成功: {len(created_annotations)}, 失败: {len(failed_annotations)}',
            'created': [ann.to_dict() for ann in created_annotations],
            'failed': failed_annotations
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'批量创建失败: {str(e)}'}), 400


@api_v1.route('/image-annotations/<annotation_id>/review', methods=['POST'])
@swag_from({
    'tags': ['图片标注'],
    'summary': '审核标注',
    'parameters': [
        {'name': 'annotation_id', 'in': 'path', 'type': 'string', 'required': True},
        {
            'name': 'body',
            'in': 'body',
            'required': True,
            'schema': {
                'type': 'object',
                'properties': {
                    'review_status': {'type': 'string', 'enum': ['approved', 'rejected']},
                    'review_comments': {'type': 'string'},
                    'reviewer_id': {'type': 'string'}
                },
                'required': ['review_status', 'reviewer_id']
            }
        }
    ],
    'responses': {
        200: {'description': '审核完成'},
        404: {'description': '标注不存在'}
    }
})
def review_annotation(annotation_id):
    """审核标注"""
    annotation = ImageAnnotation.query.get_or_404(annotation_id)
    data = request.get_json()
    
    old_status = annotation.review_status
    
    annotation.review_status = data['review_status']
    annotation.review_comments = data.get('review_comments')
    annotation.reviewer_id = data['reviewer_id']
    annotation.reviewed_at = datetime.utcnow()
    annotation.updated_at = datetime.utcnow()
    
    # 如果审核通过，设置为已验证
    if data['review_status'] == 'approved':
        annotation.is_verified = True
    
    try:
        db.session.commit()
        
        # 记录审核历史
        history = AnnotationHistory(
            annotation_id=annotation.id,
            action='review',
            changes={
                'review_status': {'from': old_status, 'to': data['review_status']},
                'review_comments': data.get('review_comments'),
                'reviewer_id': data['reviewer_id']
            },
            created_by=data['reviewer_id']
        )
        db.session.add(history)
        db.session.commit()
        
        return jsonify({
            'message': '审核完成',
            'annotation': annotation.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'审核失败: {str(e)}'}), 400


@api_v1.route('/files/<file_id>/annotations/stats', methods=['GET'])
@swag_from({
    'tags': ['图片标注'],
    'summary': '获取文件标注统计',
    'parameters': [{'name': 'file_id', 'in': 'path', 'type': 'string', 'required': True}],
    'responses': {200: {'description': '成功获取统计信息'}}
})
def get_file_annotation_stats(file_id):
    """获取文件标注统计"""
    annotations = ImageAnnotation.query.filter_by(file_id=file_id).all()
    
    if not annotations:
        return jsonify({
            'total_annotations': 0,
            'by_type': {},
            'by_source': {},
            'avg_confidence': 0,
            'completion_rate': 0
        })
    
    # 按类型统计
    by_type = {}
    for ann in annotations:
        type_name = ann.type.value
        by_type[type_name] = by_type.get(type_name, 0) + 1
    
    # 按来源统计
    by_source = {}
    for ann in annotations:
        source_name = ann.source.value
        by_source[source_name] = by_source.get(source_name, 0) + 1
    
    # 计算平均置信度
    confidences = [ann.confidence for ann in annotations if ann.confidence > 0]
    avg_confidence = sum(confidences) / len(confidences) if confidences else 0
    
    # 计算完成率（已审核通过的比例）
    approved_count = len([ann for ann in annotations if ann.review_status == 'approved'])
    completion_rate = (approved_count / len(annotations)) * 100 if annotations else 0
    
    return jsonify({
        'total_annotations': len(annotations),
        'by_type': by_type,
        'by_source': by_source,
        'avg_confidence': round(avg_confidence, 3),
        'completion_rate': round(completion_rate, 2)
    })


@api_v1.route('/image-annotations/export', methods=['POST'])
@swag_from({
    'tags': ['图片标注'],
    'summary': '导出标注数据',
    'parameters': [{
        'name': 'body',
        'in': 'body',
        'required': True,
        'schema': {
            'type': 'object',
            'properties': {
                'file_ids': {'type': 'array', 'items': {'type': 'string'}},
                'format': {'type': 'string', 'enum': ['coco', 'yolo', 'pascal_voc', 'labelme', 'json', 'csv']},
                'filter': {
                    'type': 'object',
                    'properties': {
                        'type': {'type': 'string'},
                        'source': {'type': 'string'},
                        'review_status': {'type': 'string'}
                    }
                }
            },
            'required': ['format']
        }
    }],
    'responses': {200: {'description': '导出成功'}}
})
def export_annotations():
    """导出标注数据"""
    data = request.get_json()
    export_format = data['format']
    file_ids = data.get('file_ids', [])
    filters = data.get('filter', {})
    
    query = ImageAnnotation.query
    
    if file_ids:
        query = query.filter(ImageAnnotation.file_id.in_(file_ids))
    
    if filters.get('type'):
        query = query.filter_by(type=filters['type'])
    if filters.get('source'):
        query = query.filter_by(source=filters['source'])
    if filters.get('review_status'):
        query = query.filter_by(review_status=filters['review_status'])
    
    annotations = query.all()
    
    if export_format == 'json':
        export_data = [ann.to_dict() for ann in annotations]
    elif export_format == 'coco':
        export_data = _convert_to_coco_format(annotations)
    elif export_format == 'yolo':
        export_data = _convert_to_yolo_format(annotations)
    # 其他格式的转换函数...
    else:
        export_data = [ann.to_dict() for ann in annotations]
    
    return jsonify({
        'message': '导出成功',
        'format': export_format,
        'count': len(annotations),
        'data': export_data
    })


def _convert_to_coco_format(annotations):
    """转换为COCO格式"""
    coco_data = {
        "images": [],
        "annotations": [],
        "categories": []
    }
    
    for i, ann in enumerate(annotations):
        if ann.type == ImageAnnotationType.OBJECT_DETECTION:
            coco_annotation = {
                "id": i,
                "image_id": ann.file_id,
                "category_id": 1,
                "bbox": [
                    ann.region.get('x', 0) if ann.region else 0,
                    ann.region.get('y', 0) if ann.region else 0,
                    ann.region.get('width', 0) if ann.region else 0,
                    ann.region.get('height', 0) if ann.region else 0
                ],
                "area": (ann.region.get('width', 0) * ann.region.get('height', 0)) if ann.region else 0,
                "iscrowd": 0
            }
            coco_data["annotations"].append(coco_annotation)
    
    return coco_data


def _convert_to_yolo_format(annotations):
    """转换为YOLO格式"""
    yolo_data = []
    
    for ann in annotations:
        if ann.type == ImageAnnotationType.OBJECT_DETECTION and ann.region:
            x = ann.region.get('x', 0)
            y = ann.region.get('y', 0)
            w = ann.region.get('width', 0)
            h = ann.region.get('height', 0)
            
            center_x = x + w / 2
            center_y = y + h / 2
            
            yolo_line = f"0 {center_x} {center_y} {w} {h}"
            yolo_data.append({
                "file_id": ann.file_id,
                "annotation": yolo_line
            })
    
    return yolo_data 