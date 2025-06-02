import os
import base64
import logging
from typing import List, Dict, Optional, Any
from PIL import Image
import pdf2image
import io

from langchain.chat_models.base import BaseChatModel
from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_anthropic import ChatAnthropic
from langchain.schema import HumanMessage, SystemMessage
from langchain.schema.messages import BaseMessage

from app.models import LLMConfig, ProviderType

logger = logging.getLogger(__name__)

class LLMConversionService:
    """LLM文档转换服务"""
    
    def __init__(self):
        self.llm_cache = {}
    
    def get_llm_client(self, llm_config: LLMConfig) -> BaseChatModel:
        """根据配置获取LLM客户端"""
        cache_key = llm_config.id
        if cache_key in self.llm_cache:
            return self.llm_cache[cache_key]
        
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
            client = ChatGoogleGenerativeAI(
                model=llm_config.model_name,
                google_api_key=llm_config.api_key,
                temperature=llm_config.temperature,
                max_output_tokens=llm_config.max_tokens,
                **llm_config.provider_config if llm_config.provider_config else {}
            )
        elif llm_config.provider == ProviderType.CLAUDE:
            client = ChatAnthropic(
                model=llm_config.model_name,
                anthropic_api_key=llm_config.api_key,
                base_url=llm_config.base_url,
                temperature=llm_config.temperature,
                max_tokens=llm_config.max_tokens,
                **llm_config.provider_config if llm_config.provider_config else {}
            )
        else:
            raise ValueError(f"不支持的LLM提供商: {llm_config.provider}")
        
        self.llm_cache[cache_key] = client
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
        
        # 获取配置
        enable_ocr = conversion_config.get('enableOCR', True)
        extract_images = conversion_config.get('extractImages', False)
        custom_prompt = conversion_config.get('customPrompt', '')
        page_processing = conversion_config.get('pageProcessing', {'mode': 'all'})
        
        # 获取LLM客户端
        llm = self.get_llm_client(llm_config)
        
        # 根据文件类型处理
        if file_type.lower() == 'pdf':
            return self._convert_pdf_with_vision(
                file_path, llm, conversion_config, progress_callback
            )
        elif file_type.lower() in ['jpg', 'jpeg', 'png', 'bmp', 'gif']:
            return self._convert_image_with_vision(
                file_path, llm, conversion_config
            )
        else:
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
            
            response = llm.invoke(messages)
            return response.content
    
    def _convert_pdf_with_vision(
        self,
        pdf_path: str,
        llm: BaseChatModel,
        conversion_config: Dict[str, Any],
        progress_callback: Optional[callable] = None
    ) -> str:
        """转换PDF文档"""
        enable_ocr = conversion_config.get('enableOCR', True)
        extract_images = conversion_config.get('extractImages', False)
        custom_prompt = conversion_config.get('customPrompt', '')
        page_processing = conversion_config.get('pageProcessing', {'mode': 'all'})
        
        # 将PDF转换为图片
        try:
            images = pdf2image.convert_from_path(pdf_path)
        except Exception as e:
            logger.error(f"PDF转图片失败: {str(e)}")
            raise
        
        total_pages = len(images)
        markdown_parts = []
        
        # 确定处理方式
        if page_processing['mode'] == 'batch':
            batch_size = page_processing.get('batchSize', 1)
        else:
            batch_size = total_pages
        
        # 分批处理
        for i in range(0, total_pages, batch_size):
            batch_end = min(i + batch_size, total_pages)
            batch_images = images[i:batch_end]
            
            # 更新进度
            if progress_callback:
                progress_callback(i, total_pages)
            
            # 构建消息
            messages = self._build_vision_messages(
                batch_images,
                custom_prompt,
                page_numbers=list(range(i + 1, batch_end + 1)),
                total_pages=total_pages,
                enable_ocr=enable_ocr,
                extract_images=extract_images
            )
            
            # 调用LLM
            try:
                response = llm.invoke(messages)
                markdown_parts.append(response.content)
            except Exception as e:
                logger.error(f"LLM调用失败 (页面 {i+1}-{batch_end}): {str(e)}")
                raise
        
        # 合并所有部分
        return '\n\n'.join(markdown_parts)
    
    def _convert_image_with_vision(
        self,
        image_path: str,
        llm: BaseChatModel,
        conversion_config: Dict[str, Any]
    ) -> str:
        """转换单个图片"""
        extract_images = conversion_config.get('extractImages', False)
        custom_prompt = conversion_config.get('customPrompt', '')
        
        # 读取图片
        with Image.open(image_path) as img:
            messages = self._build_vision_messages(
                [img],
                custom_prompt,
                enable_ocr=True,
                extract_images=extract_images
            )
        
        response = llm.invoke(messages)
        return response.content
    
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