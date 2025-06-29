from flask import jsonify, request
from flasgger import swag_from
from sqlalchemy import desc, asc, or_, func
from marshmallow import ValidationError
import logging
from app.api.v1 import api_v1
from app.models.dataset import Dataset, DatasetVersion, DatasetTag, DatasetLike, DatasetDownload
from app.api.v1.schemas.dataset_schemas import (
    DatasetCreateSchema, DatasetUpdateSchema, DatasetQuerySchema,
    DatasetVersionCreateSchema, DatasetResponseSchema, DatasetDetailResponseSchema
)
from app.db import db

logger = logging.getLogger(__name__)


@api_v1.route('/datasets', methods=['GET'])
@swag_from({
    'tags': ['数据集'],
    'summary': '获取数据集列表',
    'parameters': [
        {'name': 'page', 'in': 'query', 'type': 'integer', 'default': 1, 'description': '页码'},
        {'name': 'per_page', 'in': 'query', 'type': 'integer', 'default': 20, 'description': '每页数量'},
        {'name': 'search', 'in': 'query', 'type': 'string', 'description': '搜索关键词'},
        {'name': 'sort_by', 'in': 'query', 'type': 'string', 'enum': ['trending', 'newest', 'downloads', 'likes', 'updated'], 'default': 'trending', 'description': '排序方式'},
        {'name': 'filter_by', 'in': 'query', 'type': 'string', 'enum': ['all', 'my-datasets', 'liked'], 'default': 'all', 'description': '筛选方式'},
        {'name': 'task_type', 'in': 'query', 'type': 'string', 'description': '任务类型'},
        {'name': 'featured', 'in': 'query', 'type': 'boolean', 'description': '是否推荐'},
        {'name': 'language', 'in': 'query', 'type': 'string', 'description': '语言'}
    ],
    'responses': {
        200: {'description': '成功获取数据集列表'},
        400: {'description': '参数错误'}
    }
})
def get_datasets():
    """获取数据集列表，支持搜索、排序和筛选"""
    try:
        # 验证查询参数
        schema = DatasetQuerySchema()
        query_params = schema.load(request.args.to_dict())
    except ValidationError as err:
        return jsonify({'error': '参数错误', 'details': err.messages}), 400
    
    # 构建查询
    query = Dataset.query
    
    # 搜索功能
    if query_params.get('search'):
        search_term = f"%{query_params['search']}%"
        query = query.filter(
            or_(
                Dataset.name.ilike(search_term),
                Dataset.description.ilike(search_term),
                Dataset.owner.ilike(search_term)
            )
        )
    
    # 任务类型筛选
    if query_params.get('task_type'):
        query = query.filter(Dataset.task_type == query_params['task_type'])
    
    # 推荐筛选
    if query_params.get('featured') is not None:
        query = query.filter(Dataset.featured == query_params['featured'])
    
    # 语言筛选
    if query_params.get('language'):
        query = query.filter(Dataset.language == query_params['language'])
    
    # 排序
    sort_by = query_params.get('sort_by', 'trending')
    if sort_by == 'newest':
        query = query.order_by(desc(Dataset.created_at))
    elif sort_by == 'downloads':
        query = query.order_by(desc(Dataset.downloads))
    elif sort_by == 'likes':
        query = query.order_by(desc(Dataset.likes))
    elif sort_by == 'updated':
        query = query.order_by(desc(Dataset.updated_at))
    else:  # trending: 综合排序
        query = query.order_by(
            desc(Dataset.featured),
            desc(Dataset.likes + Dataset.downloads * 0.1),
            desc(Dataset.updated_at)
        )
    
    # 分页
    page = query_params.get('page', 1)
    per_page = query_params.get('per_page', 20)
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    
    # 序列化数据
    datasets_data = [dataset.to_dict() for dataset in pagination.items]
    
    return jsonify({
        'datasets': datasets_data,
        'total': pagination.total,
        'page': page,
        'per_page': per_page,
        'pages': pagination.pages,
        'has_next': pagination.has_next,
        'has_prev': pagination.has_prev
    })


@api_v1.route('/datasets', methods=['POST'])
@swag_from({
    'tags': ['数据集'],
    'summary': '创建新数据集',
    'parameters': [{
        'name': 'body',
        'in': 'body',
        'required': True,
        'schema': {
            'type': 'object',
            'properties': {
                'name': {'type': 'string', 'description': '数据集名称（导入时可选）'},
                'owner': {'type': 'string', 'description': '拥有者（导入时可选）'},
                'description': {'type': 'string', 'description': '描述'},
                'license': {'type': 'string', 'description': '许可证'},
                'task_type': {'type': 'string', 'description': '任务类型'},
                'language': {'type': 'string', 'description': '语言'},
                'featured': {'type': 'boolean', 'description': '是否推荐'},
                'tags': {'type': 'array', 'items': {'type': 'string'}, 'description': '标签列表'},
                'import_method': {'type': 'string', 'enum': ['huggingface', 'modelscope'], 'description': '导入方法'},
                'import_url': {'type': 'string', 'description': '导入URL或路径'}
            }
        }
    }],
    'responses': {
        201: {'description': '数据集创建成功'},
        400: {'description': '参数错误'}
    }
})
def create_dataset():
    """创建新数据集"""
    try:
        from app.services.dataset_service import DatasetService
        
        # 获取请求数据
        data = request.get_json() or {}
        
        # 使用服务层创建数据集
        dataset_service = DatasetService()
        dataset = dataset_service.create_dataset(data)
        
        return jsonify(dataset.to_dict()), 201
        
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': '创建数据集失败', 'details': str(e)}), 500


@api_v1.route('/datasets/<int:dataset_id>', methods=['GET'])
@swag_from({
    'tags': ['数据集'],
    'summary': '获取数据集详情',
    'parameters': [{
        'name': 'dataset_id',
        'in': 'path',
        'type': 'integer',
        'required': True,
        'description': '数据集ID'
    }],
    'responses': {
        200: {'description': '成功获取数据集详情'},
        404: {'description': '数据集不存在'}
    }
})
def get_dataset(dataset_id):
    """获取数据集详情"""
    dataset = Dataset.query.get_or_404(dataset_id)
    return jsonify(dataset.to_detail_dict())


@api_v1.route('/datasets/<int:dataset_id>', methods=['PUT'])
@swag_from({
    'tags': ['数据集'],
    'summary': '更新数据集',
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
                    'name': {'type': 'string'},
                    'description': {'type': 'string'},
                    'license': {'type': 'string'},
                    'task_type': {'type': 'string'},
                    'language': {'type': 'string'},
                    'featured': {'type': 'boolean'},
                    'tags': {'type': 'array', 'items': {'type': 'string'}}
                }
            }
        }
    ],
    'responses': {
        200: {'description': '数据集更新成功'},
        400: {'description': '参数错误'},
        404: {'description': '数据集不存在'}
    }
})
def update_dataset(dataset_id):
    """更新数据集"""
    dataset = Dataset.query.get_or_404(dataset_id)
    
    try:
        schema = DatasetUpdateSchema()
        data = schema.load(request.get_json() or {})
    except ValidationError as err:
        return jsonify({'error': '参数错误', 'details': err.messages}), 400
    
    # 检查名称唯一性（如果更新了名称）
    if 'name' in data and data['name'] != dataset.name:
        existing = Dataset.query.filter_by(name=data['name'], owner=dataset.owner).first()
        if existing:
            return jsonify({'error': '该拥有者下已存在同名数据集'}), 400
    
    # 更新字段
    for key, value in data.items():
        if key == 'tags':
            # 更新标签
            # 删除旧标签
            DatasetTag.query.filter_by(dataset_id=dataset.id).delete()
            # 添加新标签
            for tag_name in value:
                tag = DatasetTag(dataset_id=dataset.id, name=tag_name)
                db.session.add(tag)
        else:
            setattr(dataset, key, value)
    
    db.session.commit()
    return jsonify(dataset.to_dict())


@api_v1.route('/datasets/<int:dataset_id>', methods=['DELETE'])
@swag_from({
    'tags': ['数据集'],
    'summary': '删除数据集',
    'parameters': [{
        'name': 'dataset_id',
        'in': 'path',
        'type': 'integer',
        'required': True,
        'description': '数据集ID'
    }],
    'responses': {
        204: {'description': '数据集删除成功'},
        404: {'description': '数据集不存在'}
    }
})
def delete_dataset(dataset_id):
    """删除数据集"""
    dataset = Dataset.query.get_or_404(dataset_id)
    db.session.delete(dataset)
    db.session.commit()
    return '', 204


@api_v1.route('/datasets/<int:dataset_id>/like', methods=['POST'])
@swag_from({
    'tags': ['数据集'],
    'summary': '点赞数据集',
    'parameters': [{
        'name': 'dataset_id',
        'in': 'path',
        'type': 'integer',
        'required': True,
        'description': '数据集ID'
    }],
    'responses': {
        200: {'description': '点赞成功'},
        404: {'description': '数据集不存在'}
    }
})
def like_dataset(dataset_id):
    """点赞数据集"""
    dataset = Dataset.query.get_or_404(dataset_id)
    
    # 简单实现，使用IP作为用户标识
    user_id = request.remote_addr
    
    # 检查是否已经点赞
    existing_like = DatasetLike.query.filter_by(
        dataset_id=dataset_id, 
        user_id=user_id
    ).first()
    
    if existing_like:
        return jsonify({'message': '已经点赞过了'}), 200
    
    # 创建点赞记录
    like = DatasetLike(dataset_id=dataset_id, user_id=user_id)
    db.session.add(like)
    
    # 更新点赞数
    dataset.likes += 1
    db.session.commit()
    
    return jsonify({
        'message': '点赞成功',
        'likes': dataset.likes
    })


@api_v1.route('/datasets/<int:dataset_id>/download', methods=['POST'])
@swag_from({
    'tags': ['数据集'],
    'summary': '下载数据集',
    'parameters': [{
        'name': 'dataset_id',
        'in': 'path',
        'type': 'integer',
        'required': True,
        'description': '数据集ID'
    }],
    'responses': {
        200: {'description': '下载记录成功'},
        404: {'description': '数据集不存在'}
    }
})
def download_dataset(dataset_id):
    """记录数据集下载"""
    dataset = Dataset.query.get_or_404(dataset_id)
    
    # 创建下载记录
    download = DatasetDownload(
        dataset_id=dataset_id,
        user_id=request.remote_addr,  # 使用IP作为用户标识
        ip_address=request.remote_addr,
        user_agent=request.headers.get('User-Agent', '')
    )
    db.session.add(download)
    
    # 更新下载数
    dataset.downloads += 1
    db.session.commit()
    
    return jsonify({
        'message': '下载记录成功',
        'downloads': dataset.downloads,
        'download_url': f'/api/v1/datasets/{dataset_id}/files'  # 实际文件下载链接
    })


@api_v1.route('/datasets/<int:dataset_id>/versions', methods=['GET'])
@swag_from({
    'tags': ['数据集版本'],
    'summary': '获取数据集版本列表（已废弃，使用增强版本API）',
    'deprecated': True,
    'parameters': [{
        'name': 'dataset_id',
        'in': 'path',
        'type': 'integer',
        'required': True,
        'description': '数据集ID'
    }],
    'responses': {
        200: {'description': '成功获取版本列表'},
        404: {'description': '数据集不存在'}
    }
})
def get_dataset_versions(dataset_id):
    """获取数据集版本列表"""
    dataset = Dataset.query.get_or_404(dataset_id)
    versions = DatasetVersion.query.filter_by(dataset_id=dataset_id).order_by(desc(DatasetVersion.created_at)).all()
    return jsonify([version.to_dict() for version in versions])


@api_v1.route('/datasets/<int:dataset_id>/versions', methods=['POST'])
@swag_from({
    'tags': ['数据集版本'],
    'summary': '创建数据集版本（已废弃，使用增强版本API）',
    'deprecated': True,
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
                    'version': {'type': 'string', 'description': '版本号'},
                    'parent_version_id': {'type': 'integer', 'description': '父版本ID'},
                    'pipeline_config': {'type': 'object', 'description': '管道配置'},
                    'stats': {'type': 'object', 'description': '统计信息'},
                    'file_path': {'type': 'string', 'description': '文件路径'}
                },
                'required': ['version']
            }
        }
    ],
    'responses': {
        201: {'description': '版本创建成功'},
        400: {'description': '参数错误'},
        404: {'description': '数据集不存在'}
    }
})
def create_dataset_version(dataset_id):
    """创建数据集版本"""
    dataset = Dataset.query.get_or_404(dataset_id)
    
    try:
        schema = DatasetVersionCreateSchema()
        data = schema.load(request.get_json() or {})
    except ValidationError as err:
        return jsonify({'error': '参数错误', 'details': err.messages}), 400
    
    # 检查版本号是否已存在
    existing_version = DatasetVersion.query.filter_by(
        dataset_id=dataset_id,
        version=data['version']
    ).first()
    if existing_version:
        return jsonify({'error': '版本号已存在'}), 400
    
    # 创建版本
    version = DatasetVersion(
        dataset_id=dataset_id,
        version=data['version'],
        parent_version_id=data.get('parent_version_id'),
        pipeline_config=data.get('pipeline_config', {}),
        stats=data.get('stats', {}),
        file_path=data.get('file_path')
    )
    
    db.session.add(version)
    db.session.commit()
    
    return jsonify(version.to_dict()), 201


@api_v1.route('/datasets/stats', methods=['GET'])
@swag_from({
    'tags': ['数据集'],
    'summary': '获取数据集统计信息',
    'responses': {
        200: {'description': '成功获取统计信息'}
    }
})
def get_datasets_stats():
    """获取数据集统计信息"""
    total_datasets = Dataset.query.count()
    total_downloads = db.session.query(func.sum(Dataset.downloads)).scalar() or 0
    total_likes = db.session.query(func.sum(Dataset.likes)).scalar() or 0
    
    # 按任务类型统计
    task_type_stats = db.session.query(
        Dataset.task_type,
        func.count(Dataset.id).label('count')
    ).group_by(Dataset.task_type).all()
    
    # 按语言统计
    language_stats = db.session.query(
        Dataset.language,
        func.count(Dataset.id).label('count')
    ).filter(Dataset.language.isnot(None)).group_by(Dataset.language).all()
    
    return jsonify({
        'total_datasets': total_datasets,
        'total_downloads': total_downloads,
        'total_likes': total_likes,
        'task_type_stats': [{'task_type': stat[0], 'count': stat[1]} for stat in task_type_stats if stat[0]],
        'language_stats': [{'language': stat[0], 'count': stat[1]} for stat in language_stats if stat[0]]
    })


@api_v1.route('/datasets/<int:dataset_id>/import-status', methods=['GET'])
@swag_from({
    'tags': ['数据集'],
    'summary': '获取数据集导入状态',
    'parameters': [{
        'name': 'dataset_id',
        'in': 'path',
        'type': 'integer',
        'required': True,
        'description': '数据集ID'
    }],
    'responses': {
        200: {'description': '成功获取导入状态'},
        404: {'description': '数据集不存在'}
    }
})
def get_dataset_import_status(dataset_id):
    """获取数据集导入状态"""
    from app.models import Task as TaskModel, TaskType
    from app.celery_app import celery
    
    dataset = Dataset.query.get_or_404(dataset_id)
    
    # 查找关联的导入任务
    import_task = TaskModel.query.filter_by(
        type=TaskType.DATA_IMPORT
    ).filter(
        TaskModel.config['dataset_id'].astext == str(dataset_id)
    ).order_by(TaskModel.created_at.desc()).first()
    
    if not import_task:
        return jsonify({
            'status': 'not_found',
            'message': '未找到导入任务'
        }), 404
    
    # 获取Celery任务状态
    celery_task_id = import_task.config.get('celery_task_id')
    celery_status = {}
    
    if celery_task_id:
        try:
            celery_task = celery.AsyncResult(celery_task_id)
            celery_status = {
                'state': celery_task.state,
                'info': celery_task.info if celery_task.info else {}
            }
        except Exception as e:
            celery_status = {
                'state': 'UNKNOWN',
                'info': {'error': str(e)}
            }
    
    return jsonify({
        'task': import_task.to_dict(),
        'celery_status': celery_status,
        'dataset': dataset.to_dict()
    })


@api_v1.route('/datasets/<int:dataset_id>/generate', methods=['POST'])
@swag_from({
    'tags': ['数据集'],
    'summary': '自动生成数据集',
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
                    'selected_files': {
                        'type': 'array',
                        'items': {'type': 'object'},
                        'description': '选中的文件列表'
                    },
                    'dataset_config': {
                        'type': 'object',
                        'description': '数据集配置',
                        'properties': {
                            'type': {'type': 'string', 'enum': ['qa', 'summarization', 'instruction', 'classification', 'generic']},
                            'format': {'type': 'string'},
                            'name': {'type': 'string'},
                            'description': {'type': 'string'}
                        }
                    },
                    'model_config': {
                        'type': 'object',
                        'description': 'AI模型配置',
                        'properties': {
                            'id': {'type': 'integer'},
                            'name': {'type': 'string'},
                            'provider': {'type': 'string'}
                        }
                    },
                    'processing_config': {
                        'type': 'object',
                        'description': '处理配置',
                        'properties': {
                            'dataset_type': {'type': 'string'},
                            'chunk_size': {'type': 'integer'},
                            'qa_pairs_per_chunk': {'type': 'integer'},
                            'summary_length': {'type': 'string'},
                            'instructions_per_chunk': {'type': 'integer'},
                            'categories': {'type': 'array', 'items': {'type': 'string'}},
                            'enableThinkingProcess': {'type': 'boolean', 'description': '启用思考过程处理'},
                            'reasoningExtractionMethod': {'type': 'string', 'enum': ['tag_based', 'json_field'], 'description': '思考过程提取方法'},
                            'reasoningExtractionConfig': {'type': 'object', 'description': '思考过程提取配置'},
                            'distillationPrompt': {'type': 'string', 'description': '知识蒸馏提示词'},
                            'includeThinkingInOutput': {'type': 'boolean', 'description': '在输出中包含思考过程'}
                        }
                    }
                },
                'required': ['selected_files', 'dataset_config', 'model_config', 'processing_config']
            }
        }
    ],
    'responses': {
        202: {'description': '数据集生成任务已启动'},
        400: {'description': '参数错误'},
        404: {'description': '数据集不存在'}
    }
})
def generate_dataset(dataset_id):
    """启动数据集自动生成任务"""
    from app.models import Task as TaskModel, TaskType
    from app.tasks.dataset_generation_tasks import generate_dataset_task
    
    dataset = Dataset.query.get_or_404(dataset_id)
    
    try:
        data = request.get_json() or {}
        
        # 验证必需参数
        required_fields = ['selected_files', 'dataset_config', 'model_config', 'processing_config']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'缺少必需参数: {field}'}), 400
        
        selected_files = data['selected_files']
        dataset_config = data['dataset_config']
        model_config = data['model_config']
        processing_config = data['processing_config']
        
        # 记录配置信息用于调试
        logger.info(f"生成数据集任务配置:")
        logger.info(f"  - 选中文件数: {len(selected_files)}")
        logger.info(f"  - 数据集类型: {dataset_config.get('type')}")
        logger.info(f"  - 输出格式: {dataset_config.get('format')}")
        logger.info(f"  - 模型ID: {model_config.get('id')}")
        logger.info(f"  - 思考过程配置: 启用={processing_config.get('enableThinkingProcess')}, "
                   f"提取方法={processing_config.get('reasoningExtractionMethod')}, "
                   f"包含输出={processing_config.get('includeThinkingInOutput')}")
        
        # 验证文件列表
        if not selected_files or not isinstance(selected_files, list):
            return jsonify({'error': '选中的文件列表不能为空'}), 400
        
        # 验证模型配置
        if not model_config.get('id'):
            return jsonify({'error': '必须指定AI模型配置'}), 400
        
        # 创建任务记录
        task = TaskModel(
            name=f"生成数据集: {dataset.name} - {dataset_config.get('type', 'unknown')}类型",
            type=TaskType.DATASET_GENERATION,
            config={
                'dataset_id': dataset_id,
                'selected_files': selected_files,
                'dataset_config': dataset_config,
                'model_config': model_config,
                'processing_config': processing_config,
                'created_by': 'system'
            }
        )
        
        db.session.add(task)
        db.session.flush()  # 获取task.id
        
        # 启动Celery任务
        celery_task = generate_dataset_task.delay(
            dataset_id=dataset_id,
            selected_files=selected_files,
            dataset_config=dataset_config,
            model_config=model_config,
            processing_config=processing_config,
            task_id=task.id
        )
        
        # 更新任务的Celery ID
        task.config['celery_task_id'] = celery_task.id
        
        db.session.commit()
        
        logger.info(f"启动数据集生成任务: {task.id}, Celery任务ID: {celery_task.id}")
        
        return jsonify({
            'message': '数据集生成任务已启动',
            'task_id': task.id,
            'celery_task_id': celery_task.id,
            'dataset': dataset.to_dict(),
            'config': {
                'selected_files_count': len(selected_files),
                'dataset_type': dataset_config.get('type'),
                'model_name': model_config.get('name'),
                'processing_config': processing_config
            }
        }), 202
        
    except Exception as e:
        logger.error(f"启动数据集生成任务失败: {str(e)}")
        return jsonify({'error': f'启动任务失败: {str(e)}'}), 500


@api_v1.route('/datasets/<int:dataset_id>/generation-status', methods=['GET'])
@swag_from({
    'tags': ['数据集'],
    'summary': '获取数据集生成状态',
    'parameters': [{
        'name': 'dataset_id',
        'in': 'path',
        'type': 'integer',
        'required': True,
        'description': '数据集ID'
    }],
    'responses': {
        200: {'description': '成功获取生成状态'},
        404: {'description': '数据集或任务不存在'}
    }
})
def get_dataset_generation_status(dataset_id):
    """获取数据集生成状态"""
    from app.models import Task as TaskModel, TaskType
    from app.celery_app import celery
    
    dataset = Dataset.query.get_or_404(dataset_id)
    
    # 查找关联的生成任务（获取最新的）
    from sqlalchemy import text
    generation_task = TaskModel.query.filter_by(
        type=TaskType.DATASET_GENERATION
    ).filter(
        text("config->>'dataset_id' = :dataset_id")
    ).params(dataset_id=str(dataset_id)).order_by(TaskModel.created_at.desc()).first()
    
    if not generation_task:
        return jsonify({
            'status': 'not_found',
            'message': '未找到数据集生成任务'
        }), 404
    
    # 获取Celery任务状态
    celery_task_id = generation_task.config.get('celery_task_id')
    celery_status = {}
    
    if celery_task_id:
        try:
            celery_task = celery.AsyncResult(celery_task_id)
            celery_status = {
                'state': celery_task.state,
                'info': celery_task.info if celery_task.info else {}
            }
        except Exception as e:
            celery_status = {
                'state': 'UNKNOWN',
                'info': {'error': str(e)}
            }
    
    return jsonify({
        'task': generation_task.to_dict(),
        'celery_status': celery_status,
        'dataset': dataset.to_dict()
    })


@api_v1.route('/datasets/multimodal/generate', methods=['POST'])
@swag_from({
    'tags': ['数据集'],
    'summary': 'AI自动生成多模态数据集',
    'parameters': [{
        'name': 'body',
        'in': 'body',
        'required': True,
        'schema': {
            'type': 'object',
            'properties': {
                'dataset_name': {
                    'type': 'string',
                    'description': '数据集名称'
                },
                'dataset_description': {
                    'type': 'string', 
                    'description': '数据集描述'
                },
                'selected_files': {
                    'type': 'array',
                    'items': {
                        'type': 'object',
                        'properties': {
                            'id': {'type': 'integer'},
                            'filename': {'type': 'string'},
                            'file_category': {'type': 'string'},
                            'file_path': {'type': 'string'}
                        }
                    },
                    'description': '选中的多模态文件列表'
                },
                'model_config': {
                    'type': 'object',
                    'description': '视觉AI模型配置',
                    'properties': {
                        'id': {'type': 'string', 'description': '模型配置ID'},
                        'name': {'type': 'string', 'description': '模型名称'},
                        'provider': {'type': 'string', 'description': '模型提供商'},
                        'model_name': {'type': 'string', 'description': '模型标识'}
                    },
                    'required': ['id']
                },
                'generation_config': {
                    'type': 'object',
                    'description': '生成配置',
                    'properties': {
                        'qa_per_image': {'type': 'integer', 'default': 5, 'description': '每张图片生成问答对数量'},
                        'include_captions': {'type': 'boolean', 'default': True, 'description': '是否包含图片描述'},
                        'include_object_detection': {'type': 'boolean', 'default': False, 'description': '是否包含物体检测'},
                        'output_format': {'type': 'string', 'enum': ['jsonl', 'json', 'csv'], 'default': 'jsonl', 'description': '输出格式'},
                        'custom_questions': {
                            'type': 'array',
                            'items': {'type': 'string'},
                            'description': '自定义问题模板'
                        }
                    }
                }
            },
            'required': ['dataset_name', 'selected_files', 'model_config', 'generation_config']
        }
    }],
    'responses': {
        202: {'description': '多模态数据集生成任务已启动'},
        400: {'description': '参数错误'},
        404: {'description': '文件不存在'}
    }
})
def generate_multimodal_dataset():
    """AI自动生成多模态数据集"""
    # 功能暂时不可用，返回相应提示
    return jsonify({
        'error': '多模态数据集生成功能正在开发中，敬请期待',
        'status': 'under_development'
    }), 503 