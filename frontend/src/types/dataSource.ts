// 数据源配置类型定义

export type DataSourceType = 'database_table' | 'api_source';

export type DatabaseType = 'mysql' | 'postgresql' | 'sqlite' | 'oracle' | 'sql_server' | 'mongodb' | 'redis' | 'elasticsearch';

export type APIAuthType = 'none' | 'basic' | 'bearer' | 'api_key' | 'oauth2' | 'custom';

export type DataSourceStatus = 'active' | 'inactive' | 'error' | 'testing';

// 数据库配置接口
export interface DatabaseConfig {
  database_type?: DatabaseType;
  host?: string;
  port?: number;
  database_name?: string;
  username?: string;
  password?: string;
  schema_name?: string;
  table_name?: string;
  query?: string;
  connection_params?: Record<string, any>;
}

// API配置接口
export interface APIConfig {
  api_url?: string;
  api_method?: string;
  auth_type?: APIAuthType;
  auth_config?: Record<string, any>;
  headers?: Record<string, string>;
  query_params?: Record<string, string>;
  request_body?: string;
  response_path?: string;
  pagination_config?: Record<string, any>;
}

// 数据源配置接口
export interface DataSourceConfig {
  id: string;
  name: string;
  description?: string;
  source_type: DataSourceType;
  status: DataSourceStatus;
  project_id?: string;
  
  // 数据库配置
  database_type?: DatabaseType;
  host?: string;
  port?: number;
  database_name?: string;
  username?: string;
  password_encrypted?: string;
  schema_name?: string;
  table_name?: string;
  query?: string;
  connection_params?: Record<string, any>;
  connection_string?: string;
  
  // API配置
  api_url?: string;
  api_method?: string;
  auth_type?: APIAuthType;
  auth_config?: Record<string, any>;
  headers?: Record<string, string>;
  query_params?: Record<string, string>;
  request_body?: string;
  response_path?: string;
  pagination_config?: Record<string, any>;
  
  // 数据处理配置
  data_format?: string;
  mapping_config?: Record<string, any>;
  filter_config?: Record<string, any>;
  transform_config?: Record<string, any>;
  
  // 同步配置
  sync_enabled: boolean;
  sync_frequency?: string;
  last_sync_at?: string;
  next_sync_at?: string;
  sync_timeout?: number;
  
  // 统计信息
  total_records: number;
  last_record_count: number;
  success_count: number;
  error_count: number;
  last_error?: string;
  connection_test_result?: ConnectionTestResult;
  
  // 时间戳
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

// 连接测试结果接口
export interface ConnectionTestResult {
  success: boolean;
  message?: string;
  error?: string;
  tested_at: string;
  connection_time?: number;
  response_time?: number;
  status_code?: number;
  database_version?: string;
}

// 创建数据源配置请求接口
export interface CreateDataSourceConfigRequest {
  name: string;
  description?: string;
  source_type: DataSourceType;
  project_id?: string;
  database_config?: DatabaseConfig;
  api_config?: APIConfig;
}

// 数据源统计接口
export interface DataSourceStats {
  total_configs: number;
  by_type: Record<string, number>;
  by_status: Record<string, number>;
  active_count: number;
}

// 数据源配置列表响应接口
export interface DataSourceConfigListResponse {
  configs: DataSourceConfig[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
  stats: DataSourceStats;
}

// 数据源选项接口
export interface DataSourceOption {
  label: string;
  value: string;
  description?: string;
  icon?: string;
}

// 数据库类型选项
export const DATABASE_TYPE_OPTIONS: DataSourceOption[] = [
  { label: 'MySQL', value: 'mysql', description: 'MySQL数据库', icon: '🐬' },
  { label: 'PostgreSQL', value: 'postgresql', description: 'PostgreSQL数据库', icon: '🐘' },
  { label: 'SQLite', value: 'sqlite', description: 'SQLite数据库', icon: '📊' },
  { label: 'Oracle', value: 'oracle', description: 'Oracle数据库', icon: '🔮' },
  { label: 'SQL Server', value: 'sql_server', description: 'Microsoft SQL Server', icon: '🏢' },
  { label: 'MongoDB', value: 'mongodb', description: 'MongoDB文档数据库', icon: '🍃' },
  { label: 'Redis', value: 'redis', description: 'Redis缓存数据库', icon: '⚡' },
  { label: 'Elasticsearch', value: 'elasticsearch', description: 'Elasticsearch搜索引擎', icon: '🔍' }
];

// API认证类型选项
export const API_AUTH_TYPE_OPTIONS: DataSourceOption[] = [
  { label: '无认证', value: 'none', description: '不需要认证' },
  { label: '基础认证', value: 'basic', description: '用户名密码认证' },
  { label: 'Bearer Token', value: 'bearer', description: 'Bearer Token认证' },
  { label: 'API Key', value: 'api_key', description: 'API密钥认证' },
  { label: 'OAuth 2.0', value: 'oauth2', description: 'OAuth 2.0认证' },
  { label: '自定义', value: 'custom', description: '自定义认证方式' }
];

// HTTP方法选项
export const HTTP_METHOD_OPTIONS: DataSourceOption[] = [
  { label: 'GET', value: 'GET', description: '获取数据' },
  { label: 'POST', value: 'POST', description: '提交数据' },
  { label: 'PUT', value: 'PUT', description: '更新数据' },
  { label: 'DELETE', value: 'DELETE', description: '删除数据' }
];

// 同步频率选项
export const SYNC_FREQUENCY_OPTIONS: DataSourceOption[] = [
  { label: '手动', value: 'manual', description: '手动触发同步' },
  { label: '每小时', value: 'hourly', description: '每小时自动同步' },
  { label: '每天', value: 'daily', description: '每天自动同步' },
  { label: '每周', value: 'weekly', description: '每周自动同步' },
  { label: '每月', value: 'monthly', description: '每月自动同步' }
];

// 数据格式选项
export const DATA_FORMAT_OPTIONS: DataSourceOption[] = [
  { label: 'JSON', value: 'json', description: 'JSON格式数据' },
  { label: 'XML', value: 'xml', description: 'XML格式数据' },
  { label: 'CSV', value: 'csv', description: 'CSV格式数据' },
  { label: 'TSV', value: 'tsv', description: 'TSV格式数据' },
  { label: 'Plain Text', value: 'text', description: '纯文本格式' }
];