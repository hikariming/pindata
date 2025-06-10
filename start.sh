#!/bin/bash

# 启动后端服务
echo "start backend..."
cd backend
source venv/bin/activate
python run.py &
BACKEND_PID=$!

# 启动Celery服务
echo "start celery..."
./start_celery_threads.sh &
CELERY_PID=$!

# 启动前端服务
echo "start frontend..."
cd ../frontend
sudo npm run dev &
FRONTEND_PID=$!

# 等待所有进程
wait $BACKEND_PID $CELERY_PID $FRONTEND_PID

# 清理进程
trap "kill $BACKEND_PID $CELERY_PID $FRONTEND_PID" EXIT 