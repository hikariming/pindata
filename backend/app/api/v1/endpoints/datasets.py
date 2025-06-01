from flask import jsonify, request
from flasgger import swag_from
from app.api.v1 import api_v1
from app.models import Dataset, DatasetVersion
from app.db import db

@api_v1.route('/datasets', methods=['GET'])
@swag_from({
    'tags': ['数据集'],
    'summary': '获取数据集列表',
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
    }],
    'responses': {
        200: {
            'description': '成功获取数据集列表'
        }
    }
})
def get_datasets():
    """获取数据集列表"""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    
    pagination = Dataset.query.paginate(page=page, per_page=per_page)
    
    return jsonify({
        'datasets': [dataset.to_dict() for dataset in pagination.items],
        'total': pagination.total,
        'page': page,
        'per_page': per_page,
        'pages': pagination.pages
    })

@api_v1.route('/datasets', methods=['POST'])
@swag_from({
    'tags': ['数据集'],
    'summary': '创建新数据集',
    'parameters': [{
        'name': 'body',
        'in': 'body',
        'required': True,
        'schema': {
            'type': 'object',
            'properties': {
                'name': {'type': 'string'},
                'description': {'type': 'string'}
            },
            'required': ['name']
        }
    }],
    'responses': {
        201: {
            'description': '数据集创建成功'
        }
    }
})
def create_dataset():
    """创建新数据集"""
    data = request.get_json()
    
    # 验证数据
    if not data or 'name' not in data:
        return jsonify({'error': '缺少必要的字段：name'}), 400
    
    # 检查名称是否已存在
    if Dataset.query.filter_by(name=data['name']).first():
        return jsonify({'error': '数据集名称已存在'}), 400
    
    # 创建数据集
    dataset = Dataset(
        name=data['name'],
        description=data.get('description', '')
    )
    
    # 创建初始版本
    initial_version = DatasetVersion(
        version='v1.0',
        dataset=dataset,
        pipeline_config={},
        stats={}
    )
    
    db.session.add(dataset)
    db.session.add(initial_version)
    db.session.commit()
    
    return jsonify(dataset.to_dict()), 201

@api_v1.route('/datasets/<int:dataset_id>', methods=['GET'])
@swag_from({
    'tags': ['数据集'],
    'summary': '获取数据集详情',
    'parameters': [{
        'name': 'dataset_id',
        'in': 'path',
        'type': 'integer',
        'required': True
    }],
    'responses': {
        200: {
            'description': '成功获取数据集详情'
        },
        404: {
            'description': '数据集不存在'
        }
    }
})
def get_dataset(dataset_id):
    """获取数据集详情"""
    dataset = Dataset.query.get_or_404(dataset_id)
    return jsonify(dataset.to_dict())

@api_v1.route('/datasets/<int:dataset_id>', methods=['DELETE'])
@swag_from({
    'tags': ['数据集'],
    'summary': '删除数据集',
    'parameters': [{
        'name': 'dataset_id',
        'in': 'path',
        'type': 'integer',
        'required': True
    }],
    'responses': {
        204: {
            'description': '数据集删除成功'
        },
        404: {
            'description': '数据集不存在'
        }
    }
})
def delete_dataset(dataset_id):
    """删除数据集"""
    dataset = Dataset.query.get_or_404(dataset_id)
    db.session.delete(dataset)
    db.session.commit()
    return '', 204 