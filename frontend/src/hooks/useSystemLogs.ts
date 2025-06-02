import { useState, useEffect, useCallback } from 'react';
import { systemLogService } from '../services/systemLog.service';
import {
  SystemLog,
  SystemLogQueryParams,
  SystemLogStats,
  LogCleanupRequest,
  LogExportRequest,
} from '../types/systemLog';

interface UseSystemLogsReturn {
  logs: SystemLog[];
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
  stats: SystemLogStats | null;
  // Actions
  fetchLogs: (params?: SystemLogQueryParams) => Promise<void>;
  fetchStats: (hours?: number) => Promise<void>;
  cleanupLogs: (data: LogCleanupRequest) => Promise<{ deleted_count: number; retention_days: number }>;
  downloadLogs: (data: LogExportRequest) => Promise<void>;
  refreshLogs: () => Promise<void>;
}

export const useSystemLogs = (initialParams?: SystemLogQueryParams): UseSystemLogsReturn => {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<SystemLogStats | null>(null);
  const [currentParams, setCurrentParams] = useState<SystemLogQueryParams>(initialParams || {});
  const [pagination, setPagination] = useState({
    page: 1,
    per_page: 20,
    total: 0,
    total_pages: 0,
    has_next: false,
    has_prev: false,
  });

  const fetchLogs = useCallback(async (params?: SystemLogQueryParams) => {
    try {
      setLoading(true);
      setError(null);
      
      const queryParams = { ...currentParams, ...params };
      setCurrentParams(queryParams);
      
      const response = await systemLogService.getLogs(queryParams);
      setLogs(response.logs);
      setPagination(response.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取日志列表失败');
      console.error('Failed to fetch system logs:', err);
    } finally {
      setLoading(false);
    }
  }, [currentParams]);

  const fetchStats = useCallback(async (hours: number = 24) => {
    try {
      setError(null);
      const statsData = await systemLogService.getStats(hours);
      setStats(statsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取统计信息失败');
      console.error('Failed to fetch system log stats:', err);
    }
  }, []);

  const cleanupLogs = useCallback(async (data: LogCleanupRequest) => {
    try {
      setError(null);
      const result = await systemLogService.cleanupLogs(data);
      
      // 刷新日志列表和统计
      await fetchLogs();
      await fetchStats();
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '清理日志失败';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [fetchLogs, fetchStats]);

  const downloadLogs = useCallback(async (data: LogExportRequest) => {
    try {
      setError(null);
      await systemLogService.downloadLogs(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '导出日志失败';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const refreshLogs = useCallback(async () => {
    await Promise.all([
      fetchLogs(),
      fetchStats()
    ]);
  }, [fetchLogs, fetchStats]);

  // 初始加载
  useEffect(() => {
    fetchLogs();
    fetchStats();
  }, []);

  return {
    logs,
    loading,
    error,
    pagination,
    stats,
    fetchLogs,
    fetchStats,
    cleanupLogs,
    downloadLogs,
    refreshLogs,
  };
}; 