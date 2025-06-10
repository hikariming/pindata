import { apiClient } from '../lib/api-client';

// 概览统计数据类型
export interface OverviewStats {
  datasets: {
    total: number;
  };
  tasks: {
    total: number;
  };
  plugins: {
    total: number;
    status: string;
  };
  storage: {
    used: number;
    total: number;
    used_gb: number;
    total_gb: number;
  };
  raw_data: {
    total: number;
  };
}

// 活动项类型
export interface Activity {
  id: string | number;
  title: string;
  time: string;
  type: string;
  icon: string;
}

// 通知项类型
export interface Notification {
  id: string | number;
  title: string;
  time: string;
  type: string;
  icon: string;
}

// 最近活动响应类型
export interface RecentActivitiesResponse {
  activities: Activity[];
}

// 通知响应类型
export interface NotificationsResponse {
  notifications: Notification[];
}

class OverviewService {
  /**
   * 获取系统统计信息
   */
  async getStats(): Promise<OverviewStats> {
    return await apiClient.get<OverviewStats>('/api/v1/overview/stats');
  }

  /**
   * 获取最近活动
   */
  async getRecentActivities(): Promise<RecentActivitiesResponse> {
    return await apiClient.get<RecentActivitiesResponse>('/api/v1/overview/recent-activities');
  }

  /**
   * 获取系统通知
   */
  async getNotifications(): Promise<NotificationsResponse> {
    return await apiClient.get<NotificationsResponse>('/api/v1/overview/notifications');
  }

  /**
   * 获取所有概览数据
   */
  async getAllOverviewData() {
    const [stats, activities, notifications] = await Promise.all([
      this.getStats(),
      this.getRecentActivities(),
      this.getNotifications()
    ]);

    return {
      stats,
      activities: activities.activities,
      notifications: notifications.notifications
    };
  }
}

export const overviewService = new OverviewService(); 