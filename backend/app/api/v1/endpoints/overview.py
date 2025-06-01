from flask import jsonify
from flasgger import swag_from
from app.api.v1 import api_v1
from app.models import Dataset, Task, Plugin, RawData
from app.db import db

@api_v1.route('/overview/stats', methods=['GET'])
@swag_from({
    'tags': ['概览'],
    'summary': '获取系统统计信息',
    'responses': {
        200: {
            'description': '成功获取统计信息'
        }
    }
})
def get_stats():
    """获取系统统计信息"""
    dataset_count = db.session.query(Dataset).count()
    task_count = db.session.query(Task).count()
    plugin_count = db.session.query(Plugin).count()
    raw_data_count = db.session.query(RawData).count()
    
    return jsonify({
        'datasets': {
            'total': dataset_count
        },
        'tasks': {
            'total': task_count
        },
        'plugins': {
            'total': plugin_count
        },
        'raw_data': {
            'total': raw_data_count
        }
    })

@api_v1.route('/health', methods=['GET'])
@swag_from({
    'tags': ['系统'],
    'summary': '健康检查',
    'responses': {
        200: {
            'description': '系统正常运行'
        }
    }
})
def health_check():
    """健康检查端点"""
    return jsonify({
        'status': 'healthy',
        'service': 'LLaMA-DataSet API'
    }) 