#!/usr/bin/env python3
"""
DataFlow Integration Module
============================

This module provides integration with the OpenDCAI DataFlow system.
It includes utilities for text processing, reasoning enhancement, and knowledge base cleaning.
"""

import sys
import os
import logging
from pathlib import Path

# 添加 DataFlow 到 Python 路径
PROJECT_ROOT = Path(__file__).parent
DATAFLOW_PATH = PROJECT_ROOT / "Dataflow"

# 设置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class DataFlowIntegration:
    """DataFlow 集成类"""
    
    def __init__(self):
        """初始化 DataFlow 集成"""
        self.dataflow_available = False
        self.dataflow_path_exists = DATAFLOW_PATH.exists()
        self.error_message = None
        self._init_dataflow()
    
    def _init_dataflow(self):
        """初始化 DataFlow 模块"""
        try:
            # 检查DataFlow目录是否存在
            if not self.dataflow_path_exists:
                self.error_message = f"DataFlow目录不存在: {DATAFLOW_PATH}"
                logger.warning(self.error_message)
                return
            
            # 添加DataFlow路径到sys.path
            if str(DATAFLOW_PATH) not in sys.path:
                sys.path.insert(0, str(DATAFLOW_PATH))
            
            # 尝试导入 DataFlow 真实模块
            try:
                # 导入预训练过滤流水线
                from dataflow.statics.pipelines.cpu_pipelines.text_pt_filter import PTTextPipeline
                from dataflow.statics.pipelines.cpu_pipelines.text_sft_filter import SFTTextPipeline
                from dataflow.utils.storage import FileStorage
                
                # 存储真实的pipeline类
                self.PTTextPipeline = PTTextPipeline
                self.SFTTextPipeline = SFTTextPipeline
                self.ChineseTextPipeline = ChineseTextPipeline  # 添加中文友好的pipeline
                self.FileStorage = FileStorage
                self.dataflow_available = True
                
                logger.info("DataFlow 模块加载成功")
                
            except ImportError as e:
                logger.warning(f"DataFlow 模块导入失败: {e}")
                self.dataflow_available = False
                self.error_message = f"DataFlow模块导入失败: {e}"
                logger.warning("DataFlow功能将使用模拟模式")
                
        except Exception as e:
            logger.error(f"初始化DataFlow失败: {e}")
            self.dataflow_available = False
            self.error_message = f"DataFlow初始化失败: {e}"
    
    def is_available(self):
        """检查 DataFlow 是否可用"""
        return self.dataflow_available
    
    def create_pretrain_filter_pipeline(self, config=None):
        """创建预训练数据过滤管道"""
        if not self.dataflow_available:
            logger.info("DataFlow不可用，使用模拟模式创建预训练数据过滤管道")
            return MockPipeline("pretrain_filter", config)
        
        try:
            # 如果DataFlow实际可用，优先使用中文友好的pipeline
            if hasattr(self, 'ChineseTextPipeline'):
                logger.info("使用中文友好的DataFlow管道")
                return DataFlowPipelineWrapper(self.ChineseTextPipeline, "chinese_pretrain_filter")
            elif hasattr(self, 'PTTextPipeline'):
                logger.info("使用标准DataFlow预训练过滤管道")
                return DataFlowPipelineWrapper(self.PTTextPipeline, "pretrain_filter")
            else:
                # 使用模拟模式
                logger.info("使用模拟模式创建预训练数据过滤管道")
                return MockPipeline("pretrain_filter", config)
            
        except Exception as e:
            logger.error(f"创建预训练数据过滤管道失败: {e}")
            # 返回模拟管道而不是抛出异常
            return MockPipeline("pretrain_filter", config)
    
    def create_sft_filter_pipeline(self, config=None):
        """创建SFT数据过滤管道"""
        if not self.dataflow_available:
            logger.info("DataFlow不可用，使用模拟模式创建SFT数据过滤管道")
            return MockPipeline("sft_filter", config)
        
        try:
            # 如果DataFlow实际可用，使用真实的pipeline
            if hasattr(self, 'SFTTextPipeline'):
                logger.info("使用DataFlow创建SFT数据过滤管道")
                return DataFlowPipelineWrapper(self.SFTTextPipeline, "sft_filter")
            else:
                # 使用模拟模式
                logger.info("使用模拟模式创建SFT数据过滤管道")
                return MockPipeline("sft_filter", config)
            
        except Exception as e:
            logger.error(f"创建SFT数据过滤管道失败: {e}")
            # 返回模拟管道而不是抛出异常
            return MockPipeline("sft_filter", config)
    
    def create_pretrain_synthetic_pipeline(self, config=None):
        """创建预训练数据合成管道（类phi-4）"""
        if not self.dataflow_available:
            raise RuntimeError("DataFlow 未正确加载")
        
        try:
            config = config or {
                "model_name": "Qwen/Qwen2.5-7B-Instruct",
                "max_tokens": 8192,
                "temperature": 0.7,
                "qa_pairs_per_chunk": 3,
                "chunk_size": 1000,
                "chunk_overlap": 200
            }
            
            if hasattr(self, 'dataflow'):
                pipeline = self.dataflow.create_pipeline("pretrain_synthetic", config)
                logger.info("预训练数据合成管道创建成功")
                return pipeline
            else:
                logger.info("使用模拟模式创建预训练数据合成管道")
                return MockPipeline("pretrain_synthetic", config)
            
        except Exception as e:
            logger.error(f"创建预训练数据合成管道失败: {e}")
            return MockPipeline("pretrain_synthetic", config)
    
    def create_reasoning_pipeline(self, config=None):
        """创建推理增强管道"""
        if not self.dataflow_available:
            raise RuntimeError("DataFlow 未正确加载")
        
        try:
            config = config or {
                "model_name": "gpt-4",
                "chain_of_thought": True,
                "difficulty_estimation": True
            }
            
            if hasattr(self, 'dataflow'):
                pipeline = self.dataflow.create_pipeline("reasoning", config)
                logger.info("推理增强管道创建成功")
                return pipeline
            else:
                logger.info("使用模拟模式创建推理增强管道")
                return MockPipeline("reasoning", config)
            
        except Exception as e:
            logger.error(f"创建推理增强管道失败: {e}")
            return MockPipeline("reasoning", config)
    
    def create_knowledge_base_pipeline(self, config=None):
        """创建知识库清理管道"""
        if not self.dataflow_available:
            raise RuntimeError("DataFlow 未正确加载")
        
        try:
            config = config or {
                "chunk_size": 1000,
                "chunk_overlap": 200,
                "quality_threshold": 0.8
            }
            
            if hasattr(self, 'dataflow'):
                pipeline = self.dataflow.create_pipeline("knowledge_base", config)
                logger.info("知识库清理管道创建成功")
                return pipeline
            else:
                logger.info("使用模拟模式创建知识库清理管道")
                return MockPipeline("knowledge_base", config)
            
        except Exception as e:
            logger.error(f"创建知识库清理管道失败: {e}")
            return MockPipeline("knowledge_base", config)
    
    def process_text_data(self, text_data, pipeline_type="pretrain_filter", config=None):
        """处理文本数据"""
        if not self.dataflow_available:
            logger.warning("DataFlow 不可用，返回原始数据")
            return text_data
        
        try:
            if pipeline_type == "pretrain_filter":
                pipeline = self.create_pretrain_filter_pipeline(config)
            elif pipeline_type == "sft_filter":
                pipeline = self.create_sft_filter_pipeline(config)
            elif pipeline_type == "pretrain_synthetic":
                pipeline = self.create_pretrain_synthetic_pipeline(config)
            elif pipeline_type == "reasoning":
                pipeline = self.create_reasoning_pipeline(config)
            elif pipeline_type == "knowledge_base":
                pipeline = self.create_knowledge_base_pipeline(config)
            else:
                raise ValueError(f"不支持的管道类型: {pipeline_type}")
            
            # 处理数据
            processed_data = pipeline.process(text_data)
            logger.info(f"使用 {pipeline_type} 管道处理数据完成")
            return processed_data
            
        except Exception as e:
            logger.error(f"处理文本数据失败: {e}")
            return text_data
    
    def process_markdown_files(self, file_paths, pipeline_type="pretrain_filter", config=None):
        """批量处理Markdown文件"""
        if not self.dataflow_available:
            logger.warning("DataFlow 不可用，跳过处理")
            return []
        
        results = []
        try:
            for file_path in file_paths:
                try:
                    # 读取Markdown文件
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    # 处理内容
                    processed_content = self.process_text_data(content, pipeline_type, config)
                    
                    results.append({
                        'file_path': file_path,
                        'original_content': content,
                        'processed_content': processed_content,
                        'status': 'success'
                    })
                    
                except Exception as e:
                    logger.error(f"处理文件 {file_path} 失败: {e}")
                    results.append({
                        'file_path': file_path,
                        'status': 'failed',
                        'error': str(e)
                    })
            
            return results
            
        except Exception as e:
            logger.error(f"批量处理文件失败: {e}")
            return results
    
    def health_check(self):
        """健康检查"""
        status = {
            "dataflow_available": self.dataflow_available,
            "dataflow_path": str(DATAFLOW_PATH),
            "dataflow_exists": self.dataflow_path_exists,
            "version": "1.0.0"
        }
        
        if self.error_message:
            status["error_message"] = self.error_message
        
        if self.dataflow_available and hasattr(self, 'dataflow'):
            try:
                # 检查核心模块
                from dataflow import __version__
                status["dataflow_version"] = __version__
            except:
                status["dataflow_version"] = "unknown"
        else:
            status["dataflow_version"] = "mock_mode"
        
        return status


class DataFlowPipelineWrapper:
    """DataFlow管道封装器，用于适配我们的接口"""
    
    def __init__(self, pipeline_class, pipeline_type):
        self.pipeline_class = pipeline_class
        self.pipeline_type = pipeline_type
        logger.info(f"创建DataFlow管道: {pipeline_type}")
    
    def process(self, text_data):
        """处理数据，适配DataFlow的接口"""
        import tempfile
        import json
        import os
        
        try:
            # 创建临时目录
            with tempfile.TemporaryDirectory() as temp_dir:
                input_file = os.path.join(temp_dir, "input.jsonl")
                cache_dir = os.path.join(temp_dir, "cache")
                os.makedirs(cache_dir, exist_ok=True)
                
                # 准备输入数据
                input_data = {"raw_content": text_data}
                with open(input_file, 'w', encoding='utf-8') as f:
                    json.dump(input_data, f, ensure_ascii=False)
                    f.write('\n')
                
                # 创建自定义的pipeline实例
                pipeline = self.pipeline_class()
                # 修改storage配置以使用我们的临时文件
                from dataflow.utils.storage import FileStorage
                pipeline.storage = FileStorage(
                    first_entry_file_name=input_file,
                    cache_path=cache_dir,
                    file_name_prefix="dataflow_cache_step",
                    cache_type="jsonl",
                )
                
                # 执行pipeline
                logger.info(f"开始执行DataFlow管道: {self.pipeline_type}")
                pipeline.forward()
                
                # 获取最终结果
                result_files = [f for f in os.listdir(cache_dir) if f.endswith('.jsonl')]
                if result_files:
                    # 使用最新的文件
                    latest_file = max(result_files, key=lambda x: os.path.getmtime(os.path.join(cache_dir, x)))
                    result_file = os.path.join(cache_dir, latest_file)
                    
                    # 读取结果
                    processed_data = []
                    with open(result_file, 'r', encoding='utf-8') as f:
                        for line in f:
                            if line.strip():
                                try:
                                    data = json.loads(line)
                                    processed_data.append(data)
                                except json.JSONDecodeError:
                                    continue
                    
                    if processed_data:
                        logger.info(f"DataFlow管道处理完成，处理了 {len(processed_data)} 条数据")
                        return processed_data
                    else:
                        logger.warning("DataFlow管道处理后无数据保留，可能被过滤器过滤掉了")
                        # 返回包含原始数据的结果，标记为被过滤
                        return [{
                            "raw_content": text_data,
                            "filtered": True,
                            "reason": "数据被DataFlow过滤器过滤掉"
                        }]
                else:
                    logger.warning("DataFlow管道未生成结果文件")
                    return [{
                        "raw_content": text_data,
                        "filtered": False,
                        "reason": "DataFlow管道未生成结果文件"
                    }]
                
        except Exception as e:
            logger.error(f"DataFlow管道处理失败: {e}")
            # 返回包含原始数据的结果，标记为处理失败
            return [{
                "raw_content": text_data,
                "error": True,
                "reason": f"DataFlow处理失败: {str(e)}"
            }]


class MockPipeline:
    """模拟DataFlow管道，用于测试和开发"""
    
    def __init__(self, pipeline_type, config):
        self.pipeline_type = pipeline_type
        self.config = config
        logger.info(f"创建模拟管道: {pipeline_type}")
    
    def process(self, text_data):
        """模拟处理数据"""
        logger.info(f"使用模拟管道 {self.pipeline_type} 处理数据")
        
        # 根据管道类型返回不同的模拟结果
        if self.pipeline_type == "pretrain_filter":
            return f"[预训练过滤] {text_data}"
        elif self.pipeline_type == "pretrain_synthetic":
            return f"[预训练合成] 基于输入: {text_data[:100]}... 生成的合成数据"
        elif self.pipeline_type == "reasoning":
            return f"[推理增强] {text_data}"
        elif self.pipeline_type == "knowledge_base":
            return f"[知识库清理] {text_data}"
        else:
            return text_data


class ChineseTextPipeline:
    """中文友好的DataFlow管道"""
    
    def __init__(self):
        self.storage = None  # 将在运行时设置
        self._init_operators()
    
    def _init_operators(self):
        """初始化操作符，使用对中文友好的参数"""
        try:
            from dataflow.operators.refine.GeneralText import (
                RemoveExtraSpacesRefiner,
                RemoveEmojiRefiner,
                HtmlUrlRemoverRefiner
            )
            from dataflow.operators.process.GeneralText import (
                ContentNullFilter,
                CharNumberFilter,
                SentenceNumberFilter,
                WatermarkFilter
            )
            
            # 使用基本的refine操作符
            self.remove_extra_spaces_refiner = RemoveExtraSpacesRefiner()
            self.remove_emoji_refiner = RemoveEmojiRefiner()
            self.html_remove_refiner = HtmlUrlRemoverRefiner()
            
            # 使用对中文友好的过滤器
            self.content_null_filter = ContentNullFilter()
            self.char_number_filter = CharNumberFilter(threshold=50)  # 降低字符数要求
            self.sentence_number_filter = SentenceNumberFilter(min_sentences=1, max_sentences=10000)  # 更宽松的句子数要求
            self.watermark_filter = WatermarkFilter(watermarks=['Copyright', 'Watermark', 'Confidential', '版权', '水印'])
            
            logger.info("中文友好管道操作符初始化成功")
            
        except ImportError as e:
            logger.error(f"无法导入DataFlow操作符: {e}")
            raise
    
    def forward(self):
        """执行管道处理"""
        try:
            # 清理和预处理
            self.remove_extra_spaces_refiner.run(
                storage=self.storage.step(),
                input_key="raw_content"
            )
            self.remove_emoji_refiner.run(
                storage=self.storage.step(),
                input_key="raw_content"
            )
            self.html_remove_refiner.run(
                storage=self.storage.step(),
                input_key="raw_content"
            )
            
            # 基本质量过滤
            self.content_null_filter.run(
                storage=self.storage.step(),
                input_key='raw_content',
            )
            self.char_number_filter.run(
                storage=self.storage.step(),
                input_key='raw_content',
            )
            self.sentence_number_filter.run(
                storage=self.storage.step(),
                input_key='raw_content'
            )
            self.watermark_filter.run(
                storage=self.storage.step(),
                input_key='raw_content',
            )
            
            logger.info("中文友好管道处理完成")
            
        except Exception as e:
            logger.error(f"中文友好管道处理失败: {e}")
            raise


# 创建全局实例
dataflow_integration = DataFlowIntegration()

# 便捷函数
def process_text(text, pipeline_type="pretrain_filter", config=None):
    """处理文本的便捷函数"""
    return dataflow_integration.process_text_data(text, pipeline_type, config)

def filter_pretrain_data(text, config=None):
    """预训练数据过滤"""
    return dataflow_integration.process_text_data(text, "pretrain_filter", config)

def generate_pretrain_data(text, config=None):
    """生成预训练数据（类phi-4格式）"""
    return dataflow_integration.process_text_data(text, "pretrain_synthetic", config)

def process_library_markdown_files(file_paths, pipeline_type="pretrain_filter", config=None):
    """处理文件库的Markdown文件"""
    return dataflow_integration.process_markdown_files(file_paths, pipeline_type, config)

def enhance_reasoning(qa_pairs):
    """增强推理链"""
    return dataflow_integration.process_text_data(qa_pairs, "reasoning")

def clean_knowledge_base(raw_data):
    """清理知识库数据"""
    return dataflow_integration.process_text_data(raw_data, "knowledge_base")

def health_check():
    """健康检查"""
    return dataflow_integration.health_check()

# 示例使用
if __name__ == "__main__":
    print("🚀 DataFlow 集成测试")
    print("=" * 50)
    
    # 健康检查
    status = health_check()
    print(f"DataFlow 状态: {status}")
    
    if dataflow_integration.is_available():
        print("✅ DataFlow 可用，可以开始处理数据")
        
        # 示例文本处理
        sample_text = "人工智能是计算机科学的一个分支，致力于创建能够执行通常需要人类智能的任务的系统。"
        
        try:
            processed = process_text(sample_text)
            print(f"处理结果: {processed}")
        except Exception as e:
            print(f"处理失败: {e}")
    else:
        print("❌ DataFlow 不可用，请检查安装") 