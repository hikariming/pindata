# ProjectDetail 组件结构

此目录包含项目详情页面的所有相关组件，采用模块化设计以提高代码的可维护性和重用性。

## 文件结构

```
ProjectDetail/
├── index.ts                 # 导出所有组件
├── ProjectDetail.tsx        # 主组件，包含页面布局和tab切换
├── RawDataTab.tsx          # 原始数据管理Tab
├── GovernedDataTab.tsx     # 治理后数据Tab
├── KnowledgeTab.tsx        # 知识管理Tab
├── DatasetsTab.tsx         # 数据集管理Tab
├── AnalyticsTab.tsx        # 数据分析Tab
└── README.md               # 此文件
```

## 组件说明

### ProjectDetail.tsx
- 主要负责页面布局和结构
- 包含项目头部信息、指标总览、Tab导航
- 处理项目数据的加载和错误状态
- 管理Tab切换逻辑

### RawDataTab.tsx
- 原始数据源管理
- 文件上传功能
- 文件列表展示和筛选
- 文件预览功能（包含模态框）
- 独立的状态管理（loading、file lists等）

### GovernedDataTab.tsx
- 显示经过治理的数据
- 数据质量评分展示
- 数据下载和预览功能

### KnowledgeTab.tsx
- 知识库管理
- 数据字典、业务规则、最佳实践
- 知识项的查看和编辑

### DatasetsTab.tsx
- 数据集管理
- 数据集创建和发布状态
- API访问和下载功能

### AnalyticsTab.tsx
- 数据分析报告
- 质量趋势图表
- 异常检测报告
- 使用统计

## 设计原则

1. **单一职责**: 每个Tab组件只负责自己的功能域
2. **数据传递**: 通过props传递必要的项目数据
3. **状态隔离**: 每个组件管理自己的状态
4. **类型安全**: 使用TypeScript确保类型安全
5. **可扩展性**: 便于添加新的Tab或功能

## 使用方式

```typescript
import { ProjectDetail } from './ProjectDetail';

// 在路由中使用
<Route path="/governance/project/:id" component={ProjectDetail} />
```

## 未来扩展

- 可以轻松添加新的Tab组件
- 每个Tab可以独立开发和测试
- 支持懒加载优化性能
- 便于团队并行开发

## 注意事项

- 确保所有Tab组件都遵循相同的props接口
- 保持样式的一致性
- 处理好错误状态和加载状态
- 考虑性能优化（如虚拟滚动等） 