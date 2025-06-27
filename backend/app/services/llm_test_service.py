# backend/app/services/llm_test_service.py
from app.models import LLMConfig
from app.services.llm_service import LLMService  # 假设有一个统一的LLM服务
import json

class LLMTestService:
    """大模型测试服务"""

    @staticmethod
    def test_model(llm_config_id: str, prompt: str, image_url: str = None):
        """
        根据配置测试单个大模型。
        
        :param llm_config_id: 大模型配置的ID
        :param prompt: 用户输入的提示
        :param image_url: （可选）用于多模态模型测试的图像URL
        :return: 结构化的模型输出
        :raises ValueError: 如果找不到LLM配置
        """
        llm_config = LLMConfig.query.get(llm_config_id)
        if not llm_config:
            raise ValueError("未找到指定的大模型配置")

        # 初始化LLM服务
        llm_service = LLMService(llm_config)

        # 构建结构化结果
        structured_result = {
            "request": {
                "prompt": prompt,
                "image_url": image_url,
                "model_config": llm_config.to_dict()
            },
            "response": None,
            "error": None
        }

        try:
            # 根据模型能力调用不同的方法
            if llm_config.supports_vision and image_url:
                # 多模态模型调用
                response = llm_service.generate_with_vision(prompt, image_url)
                structured_result["response"] = LLMTestService._parse_response(response, llm_config)
            elif llm_config.supports_reasoning:
                # 支持思考过程的模型调用
                response = llm_service.generate_with_reasoning(prompt)
                structured_result["response"] = LLMTestService._parse_response(response, llm_config)
            else:
                # 常规模型调用
                response = llm_service.generate(prompt)
                structured_result["response"] = LLMTestService._parse_response(response, llm_config)
        
        except Exception as e:
            structured_result["error"] = str(e)

        return structured_result

    @staticmethod
    def _parse_response(response: any, llm_config: LLMConfig):
        """
        解析并结构化模型响应。
        对于支持思考过程的模型，会特别提取思考过程。
        
        :param response: 模型返回的原始响应
        :param llm_config: 大模型配置
        :return: 结构化的响应
        """
        if not llm_config.supports_reasoning:
            return {"raw_response": response}

        # 思考过程提取逻辑
        reasoning_content = ""
        final_answer = ""
        method = llm_config.reasoning_extraction_method
        config = llm_config.reasoning_extraction_config or {}

        if method == 'tag_based':
            tag = config.get('tag', 'think')
            start_tag = f"<{tag}>"
            end_tag = f"</{tag}>"
            
            start_index = response.find(start_tag)
            end_index = response.find(end_tag)
            
            if start_index != -1 and end_index != -1:
                reasoning_content = response[start_index + len(start_tag):end_index].strip()
                final_answer = response[end_index + len(end_tag):].strip()
            else:
                final_answer = response
                
        elif method == 'json_field':
            try:
                response_json = json.loads(response)
                reasoning_field = config.get('reasoning_field', 'reasoning')
                answer_field = config.get('answer_field', 'answer')
                
                reasoning_content = response_json.get(reasoning_field, "")
                final_answer = response_json.get(answer_field, "")
            except (json.JSONDecodeError, TypeError):
                final_answer = response # 如果解析失败，则将整个响应视为最终答案

        else:
            final_answer = response

        return {
            "raw_response": response,
            "parsed": {
                "reasoning": reasoning_content,
                "final_answer": final_answer
            }
        }
