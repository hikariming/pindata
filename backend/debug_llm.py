#!/usr/bin/env python3
"""
调试LLM配置问题的脚本
"""
import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from app.models import LLMConfig, ProviderType
from app.services.llm_conversion_service import LLMConversionService
from app.db import db

def debug_llm_configs():
    """调试LLM配置"""
    app = create_app()
    
    with app.app_context():
        print("=== 调试LLM配置 ===")
        
        # 1. 查看所有LLM配置
        configs = LLMConfig.query.all()
        print(f"\n找到 {len(configs)} 个LLM配置:")
        
        for config in configs:
            print(f"\n配置ID: {config.id}")
            print(f"名称: {config.name}")
            print(f"提供商: {config.provider}")
            print(f"模型: {config.model_name}")
            print(f"API Key前缀: {config.api_key[:10]}... (长度: {len(config.api_key)})")
            print(f"激活状态: {config.is_active}")
            print(f"默认配置: {config.is_default}")
            print(f"支持视觉: {config.supports_vision}")
            
            # 如果是Gemini配置，尝试创建客户端
            if config.provider == ProviderType.GEMINI and config.is_active:
                print(f"\n--- 测试Gemini配置: {config.name} ---")
                try:
                    llm_service = LLMConversionService()
                    client = llm_service.get_llm_client(config)
                    print(f"✅ Gemini客户端创建成功")
                    
                    # 尝试简单调用
                    from langchain.schema import HumanMessage
                    response = client.invoke([HumanMessage(content="Hi, please reply 'OK'")])
                    print(f"✅ Gemini API调用成功: {response.content}")
                    
                except Exception as e:
                    print(f"❌ Gemini客户端创建/调用失败: {str(e)}")
                    print(f"错误类型: {type(e).__name__}")
                    
                    # 检查是否是API Key问题
                    if "API_KEY_INVALID" in str(e) or "api key" in str(e).lower():
                        print("🔍 这是API Key问题！")
                        
                        # 检查API Key是否有特殊字符或格式问题
                        api_key = config.api_key
                        print(f"API Key字符分析:")
                        print(f"  - 长度: {len(api_key)}")
                        print(f"  - 前10个字符: {repr(api_key[:10])}")
                        print(f"  - 后10个字符: {repr(api_key[-10:])}")
                        print(f"  - 是否包含换行符: {'\\n' in api_key}")
                        print(f"  - 是否包含制表符: {'\\t' in api_key}")
                        print(f"  - 是否包含空格: {' ' in api_key}")
                        print(f"  - 去除首尾空白后: {repr(api_key.strip())}")

if __name__ == "__main__":
    debug_llm_configs() 