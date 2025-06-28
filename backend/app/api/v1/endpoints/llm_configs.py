from flask import Blueprint, request, jsonify
from flask_restful import Api, Resource
from sqlalchemy import or_, and_
from marshmallow import ValidationError
import logging
import time
from datetime import datetime

# 将模型导入移动到函数内部或在需要时导入，以避免循环依赖
# from app.models import LLMConfig, ProviderType, SystemLog, ReasoningExtractionMethod
from app.api.v1.schemas.llm_schemas import (
    LLMConfigCreateSchema, LLMConfigUpdateSchema, 
    LLMConfigQuerySchema, SetDefaultConfigSchema
)
from app.db import db
from app.services.llm_conversion_service import LLMConversionService

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
        from app.models import LLMConfig, ProviderType
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
            
            if args.get('supports_reasoning') is not None:
                query = query.filter(LLMConfig.supports_reasoning == args['supports_reasoning'])

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
            from app.models import SystemLog
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
            from app.models import SystemLog
            SystemLog.log_error(f"获取LLM配置列表失败: {str(e)}", "LLMConfig")
            return {'success': False, 'message': '服务器内部错误'}, 500
    
    def post(self):
        """创建新的LLM配置"""
        from app.models import LLMConfig, ProviderType, SystemLog, ReasoningExtractionMethod
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
                supports_reasoning=data.get('supports_reasoning', False),
                reasoning_extraction_method=ReasoningExtractionMethod(data['reasoning_extraction_method']) if data.get('reasoning_extraction_method') else None,
                reasoning_extraction_config=data.get('reasoning_extraction_config'),
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
        from app.models import LLMConfig
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
        from app.models import LLMConfig, ProviderType, SystemLog, ReasoningExtractionMethod
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
                if field == 'provider' and value:
                    setattr(config, field, ProviderType(value))
                elif field == 'reasoning_extraction_method' and value:
                    setattr(config, field, ReasoningExtractionMethod(value))
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
        from app.models import LLMConfig, SystemLog
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
        from app.models import LLMConfig, SystemLog
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
        from app.models import LLMConfig, SystemLog
        try:
            config = LLMConfig.query.get(config_id)
            if not config:
                return {'success': False, 'message': '配置不存在'}, 404
            
            if not config.is_active:
                return {'success': False, 'message': '配置已禁用，无法测试'}, 400
            
            # 实现实际的连接测试逻辑
            start_time = time.time()
            test_result = self._test_llm_connection(config)
            end_time = time.time()
            
            latency = round((end_time - start_time) * 1000, 2)  # 转换为毫秒
            
            # 记录日志
            SystemLog.log_info(
                f"测试LLM配置连接: {config.name} - 结果: {test_result['status']}",
                "LLMConfig",
                extra_data={
                    'config_id': config.id,
                    'latency': latency,
                    'status': test_result['status'],
                    'model_info': test_result.get('model_info')
                }
            )
            
            return {
                'success': test_result['success'],
                'message': test_result['message'],
                'data': {
                    'latency': latency,
                    'status': test_result['status'],
                    'model_info': test_result.get('model_info'),
                    'test_time': datetime.now().isoformat()
                }
            }, 200 if test_result['success'] else 400
            
        except Exception as e:
            logger.error(f"测试LLM配置连接失败: {str(e)}")
            from app.models import SystemLog
            SystemLog.log_error(f"测试LLM配置连接失败: {str(e)}", "LLMConfig")
            return {'success': False, 'message': f'连接测试失败: {str(e)}'}, 500
    
    def _test_llm_connection(self, config) -> dict:
        """测试LLM连接"""
        from app.models import ProviderType
        try:
            # 获取LLM服务实例
            llm_service = LLMConversionService()
            llm_client = llm_service.get_llm_client(config)
            
            # 准备测试消息
            test_prompt = "请回复'连接测试成功'以确认配置正确。"
            
            if config.provider == ProviderType.OPENAI:
                # OpenAI格式测试
                from langchain.schema import HumanMessage
                messages = [HumanMessage(content=test_prompt)]
                response = llm_client.invoke(messages)
                model_info = {
                    'model': config.model_name,
                    'provider': 'OpenAI',
                    'response_preview': response.content[:100] + '...' if len(response.content) > 100 else response.content
                }
                
            elif config.provider == ProviderType.CLAUDE:
                # Claude格式测试
                from langchain.schema import HumanMessage
                messages = [HumanMessage(content=test_prompt)]
                response = llm_client.invoke(messages)
                model_info = {
                    'model': config.model_name,
                    'provider': 'Claude',
                    'response_preview': response.content[:100] + '...' if len(response.content) > 100 else response.content
                }
                
            elif config.provider == ProviderType.GEMINI:
                # Gemini格式测试
                from langchain.schema import HumanMessage
                messages = [HumanMessage(content=test_prompt)]
                response = llm_client.invoke(messages)
                model_info = {
                    'model': config.model_name,
                    'provider': 'Gemini',
                    'response_preview': response.content[:100] + '...' if len(response.content) > 100 else response.content
                }
            
            elif config.provider == ProviderType.OLLAMA:
                # Ollama格式测试
                from langchain.schema import HumanMessage
                messages = [HumanMessage(content=test_prompt)]
                response = llm_client.invoke(messages)
                model_info = {
                    'model': config.model_name,
                    'provider': 'Ollama',
                    'response_preview': response.content[:100] + '...' if len(response.content) > 100 else response.content
                }
                
            else:
                # 自定义提供商测试
                from langchain.schema import HumanMessage
                messages = [HumanMessage(content=test_prompt)]
                response = llm_client.invoke(messages)
                model_info = {
                    'model': config.model_name,
                    'provider': str(config.provider),
                    'response_preview': response.content[:100] + '...' if len(response.content) > 100 else response.content
                }
            
            return {
                'success': True,
                'status': 'connected',
                'message': '连接测试成功',
                'model_info': model_info
            }
            
        except Exception as e:
            error_msg = str(e)
            
            # 分析具体错误类型
            if 'authentication' in error_msg.lower() or 'api_key' in error_msg.lower():
                status = 'auth_failed'
                message = 'API密钥认证失败'
            elif 'timeout' in error_msg.lower() or 'connection' in error_msg.lower():
                status = 'connection_failed'
                message = '连接超时或网络错误'
            elif 'not found' in error_msg.lower() or '404' in error_msg:
                status = 'model_not_found'
                # 为Ollama配置提供更具体的错误提示
                if config.provider == ProviderType.OLLAMA:
                    if config.base_url and '/v1' in config.base_url:
                        message = f'模型 {config.model_name} 不存在。请确认该模型在OpenAI兼容服务中可用。'
                    else:
                        message = f'模型 {config.model_name} 不存在。请先使用 "ollama pull {config.model_name}" 下载模型。'
                else:
                    message = '模型不存在或无权访问'
            elif 'rate limit' in error_msg.lower() or '429' in error_msg:
                status = 'rate_limited'
                message = '请求频率超限'
            else:
                status = 'unknown_error'
                # 为Ollama配置提供配置建议
                if config.provider == ProviderType.OLLAMA and config.base_url and '/v1' in config.base_url:
                    message = f'连接失败。您的API ({config.base_url}) 看起来是OpenAI兼容格式，建议将Provider类型改为"OpenAI"而不是"Ollama"。错误详情: {error_msg}'
                else:
                    message = f'未知错误: {error_msg}'
            
            return {
                'success': False,
                'status': status,
                'message': message,
                'error_detail': error_msg
            }

# 注册路由
api.add_resource(LLMConfigListResource, '/configs')
api.add_resource(LLMConfigResource, '/configs/<string:config_id>')
api.add_resource(LLMConfigDefaultResource, '/configs/set-default')
api.add_resource(LLMConfigTestResource, '/configs/<string:config_id>/test') 