from .base_distiller import BaseDistiller
import json

class AlpacaDistiller(BaseDistiller):
    def distill(self, text_blocks, config=None):
        '''将文本块转换为 Alpaca 对话格式'''
        # Alpaca 格式通常是 {"instruction": "...", "input": "...", "output": "..."}
        # 这里的实现需要根据实际的文本块内容和期望的转换逻辑来定
        # 例如，如果每个文本块是一段完整的问答，或者需要从文本块中提取这些字段

        alpaca_data = []
        default_instruction = config.get('default_instruction', "请处理以下文本：") if config else "请处理以下文本："
        input_is_context = config.get('input_is_context', False) if config else False

        for i, block in enumerate(text_blocks):
            if not block.strip():
                continue
            
            # 这是一个非常简化的示例，实际应用中需要更复杂的逻辑
            # 来从 text_block 中提取 instruction, input, output
            # 或者将整个 block 作为 output，并使用默认的 instruction 和 input
            item = {
                "instruction": default_instruction,
                "input": f"上下文 {i+1}" if input_is_context else "", 
                "output": block
            }
            alpaca_data.append(item)
        
        # 模拟输出
        # return [{"instruction": "Mock Instruction", "input": "Mock Input", "output": f"Mock Output from block {i+1}"} for i in range(len(text_blocks))] or [{"message": "No text to distill to Alpaca (mock)"}]
        return alpaca_data or [{"message": "No text to distill to Alpaca (mock)"}]

    def get_config_schema(self):
        return {
            "type": "object",
            "properties": {
                "default_instruction": {
                    "type": "string",
                    "title": "Default Instruction",
                    "description": "If instruction cannot be derived, use this default.",
                    "default": "请处理以下文本："
                },
                "input_is_context": {
                    "type": "boolean",
                    "title": "Use Block as Context in Input",
                    "description": "If true, the 'input' field will contain a generic context placeholder.",
                    "default": False
                }
            }
        }
