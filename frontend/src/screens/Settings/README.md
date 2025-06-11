# Settings 组件重构说明

## 概述

本次重构将原来的单一大型Settings组件拆分为更模块化的结构，提高了代码的可维护性和复用性。

## 文件结构

```
frontend/src/screens/Settings/
├── Settings.tsx              # 主设置页面组件
├── components/
│   ├── index.ts              # 组件统一导出
│   ├── LLMConfig.tsx         # 大模型配置子组件
│   └── SystemLogs.tsx        # 系统日志子组件
└── README.md                 # 本说明文档
```

## 重构内容

### 1. 组件拆分

- **LLMConfigComponent**: 负责大模型配置的所有功能
  - 添加新配置
  - 编辑现有配置
  - 删除配置（带确认对话框）
  - 设置默认配置
  - 测试配置连接
  - 启用/禁用配置

- **SystemLogs**: 负责系统日志管理
  - 日志搜索和过滤
  - 日志导出
  - 日志清理
  - 实时日志显示

### 2. 功能完善

#### 大模型配置功能增强：
- ✅ 完整的编辑功能，支持修改所有配置参数
- ✅ 删除确认对话框，防止误删除
- ✅ 优化的用户体验，包括加载状态和错误处理
- ✅ 支持测试配置连接，实时反馈连接状态

#### 系统日志功能增强：
- ✅ 优化的日志搜索和过滤
- ✅ 日志统计信息显示
- ✅ 日志清理功能
- ✅ 日志导出功能

### 3. 技术改进

- **类型安全**: 使用严格的TypeScript类型定义
- **错误处理**: 完善的错误捕获和用户反馈
- **代码复用**: 抽取公共逻辑到自定义Hook
- **性能优化**: 使用useCallback优化函数缓存

## 使用方法

```tsx
import { Settings } from './screens/Settings/Settings';

// 在路由中使用
<Route path="/settings" element={<Settings />} />
```

## 子组件单独使用

```tsx
import { LLMConfigComponent, SystemLogs } from './screens/Settings/components';

// 单独使用大模型配置组件
<LLMConfigComponent />

// 单独使用系统日志组件
<SystemLogs />
```

## API 对接

### 大模型配置相关接口
- `GET /api/v1/llm/configs` - 获取配置列表
- `POST /api/v1/llm/configs` - 创建新配置
- `PUT /api/v1/llm/configs/{id}` - 更新配置
- `DELETE /api/v1/llm/configs/{id}` - 删除配置
- `POST /api/v1/llm/configs/set-default` - 设置默认配置
- `POST /api/v1/llm/configs/{id}/test` - 测试配置

### 系统日志相关接口
- `GET /api/v1/system/logs` - 获取日志列表
- `GET /api/v1/system/logs/stats` - 获取日志统计
- `POST /api/v1/system/logs/cleanup` - 清理旧日志
- `POST /api/v1/system/logs/export` - 导出日志

## 注意事项

1. 所有组件都支持国际化（i18n）
2. 使用统一的UI组件库（shadcn/ui）
3. 遵循项目的设计规范和色彩主题
4. 包含完整的错误处理和用户反馈
5. 支持移动端响应式设计 