from marshmallow import Schema, fields, validate, validates_schema, ValidationError
import re

def validate_library_name(name):
    """验证文件库名称"""
    if not name or not name.strip():
        raise ValidationError('文件库名称不能为空')
    if len(name.strip()) > 255:
        raise ValidationError('文件库名称不能超过255个字符')
    return name.strip()

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

class LibraryFileUpdateSchema(Schema):
    """文件更新验证模式"""
    filename = fields.Str(validate=validate.Length(min=1, max=255))
    original_filename = fields.Str(validate=validate.Length(min=1, max=255))

class LibraryStatisticsSchema(Schema):
    """统计信息返回模式"""
    total_libraries = fields.Int()
    total_files = fields.Int()
    total_processed = fields.Int()
    total_size = fields.Str()
    conversion_rate = fields.Float() 