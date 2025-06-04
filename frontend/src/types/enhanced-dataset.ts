// 版本类型枚举
export type VersionType = 'major' | 'minor' | 'patch';

// 文件类型枚举
export type FileType = 'text' | 'image' | 'pointcloud' | 'audio' | 'video' | 'archive' | 'unknown';

// 预览数据类型
export interface PreviewItem {
  index: number;
  data?: any;
  content?: string;
  filename?: string;
  thumbnail?: string;
  metadata?: any;
}

export interface PreviewData {
  type: string;
  format: string;
  message?: string;
  items: PreviewItem[];
  total_items?: number;
  preview_count?: number;
  stats?: any;
}

// 数据集文件
export interface DatasetFile {
  id: string;
  version_id: string;
  filename: string;
  file_path: string;
  file_type: FileType;
  file_size: number;
  file_size_formatted: string;
  checksum: string;
  minio_bucket: string;
  minio_object_name: string;
  metadata?: Record<string, any>;
  preview_data?: PreviewData;
  annotations?: Record<string, any>;
  created_at: string;
}

// 增强版本信息
export interface EnhancedDatasetVersion {
  id: string;
  dataset_id: number;
  version: string;
  version_type: VersionType;
  commit_hash: string;
  commit_message: string;
  author: string;
  parent_version_id?: string;
  parent_version?: string;
  total_size: number;
  total_size_formatted: string;
  file_count: number;
  data_checksum: string;
  pipeline_config?: Record<string, any>;
  stats?: Record<string, any>;
  metadata?: Record<string, any>;
  tags?: string[];
  annotations?: Record<string, any>;
  is_default: boolean;
  is_draft: boolean;
  is_deprecated: boolean;
  created_at: string;
  updated_at: string;
  files: DatasetFile[];
}

// 版本信息摘要
export interface VersionInfo {
  version: string;
  commit_hash: string;
  commit_message: string;
  author: string;
  version_type: VersionType;
  parent_version?: string;
  file_count: number;
  total_size: string;
  is_default: boolean;
  is_draft: boolean;
  is_deprecated: boolean;
  created_at: string;
}

// 版本差异
export interface VersionDiff {
  version1: VersionInfo;
  version2: VersionInfo;
  diff: {
    added_files: DatasetFile[];
    removed_files: DatasetFile[];
    modified_files: Array<{
      old: DatasetFile;
      new: DatasetFile;
    }>;
    stats: {
      files_added: number;
      files_removed: number;
      files_modified: number;
    };
  };
}

// 数据集预览
export interface FilePreview {
  file: DatasetFile;
  preview: PreviewData;
}

export interface DatasetPreview {
  dataset: any; // 使用现有的 Dataset 类型
  version: EnhancedDatasetVersion | null;
  preview: {
    total_files: number;
    preview_files: number;
    files: FilePreview[];
    message?: string;
  };
}

// 创建版本请求
export interface CreateDatasetVersionRequest {
  version: string;
  commit_message: string;
  author: string;
  version_type?: VersionType;
  parent_version_id?: string;
  existing_file_ids?: string[];
  pipeline_config?: Record<string, any>;
  metadata?: Record<string, any>;
  files?: File[];
}

// 克隆版本请求
export interface CloneVersionRequest {
  new_version: string;
  commit_message: string;
  author: string;
}

// 查询参数
export interface DatasetVersionQueryParams {
  page?: number;
  per_page?: number;
  sort_by?: 'created_at' | 'version' | 'author';
  sort_order?: 'asc' | 'desc';
  version_type?: VersionType;
  author?: string;
  is_default?: boolean;
  is_draft?: boolean;
} 