#!/bin/bash

echo "🧹 PinData 进程清理工具"
echo "========================"

# 检查并停止占用8897端口的进程
echo ""
echo "🔍 检查8897端口占用情况..."
PORT_PROCESSES=$(lsof -i :8897 | grep LISTEN)

if [ -z "$PORT_PROCESSES" ]; then
    echo "✅ 端口8897空闲"
else
    echo "⚠️  发现占用8897端口的进程："
    echo "$PORT_PROCESSES"
    
    # 提取PID并停止进程
    PIDS=$(lsof -t -i :8897)
    if [ ! -z "$PIDS" ]; then
        echo ""
        echo "🛑 正在停止这些进程..."
        for pid in $PIDS; do
            echo "   停止进程 $pid"
            kill -9 $pid 2>/dev/null
        done
        
        sleep 2
        
        # 再次检查
        if [ -z "$(lsof -t -i :8897)" ]; then
            echo "✅ 端口8897已释放"
        else
            echo "❌ 某些进程可能仍在运行"
        fi
    fi
fi

# 检查相关的Python进程
echo ""
echo "🔍 检查相关的Python进程..."
PYTHON_PROCESSES=$(ps aux | grep -E "(run\.py|celery)" | grep -v grep)

if [ -z "$PYTHON_PROCESSES" ]; then
    echo "✅ 没有发现相关的Python进程"
else
    echo "⚠️  发现相关进程："
    echo "$PYTHON_PROCESSES"
    
    echo ""
    read -p "是否要停止这些进程? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # 停止run.py进程
        pkill -f "run.py"
        # 停止celery进程
        pkill -f "celery"
        echo "✅ 进程已停止"
    fi
fi

# 检查端口5173 (前端)
echo ""
echo "🔍 检查5173端口占用情况..."
FRONTEND_PROCESSES=$(lsof -i :5173 | grep LISTEN)

if [ -z "$FRONTEND_PROCESSES" ]; then
    echo "✅ 端口5173空闲"
else
    echo "⚠️  发现占用5173端口的进程："
    echo "$FRONTEND_PROCESSES"
fi

# 检查Redis连接
echo ""
echo "🔍 检查Redis连接..."
if command -v redis-cli &> /dev/null; then
    if redis-cli -p 16379 ping &> /dev/null; then
        echo "✅ Redis (端口16379) 连接正常"
    else
        echo "❌ Redis (端口16379) 连接失败"
    fi
else
    echo "⚠️  Redis CLI 未安装，无法测试连接"
fi

echo ""
echo "🎯 清理完成！现在可以运行 ./start.sh 启动服务" 