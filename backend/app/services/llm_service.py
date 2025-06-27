# backend/app/services/llm_service.py
from app.models import LLMConfig, ProviderType
import openai  # 假设使用openai库
# import anthropic  # 假设使用anthropic库 for Claude
# import google.generativeai as genai # 假设使用google-generativeai库 for Gemini

class LLMService:
    """统一的大模型服务，用于与不同的LLM提供商进行交互"""

    def __init__(self, llm_config: LLMConfig):
        """
        初始化LLM服务。
        
        :param llm_config: 大模型配置实例
        """
        self.config = llm_config
        self._initialize_client()

    def _initialize_client(self):
        """根据提供商类型初始化对应的客户端"""
        if self.config.provider == ProviderType.OPENAI:
            self.client = openai.OpenAI(
                api_key=self.config.api_key,
                base_url=self.config.base_url
            )
        # elif self.config.provider == ProviderType.CLAUDE:
        #     self.client = anthropic.Anthropic(api_key=self.config.api_key)
        # elif self.config.provider == ProviderType.GEMINI:
        #     genai.configure(api_key=self.config.api_key)
        #     self.client = genai.GenerativeModel(self.config.model_name)
        else:
            # 对于自定义或其他提供商，可能需要不同的初始化逻辑
            self.client = None

    def generate(self, prompt: str) -> str:
        """
        生成文本内容（常规模型）。
        
        :param prompt: 用户输入的提示
        :return: 模型生成的文本
        """
        if self.config.provider == ProviderType.OPENAI:
            response = self.client.chat.completions.create(
                model=self.config.model_name,
                messages=[{"role": "user", "content": prompt}],
                temperature=self.config.temperature,
                max_tokens=self.config.max_tokens
            )
            return response.choices[0].message.content
        # 添加对其他提供商的支持
        return "此模型提供商的常规生成功能尚未实现。"

    def generate_with_vision(self, prompt: str, image_url: str) -> str:
        """
        结合图像生成文本内容（多模态模型）。
        
        :param prompt: 用户输入的提示
        :param image_url: 图像的URL
        :return: 模型生成的文本
        """
        if self.config.provider == ProviderType.OPENAI and self.config.supports_vision:
            response = self.client.chat.completions.create(
                model=self.config.model_name,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {"type": "image_url", "image_url": {"url": image_url}},
                        ],
                    }
                ],
                temperature=self.config.temperature,
                max_tokens=self.config.max_tokens
            )
            return response.choices[0].message.content
        # 添加对其他提供商的支持
        return "此模型提供商的视觉生成功能尚未实现或未启用。"

    def generate_with_reasoning(self, prompt: str) -> str:
        """
        生成包含思考过程的文本内容。
        
        :param prompt: 用户输入的提示
        :return: 模型生成的包含思考过程的原始文本
        """
        # 这里的实现将高度依赖于模型本身如何输出思考过程
        # 例如，可能需要一个特定的系统提示来引导模型
        system_prompt = "请在思考时使用 <think>...</think> 标签包裹你的思考过程，然后给出最终答案。"
        
        if self.config.provider == ProviderType.OPENAI:
            response = self.client.chat.completions.create(
                model=self.config.model_name,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt}
                ],
                temperature=self.config.temperature,
                max_tokens=self.config.max_tokens
            )
            return response.choices[0].message.content
        # 添加对其他提供商的支持
        return "此模型提供商的思考过程生成功能尚未实现。"
