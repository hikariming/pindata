import { useState, useEffect } from 'react';
import { overviewService, OverviewStats, Activity, Notification } from '../services/overview.service';

interface UseOverviewReturn {
  stats: OverviewStats | null;
  activities: Activity[];
  notifications: Notification[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useOverview = (): UseOverviewReturn => {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOverviewData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const data = await overviewService.getAllOverviewData();
      
      setStats(data.stats);
      setActivities(data.activities);
      setNotifications(data.notifications);
    } catch (err) {
      console.error('Failed to fetch overview data:', err);
      setError(err instanceof Error ? err.message : '获取概览数据失败');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOverviewData();
  }, []);

  return {
    stats,
    activities,
    notifications,
    isLoading,
    error,
    refetch: fetchOverviewData
  };
}; 