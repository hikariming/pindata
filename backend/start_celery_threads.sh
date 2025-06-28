#!/bin/bash

# 定义 Conda 环境名称
CONDA_ENV_NAME="pindata-env"

# 定义清理函数
cleanup() {
    echo ""
    echo "🛑 接收到停止信号，正在停止Celery..."
    # 发送TERM信号给当前进程组
    kill -TERM 0 2>/dev/null
    sleep 3
    # 如果还在运行，强制停止
    kill -9 0 2>/dev/null
    echo "✅ Celery已停止"
    exit 0
}

# 设置信号处理
trap cleanup SIGINT SIGTERM

echo "🚀 Celery Worker 独立启动脚本"
echo "按 Ctrl+C 停止服务"
echo "========================"

# 启动 Celery Worker 脚本（使用线程池）
echo "Starting Celery Worker with threads in Conda env: $CONDA_ENV_NAME..."

# 设置环境变量
export FLASK_APP=run.py
export FLASK_ENV=development

# macOS 兼容性设置
export OBJC_DISABLE_INITIALIZE_FORK_SAFETY=YES

echo "📋 Celery Configuration:"
echo "   - Environment: $CONDA_ENV_NAME"
echo "   - Pool Type: threads"
echo "   - Concurrency: 4"
echo "   - Node Name: worker@$(hostname)"
echo ""

# 使用 conda run 在指定环境中启动 Celery Worker
# --pool=threads: 使用线程池而不是进程池（在 macOS 上更稳定）
# -c: 并发数（线程数）
echo "🚀 Starting Celery worker..."
echo "⏳ Celery运行中... (关闭此终端将停止Celery)"
echo ""

# 前台运行Celery
conda run -n "$CONDA_ENV_NAME" celery -A celery_worker.celery worker --loglevel=info --pool=threads --concurrency=4 -n worker@%h

# 检查退出状态
EXIT_CODE=$?
if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ Celery worker stopped gracefully"
else
    echo "❌ Celery worker exited with error code: $EXIT_CODE"
fi

# End of script 