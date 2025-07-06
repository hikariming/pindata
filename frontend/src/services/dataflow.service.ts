/**
 * DataFlow流水线服务
 */
import { apiClient } from '../lib/api-client';

export interface PipelineType {
  type: string;
  name: string;
  description: string;
}

export interface PipelineConfig {
  [key: string]: any;
}

export interface DataFlowTask {
  id: string;
  name: string;
  description: string;
  pipeline_type: string;
  library_id: string;
  file_ids: string[];
  created_by: string;
  config: PipelineConfig;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  current_file?: string;
  results?: any;
  quality_metrics?: any;
  error_message?: string;
  total_files: number;
  processed_files: number;
  failed_files: number;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  updated_at: string;
  celery_task_id?: string;
}

export interface DataFlowResult {
  id: string;
  task_id: string;
  library_file_id: string;
  original_content: string;
  processed_content: string;
  quality_score: number;
  processing_time: number;
  metadata: any;
  output_format: string;
  minio_bucket: string;
  minio_object_name: string;
  file_size: number;
  status: string;
  error_message?: string;
  created_at: string;
  processed_at?: string;
}

export interface CreateTaskRequest {
  library_id: string;
  file_ids: string[];
  pipeline_type: string;
  config: PipelineConfig;
  task_name?: string;
  description?: string;
  created_by?: string;
}

export interface BatchProcessRequest {
  pipeline_type: string;
  config: PipelineConfig;
}

export class DataFlowService {
  /**
   * 获取所有支持的流水线类型
   */
  async getPipelineTypes(): Promise<PipelineType[]> {
    const response = await apiClient.get<{ data: PipelineType[] }>('dataflow/pipeline/types');
    return response.data;
  }

  /**
   * 获取流水线配置模板
   */
  async getPipelineConfigTemplate(pipelineType: string): Promise<PipelineConfig> {
    const response = await apiClient.get<{ data: PipelineConfig }>(`dataflow/pipeline/config/${pipelineType}`);
    return response.data;
  }

  /**
   * 创建流水线任务
   */
  async createTask(request: CreateTaskRequest): Promise<DataFlowTask> {
    const response = await apiClient.post<{ data: DataFlowTask }>('dataflow/tasks', request);
    return response.data;
  }

  /**
   * 启动流水线任务
   */
  async startTask(taskId: string): Promise<void> {
    await apiClient.post(`dataflow/tasks/${taskId}/start`);
  }

  /**
   * 获取任务状态
   */
  async getTaskStatus(taskId: string): Promise<DataFlowTask> {
    const response = await apiClient.get<{ data: DataFlowTask }>(`dataflow/tasks/${taskId}/status`);
    return response.data;
  }

  /**
   * 获取任务结果
   */
  async getTaskResults(taskId: string): Promise<DataFlowResult[]> {
    const response = await apiClient.get<{ data: DataFlowResult[] }>(`dataflow/tasks/${taskId}/results`);
    return response.data;
  }

  /**
   * 取消任务
   */
  async cancelTask(taskId: string): Promise<void> {
    await apiClient.post(`dataflow/tasks/${taskId}/cancel`);
  }

  /**
   * 获取文件库的所有任务
   */
  async getLibraryTasks(libraryId: string): Promise<DataFlowTask[]> {
    const response = await apiClient.get<{ data: DataFlowTask[] }>(`dataflow/libraries/${libraryId}/tasks`);
    return response.data;
  }

  /**
   * 批量处理文件库
   */
  async batchProcessLibrary(libraryId: string, request: BatchProcessRequest): Promise<{ message: string; celery_task_id: string }> {
    const response = await apiClient.post<{ data: { message: string; celery_task_id: string } }>(`dataflow/libraries/${libraryId}/batch-process`, request);
    return response.data;
  }

  /**
   * 获取任务下载链接
   */
  async getTaskDownloadLinks(taskId: string): Promise<{ task_info: DataFlowTask; download_links: any[] }> {
    const response = await apiClient.get<{ data: { task_info: DataFlowTask; download_links: any[] } }>(`dataflow/tasks/${taskId}/download`);
    return response.data;
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<{ status: string; dataflow_available: boolean; version: string }> {
    const response = await apiClient.get<{ data: { status: string; dataflow_available: boolean; version: string } }>('dataflow/health');
    return response.data;
  }

  /**
   * 获取统计信息
   */
  async getStats(): Promise<{ total_tasks: number; by_status: Record<string, number> }> {
    const response = await apiClient.get<{ data: { total_tasks: number; by_status: Record<string, number> } }>('dataflow/stats');
    return response.data;
  }
}

export const dataflowService = new DataFlowService(); 