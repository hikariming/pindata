# LLaMA-DataSet 后端服务

## 项目结构

```
backend/
├── app/                    # 应用主目录
│   ├── api/               # API接口
│   │   └── v1/           # API v1版本
│   │       ├── endpoints/ # 端点实现
│   │       └── schemas/   # 请求/响应模式
│   ├── core/              # 核心功能
│   ├── db/                # 数据库配置
│   ├── models/            # 数据模型
│   ├── services/          # 业务服务
│   ├── plugins/           # 插件系统
│   │   ├── parsers/       # 文档解析器
│   │   ├── cleaners/      # 文本清洗器
│   │   └── distillers/    # 数据蒸馏器
│   └── utils/             # 工具函数
├── config/                # 配置文件
├── migrations/            # 数据库迁移
├── tests/                 # 测试代码
├── requirements.txt       # Python依赖
├── run.py                # 应用入口
└── Dockerfile            # Docker配置
```

## 快速开始

### 1. 本地开发

```bash
# 创建虚拟环境
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 安装依赖
pip install -r requirements.txt

# 复制环境配置
cp config.example.env .env

# 初始化数据库
python init_db.py

# 启动服务
python run.py
```

### 2. Docker运行

```bash
# 使用docker-compose启动（推荐）
cd ..
docker-compose up -d

# 或单独构建运行
docker build -t llama-dataset-backend .
docker run -p 5000:5000 llama-dataset-backend
```

## API文档

启动服务后，访问以下地址查看API文档：
- Swagger UI: http://localhost:5000/apidocs

## 主要功能模块

### 1. 数据集管理
- 创建、查询、删除数据集
- 数据集版本控制
- 数据集统计信息

### 2. 任务管理
- 异步任务执行
- 任务状态跟踪
- 任务结果查询

### 3. 插件系统
- 文档解析器插件
- 文本清洗器插件
- 数据蒸馏器插件
- 插件配置管理

### 4. 原始数据管理
- 文件上传
- 文件存储（MinIO）
- 文件元数据管理

## 开发指南

### 添加新的API端点

1. 在`app/api/v1/endpoints/`下创建新文件
2. 定义路由和处理函数
3. 添加Swagger文档注释
4. 在`app/api/v1/endpoints/__init__.py`中导入

### 添加新的模型

1. 在`app/models/`下创建模型文件
2. 定义SQLAlchemy模型类
3. 在`app/models/__init__.py`中导出
4. 运行数据库迁移

### 添加新的插件

1. 在对应的插件目录下创建插件类
2. 继承基类并实现必要方法
3. 在插件注册函数中注册
4. 更新数据库中的插件记录

## 环境变量说明

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| FLASK_ENV | 运行环境 | development |
| DATABASE_URL | PostgreSQL连接URL | postgresql://... |
| REDIS_URL | Redis连接URL | redis://... |
| MINIO_ENDPOINT | MinIO服务地址 | localhost:9000 |
| JWT_SECRET_KEY | JWT密钥 | dev-jwt-secret |

## 测试

```bash
# 运行所有测试
pytest

# 运行特定测试
pytest tests/unit/test_models.py

# 查看测试覆盖率
pytest --cov=app tests/
```

## 故障排除

### 数据库连接失败
- 检查PostgreSQL是否运行
- 确认DATABASE_URL配置正确
- 检查防火墙设置

### MinIO连接失败
- 确认MinIO服务运行
- 检查MINIO_ENDPOINT配置
- 验证访问密钥是否正确

### 依赖安装失败
- 更新pip: `pip install --upgrade pip`
- 使用国内镜像: `pip install -i https://pypi.tuna.tsinghua.edu.cn/simple -r requirements.txt` 