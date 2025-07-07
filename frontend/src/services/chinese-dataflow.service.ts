import { apiClient } from '../lib/api-client';

export interface ChineseDataFlowPipelineType {
  type: string;
  name: string;
  description: string;
  features: string[];
  category: string;
}

export interface ChineseDataFlowConfig {
  [key: string]: any;
}

export interface ChineseDataFlowTask {
  task_id: string;
  task_name: string;
  status: string;
  celery_task_id: string;
}

export interface ChineseDataFlowResult {
  original_text: string;
  processed_text: string;
  status: string;
  quality_score?: number;
  processing_time: number;
  timestamp: string;
  synthesized_content?: Array<{
    type: string;
    content: string;
    description: string;
  }>;
  task_type?: string;
  error?: string;
}

export interface ChineseDataFlowTaskInfo {
  id: string;
  name: string;
  description: string;
  type: string;
  status: string;
  progress: number;
  library_id: string;
  file_ids: string[];
  config: ChineseDataFlowConfig;
  total_files: number;
  processed_files: number;
  failed_files: number;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
}

export class ChineseDataFlowService {
  private baseUrl = '/api/v1/chinese-dataflow';

  /**
   * 获取中文DataFlow支持的流水线类型
   */
  async getPipelineTypes(): Promise<ChineseDataFlowPipelineType[]> {
    const response = await apiClient.get<{ data: ChineseDataFlowPipelineType[] }>(`${this.baseUrl}/pipeline/types`);
    return response.data;
  }

  /**
   * 获取流水线配置模板
   */
  async getPipelineConfig(pipelineType: string): Promise<ChineseDataFlowConfig> {
    const response = await apiClient.get<{ data: ChineseDataFlowConfig }>(`${this.baseUrl}/pipeline/config/${pipelineType}`);
    return response.data;
  }

  /**
   * 处理单个文本
   */
  async processSingleText(
    text: string,
    pipelineType: string,
    config: ChineseDataFlowConfig = {}
  ): Promise<ChineseDataFlowResult> {
    const response = await apiClient.post<{ data: ChineseDataFlowResult }>(`${this.baseUrl}/process/single`, {
      text,
      pipeline_type: pipelineType,
      config
    });
    return response.data;
  }

  /**
   * 批量处理文件
   */
  async processBatchFiles(
    libraryId: string,
    fileIds: string[],
    pipelineType: string,
    config: ChineseDataFlowConfig = {},
    taskName?: string
  ): Promise<ChineseDataFlowTask> {
    const response = await apiClient.post<{ data: ChineseDataFlowTask }>(`${this.baseUrl}/process/batch`, {
      library_id: libraryId,
      file_ids: fileIds,
      pipeline_type: pipelineType,
      config,
      task_name: taskName
    });
    return response.data;
  }

  /**
   * 获取任务状态
   */
  async getTaskStatus(taskId: string): Promise<ChineseDataFlowTaskInfo> {
    const response = await apiClient.get<{ data: ChineseDataFlowTaskInfo }>(`${this.baseUrl}/tasks/${taskId}/status`);
    return response.data;
  }

  /**
   * 获取任务结果
   */
  async getTaskResults(taskId: string): Promise<{ task_info: ChineseDataFlowTaskInfo; results: any[] }> {
    const response = await apiClient.get<{ data: { task_info: ChineseDataFlowTaskInfo; results: any[] } }>(`${this.baseUrl}/tasks/${taskId}/results`);
    return response.data;
  }

  /**
   * 获取任务下载链接
   */
  async getTaskDownloadLinks(taskId: string): Promise<{ task_info: ChineseDataFlowTaskInfo; download_links: any[] }> {
    const response = await apiClient.get<{ data: { task_info: ChineseDataFlowTaskInfo; download_links: any[] } }>(`${this.baseUrl}/tasks/${taskId}/download`);
    return response.data;
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<{ status: string; service: string; version: string; features: string[] }> {
    const response = await apiClient.get<{ data: { status: string; service: string; version: string; features: string[] } }>(`${this.baseUrl}/health`);
    return response.data;
  }
}

export const chineseDataflowService = new ChineseDataFlowService(); 