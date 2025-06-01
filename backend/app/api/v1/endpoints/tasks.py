from flask import jsonify, request
from flasgger import swag_from
from app.api.v1 import api_v1
from app.models import Task
from app.db import db

@api_v1.route('/tasks', methods=['GET'])
@swag_from({
    'tags': ['任务'],
    'summary': '获取任务列表',
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
        'name': 'status',
        'in': 'query',
        'type': 'string',
        'enum': ['pending', 'running', 'completed', 'failed', 'cancelled']
    }],
    'responses': {
        200: {
            'description': '成功获取任务列表'
        }
    }
})
def get_tasks():
    """获取任务列表"""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    status = request.args.get('status')
    
    query = Task.query
    if status:
        query = query.filter_by(status=status)
    
    pagination = query.order_by(Task.created_at.desc()).paginate(page=page, per_page=per_page)
    
    return jsonify({
        'tasks': [task.to_dict() for task in pagination.items],
        'total': pagination.total,
        'page': page,
        'per_page': per_page,
        'pages': pagination.pages
    })

@api_v1.route('/tasks/<int:task_id>', methods=['GET'])
@swag_from({
    'tags': ['任务'],
    'summary': '获取任务详情',
    'parameters': [{
        'name': 'task_id',
        'in': 'path',
        'type': 'integer',
        'required': True
    }],
    'responses': {
        200: {
            'description': '成功获取任务详情'
        },
        404: {
            'description': '任务不存在'
        }
    }
})
def get_task(task_id):
    """获取任务详情"""
    task = Task.query.get_or_404(task_id)
    return jsonify(task.to_dict()) 