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

class DatasetVersionWithExistingFilesSchema(Schema):
    """使用现有文件创建数据集版本的请求模式"""
    version = fields.Str(required=True, validate=validate.Length(min=1, max=50))
    commit_message = fields.Str(required=True, validate=validate.Length(min=1, max=500))
    author = fields.Str(required=True, validate=validate.Length(min=1, max=255))
    version_type = fields.Str(missing='minor', validate=validate.OneOf(['major', 'minor', 'patch']))
    parent_version_id = fields.Str(allow_none=True)
    existing_file_ids = fields.List(fields.Str(), missing=list)
    pipeline_config = fields.Dict(missing=dict)
    metadata = fields.Dict(missing=dict)

@api_v1.route('/datasets/<int:dataset_id>/versions/enhanced', methods=['GET'])
@swag_from({
    'tags': ['增强数据集'],
    'summary': '获取数据集版本列表（增强版本）',
    'parameters': [
        {
            'name': 'dataset_id',
            'in': 'path',
            'type': 'integer',
            'required': True,
            'description': '数据集ID'
        }
    ],
    'responses': {
        200: {'description': '成功获取版本列表'},
        404: {'description': '数据集不存在'}
    }
})
def get_enhanced_dataset_versions(dataset_id):
    """获取数据集的增强版本列表"""
    try:
        versions = EnhancedDatasetVersion.query.filter_by(dataset_id=dataset_id).order_by(
            EnhancedDatasetVersion.created_at.desc()
        ).all()
        
        return success_response(
            data=[version.to_dict() for version in versions],
            message='获取版本列表成功'
        )
        
    except Exception as e:
        logger.error(f"获取增强版本列表失败: {str(e)}")
        return error_response('获取版本列表失败'), 500

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

@api_v1.route('/dataset-versions/<string:version_id>/files', methods=['POST'])
@swag_from({
    'tags': ['增强数据集'],
    'summary': '向现有版本添加多个文件',
    'parameters': [
        {
            'name': 'version_id',
            'in': 'path',
            'type': 'string',
            'required': True,
            'description': '版本ID'
        }
    ],
    'consumes': ['multipart/form-data'],
    'responses': {
        200: {'description': '文件添加成功'},
        400: {'description': '参数错误'},
        404: {'description': '版本不存在'}
    }
})
def add_files_to_version(version_id):
    """向现有版本添加多个文件"""
    try:
        # 获取上传的文件
        files = request.files.getlist('files')
        
        if not files or not any(f.filename for f in files):
            return error_response('没有选择文件'), 400
        
        # 添加文件到版本
        result = EnhancedDatasetService.add_files_to_version(version_id, files)
        
        return success_response(
            data=result,
            message=f'成功添加 {len(files)} 个文件到版本'
        )
        
    except ValueError as e:
        return error_response(str(e)), 400
    except Exception as e:
        logger.error(f"添加文件到版本失败: {str(e)}")
        return error_response('添加文件失败'), 500

@api_v1.route('/dataset-versions/<string:version_id>/files/<string:file_id>', methods=['DELETE'])
@swag_from({
    'tags': ['增强数据集'],
    'summary': '删除版本中的文件',
    'parameters': [
        {
            'name': 'version_id',
            'in': 'path',
            'type': 'string',
            'required': True,
            'description': '版本ID'
        },
        {
            'name': 'file_id',
            'in': 'path',
            'type': 'string',
            'required': True,
            'description': '文件ID'
        }
    ],
    'responses': {
        200: {'description': '文件删除成功'},
        404: {'description': '文件不存在'}
    }
})
def delete_file_from_version(version_id, file_id):
    """删除版本中的文件"""
    try:
        result = EnhancedDatasetService.delete_file_from_version(version_id, file_id)
        
        return success_response(
            data=result,
            message='文件删除成功'
        )
        
    except ValueError as e:
        return error_response(str(e)), 400
    except Exception as e:
        logger.error(f"删除文件失败: {str(e)}")
        return error_response('删除文件失败'), 500

@api_v1.route('/dataset-versions/<string:version_id>/files', methods=['GET'])
@swag_from({
    'tags': ['增强数据集'],
    'summary': '获取版本中的所有文件列表',
    'parameters': [
        {
            'name': 'version_id',
            'in': 'path',
            'type': 'string',
            'required': True,
            'description': '版本ID'
        },
        {
            'name': 'file_type',
            'in': 'query',
            'type': 'string',
            'description': '文件类型过滤'
        },
        {
            'name': 'page',
            'in': 'query',
            'type': 'integer',
            'default': 1,
            'description': '页码'
        },
        {
            'name': 'page_size',
            'in': 'query',
            'type': 'integer',
            'default': 20,
            'description': '每页大小'
        }
    ],
    'responses': {
        200: {'description': '获取文件列表成功'},
        404: {'description': '版本不存在'}
    }
})
def get_version_files(version_id):
    """获取版本中的所有文件列表"""
    try:
        file_type = request.args.get('file_type')
        page = request.args.get('page', 1, type=int)
        page_size = request.args.get('page_size', 20, type=int)
        
        result = EnhancedDatasetService.get_version_files(
            version_id=version_id,
            file_type=file_type,
            page=page,
            page_size=page_size
        )
        
        return success_response(
            data=result,
            message='获取文件列表成功'
        )
        
    except ValueError as e:
        return error_response(str(e)), 400
    except Exception as e:
        logger.error(f"获取文件列表失败: {str(e)}")
        return error_response('获取文件列表失败'), 500

@api_v1.route('/dataset-files/<string:file_id>/download', methods=['GET'])
@swag_from({
    'tags': ['增强数据集'],
    'summary': '下载单个文件',
    'parameters': [
        {
            'name': 'file_id',
            'in': 'path',
            'type': 'string',
            'required': True,
            'description': '文件ID'
        }
    ],
    'responses': {
        200: {'description': '文件下载成功'},
        404: {'description': '文件不存在'}
    }
})
def download_dataset_file(file_id):
    """下载单个文件"""
    try:
        return EnhancedDatasetService.download_file(file_id)
        
    except ValueError as e:
        return error_response(str(e)), 404
    except Exception as e:
        logger.error(f"下载文件失败: {str(e)}")
        return error_response('下载文件失败'), 500

@api_v1.route('/dataset-versions/<string:version_id>/batch-operations', methods=['POST'])
@swag_from({
    'tags': ['增强数据集'],
    'summary': '批量操作文件（删除、移动等）',
    'parameters': [
        {
            'name': 'version_id',
            'in': 'path',
            'type': 'string',
            'required': True,
            'description': '版本ID'
        },
        {
            'name': 'body',
            'in': 'body',
            'required': True,
            'schema': {
                'type': 'object',
                'properties': {
                    'operation': {'type': 'string', 'enum': ['delete', 'update_metadata'], 'description': '操作类型'},
                    'file_ids': {'type': 'array', 'items': {'type': 'string'}, 'description': '文件ID列表'},
                    'metadata': {'type': 'object', 'description': '元数据（用于更新操作）'}
                },
                'required': ['operation', 'file_ids']
            }
        }
    ],
    'responses': {
        200: {'description': '批量操作成功'},
        400: {'description': '参数错误'}
    }
})
def batch_file_operations(version_id):
    """批量操作文件"""
    try:
        data = request.get_json()
        
        if not data or not data.get('operation') or not data.get('file_ids'):
            return error_response('参数错误'), 400
        
        result = EnhancedDatasetService.batch_file_operations(
            version_id=version_id,
            operation=data['operation'],
            file_ids=data['file_ids'],
            metadata=data.get('metadata')
        )
        
        return success_response(
            data=result,
            message=f'批量{data["operation"]}操作成功'
        )
        
    except ValueError as e:
        return error_response(str(e)), 400
    except Exception as e:
        logger.error(f"批量操作失败: {str(e)}")
        return error_response('批量操作失败'), 500

@api_v1.route('/datasets/<int:dataset_id>/available-files', methods=['GET'])
@swag_from({
    'tags': ['增强数据集'],
    'summary': '获取数据集的可用文件列表（用于创建版本时选择）',
    'parameters': [
        {
            'name': 'dataset_id',
            'in': 'path',
            'type': 'integer',
            'required': True,
            'description': '数据集ID'
        },
        {
            'name': 'exclude_version_id',
            'in': 'query',
            'type': 'string',
            'description': '排除某个版本的文件'
        },
        {
            'name': 'file_type',
            'in': 'query',
            'type': 'string',
            'description': '文件类型过滤'
        },
        {
            'name': 'search',
            'in': 'query',
            'type': 'string',
            'description': '文件名搜索'
        },
        {
            'name': 'page',
            'in': 'query',
            'type': 'integer',
            'default': 1,
            'description': '页码'
        },
        {
            'name': 'page_size',
            'in': 'query',
            'type': 'integer',
            'default': 20,
            'description': '每页大小'
        }
    ],
    'responses': {
        200: {'description': '获取可用文件列表成功'},
        404: {'description': '数据集不存在'}
    }
})
def get_available_files(dataset_id):
    """获取数据集的可用文件列表"""
    try:
        exclude_version_id = request.args.get('exclude_version_id')
        file_type = request.args.get('file_type')
        search = request.args.get('search')
        page = request.args.get('page', 1, type=int)
        page_size = request.args.get('page_size', 20, type=int)
        
        result = EnhancedDatasetService.get_available_files(
            dataset_id=dataset_id,
            exclude_version_id=exclude_version_id,
            file_type=file_type,
            search=search,
            page=page,
            page_size=page_size
        )
        
        return success_response(
            data=result,
            message='获取可用文件列表成功'
        )
        
    except Exception as e:
        logger.error(f"获取可用文件列表失败: {str(e)}")
        return error_response('获取文件列表失败'), 500

@api_v1.route('/datasets/<int:dataset_id>/versions/enhanced-with-existing', methods=['POST'])
@swag_from({
    'tags': ['增强数据集'],
    'summary': '使用现有文件创建数据集版本',
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
                    'existing_file_ids': {'type': 'array', 'items': {'type': 'string'}, 'description': '现有文件ID列表'},
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
def create_version_with_existing_files(dataset_id):
    """使用现有文件创建数据集版本"""
    try:
        # 获取JSON数据
        json_data = request.get_json() or {}
        
        # 获取表单数据（如果有新文件上传）
        form_data = request.form.to_dict()
        
        # 合并数据，JSON优先
        data = {**form_data, **json_data}
        
        # 验证数据
        schema = DatasetVersionWithExistingFilesSchema()
        validated_data = schema.load(data)
        
        # 获取现有文件ID列表
        existing_file_ids = data.get('existing_file_ids', [])
        
        # 获取上传的新文件
        new_files = request.files.getlist('files') if request.files else []
        
        # 创建版本
        version = EnhancedDatasetService.create_version_with_existing_files(
            dataset_id=dataset_id,
            version=validated_data['version'],
            commit_message=validated_data['commit_message'],
            author=validated_data['author'],
            version_type=validated_data['version_type'],
            parent_version_id=validated_data.get('parent_version_id'),
            existing_file_ids=existing_file_ids,
            new_files=new_files if new_files else None,
            pipeline_config=validated_data.get('pipeline_config'),
            metadata=validated_data.get('metadata')
        )
        
        return success_response(
            data=version.to_dict(),
            message=f'数据集版本 {validated_data["version"]} 创建成功'
        ), 201
        
    except ValidationError as err:
        return error_response('参数错误', errors=err.messages), 400
    except ValueError as e:
        return error_response(str(e)), 400
    except Exception as e:
        logger.error(f"创建数据集版本失败: {str(e)}")
        return error_response('创建版本失败'), 500 