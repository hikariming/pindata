from flask import jsonify, request
from flasgger import swag_from
from app.api.v1 import api_v1
from app.models import RawData
from app.db import db

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
    }],
    'responses': {
        200: {
            'description': '成功获取原始数据列表'
        }
    }
})
def get_raw_data():
    """获取原始数据列表"""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    dataset_id = request.args.get('dataset_id', type=int)
    
    query = RawData.query
    if dataset_id:
        query = query.filter_by(dataset_id=dataset_id)
    
    pagination = query.order_by(RawData.upload_at.desc()).paginate(page=page, per_page=per_page)
    
    return jsonify({
        'raw_data': [data.to_dict() for data in pagination.items],
        'total': pagination.total,
        'page': page,
        'per_page': per_page,
        'pages': pagination.pages
    })

@api_v1.route('/raw-data/<int:data_id>', methods=['GET'])
@swag_from({
    'tags': ['原始数据'],
    'summary': '获取原始数据详情',
    'parameters': [{
        'name': 'data_id',
        'in': 'path',
        'type': 'integer',
        'required': True
    }],
    'responses': {
        200: {
            'description': '成功获取原始数据详情'
        },
        404: {
            'description': '原始数据不存在'
        }
    }
})
def get_raw_data_detail(data_id):
    """获取原始数据详情"""
    data = RawData.query.get_or_404(data_id)
    return jsonify(data.to_dict()) 