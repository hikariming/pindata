import os
import tempfile
import logging
import time
import hashlib
import uuid
from datetime import datetime
from typing import Dict, List, Any, Optional
from celery import Task
from flask import current_app
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
            
            # 计算成功文件数和失败率
            successful_files = len([r for r in conversion_results if r.get('status') == 'success'])
            failed_files = len([r for r in conversion_results if r.get('status') == 'failed'])
            file_success_rate = (successful_files / len(selected_files)) * 100 if selected_files else 0
            
            logger.info(f"文件处理统计: 总数={len(selected_files)}, 成功={successful_files}, "
                       f"失败={failed_files}, 成功率={file_success_rate:.1f}%")
            
            # 检查文件级别的失败率
            if file_success_rate < 50.0:
                error_msg = f"文件处理成功率过低: {file_success_rate:.1f}%，可能是LLM服务不可用或配置错误"
                logger.error(error_msg)
                raise Exception(error_msg)
            
            # 检查是否生成了足够的数据
            if total_generated_entries == 0:
                error_msg = "未从任何文件生成数据，请检查LLM服务状态和配置"
                logger.error(error_msg)
                raise Exception(error_msg)
            
            # 如果成功率较低但不是完全失败，给出警告
            if file_success_rate < 80.0:
                warning_msg = f"注意：文件处理成功率较低({file_success_rate:.1f}%)，建议检查LLM服务状态"
                logger.warning(warning_msg)
            
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
        
        # 检查生成的数据是否有效
        if not generated_data or len(generated_data) == 0:
            raise Exception(f"文件 {filename} 未生成任何有效数据，可能是LLM服务不可用或内容无法处理")
        
        logger.info(f"文件 {filename} 成功生成 {len(generated_data)} 个数据条目")
        
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
        
        dataset_file = _save_generated_data(version, filename, generated_data, file_data, processing_config)
        
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
        
        # 获取思考过程配置
        enable_thinking = processing_config.get('enableThinkingProcess', False)
        include_thinking_in_output = processing_config.get('includeThinkingInOutput', False)
        reasoning_extraction_method = processing_config.get('reasoningExtractionMethod')
        reasoning_extraction_config = processing_config.get('reasoningExtractionConfig', {})
        distillation_prompt = processing_config.get('distillationPrompt', '')
        
        logger.info(f"问答数据生成配置 - 启用思考过程: {enable_thinking}, 包含思考过程: {include_thinking_in_output}")
        logger.info(f"思考过程配置 - 提取方法: {reasoning_extraction_method}, 蒸馏提示词: {bool(distillation_prompt)}")
        
        # 分块处理长文本
        chunk_size = processing_config.get('chunk_size', 2000)
        chunk_overlap = processing_config.get('chunk_overlap', 200)
        chunks = _split_content_into_chunks_with_overlap(content, chunk_size, chunk_overlap)
        logger.info(f"将内容分为 {len(chunks)} 块进行处理，块大小: {chunk_size}, 重叠: {chunk_overlap}")
        
        all_qa_pairs = []
        successful_chunks = 0
        failed_chunks = 0
        
        for i, chunk in enumerate(chunks):
            logger.info(f"处理块 {i+1}/{len(chunks)}")
            
            # 构建提示词 - 使用自定义提示词或默认提示词
            custom_prompt = processing_config.get('custom_prompt', '')
            if custom_prompt:
                # 使用前端生成的详细提示词
                prompt = _build_custom_prompt_for_chunk(chunk, custom_prompt, processing_config)
            else:
                # 使用默认的问答对生成提示词
                prompt = _build_qa_generation_prompt(chunk, processing_config)
            
            # 调用LLM生成问答对
            try:
                if enable_thinking and llm_config.supports_reasoning:
                    # 使用支持思考过程的调用方式
                    thinking_config = {
                        'reasoning_extraction_method': reasoning_extraction_method or 'tag_based',
                        'reasoning_extraction_config': reasoning_extraction_config,
                        'tag': reasoning_extraction_config.get('tag', 'thinking'),
                        'distillationPrompt': distillation_prompt
                    }
                    
                    response_data = llm_conversion_service.call_llm_with_thinking_process(
                        llm_config, prompt, thinking_config
                    )
                    
                    # 解析响应获取问答对
                    qa_pairs = _parse_qa_response_with_thinking(
                        response_data, processing_config.get('dataset_type'), include_thinking_in_output
                    )
                    
                elif enable_thinking and not llm_config.supports_reasoning:
                    # 对于不支持推理的模型，先正常生成，再蒸馏思考过程
                    response = llm_conversion_service.call_llm(llm_config, prompt)
                    qa_pairs = _parse_qa_response(response, processing_config.get('dataset_type'))
                    
                    # 为每个问答对进行知识蒸馏
                    if distillation_prompt:
                        distillation_config = {
                            'distillation_prompt': distillation_prompt
                        }
                        
                        for qa_pair in qa_pairs:
                            try:
                                # 构建原始问题和答案
                                original_prompt = qa_pair.get('question', '')
                                original_response = qa_pair.get('answer', '')
                                
                                # 调用蒸馏方法
                                distilled_data = llm_conversion_service.distill_thinking_process(
                                    llm_config, original_prompt, original_response, distillation_config
                                )
                                
                                # 根据配置决定是否包含思考过程
                                if include_thinking_in_output and distilled_data.get('reasoning'):
                                    qa_pair['thinking'] = distilled_data['reasoning']
                                
                                # 更新答案（如果蒸馏后有改进）
                                if distilled_data.get('final_answer'):
                                    qa_pair['answer'] = distilled_data['final_answer']
                                    
                            except Exception as distill_error:
                                logger.warning(f"蒸馏问答对失败: {str(distill_error)}")
                                continue
                else:
                    # 普通调用方式
                    response = llm_conversion_service.call_llm(llm_config, prompt)
                    qa_pairs = _parse_qa_response(response, processing_config.get('dataset_type'))
                
                # 检查这个块是否成功生成了数据
                if qa_pairs and len(qa_pairs) > 0:
                    all_qa_pairs.extend(qa_pairs)
                    successful_chunks += 1
                    logger.info(f"块 {i+1} 生成问答对: {len(qa_pairs)} 个")
                else:
                    failed_chunks += 1
                    logger.warning(f"块 {i+1} 未生成任何问答对")
                
            except Exception as e:
                failed_chunks += 1
                logger.warning(f"处理块 {i+1} 失败: {str(e)}")
                continue
        
        # 计算成功率
        total_chunks = len(chunks)
        success_rate = (successful_chunks / total_chunks) * 100 if total_chunks > 0 else 0
        
        logger.info(f"块处理统计: 总数={total_chunks}, 成功={successful_chunks}, 失败={failed_chunks}, 成功率={success_rate:.1f}%")
        logger.info(f"总共生成问答对: {len(all_qa_pairs)} 个")
        
        # 设置失败阈值：如果成功率低于30%或没有生成任何数据，则认为失败
        if success_rate < 30.0:
            raise Exception(f"块处理成功率过低: {success_rate:.1f}%，可能是LLM服务不可用或配置错误")
        
        if len(all_qa_pairs) == 0:
            raise Exception("未生成任何问答对数据，请检查LLM服务状态和配置")
        
        return all_qa_pairs
        
    except Exception as e:
        logger.error(f"生成问答数据失败: {str(e)}")
        raise

def _generate_summary_data(content: str, model_config: Dict, processing_config: Dict) -> List[Dict]:
    """生成摘要数据"""
    try:
        llm_config_id = model_config.get('id')
        llm_config = LLMConfig.query.get(llm_config_id)
        
        # 获取思考过程配置
        enable_thinking = processing_config.get('enableThinkingProcess', False)
        include_thinking_in_output = processing_config.get('includeThinkingInOutput', False)
        reasoning_extraction_method = processing_config.get('reasoningExtractionMethod')
        reasoning_extraction_config = processing_config.get('reasoningExtractionConfig', {})
        distillation_prompt = processing_config.get('distillationPrompt', '')
        
        logger.info(f"摘要数据生成配置 - 启用思考过程: {enable_thinking}, 包含思考过程: {include_thinking_in_output}")
        logger.info(f"思考过程配置 - 提取方法: {reasoning_extraction_method}, 蒸馏提示词: {bool(distillation_prompt)}")
        
        # 分块处理
        chunk_size = processing_config.get('chunk_size', 3000)
        chunk_overlap = processing_config.get('chunk_overlap', 300)
        chunks = _split_content_into_chunks_with_overlap(content, chunk_size, chunk_overlap)
        summary_data = []
        successful_chunks = 0
        failed_chunks = 0
        
        for i, chunk in enumerate(chunks):
            logger.info(f"处理块 {i+1}/{len(chunks)} 用于摘要")
            
            try:
                if enable_thinking and llm_config.supports_reasoning:
                    thinking_config = {
                        'reasoning_extraction_method': reasoning_extraction_method or 'tag_based',
                        'reasoning_extraction_config': reasoning_extraction_config,
                        'tag': reasoning_extraction_config.get('tag', 'thinking'),
                        'distillationPrompt': distillation_prompt
                    }
                    response_data = llm_conversion_service.call_llm_with_thinking_process(
                        llm_config, prompt, thinking_config
                    )
                    
                    summary_entries = _parse_summary_response_with_thinking(
                        response_data, chunk, include_thinking_in_output
                    )
                    
                elif enable_thinking and not llm_config.supports_reasoning:
                    # 对于不支持推理的模型，先正常生成，再蒸馏思考过程
                    response = llm_conversion_service.call_llm(llm_config, prompt)
                    summary_entries = _parse_summary_response(response, chunk)
                    
                    # 为每个摘要进行知识蒸馏
                    if distillation_prompt:
                        distillation_config = {
                            'distillation_prompt': distillation_prompt
                        }
                        
                        for summary_entry in summary_entries:
                            try:
                                original_prompt = f"请对以下内容进行摘要：\n{chunk}"
                                original_response = summary_entry.get('summary', '')
                                
                                distilled_data = llm_conversion_service.distill_thinking_process(
                                    llm_config, original_prompt, original_response, distillation_config
                                )
                                
                                if include_thinking_in_output and distilled_data.get('reasoning'):
                                    summary_entry['thinking'] = distilled_data['reasoning']
                                
                                if distilled_data.get('final_answer'):
                                    summary_entry['summary'] = distilled_data['final_answer']
                                    
                            except Exception as distill_error:
                                logger.warning(f"蒸馏摘要失败: {str(distill_error)}")
                                continue
                else:
                    # 普通调用方式
                    response = llm_conversion_service.call_llm(llm_config, prompt)
                    summary_entries = _parse_summary_response(response, chunk)
                
                # 检查这个块是否成功生成了数据
                if summary_entries and len(summary_entries) > 0:
                    summary_data.extend(summary_entries)
                    successful_chunks += 1
                else:
                    failed_chunks += 1
                    logger.warning(f"块 {i+1} 未生成任何摘要数据")
                
            except Exception as e:
                failed_chunks += 1
                logger.warning(f"生成摘要失败 块{i+1}: {str(e)}")
                continue
        
        # 计算成功率
        total_chunks = len(chunks)
        success_rate = (successful_chunks / total_chunks) * 100 if total_chunks > 0 else 0
        
        logger.info(f"块处理统计: 总数={total_chunks}, 成功={successful_chunks}, 失败={failed_chunks}, 成功率={success_rate:.1f}%")
        
        # 设置失败阈值
        if success_rate < 30.0:
            raise Exception(f"块处理成功率过低: {success_rate:.1f}%，可能是LLM服务不可用或配置错误")
        
        if len(summary_data) == 0:
            raise Exception("未生成任何摘要数据，请检查LLM服务状态和配置")
        
        return summary_data
        
    except Exception as e:
        logger.error(f"生成摘要数据失败: {str(e)}")
        raise

def _generate_instruction_data(content: str, model_config: Dict, processing_config: Dict) -> List[Dict]:
    """生成指令跟随数据"""
    try:
        llm_config_id = model_config.get('id')
        llm_config = LLMConfig.query.get(llm_config_id)
        
        # 获取思考过程配置
        enable_thinking = processing_config.get('enableThinkingProcess', False)
        include_thinking_in_output = processing_config.get('includeThinkingInOutput', False)
        reasoning_extraction_method = processing_config.get('reasoningExtractionMethod')
        reasoning_extraction_config = processing_config.get('reasoningExtractionConfig', {})
        distillation_prompt = processing_config.get('distillationPrompt', '')
        
        logger.info(f"指令数据生成配置 - 启用思考过程: {enable_thinking}, 包含思考过程: {include_thinking_in_output}")
        
        chunk_size = processing_config.get('chunk_size', 2500)
        chunk_overlap = processing_config.get('chunk_overlap', 200)
        chunks = _split_content_into_chunks_with_overlap(content, chunk_size, chunk_overlap)
        instruction_data = []
        successful_chunks = 0
        failed_chunks = 0
        
        for i, chunk in enumerate(chunks):
            logger.info(f"处理块 {i+1}/{len(chunks)}")
            
            # 使用自定义提示词或默认提示词
            custom_prompt = processing_config.get('custom_prompt', '')
            if custom_prompt:
                prompt = _build_custom_prompt_for_chunk(chunk, custom_prompt, processing_config)
            else:
                prompt = _build_instruction_generation_prompt(chunk, processing_config)
            
            try:
                if enable_thinking and llm_config.supports_reasoning:
                    # 使用支持思考过程的调用方式
                    thinking_config = {
                        'reasoning_extraction_method': reasoning_extraction_method or 'tag_based',
                        'reasoning_extraction_config': reasoning_extraction_config,
                        'tag': reasoning_extraction_config.get('tag', 'thinking'),
                        'distillationPrompt': distillation_prompt
                    }
                    
                    response_data = llm_conversion_service.call_llm_with_thinking_process(
                        llm_config, prompt, thinking_config
                    )
                    
                    instructions = _parse_instruction_response_with_thinking(
                        response_data, processing_config.get('dataset_type'), include_thinking_in_output
                    )
                    
                elif enable_thinking and not llm_config.supports_reasoning:
                    # 对于不支持推理的模型，先正常生成，再蒸馏思考过程
                    response = llm_conversion_service.call_llm(llm_config, prompt)
                    instructions = _parse_instruction_response(response, processing_config.get('dataset_type'))
                    
                    # 为每个指令进行知识蒸馏
                    if distillation_prompt:
                        distillation_config = {
                            'distillation_prompt': distillation_prompt
                        }
                        
                        for instruction in instructions:
                            try:
                                original_prompt = instruction.get('instruction', '')
                                original_response = instruction.get('output', '')
                                
                                distilled_data = llm_conversion_service.distill_thinking_process(
                                    llm_config, original_prompt, original_response, distillation_config
                                )
                                
                                if include_thinking_in_output and distilled_data.get('reasoning'):
                                    instruction['thinking'] = distilled_data['reasoning']
                                
                                if distilled_data.get('final_answer'):
                                    instruction['output'] = distilled_data['final_answer']
                                    
                            except Exception as distill_error:
                                logger.warning(f"蒸馏指令失败: {str(distill_error)}")
                                continue
                else:
                    # 普通调用方式
                    response = llm_conversion_service.call_llm(llm_config, prompt)
                    instructions = _parse_instruction_response(response, processing_config.get('dataset_type'))
                
                # 检查这个块是否成功生成了数据
                if instructions and len(instructions) > 0:
                    instruction_data.extend(instructions)
                    successful_chunks += 1
                else:
                    failed_chunks += 1
                    logger.warning(f"块 {i+1} 未生成任何指令数据")
                
            except Exception as e:
                failed_chunks += 1
                logger.warning(f"生成指令数据失败 块{i+1}: {str(e)}")
                continue
        
        # 计算成功率
        total_chunks = len(chunks)
        success_rate = (successful_chunks / total_chunks) * 100 if total_chunks > 0 else 0
        
        logger.info(f"块处理统计: 总数={total_chunks}, 成功={successful_chunks}, 失败={failed_chunks}, 成功率={success_rate:.1f}%")
        
        # 设置失败阈值
        if success_rate < 30.0:
            raise Exception(f"块处理成功率过低: {success_rate:.1f}%，可能是LLM服务不可用或配置错误")
        
        if len(instruction_data) == 0:
            raise Exception("未生成任何指令数据，请检查LLM服务状态和配置")
        
        return instruction_data
        
    except Exception as e:
        logger.error(f"生成指令数据失败: {str(e)}")
        raise

def _generate_classification_data(content: str, model_config: Dict, processing_config: Dict) -> List[Dict]:
    """生成文本分类数据"""
    try:
        llm_config_id = model_config.get('id')
        llm_config = LLMConfig.query.get(llm_config_id)
        
        # 获取思考过程配置
        enable_thinking = processing_config.get('enableThinkingProcess', False)
        include_thinking_in_output = processing_config.get('includeThinkingInOutput', False)
        reasoning_extraction_method = processing_config.get('reasoningExtractionMethod')
        reasoning_extraction_config = processing_config.get('reasoningExtractionConfig', {})
        distillation_prompt = processing_config.get('distillationPrompt', '')
        
        logger.info(f"分类数据生成配置 - 启用思考过程: {enable_thinking}, 包含思考过程: {include_thinking_in_output}")
        
        chunk_size = processing_config.get('chunk_size', 1500)
        chunk_overlap = processing_config.get('chunk_overlap', 150)
        chunks = _split_content_into_chunks_with_overlap(content, chunk_size, chunk_overlap)
        classification_data = []
        successful_chunks = 0
        failed_chunks = 0
        
        for i, chunk in enumerate(chunks):
            logger.info(f"处理块 {i+1}/{len(chunks)}")
            
            # 使用自定义提示词或默认提示词
            custom_prompt = processing_config.get('custom_prompt', '')
            if custom_prompt:
                prompt = _build_custom_prompt_for_chunk(chunk, custom_prompt, processing_config)
            else:
                prompt = _build_classification_generation_prompt(chunk, processing_config)
            
            try:
                if enable_thinking and llm_config.supports_reasoning:
                    # 使用支持思考过程的调用方式
                    thinking_config = {
                        'reasoning_extraction_method': reasoning_extraction_method or 'tag_based',
                        'reasoning_extraction_config': reasoning_extraction_config,
                        'tag': reasoning_extraction_config.get('tag', 'thinking'),
                        'distillationPrompt': distillation_prompt
                    }
                    
                    response_data = llm_conversion_service.call_llm_with_thinking_process(
                        llm_config, prompt, thinking_config
                    )
                    
                    classifications = _parse_classification_response_with_thinking(
                        response_data, processing_config.get('dataset_type'), include_thinking_in_output
                    )
                    
                elif enable_thinking and not llm_config.supports_reasoning:
                    # 对于不支持推理的模型，先正常生成，再蒸馏思考过程
                    response = llm_conversion_service.call_llm(llm_config, prompt)
                    classifications = _parse_classification_response(response, processing_config.get('dataset_type'))
                    
                    # 为每个分类进行知识蒸馏
                    if distillation_prompt:
                        distillation_config = {
                            'distillation_prompt': distillation_prompt
                        }
                        
                        for classification in classifications:
                            try:
                                original_prompt = f"请对以下内容进行分类：\n{classification.get('text', '')}"
                                original_response = classification.get('label', '')
                                
                                distilled_data = llm_conversion_service.distill_thinking_process(
                                    llm_config, original_prompt, original_response, distillation_config
                                )
                                
                                if include_thinking_in_output and distilled_data.get('reasoning'):
                                    classification['thinking'] = distilled_data['reasoning']
                                
                                if distilled_data.get('final_answer'):
                                    classification['label'] = distilled_data['final_answer']
                                    
                            except Exception as distill_error:
                                logger.warning(f"蒸馏分类失败: {str(distill_error)}")
                                continue
                else:
                    # 普通调用方式
                    response = llm_conversion_service.call_llm(llm_config, prompt)
                    classifications = _parse_classification_response(response, processing_config.get('dataset_type'))
                
                # 检查这个块是否成功生成了数据
                if classifications and len(classifications) > 0:
                    classification_data.extend(classifications)
                    successful_chunks += 1
                else:
                    failed_chunks += 1
                    logger.warning(f"块 {i+1} 未生成任何分类数据")
                
            except Exception as e:
                failed_chunks += 1
                logger.warning(f"生成分类数据失败 块{i+1}: {str(e)}")
                continue
        
        # 计算成功率
        total_chunks = len(chunks)
        success_rate = (successful_chunks / total_chunks) * 100 if total_chunks > 0 else 0
        
        logger.info(f"块处理统计: 总数={total_chunks}, 成功={successful_chunks}, 失败={failed_chunks}, 成功率={success_rate:.1f}%")
        
        # 设置失败阈值
        if success_rate < 30.0:
            raise Exception(f"块处理成功率过低: {success_rate:.1f}%，可能是LLM服务不可用或配置错误")
        
        if len(classification_data) == 0:
            raise Exception("未生成任何分类数据，请检查LLM服务状态和配置")
        
        return classification_data
        
    except Exception as e:
        logger.error(f"生成分类数据失败: {str(e)}")
        raise

def _generate_generic_data(content: str, model_config: Dict, processing_config: Dict) -> List[Dict]:
    """生成通用文本数据"""
    try:
        llm_config_id = model_config.get('id')
        llm_config = LLMConfig.query.get(llm_config_id)
        
        # 如果有LLM配置且有自定义提示词，使用LLM处理
        custom_prompt = processing_config.get('custom_prompt', '')
        if llm_config and custom_prompt:
            chunk_size = processing_config.get('chunk_size', 2000)
            chunk_overlap = processing_config.get('chunk_overlap', 200)
            chunks = _split_content_into_chunks_with_overlap(content, chunk_size, chunk_overlap)
            
            generic_data = []
            successful_chunks = 0
            failed_chunks = 0
            
            for i, chunk in enumerate(chunks):
                try:
                    prompt = _build_custom_prompt_for_chunk(chunk, custom_prompt, processing_config)
                    response = llm_conversion_service.call_llm(llm_config, prompt)
                    
                    # 尝试解析为结构化数据
                    parsed_data = _parse_generic_response(response)
                    if parsed_data:
                        generic_data.extend(parsed_data)
                        successful_chunks += 1
                    else:
                        # 如果解析失败，使用原始响应
                        if response and response.strip():
                            generic_data.append({
                                'id': i + 1,
                                'content': response.strip(),
                                'source': 'llm_generated',
                                'type': 'generated_text'
                            })
                            successful_chunks += 1
                        else:
                            failed_chunks += 1
                            logger.warning(f"LLM处理块{i+1}返回空响应")
                        
                except Exception as e:
                    failed_chunks += 1
                    logger.warning(f"LLM处理块{i+1}失败: {str(e)}")
                    # 回退到简单分段
                    generic_data.append({
                        'id': i + 1,
                        'text': chunk.strip(),
                        'source': 'auto_segmented',
                        'type': 'text_segment'
                    })
            
            # 计算成功率
            total_chunks = len(chunks)
            success_rate = (successful_chunks / total_chunks) * 100 if total_chunks > 0 else 0
            
            logger.info(f"通用数据生成统计: 总数={total_chunks}, 成功={successful_chunks}, 失败={failed_chunks}, 成功率={success_rate:.1f}%")
            
            # 如果使用了LLM但成功率过低，抛出异常
            if success_rate < 30.0:
                raise Exception(f"LLM处理成功率过低: {success_rate:.1f}%，可能是LLM服务不可用或配置错误")
                
        else:
            # 简单的文本分段处理
            chunks = _split_content_into_chunks(content, processing_config.get('chunk_size', 1000))
            
            generic_data = []
            for i, chunk in enumerate(chunks):
                if chunk.strip():  # 确保块不为空
                    generic_data.append({
                        'id': i + 1,
                        'text': chunk.strip(),
                        'source': 'auto_segmented',
                        'type': 'text_segment'
                    })
        
        # 最终检查
        if not generic_data or len(generic_data) == 0:
            raise Exception("未生成任何通用数据，请检查内容或配置")
        
        return generic_data
        
    except Exception as e:
        logger.error(f"生成通用数据失败: {str(e)}")
        raise

def _parse_generic_response(response: str) -> List[Dict]:
    """解析通用响应"""
    try:
        import json
        import re
        
        # 尝试解析JSON
        try:
            data = json.loads(response)
            if isinstance(data, list):
                return data
            elif isinstance(data, dict):
                return [data]
        except:
            pass
        
        # 尝试提取JSON对象
        json_objects = re.findall(r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', response)
        if json_objects:
            parsed_objects = []
            for obj_str in json_objects:
                try:
                    obj = json.loads(obj_str)
                    parsed_objects.append(obj)
                except:
                    continue
            if parsed_objects:
                return parsed_objects
        
        return []
        
    except Exception as e:
        logger.error(f"解析通用响应失败: {str(e)}")
        return []

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

def _split_content_into_chunks_with_overlap(content: str, chunk_size: int, overlap: int) -> List[str]:
    """将内容分割成有重叠的块"""
    try:
        if len(content) <= chunk_size:
            return [content]
        
        chunks = []
        start = 0
        
        while start < len(content):
            end = min(start + chunk_size, len(content))
            
            # 尝试在合适的位置分割，优先考虑句子边界
            if end < len(content):
                # 向后查找句号
                for delimiter in ['。', '.', '！', '？', '\n\n', '\n']:
                    sentence_end = content.rfind(delimiter, start, end)
                    if sentence_end > start:
                        end = sentence_end + len(delimiter)
                        break
            
            chunk = content[start:end].strip()
            if chunk:
                chunks.append(chunk)
            
            # 计算下一个起始位置，考虑重叠
            start = max(start + chunk_size - overlap, end)
            
            # 避免无限循环
            if start >= len(content):
                break
        
        return chunks
        
    except Exception as e:
        logger.error(f"分割内容失败: {str(e)}")
        return [content]

def _build_custom_prompt_for_chunk(chunk: str, custom_prompt: str, processing_config: Dict) -> str:
    """为文档块构建自定义提示词"""
    try:
        # 使用前端生成的详细提示词作为基础
        base_prompt = custom_prompt
        
        # 添加文档块的具体内容
        prompt = f"{base_prompt}\n\n## 待处理文档内容\n{chunk}\n\n请严格按照上述要求处理这段文档内容。"
        
        return prompt
        
    except Exception as e:
        logger.error(f"构建自定义提示词失败: {str(e)}")
        # 回退到基础提示词
        return f"请处理以下文档内容：\n\n{chunk}"

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

def _parse_qa_response(response: str, dataset_type: str = None) -> List[Dict]:
    """解析问答响应"""
    try:
        import json
        import re
        
        # 清理响应内容
        response = response.strip()
        
        # 尝试直接解析JSON
        try:
            qa_pairs = json.loads(response)
            if isinstance(qa_pairs, list):
                return _standardize_qa_format(qa_pairs, dataset_type)
        except:
            pass
        
        # 尝试提取JSON数组
        json_array_pattern = r'\[.*?\]'
        json_matches = re.findall(json_array_pattern, response, re.DOTALL)
        for match in json_matches:
            try:
                qa_pairs = json.loads(match)
                if isinstance(qa_pairs, list) and len(qa_pairs) > 0:
                    return _standardize_qa_format(qa_pairs, dataset_type)
            except:
                continue
        
        # 尝试提取多个JSON对象
        # 改进的正则表达式，可以匹配多个独立的JSON对象，即使它们之间没有逗号或数组包裹
        json_object_pattern = r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}'
        json_objects = re.findall(json_object_pattern, response)
        if json_objects:
            parsed_objects = []
            for obj_str in json_objects:
                try:
                    obj = json.loads(obj_str)
                    if isinstance(obj, dict):
                        parsed_objects.append(obj)
                except json.JSONDecodeError as e:
                    logger.warning(f"解析单个JSON对象失败: {obj_str[:100]}..., 错误: {e}")
                    continue
            if parsed_objects:
                logger.info(f"成功从响应中提取 {len(parsed_objects)} 个JSON对象")
                return _standardize_qa_format(parsed_objects, dataset_type)
        
        # 尝试基于模式匹配提取问答对
        qa_pairs = _extract_qa_pairs_from_text(response)
        if qa_pairs:
            return _standardize_qa_format(qa_pairs, dataset_type)
        
        # 记录失败信息用于调试
        logger.warning(f"无法解析问答响应，响应内容前500字符: {response[:500]}")
        return []
        
    except Exception as e:
        logger.error(f"解析问答响应失败: {str(e)}")
        return []

def _standardize_qa_format(qa_pairs: List[Dict], dataset_type: str = None) -> List[Dict]:
    """标准化问答对格式"""
    standardized = []
    
    for qa in qa_pairs:
        if not isinstance(qa, dict):
            continue
        
        # 提取问题和答案，支持多种字段名
        question = qa.get('question') or qa.get('q') or qa.get('instruction') or qa.get('prompt', '')
        answer = qa.get('answer') or qa.get('a') or qa.get('output') or qa.get('response', '')
        
        if question and answer:
            # 根据数据集类型标准化格式
            if dataset_type == 'instruction-tuning':
                standardized_qa = {
                    'instruction': question,
                    'input': qa.get('input', ''),
                    'output': answer,
                    'type': qa.get('type', 'instruction')
                }
            else:
                # 默认问答对格式
                standardized_qa = {
                    'question': question,
                    'answer': answer,
                    'type': qa.get('type', 'qa')
                }
            
            # 添加额外的元数据
            if 'confidence' in qa:
                standardized_qa['confidence'] = qa['confidence']
            if 'category' in qa:
                standardized_qa['category'] = qa['category']
            
            standardized.append(standardized_qa)
    
    return standardized

def _extract_qa_pairs_from_text(text: str) -> List[Dict]:
    """从文本中提取问答对"""
    import re
    
    qa_pairs = []
    
    # 模式1: Q: ... A: ... 格式
    pattern1 = r'Q[:\s]*(.+?)\s*A[:\s]*(.+?)(?=Q:|$)'
    matches1 = re.findall(pattern1, text, re.DOTALL | re.IGNORECASE)
    for question, answer in matches1:
        qa_pairs.append({
            'question': question.strip(),
            'answer': answer.strip(),
            'type': 'extracted'
        })
    
    # 模式2: 问: ... 答: ... 格式
    pattern2 = r'问[:\s]*(.+?)\s*答[:\s]*(.+?)(?=问:|$)'
    matches2 = re.findall(pattern2, text, re.DOTALL)
    for question, answer in matches2:
        qa_pairs.append({
            'question': question.strip(),
            'answer': answer.strip(),
            'type': 'extracted'
        })
    
    return qa_pairs

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

def _parse_instruction_response(response: str, dataset_type: str = None) -> List[Dict]:
    """解析指令响应"""
    try:
        import json
        import re
        
        # 清理响应内容
        response = response.strip()
        
        # 尝试直接解析JSON
        try:
            instruction_data = json.loads(response)
            if isinstance(instruction_data, list):
                return _standardize_instruction_format(instruction_data, dataset_type)
        except:
            pass
        
        # 尝试提取JSON数组
        json_array_pattern = r'\[.*?\]'
        json_matches = re.findall(json_array_pattern, response, re.DOTALL)
        for match in json_matches:
            try:
                instruction_data = json.loads(match)
                if isinstance(instruction_data, list) and len(instruction_data) > 0:
                    return _standardize_instruction_format(instruction_data, dataset_type)
            except:
                continue
        
        # 尝试提取多个JSON对象
        json_object_pattern = r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}'
        json_objects = re.findall(json_object_pattern, response)
        if json_objects:
            parsed_objects = []
            for obj_str in json_objects:
                try:
                    obj = json.loads(obj_str)
                    if isinstance(obj, dict):
                        parsed_objects.append(obj)
                except:
                    continue
            if parsed_objects:
                return _standardize_instruction_format(parsed_objects, dataset_type)
        
        # 记录实际响应内容以便调试
        logger.warning(f"无法解析指令响应，响应内容前500字符: {response[:500]}")
        return []
        
    except Exception as e:
        logger.error(f"解析指令响应失败: {str(e)}")
        return []

def _parse_classification_response(response: str, dataset_type: str = None) -> List[Dict]:
    """解析分类响应"""
    try:
        import json
        import re
        
        # 清理响应内容
        response = response.strip()
        
        # 尝试直接解析JSON
        try:
            classification_data = json.loads(response)
            if isinstance(classification_data, list):
                return _standardize_classification_format(classification_data, dataset_type)
        except:
            pass
        
        # 尝试提取JSON数组
        json_array_pattern = r'\[.*?\]'
        json_matches = re.findall(json_array_pattern, response, re.DOTALL)
        for match in json_matches:
            try:
                classification_data = json.loads(match)
                if isinstance(classification_data, list) and len(classification_data) > 0:
                    return _standardize_classification_format(classification_data, dataset_type)
            except:
                continue
        
        # 尝试提取多个JSON对象
        json_object_pattern = r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}'
        json_objects = re.findall(json_object_pattern, response)
        if json_objects:
            parsed_objects = []
            for obj_str in json_objects:
                try:
                    obj = json.loads(obj_str)
                    if isinstance(obj, dict):
                        parsed_objects.append(obj)
                except:
                    continue
            if parsed_objects:
                return _standardize_classification_format(parsed_objects, dataset_type)
        
        # 记录实际响应内容以便调试
        logger.warning(f"无法解析分类响应，响应内容前500字符: {response[:500]}")
        return []
        
    except Exception as e:
        logger.error(f"解析分类响应失败: {str(e)}")
        return []

def _standardize_instruction_format(instructions: List[Dict], dataset_type: str = None) -> List[Dict]:
    """标准化指令格式"""
    standardized = []
    
    for inst in instructions:
        if not isinstance(inst, dict):
            continue
        
        # 提取指令、输入和输出，支持多种字段名
        instruction = inst.get('instruction') or inst.get('prompt') or inst.get('task', '')
        input_text = inst.get('input') or inst.get('context') or ''
        output_text = inst.get('output') or inst.get('response') or inst.get('answer', '')
        
        if instruction and output_text:
            standardized_inst = {
                'instruction': instruction,
                'input': input_text,
                'output': output_text,
                'type': inst.get('type', 'instruction')
            }
            
            # 添加额外的元数据
            for key in ['difficulty', 'category', 'domain', 'tags']:
                if key in inst:
                    standardized_inst[key] = inst[key]
            
            standardized.append(standardized_inst)
    
    return standardized

def _standardize_classification_format(classifications: List[Dict], dataset_type: str = None) -> List[Dict]:
    """标准化分类格式"""
    standardized = []
    
    for cls in classifications:
        if not isinstance(cls, dict):
            continue
        
        # 提取文本和标签，支持多种字段名
        text = cls.get('text') or cls.get('content') or cls.get('input', '')
        label = cls.get('label') or cls.get('category') or cls.get('class', '')
        
        if text and label:
            standardized_cls = {
                'text': text,
                'label': label,
                'type': 'classification'
            }
            
            # 添加额外的元数据
            for key in ['confidence', 'reason', 'probability', 'score']:
                if key in cls:
                    standardized_cls[key] = cls[key]
            
            standardized.append(standardized_cls)
    
    return standardized

def _save_generated_data(version: EnhancedDatasetVersion, original_filename: str, 
                        generated_data: List[Dict], file_data: Dict, 
                        processing_config: Dict = None) -> EnhancedDatasetFile:
    """保存生成的数据文件"""
    try:
        import json
        import tempfile
        
        # 获取输出格式配置
        output_format = processing_config.get('output_format', 'JSONL') if processing_config else 'JSONL'
        dataset_type = processing_config.get('dataset_type', 'qa') if processing_config else 'qa'
        
        logger.info(f"准备保存数据 - 格式: {output_format}, 类型: {dataset_type}, 条目数: {len(generated_data)}")
        
        # 转换数据格式
        converted_data = _convert_to_training_format(generated_data, output_format, dataset_type)
        
        # 准备文件名和扩展名
        base_name = os.path.splitext(original_filename)[0]
        
        if output_format.upper() in ['CSV']:
            file_extension = '.csv'
            content_type = 'text/csv'
        elif output_format.upper() in ['ALPACA', 'SHAREGPT', 'OPENAI']:
            file_extension = '.jsonl'
            content_type = 'application/jsonl'
        else:
            file_extension = '.jsonl'
            content_type = 'application/jsonl'
        
        generated_filename = f"{base_name}_generated_{dataset_type}{file_extension}"
        
        # 生成文件内容
        if output_format.upper() == 'CSV':
            file_content = _generate_csv_content(converted_data)
        else:
            # JSONL格式
            file_content = '\n'.join([json.dumps(item, ensure_ascii=False) for item in converted_data])
        
        # 创建临时文件
        with tempfile.NamedTemporaryFile(mode='w', encoding='utf-8', suffix=file_extension, delete=False) as tmp_file:
            tmp_file.write(file_content)
            tmp_file_path = tmp_file.name
        
        try:
            # 上传到MinIO
            object_name = f"datasets/{version.dataset_id}/{version.version}/generated/{generated_filename}"
            
            # 使用upload_file_from_path方法
            bucket_name = current_app.config.get('MINIO_DATASETS_BUCKET', 'datasets')
            file_size = storage_service.upload_file_from_path(
                tmp_file_path, object_name, content_type, bucket_name
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
                file_type='json' if file_extension == '.jsonl' else 'csv',
                file_size=file_size,
                checksum=checksum,
                minio_bucket=current_app.config.get('MINIO_DATASETS_BUCKET', 'datasets'),
                minio_object_name=uploaded_object,
                file_metadata={
                    'original_file': original_filename,
                    'generation_type': 'auto_generated',
                    'entries_count': len(converted_data),
                    'dataset_type': dataset_type,
                    'output_format': output_format,
                    'source_file_data': file_data
                },
                preview_data={
                    'type': output_format.lower(),
                    'sample_entries': converted_data[:3],  # 保存前3个条目作为预览
                    'total_entries': len(converted_data),
                    'format_info': {
                        'name': output_format,
                        'description': f'{dataset_type}类型的{output_format}格式数据',
                        'file_extension': file_extension
                    }
                }
            )
            
            db.session.add(dataset_file)
            db.session.flush()
            
            logger.info(f"保存生成数据文件: {generated_filename}, 格式: {output_format}, "
                       f"大小: {file_size} 字节, 条目数: {len(converted_data)}")
            
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

def _convert_to_training_format(data: List[Dict], output_format: str, dataset_type: str) -> List[Dict]:
    """将数据转换为训练格式"""
    try:
        converted_data = []
        format_upper = output_format.upper()
        
        for item in data:
            if not isinstance(item, dict):
                continue
            
            converted_item = None
            
            if format_upper == 'ALPACA':
                converted_item = _convert_to_alpaca_format(item, dataset_type)
            elif format_upper == 'SHAREGPT':
                converted_item = _convert_to_sharegpt_format(item, dataset_type)
            elif format_upper == 'OPENAI':
                converted_item = _convert_to_openai_format(item, dataset_type)
            elif format_upper == 'CSV':
                converted_item = _convert_to_csv_format(item, dataset_type)
            else:
                # 默认保持原格式
                converted_item = item
            
            if converted_item:
                converted_data.append(converted_item)
        
        logger.info(f"格式转换完成: {output_format}, 原始条目: {len(data)}, 转换后条目: {len(converted_data)}")
        return converted_data
        
    except Exception as e:
        logger.error(f"格式转换失败: {str(e)}")
        return data  # 返回原始数据

def _convert_to_alpaca_format(item: Dict, dataset_type: str) -> Dict:
    """转换为Alpaca格式"""
    if dataset_type in ['qa-pairs', 'qa']:
        result = {
            'instruction': item.get('question', item.get('instruction', '')),
            'input': '',
            'output': item.get('answer', item.get('output', ''))
        }
        # 如果有思考过程，添加到结果中
        if 'thinking' in item and item['thinking']:
            result['thinking'] = item['thinking']
        return result
    elif dataset_type == 'instruction-tuning':
        result = {
            'instruction': item.get('instruction', ''),
            'input': item.get('input', ''),
            'output': item.get('output', '')
        }
        if 'thinking' in item and item['thinking']:
            result['thinking'] = item['thinking']
        return result
    elif dataset_type == 'text-classification':
        result = {
            'instruction': f"请对以下文本进行分类：{item.get('text', '')}",
            'input': '',
            'output': item.get('label', '')
        }
        if 'thinking' in item and item['thinking']:
            result['thinking'] = item['thinking']
        return result
    else:
        return item

def _convert_to_sharegpt_format(item: Dict, dataset_type: str) -> Dict:
    """转换为ShareGPT格式"""
    if dataset_type in ['qa-pairs', 'qa']:
        conversations = [
            {'role': 'user', 'content': item.get('question', item.get('instruction', ''))},
            {'role': 'assistant', 'content': item.get('answer', item.get('output', ''))}
        ]
        # 如果有思考过程，在助手回复前添加思考过程
        if 'thinking' in item and item['thinking']:
            conversations.insert(1, {'role': 'assistant', 'content': f"<thinking>\n{item['thinking']}\n</thinking>"})
        return {'conversations': conversations}
    elif dataset_type == 'instruction-tuning':
        user_content = item.get('instruction', '')
        if item.get('input'):
            user_content += f"\n\n{item.get('input')}"
        
        conversations = [
            {'role': 'user', 'content': user_content},
            {'role': 'assistant', 'content': item.get('output', '')}
        ]
        if 'thinking' in item and item['thinking']:
            conversations.insert(1, {'role': 'assistant', 'content': f"<thinking>\n{item['thinking']}\n</thinking>"})
        return {'conversations': conversations}
    elif dataset_type == 'text-classification':
        conversations = [
            {'role': 'user', 'content': f"请对以下文本进行分类：{item.get('text', '')}"},
            {'role': 'assistant', 'content': f"分类结果：{item.get('label', '')}"}
        ]
        if 'thinking' in item and item['thinking']:
            conversations.insert(1, {'role': 'assistant', 'content': f"<thinking>\n{item['thinking']}\n</thinking>"})
        return {'conversations': conversations}
    else:
        return item

def _convert_to_openai_format(item: Dict, dataset_type: str) -> Dict:
    """转换为OpenAI格式"""
    if dataset_type in ['qa-pairs', 'qa']:
        messages = [
            {'role': 'user', 'content': item.get('question', item.get('instruction', ''))},
            {'role': 'assistant', 'content': item.get('answer', item.get('output', ''))}
        ]
        # 如果有思考过程，在助手回复前添加思考过程
        if 'thinking' in item and item['thinking']:
            messages.insert(1, {'role': 'assistant', 'content': f"<thinking>\n{item['thinking']}\n</thinking>"})
        return {'messages': messages}
    elif dataset_type == 'instruction-tuning':
        user_content = item.get('instruction', '')
        if item.get('input'):
            user_content += f"\n\n{item.get('input')}"
        
        messages = [
            {'role': 'user', 'content': user_content},
            {'role': 'assistant', 'content': item.get('output', '')}
        ]
        if 'thinking' in item and item['thinking']:
            messages.insert(1, {'role': 'assistant', 'content': f"<thinking>\n{item['thinking']}\n</thinking>"})
        return {'messages': messages}
    elif dataset_type == 'text-classification':
        messages = [
            {'role': 'user', 'content': f"请对以下文本进行分类：{item.get('text', '')}"},
            {'role': 'assistant', 'content': f"分类结果：{item.get('label', '')}"}
        ]
        if 'thinking' in item and item['thinking']:
            messages.insert(1, {'role': 'assistant', 'content': f"<thinking>\n{item['thinking']}\n</thinking>"})
        return {'messages': messages}
    else:
        return item

def _convert_to_csv_format(item: Dict, dataset_type: str) -> Dict:
    """转换为CSV格式"""
    if dataset_type in ['qa-pairs', 'qa']:
        result = {
            'question': item.get('question', item.get('instruction', '')),
            'answer': item.get('answer', item.get('output', ''))
        }
        if 'thinking' in item and item['thinking']:
            result['thinking'] = item['thinking']
        return result
    elif dataset_type == 'instruction-tuning':
        result = {
            'instruction': item.get('instruction', ''),
            'input': item.get('input', ''),
            'output': item.get('output', '')
        }
        if 'thinking' in item and item['thinking']:
            result['thinking'] = item['thinking']
        return result
    elif dataset_type == 'text-classification':
        result = {
            'text': item.get('text', ''),
            'label': item.get('label', '')
        }
        if 'thinking' in item and item['thinking']:
            result['thinking'] = item['thinking']
        return result
    else:
        return item

def _generate_csv_content(data: List[Dict]) -> str:
    """生成CSV文件内容"""
    import csv
    import io
    
    if not data:
        return ''
    
    # 获取所有字段名
    fieldnames = set()
    for item in data:
        fieldnames.update(item.keys())
    fieldnames = sorted(list(fieldnames))
    
    # 生成CSV内容
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(data)
    
    return output.getvalue()

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

def _parse_qa_response_with_thinking(response_data: Dict, dataset_type: str = None, include_thinking: bool = False) -> List[Dict]:
    """解析包含思考过程的问答对响应
    
    Args:
        response_data: 包含raw_response、final_answer、reasoning的字典
        dataset_type: 数据集类型
        include_thinking: 是否在输出中包含思考过程
        
    Returns:
        List[Dict]: 问答对列表
    """
    try:
        # 先从final_answer中解析问答对
        final_answer = response_data.get('final_answer', '')
        reasoning = response_data.get('reasoning', '')
        
        # 使用现有的解析方法解析问答对
        qa_pairs = _parse_qa_response(final_answer, dataset_type)
        
        # 如果需要包含思考过程，为每个问答对添加思考过程
        if include_thinking and reasoning:
            for qa_pair in qa_pairs:
                qa_pair['thinking'] = reasoning
                
        return qa_pairs
        
    except Exception as e:
        logger.error(f"解析包含思考过程的问答对失败: {str(e)}")
        # 如果解析失败，尝试从原始响应解析
        try:
            raw_response = response_data.get('raw_response', '')
            return _parse_qa_response(raw_response, dataset_type)
        except:
            return []

def _parse_summary_response_with_thinking(response_data: Dict, original_text: str, include_thinking: bool = False) -> List[Dict]:
    """解析包含思考过程的摘要响应"""
    try:
        final_answer = response_data.get('final_answer', '')
        reasoning = response_data.get('reasoning', '')
        
        # 使用现有的解析方法解析摘要
        summary_entries = _parse_summary_response(final_answer, original_text)
        
        # 如果需要包含思考过程，为每个摘要添加思考过程
        if include_thinking and reasoning:
            for entry in summary_entries:
                entry['thinking'] = reasoning
                
        return summary_entries
        
    except Exception as e:
        logger.error(f"解析包含思考过程的摘要失败: {str(e)}")
        try:
            raw_response = response_data.get('raw_response', '')
            return _parse_summary_response(raw_response, original_text)
        except:
            return []

def _parse_instruction_response_with_thinking(response_data: Dict, dataset_type: str = None, include_thinking: bool = False) -> List[Dict]:
    """解析包含思考过程的指令响应"""
    try:
        final_answer = response_data.get('final_answer', '')
        reasoning = response_data.get('reasoning', '')
        
        # 使用现有的解析方法解析指令
        instructions = _parse_instruction_response(final_answer, dataset_type)
        
        # 如果需要包含思考过程，为每个指令添加思考过程
        if include_thinking and reasoning:
            for instruction in instructions:
                instruction['thinking'] = reasoning
                
        return instructions
        
    except Exception as e:
        logger.error(f"解析包含思考过程的指令失败: {str(e)}")
        try:
            raw_response = response_data.get('raw_response', '')
            return _parse_instruction_response(raw_response, dataset_type)
        except:
            return []

def _parse_classification_response_with_thinking(response_data: Dict, dataset_type: str = None, include_thinking: bool = False) -> List[Dict]:
    """解析包含思考过程的分类响应"""
    try:
        final_answer = response_data.get('final_answer', '')
        reasoning = response_data.get('reasoning', '')
        
        # 使用现有的解析方法解析分类
        classifications = _parse_classification_response(final_answer, dataset_type)
        
        # 如果需要包含思考过程，为每个分类添加思考过程
        if include_thinking and reasoning:
            for classification in classifications:
                classification['thinking'] = reasoning
                
        return classifications
        
    except Exception as e:
        logger.error(f"解析包含思考过程的分类失败: {str(e)}")
        try:
            raw_response = response_data.get('raw_response', '')
            return _parse_classification_response(raw_response, dataset_type)
        except:
            return [] 