from marshmallow import Schema, fields, validate, validates_schema, ValidationError

class ConversionConfigSchema(Schema):
    """转换配置验证模式"""
    method = fields.String(required=True, validate=validate.OneOf(['markitdown', 'vision_llm']))
    llmConfigId = fields.String(allow_none=True)
    customPrompt = fields.String(allow_none=True)
    enableOCR = fields.Boolean(missing=True)
    preserveFormatting = fields.Boolean(missing=True)
    extractTables = fields.Boolean(missing=True)
    extractImages = fields.Boolean(missing=False)
    pageProcessing = fields.Dict(allow_none=True)
    
    @validates_schema
    def validate_llm_config(self, data, **kwargs):
        """验证LLM配置"""
        if data.get('method') == 'vision_llm' and not data.get('llmConfigId'):
            raise ValidationError('使用AI智能转换时必须选择LLM配置', 'llmConfigId')

class ConversionJobCreateSchema(Schema):
    """创建转换任务的验证模式"""
    file_ids = fields.List(fields.String(), required=True, validate=validate.Length(min=1))
    conversion_config = fields.Nested(ConversionConfigSchema, required=True)

class ConversionJobQuerySchema(Schema):
    """查询转换任务的验证模式"""
    page = fields.Integer(validate=validate.Range(min=1), missing=1)
    per_page = fields.Integer(validate=validate.Range(min=1, max=100), missing=20)
    library_id = fields.String(allow_none=True)
    status = fields.String(validate=validate.OneOf(['pending', 'processing', 'completed', 'failed', 'cancelled']), allow_none=True) 