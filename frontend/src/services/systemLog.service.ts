import { apiClient } from '../lib/api-client';
import { ApiResponse, PaginatedResponse } from '../types/api';
import {
  SystemLog,
  SystemLogQueryParams,
  SystemLogStats,
  LogCleanupRequest,
  LogCleanupResponse,
  LogExportRequest,
  LogExportResponse,
} from '../types/systemLog';

export class SystemLogService {
  /**
   * 获取系统日志列表
   */
  static async getLogs(params?: SystemLogQueryParams): Promise<{
    logs: SystemLog[];
    pagination: PaginatedResponse<SystemLog>['pagination'];
  }> {
    const response = await apiClient.get<{
      success: boolean;
      data: {
        logs: SystemLog[];
        pagination: PaginatedResponse<SystemLog>['pagination'];
      };
    }>('/api/v1/system/logs', params);
    
    return {
      logs: response.data?.logs || [],
      pagination: response.data?.pagination || {
        page: 1,
        per_page: 20,
        total: 0,
        pages: 0,
        has_next: false,
        has_prev: false,
      },
    };
  }

  /**
   * 获取单个日志详情
   */
  static async getLogById(id: string): Promise<SystemLog> {
    const response = await apiClient.get<{
      success: boolean;
      data: SystemLog;
    }>(`/api/v1/system/logs/${id}`);
    return response.data!;
  }

  /**
   * 获取日志统计信息
   */
  static async getStats(hours: number = 24): Promise<SystemLogStats> {
    const response = await apiClient.get<{
      success: boolean;
      data: SystemLogStats;
    }>(`/api/v1/system/logs/stats?hours=${hours}`);
    return response.data!;
  }

  /**
   * 清理旧日志
   */
  static async cleanupLogs(data: LogCleanupRequest): Promise<LogCleanupResponse> {
    const response = await apiClient.post<{
      success: boolean;
      data: LogCleanupResponse;
      message: string;
    }>('/api/v1/system/logs/cleanup', data);
    return response.data!;
  }

  /**
   * 导出日志
   */
  static async exportLogs(data: LogExportRequest): Promise<LogExportResponse> {
    const response = await apiClient.post<{
      success: boolean;
      data: LogExportResponse;
    }>('/api/v1/system/logs/export', data);
    return response.data!;
  }

  /**
   * 下载日志文件
   */
  static async downloadLogs(data: LogExportRequest): Promise<void> {
    const exportData = await this.exportLogs(data);
    
    // 将数据转换为CSV格式
    const csvHeaders = ['timestamp', 'level', 'source', 'message', 'details'];
    const csvRows = exportData.logs.map(log => [
      log.timestamp,
      log.level,
      log.source,
      `"${log.message.replace(/"/g, '""')}"`,
      `"${(log.details || '').replace(/"/g, '""')}"`
    ]);
    
    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.join(','))
    ].join('\n');
    
    // 创建下载链接
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `system_logs_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

// 导出单例实例
export const systemLogService = SystemLogService; 