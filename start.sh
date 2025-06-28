#!/bin/bash

# 获取脚本所在的目录，即项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONDA_ENV_NAME="pindata-env"

# 设置环境变量，确保Celery和Flask能正确运行
export OBJC_DISABLE_INITIALIZE_FORK_SAFETY=YES
export FLASK_APP=run.py
export FLASK_ENV=development

# --- 检查 Overmind 是否安装 ---
if ! command -v overmind &> /dev/null; then
    echo "✋ Overmind is not installed."
    echo "Please install it first. On macOS: brew install overmind"
    exit 1
fi

echo "🚀 Starting all services with Overmind..."
echo "Press Ctrl+C to stop all services."
echo "======================================"

# 使用 overmind 启动 Procfile 中定义的所有服务
# -f Procfile: 指定配置文件
# --not-race-conditions: 确保所有进程都已启动
overmind s -f Procfile
EXIT_CODE=$?

echo "======================================"
if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ All services stopped gracefully."
else
    echo "❌ Services exited with code: $EXIT_CODE"
fi 