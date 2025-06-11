export interface Dataset {
  id: number;
  name: string;
  owner: string;
  description: string;
  size: string;
  downloads: number;
  likes: number;
  license: string;
  taskType: string;
  language?: string;
  featured: boolean;
  lastUpdated: string;
  created: string;
  versions: number;
  tags: string[];
  created_at?: string;
  updated_at?: string;
}

export interface DatasetDetail extends Dataset {
  version_list: DatasetVersion[];
}

export interface DatasetVersion {
  id: number;
  dataset_id: number;
  version: string;
  parent_version_id?: number;
  pipeline_config: Record<string, any>;
  stats: Record<string, any>;
  file_path?: string;
  created_at: string;
}

export interface DatasetTag {
  id: number;
  name: string;
}

export interface CreateDatasetRequest {
  name?: string;  // 导入时可选
  owner?: string; // 导入时可选
  description?: string;
  license?: string;
  task_type?: string;
  language?: string;
  featured?: boolean;
  tags?: string[];
  // 导入相关字段
  import_method?: 'huggingface' | 'modelscope';
  import_url?: string;
}

export interface UpdateDatasetRequest {
  name?: string;
  description?: string;
  license?: string;
  task_type?: string;
  language?: string;
  featured?: boolean;
  tags?: string[];
}

export interface CreateDatasetVersionRequest {
  version: string;
  parent_version_id?: number;
  pipeline_config?: Record<string, any>;
  stats?: Record<string, any>;
  file_path?: string;
}

export interface DatasetQueryParams {
  page?: number;
  per_page?: number;
  search?: string;
  sort_by?: 'trending' | 'newest' | 'downloads' | 'likes' | 'updated';
  filter_by?: 'all' | 'my-datasets' | 'liked';
  task_type?: string;
  featured?: boolean;
  language?: string;
}

export interface DatasetStats {
  total_datasets: number;
  total_downloads: number;
  total_likes: number;
  task_type_stats: Array<{
    task_type: string;
    count: number;
  }>;
  language_stats: Array<{
    language: string;
    count: number;
  }>;
}

export interface DatasetListResponse {
  datasets: Dataset[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface LikeResponse {
  message: string;
  likes: number;
}

export interface DownloadResponse {
  message: string;
  downloads: number;
  download_url: string;
}

export interface DatasetImportStatus {
  task: {
    id: number;
    name: string;
    type: string;
    status: string;
    progress: number;
    config: Record<string, any>;
    result?: Record<string, any>;
    error_message?: string;
    created_at: string;
    started_at?: string;
    completed_at?: string;
  };
  celery_status: {
    state: string;
    info: Record<string, any>;
  };
  dataset: Dataset;
} 