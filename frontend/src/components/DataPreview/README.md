# DataPreview 组件

一个功能丰富的数据集预览组件，支持版本切换和文件管理。

## 主要功能

### 🔄 版本切换
- 下拉选择器显示所有可用版本
- 显示版本状态（默认、草稿、已废弃）
- 版本信息预览（作者、文件数、大小、创建时间）
- 一键切换到指定版本

### 📁 文件管理
- 文件列表展示和预览
- 支持多种文件类型（表格、JSON、文本、图像）
- 文件批量选择和操作
- 文件上传和删除功能

### 🔍 过滤和搜索
- 按文件类型过滤
- 文件全选/取消全选
- 实时预览更新

### 📊 版本信息
- 版本详细信息展示
- 版本信息导出（JSON/CSV/YAML）
- 提交历史和元数据

## 使用方法

### 基础使用

```tsx
import { DataPreviewContainer } from '@/components/DataPreview';

function MyComponent() {
  return (
    <DataPreviewContainer
      datasetId={123}
      initialVersionId="v1.0.0"
      onError={(error) => console.error(error)}
    />
  );
}
```

### 高级使用（自定义控制）

```tsx
import { DataPreview } from '@/components/DataPreview';
import { useState, useEffect } from 'react';

function MyAdvancedComponent() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const handleVersionChange = async (versionId: string) => {
    setLoading(true);
    try {
      const newData = await enhancedDatasetService.getDatasetPreview(
        datasetId, 
        versionId
      );
      setData(newData);
    } catch (error) {
      console.error('版本切换失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDataChange = () => {
    // 重新加载当前版本数据
    loadCurrentVersion();
  };

  if (loading) return <div>加载中...</div>;

  return (
    <DataPreview
      data={data}
      onVersionChange={handleVersionChange}
      onDataChange={handleDataChange}
      onRefresh={() => loadCurrentVersion()}
    />
  );
}
```

## 组件 Props

### DataPreview

| 属性 | 类型 | 必填 | 说明 |
|------|------|------|------|
| data | DatasetPreviewType | ✅ | 数据集预览数据 |
| onVersionChange | (versionId: string) => void | ❌ | 版本切换回调 |
| onRefresh | () => void | ❌ | 刷新数据回调 |
| onDataChange | () => void | ❌ | 数据变更回调 |

### DataPreviewContainer

| 属性 | 类型 | 必填 | 说明 |
|------|------|------|------|
| datasetId | number | ✅ | 数据集ID |
| initialVersionId | string | ❌ | 初始版本ID |
| onError | (error: Error) => void | ❌ | 错误处理回调 |

## 功能特性

### 版本切换界面
- 🎯 直观的版本选择器
- 📋 版本信息快速预览
- 🏷️ 状态标签显示（默认/草稿/已废弃）
- ⬇️ 版本信息快速导出

### 文件操作
- ✅ 批量选择文件
- 🗑️ 批量删除操作
- ⬆️ 文件拖拽上传
- ⬇️ 单文件下载

### 数据预览
- 📊 表格数据预览
- 🖼️ 图像缩略图
- 📄 文本内容预览
- 🔧 JSON 格式化显示

## 版本兼容性

此组件依赖以下服务：
- `enhancedDatasetService.getDatasetPreview()`
- `enhancedDatasetService.getVersionTree()`
- `enhancedDatasetService.downloadDatasetFile()`
- `enhancedDatasetService.exportVersionInfo()`

确保后端API支持这些方法调用。

## 样式自定义

组件使用 Tailwind CSS 类，可以通过以下方式自定义样式：

```css
/* 自定义版本选择器样式 */
[data-version-selector] .version-item {
  @apply hover:bg-blue-50 transition-colors;
}

/* 自定义文件列表样式 */
.file-preview-card {
  @apply shadow-sm hover:shadow-md transition-shadow;
}
```

## 注意事项

1. **数据加载**: 组件不处理数据加载逻辑，需要父组件管理
2. **错误处理**: 建议在父组件中实现完整的错误处理
3. **权限控制**: 文件操作权限需要在服务端验证
4. **性能优化**: 大量文件时建议使用分页加载 