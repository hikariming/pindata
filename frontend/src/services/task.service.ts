import { apiClient } from '../lib/api-client';
import { ApiResponse } from '../types/api';
import {
  Task,
  TaskStatistics,
  TaskQueryParams,
  TaskListResponse,
  BatchDeleteTasksRequest,
  BatchDeleteTasksResponse,
  DisplayTask,
  TaskDisplayType,
  TaskPriority
} from '../types/task';

export class TaskService {
  /**
   * 获取任务列表
   */
  static async getTasks(params?: TaskQueryParams): Promise<{
    tasks: Task[];
    pagination: TaskListResponse['pagination'];
  }> {
    const response = await apiClient.get<{
      success: boolean;
      data: TaskListResponse;
    }>('/api/v1/tasks', params);
    
    return {
      tasks: response.data?.tasks || [],
      pagination: response.data?.pagination || {
        page: 1,
        per_page: 20,
        total: 0,
        total_pages: 0,
        has_next: false,
        has_prev: false,
      },
    };
  }

  /**
   * 获取单个任务详情
   */
  static async getTaskById(id: number): Promise<Task> {
    const response = await apiClient.get<{
      success: boolean;
      data: Task;
    }>(`/api/v1/tasks/${id}`);
    return response.data!;
  }

  /**
   * 删除任务
   */
  static async deleteTask(id: number): Promise<void> {
    await apiClient.delete<{
      success: boolean;
      message: string;
    }>(`/api/v1/tasks/${id}`);
  }

  /**
   * 取消任务
   */
  static async cancelTask(id: number): Promise<void> {
    await apiClient.post<{
      success: boolean;
      message: string;
    }>(`/api/v1/tasks/${id}/cancel`);
  }

  /**
   * 获取任务统计信息
   */
  static async getTaskStatistics(): Promise<TaskStatistics> {
    const response = await apiClient.get<{
      success: boolean;
      data: TaskStatistics;
    }>('/api/v1/tasks/statistics');
    return response.data!;
  }

  /**
   * 批量删除任务
   */
  static async batchDeleteTasks(taskIds: number[]): Promise<BatchDeleteTasksResponse> {
    const request: BatchDeleteTasksRequest = {
      task_ids: taskIds
    };
    const response = await apiClient.post<{
      success: boolean;
      data: BatchDeleteTasksResponse;
      message: string;
    }>('/api/v1/tasks/batch/delete', request);
    return response.data!;
  }

  /**
   * 将后端任务转换为前端显示格式
   */
  static transformTaskToDisplayTask(task: Task): DisplayTask {
    // 映射任务类型
    const getDisplayType = (type: string): TaskDisplayType => {
      switch (type) {
        case 'DOCUMENT_CONVERSION':
          return 'file_conversion';
        case 'DATA_PROCESSING':
          return 'data_preprocessing';
        case 'DATA_IMPORT':
          return 'dataset_generation';
        case 'DATA_EXPORT':
          return 'batch_processing';
        case 'PIPELINE_EXECUTION':
          return 'model_training';
        default:
          return 'file_conversion';
      }
    };

    // 计算优先级（基于任务类型和状态）
    const getPriority = (task: Task): TaskPriority => {
      if (task.status === 'failed') return 'urgent';
      if (task.status === 'running') return 'high';
      if (task.type === 'DOCUMENT_CONVERSION') return 'medium';
      return 'low';
    };

    // 计算进度百分比
    const getProgress = (task: Task): number => {
      if (task.progress_percentage !== undefined) {
        return Math.round(task.progress_percentage);
      }
      if (task.status === 'completed') return 100;
      if (task.status === 'failed' || task.status === 'cancelled') return 0;
      return task.progress || 0;
    };

    // 估算剩余时间
    const getEstimatedTime = (task: Task): string | undefined => {
      if (task.status !== 'running') return undefined;
      
      const progress = getProgress(task);
      if (progress <= 0) return undefined;
      
      if (task.started_at) {
        const startTime = new Date(task.started_at);
        const now = new Date();
        const elapsed = now.getTime() - startTime.getTime();
        const totalEstimated = (elapsed / progress) * 100;
        const remaining = totalEstimated - elapsed;
        
        if (remaining > 0) {
          const minutes = Math.round(remaining / (1000 * 60));
          if (minutes < 60) {
            return `${minutes}分钟`;
          } else {
            const hours = Math.floor(minutes / 60);
            const mins = minutes % 60;
            return `${hours}小时${mins}分钟`;
          }
        }
      }
      
      return undefined;
    };

    return {
      id: task.id.toString(),
      name: task.name,
      type: getDisplayType(task.type),
      status: task.status,
      progress: getProgress(task),
      startTime: task.created_at,
      endTime: task.completed_at,
      estimatedTime: getEstimatedTime(task),
      priority: getPriority(task),
      libraryId: task.library_id,
      libraryName: task.library_name,
      details: {
        totalItems: task.file_count,
        processedItems: task.completed_count,
        currentItem: task.current_file_name,
        errorCount: task.failed_count,
        warningCount: 0
      },
      logs: task.error_message ? [
        `${task.created_at} - 任务创建`,
        ...(task.started_at ? [`${task.started_at} - 任务开始`] : []),
        ...(task.error_message ? [`错误: ${task.error_message}`] : []),
        ...(task.completed_at ? [`${task.completed_at} - 任务完成`] : [])
      ] : undefined,
      createdBy: '系统', // 后端暂时没有用户信息
      resourceUsage: {
        cpu: Math.random() * 100, // 临时模拟数据
        memory: Math.random() * 8192,
        gpu: task.type === 'DOCUMENT_CONVERSION' ? Math.random() * 100 : undefined
      }
    };
  }

  /**
   * 获取前端显示用的任务列表
   */
  static async getDisplayTasks(params?: TaskQueryParams): Promise<{
    tasks: DisplayTask[];
    pagination: TaskListResponse['pagination'];
  }> {
    const { tasks, pagination } = await this.getTasks(params);
    
    return {
      tasks: tasks.map(task => this.transformTaskToDisplayTask(task)),
      pagination
    };
  }
}

// 导出单例实例
export const taskService = TaskService; 