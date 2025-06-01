from flask import jsonify, request
from flasgger import swag_from
from app.api.v1 import api_v1
from app.models import Plugin
from app.db import db

@api_v1.route('/plugins', methods=['GET'])
@swag_from({
    'tags': ['插件'],
    'summary': '获取插件列表',
    'parameters': [{
        'name': 'type',
        'in': 'query',
        'type': 'string',
        'enum': ['parser', 'cleaner', 'distiller']
    }, {
        'name': 'enabled',
        'in': 'query',
        'type': 'boolean'
    }],
    'responses': {
        200: {
            'description': '成功获取插件列表'
        }
    }
})
def get_plugins():
    """获取插件列表"""
    plugin_type = request.args.get('type')
    enabled = request.args.get('enabled', type=bool)
    
    query = Plugin.query
    if plugin_type:
        query = query.filter_by(type=plugin_type)
    if enabled is not None:
        query = query.filter_by(is_enabled=enabled)
    
    plugins = query.all()
    
    return jsonify({
        'plugins': [plugin.to_dict() for plugin in plugins],
        'total': len(plugins)
    })

@api_v1.route('/plugins/<int:plugin_id>', methods=['GET'])
@swag_from({
    'tags': ['插件'],
    'summary': '获取插件详情',
    'parameters': [{
        'name': 'plugin_id',
        'in': 'path',
        'type': 'integer',
        'required': True
    }],
    'responses': {
        200: {
            'description': '成功获取插件详情'
        },
        404: {
            'description': '插件不存在'
        }
    }
})
def get_plugin(plugin_id):
    """获取插件详情"""
    plugin = Plugin.query.get_or_404(plugin_id)
    return jsonify(plugin.to_dict()) 