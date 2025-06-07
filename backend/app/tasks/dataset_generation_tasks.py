import os
import tempfile
import logging
import time
import hashlib
import uuid
from datetime import datetime
from typing import Dict, List, Any, Optional
from celery import Task
from werkzeug.datastructures import FileStorage

from app.celery_app import celery
from app.db import db
from app.models import (
    Dataset, Task as TaskModel, TaskStatus, TaskType,
    LLMConfig
)
from app.models.dataset_version import EnhancedDatasetVersion, EnhancedDatasetFile, VersionType
from app.services.storage_service import storage_service
from app.services.enhanced_dataset_service import EnhancedDatasetService
from app.services.llm_conversion_service import llm_conversion_service

logger = logging.getLogger(__name__)

class DatasetGenerationTask(Task):
    """数据集生成任务基类"""
    _flask_app = None

    @property
    def flask_app(self):
        if self._flask_app is None:
            from app import create_app
            self._flask_app = create_app()
        return self._flask_app

@celery.task(base=DatasetGenerationTask, bind=True, name='tasks.generate_dataset')
def generate_dataset_task(
    self, 
    dataset_id: int,
    selected_files: List[Dict],
    dataset_config: Dict,
    model_config: Dict,
    processing_config: Dict,
    task_id: int
):
    """
    自动生成数据集的Celery任务
    
    Args:
        dataset_id: 数据集ID
        selected_files: 选中的文件列表
        dataset_config: 数据集配置
        model_config: AI模型配置
        processing_config: 处理配置
        task_id: 关联的任务ID
    """
    with self.flask_app.app_context():
        start_time = time.time()
        task = None
        dataset = None
        
        try:
            logger.info(f"开始生成数据集: dataset_id={dataset_id}, 文件数量={len(selected_files)}")
            
            # 获取任务和数据集对象
            task = TaskModel.query.get(task_id)
            dataset = Dataset.query.get(dataset_id)
            
            if not task or not dataset:
                raise Exception(f"任务或数据集不存在: task_id={task_id}, dataset_id={dataset_id}")
            
            # 更新任务状态为运行中
            task.status = TaskStatus.RUNNING
            task.started_at = datetime.utcnow()
            task.progress = 0
            db.session.commit()
            
            # 更新Celery任务状态
            self.update_state(
                state='PROGRESS',
                meta={
                    'current': 0,
                    'total': len(selected_files),
                    'status': '开始生成数据集...',
                    'dataset_name': dataset.name,
                    'current_file': None,
                    'processed_files': 0,
                    'generated_entries': 0
                }
            )
            
            # 创建数据集版本
            version = _create_dataset_version(dataset, dataset_config)
            logger.info(f"创建数据集版本: {version.id}")
            
            # 逐个处理文件
            processed_files = 0
            total_generated_entries = 0
            conversion_results = []
            
            for file_data in selected_files:
                try:
                    file_result = _process_single_file(
                        self, file_data, version, model_config, 
                        processing_config, processed_files, len(selected_files)
                    )
                    
                    conversion_results.append(file_result)
                    total_generated_entries += file_result.get('generated_entries', 0)
                    processed_files += 1
                    
                    # 更新进度
                    progress = int((processed_files / len(selected_files)) * 100)
                    task.progress = progress
                    db.session.commit()
                    
                    # 更新Celery状态
                    self.update_state(
                        state='PROGRESS',
                        meta={
                            'current': processed_files,
                            'total': len(selected_files),
                            'status': f'已处理 {processed_files}/{len(selected_files)} 个文件',
                            'dataset_name': dataset.name,
                            'current_file': file_result.get('filename'),
                            'processed_files': processed_files,
                            'generated_entries': total_generated_entries,
                            'progress': progress
                        }
                    )
                    
                    logger.info(f"文件处理完成: {file_result.get('filename')}, "
                              f"生成条目: {file_result.get('generated_entries', 0)}")
                    
                except Exception as file_error:
                    logger.error(f"处理文件失败: {file_data.get('name', 'unknown')}, 错误: {str(file_error)}")
                    # 继续处理其他文件，但记录错误
                    conversion_results.append({
                        'filename': file_data.get('name', 'unknown'),
                        'status': 'failed',
                        'error': str(file_error),
                        'generated_entries': 0
                    })
                    processed_files += 1
            
            # 更新版本统计信息
            _update_version_stats(version, conversion_results, total_generated_entries)
            
            # 完成任务
            task.status = TaskStatus.COMPLETED
            task.completed_at = datetime.utcnow()
            task.progress = 100
            
            total_duration = time.time() - start_time
            
            result = {
                'success': True,
                'dataset_id': dataset_id,
                'version_id': version.id,
                'processed_files': processed_files,
                'total_generated_entries': total_generated_entries,
                'duration': total_duration,
                'conversion_results': conversion_results
            }
            
            task.result = result
            db.session.commit()
            
            logger.info(f"数据集生成完成: {dataset.name}, 耗时: {total_duration:.2f}秒, "
                       f"处理文件: {processed_files}, 生成条目: {total_generated_entries}")
            
            # 最终状态更新
            self.update_state(
                state='SUCCESS',
                meta={
                    'current': processed_files,
                    'total': len(selected_files),
                    'status': '数据集生成完成',
                    'dataset_name': dataset.name,
                    'duration': total_duration,
                    'generated_entries': total_generated_entries,
                    'result': result
                }
            )
            
            return result
            
        except Exception as e:
            error_message = str(e)
            total_duration = time.time() - start_time
            
            logger.error(f"数据集生成失败: {dataset_id}, 错误: {error_message}, "
                        f"耗时: {total_duration:.2f}秒")
            
            # 更新任务失败状态
            if task:
                task.status = TaskStatus.FAILED
                task.error_message = error_message
                task.completed_at = datetime.utcnow()
                try:
                    db.session.commit()
                except Exception as commit_error:
                    logger.error(f"更新任务失败状态时出错: {str(commit_error)}")
            
            raise Exception(error_message)

def _create_dataset_version(dataset: Dataset, dataset_config: Dict) -> EnhancedDatasetVersion:
    """创建数据集版本"""
    try:
        # 生成版本ID和提交哈希
        version_id = str(uuid.uuid4())
        commit_hash = hashlib.sha256(f"{dataset.id}{datetime.utcnow().isoformat()}".encode()).hexdigest()[:8]
        
        # 确定版本号
        existing_versions = EnhancedDatasetVersion.query.filter_by(dataset_id=dataset.id).count()
        version_number = f"v1.{existing_versions}"
        
        # 创建版本
        version = EnhancedDatasetVersion(
            id=version_id,
            dataset_id=dataset.id,
            version=version_number,
            version_type=VersionType.MINOR,
            commit_hash=commit_hash,
            commit_message=f"自动生成数据集 - {dataset_config.get('type', 'unknown')}类型",
            author=dataset.owner,
            pipeline_config={
                'generation_method': 'smart_creator',
                'dataset_config': dataset_config,
                'generated_at': datetime.utcnow().isoformat()
            },
            is_default=existing_versions == 0  # 如果是第一个版本，设为默认
        )
        
        db.session.add(version)
        db.session.flush()
        
        logger.info(f"创建数据集版本: {version.id}, 版本号: {version_number}")
        return version
        
    except Exception as e:
        logger.error(f"创建数据集版本失败: {str(e)}")
        raise

def _process_single_file(
    celery_task, 
    file_data: Dict, 
    version: EnhancedDatasetVersion, 
    model_config: Dict,
    processing_config: Dict,
    current_index: int,
    total_files: int
) -> Dict[str, Any]:
    """处理单个文件，进行转换和数据蒸馏"""
    try:
        filename = file_data.get('name', 'unknown')
        file_path = file_data.get('path') or file_data.get('converted_object_name') or file_data.get('minio_object_name')
        
        logger.info(f"开始处理文件 ({current_index + 1}/{total_files}): {filename}")
        
        # 更新Celery状态
        celery_task.update_state(
            state='PROGRESS',
            meta={
                'current': current_index,
                'total': total_files,
                'status': f'正在处理文件: {filename}',
                'current_file': filename,
                'stage': 'reading_file'
            }
        )
        
        # 1. 读取文件内容
        file_content = _get_file_content(file_data)
        if not file_content:
            raise Exception("无法读取文件内容")
        
        logger.info(f"文件内容长度: {len(file_content)} 字符")
        
        # 2. 根据数据集类型进行不同的处理
        dataset_type = processing_config.get('dataset_type', 'qa')
        
        celery_task.update_state(
            state='PROGRESS',
            meta={
                'current': current_index,
                'total': total_files,
                'status': f'正在生成 {dataset_type} 数据: {filename}',
                'current_file': filename,
                'stage': 'generating_data'
            }
        )
        
        if dataset_type == 'qa-pairs' or dataset_type == 'qa':
            # 生成问答对
            generated_data = _generate_qa_data(file_content, model_config, processing_config)
        elif dataset_type == 'summarization':
            # 生成摘要数据
            generated_data = _generate_summary_data(file_content, model_config, processing_config)
        elif dataset_type == 'instruction-tuning':
            # 生成指令跟随数据
            generated_data = _generate_instruction_data(file_content, model_config, processing_config)
        elif dataset_type == 'text-classification':
            # 生成分类数据
            generated_data = _generate_classification_data(file_content, model_config, processing_config)
        else:
            # 默认生成通用文本数据
            generated_data = _generate_generic_data(file_content, model_config, processing_config)
        
        # 3. 保存生成的数据文件
        celery_task.update_state(
            state='PROGRESS',
            meta={
                'current': current_index,
                'total': total_files,
                'status': f'正在保存生成数据: {filename}',
                'current_file': filename,
                'stage': 'saving_data'
            }
        )
        
        dataset_file = _save_generated_data(version, filename, generated_data, file_data)
        
        result = {
            'filename': filename,
            'status': 'success',
            'generated_entries': len(generated_data),
            'file_id': dataset_file.id,
            'file_size': dataset_file.file_size
        }
        
        logger.info(f"文件处理完成: {filename}, 生成条目: {len(generated_data)}")
        return result
        
    except Exception as e:
        logger.error(f"处理文件失败: {filename}, 错误: {str(e)}")
        raise

def _get_file_content(file_data: Dict) -> str:
    """获取文件内容"""
    try:
        # 尝试多种方式获取文件内容
        content = None
        
        # 方法1: 如果有转换后的内容，直接使用
        if file_data.get('converted_content'):
            content = file_data['converted_content']
            logger.info("使用缓存的转换内容")
        
        # 方法2: 通过存储服务获取内容
        if not content:
            object_name = (file_data.get('originalFile', {}).get('converted_object_name') or 
                          file_data.get('originalFile', {}).get('minio_object_name') or 
                          file_data.get('path'))
            
            if object_name:
                try:
                    # 使用storage_service获取文件字节数据并转换为文本
                    file_bytes = storage_service.get_file(object_name)
                    content = file_bytes.decode('utf-8', errors='ignore')
                    logger.info(f"通过存储服务获取文件内容: {object_name}")
                except Exception as e:
                    logger.warning(f"通过存储服务获取内容失败: {str(e)}")
        
        if not content:
            raise Exception("无法通过任何方式获取文件内容")
        
        # 清理和验证内容
        content = content.strip()
        if len(content) < 50:  # 内容太短
            raise Exception(f"文件内容太短，无法生成有效数据集: {len(content)} 字符")
        
        return content
        
    except Exception as e:
        logger.error(f"获取文件内容失败: {str(e)}")
        raise

def _generate_qa_data(content: str, model_config: Dict, processing_config: Dict) -> List[Dict]:
    """生成问答对数据"""
    try:
        # 获取LLM配置
        llm_config_id = model_config.get('id')
        if not llm_config_id:
            raise Exception("未指定LLM配置")
        
        llm_config = LLMConfig.query.get(llm_config_id)
        if not llm_config:
            raise Exception(f"LLM配置不存在: {llm_config_id}")
        
        # 分块处理长文本
        chunks = _split_content_into_chunks(content, processing_config.get('chunk_size', 2000))
        logger.info(f"将内容分为 {len(chunks)} 块进行处理")
        
        all_qa_pairs = []
        
        for i, chunk in enumerate(chunks):
            logger.info(f"处理块 {i+1}/{len(chunks)}")
            
            # 构建提示词
            prompt = _build_qa_generation_prompt(chunk, processing_config)
            
            # 调用LLM生成问答对
            try:
                response = llm_conversion_service.call_llm(llm_config, prompt)
                
                # 解析响应获取问答对
                qa_pairs = _parse_qa_response(response)
                all_qa_pairs.extend(qa_pairs)
                
                logger.info(f"块 {i+1} 生成问答对: {len(qa_pairs)} 个")
                
            except Exception as e:
                logger.warning(f"处理块 {i+1} 失败: {str(e)}")
                continue
        
        logger.info(f"总共生成问答对: {len(all_qa_pairs)} 个")
        return all_qa_pairs
        
    except Exception as e:
        logger.error(f"生成问答数据失败: {str(e)}")
        raise

def _generate_summary_data(content: str, model_config: Dict, processing_config: Dict) -> List[Dict]:
    """生成摘要数据"""
    try:
        llm_config_id = model_config.get('id')
        llm_config = LLMConfig.query.get(llm_config_id)
        
        # 分块处理
        chunks = _split_content_into_chunks(content, processing_config.get('chunk_size', 3000))
        summary_data = []
        
        for i, chunk in enumerate(chunks):
            prompt = _build_summary_generation_prompt(chunk, processing_config)
            
            try:
                response = llm_conversion_service.call_llm(llm_config, prompt)
                
                summary_entries = _parse_summary_response(response, chunk)
                summary_data.extend(summary_entries)
                
            except Exception as e:
                logger.warning(f"生成摘要失败 块{i+1}: {str(e)}")
                continue
        
        return summary_data
        
    except Exception as e:
        logger.error(f"生成摘要数据失败: {str(e)}")
        raise

def _generate_instruction_data(content: str, model_config: Dict, processing_config: Dict) -> List[Dict]:
    """生成指令跟随数据"""
    try:
        llm_config_id = model_config.get('id')
        llm_config = LLMConfig.query.get(llm_config_id)
        
        chunks = _split_content_into_chunks(content, processing_config.get('chunk_size', 2500))
        instruction_data = []
        
        for i, chunk in enumerate(chunks):
            prompt = _build_instruction_generation_prompt(chunk, processing_config)
            
            try:
                response = llm_conversion_service.call_llm(llm_config, prompt)
                
                instructions = _parse_instruction_response(response)
                instruction_data.extend(instructions)
                
            except Exception as e:
                logger.warning(f"生成指令数据失败 块{i+1}: {str(e)}")
                continue
        
        return instruction_data
        
    except Exception as e:
        logger.error(f"生成指令数据失败: {str(e)}")
        raise

def _generate_classification_data(content: str, model_config: Dict, processing_config: Dict) -> List[Dict]:
    """生成分类数据"""
    try:
        llm_config_id = model_config.get('id')
        llm_config = LLMConfig.query.get(llm_config_id)
        
        chunks = _split_content_into_chunks(content, processing_config.get('chunk_size', 1500))
        classification_data = []
        
        for i, chunk in enumerate(chunks):
            prompt = _build_classification_generation_prompt(chunk, processing_config)
            
            try:
                response = llm_conversion_service.call_llm(llm_config, prompt)
                
                classifications = _parse_classification_response(response)
                classification_data.extend(classifications)
                
            except Exception as e:
                logger.warning(f"生成分类数据失败 块{i+1}: {str(e)}")
                continue
        
        return classification_data
        
    except Exception as e:
        logger.error(f"生成分类数据失败: {str(e)}")
        raise

def _generate_generic_data(content: str, model_config: Dict, processing_config: Dict) -> List[Dict]:
    """生成通用文本数据"""
    try:
        # 简单的文本分段处理
        chunks = _split_content_into_chunks(content, processing_config.get('chunk_size', 1000))
        
        generic_data = []
        for i, chunk in enumerate(chunks):
            generic_data.append({
                'id': i + 1,
                'text': chunk.strip(),
                'source': 'auto_generated',
                'type': 'text_segment'
            })
        
        return generic_data
        
    except Exception as e:
        logger.error(f"生成通用数据失败: {str(e)}")
        raise

def _split_content_into_chunks(content: str, chunk_size: int) -> List[str]:
    """将内容分割成块"""
    try:
        if len(content) <= chunk_size:
            return [content]
        
        chunks = []
        start = 0
        
        while start < len(content):
            end = start + chunk_size
            
            # 尝试在句号处分割，避免截断句子
            if end < len(content):
                # 向后查找句号
                sentence_end = content.rfind('。', start, end)
                if sentence_end == -1:
                    sentence_end = content.rfind('.', start, end)
                if sentence_end == -1:
                    sentence_end = content.rfind('！', start, end)
                if sentence_end == -1:
                    sentence_end = content.rfind('？', start, end)
                
                if sentence_end > start:
                    end = sentence_end + 1
            
            chunk = content[start:end].strip()
            if chunk:
                chunks.append(chunk)
            
            start = end
        
        return chunks
        
    except Exception as e:
        logger.error(f"分割内容失败: {str(e)}")
        return [content]  # 返回原内容作为单个块

def _build_qa_generation_prompt(content: str, config: Dict) -> str:
    """构建问答生成提示词"""
    qa_count = config.get('qa_pairs_per_chunk', 3)
    
    prompt = f"""请基于以下文本内容生成 {qa_count} 个高质量的问答对。

要求：
1. 问题应该涵盖文本的关键信息点
2. 答案应该准确、简洁且完整
3. 问题类型多样化（事实性、理解性、分析性）
4. 使用JSON格式返回

文本内容：
{content}

请按以下JSON格式返回：
[
  {{
    "question": "问题1",
    "answer": "答案1",
    "type": "factual"
  }},
  {{
    "question": "问题2", 
    "answer": "答案2",
    "type": "comprehension"
  }}
]
"""
    return prompt

def _build_summary_generation_prompt(content: str, config: Dict) -> str:
    """构建摘要生成提示词"""
    summary_length = config.get('summary_length', 'medium')
    
    length_map = {
        'short': '50-100字',
        'medium': '100-200字',
        'long': '200-400字'
    }
    
    prompt = f"""请为以下文本生成高质量的摘要。

要求：
1. 摘要长度：{length_map.get(summary_length, '100-200字')}
2. 保留关键信息和核心观点
3. 语言简洁明了
4. 使用JSON格式返回

文本内容：
{content}

请按以下JSON格式返回：
[
  {{
    "original_text": "原文内容",
    "summary": "摘要内容",
    "key_points": ["要点1", "要点2", "要点3"]
  }}
]
"""
    return prompt

def _build_instruction_generation_prompt(content: str, config: Dict) -> str:
    """构建指令生成提示词"""
    instruction_count = config.get('instructions_per_chunk', 2)
    
    prompt = f"""请基于以下文本内容生成 {instruction_count} 个指令跟随格式的训练数据。

要求：
1. 指令应该明确具体
2. 输入可选，但要与指令相关
3. 输出应该基于文本内容
4. 使用JSON格式返回

文本内容：
{content}

请按以下JSON格式返回：
[
  {{
    "instruction": "具体指令",
    "input": "输入内容（可选）",
    "output": "期望输出"
  }}
]
"""
    return prompt

def _build_classification_generation_prompt(content: str, config: Dict) -> str:
    """构建分类生成提示词"""
    categories = config.get('categories', ['positive', 'negative', 'neutral'])
    
    prompt = f"""请为以下文本内容生成分类训练数据。

可选分类：{', '.join(categories)}

要求：
1. 为文本片段分配合适的分类标签
2. 提供分类理由
3. 使用JSON格式返回

文本内容：
{content}

请按以下JSON格式返回：
[
  {{
    "text": "文本片段",
    "label": "分类标签",
    "confidence": 0.95,
    "reason": "分类理由"
  }}
]
"""
    return prompt

def _parse_qa_response(response: str) -> List[Dict]:
    """解析问答响应"""
    try:
        import json
        
        # 尝试直接解析JSON
        try:
            qa_pairs = json.loads(response)
            if isinstance(qa_pairs, list):
                return qa_pairs
        except:
            pass
        
        # 尝试提取JSON部分
        import re
        json_match = re.search(r'\[.*\]', response, re.DOTALL)
        if json_match:
            try:
                qa_pairs = json.loads(json_match.group())
                if isinstance(qa_pairs, list):
                    return qa_pairs
            except:
                pass
        
        # 如果无法解析，返回空列表
        logger.warning("无法解析问答响应，返回空列表")
        return []
        
    except Exception as e:
        logger.error(f"解析问答响应失败: {str(e)}")
        return []

def _parse_summary_response(response: str, original_text: str) -> List[Dict]:
    """解析摘要响应"""
    try:
        import json
        
        try:
            summary_data = json.loads(response)
            if isinstance(summary_data, list):
                return summary_data
        except:
            pass
        
        # 简单解析，如果JSON解析失败
        return [{
            'original_text': original_text[:200] + '...' if len(original_text) > 200 else original_text,
            'summary': response.strip(),
            'key_points': []
        }]
        
    except Exception as e:
        logger.error(f"解析摘要响应失败: {str(e)}")
        return []

def _parse_instruction_response(response: str) -> List[Dict]:
    """解析指令响应"""
    try:
        import json
        import re
        
        # 尝试直接解析JSON
        try:
            instruction_data = json.loads(response)
            if isinstance(instruction_data, list):
                return instruction_data
        except:
            pass
        
        # 尝试提取JSON部分
        json_match = re.search(r'\[.*\]', response, re.DOTALL)
        if json_match:
            try:
                instruction_data = json.loads(json_match.group())
                if isinstance(instruction_data, list):
                    return instruction_data
            except:
                pass
        
        # 尝试提取多个JSON对象（每行一个）
        json_objects = []
        lines = response.strip().split('\n')
        for line in lines:
            line = line.strip()
            if line.startswith('{') and line.endswith('}'):
                try:
                    obj = json.loads(line)
                    if isinstance(obj, dict):
                        json_objects.append(obj)
                except:
                    continue
        
        if json_objects:
            return json_objects
        
        # 记录实际响应内容以便调试
        logger.warning(f"无法解析指令响应，响应内容前200字符: {response[:200]}")
        return []
        
    except Exception as e:
        logger.error(f"解析指令响应失败: {str(e)}")
        return []

def _parse_classification_response(response: str) -> List[Dict]:
    """解析分类响应"""
    try:
        import json
        import re
        
        # 尝试直接解析JSON
        try:
            classification_data = json.loads(response)
            if isinstance(classification_data, list):
                return classification_data
        except:
            pass
        
        # 尝试提取JSON部分
        json_match = re.search(r'\[.*\]', response, re.DOTALL)
        if json_match:
            try:
                classification_data = json.loads(json_match.group())
                if isinstance(classification_data, list):
                    return classification_data
            except:
                pass
        
        # 尝试提取多个JSON对象（每行一个）
        json_objects = []
        lines = response.strip().split('\n')
        for line in lines:
            line = line.strip()
            if line.startswith('{') and line.endswith('}'):
                try:
                    obj = json.loads(line)
                    if isinstance(obj, dict):
                        json_objects.append(obj)
                except:
                    continue
        
        if json_objects:
            return json_objects
        
        # 记录实际响应内容以便调试
        logger.warning(f"无法解析分类响应，响应内容前200字符: {response[:200]}")
        return []
        
    except Exception as e:
        logger.error(f"解析分类响应失败: {str(e)}")
        return []

def _save_generated_data(version: EnhancedDatasetVersion, original_filename: str, 
                        generated_data: List[Dict], file_data: Dict) -> EnhancedDatasetFile:
    """保存生成的数据文件"""
    try:
        import json
        import tempfile
        
        # 准备文件名和内容
        base_name = os.path.splitext(original_filename)[0]
        generated_filename = f"{base_name}_generated.jsonl"
        
        # 转换为JSONL格式
        jsonl_content = '\n'.join([json.dumps(item, ensure_ascii=False) for item in generated_data])
        
        # 创建临时文件
        with tempfile.NamedTemporaryFile(mode='w', encoding='utf-8', suffix='.jsonl', delete=False) as tmp_file:
            tmp_file.write(jsonl_content)
            tmp_file_path = tmp_file.name
        
        try:
            # 上传到MinIO
            object_name = f"datasets/{version.dataset_id}/{version.version}/generated/{generated_filename}"
            
            # 使用upload_file_from_path方法
            bucket_name = 'datasets'
            file_size = storage_service.upload_file_from_path(
                tmp_file_path, object_name, 'application/json', bucket_name
            )
            uploaded_object = object_name
            
            # 计算文件校验和
            with open(tmp_file_path, 'rb') as f:
                checksum = hashlib.md5(f.read()).hexdigest()
            
            # 创建文件记录
            dataset_file = EnhancedDatasetFile(
                version_id=version.id,
                filename=generated_filename,
                file_path=f"datasets/{version.dataset_id}/versions/{version.id}/{generated_filename}",
                file_type='json',
                file_size=file_size,
                checksum=checksum,
                minio_bucket='datasets',
                minio_object_name=uploaded_object,
                file_metadata={
                    'original_file': original_filename,
                    'generation_type': 'auto_generated',
                    'entries_count': len(generated_data),
                    'source_file_data': file_data
                },
                preview_data={
                    'type': 'jsonl',
                    'sample_entries': generated_data[:3],  # 保存前3个条目作为预览
                    'total_entries': len(generated_data)
                }
            )
            
            db.session.add(dataset_file)
            db.session.flush()
            
            logger.info(f"保存生成数据文件: {generated_filename}, 大小: {file_size} 字节, "
                       f"条目数: {len(generated_data)}")
            
            return dataset_file
            
        finally:
            # 清理临时文件
            try:
                os.unlink(tmp_file_path)
            except:
                pass
        
    except Exception as e:
        logger.error(f"保存生成数据失败: {str(e)}")
        raise

def _update_version_stats(version: EnhancedDatasetVersion, conversion_results: List[Dict], 
                         total_generated_entries: int):
    """更新版本统计信息"""
    try:
        # 计算总文件数和大小
        total_files = len([r for r in conversion_results if r.get('status') == 'success'])
        total_size = sum([r.get('file_size', 0) for r in conversion_results if r.get('status') == 'success'])
        
        # 计算成功率
        success_count = len([r for r in conversion_results if r.get('status') == 'success'])
        success_rate = (success_count / len(conversion_results)) * 100 if conversion_results else 0
        
        # 更新版本信息
        version.file_count = total_files
        version.total_size = total_size
        version.data_checksum = hashlib.sha256(
            f"{total_files}{total_size}{total_generated_entries}".encode()
        ).hexdigest()[:16]
        
        # 更新统计信息
        version.stats = {
            'total_generated_entries': total_generated_entries,
            'success_rate': success_rate,
            'processed_files': len(conversion_results),
            'successful_files': success_count,
            'failed_files': len(conversion_results) - success_count,
            'generation_results': conversion_results
        }
        
        version.updated_at = datetime.utcnow()
        db.session.commit()
        
        logger.info(f"更新版本统计: 文件数={total_files}, 总大小={total_size}, "
                   f"生成条目={total_generated_entries}, 成功率={success_rate:.1f}%")
        
    except Exception as e:
        logger.error(f"更新版本统计失败: {str(e)}")
        # 不抛出异常，避免影响主流程 