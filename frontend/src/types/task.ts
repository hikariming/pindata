// 任务状态枚举
export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

// 任务类型枚举
export type TaskType = 
  | 'PIPELINE_EXECUTION'
  | 'DATA_IMPORT' 
  | 'DATA_EXPORT'
  | 'DATA_PROCESSING'
  | 'DOCUMENT_CONVERSION';

// 前端展示用的任务类型映射
export type TaskDisplayType = 
  | 'file_conversion' 
  | 'dataset_generation' 
  | 'data_distillation' 
  | 'batch_processing' 
  | 'model_training' 
  | 'data_preprocessing'
  | 'DATA_IMPORT';

// 任务详情接口
export interface TaskDetails {
  totalItems?: number;
  processedItems?: number;
  currentItem?: string;
  errorCount?: number;
  warningCount?: number;
}

// 资源使用情况接口
export interface ResourceUsage {
  cpu: number;
  memory: number;
  gpu?: number;
}

// 基础任务接口
export interface Task {
  id: number;
  name: string;
  type: TaskType;
  status: TaskStatus;
  progress: number;
  config?: any;
  result?: any;
  error_message?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  
  // 扩展字段（来自转换任务）
  library_id?: string;
  library_name?: string;
  conversion_method?: string;
  file_count?: number;
  completed_count?: number;
  failed_count?: number;
  current_file_name?: string;
  progress_percentage?: number;
  celery_task_id?: string;
  file_details?: ConversionFileDetail[];
  processing_logs?: Array<{
    timestamp: string;
    level: string;
    message: string;
  }>;
}

// 转换文件详情接口
export interface ConversionFileDetail {
  id: string;
  conversion_job_id: string;
  library_file_id: string;
  status: TaskStatus;
  file_name?: string;
  error_message?: string;
  processed_at?: string;
  processed_pages?: number;
  total_pages?: number;
}

// 任务统计接口
export interface TaskStatistics {
  total: number;
  pending: number;
  running: number;
  completed: number;
  failed: number;
  cancelled: number;
}

// 任务查询参数接口
export interface TaskQueryParams {
  page?: number;
  per_page?: number;
  status?: TaskStatus;
  type?: TaskType;
  search?: string;
}

// 批量删除请求接口
export interface BatchDeleteTasksRequest {
  task_ids: number[];
}

// 批量删除响应接口
export interface BatchDeleteTasksResponse {
  deleted_count: number;
  failed_count: number;
}

// 分页响应接口
export interface TaskPagination {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

// 任务列表响应接口
export interface TaskListResponse {
  tasks: Task[];
  pagination: TaskPagination;
}

// 优先级类型（前端展示用）
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

// 前端展示用的任务接口（兼容现有页面）
export interface DisplayTask {
  id: string;
  name: string;
  type: TaskDisplayType;
  status: TaskStatus;
  progress: number;
  startTime: string;
  endTime?: string;
  estimatedTime?: string;
  priority: TaskPriority;
  libraryId?: string;
  libraryName?: string;
  datasetId?: string;
  datasetName?: string;
  details: TaskDetails;
  logs?: string[];
  createdBy: string;
  resourceUsage?: ResourceUsage;
} 