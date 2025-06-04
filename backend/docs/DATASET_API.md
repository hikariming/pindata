# 数据集 API 文档

## 概述

数据集模块提供了完整的数据集管理功能，包括创建、查询、更新、删除数据集，以及版本管理、标签管理、点赞和下载功能。

## 数据模型

### Dataset (数据集)
- `id`: 数据集ID
- `name`: 数据集名称
- `owner`: 拥有者
- `description`: 描述
- `size`: 数据集大小
- `downloads`: 下载次数
- `likes`: 点赞数
- `license`: 许可证
- `task_type`: 任务类型
- `language`: 语言
- `featured`: 是否推荐
- `created_at`: 创建时间
- `updated_at`: 更新时间

### DatasetVersion (数据集版本)
- `id`: 版本ID
- `dataset_id`: 数据集ID
- `version`: 版本号
- `file_path`: 文件路径
- `pipeline_config`: 管道配置
- `stats`: 统计信息
- `created_at`: 创建时间

### DatasetTag (数据集标签)
- `id`: 标签ID
- `dataset_id`: 数据集ID
- `name`: 标签名称

## API 端点

### 1. 获取数据集列表

```http
GET /api/v1/datasets
```

**查询参数:**
- `page`: 页码 (默认: 1)
- `per_page`: 每页数量 (默认: 20)
- `search`: 搜索关键词
- `sort_by`: 排序方式 (trending/newest/downloads/likes/updated)
- `filter_by`: 筛选方式 (all/my-datasets/liked)
- `task_type`: 任务类型
- `featured`: 是否推荐 (true/false)
- `language`: 语言

**响应示例:**
```json
{
  "datasets": [
    {
      "id": 1,
      "name": "Mixture-of-Thoughts",
      "owner": "open-r1",
      "description": "A comprehensive dataset for training mixture of expert models...",
      "size": "699MB",
      "downloads": 11300,
      "likes": 140,
      "license": "MIT",
      "taskType": "Natural Language Processing",
      "language": "English",
      "featured": true,
      "lastUpdated": "5 days ago",
      "created": "2024-01-15",
      "versions": 3,
      "tags": ["reasoning", "mixture-of-experts", "llm"]
    }
  ],
  "total": 100,
  "page": 1,
  "per_page": 20,
  "pages": 5,
  "has_next": true,
  "has_prev": false
}
```

### 2. 创建数据集

```http
POST /api/v1/datasets
```

**请求体:**
```json
{
  "name": "My Dataset",
  "owner": "username",
  "description": "数据集描述",
  "license": "MIT",
  "task_type": "Natural Language Processing",
  "language": "Chinese",
  "featured": false,
  "tags": ["nlp", "chinese", "text"]
}
```

**响应:** 返回创建的数据集信息

### 3. 获取数据集详情

```http
GET /api/v1/datasets/{dataset_id}
```

**响应示例:**
```json
{
  "id": 1,
  "name": "Mixture-of-Thoughts",
  "owner": "open-r1",
  "description": "...",
  "size": "699MB",
  "downloads": 11300,
  "likes": 140,
  "license": "MIT",
  "taskType": "Natural Language Processing",
  "language": "English",
  "featured": true,
  "lastUpdated": "5 days ago",
  "created": "2024-01-15",
  "versions": 3,
  "tags": ["reasoning", "mixture-of-experts", "llm"],
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-20T15:45:00Z",
  "version_list": [
    {
      "id": 1,
      "version": "v1.0",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### 4. 更新数据集

```http
PUT /api/v1/datasets/{dataset_id}
```

**请求体:**
```json
{
  "description": "更新的描述",
  "tags": ["new-tag1", "new-tag2"],
  "featured": true
}
```

### 5. 删除数据集

```http
DELETE /api/v1/datasets/{dataset_id}
```

**响应:** 204 No Content

### 6. 点赞数据集

```http
POST /api/v1/datasets/{dataset_id}/like
```

**响应示例:**
```json
{
  "message": "点赞成功",
  "likes": 141
}
```

### 7. 下载数据集

```http
POST /api/v1/datasets/{dataset_id}/download
```

**响应示例:**
```json
{
  "message": "下载记录成功",
  "downloads": 11301,
  "download_url": "/api/v1/datasets/1/files"
}
```

### 8. 获取数据集版本列表

```http
GET /api/v1/datasets/{dataset_id}/versions
```

**响应示例:**
```json
[
  {
    "id": 1,
    "dataset_id": 1,
    "version": "v1.0",
    "file_path": "datasets/open-r1/Mixture-of-Thoughts/data.json",
    "stats": {"file_size": 732160000},
    "created_at": "2024-01-15T10:30:00Z"
  }
]
```

### 9. 创建数据集版本

```http
POST /api/v1/datasets/{dataset_id}/versions
```

**请求体:**
```json
{
  "version": "v2.0",
  "parent_version_id": 1,
  "pipeline_config": {},
  "stats": {},
  "file_path": "datasets/owner/name/data_v2.json"
}
```

### 10. 获取数据集统计信息

```http
GET /api/v1/datasets/stats
```

**响应示例:**
```json
{
  "total_datasets": 100,
  "total_downloads": 50000,
  "total_likes": 2500,
  "task_type_stats": [
    {
      "task_type": "Natural Language Processing",
      "count": 45
    },
    {
      "task_type": "Computer Vision",
      "count": 30
    }
  ],
  "language_stats": [
    {
      "language": "English",
      "count": 60
    },
    {
      "language": "Chinese",
      "count": 25
    }
  ]
}
```

## 数据库设置

### 运行迁移脚本

```bash
# 创建数据集相关表
cd backend
python migrations/create_dataset_tables.py --create

# 删除表（如果需要重置）
python migrations/create_dataset_tables.py --drop --create
```

### 表结构

#### datasets 表
```sql
CREATE TABLE datasets (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    owner VARCHAR(255) NOT NULL,
    description TEXT,
    size VARCHAR(50),
    downloads INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    license VARCHAR(100),
    task_type VARCHAR(100),
    language VARCHAR(50),
    featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### dataset_versions 表
```sql
CREATE TABLE dataset_versions (
    id SERIAL PRIMARY KEY,
    dataset_id INTEGER REFERENCES datasets(id) ON DELETE CASCADE,
    version VARCHAR(50) NOT NULL,
    parent_version_id INTEGER REFERENCES dataset_versions(id),
    pipeline_config JSON,
    stats JSON,
    file_path VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### dataset_tags 表
```sql
CREATE TABLE dataset_tags (
    id SERIAL PRIMARY KEY,
    dataset_id INTEGER REFERENCES datasets(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL
);
```

#### dataset_likes 表
```sql
CREATE TABLE dataset_likes (
    id SERIAL PRIMARY KEY,
    dataset_id INTEGER REFERENCES datasets(id) ON DELETE CASCADE,
    user_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### dataset_downloads 表
```sql
CREATE TABLE dataset_downloads (
    id SERIAL PRIMARY KEY,
    dataset_id INTEGER REFERENCES datasets(id) ON DELETE CASCADE,
    user_id VARCHAR(255),
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 使用示例

### Python 客户端示例

```python
import requests

base_url = "http://localhost:5000/api/v1"

# 获取数据集列表
response = requests.get(f"{base_url}/datasets", params={
    "search": "nlp",
    "sort_by": "trending",
    "task_type": "Natural Language Processing",
    "page": 1,
    "per_page": 10
})
datasets = response.json()

# 创建数据集
new_dataset = {
    "name": "My NLP Dataset",
    "owner": "myuser",
    "description": "A dataset for NLP tasks",
    "license": "MIT",
    "task_type": "Natural Language Processing",
    "language": "English",
    "tags": ["nlp", "text", "classification"]
}
response = requests.post(f"{base_url}/datasets", json=new_dataset)
dataset = response.json()

# 点赞数据集
response = requests.post(f"{base_url}/datasets/1/like")
result = response.json()
```

### JavaScript 客户端示例

```javascript
// 获取数据集列表
const fetchDatasets = async (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  const response = await fetch(`/api/v1/datasets?${queryString}`);
  return response.json();
};

// 创建数据集
const createDataset = async (datasetData) => {
  const response = await fetch('/api/v1/datasets', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(datasetData),
  });
  return response.json();
};

// 点赞数据集
const likeDataset = async (datasetId) => {
  const response = await fetch(`/api/v1/datasets/${datasetId}/like`, {
    method: 'POST',
  });
  return response.json();
};
```

## 错误处理

API 使用标准的 HTTP 状态码：

- `200`: 成功
- `201`: 创建成功
- `400`: 请求参数错误
- `404`: 资源不存在
- `500`: 服务器内部错误

错误响应格式：
```json
{
  "error": "错误描述",
  "details": {
    "field": ["具体错误信息"]
  }
}
``` 