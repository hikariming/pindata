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
  // 添加任务进度缓存，用于计算平均处理速度
  private static progressCache = new Map<string, {
    lastProgress: number;
    lastUpdateTime: number;
    avgSpeed: number; // 每分钟的进度增长
  }>();

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

    // 改进的估算剩余时间算法
    const getEstimatedTime = (task: Task): string | undefined => {
      if (task.status !== 'running') return undefined;
      
      const progress = getProgress(task);
      const taskId = task.id.toString();
      
      // 如果任务刚开始，没有足够的进度数据
      if (progress <= 5) return undefined;
      
      // 更新进度缓存
      const now = Date.now();
      const cached = this.progressCache.get(taskId);
      
      if (cached && cached.lastProgress !== progress) {
        // 计算进度速度 (进度/分钟)
        const timeDiff = (now - cached.lastUpdateTime) / (1000 * 60); // 分钟
        const progressDiff = progress - cached.lastProgress;
        
        if (timeDiff > 0 && progressDiff > 0) {
          const currentSpeed = progressDiff / timeDiff;
          // 使用指数移动平均来平滑速度计算
          cached.avgSpeed = cached.avgSpeed * 0.7 + currentSpeed * 0.3;
        }
        
        cached.lastProgress = progress;
        cached.lastUpdateTime = now;
      } else if (!cached) {
        // 首次记录，使用基于开始时间的估算
        if (task.started_at) {
          const startTime = new Date(task.started_at);
          const elapsed = (now - startTime.getTime()) / (1000 * 60); // 分钟
          const avgSpeed = elapsed > 0 ? progress / elapsed : 0;
          
          this.progressCache.set(taskId, {
            lastProgress: progress,
            lastUpdateTime: now,
            avgSpeed: avgSpeed
          });
        }
      }
      
      // 计算剩余时间
      const cacheData = this.progressCache.get(taskId);
      if (cacheData && cacheData.avgSpeed > 0) {
        const remainingProgress = 100 - progress;
        const estimatedMinutes = remainingProgress / cacheData.avgSpeed;
        
        if (estimatedMinutes > 0) {
          if (estimatedMinutes < 60) {
            return `约${Math.round(estimatedMinutes)}分钟`;
          } else if (estimatedMinutes < 1440) {
            const hours = Math.floor(estimatedMinutes / 60);
            const mins = Math.round(estimatedMinutes % 60);
            return mins > 0 ? `约${hours}小时${mins}分钟` : `约${hours}小时`;
          } else {
            const days = Math.floor(estimatedMinutes / 1440);
            const hours = Math.round((estimatedMinutes % 1440) / 60);
            return hours > 0 ? `约${days}天${hours}小时` : `约${days}天`;
          }
        }
      }
      
      // 降级到简单的基于开始时间的估算
      if (task.started_at) {
        const startTime = new Date(task.started_at);
        const elapsed = now - startTime.getTime();
        if (elapsed > 0 && progress > 0) {
          const totalEstimated = (elapsed / progress) * 100;
          const remaining = totalEstimated - elapsed;
          
          if (remaining > 0) {
            const minutes = Math.round(remaining / (1000 * 60));
            if (minutes < 60) {
              return `约${minutes}分钟`;
            } else {
              const hours = Math.floor(minutes / 60);
              const mins = minutes % 60;
              return mins > 0 ? `约${hours}小时${mins}分钟` : `约${hours}小时`;
            }
          }
        }
      }
      
      return undefined;
    };

    // 生成更详细的日志信息
    const generateLogs = (task: Task): string[] => {
      const logs: string[] = [];
      
      // 如果有详细的处理日志，使用它们
      if (task.processing_logs && task.processing_logs.length > 0) {
        task.processing_logs.forEach(log => {
          const timestamp = new Date(log.timestamp).toLocaleString('zh-CN', {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          });
          logs.push(`${timestamp} [${log.level}] ${log.message}`);
        });
        return logs;
      }
      
      // 如果没有详细日志，使用基本信息
      logs.push(`${task.created_at} - 任务创建`);
      
      if (task.started_at) {
        logs.push(`${task.started_at} - 任务开始`);
      }
      
      if (task.status === 'running' && task.current_file_name) {
        logs.push(`正在处理: ${task.current_file_name}`);
        
        // 如果有页面进度信息
        if (task.file_details && task.file_details.length > 0) {
          const fileDetail = task.file_details[0];
          if (fileDetail.processed_pages && fileDetail.total_pages) {
            logs.push(`当前文件进度: ${fileDetail.processed_pages}/${fileDetail.total_pages} 页`);
          }
        }
        
        // 添加文件处理进度
        if (task.completed_count && task.file_count) {
          logs.push(`文件处理进度: ${task.completed_count}/${task.file_count} 个文件`);
        }
      }
      
      if (task.error_message) {
        logs.push(`错误: ${task.error_message}`);
      }
      
      if (task.completed_at) {
        logs.push(`${task.completed_at} - 任务完成`);
      }
      
      return logs;
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
      logs: generateLogs(task),
      createdBy: '系统', // 后端暂时没有用户信息
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

  /**
   * 清理进度缓存（当任务完成或失败时）
   */
  static clearProgressCache(taskId: string): void {
    this.progressCache.delete(taskId);
  }


}

// 导出单例实例
export const taskService = TaskService; 