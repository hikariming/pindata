import os
import base64
import logging
import time
from typing import List, Dict, Optional, Any
from PIL import Image
import pdf2image
import io

from langchain.chat_models.base import BaseChatModel
from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI
try:
    from langchain_anthropic import ChatAnthropic
except ImportError:
    ChatAnthropic = None
from langchain.schema import HumanMessage, SystemMessage
from langchain.schema.messages import BaseMessage

from app.models import LLMConfig, ProviderType

logger = logging.getLogger(__name__)

class LLMConversionService:
    """LLM文档转换服务"""
    
    def __init__(self):
        self.llm_cache = {}
    
    def clear_cache(self, config_id: str = None):
        """清除LLM客户端缓存"""
        if config_id:
            if config_id in self.llm_cache:
                del self.llm_cache[config_id]
                logger.info(f"清除指定LLM客户端缓存: {config_id}")
        else:
            self.llm_cache.clear()
            logger.info("清除所有LLM客户端缓存")
    
    def get_llm_client(self, llm_config: LLMConfig) -> BaseChatModel:
        """根据配置获取LLM客户端"""
        cache_key = llm_config.id
        if cache_key in self.llm_cache:
            logger.info(f"使用缓存的LLM客户端: {cache_key}")
            return self.llm_cache[cache_key]
        
        logger.info(f"创建新的LLM客户端: Provider={llm_config.provider}, Model={llm_config.model_name}")
        logger.info(f"API Key信息: 前缀={llm_config.api_key[:10]}..., 长度={len(llm_config.api_key)}")
        
        client = None
        
        if llm_config.provider == ProviderType.OPENAI:
            client = ChatOpenAI(
                model=llm_config.model_name,
                api_key=llm_config.api_key,
                base_url=llm_config.base_url,
                temperature=llm_config.temperature,
                max_tokens=llm_config.max_tokens,
                **llm_config.provider_config if llm_config.provider_config else {}
            )
        elif llm_config.provider == ProviderType.GEMINI:
            logger.info(f"初始化Gemini客户端，使用API Key: {llm_config.api_key[:10]}...")
            client = ChatGoogleGenerativeAI(
                model=llm_config.model_name,
                google_api_key=llm_config.api_key,
                temperature=llm_config.temperature,
                max_output_tokens=llm_config.max_tokens,
                **llm_config.provider_config if llm_config.provider_config else {}
            )
        elif llm_config.provider == ProviderType.CLAUDE:
            if ChatAnthropic is None:
                raise ImportError("langchain_anthropic is not installed. Please install it to use Claude models.")
            client = ChatAnthropic(
                model=llm_config.model_name,
                anthropic_api_key=llm_config.api_key,
                base_url=llm_config.base_url,
                temperature=llm_config.temperature,
                max_tokens=llm_config.max_tokens,
                **llm_config.provider_config if llm_config.provider_config else {}
            )
        elif llm_config.provider == ProviderType.OLLAMA:
            from langchain_community.chat_models import ChatOllama
            # 检查是否是OpenAI兼容的API (base_url包含/v1)
            if llm_config.base_url and '/v1' in llm_config.base_url:
                logger.info(f"检测到Ollama使用OpenAI兼容API格式: {llm_config.base_url}")
                # 使用OpenAI客户端处理OpenAI兼容的Ollama API
                
                # 智能处理API key：很多Ollama服务不需要真实的API key
                api_key_to_use = None
                if llm_config.api_key and llm_config.api_key not in ['ollama', 'placeholder', '']:
                    # 如果有真实的API key，使用它
                    api_key_to_use = llm_config.api_key
                    logger.info("使用配置的API key")
                else:
                    # 对于本地或不需要认证的Ollama服务，尝试不提供API key
                    # 如果失败，ChatOpenAI通常会要求提供，我们再提供一个placeholder
                    api_key_to_use = "not-needed"  # 使用一个明确的placeholder
                    logger.info("Ollama服务通常不需要API key，使用placeholder")
                
                client = ChatOpenAI(
                    model=llm_config.model_name,
                    api_key=api_key_to_use,
                    base_url=llm_config.base_url,
                    temperature=llm_config.temperature,
                    max_tokens=llm_config.max_tokens,
                    **llm_config.provider_config if llm_config.provider_config else {}
                )
            else:
                # 使用原生Ollama API格式（通常不需要API key）
                logger.info(f"使用原生Ollama API格式: {llm_config.base_url}")
                client = ChatOllama(
                    model=llm_config.model_name,
                    base_url=llm_config.base_url,
                    temperature=llm_config.temperature,
                    **llm_config.provider_config if llm_config.provider_config else {}
                )
        else:
            raise ValueError(f"不支持的LLM提供商: {llm_config.provider}")
        
        self.llm_cache[cache_key] = client
        logger.info(f"LLM客户端创建成功并缓存: {cache_key}")
        return client
    
    def convert_document_with_vision(
        self,
        file_path: str,
        file_type: str,
        llm_config: LLMConfig,
        conversion_config: Dict[str, Any],
        progress_callback: Optional[callable] = None
    ) -> str:
        """使用视觉LLM转换文档"""
        
        start_time = time.time()
        logger.info(f"开始LLM文档转换任务 - 文件: {file_path}, 类型: {file_type}, 模型: {llm_config.model_name}")
        
        # 获取配置
        enable_ocr = conversion_config.get('enableOCR', True)
        extract_images = conversion_config.get('extractImages', False)
        custom_prompt = conversion_config.get('customPrompt', '')
        page_processing = conversion_config.get('pageProcessing', {'mode': 'all'})
        
        logger.info(f"转换配置 - OCR: {enable_ocr}, 提取图像: {extract_images}, 批处理模式: {page_processing.get('mode')}")
        
        # 获取LLM客户端
        try:
            llm = self.get_llm_client(llm_config)
            logger.info(f"LLM客户端获取成功: {llm_config.provider}")
        except Exception as e:
            logger.error(f"获取LLM客户端失败: {str(e)}")
            raise
        
        # 根据文件类型处理
        try:
            if file_type.lower() == 'pdf':
                logger.info("开始处理PDF文档")
                result = self._convert_pdf_with_vision(
                    file_path, llm, conversion_config, progress_callback
                )
            elif file_type.lower() in ['jpg', 'jpeg', 'png', 'bmp', 'gif']:
                logger.info("开始处理图像文件")
                result = self._convert_image_with_vision(
                    file_path, llm, conversion_config
                )
            else:
                logger.info(f"开始处理其他类型文件: {file_type}")
                # 对于其他文件类型，先用markitdown转换，然后用LLM优化
                import markitdown
                md = markitdown.MarkItDown()
                result = md.convert(file_path)
                
                # 使用LLM优化markdown
                system_prompt = self._get_system_prompt(custom_prompt)
                user_prompt = f"请优化以下Markdown文档，确保格式正确、结构清晰：\n\n{result.text_content}"
                
                messages = [
                    SystemMessage(content=system_prompt),
                    HumanMessage(content=user_prompt)
                ]
                
                logger.info("调用LLM优化markdown内容")
                llm_start_time = time.time()
                response = llm.invoke(messages)
                llm_duration = time.time() - llm_start_time
                logger.info(f"LLM优化完成，耗时: {llm_duration:.2f}秒")
                
                result = response.content
            
            total_duration = time.time() - start_time
            logger.info(f"LLM文档转换任务完成 - 总耗时: {total_duration:.2f}秒, 结果长度: {len(result)} 字符")
            return result
            
        except Exception as e:
            total_duration = time.time() - start_time
            logger.error(f"LLM文档转换任务失败 - 耗时: {total_duration:.2f}秒, 错误: {str(e)}")
            raise
    
    def _convert_pdf_with_vision(
        self,
        pdf_path: str,
        llm: BaseChatModel,
        conversion_config: Dict[str, Any],
        progress_callback: Optional[callable] = None
    ) -> str:
        """转换PDF文档"""
        start_time = time.time()
        logger.info(f"开始PDF转换 - 文件: {pdf_path}")
        
        enable_ocr = conversion_config.get('enableOCR', True)
        extract_images = conversion_config.get('extractImages', False)
        custom_prompt = conversion_config.get('customPrompt', '')
        page_processing = conversion_config.get('pageProcessing', {'mode': 'all'})
        
        # 将PDF转换为图片
        try:
            logger.info("开始将PDF转换为图片...")
            pdf_to_image_start = time.time()
            images = pdf2image.convert_from_path(pdf_path)
            pdf_to_image_duration = time.time() - pdf_to_image_start
            logger.info(f"PDF转图片完成 - 页数: {len(images)}, 耗时: {pdf_to_image_duration:.2f}秒")
        except Exception as e:
            logger.error(f"PDF转图片失败: {str(e)}")
            raise
        
        total_pages = len(images)
        markdown_parts = []
        
        # 确定处理方式
        if page_processing['mode'] == 'batch':
            batch_size = page_processing.get('batchSize', 1)
            logger.info(f"使用批处理模式 - 批大小: {batch_size}")
        else:
            batch_size = total_pages
            logger.info("使用全量处理模式")
        
        # 分批处理
        total_llm_time = 0
        successful_batches = 0
        
        for i in range(0, total_pages, batch_size):
            batch_start_time = time.time()
            batch_end = min(i + batch_size, total_pages)
            batch_images = images[i:batch_end]
            
            logger.info(f"处理批次 {i//batch_size + 1}/{(total_pages + batch_size - 1)//batch_size} - 页面 {i+1}-{batch_end}")
            
            # 更新进度
            if progress_callback:
                try:
                    progress_callback(i, total_pages)
                    logger.debug(f"进度回调成功 - 当前: {i}, 总计: {total_pages}")
                except Exception as e:
                    logger.warning(f"进度回调失败: {str(e)}")
            
            # 构建消息
            try:
                messages = self._build_vision_messages(
                    batch_images,
                    custom_prompt,
                    page_numbers=list(range(i + 1, batch_end + 1)),
                    total_pages=total_pages,
                    enable_ocr=enable_ocr,
                    extract_images=extract_images
                )
                logger.debug(f"构建消息完成 - 图片数量: {len(batch_images)}")
            except Exception as e:
                logger.error(f"构建消息失败 (页面 {i+1}-{batch_end}): {str(e)}")
                raise
            
            # 调用LLM
            try:
                logger.info(f"调用LLM处理页面 {i+1}-{batch_end}...")
                llm_start_time = time.time()
                response = llm.invoke(messages)
                llm_duration = time.time() - llm_start_time
                total_llm_time += llm_duration
                
                markdown_parts.append(response.content)
                successful_batches += 1
                
                batch_duration = time.time() - batch_start_time
                logger.info(f"批次处理完成 - LLM耗时: {llm_duration:.2f}秒, 总耗时: {batch_duration:.2f}秒, 输出长度: {len(response.content)} 字符")
                
                # 记录平均速度统计
                avg_llm_time = total_llm_time / successful_batches
                remaining_batches = ((total_pages + batch_size - 1) // batch_size) - successful_batches
                estimated_remaining_time = remaining_batches * avg_llm_time
                logger.info(f"进度统计 - 平均LLM耗时: {avg_llm_time:.2f}秒/批次, 预计剩余时间: {estimated_remaining_time:.2f}秒")
                
            except Exception as e:
                batch_duration = time.time() - batch_start_time
                logger.error(f"LLM调用失败 (页面 {i+1}-{batch_end}) - 耗时: {batch_duration:.2f}秒, 错误: {str(e)}")
                # 记录详细的错误信息用于调试
                logger.error(f"LLM配置: Provider={llm.__class__.__name__}, 批次大小: {len(batch_images)}")
                raise
        
        # 最终进度回调
        if progress_callback:
            try:
                progress_callback(total_pages, total_pages)
                logger.debug("最终进度回调完成")
            except Exception as e:
                logger.warning(f"最终进度回调失败: {str(e)}")
        
        # 合并所有部分
        logger.info("开始合并所有转换结果...")
        result = '\n\n'.join(markdown_parts)
        
        total_duration = time.time() - start_time
        logger.info(f"PDF转换完成 - 总页数: {total_pages}, 成功批次: {successful_batches}, 总LLM耗时: {total_llm_time:.2f}秒, 总耗时: {total_duration:.2f}秒, 结果长度: {len(result)} 字符")
        
        return result
    
    def _convert_image_with_vision(
        self,
        image_path: str,
        llm: BaseChatModel,
        conversion_config: Dict[str, Any]
    ) -> str:
        """转换单个图片"""
        start_time = time.time()
        logger.info(f"开始图片转换 - 文件: {image_path}")
        
        extract_images = conversion_config.get('extractImages', False)
        custom_prompt = conversion_config.get('customPrompt', '')
        
        try:
            # 读取图片
            logger.info("读取图片文件...")
            with Image.open(image_path) as img:
                logger.info(f"图片信息 - 尺寸: {img.size}, 模式: {img.mode}")
                messages = self._build_vision_messages(
                    [img],
                    custom_prompt,
                    enable_ocr=True,
                    extract_images=extract_images
                )
            
            logger.info("调用LLM处理图片...")
            llm_start_time = time.time()
            response = llm.invoke(messages)
            llm_duration = time.time() - llm_start_time
            
            total_duration = time.time() - start_time
            logger.info(f"图片转换完成 - LLM耗时: {llm_duration:.2f}秒, 总耗时: {total_duration:.2f}秒, 输出长度: {len(response.content)} 字符")
            
            return response.content
            
        except Exception as e:
            total_duration = time.time() - start_time
            logger.error(f"图片转换失败 - 耗时: {total_duration:.2f}秒, 错误: {str(e)}")
            raise
    
    def _build_vision_messages(
        self,
        images: List[Image.Image],
        custom_prompt: str,
        page_numbers: Optional[List[int]] = None,
        total_pages: Optional[int] = None,
        enable_ocr: bool = True,
        extract_images: bool = False
    ) -> List[BaseMessage]:
        """构建视觉模型的消息"""
        system_prompt = self._get_system_prompt(custom_prompt)
        
        # 构建用户消息内容
        content_parts = []
        
        # 添加指令文本
        if page_numbers and total_pages:
            if len(page_numbers) == 1:
                instruction = f"这是第 {page_numbers[0]} 页（共 {total_pages} 页）的内容。"
            else:
                instruction = f"这是第 {page_numbers[0]}-{page_numbers[-1]} 页（共 {total_pages} 页）的内容。"
        else:
            instruction = "请分析以下图片内容。"
        
        instruction += "\n请将其转换为结构化的 Markdown 格式。"
        
        if enable_ocr:
            instruction += "\n请识别并提取图片中的所有文字内容。"
        
        if extract_images:
            instruction += "\n请描述图片中的图表、图像等视觉元素，并在合适的位置插入描述。"
        
        content_parts.append({"type": "text", "text": instruction})
        
        # 添加图片
        for img in images:
            # 将图片转换为base64
            buffered = io.BytesIO()
            img.save(buffered, format="PNG")
            img_base64 = base64.b64encode(buffered.getvalue()).decode()
            
            content_parts.append({
                "type": "image_url",
                "image_url": {
                    "url": f"data:image/png;base64,{img_base64}"
                }
            })
        
        return [
            SystemMessage(content=system_prompt),
            HumanMessage(content=content_parts)
        ]
    
    def call_llm(self, llm_config: LLMConfig, prompt: str) -> str:
        """调用LLM生成文本回复
        
        Args:
            llm_config: LLM配置
            prompt: 提示词
            
        Returns:
            str: LLM的回复内容
        """
        try:
            llm = self.get_llm_client(llm_config)
            
            # 构建消息
            messages = [HumanMessage(content=prompt)]
            
            # 调用LLM
            logger.info(f"调用LLM生成文本 - 模型: {llm_config.model_name}")
            start_time = time.time()
            response = llm.invoke(messages)
            duration = time.time() - start_time
            
            logger.info(f"LLM调用完成 - 耗时: {duration:.2f}秒, 输入长度: {len(prompt)}, 输出长度: {len(response.content)}")
            
            # 更新使用统计
            llm_config.update_usage()
            
            return response.content
            
        except Exception as e:
            logger.error(f"调用LLM失败: {str(e)}")
            raise
    
    def _get_system_prompt(self, custom_prompt: str) -> str:
        """获取系统提示词"""
        base_prompt = """你是一个专业的文档转换助手。你的任务是将文档内容转换为高质量的 Markdown 格式。

请遵循以下规则：
1. 保持原文档的结构和层次关系
2. 使用适当的 Markdown 语法（标题、列表、表格、代码块等）
3. 确保格式美观、易读
4. 准确提取所有文本内容
5. 表格请使用 Markdown 表格语法
6. 代码请使用代码块语法
7. 保持原文的语言（中文/英文等）"""
        
        if custom_prompt:
            return f"{base_prompt}\n\n用户特殊要求：\n{custom_prompt}"
        
        return base_prompt

# 创建单例
llm_conversion_service = LLMConversionService() 