#!/bin/bash

echo "停止Redis容器..."
docker compose -f docker compose.yml down redis

echo "清理Redis数据卷..."
docker volume rm docker_redis_data 2>/dev/null || true

echo "重新启动Redis..."
docker compose -f docker compose.yml up -d redis

echo "等待Redis启动..."
sleep 3

echo "检查Redis状态..."
docker compose -f docker compose.yml logs --tail=20 redis

echo "测试Redis连接..."
docker exec llama_redis redis-cli ping 