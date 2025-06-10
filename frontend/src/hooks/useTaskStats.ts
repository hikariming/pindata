import { useState, useEffect } from 'react';
import { overviewService } from '../services/overview.service';

interface TaskStats {
  total: number;
  completed: number;
  running: number;
  failed: number;
  pending: number;
}

interface UseTaskStatsReturn {
  taskStats: TaskStats | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useTaskStats = (): UseTaskStatsReturn => {
  const [taskStats, setTaskStats] = useState<TaskStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTaskStats = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const stats = await overviewService.getStats();
      
      // 计算pending任务数 (total - completed - running - failed)
      const pending = Math.max(0, stats.tasks.total - stats.tasks.completed - stats.tasks.running - stats.tasks.failed);
      
      setTaskStats({
        ...stats.tasks,
        pending
      });
    } catch (err) {
      console.error('Failed to fetch task stats:', err);
      setError(err instanceof Error ? err.message : '获取任务统计失败');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTaskStats();
  }, []);

  return {
    taskStats,
    isLoading,
    error,
    refetch: fetchTaskStats
  };
}; 