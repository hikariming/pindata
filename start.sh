#!/bin/bash

# 获取脚本所在的目录，即项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONDA_ENV_NAME="pindata-env"

# --- 启动后端服务 ---
echo "--- Starting backend in Conda env: $CONDA_ENV_NAME ---"
cd "$PROJECT_ROOT/backend"

# 初始化数据库
echo "Initializing database..."
conda run -n "$CONDA_ENV_NAME" flask init-db

# 启动后端服务器 (后台运行)
echo "Starting backend server..."
conda run -n "$CONDA_ENV_NAME" python run.py &
BACKEND_PID=$!

# --- 启动Celery服务 ---
echo "--- Starting Celery... ---"
# Celery 脚本现在也会使用 conda run
./start_celery_threads.sh &
CELERY_PID=$!

# 等待后端和Celery服务启动
sleep 5

# --- 启动前端服务 ---
echo "--- Starting frontend... ---"
cd "$PROJECT_ROOT/frontend"

# 安装前端依赖 (如果node_modules不存在)
if [ ! -d "node_modules" ]; then
    echo "Node modules not found, running pnpm install..."
    pnpm install
fi

# 启动前端开发服务器 (后台运行)
echo "Starting frontend dev server..."
pnpm run dev &
FRONTEND_PID=$!

# 等待所有后台进程，并设置trap在退出时清理
# 当脚本接收到 SIGINT (Ctrl+C) 或 SIGTERM 时，杀死所有后台子进程
trap "echo 'Stopping all services...'; kill $BACKEND_PID $CELERY_PID $FRONTEND_PID 2>/dev/null; exit" SIGINT SIGTERM

wait 