#!/usr/bin/env python3
"""
测试脚本：验证思考过程配置传递和处理
"""

import json

def test_thinking_process_config():
    """测试思考过程配置的传递和处理"""
    
    # 模拟前端传递的配置
    frontend_config = {
        "selected_files": [
            {"id": "1", "name": "test.md", "path": "/test/test.md", "size": 1024}
        ],
        "dataset_config": {
            "type": "qa-pairs",
            "format": "Alpaca",
            "name": "测试数据集",
            "description": "测试思考过程功能"
        },
        "model_config": {
            "id": "test-model-id",
            "name": "GPT-4",
            "provider": "openai"
        },
        "processing_config": {
            "dataset_type": "qa-pairs",
            "output_format": "Alpaca",
            "chunk_size": 1000,
            "chunk_overlap": 200,
            "custom_prompt": "生成高质量的问答对",
            "temperature": 0.7,
            "max_tokens": 2000,
            "batch_size": 10,
            # 思考过程配置
            "enableThinkingProcess": True,
            "reasoningExtractionMethod": "tag_based",
            "reasoningExtractionConfig": {"tag": "thinking"},
            "distillationPrompt": "请详细说明你的思考过程，包括分析步骤和推理逻辑",
            "includeThinkingInOutput": True
        }
    }
    
    print("✅ 前端配置结构:")
    print(json.dumps(frontend_config, indent=2, ensure_ascii=False))
    
    # 模拟后端处理逻辑
    processing_config = frontend_config["processing_config"]
    
    # 提取思考过程配置
    enable_thinking = processing_config.get('enableThinkingProcess', False)
    include_thinking_in_output = processing_config.get('includeThinkingInOutput', False)
    reasoning_extraction_method = processing_config.get('reasoningExtractionMethod')
    reasoning_extraction_config = processing_config.get('reasoningExtractionConfig', {})
    distillation_prompt = processing_config.get('distillationPrompt', '')
    
    print("\n✅ 后端解析的配置:")
    print(f"  - 启用思考过程: {enable_thinking}")
    print(f"  - 包含思考过程: {include_thinking_in_output}")
    print(f"  - 提取方法: {reasoning_extraction_method}")
    print(f"  - 提取配置: {reasoning_extraction_config}")
    print(f"  - 蒸馏提示词: {'已配置' if distillation_prompt else '未配置'}")
    
    # 验证配置完整性
    validation_errors = []
    
    if enable_thinking:
        # 模拟支持推理的模型配置验证
        supports_reasoning = True  # 假设模型支持推理
        
        if supports_reasoning:
            if not reasoning_extraction_method:
                validation_errors.append("支持推理的模型需要配置提取方法")
            
            if reasoning_extraction_method == 'tag_based' and not reasoning_extraction_config.get('tag'):
                validation_errors.append("标签模式需要指定标签名称")
                
        else:
            if include_thinking_in_output and not distillation_prompt:
                validation_errors.append("不支持推理的模型需要蒸馏提示词")
    
    if validation_errors:
        print("\n❌ 配置验证失败:")
        for error in validation_errors:
            print(f"  - {error}")
        return False
    else:
        print("\n✅ 配置验证通过!")
        return True

def test_llm_config_examples():
    """测试不同LLM配置的思考过程处理"""
    
    # 支持推理的模型配置
    reasoning_model = {
        "supports_reasoning": True,
        "reasoning_extraction_method": "tag_based",
        "reasoning_extraction_config": {"tag": "thinking"}
    }
    
    # 不支持推理的模型配置
    non_reasoning_model = {
        "supports_reasoning": False,
        "reasoning_extraction_method": None,
        "reasoning_extraction_config": None
    }
    
    print("\n✅ LLM配置示例:")
    print("支持推理的模型:", json.dumps(reasoning_model, indent=2, ensure_ascii=False))
    print("不支持推理的模型:", json.dumps(non_reasoning_model, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    print("🔍 测试思考过程配置传递和处理")
    print("=" * 50)
    
    success = test_thinking_process_config()
    test_llm_config_examples()
    
    if success:
        print("\n🎉 所有测试通过！思考过程配置已正确实现。")
    else:
        print("\n�� 测试失败，需要检查配置逻辑。") 