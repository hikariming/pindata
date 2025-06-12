import React, { useEffect, useState } from 'react';
import { useAuthStore, setupTokenRefresh, clearTokenRefresh } from '../../store/authStore';

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const { initialize } = useAuthStore();

  useEffect(() => {
    const initAuth = async () => {
      try {
        await initialize();
        setupTokenRefresh();
      } catch (error) {
        console.error('Failed to initialize auth:', error);
      } finally {
        setIsInitialized(true);
      }
    };

    initAuth();

    // 清理定时器
    return () => {
      clearTokenRefresh();
    };
  }, [initialize]);

  // 认证初始化中显示加载状态
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600">初始化中...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};