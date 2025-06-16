# MediaFileDetails 组件优化说明

## 概述

本次优化主要针对 `MediaFileDetails` 组件中的AI标注和人工标注原型进行了增强，新增了以下功能：

1. **AI问答对话框** - 支持预制问题和自定义问题
2. **对象检测对话框** - 支持多种检测模式和用户自定义选项
3. **增强的标注存储** - 支持目标识别类型的标注数据存储

## 新增功能

### 1. AI问答对话框 (AIQuestionDialog)

**位置**: `dialogs/AIQuestionDialog.tsx`

**功能特点**:
- 预制分类问题库（通用、物体、细节、区域分析等）
- 支持自定义问题输入
- 区域相关问题（当选中图片区域时）
- 批量问题选择
- 实时显示选中问题数量

**使用方式**:
```tsx
// 在图片预览中点击"AI问答"按钮
<Button onClick={() => setShowAIQuestionDialog(true)}>
  AI问答
</Button>

// 对话框会根据选中的区域自动调整问题类型
```

**预制问题分类**:
- **通用问题**: 图片主要内容、颜色、风格等
- **物体识别**: 识别动物、建筑、车辆等
- **细节分析**: 文字内容、构图、表情等
- **区域分析**: 针对选中区域的专门问题（仅在选中区域时显示）

### 2. 对象检测对话框 (ObjectDetectionDialog)

**位置**: `dialogs/ObjectDetectionDialog.tsx`

**功能特点**:
- 三种检测模式：自动检测、指定类别、自定义对象
- 预定义检测类别（人物、车辆、建筑、自然、动物、物品、食物）
- 自定义对象输入
- 检测置信度调节
- 智能提示和帮助信息

**检测模式说明**:

#### 自动检测模式
- AI自动识别所有常见对象
- 最全面但处理时间较长
- 适合不确定图片内容的情况

#### 指定类别模式
- 选择特定的对象类别进行检测
- 每个类别包含多种具体物品
- 检测速度快，结果针对性强

#### 自定义模式
- 用户输入具体想要检测的对象
- 支持详细描述（如"红色汽车"）
- 检测结果最精准

### 3. 增强的标注系统

**新增标注类型**:
- `detection` - 对象检测标注
- 支持置信度显示
- 支持类别分类
- 区域位置信息显示

**标注数据结构**:
```typescript
interface Annotation {
  id: string;
  type: 'qa' | 'caption' | 'transcript' | 'detection';
  content: any;
  source: 'human' | 'ai' | 'detection';
  confidence?: number;
  timestamp: string;
  region?: { x: number; y: number; width: number; height: number };
  category?: string;
}
```

## 视觉改进

### 颜色编码系统
- **绿色**: AI生成的标注
- **橙色**: 手动标注
- **紫色**: 对象检测标注

### 标注面板新增
- **检测标签页**: 专门显示对象检测结果
- **统计信息**: 显示各类型标注数量
- **置信度显示**: 显示AI检测的置信度

## 使用流程

### AI问答流程
1. 在图片预览页面选择区域（可选）
2. 点击"AI问答"按钮
3. 选择预制问题或输入自定义问题
4. 点击"开始AI问答"
5. AI处理完成后结果显示在标注面板

### 对象检测流程
1. 在图片预览页面选择检测区域（可选）
2. 点击"对象检测"按钮
3. 选择检测模式：
   - 自动检测：直接开始
   - 指定类别：选择想要检测的类别
   - 自定义：输入具体对象名称
4. 调整置信度阈值
5. 点击"开始检测"
6. 检测结果以紫色框显示在图片上，详情在检测标签页

### 手动标注流程
1. 启用"区域选择"模式
2. 在图片上拖拽选择区域
3. 输入标注标签
4. 保存标注

## 技术实现

### 对话框组件
- 使用 `Dialog` 组件实现模态对话框
- 响应式布局，支持移动端
- 表单验证和状态管理
- 异步处理和加载状态

### 区域选择
- Canvas覆盖层实现区域绘制
- 鼠标事件处理
- 坐标转换和缩放适配
- 实时预览和调整

### 状态管理
- 使用 React Hooks 管理组件状态
- 异步操作的加载状态处理
- 错误处理和用户反馈

## 扩展性

### 添加新的问题类别
在 `AIQuestionDialog.tsx` 中的 `PRESET_QUESTIONS` 对象中添加新的分类：

```typescript
const PRESET_QUESTIONS = {
  image: {
    // 新增类别
    newCategory: [
      "新问题1",
      "新问题2"
    ]
  }
};
```

### 添加新的检测类别
在 `ObjectDetectionDialog.tsx` 中的 `DETECTION_CATEGORIES` 对象中添加：

```typescript
const DETECTION_CATEGORIES = {
  newCategory: {
    label: '新类别',
    icon: <NewIcon size={16} />,
    items: ['物品1', '物品2', '物品3']
  }
};
```

### 自定义标注类型
扩展 `Annotation` 接口并在对应组件中添加处理逻辑。

## 注意事项

1. **性能优化**: 大图片时注意内存使用，考虑图片压缩
2. **用户体验**: 长时间AI处理时提供进度指示
3. **错误处理**: 网络异常和AI服务异常的友好提示
4. **数据持久化**: 确保标注数据正确保存到后端

## 最新优化内容 (2024更新)

### ✅ 统一标注数据结构
- **人工检测标注**: 检测类型标注现在也支持人工创建，不再仅限于AI生成
- **统一source字段**: 所有标注现在使用 `source: 'human' | 'ai'` 来区分来源
- **增强标注对话框**: 支持选择标注类型（通用标注/对象检测）和添加描述信息

### ✅ 区域选择与标注联动
- **共用数据结构**: 区域选择和标注系统现在使用统一的数据结构
- **实时预览**: 在Canvas层实时显示所有类型的标注框
- **颜色编码**: 橙色(人工) vs 绿色(AI)，清晰区分标注来源

### ✅ AI问答优化
- **添加到选择功能**: 自定义问题可以通过"添加到选择"按钮加入预选问题列表
- **快捷键支持**: Ctrl+Enter 快速添加自定义问题到选择列表
- **统一处理**: 所有问题（预选+自定义）统一处理，不再区分参数

### ✅ 对象检测重构
- **重新排序**: 指定类别 → 自动检测 → 自定义，更符合用户使用习惯
- **自定义类别管理**: 
  - 用户可以添加新的检测类别
  - 支持为每个类别添加/删除具体项目
  - 实时编辑类别内容
- **localStorage持久化**: 所有自定义内容自动保存到浏览器缓存
- **保存提醒**: 操作后显示友好的保存确认信息

### ✅ 界面简化
- **移除冗余按钮**: 删除了"AI描述"和原有的"AI标注"按钮
- **专注核心功能**: 保留"AI问答"和"对象检测"两个核心AI功能

## 技术实现亮点

### localStorage存储系统
```typescript
// 自定义检测数据存储
interface CustomDetectionData {
  categories: CustomCategory[];     // 用户自定义类别
  customObjects: string[];         // 全局自定义对象
  lastUpdated: number;            // 最后更新时间
}

// 提供完整的CRUD操作
- addCustomCategory()           // 添加类别
- addItemToCategory()          // 为类别添加项目
- removeItemFromCategory()     // 移除类别项目
- deleteCustomCategory()       // 删除整个类别
```

### 统一标注数据结构
```typescript
interface Annotation {
  id: string;
  region: { x: number; y: number; width: number; height: number };
  label: string;
  type: 'manual' | 'ai' | 'detection';    // 标注类型
  source: 'human' | 'ai';                 // 标注来源
  timestamp: number;
  confidence?: number;                    // AI置信度
  category?: string;                      // 类别信息
  description?: string;                   // 描述信息
}
```

### 用户体验优化
- **实时反馈**: 操作后立即显示保存状态
- **智能提示**: 根据上下文提供操作指导
- **数据持久化**: 用户自定义内容永久保存
- **错误处理**: 友好的错误提示和异常处理

## 使用指南

### 创建人工检测标注
1. 启用区域选择模式
2. 在图片上绘制检测区域  
3. 在弹出对话框中选择"对象检测"类型
4. 输入对象名称和描述
5. 保存标注

### 管理自定义检测类别
1. 打开"对象检测"对话框
2. 在"指定类别"标签页点击"添加类别"
3. 输入类别名称并保存
4. 为类别添加具体检测项目
5. 所有更改自动保存到浏览器缓存

### AI问答工作流程
1. 可选择图片区域进行针对性提问
2. 从预设问题库中选择相关问题
3. 输入自定义问题并点击"添加到选择"
4. 一次性提交所有选中的问题给AI处理

## 数据存储说明

**localStorage键**: `pindata_custom_detection`

**数据备份**: 用户可以通过开发者工具导出localStorage数据进行备份

**数据恢复**: 支持JSON格式数据导入恢复

**存储限制**: 受浏览器localStorage容量限制（通常5-10MB）

## 后续改进建议

1. **批量操作**: 支持批量删除标注
2. **导出功能**: 支持标注数据导出为JSON/XML
3. **快捷键**: 添加键盘快捷键支持
4. **模板系统**: 支持保存和复用问题模板
5. **协作功能**: 多用户同时标注的冲突处理
6. **云端同步**: 将自定义类别同步到用户账户
7. **标注历史**: 显示标注的修改历史
8. **性能优化**: 大量标注时的渲染优化

# MediaAnnotationPanel 组件使用说明

## 概述

`MediaAnnotationPanel` 组件是一个完整的媒体标注面板，已经完全对接了后端API，支持图片和视频文件的标注功能。

## 功能特性

### 1. 标注类型支持
- **问答标注(QA)**: 支持问题和答案的配对标注
- **描述标注(Caption)**: 支持媒体内容的文字描述
- **转录标注(Transcript)**: 支持音频/视频的文字转录
- **检测标注(Detection)**: 支持对象检测和区域标注

### 2. 数据来源
- **人工标注**: 用户手动创建的标注
- **AI生成**: AI辅助生成的标注
- **检测结果**: 自动检测算法生成的标注

### 3. 后端API对接
组件已经完全对接后端API，支持：
- 获取文件标注列表
- 创建新标注
- 更新现有标注
- 删除标注
- AI辅助标注生成

## 使用方法

### 基础使用

```tsx
import { MediaAnnotationPanel } from './components/MediaFileDetails/MediaAnnotationPanel';
import { useAnnotations } from './hooks/useAnnotations';
import { useImageAnnotations } from './hooks/useImageAnnotations';

function FileDetailsPage({ fileId, fileData }) {
  // 对于普通文件（视频等）
  const {
    annotations,
    loading,
    createAnnotation,
    updateAnnotation,
    deleteAnnotation,
    requestAIAnnotation
  } = useAnnotations(fileId, fileData?.file_type);

  // 对于图片文件
  const {
    annotations: imageAnnotations,
    loading: imageLoading,
    createAnnotation: createImageAnnotation,
    updateAnnotation: updateImageAnnotation,
    deleteAnnotation: deleteImageAnnotation,
    generateAIAnnotation
  } = useImageAnnotations(fileId);

  const handleAIAnnotation = async (type, options) => {
    if (fileData?.file_category === 'image') {
      await generateAIAnnotation(type, options);
    } else {
      await requestAIAnnotation(type, options);
    }
  };

  return (
    <MediaAnnotationPanel
      fileData={fileData}
      annotations={fileData?.file_category === 'image' ? imageAnnotations : annotations}
      loading={fileData?.file_category === 'image' ? imageLoading : loading}
      onCreateAnnotation={fileData?.file_category === 'image' ? createImageAnnotation : createAnnotation}
      onUpdateAnnotation={fileData?.file_category === 'image' ? updateImageAnnotation : updateAnnotation}
      onDeleteAnnotation={fileData?.file_category === 'image' ? deleteImageAnnotation : deleteAnnotation}
      onAIAnnotation={handleAIAnnotation}
      isProcessing={false}
    />
  );
}
```

### 高级使用 - 统一数据处理

推荐使用 `MediaFileDetailsContainer` 组件，它已经内置了统一的数据处理逻辑：

```tsx
import { MediaFileDetailsContainer } from './components/MediaFileDetails/MediaFileDetailsContainer';

function FileDetailsPage() {
  const { libraryId, fileId } = useParams();
  
  return (
    <MediaFileDetailsContainer 
      libraryId={libraryId} 
      fileId={fileId} 
    />
  );
}
```

## 数据结构

### UnifiedAnnotation 接口

```tsx
interface UnifiedAnnotation {
  id: string;
  type: 'qa' | 'caption' | 'transcript' | 'detection' | 'OBJECT_DETECTION';
  content: any;
  source: 'human' | 'ai' | 'detection' | 'HUMAN_ANNOTATED' | 'AI_GENERATED';
  confidence?: number;
  timestamp: string;
  region?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  timeRange?: { start: number; end: number };
  category?: string;
  created_at?: string;
  updated_at?: string;
  review_status?: string;
  tags?: string[];
}
```

### 内容格式示例

#### 问答标注
```json
{
  "type": "qa",
  "content": {
    "question": "这张图片显示了什么？",
    "answer": "这是一张自然风景照片，展现了山脉和湖泊。"
  }
}
```

#### 描述标注
```json
{
  "type": "caption", 
  "content": {
    "caption": "美丽的山湖风景，蓝天白云倒映在平静的湖面上。"
  }
}
```

#### 检测标注
```json
{
  "type": "detection",
  "content": {
    "label": "汽车",
    "description": "红色轿车"
  },
  "region": {
    "x": 100,
    "y": 200,
    "width": 150,
    "height": 80
  },
  "confidence": 0.95
}
```

## AI功能

### 支持的AI标注类型

1. **AI问答** (`type: 'qa'`)
   - 自动生成相关问题和答案
   - 支持自定义问题列表

2. **AI描述** (`type: 'caption'`)
   - 自动生成图片/视频描述
   - 支持不同详细程度

3. **AI转录** (`type: 'transcript'`)
   - 音频/视频转文字
   - 支持时间戳

4. **对象检测** (`type: 'object_detection'`)
   - 自动识别和标注对象
   - 生成边界框和标签

### AI标注调用示例

```tsx
// AI问答
await onAIAnnotation('qa', {
  questions: ['这是什么？', '主要颜色是什么？'],
  model_provider: 'openai'
});

// AI描述  
await onAIAnnotation('caption', {
  detail_level: 'high',
  model_provider: 'openai'
});

// 对象检测
await onAIAnnotation('object_detection');
```

## 导出功能

组件支持多种格式的标注导出：

- **YOLO格式**: 用于YOLO模型训练
- **COCO格式**: 用于COCO数据集格式
- **Pascal VOC格式**: 用于Pascal VOC数据集
- **JSON格式**: 通用JSON格式
- **CSV格式**: 表格数据格式

## 注意事项

1. **权限控制**: 确保用户有相应的标注权限
2. **数据验证**: 组件会自动验证标注数据格式
3. **错误处理**: 内置错误处理和用户提示
4. **性能优化**: 大量标注时会自动分页加载
5. **实时更新**: 支持多用户协作的实时标注更新

## 故障排除

### 常见问题

1. **标注不显示**: 检查API连接和文件ID是否正确
2. **AI功能不工作**: 确认AI服务配置和模型可用性
3. **保存失败**: 检查网络连接和用户权限
4. **类型错误**: 确保使用最新的接口定义

### 调试模式

开发环境下会提供详细的错误日志和模拟数据，帮助调试。