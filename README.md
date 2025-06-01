# LLaMA-DataSet - 大模型训练数据集管理系统

![LLaMA-DataSet Logo](https://via.placeholder.com/150?text=)

LLaMA-DataSet是一个开源的大模型训练数据集管理系统，专注于简化数据集的创建、处理、版本控制和转换流程。系统采用管道化数据处理和插件化架构设计，支持从各种文档格式中提取文本语料，并将其转换为适合大模型训练的格式（如纯文本块或Alpaca对话格式）。

## 设计理念

LLaMA-DataSet的设计基于三大核心理念：

1. **管道化数据流**
   - 受MongoDB管道概念启发，数据处理被分解为可组合的步骤
   - 用户可自定义数据处理流程：提取 → 清洗 → 蒸馏 → 输出
   - 每个处理步骤可独立配置和复用

2. **版本化数据集管理**
   - Git风格的数据集版本控制
   - 完整的数据血缘追踪
   - 版本间差异比较和历史回溯

3. **插件化处理引擎**
   - 可扩展的文档解析器和数据蒸馏器
   - 支持自定义处理插件
   - 社区驱动的插件市场

## 系统架构

LLaMA-DataSet采用分层架构设计，确保各模块职责清晰：

```
┌───────────────────────┐
│      前端 (React)     │
├───────────────────────┤
│    API层 (Flask)      │
├───────────────────────┤
│   业务逻辑层 (Python)  │
├───────────┬───────────┤
│ 插件系统  │ 数据访问层 │
├───────────┴───────────┤
│  存储层 (MinIO/PG)    │
└───────────────────────┘
```

### 核心组件

1. **前端界面**
   - 数据集管理：创建、查看、删除数据集
   - 文档上传：支持Word、PPT、PDF等格式
   - 管道编辑器：可视化配置数据处理流程
   - 数据预览：查看处理后的数据集内容

2. **后端服务**
   - RESTful API：提供数据集管理、管道执行等功能
   - 插件引擎：动态加载和执行处理插件
   - 管道执行器：按配置顺序执行数据处理步骤
   - 任务队列：异步处理长时间运行的任务

3. **数据处理插件**
   - **解析器**：从文档中提取文本内容
     - DOCX解析器、PPTX解析器、PDF解析器等
   - **清洗器**：优化提取的文本内容
     - 广告过滤器、敏感词过滤器、格式标准化器等
   - **蒸馏器**：转换为训练数据格式
     - 纯文本块生成器、Alpaca对话格式转换器等

4. **存储系统**
   - **MinIO**：存储原始文档和处理后的文件
   - **PostgreSQL**：管理数据集元数据和版本信息
   - **Delta Lake**：存储结构化数据集内容（未来版本）

## 技术栈

### 后端技术

| 组件           | 技术选择                 | 说明                          |
|----------------|--------------------------|-------------------------------|
| 框架           | Flask                    | Python Web框架                |
| 数据库         | PostgreSQL  + redis             | 关系型数据库，存储元数据       |
| 对象存储       | MinIO   + gitlfs                 | 存储文档和文件                |
| ORM            | SQLAlchemy               | 数据库操作抽象                |
| 任务队列       | Celery + Redis           | 异步任务处理                  |
| 数据处理       | Pandas                   | 数据集操作和分析              |
| 插件系统       | Python 动态导入          | 支持运行时加载插件            |
| 数据湖         | Delta Lake (未来版本)    | 结构化数据集版本管理          |
| API文档        | Swagger/OpenAPI          | API文档生成                  |

### 前端技术

| 组件           | 技术选择                 | 说明                          |
|----------------|--------------------------|-------------------------------|
| 框架           | React 18                 | 前端UI框架                    |
| 状态管理       | Redux Toolkit            | 全局状态管理                  |
| UI组件库       | Ant Design               | 企业级React UI组件库          |
| 图表           | ECharts/Recharts         | 数据可视化                    |
| 路由           | React Router v6          | 页面路由管理                  |
| HTTP客户端     | Axios                    | API请求库                     |

### 部署与基础设施

| 组件           | 技术选择                 | 说明                          |
|----------------|--------------------------|-------------------------------|
| 容器化         | Docker                   | 应用容器化                    |
| 编排           | Docker Compose           | 多容器应用管理                |
| 配置管理       | .env文件                 | 环境变量配置                  |
| 持续集成       | GitHub Actions           | 自动化构建和测试              |

## 核心功能

1. **数据集生命周期管理**
   - 创建、克隆和删除数据集
   - 数据集元数据管理（名称、描述、标签等）

2. **文档提取与处理**
   - 支持多种文档格式上传（DOCX, PPTX, PDF等）
   - 自动提取文本内容
   - 批量处理文档集合

3. **管道化数据处理**
   - 可视化管道编辑器
   - 可配置的处理步骤序列
   - 实时处理进度跟踪

4. **版本控制系统**
   - 基于父版本创建新版本
   - 版本历史树状视图
   - 版本间差异比较

5. **插件生态系统**
   - 内置基础处理插件
   - 支持自定义插件开发
   - 插件配置和管理界面

6. **数据转换与导出**
   - 转换为纯文本块格式
   - 转换为Alpaca对话格式
   - 导出为JSON、CSV等通用格式

## 快速开始

### 前置条件

- Docker 20.10+
- Docker Compose 1.29+

### 启动系统

```bash
# 克隆仓库
git clone https://github.com/yourusername/LLaMA-DataSet.git
cd LLaMA-DataSet

# 启动服务
docker-compose up -d

# 访问前端
http://localhost:3000

# 访问API文档
http://localhost:5000/api/docs
```

### 创建第一个数据集

1. 在前端创建新数据集
2. 上传Word或PPT文档
3. 配置数据处理管道：
   - 文档解析器
   - 文本清洗器
   - Alpaca格式蒸馏器
4. 执行管道并查看结果

## 开发指南

### 后端开发

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 启动开发服务器
flask run --host=0.0.0.0 --port=5000
```

### 前端开发

```bash
cd frontend
npm install

# 启动开发服务器
npm start
```

### 创建自定义插件

1. 在`plugins/custom_distillers/`目录下创建新文件：
   ```python
   # my_distiller.py
   from app.plugins.distillers.base_distiller import BaseDistiller

   class MyCustomDistiller(BaseDistiller):
       def distill(self, text_blocks, config):
           # 实现自定义处理逻辑
           return processed_data
   ```

2. 在插件注册函数中添加：
   ```python
   def register_plugins():
       from .my_distiller import MyCustomDistiller
       PluginRegistry.register_distiller('my_distiller', MyCustomDistiller)
   ```

cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python init_db.py  # 初始化数据库
python run.py      # 启动服务


3. 重启后端服务即可使用新插件

## 路线图

### MVP 1.0
- [x] 文本数据集管理
- [x] Word/PPT文档解析
- [x] 基础数据清洗功能
- [x] Alpaca格式转换器
- [x] 管道配置与执行

### 1.1 版本
- [ ] PDF文档支持
- [ ] 数据集导出功能
- [ ] 插件市场原型
- [ ] 数据质量分析面板

### 未来计划
- 多模态数据支持（图像、点云）
- 自动数据增强功能
- 大模型辅助数据清洗
- 数据集协作功能
- 云原生部署支持

## 贡献指南

我们欢迎各种形式的贡献！请阅读[贡献指南](CONTRIBUTING.md)了解如何参与项目开发。

## 许可证

LLaMA-DataSet 采用 [Apache License 2.0](LICENSE) 开源协议。




