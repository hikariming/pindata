/**
 * DataFlow流水线服务
 */
import { apiClient } from '../lib/api-client';
import { config } from '../lib/config';

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
   * 下载任务结果打包文件
   */
  async downloadTaskResultsZip(taskId: string): Promise<void> {
    // 使用专门的下载服务器地址
    const downloadBaseUrl = config.downloadBaseUrl || config.apiBaseUrl;
    const baseUrl = downloadBaseUrl.replace(/\/+$/, ''); // 移除结尾斜杠
    
    // 构建完整的下载URL，确保包含API前缀
    const downloadUrl = `${baseUrl}/api/v1/dataflow/tasks/${taskId}/download-zip`;
    
    console.log('打包下载URL:', downloadUrl); // 调试日志
    console.log('downloadBaseUrl:', downloadBaseUrl); // 调试日志
    console.log('baseUrl:', baseUrl); // 调试日志
    
    const response = await fetch(downloadUrl, {
      method: 'GET',
      headers: {
        'Authorization': (apiClient as any).defaultHeaders['Authorization'] || '',
      },
    });

    console.log('响应状态:', response.status, response.statusText); // 调试日志
    console.log('响应内容类型:', response.headers.get('content-type')); // 调试日志

    if (!response.ok) {
      let errorText = `下载失败: ${response.status}`;
      try {
        const errorData = await response.json();
        errorText = errorData.message || errorData.error || errorText;
      } catch {
        // 如果不是JSON响应，使用状态码
        errorText = `HTTP ${response.status}: ${response.statusText}`;
      }
      throw new Error(errorText);
    }

    // 检查响应内容类型
    const contentType = response.headers.get('content-type');
    
    // 如果是JSON响应，说明服务器返回了错误信息
    if (contentType && contentType.includes('application/json')) {
      try {
        const errorData = await response.json();
        const errorMessage = errorData.message || errorData.error || '服务器返回了错误响应';
        throw new Error(errorMessage);
      } catch (parseError) {
        throw new Error('服务器返回了无效的响应');
      }
    }

    const blob = await response.blob();
    console.log('获得blob，大小:', blob.size); // 调试日志
    
    // 检查blob大小是否合理（至少应该有一定大小）
    if (blob.size < 100) {
      throw new Error('下载的文件过小，可能是空文件或错误响应');
    }
    
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dataflow_results_${taskId}.zip`;
    link.target = '_blank'; // 在新标签页打开
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
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