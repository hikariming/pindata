#!/usr/bin/env python3
"""
初始化LLM配置和系统日志示例数据
"""

import sys
import os
from datetime import datetime, timedelta

# 添加项目路径
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from app.models import LLMConfig, ProviderType, SystemLog, LogLevel
from app.db import db

def init_llm_configs():
    """初始化LLM配置数据"""
    print("正在初始化LLM配置数据...")
    
    # 清除现有数据
    LLMConfig.query.delete()
    
    # GPT-4 配置
    gpt4_config = LLMConfig(
        name="GPT-4 主配置",
        provider=ProviderType.OPENAI,
        model_name="gpt-4",
        api_key="sk-example-key-1234567890abcdef",
        base_url="https://api.openai.com/v1",
        temperature=0.7,
        max_tokens=4096,
        supports_vision=False,
        is_active=True,
        is_default=True,
        usage_count=156,
        total_tokens_used=89650
    )
    
    # GPT-4 Vision 配置
    gpt4v_config = LLMConfig(
        name="GPT-4 Vision 配置",
        provider=ProviderType.OPENAI,
        model_name="gpt-4-vision-preview",
        api_key="sk-example-key-vision123456",
        base_url="https://api.openai.com/v1",
        temperature=0.8,
        max_tokens=4096,
        supports_vision=True,
        is_active=True,
        is_default=False,
        usage_count=45,
        total_tokens_used=12300
    )
    
    # Claude-3 配置
    claude_config = LLMConfig(
        name="Claude-3 辅助配置",
        provider=ProviderType.CLAUDE,
        model_name="claude-3-sonnet-20240229",
        api_key="sk-ant-example-key987654321",
        base_url="https://api.anthropic.com/v1",
        temperature=0.8,
        max_tokens=4096,
        supports_vision=True,
        is_active=True,
        is_default=False,
        usage_count=89,
        total_tokens_used=34560
    )
    
    # Gemini 配置
    gemini_config = LLMConfig(
        name="Gemini Pro 配置",
        provider=ProviderType.GEMINI,
        model_name="gemini-pro-vision",
        api_key="AIzaSyExample123456789",
        base_url="https://generativelanguage.googleapis.com/v1",
        temperature=0.6,
        max_tokens=2048,
        supports_vision=True,
        is_active=False,
        is_default=False,
        usage_count=12,
        total_tokens_used=5600
    )
    
    # 自定义模型配置
    custom_config = LLMConfig(
        name="本地部署 Llama2",
        provider=ProviderType.CUSTOM,
        model_name="llama2-70b-chat",
        api_key="local-deployment-key",
        base_url="http://localhost:8080/v1",
        temperature=0.9,
        max_tokens=8192,
        supports_vision=False,
        is_active=True,
        is_default=False,
        custom_headers={"X-Custom-Auth": "bearer-token"},
        provider_config={"deployment": "local", "gpu_count": 4},
        usage_count=234,
        total_tokens_used=145670
    )
    
    # 添加到数据库
    configs = [gpt4_config, gpt4v_config, claude_config, gemini_config, custom_config]
    for config in configs:
        db.session.add(config)
    
    db.session.commit()
    print(f"成功创建 {len(configs)} 个LLM配置")

def init_system_logs():
    """初始化系统日志数据"""
    print("正在初始化系统日志数据...")
    
    # 清除现有数据
    SystemLog.query.delete()
    
    # 创建示例日志
    logs = []
    base_time = datetime.utcnow()
    
    # 系统启动日志
    logs.append(SystemLog(
        level=LogLevel.INFO,
        message="系统启动成功",
        source="System",
        details="所有核心模块已加载完成，数据库连接正常",
        module="app",
        function="create_app",
        created_at=base_time - timedelta(hours=2)
    ))
    
    # LLM配置相关日志
    logs.append(SystemLog(
        level=LogLevel.INFO,
        message="创建新的LLM配置: GPT-4 主配置",
        source="LLMConfig",
        details="用户创建了新的OpenAI GPT-4配置",
        extra_data={"config_id": "config-001", "provider": "openai"},
        created_at=base_time - timedelta(hours=1, minutes=45)
    ))
    
    # API调用日志
    logs.append(SystemLog(
        level=LogLevel.INFO,
        message="GPT-4 模型调用成功",
        source="LLM",
        details="成功调用GPT-4 API，返回1024个tokens",
        extra_data={"tokens": 1024, "response_time": 2.3, "model": "gpt-4"},
        created_at=base_time - timedelta(hours=1, minutes=30)
    ))
    
    # 内存警告
    logs.append(SystemLog(
        level=LogLevel.WARN,
        message="检测到高内存使用",
        source="Monitor",
        details="当前内存使用率: 87%，建议清理缓存或重启服务",
        module="monitor",
        function="check_memory",
        extra_data={"memory_usage": 0.87, "available_mb": 1024},
        created_at=base_time - timedelta(hours=1, minutes=15)
    ))
    
    # API连接错误
    logs.append(SystemLog(
        level=LogLevel.ERROR,
        message="连接外部API失败",
        source="API",
        details="Connection timeout after 30 seconds",
        error_code="CONN_TIMEOUT",
        stack_trace="requests.exceptions.ConnectTimeout: HTTPSConnectionPool...",
        extra_data={"endpoint": "https://api.openai.com/v1/chat/completions", "timeout": 30},
        created_at=base_time - timedelta(hours=1)
    ))
    
    # 用户操作日志
    logs.append(SystemLog(
        level=LogLevel.INFO,
        message="用户查询LLM配置列表",
        source="LLMConfig",
        details="用户请求获取所有LLM配置，返回5个配置",
        request_id="req-123456789",
        user_id="user-001",
        ip_address="192.168.1.100",
        extra_data={"page": 1, "per_page": 20, "total": 5},
        created_at=base_time - timedelta(minutes=45)
    ))
    
    # 批量任务日志
    logs.append(SystemLog(
        level=LogLevel.DEBUG,
        message="正在处理批量任务 #1234",
        source="TaskRunner",
        details="Processing 150 items in queue",
        module="tasks",
        function="process_batch",
        extra_data={"task_id": "1234", "items_count": 150, "queue_size": 200},
        created_at=base_time - timedelta(minutes=30)
    ))
    
    # 配置更新日志
    logs.append(SystemLog(
        level=LogLevel.INFO,
        message="更新LLM配置: Claude-3 辅助配置",
        source="LLMConfig",
        details="用户更新了Claude-3配置的温度参数",
        extra_data={"config_id": "config-002", "updated_fields": ["temperature"]},
        created_at=base_time - timedelta(minutes=15)
    ))
    
    # 数据库连接警告
    logs.append(SystemLog(
        level=LogLevel.WARN,
        message="数据库连接池使用率较高",
        source="Database",
        details="当前连接池使用率: 85%，建议检查长时间运行的查询",
        module="database",
        extra_data={"pool_usage": 0.85, "active_connections": 17, "max_connections": 20},
        created_at=base_time - timedelta(minutes=10)
    ))
    
    # 最新的日志
    logs.append(SystemLog(
        level=LogLevel.INFO,
        message="系统运行状态正常",
        source="HealthCheck",
        details="所有服务状态正常，响应时间在预期范围内",
        extra_data={"cpu_usage": 0.35, "memory_usage": 0.65, "disk_usage": 0.45},
        created_at=base_time - timedelta(minutes=2)
    ))
    
    # 添加到数据库
    for log in logs:
        db.session.add(log)
    
    db.session.commit()
    print(f"成功创建 {len(logs)} 条系统日志")

def main():
    """主函数"""
    print("开始初始化LLM相关数据...")
    
    # 创建应用实例
    app = create_app()
    
    with app.app_context():
        # 确保数据库表已创建
        db.create_all()
        
        # 初始化数据
        init_llm_configs()
        init_system_logs()
        
        print("数据初始化完成！")
        print("\n可以通过以下API访问数据：")
        print("- LLM配置列表: GET /api/v1/llm/configs")
        print("- 系统日志列表: GET /api/v1/system/logs")
        print("- 日志统计信息: GET /api/v1/system/logs/stats")

if __name__ == "__main__":
    main() 