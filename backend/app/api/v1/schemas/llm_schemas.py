from marshmallow import Schema, fields, validate, validates_schema, ValidationError

class LLMConfigCreateSchema(Schema):
    """创建LLM配置的验证模式"""
    name = fields.String(required=True, validate=validate.Length(min=1, max=255))
    provider = fields.String(required=True, validate=validate.OneOf(['openai', 'claude', 'gemini', 'custom']))
    model_name = fields.String(required=True, validate=validate.Length(min=1, max=255))
    api_key = fields.String(required=True, validate=validate.Length(min=1))
    base_url = fields.String(validate=validate.Length(max=500), allow_none=True)
    temperature = fields.Float(validate=validate.Range(min=0, max=2), missing=0.7)
    max_tokens = fields.Integer(validate=validate.Range(min=1), missing=4096)
    supports_vision = fields.Boolean(missing=False)
    supports_reasoning = fields.Boolean(missing=False)
    reasoning_extraction_method = fields.String(
        validate=validate.OneOf(['tag_based', 'json_field']),
        allow_none=True
    )
    reasoning_extraction_config = fields.Dict(allow_none=True)
    is_active = fields.Boolean(missing=True)
    custom_headers = fields.Dict(allow_none=True)
    provider_config = fields.Dict(allow_none=True)

    @validates_schema
    def validate_reasoning_config(self, data, **kwargs):
        if data.get('supports_reasoning'):
            if not data.get('reasoning_extraction_method'):
                raise ValidationError(
                    '当模型支持思考过程时，必须提供思考过程的提取方法。',
                    'reasoning_extraction_method'
                )
            if not data.get('reasoning_extraction_config'):
                raise ValidationError(
                    '当模型支持思考过程时，必须提供思考过程的提取配置。',
                    'reasoning_extraction_config'
                )

class LLMConfigUpdateSchema(Schema):
    """更新LLM配置的验证模式"""
    name = fields.String(validate=validate.Length(min=1, max=255))
    provider = fields.String(validate=validate.OneOf(['openai', 'claude', 'gemini', 'custom']))
    model_name = fields.String(validate=validate.Length(min=1, max=255))
    api_key = fields.String(validate=validate.Length(min=1))
    base_url = fields.String(validate=validate.Length(max=500), allow_none=True)
    temperature = fields.Float(validate=validate.Range(min=0, max=2))
    max_tokens = fields.Integer(validate=validate.Range(min=1))
    supports_vision = fields.Boolean()
    supports_reasoning = fields.Boolean()
    reasoning_extraction_method = fields.String(
        validate=validate.OneOf(['tag_based', 'json_field']),
        allow_none=True
    )
    reasoning_extraction_config = fields.Dict(allow_none=True)
    is_active = fields.Boolean()
    custom_headers = fields.Dict(allow_none=True)
    provider_config = fields.Dict(allow_none=True)

class LLMConfigQuerySchema(Schema):
    """查询LLM配置的验证模式"""
    page = fields.Integer(validate=validate.Range(min=1), missing=1)
    per_page = fields.Integer(validate=validate.Range(min=1, max=100), missing=20)
    provider = fields.String(validate=validate.OneOf(['openai', 'claude', 'gemini', 'custom']), allow_none=True)
    is_active = fields.Boolean(allow_none=True)
    supports_vision = fields.Boolean(allow_none=True)
    supports_reasoning = fields.Boolean(allow_none=True)
    search = fields.String(allow_none=True)

class SystemLogQuerySchema(Schema):
    """查询系统日志的验证模式"""
    page = fields.Integer(validate=validate.Range(min=1), missing=1)
    per_page = fields.Integer(validate=validate.Range(min=1, max=100), missing=20)
    level = fields.String(validate=validate.OneOf(['debug', 'info', 'warn', 'error']), allow_none=True)
    source = fields.String(allow_none=True)
    search = fields.String(allow_none=True)
    start_date = fields.DateTime(allow_none=True)
    end_date = fields.DateTime(allow_none=True)
    request_id = fields.String(allow_none=True)

class SetDefaultConfigSchema(Schema):
    """设置默认配置的验证模式"""
    config_id = fields.String(required=True) 