# 图片标注 API 接口示例

本文档提供了图片标注相关的 CURL 接口调用示例。

## 基础信息

- **基础URL**: `http://localhost:5000/api/v1`
- **认证**: Bearer Token (如果需要)
- **Content-Type**: `application/json`

## 1. 获取图片标注列表

### 获取所有标注
```bash
curl -X GET "http://localhost:5000/api/v1/image-annotations" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 获取特定文件的标注
```bash
curl -X GET "http://localhost:5000/api/v1/image-annotations?file_id=file_123" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 按类型筛选标注
```bash
curl -X GET "http://localhost:5000/api/v1/image-annotations?type=object_detection&source=ai" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 分页查询
```bash
curl -X GET "http://localhost:5000/api/v1/image-annotations?page=1&per_page=20" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 2. 创建图片标注

### 创建问答标注
```bash
curl -X POST "http://localhost:5000/api/v1/image-annotations" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "file_id": "file_123",
    "type": "qa",
    "source": "human",
    "content": {
      "question": "图片中有什么？",
      "answer": "一只可爱的小猫在窗台上晒太阳"
    },
    "confidence": 0.95,
    "category": "动物",
    "tags": ["猫", "宠物", "室内"],
    "metadata": {
      "annotator": "张三",
      "language": "zh-CN"
    },
    "created_by": "user_456"
  }'
```

### 创建图片描述标注
```bash
curl -X POST "http://localhost:5000/api/v1/image-annotations" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "file_id": "file_123",
    "type": "caption",
    "source": "ai",
    "content": {
      "caption": "一只橙色的猫咪坐在阳光明媚的窗台上，背景是蓝天白云"
    },
    "confidence": 0.89,
    "category": "自然场景",
    "tags": ["猫", "窗台", "阳光"],
    "metadata": {
      "model": "gpt-4-vision",
      "temperature": 0.7
    },
    "created_by": "ai_system"
  }'
```

### 创建目标检测标注
```bash
curl -X POST "http://localhost:5000/api/v1/image-annotations" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "file_id": "file_123",
    "type": "object_detection",
    "source": "ai",
    "content": {
      "objects": [
        {
          "label": "cat",
          "confidence": 0.92,
          "bbox": {
            "x": 0.25,
            "y": 0.35,
            "width": 0.4,
            "height": 0.3
          }
        },
        {
          "label": "window",
          "confidence": 0.87,
          "bbox": {
            "x": 0.1,
            "y": 0.2,
            "width": 0.8,
            "height": 0.6
          }
        }
      ]
    },
    "region": {
      "x": 0.25,
      "y": 0.35,
      "width": 0.4,
      "height": 0.3
    },
    "confidence": 0.92,
    "category": "动物检测",
    "metadata": {
      "model": "yolo-v8",
      "model_version": "1.0.0"
    },
    "created_by": "detection_service"
  }'
```

### 创建图像分割标注
```bash
curl -X POST "http://localhost:5000/api/v1/image-annotations" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "file_id": "file_123",
    "type": "segmentation",
    "source": "human",
    "content": {
      "segments": [
        {
          "label": "cat",
          "polygon": {
            "points": [
              {"x": 0.25, "y": 0.35},
              {"x": 0.65, "y": 0.35},
              {"x": 0.65, "y": 0.65},
              {"x": 0.25, "y": 0.65}
            ]
          },
          "confidence": 0.95
        }
      ]
    },
    "coordinates": {
      "polygon_points": [
        {"x": 0.25, "y": 0.35},
        {"x": 0.65, "y": 0.35},
        {"x": 0.65, "y": 0.65},
        {"x": 0.25, "y": 0.65}
      ]
    },
    "confidence": 0.95,
    "category": "动物分割",
    "created_by": "user_456"
  }'
```

### 创建OCR标注
```bash
curl -X POST "http://localhost:5000/api/v1/image-annotations" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "file_id": "file_123",
    "type": "ocr",
    "source": "ai",
    "content": {
      "text_blocks": [
        {
          "text": "Hello World",
          "bbox": {
            "x": 0.1,
            "y": 0.1,
            "width": 0.3,
            "height": 0.05
          },
          "confidence": 0.98,
          "language": "en"
        },
        {
          "text": "你好世界",
          "bbox": {
            "x": 0.1,
            "y": 0.2,
            "width": 0.25,
            "height": 0.05
          },
          "confidence": 0.95,
          "language": "zh"
        }
      ]
    },
    "confidence": 0.96,
    "category": "文字识别",
    "metadata": {
      "ocr_engine": "tesseract",
      "version": "5.0.0"
    },
    "created_by": "ocr_service"
  }'
```

## 3. 更新图片标注

```bash
curl -X PUT "http://localhost:5000/api/v1/image-annotations/annotation_789" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "content": {
      "question": "图片中的猫是什么品种？",
      "answer": "这是一只英国短毛猫，橙色毛发，看起来很健康"
    },
    "confidence": 0.97,
    "tags": ["英国短毛猫", "橙猫", "宠物"],
    "updated_by": "user_456"
  }'
```

## 4. 删除图片标注

```bash
curl -X DELETE "http://localhost:5000/api/v1/image-annotations/annotation_789" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "deleted_by": "user_456"
  }'
```

## 5. 批量创建标注

```bash
curl -X POST "http://localhost:5000/api/v1/image-annotations/batch" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "annotations": [
      {
        "file_id": "file_123",
        "type": "qa",
        "source": "human",
        "content": {
          "question": "图片主题是什么？",
          "answer": "宠物生活"
        },
        "confidence": 0.9,
        "created_by": "user_456"
      },
      {
        "file_id": "file_456",
        "type": "caption",
        "source": "ai",
        "content": {
          "caption": "一只狗在公园里玩耍"
        },
        "confidence": 0.85,
        "created_by": "ai_system"
      }
    ]
  }'
```

## 6. 获取文件标注统计

```bash
curl -X GET "http://localhost:5000/api/v1/files/file_123/annotations/stats" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 7. 导出标注数据

### 导出为JSON格式
```bash
curl -X POST "http://localhost:5000/api/v1/image-annotations/export" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "format": "json",
    "file_ids": ["file_123", "file_456"],
    "filter": {
      "type": "object_detection",
      "source": "ai",
      "review_status": "approved"
    }
  }'
```

### 导出为COCO格式
```bash
curl -X POST "http://localhost:5000/api/v1/image-annotations/export" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "format": "coco",
    "file_ids": ["file_123", "file_456"],
    "filter": {
      "type": "object_detection",
      "review_status": "approved"
    }
  }'
```

### 导出为YOLO格式
```bash
curl -X POST "http://localhost:5000/api/v1/image-annotations/export" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "format": "yolo",
    "file_ids": ["file_123", "file_456"],
    "filter": {
      "type": "object_detection"
    }
  }'
```

## 8. 标注审核

### 审核通过
```bash
curl -X POST "http://localhost:5000/api/v1/image-annotations/annotation_789/review" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "review_status": "approved",
    "review_comments": "标注质量很好，准确性高",
    "reviewer_id": "reviewer_123"
  }'
```

### 审核拒绝
```bash
curl -X POST "http://localhost:5000/api/v1/image-annotations/annotation_789/review" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "review_status": "rejected",
    "review_comments": "标注区域不准确，需要重新标注",
    "reviewer_id": "reviewer_123"
  }'
```

## 9. 获取单个标注详情

```bash
curl -X GET "http://localhost:5000/api/v1/image-annotations/annotation_789" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 响应示例

### 成功响应
```json
{
  "message": "标注创建成功",
  "annotation": {
    "id": "annotation_789",
    "file_id": "file_123",
    "type": "qa",
    "source": "human",
    "content": {
      "question": "图片中有什么？",
      "answer": "一只可爱的小猫在窗台上晒太阳"
    },
    "confidence": 0.95,
    "category": "动物",
    "tags": ["猫", "宠物", "室内"],
    "metadata": {
      "annotator": "张三",
      "language": "zh-CN"
    },
    "review_status": "pending",
    "created_at": "2024-01-01T10:00:00Z",
    "updated_at": "2024-01-01T10:00:00Z",
    "created_by": "user_456"
  }
}
```

### 错误响应
```json
{
  "error": "创建标注失败: 文件ID不存在"
}
```

## 常用查询参数

- `file_id`: 文件ID
- `type`: 标注类型 (qa, caption, classification, object_detection, segmentation, keypoint, ocr, custom)
- `source`: 标注来源 (human, ai, detection, imported)
- `category`: 标注类别
- `review_status`: 审核状态 (pending, approved, rejected)
- `page`: 页码
- `per_page`: 每页数量

## 注意事项

1. **坐标系统**: 所有坐标使用相对坐标 (0-1)，便于不同尺寸图片的标注复用
2. **置信度**: 范围为 0-1，AI生成的标注通常包含置信度信息
3. **审核流程**: 建议对AI生成的标注进行人工审核
4. **批量操作**: 支持批量创建和导出，提高标注效率
5. **格式转换**: 支持多种标注格式导出，便于与其他工具集成 