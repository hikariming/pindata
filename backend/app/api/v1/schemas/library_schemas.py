from marshmallow import Schema, fields, validate, validates_schema, ValidationError
import re

def validate_library_name(name):
    """验证文件库名称"""
    if len(name) < 3:
        raise ValidationError('名称长度不能少于3个字符')
    if len(name) > 63:
        raise ValidationError('名称长度不能超过63个字符')
    
    # 允许中文、英文、数字、下划线和连字符，但不能以连字符开头或结尾
    if not re.match(r'^[a-zA-Z0-9\u4e00-\u9fa5][a-zA-Z0-9\u4e00-\u9fa5_-]*[a-zA-Z0-9\u4e00-\u9fa5]$', name):
        raise ValidationError('名称只能包含中文、英文、数字、下划线和连字符，且不能以连字符开头或结尾')

class LibraryCreateSchema(Schema):
    """创建文件库的验证模式"""
    name = fields.Str(required=True, validate=[validate.Length(min=1, max=255), validate_library_name])
    description = fields.Str(missing=None, validate=validate.Length(max=1000))
    data_type = fields.Str(
        required=True, 
        validate=validate.OneOf(['training', 'evaluation', 'mixed'])
    )
    tags = fields.List(fields.Str(), missing=[])

class LibraryUpdateSchema(Schema):
    """更新文件库的验证模式"""
    name = fields.Str(validate=validate.Length(min=1, max=255))
    description = fields.Str(validate=validate.Length(max=1000), allow_none=True)
    data_type = fields.Str(validate=validate.OneOf(['training', 'evaluation', 'mixed']))
    tags = fields.List(fields.Str())

class LibraryQuerySchema(Schema):
    """文件库查询参数验证模式"""
    page = fields.Int(missing=1, validate=validate.Range(min=1))
    per_page = fields.Int(missing=20, validate=validate.Range(min=1, max=100))
    name = fields.Str(missing=None)
    data_type = fields.Str(missing=None, validate=validate.OneOf(['training', 'evaluation', 'mixed']))
    tags = fields.List(fields.Str(), missing=[])
    sort_by = fields.Str(missing='created_at', validate=validate.OneOf([
        'created_at', 'updated_at', 'name', 'file_count', 'total_size'
    ]))
    sort_order = fields.Str(missing='desc', validate=validate.OneOf(['asc', 'desc']))

class LibraryFileUploadSchema(Schema):
    """文件上传验证模式"""
    files = fields.List(fields.Raw(), required=True)

class LibraryFileQuerySchema(Schema):
    """文件查询参数验证模式"""
    page = fields.Int(missing=1, validate=validate.Range(min=1))
    per_page = fields.Int(missing=20, validate=validate.Range(min=1, max=100))
    filename = fields.Str(missing=None)
    file_type = fields.Str(missing=None)
    process_status = fields.Str(missing=None, validate=validate.OneOf([
        'pending', 'processing', 'completed', 'failed'
    ]))
    sort_by = fields.Str(missing='uploaded_at', validate=validate.OneOf([
        'uploaded_at', 'filename', 'file_size', 'process_status'
    ]))
    sort_order = fields.Str(missing='desc', validate=validate.OneOf(['asc', 'desc']))

class LibraryStatisticsSchema(Schema):
    """统计信息返回模式"""
    total_libraries = fields.Int()
    total_files = fields.Int()
    total_processed = fields.Int()
    total_size = fields.Str()
    conversion_rate = fields.Float() 