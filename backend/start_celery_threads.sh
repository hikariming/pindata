#!/bin/bash

# 定义 Conda 环境名称
CONDA_ENV_NAME="pindata-env"

# 启动 Celery Worker 脚本（使用线程池）
echo "Starting Celery Worker with threads in Conda env: $CONDA_ENV_NAME..."

# 设置环境变量
export FLASK_APP=run.py
export FLASK_ENV=development

# macOS 兼容性设置
export OBJC_DISABLE_INITIALIZE_FORK_SAFETY=YES

# 使用 conda run 在指定环境中启动 Celery Worker
# --pool=threads: 使用线程池而不是进程池（在 macOS 上更稳定）
# -c: 并发数（线程数）
conda run -n "$CONDA_ENV_NAME" celery -A celery_worker.celery worker --loglevel=info --pool=threads --concurrency=4 -n worker@%h

# End of script 