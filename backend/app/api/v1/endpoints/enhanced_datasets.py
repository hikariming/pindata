from flask import jsonify, request
from flasgger import swag_from
from marshmallow import ValidationError, Schema, fields, validate
from app.api.v1 import api_v1
from app.services.enhanced_dataset_service import EnhancedDatasetService
from app.models.dataset_version import EnhancedDatasetVersion
from app.utils.response import success_response, error_response
import logging

logger = logging.getLogger(__name__)

class DatasetVersionCreateSchema(Schema):
    """创建数据集版本的请求模式"""
    version = fields.Str(required=True, validate=validate.Length(min=1, max=50))
    commit_message = fields.Str(required=True, validate=validate.Length(min=1, max=500))
    author = fields.Str(required=True, validate=validate.Length(min=1, max=255))
    version_type = fields.Str(missing='minor', validate=validate.OneOf(['major', 'minor', 'patch']))
    parent_version_id = fields.Str(allow_none=True)
    pipeline_config = fields.Dict(missing=dict)
    metadata = fields.Dict(missing=dict)

@api_v1.route('/datasets/<int:dataset_id>/versions/enhanced', methods=['POST'])
@swag_from({
    'tags': ['增强数据集'],
    'summary': '创建数据集版本（类似git commit）',
    'parameters': [
        {
            'name': 'dataset_id',
            'in': 'path',
            'type': 'integer',
            'required': True,
            'description': '数据集ID'
        },
        {
            'name': 'body',
            'in': 'body',
            'required': True,
            'schema': {
                'type': 'object',
                'properties': {
                    'version': {'type': 'string', 'description': '版本号（如 v1.2.3）'},
                    'commit_message': {'type': 'string', 'description': '提交信息'},
                    'author': {'type': 'string', 'description': '作者'},
                    'version_type': {'type': 'string', 'enum': ['major', 'minor', 'patch'], 'description': '版本类型'},
                    'parent_version_id': {'type': 'string', 'description': '父版本ID'},
                    'pipeline_config': {'type': 'object', 'description': '数据处理管道配置'},
                    'metadata': {'type': 'object', 'description': '版本元数据'}
                },
                'required': ['version', 'commit_message', 'author']
            }
        }
    ],
    'consumes': ['multipart/form-data'],
    'responses': {
        201: {'description': '版本创建成功'},
        400: {'description': '参数错误'},
        404: {'description': '数据集不存在'}
    }
})
def create_enhanced_dataset_version(dataset_id):
    """创建数据集版本"""
    try:
        # 获取表单数据
        form_data = request.form.to_dict()
        
        # 验证数据
        schema = DatasetVersionCreateSchema()
        data = schema.load(form_data)
        
        # 获取上传的文件
        files = request.files.getlist('files')
        
        # 创建版本
        version = EnhancedDatasetService.create_dataset_version(
            dataset_id=dataset_id,
            version=data['version'],
            commit_message=data['commit_message'],
            author=data['author'],
            version_type=data['version_type'],
            parent_version_id=data.get('parent_version_id'),
            files=files if files else None,
            pipeline_config=data.get('pipeline_config'),
            metadata=data.get('metadata')
        )
        
        return success_response(
            data=version.to_dict(),
            message=f'数据集版本 {data["version"]} 创建成功'
        ), 201
        
    except ValidationError as err:
        return error_response('参数错误', errors=err.messages), 400
    except ValueError as e:
        return error_response(str(e)), 400
    except Exception as e:
        logger.error(f"创建数据集版本失败: {str(e)}")
        return error_response('创建版本失败'), 500

@api_v1.route('/datasets/<int:dataset_id>/preview', methods=['GET'])
@swag_from({
    'tags': ['增强数据集'],
    'summary': '获取数据集预览',
    'parameters': [
        {
            'name': 'dataset_id',
            'in': 'path',
            'type': 'integer',
            'required': True,
            'description': '数据集ID'
        },
        {
            'name': 'version_id',
            'in': 'query',
            'type': 'string',
            'description': '版本ID（不指定则使用默认版本）'
        },
        {
            'name': 'max_items',
            'in': 'query',
            'type': 'integer',
            'default': 10,
            'description': '最大预览项目数'
        }
    ],
    'responses': {
        200: {'description': '获取预览成功'},
        404: {'description': '数据集不存在'}
    }
})
def get_dataset_preview(dataset_id):
    """获取数据集预览"""
    try:
        version_id = request.args.get('version_id')
        max_items = request.args.get('max_items', 10, type=int)
        
        preview_data = EnhancedDatasetService.get_dataset_preview(
            dataset_id=dataset_id,
            version_id=version_id,
            max_items=max_items
        )
        
        return success_response(
            data=preview_data,
            message='获取数据集预览成功'
        )
        
    except Exception as e:
        logger.error(f"获取数据集预览失败: {str(e)}")
        return error_response('获取预览失败'), 500

@api_v1.route('/dataset-versions/<string:version1_id>/diff/<string:version2_id>', methods=['GET'])
@swag_from({
    'tags': ['增强数据集'],
    'summary': '获取版本差异（类似git diff）',
    'parameters': [
        {
            'name': 'version1_id',
            'in': 'path',
            'type': 'string',
            'required': True,
            'description': '版本1 ID'
        },
        {
            'name': 'version2_id',
            'in': 'path',
            'type': 'string',
            'required': True,
            'description': '版本2 ID'
        }
    ],
    'responses': {
        200: {'description': '获取差异成功'},
        400: {'description': '参数错误'},
        404: {'description': '版本不存在'}
    }
})
def get_version_diff(version1_id, version2_id):
    """获取版本差异"""
    try:
        diff_data = EnhancedDatasetService.get_version_diff(version1_id, version2_id)
        
        return success_response(
            data=diff_data,
            message='获取版本差异成功'
        )
        
    except ValueError as e:
        return error_response(str(e)), 400
    except Exception as e:
        logger.error(f"获取版本差异失败: {str(e)}")
        return error_response('获取差异失败'), 500

@api_v1.route('/dataset-versions/<string:version_id>/set-default', methods=['POST'])
@swag_from({
    'tags': ['增强数据集'],
    'summary': '设置默认版本',
    'parameters': [
        {
            'name': 'version_id',
            'in': 'path',
            'type': 'string',
            'required': True,
            'description': '版本ID'
        }
    ],
    'responses': {
        200: {'description': '设置成功'},
        404: {'description': '版本不存在'}
    }
})
def set_default_version(version_id):
    """设置默认版本"""
    try:
        version = EnhancedDatasetService.set_default_version(version_id)
        
        return success_response(
            data=version.to_dict(),
            message='默认版本设置成功'
        )
        
    except Exception as e:
        logger.error(f"设置默认版本失败: {str(e)}")
        return error_response('设置失败'), 500

@api_v1.route('/dataset-versions/<string:source_version_id>/clone', methods=['POST'])
@swag_from({
    'tags': ['增强数据集'],
    'summary': '克隆版本（类似git branch）',
    'parameters': [
        {
            'name': 'source_version_id',
            'in': 'path',
            'type': 'string',
            'required': True,
            'description': '源版本ID'
        },
        {
            'name': 'body',
            'in': 'body',
            'required': True,
            'schema': {
                'type': 'object',
                'properties': {
                    'new_version': {'type': 'string', 'description': '新版本号'},
                    'commit_message': {'type': 'string', 'description': '提交信息'},
                    'author': {'type': 'string', 'description': '作者'}
                },
                'required': ['new_version', 'commit_message', 'author']
            }
        }
    ],
    'responses': {
        201: {'description': '克隆成功'},
        400: {'description': '参数错误'},
        404: {'description': '源版本不存在'}
    }
})
def clone_version(source_version_id):
    """克隆版本"""
    try:
        data = request.get_json() or {}
        
        # 验证必需字段
        required_fields = ['new_version', 'commit_message', 'author']
        for field in required_fields:
            if not data.get(field):
                return error_response(f'缺少必需字段: {field}'), 400
        
        new_version = EnhancedDatasetService.clone_version(
            source_version_id=source_version_id,
            new_version=data['new_version'],
            commit_message=data['commit_message'],
            author=data['author']
        )
        
        return success_response(
            data=new_version.to_dict(),
            message=f'版本克隆成功: {data["new_version"]}'
        ), 201
        
    except Exception as e:
        logger.error(f"克隆版本失败: {str(e)}")
        return error_response('克隆失败'), 500

@api_v1.route('/dataset-versions/<string:version_id>/details', methods=['GET'])
@swag_from({
    'tags': ['增强数据集'],
    'summary': '获取版本详细信息',
    'parameters': [
        {
            'name': 'version_id',
            'in': 'path',
            'type': 'string',
            'required': True,
            'description': '版本ID'
        }
    ],
    'responses': {
        200: {'description': '获取成功'},
        404: {'description': '版本不存在'}
    }
})
def get_version_details(version_id):
    """获取版本详细信息"""
    try:
        version = EnhancedDatasetVersion.query.get_or_404(version_id)
        
        return success_response(
            data=version.to_dict(),
            message='获取版本详情成功'
        )
        
    except Exception as e:
        logger.error(f"获取版本详情失败: {str(e)}")
        return error_response('获取失败'), 500 