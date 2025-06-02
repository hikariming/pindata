#!/bin/bash

echo "🚀 开始重置系统..."

# 1. 清理数据库
echo "📦 1. 清理数据库..."
psql postgresql://postgres:password@localhost:5432/llama_dataset -f cleanup_database.sql
if [ $? -eq 0 ]; then
    echo "✅ 数据库清理完成"
else
    echo "❌ 数据库清理失败"
    exit 1
fi

# 2. 设置MinIO
echo "🗄️  2. 设置MinIO存储..."
python setup_minio.py
if [ $? -eq 0 ]; then
    echo "✅ MinIO设置完成"
else
    echo "❌ MinIO设置失败"
    exit 1
fi

# 3. 重启Celery (如果正在运行)
echo "🔄 3. 重启Celery worker..."
pkill -f "celery.*worker" 2>/dev/null
sleep 2
nohup celery -A app.celery_app worker --loglevel=info > celery.log 2>&1 &
echo "✅ Celery worker 已重启"

echo ""
echo "🎉 系统重置完成!"
echo "📋 检查项目:"
echo "  - 数据库已清理"
echo "  - MinIO存储桶已准备就绪"  
echo "  - Celery worker已重启"
echo ""
echo "现在可以重新上传文件并进行转换了!" 