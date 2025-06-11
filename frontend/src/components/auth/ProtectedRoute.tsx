import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requiredPermissions?: string[];
  requireAllPermissions?: boolean;
  fallbackPath?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAuth = true,
  requiredPermissions = [],
  requireAllPermissions = false,
  fallbackPath = '/auth/login'
}) => {
  const location = useLocation();
  const { isAuthenticated, hasPermission, hasAnyPermission, hasAllPermissions } = useAuthStore();

  // 如果需要认证但用户未登录
  if (requireAuth && !isAuthenticated) {
    return <Navigate to={fallbackPath} state={{ from: location }} replace />;
  }

  // 如果不需要认证但用户已登录，重定向到主页（用于登录/注册页面）
  if (!requireAuth && isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // 权限检查
  if (requiredPermissions.length > 0 && isAuthenticated) {
    const hasRequiredPermissions = requireAllPermissions
      ? hasAllPermissions(requiredPermissions)
      : hasAnyPermission(requiredPermissions);

    if (!hasRequiredPermissions) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return <>{children}</>;
};

// 权限检查组件
interface PermissionGuardProps {
  children: React.ReactNode;
  permissions: string[];
  requireAll?: boolean;
  fallback?: React.ReactNode;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  children,
  permissions,
  requireAll = false,
  fallback = null
}) => {
  const { hasAnyPermission, hasAllPermissions } = useAuthStore();

  const hasPermission = requireAll
    ? hasAllPermissions(permissions)
    : hasAnyPermission(permissions);

  if (!hasPermission) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};