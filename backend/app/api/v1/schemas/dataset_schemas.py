from marshmallow import Schema, fields, validate, post_load
from marshmallow_sqlalchemy import SQLAlchemyAutoSchema
from app.models.dataset import Dataset, DatasetVersion, DatasetTag


class DatasetTagSchema(Schema):
    """数据集标签Schema"""
    name = fields.Str(required=True, validate=validate.Length(min=1, max=50))


class DatasetCreateSchema(Schema):
    """创建数据集Schema"""
    name = fields.Str(required=True, validate=validate.Length(min=1, max=255))
    owner = fields.Str(required=True, validate=validate.Length(min=1, max=255))
    description = fields.Str(allow_none=True)
    license = fields.Str(validate=validate.Length(max=100))
    task_type = fields.Str(validate=validate.Length(max=100))
    language = fields.Str(validate=validate.Length(max=50))
    featured = fields.Bool(missing=False)
    tags = fields.List(fields.Str(validate=validate.Length(min=1, max=50)), missing=[])


class DatasetUpdateSchema(Schema):
    """更新数据集Schema"""
    name = fields.Str(validate=validate.Length(min=1, max=255))
    description = fields.Str(allow_none=True)  
    license = fields.Str(validate=validate.Length(max=100))
    task_type = fields.Str(validate=validate.Length(max=100))
    language = fields.Str(validate=validate.Length(max=50))
    featured = fields.Bool()
    tags = fields.List(fields.Str(validate=validate.Length(min=1, max=50)))


class DatasetVersionCreateSchema(Schema):
    """创建数据集版本Schema"""
    version = fields.Str(required=True, validate=validate.Length(min=1, max=50))
    parent_version_id = fields.Int(allow_none=True)
    pipeline_config = fields.Dict(missing=dict)
    stats = fields.Dict(missing=dict)
    file_path = fields.Str(validate=validate.Length(max=500))


class DatasetQuerySchema(Schema):
    """数据集查询Schema"""
    page = fields.Int(missing=1, validate=validate.Range(min=1))
    per_page = fields.Int(missing=20, validate=validate.Range(min=1, max=100))
    search = fields.Str(validate=validate.Length(max=255))
    sort_by = fields.Str(
        missing='trending',
        validate=validate.OneOf(['trending', 'newest', 'downloads', 'likes', 'updated'])
    )
    filter_by = fields.Str(
        missing='all',
        validate=validate.OneOf(['all', 'my-datasets', 'liked'])
    )
    task_type = fields.Str(validate=validate.Length(max=100))
    featured = fields.Bool()
    language = fields.Str(validate=validate.Length(max=50))


class DatasetResponseSchema(SQLAlchemyAutoSchema):
    """数据集响应Schema"""
    class Meta:
        model = Dataset
        load_instance = True
        
    tags = fields.List(fields.Str())
    versions = fields.Int()
    taskType = fields.Str(attribute='task_type')
    lastUpdated = fields.Str()
    created = fields.Str()


class DatasetDetailResponseSchema(DatasetResponseSchema):
    """数据集详情响应Schema"""
    version_list = fields.List(fields.Dict())
    created_at = fields.DateTime()
    updated_at = fields.DateTime()


class DatasetVersionResponseSchema(SQLAlchemyAutoSchema):
    """数据集版本响应Schema"""
    class Meta:
        model = DatasetVersion
        load_instance = True 