# PinData Docker 部署指南

本目录包含了 PinData 项目的 Docker 配置文件，支持完整的微服务架构部署。

## 🏗️ 架构概览

### 服务组件

1. **pindata-frontend** - React 前端应用
   - 端口: 3000
   - 基于 Vite + React + TypeScript
   - 响应式 UI 界面

2. **pindata-api** - Flask API 服务
   - 端口: 8897
   - 提供 REST API 接口
   - 处理前端请求

3. **pindata-celery** - Celery Worker 服务
   - 异步任务处理
   - 数据集导入和转换
   - 后台任务执行

4. **PostgreSQL** - 主数据库
   - 端口: 5432
   - 存储应用数据

5. **MinIO** - 对象存储
   - API 端口: 9000
   - 控制台端口: 9001
   - 存储文件和数据集

6. **Redis** - 缓存和消息代理
   - 端口: 6379
   - Celery 消息队列
   - 应用缓存

## 🚀 快速开始

### 1. 构建镜像

```bash
# 构建 PinData API 镜像
cd docker
./build.sh
```

### 2. 启动所有服务

```bash
# 启动所有服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f pindata-api
docker-compose logs -f pindata-celery
```

### 3. 停止服务

```bash
# 停止所有服务
docker-compose down

# 停止服务并删除数据卷（谨慎使用）
docker-compose down -v
```

## 🔧 配置说明

### 环境变量

主要环境变量配置在 `docker-compose.yml` 中：

- `DATABASE_URL`: PostgreSQL 连接字符串
- `REDIS_URL`: Redis 连接字符串
- `MINIO_ENDPOINT`: MinIO 服务地址
- `CELERY_BROKER_URL`: Celery 消息代理地址
- `CELERY_RESULT_BACKEND`: Celery 结果存储地址

### 端口映射

- `3000`: PinData 前端应用
- `8897`: PinData API 服务
- `5432`: PostgreSQL 数据库
- `9000`: MinIO API
- `9001`: MinIO 控制台
- `6379`: Redis

## 📊 服务管理

### 查看服务状态

```bash
# 查看所有服务状态
docker-compose ps

# 查看特定服务日志
docker-compose logs -f pindata-api
docker-compose logs -f pindata-celery
```

### 重启服务

```bash
# 重启 API 服务
docker-compose restart pindata-api

# 重启 Celery 服务
docker-compose restart pindata-celery
```

### 扩展服务

```bash
# 扩展 Celery Workers（运行多个实例）
docker-compose up -d --scale pindata-celery=3
```

## 🔍 故障排除

### 常见问题

1. **端口冲突**
   - 检查本地端口是否被占用
   - 修改 `docker-compose.yml` 中的端口映射

2. **数据库连接失败**
   - 确保 PostgreSQL 服务已启动
   - 检查数据库连接字符串

3. **Celery 任务不执行**
   - 检查 Redis 服务状态
   - 查看 Celery Worker 日志

### 日志查看

```bash
# 查看所有服务日志
docker-compose logs

# 实时查看特定服务日志
docker-compose logs -f pindata-api

# 查看最近的 100 行日志
docker-compose logs --tail=100 pindata-celery
```

## 🔒 安全配置

生产环境部署时，请注意：

1. 修改默认密码
2. 配置 HTTPS
3. 限制网络访问
4. 定期备份数据

## 📝 维护命令

```bash
# 更新镜像
docker-compose pull
docker-compose up -d

# 清理未使用的镜像
docker image prune

# 备份数据卷
docker run --rm -v llama_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres-backup.tar.gz /data

# 恢复数据卷
docker run --rm -v llama_postgres_data:/data -v $(pwd):/backup alpine tar xzf /backup/postgres-backup.tar.gz -C /
``` 