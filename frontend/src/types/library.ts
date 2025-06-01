import { QueryParams } from './api';

// 数据类型枚举
export type DataType = 'training' | 'evaluation' | 'mixed';

// 处理状态枚举
export type ProcessStatus = 'pending' | 'processing' | 'completed' | 'failed';

// 文件库接口
export interface Library {
  id: string;
  name: string;
  description?: string;
  data_type: DataType;
  tags: string[];
  file_count: number;
  total_size: string;
  processed_count: number;
  processing_count: number;
  pending_count: number;
  md_count: number;
  created_at: string;
  updated_at: string;
  last_updated: string;
}

// 文件库详情（包含文件列表）
export interface LibraryDetail extends Library {
  files: LibraryFile[];
}

// 文件库中的文件
export interface LibraryFile {
  id: string;
  filename: string;
  original_filename: string;
  file_type: string;
  file_size: number;
  file_size_human: string;
  minio_object_name: string;
  minio_bucket: string;
  process_status: ProcessStatus;
  process_status_label: string;
  converted_format?: string;
  converted_object_name?: string;
  conversion_error?: string;
  page_count?: number;
  word_count?: number;
  language?: string;
  library_id: string;
  uploaded_at: string;
  processed_at?: string;
  created_at: string;
  updated_at: string;
}

// 创建文件库的请求数据
export interface CreateLibraryRequest {
  name: string;
  description?: string;
  data_type: DataType;
  tags?: string[];
}

// 更新文件库的请求数据
export interface UpdateLibraryRequest {
  name?: string;
  description?: string;
  data_type?: DataType;
  tags?: string[];
}

// 文件库查询参数
export interface LibraryQueryParams extends QueryParams {
  name?: string;
  data_type?: DataType;
  tags?: string[];
}

// 文件查询参数
export interface LibraryFileQueryParams extends QueryParams {
  filename?: string;
  file_type?: string;
  process_status?: ProcessStatus;
}

// 统计信息
export interface LibraryStatistics {
  total_libraries: number;
  total_files: number;
  total_processed: number;
  total_size: string;
  conversion_rate: number;
} 