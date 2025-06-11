import { useState, useEffect } from 'react';
import { authService, User, UserSession } from '../services/auth.service';
import { useAuthStore } from '../store/authStore';

export interface UseAuthReturn {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  sessions: UserSession[];
  sessionsLoading: boolean;
  error: string | null;
  
  // Profile methods
  updateProfile: (data: Partial<User>) => Promise<void>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>;
  refreshUserData: () => Promise<void>;
  
  // Session methods
  loadSessions: () => Promise<void>;
  revokeSession: (sessionId: string) => Promise<void>;
  revokeAllOtherSessions: () => Promise<void>;
  
  // Permission checking
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  
  // Admin methods (only available if user has admin permissions)
  isAdmin: boolean;
}

export const useAuth = (): UseAuthReturn => {
  // 从 authStore 获取用户信息和权限
  const { user, isAuthenticated, permissions } = useAuthStore();
  
  const [isLoading, setIsLoading] = useState(false);
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshUserData = async () => {
    try {
      setError(null);
      // 使用 authStore 的 getCurrentUser 方法来刷新用户数据
      const authStore = useAuthStore.getState();
      await authStore.getCurrentUser();
    } catch (err) {
      console.error('Failed to refresh user data:', err);
      setError('Failed to refresh user data');
    }
  };

  const updateProfile = async (data: Partial<User>) => {
    try {
      setError(null);
      // 使用 authStore 的 updateProfile 方法
      const authStore = useAuthStore.getState();
      await authStore.updateProfile(data);
    } catch (err) {
      console.error('Failed to update profile:', err);
      setError('Failed to update profile');
      throw err;
    }
  };

  const changePassword = async (oldPassword: string, newPassword: string) => {
    try {
      setError(null);
      await authService.changePassword({
        old_password: oldPassword,
        new_password: newPassword
      });
    } catch (err) {
      console.error('Failed to change password:', err);
      setError('Failed to change password');
      throw err;
    }
  };

  const loadSessions = async () => {
    try {
      setSessionsLoading(true);
      setError(null);
      const userSessions = await authService.getUserSessions();
      setSessions(userSessions);
    } catch (err) {
      console.error('Failed to load sessions:', err);
      setError('Failed to load sessions');
    } finally {
      setSessionsLoading(false);
    }
  };

  const revokeSession = async (sessionId: string) => {
    try {
      setError(null);
      await authService.revokeSession(sessionId);
      // Reload sessions
      await loadSessions();
    } catch (err) {
      console.error('Failed to revoke session:', err);
      setError('Failed to revoke session');
      throw err;
    }
  };

  const revokeAllOtherSessions = async () => {
    try {
      setError(null);
      await authService.logoutAll();
      // Reload sessions
      await loadSessions();
    } catch (err) {
      console.error('Failed to revoke all sessions:', err);
      setError('Failed to revoke all sessions');
      throw err;
    }
  };

  const hasPermission = (permission: string): boolean => {
    return permissions.includes(permission);
  };

  const hasAnyPermission = (permissionList: string[]): boolean => {
    return permissionList.some(permission => permissions.includes(permission));
  };

  const hasAllPermissions = (permissionList: string[]): boolean => {
    return permissionList.every(permission => permissions.includes(permission));
  };

  const isAdmin = hasAnyPermission(['system.manage', 'user.manage']);

  return {
    user,
    isLoading,
    isAuthenticated,
    sessions,
    sessionsLoading,
    error,
    
    updateProfile,
    changePassword,
    refreshUserData,
    
    loadSessions,
    revokeSession,
    revokeAllOtherSessions,
    
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    
    isAdmin
  };
};