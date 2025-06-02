# Celery 任务队列设置指南

## 概述

本项目使用 Celery 作为异步任务队列来处理文档转换任务。Celery 使用 Redis 作为消息代理（broker）和结果后端（backend）。

## 前置要求

1. Redis 服务器正在运行（默认端口 6379）
2. PostgreSQL 数据库已配置
3. Python 环境已安装所需依赖

## 设置步骤

### 1. 运行数据库迁移

首先需要添加 `celery_task_id` 字段到数据库：

```bash
cd backend
python migrations/add_celery_task_id.py
```

### 2. 启动 Celery Worker

有两种方式启动 Celery Worker：

**方式一：使用 shell 脚本**
```bash
cd backend
chmod +x start_celery.sh
./start_celery.sh
```

**方式二：直接使用 celery 命令**
```bash
cd backend
celery -A celery_worker.celery worker --loglevel=info --concurrency=4
```

### 3. 监控 Celery 任务

**查看 Celery Worker 日志**
Worker 启动后会在控制台输出日志，可以看到：
- Worker 启动信息
- 接收到的任务
- 任务执行状态
- 错误信息

**使用 Flower 监控（可选）**
```bash
# 安装 Flower
pip install flower

# 启动 Flower
celery -A celery_worker.celery flower
```

然后访问 http://localhost:5555 查看任务队列状态。

## 任务执行流程

1. 用户在前端选择文件并点击"转换为 Markdown"
2. 后端创建 `ConversionJob` 记录并提交任务到 Celery 队列
3. Celery Worker 从队列中获取任务并执行
4. 任务执行过程中会更新数据库中的状态和进度
5. 前端可以通过 API 查询任务状态

## 配置说明

### Celery 配置（config/config.py）

```python
CELERY_BROKER_URL = 'redis://localhost:6379/0'  # Redis 作为消息代理
CELERY_RESULT_BACKEND = 'redis://localhost:6379/0'  # Redis 作为结果后端
CELERY_TASK_SERIALIZER = 'json'  # 任务序列化格式
CELERY_RESULT_SERIALIZER = 'json'  # 结果序列化格式
CELERY_ACCEPT_CONTENT = ['json']  # 接受的内容类型
CELERY_TIMEZONE = 'UTC'  # 时区设置
CELERY_ENABLE_UTC = True  # 启用 UTC
```

### Worker 配置

- `concurrency`: Worker 进程数（默认 4）
- `loglevel`: 日志级别（info, debug, warning, error）
- `task_time_limit`: 任务超时时间（30 分钟）
- `task_soft_time_limit`: 软超时时间（25 分钟）

## 故障排除

### 1. Worker 无法连接到 Redis
- 检查 Redis 服务是否正在运行：`redis-cli ping`
- 检查 Redis 连接配置是否正确

### 2. 任务一直处于 PENDING 状态
- 确保 Celery Worker 正在运行
- 检查 Worker 日志是否有错误信息
- 确保数据库迁移已执行

### 3. 任务执行失败
- 查看 Worker 日志中的错误信息
- 检查文件权限和 MinIO 连接
- 确保 markitdown 依赖已正确安装

## 开发建议

1. **本地开发**：建议使用单个 Worker 进程，方便调试
2. **生产环境**：根据负载调整 Worker 进程数
3. **任务监控**：使用 Flower 或自定义监控面板
4. **错误处理**：实现任务重试机制（已在代码中配置）

## 相关文件

- `app/celery_app.py`: Celery 应用配置
- `app/tasks/conversion_tasks.py`: 转换任务实现
- `app/services/conversion_service.py`: 转换服务
- `celery_worker.py`: Worker 启动脚本
- `start_celery.sh`: 便捷启动脚本 