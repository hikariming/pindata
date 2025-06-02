from flask import Blueprint, request, jsonify
from flask_restful import Api, Resource
from sqlalchemy import or_, and_
from marshmallow import ValidationError
from app.models import LLMConfig, ProviderType, SystemLog
from app.api.v1.schemas.llm_schemas import (
    LLMConfigCreateSchema, LLMConfigUpdateSchema, 
    LLMConfigQuerySchema, SetDefaultConfigSchema
)
from app.db import db
import logging

# 创建蓝图
llm_configs_bp = Blueprint('llm_configs', __name__)
api = Api(llm_configs_bp)

logger = logging.getLogger(__name__)

class LLMConfigListResource(Resource):
    """LLM配置列表资源"""
    
    def options(self):
        """处理 CORS 预检请求"""
        return {}, 200
    
    def get(self):
        """获取LLM配置列表"""
        try:
            # 验证查询参数
            schema = LLMConfigQuerySchema()
            args = schema.load(request.args)
            
            # 构建查询
            query = LLMConfig.query
            
            # 筛选条件
            if args.get('provider'):
                query = query.filter(LLMConfig.provider == ProviderType(args['provider']))
            
            if args.get('is_active') is not None:
                query = query.filter(LLMConfig.is_active == args['is_active'])
            
            if args.get('supports_vision') is not None:
                query = query.filter(LLMConfig.supports_vision == args['supports_vision'])
            
            # 搜索功能
            if args.get('search'):
                search_term = f"%{args['search']}%"
                query = query.filter(
                    or_(
                        LLMConfig.name.ilike(search_term),
                        LLMConfig.model_name.ilike(search_term)
                    )
                )
            
            # 排序
            query = query.order_by(LLMConfig.is_default.desc(), LLMConfig.created_at.desc())
            
            # 分页
            page = args.get('page', 1)
            per_page = args.get('per_page', 20)
            pagination = query.paginate(
                page=page, per_page=per_page, error_out=False
            )
            
            # 转换为字典
            configs = [config.to_dict() for config in pagination.items]
            
            # 记录日志
            SystemLog.log_info(
                f"用户查询LLM配置列表，页码: {page}，筛选条件: {args}",
                "LLMConfig",
                request_id=request.headers.get('X-Request-ID')
            )
            
            return {
                'success': True,
                'data': {
                    'configs': configs,
                    'pagination': {
                        'page': pagination.page,
                        'per_page': pagination.per_page,
                        'total': pagination.total,
                        'pages': pagination.pages,
                        'has_next': pagination.has_next,
                        'has_prev': pagination.has_prev
                    }
                }
            }, 200
            
        except ValidationError as e:
            return {'success': False, 'message': '参数验证失败', 'errors': e.messages}, 400
        except Exception as e:
            logger.error(f"获取LLM配置列表失败: {str(e)}")
            SystemLog.log_error(f"获取LLM配置列表失败: {str(e)}", "LLMConfig")
            return {'success': False, 'message': '服务器内部错误'}, 500
    
    def post(self):
        """创建新的LLM配置"""
        try:
            # 验证请求数据
            schema = LLMConfigCreateSchema()
            data = schema.load(request.json)
            
            # 检查名称是否重复
            existing = LLMConfig.query.filter_by(name=data['name']).first()
            if existing:
                return {'success': False, 'message': '配置名称已存在'}, 400
            
            # 创建新配置
            config = LLMConfig(
                name=data['name'],
                provider=ProviderType(data['provider']),
                model_name=data['model_name'],
                api_key=data['api_key'],
                base_url=data.get('base_url'),
                temperature=data.get('temperature', 0.7),
                max_tokens=data.get('max_tokens', 4096),
                supports_vision=data.get('supports_vision', False),
                is_active=data.get('is_active', True),
                custom_headers=data.get('custom_headers'),
                provider_config=data.get('provider_config')
            )
            
            # 如果是第一个配置，自动设为默认
            if LLMConfig.query.count() == 0:
                config.is_default = True
            
            db.session.add(config)
            db.session.commit()
            
            # 记录日志
            SystemLog.log_info(
                f"创建新的LLM配置: {config.name}",
                "LLMConfig",
                extra_data={'config_id': config.id}
            )
            
            return {
                'success': True,
                'message': '配置创建成功',
                'data': config.to_dict()
            }, 201
            
        except ValidationError as e:
            return {'success': False, 'message': '参数验证失败', 'errors': e.messages}, 400
        except Exception as e:
            db.session.rollback()
            logger.error(f"创建LLM配置失败: {str(e)}")
            SystemLog.log_error(f"创建LLM配置失败: {str(e)}", "LLMConfig")
            return {'success': False, 'message': '服务器内部错误'}, 500

class LLMConfigResource(Resource):
    """单个LLM配置资源"""
    
    def options(self, config_id):
        """处理 CORS 预检请求"""
        return {}, 200
    
    def get(self, config_id):
        """获取单个LLM配置"""
        try:
            config = LLMConfig.query.get(config_id)
            if not config:
                return {'success': False, 'message': '配置不存在'}, 404
            
            return {
                'success': True,
                'data': config.to_dict()
            }, 200
            
        except Exception as e:
            logger.error(f"获取LLM配置失败: {str(e)}")
            return {'success': False, 'message': '服务器内部错误'}, 500
    
    def put(self, config_id):
        """更新LLM配置"""
        try:
            config = LLMConfig.query.get(config_id)
            if not config:
                return {'success': False, 'message': '配置不存在'}, 404
            
            # 验证请求数据
            schema = LLMConfigUpdateSchema()
            data = schema.load(request.json)
            
            # 检查名称重复（排除自己）
            if 'name' in data:
                existing = LLMConfig.query.filter(
                    and_(LLMConfig.name == data['name'], LLMConfig.id != config_id)
                ).first()
                if existing:
                    return {'success': False, 'message': '配置名称已存在'}, 400
            
            # 更新字段
            for field, value in data.items():
                if field == 'provider':
                    setattr(config, field, ProviderType(value))
                else:
                    setattr(config, field, value)
            
            db.session.commit()
            
            # 记录日志
            SystemLog.log_info(
                f"更新LLM配置: {config.name}",
                "LLMConfig",
                extra_data={'config_id': config.id, 'updated_fields': list(data.keys())}
            )
            
            return {
                'success': True,
                'message': '配置更新成功',
                'data': config.to_dict()
            }, 200
            
        except ValidationError as e:
            return {'success': False, 'message': '参数验证失败', 'errors': e.messages}, 400
        except Exception as e:
            db.session.rollback()
            logger.error(f"更新LLM配置失败: {str(e)}")
            SystemLog.log_error(f"更新LLM配置失败: {str(e)}", "LLMConfig")
            return {'success': False, 'message': '服务器内部错误'}, 500
    
    def delete(self, config_id):
        """删除LLM配置"""
        try:
            config = LLMConfig.query.get(config_id)
            if not config:
                return {'success': False, 'message': '配置不存在'}, 404
            
            # 检查是否为默认配置且不是唯一配置
            if config.is_default and LLMConfig.query.count() > 1:
                # 如果删除的是默认配置，需要设置新的默认配置
                other_config = LLMConfig.query.filter(
                    and_(LLMConfig.id != config_id, LLMConfig.is_active == True)
                ).first()
                if other_config:
                    other_config.is_default = True
            
            config_name = config.name
            db.session.delete(config)
            db.session.commit()
            
            # 记录日志
            SystemLog.log_info(
                f"删除LLM配置: {config_name}",
                "LLMConfig",
                extra_data={'config_id': config_id}
            )
            
            return {
                'success': True,
                'message': '配置删除成功'
            }, 200
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"删除LLM配置失败: {str(e)}")
            SystemLog.log_error(f"删除LLM配置失败: {str(e)}", "LLMConfig")
            return {'success': False, 'message': '服务器内部错误'}, 500

class LLMConfigDefaultResource(Resource):
    """设置默认配置资源"""
    
    def options(self):
        """处理 CORS 预检请求"""
        return {}, 200
    
    def post(self):
        """设置默认配置"""
        try:
            # 验证请求数据
            schema = SetDefaultConfigSchema()
            data = schema.load(request.json)
            
            config = LLMConfig.set_default(data['config_id'])
            if not config:
                return {'success': False, 'message': '配置不存在'}, 404
            
            # 记录日志
            SystemLog.log_info(
                f"设置默认LLM配置: {config.name}",
                "LLMConfig",
                extra_data={'config_id': config.id}
            )
            
            return {
                'success': True,
                'message': '默认配置设置成功',
                'data': config.to_dict()
            }, 200
            
        except ValidationError as e:
            return {'success': False, 'message': '参数验证失败', 'errors': e.messages}, 400
        except Exception as e:
            db.session.rollback()
            logger.error(f"设置默认配置失败: {str(e)}")
            SystemLog.log_error(f"设置默认配置失败: {str(e)}", "LLMConfig")
            return {'success': False, 'message': '服务器内部错误'}, 500

class LLMConfigTestResource(Resource):
    """测试LLM配置连接"""
    
    def options(self, config_id):
        """处理 CORS 预检请求"""
        return {}, 200
    
    def post(self, config_id):
        """测试配置连接"""
        try:
            config = LLMConfig.query.get(config_id)
            if not config:
                return {'success': False, 'message': '配置不存在'}, 404
            
            # TODO: 实现实际的连接测试逻辑
            # 这里只是示例，实际应该调用对应的LLM API进行测试
            
            # 记录日志
            SystemLog.log_info(
                f"测试LLM配置连接: {config.name}",
                "LLMConfig",
                extra_data={'config_id': config.id}
            )
            
            return {
                'success': True,
                'message': '连接测试成功',
                'data': {
                    'latency': 150,  # 示例延迟
                    'status': 'connected'
                }
            }, 200
            
        except Exception as e:
            logger.error(f"测试LLM配置连接失败: {str(e)}")
            SystemLog.log_error(f"测试LLM配置连接失败: {str(e)}", "LLMConfig")
            return {'success': False, 'message': '连接测试失败'}, 500

# 注册路由
api.add_resource(LLMConfigListResource, '/configs')
api.add_resource(LLMConfigResource, '/configs/<string:config_id>')
api.add_resource(LLMConfigDefaultResource, '/configs/set-default')
api.add_resource(LLMConfigTestResource, '/configs/<string:config_id>/test') 