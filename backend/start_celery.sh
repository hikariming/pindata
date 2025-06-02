#!/bin/bash

# 启动 Celery Worker 脚本

echo "Starting Celery Worker..."

# 设置环境变量
export FLASK_APP=run.py
export FLASK_ENV=development

# macOS 兼容性设置
export OBJC_DISABLE_INITIALIZE_FORK_SAFETY=YES

# 启动 Celery Worker
# -A: 指定 Celery 应用
# -l: 日志级别
# -c: 并发数（worker 进程数）
# -n: worker 名称
celery -A celery_worker.celery worker --loglevel=info --concurrency=4 -n worker@%h 