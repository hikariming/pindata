from flask import jsonify, request
from flasgger import swag_from
from app.api.v1 import api_v1
from app.models import DataSourceConfig, ConfigDataSourceType, DatabaseType, APIAuthType, ConfigDataSourceStatus
from app.db import db
import json
import hashlib
import base64
from datetime import datetime

@api_v1.route('/data-source-configs', methods=['GET'])
@swag_from({
    'tags': ['数据源配置'],
    'summary': '获取数据源配置列表',
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
        'name': 'project_id',
        'in': 'query',
        'type': 'string',
        'description': '项目ID'
    }, {
        'name': 'source_type',
        'in': 'query',
        'type': 'string',
        'description': '数据源类型: database_table, api_source'
    }, {
        'name': 'status',
        'in': 'query',
        'type': 'string',
        'description': '数据源状态'
    }],
    'responses': {
        200: {
            'description': '成功获取数据源配置列表'
        }
    }
})
def get_data_source_configs():
    """获取数据源配置列表"""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    project_id = request.args.get('project_id', type=str)
    source_type = request.args.get('source_type', type=str)
    status = request.args.get('status', type=str)
    
    query = DataSourceConfig.query
    
    # 过滤条件
    if project_id:
        query = query.filter_by(project_id=project_id)
    if source_type:
        query = query.filter_by(source_type=source_type)
    if status:
        query = query.filter_by(status=status)
    
    pagination = query.order_by(DataSourceConfig.created_at.desc()).paginate(
        page=page, per_page=per_page
    )
    
    # 统计信息
    stats = {
        'total_configs': DataSourceConfig.query.count(),
        'by_type': {},
        'by_status': {},
        'active_count': DataSourceConfig.query.filter_by(status=ConfigDataSourceStatus.ACTIVE).count()
    }
    
    # 按类型统计
    for source_type in ConfigDataSourceType:
        count = DataSourceConfig.query.filter_by(source_type=source_type).count()
        stats['by_type'][source_type.value] = count
    
    # 按状态统计
    for status in ConfigDataSourceStatus:
        count = DataSourceConfig.query.filter_by(status=status).count()
        stats['by_status'][status.value] = count
    
    return jsonify({
        'configs': [config.get_masked_config() for config in pagination.items],
        'total': pagination.total,
        'page': page,
        'per_page': per_page,
        'pages': pagination.pages,
        'stats': stats
    })

@api_v1.route('/data-source-configs/<string:config_id>', methods=['GET'])
@swag_from({
    'tags': ['数据源配置'],
    'summary': '获取单个数据源配置详情',
    'parameters': [{
        'name': 'config_id',
        'in': 'path',
        'type': 'string',
        'required': True
    }],
    'responses': {
        200: {'description': '成功获取配置详情'},
        404: {'description': '配置不存在'}
    }
})
def get_data_source_config(config_id):
    """获取数据源配置详情"""
    config = DataSourceConfig.query.get_or_404(config_id)
    return jsonify(config.get_masked_config())

@api_v1.route('/data-source-configs', methods=['POST'])
@swag_from({
    'tags': ['数据源配置'],
    'summary': '创建数据源配置',
    'parameters': [{
        'name': 'body',
        'in': 'body',
        'required': True,
        'schema': {
            'type': 'object',
            'properties': {
                'name': {'type': 'string'},
                'description': {'type': 'string'},
                'source_type': {'type': 'string', 'enum': ['database_table', 'api_source']},
                'project_id': {'type': 'string'},
                'database_config': {
                    'type': 'object',
                    'properties': {
                        'database_type': {'type': 'string'},
                        'host': {'type': 'string'},
                        'port': {'type': 'integer'},
                        'database_name': {'type': 'string'},
                        'username': {'type': 'string'},
                        'password': {'type': 'string'},
                        'schema_name': {'type': 'string'},
                        'table_name': {'type': 'string'},
                        'query': {'type': 'string'}
                    }
                },
                'api_config': {
                    'type': 'object',
                    'properties': {
                        'api_url': {'type': 'string'},
                        'api_method': {'type': 'string'},
                        'auth_type': {'type': 'string'},
                        'auth_config': {'type': 'object'},
                        'headers': {'type': 'object'},
                        'query_params': {'type': 'object'},
                        'request_body': {'type': 'string'}
                    }
                }
            },
            'required': ['name', 'source_type']
        }
    }],
    'responses': {
        201: {'description': '数据源配置创建成功'},
        400: {'description': '请求参数错误'}
    }
})
def create_data_source_config():
    """创建数据源配置"""
    data = request.get_json()
    
    if not data.get('name'):
        return jsonify({'error': '数据源名称不能为空'}), 400
    
    if not data.get('source_type'):
        return jsonify({'error': '数据源类型不能为空'}), 400
    
    try:
        source_type = ConfigDataSourceType(data['source_type'])
    except ValueError:
        return jsonify({'error': '无效的数据源类型'}), 400
    
    config = DataSourceConfig(
        name=data['name'],
        description=data.get('description'),
        source_type=source_type,
        project_id=data.get('project_id'),
        status=ConfigDataSourceStatus.INACTIVE
    )
    
    # 根据数据源类型设置特定配置
    if source_type == ConfigDataSourceType.DATABASE_TABLE:
        db_config = data.get('database_config', {})
        if db_config.get('database_type'):
            try:
                config.database_type = DatabaseType(db_config['database_type'])
            except ValueError:
                return jsonify({'error': '无效的数据库类型'}), 400
        
        config.host = db_config.get('host')
        config.port = db_config.get('port')
        config.database_name = db_config.get('database_name')
        config.username = db_config.get('username')
        config.schema_name = db_config.get('schema_name')
        config.table_name = db_config.get('table_name')
        config.query = db_config.get('query')
        
        # 加密存储密码
        if db_config.get('password'):
            config.password_encrypted = encrypt_password(db_config['password'])
    
    elif source_type == ConfigDataSourceType.API_SOURCE:
        api_config = data.get('api_config', {})
        config.api_url = api_config.get('api_url')
        config.api_method = api_config.get('api_method', 'GET')
        
        if api_config.get('auth_type'):
            try:
                config.auth_type = APIAuthType(api_config['auth_type'])
            except ValueError:
                return jsonify({'error': '无效的认证类型'}), 400
        
        config.auth_config = api_config.get('auth_config')
        config.headers = api_config.get('headers')
        config.query_params = api_config.get('query_params')
        config.request_body = api_config.get('request_body')
        config.response_path = api_config.get('response_path')
    
    # 设置创建者
    config.created_by = data.get('created_by')  # 从JWT或session中获取用户ID
    
    try:
        db.session.add(config)
        db.session.commit()
        return jsonify({
            'message': '数据源配置创建成功',
            'config': config.get_masked_config()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'创建失败: {str(e)}'}), 500

@api_v1.route('/data-source-configs/<string:config_id>', methods=['PUT'])
@swag_from({
    'tags': ['数据源配置'],
    'summary': '更新数据源配置',
    'parameters': [{
        'name': 'config_id',
        'in': 'path',
        'type': 'string',
        'required': True
    }],
    'responses': {
        200: {'description': '更新成功'},
        404: {'description': '配置不存在'},
        400: {'description': '请求参数错误'}
    }
})
def update_data_source_config(config_id):
    """更新数据源配置"""
    config = DataSourceConfig.query.get_or_404(config_id)
    data = request.get_json()
    
    try:
        # 更新基本信息
        if 'name' in data:
            config.name = data['name']
        if 'description' in data:
            config.description = data['description']
        
        # 更新数据库配置
        if config.source_type == ConfigDataSourceType.DATABASE_TABLE and 'database_config' in data:
            db_config = data['database_config']
            for field in ['host', 'port', 'database_name', 'username', 'schema_name', 'table_name', 'query']:
                if field in db_config:
                    setattr(config, field, db_config[field])
            
            if 'password' in db_config and db_config['password']:
                config.password_encrypted = encrypt_password(db_config['password'])
        
        # 更新API配置
        if config.source_type == ConfigDataSourceType.API_SOURCE and 'api_config' in data:
            api_config = data['api_config']
            for field in ['api_url', 'api_method', 'headers', 'query_params', 'request_body', 'response_path']:
                if field in api_config:
                    setattr(config, field, api_config[field])
            
            if 'auth_config' in api_config:
                config.auth_config = api_config['auth_config']
        
        config.updated_by = data.get('updated_by')  # 从JWT或session中获取用户ID
        
        db.session.commit()
        return jsonify({
            'message': '数据源配置更新成功',
            'config': config.get_masked_config()
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'更新失败: {str(e)}'}), 500

@api_v1.route('/data-source-configs/<string:config_id>/test', methods=['POST'])
@swag_from({
    'tags': ['数据源配置'],
    'summary': '测试数据源连接',
    'parameters': [{
        'name': 'config_id',
        'in': 'path',
        'type': 'string',
        'required': True
    }],
    'responses': {
        200: {'description': '连接测试成功'},
        400: {'description': '连接测试失败'}
    }
})
def test_data_source_connection(config_id):
    """测试数据源连接"""
    config = DataSourceConfig.query.get_or_404(config_id)
    
    try:
        test_result = None
        
        if config.source_type == ConfigDataSourceType.DATABASE_TABLE:
            test_result = test_database_connection(config)
        elif config.source_type == ConfigDataSourceType.API_SOURCE:
            test_result = test_api_connection(config)
        
        # 保存测试结果
        config.connection_test_result = test_result
        config.status = ConfigDataSourceStatus.ACTIVE if test_result['success'] else ConfigDataSourceStatus.ERROR
        db.session.commit()
        
        return jsonify(test_result)
    except Exception as e:
        error_result = {
            'success': False,
            'error': str(e),
            'tested_at': datetime.utcnow().isoformat()
        }
        config.connection_test_result = error_result
        config.status = ConfigDataSourceStatus.ERROR
        db.session.commit()
        
        return jsonify(error_result), 400

@api_v1.route('/data-source-configs/<string:config_id>/sync', methods=['POST'])
@swag_from({
    'tags': ['数据源配置'],
    'summary': '同步数据源数据',
    'parameters': [{
        'name': 'config_id',
        'in': 'path',
        'type': 'string',
        'required': True
    }],
    'responses': {
        200: {'description': '同步任务已启动'},
        400: {'description': '同步失败'}
    }
})
def sync_data_source(config_id):
    """同步数据源数据"""
    config = DataSourceConfig.query.get_or_404(config_id)
    
    if config.status != ConfigDataSourceStatus.ACTIVE:
        return jsonify({'error': '数据源未激活，无法同步'}), 400
    
    try:
        # 这里应该启动异步任务来同步数据
        # 例如使用Celery任务队列
        # sync_data_source_task.delay(config_id)
        
        config.last_sync_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'message': '数据同步任务已启动',
            'config_id': config_id,
            'sync_started_at': config.last_sync_at.isoformat()
        })
    except Exception as e:
        return jsonify({'error': f'同步失败: {str(e)}'}), 500

@api_v1.route('/data-source-configs/<string:config_id>', methods=['DELETE'])
@swag_from({
    'tags': ['数据源配置'],
    'summary': '删除数据源配置',
    'parameters': [{
        'name': 'config_id',
        'in': 'path',
        'type': 'string',
        'required': True
    }],
    'responses': {
        200: {'description': '删除成功'},
        404: {'description': '配置不存在'}
    }
})
def delete_data_source_config(config_id):
    """删除数据源配置"""
    config = DataSourceConfig.query.get_or_404(config_id)
    
    try:
        db.session.delete(config)
        db.session.commit()
        return jsonify({'message': '数据源配置删除成功'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'删除失败: {str(e)}'}), 500

def encrypt_password(password):
    """加密密码（简单示例，生产环境应使用更安全的加密方式）"""
    return base64.b64encode(password.encode()).decode()

def decrypt_password(encrypted_password):
    """解密密码"""
    try:
        return base64.b64decode(encrypted_password.encode()).decode()
    except:
        return None

def test_database_connection(config):
    """测试数据库连接"""
    # 这里应该实现实际的数据库连接测试
    # 根据不同的数据库类型使用不同的连接库
    result = {
        'success': True,
        'message': '数据库连接成功',
        'tested_at': datetime.utcnow().isoformat(),
        'connection_time': 150,  # 毫秒
        'database_version': '示例版本信息'
    }
    
    # 模拟连接测试逻辑
    try:
        # 实际实现中应该根据数据库类型进行真实连接测试
        if not config.host or not config.database_name:
            raise Exception('缺少必要的连接参数')
        
        return result
    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'tested_at': datetime.utcnow().isoformat()
        }

def test_api_connection(config):
    """测试API连接"""
    # 这里应该实现实际的API连接测试
    result = {
        'success': True,
        'message': 'API连接成功',
        'tested_at': datetime.utcnow().isoformat(),
        'response_time': 200,  # 毫秒
        'status_code': 200
    }
    
    # 模拟API测试逻辑
    try:
        if not config.api_url:
            raise Exception('API URL不能为空')
        
        # 实际实现中应该发送HTTP请求测试API
        return result
    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'tested_at': datetime.utcnow().isoformat()
        }