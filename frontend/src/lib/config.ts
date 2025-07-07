// 配置常量
export const config = {
  // API基础地址
  apiBaseUrl: 'http://localhost:8897/api/v1/',
  downloadBaseUrl: 'http://localhost:8897/',
  
  // 应用信息
  appName: 'LLaMA Dataset Manager',
  appVersion: '1.0.0',
  
  // 分页配置
  defaultPageSize: 20,
  maxPageSize: 100,
  
  // 文件上传配置
  maxFileSize: 100 * 1024 * 1024, // 100MB
  allowedFileTypes: [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/markdown'
  ],
  
  // UI配置
  tableRefreshInterval: 30000, // 30秒自动刷新
  notificationDuration: 3000, // 通知显示时长
};

// 数据类型映射
export const dataTypeLabels = {
  training: '训练数据',
  evaluation: '评估数据',
  mixed: '混合数据',
};

// 处理状态映射
export const processStatusLabels = {
  pending: '等待处理',
  processing: '处理中',
  completed: '已完成',
  failed: '处理失败',
};

// 处理状态颜色映射
export const processStatusColors = {
  pending: 'text-yellow-600 bg-yellow-50 border-yellow-200',
  processing: 'text-blue-600 bg-blue-50 border-blue-200',
  completed: 'text-green-600 bg-green-50 border-green-200',
  failed: 'text-red-600 bg-red-50 border-red-200',
}; 