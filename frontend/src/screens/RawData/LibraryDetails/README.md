# LibraryDetails 组件

LibraryDetails 组件负责显示单个文件库的详细信息，包括文件列表、转换功能和任务进度管理。

## 功能特性

### 1. 文件管理
- ✅ 文件列表显示（支持分页）
- ✅ 批量选择文件
- ✅ 单个/批量删除文件
- ✅ 文件上传功能
- ✅ 文件详情查看

### 2. 转换功能
- ✅ **快速转换（markitdown）**: 使用 markitdown 库进行快速文档转换
- ✅ **AI 智能转换（vision_llm）**: 使用视觉大模型进行高质量转换
- ✅ 批量转换支持
- ✅ 单文件转换支持
- ✅ 转换配置选项（OCR、格式保持、表格提取、图片提取）

### 3. 转换进度监控
- ✅ 实时显示转换任务进度
- ✅ 任务状态管理（等待、处理中、已完成、失败、已取消）
- ✅ 进度条和百分比显示
- ✅ 任务取消功能
- ✅ 错误信息显示

## 组件架构

```
LibraryDetails/
├── LibraryDetails.tsx          # 主组件
├── components/
│   ├── ConvertToMarkdownDialog.tsx  # 转换配置弹窗
│   └── ConversionProgress.tsx       # 转换进度显示
├── index.ts                    # 导出文件
└── README.md                   # 说明文档
```

## API 接口

### 文件转换接口
- `POST /api/v1/libraries/{library_id}/files/convert-to-markdown` - 提交转换任务
- `GET /api/v1/conversion-jobs/{job_id}` - 获取转换任务状态
- `POST /api/v1/conversion-jobs/{job_id}/cancel` - 取消转换任务

### 转换配置
```typescript
interface ConversionConfig {
  method: 'markitdown' | 'vision_llm';
  llmConfigId?: string;          // AI转换时的模型配置ID
  customPrompt?: string;         // 自定义提示词
  enableOCR?: boolean;           // 启用OCR
  preserveFormatting?: boolean;  // 保持格式
  extractTables?: boolean;       // 提取表格
  extractImages?: boolean;       // 提取图片
}
```

## 转换方法对比

| 功能 | 快速转换 (markitdown) | AI 智能转换 (vision_llm) |
|------|---------------------|------------------------|
| 转换速度 | ⚡ 快速 | 🐌 较慢 |
| 转换质量 | 📄 标准 | 🎯 高质量 |
| 支持格式 | PDF, DOCX, PPT, TXT | PDF, 图片, 复杂布局文档 |
| 成本 | 💰 免费 | 💸 消耗 API 调用 |
| 复杂布局 | ❌ 有限支持 | ✅ 智能识别 |
| 图表理解 | ❌ 基础提取 | ✅ 智能解析 |
| 自定义 | ❌ 固定规则 | ✅ 可配置提示词 |

## 使用方式

### 1. 单文件转换
点击文件列表中任意文件行的"转换为MD"按钮

### 2. 批量转换
1. 选择多个文件（使用复选框）
2. 点击"转换为MD (N)"按钮
3. 在弹窗中选择转换方法和配置
4. 点击"开始转换"

### 3. 进度监控
转换任务提交后，会在文件列表上方显示转换进度组件，包括：
- 正在执行的任务（带进度条）
- 最近完成的任务
- 任务取消功能

## 注意事项

1. **AI 智能转换**需要配置支持视觉功能的 LLM 模型
2. **转换任务**为异步处理，可能需要较长时间
3. **批量操作**建议分批处理，避免一次选择过多文件
4. **转换失败**时会显示详细错误信息，便于调试

## 未来改进

- [ ] 转换历史记录
- [ ] 转换模板管理
- [ ] 转换结果预览
- [ ] 批量下载转换结果
- [ ] 转换质量评估
- [ ] 转换时间预估 