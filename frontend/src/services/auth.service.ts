import { apiClient } from '../lib/api-client';

export interface LoginRequest {
  username: string;
  password: string;
  device_info?: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  full_name?: string;
  phone?: string;
}

export interface LoginResponse {
  user: User;
  tokens: {
    access_token: string;
    refresh_token: string;
    session_id: string;
    expires_at: string;
  };
  permissions: string[];
}

export interface User {
  id: string;
  username: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  phone?: string;
  status: string;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
  roles?: Role[];
  organizations?: Organization[];
  permissions?: string[];
}

export interface Role {
  id: string;
  name: string;
  code: string;
  organization_id?: string;
}

export interface Organization {
  id: string;
  name: string;
  code: string;
  is_primary: boolean;
  position?: string;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface ChangePasswordRequest {
  old_password: string;
  new_password: string;
}

export interface UserSession {
  id: string;
  device_info?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  expires_at: string;
  last_activity_at: string;
  status: string;
  is_current: boolean;
}

class AuthService {
  /**
   * 用户登录
   */
  async login(data: LoginRequest): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>('/api/v1/auth/login', data);
    return response;
  }

  /**
   * 用户注册
   */
  async register(data: RegisterRequest): Promise<User> {
    const response = await apiClient.post<User>('/api/v1/auth/register', data);
    return response;
  }

  /**
   * 刷新访问令牌
   */
  async refreshToken(data: RefreshTokenRequest): Promise<{ access_token: string; session_id: string }> {
    const response = await apiClient.post<{ access_token: string; session_id: string }>('/api/v1/auth/refresh', data);
    return response;
  }

  /**
   * 用户登出
   */
  async logout(): Promise<void> {
    await apiClient.post('/api/v1/auth/logout');
  }

  /**
   * 登出所有设备
   */
  async logoutAll(): Promise<{ revoked_sessions: number }> {
    const response = await apiClient.post<{ revoked_sessions: number }>('/api/v1/auth/logout-all');
    return response;
  }

  /**
   * 获取当前用户信息
   */
  async getCurrentUser(): Promise<User> {
    const response = await apiClient.get<User>('/api/v1/auth/me');
    return response;
  }

  /**
   * 更新当前用户信息
   */
  async updateCurrentUser(data: Partial<User>): Promise<User> {
    const response = await apiClient.put<User>('/api/v1/auth/me', data);
    return response;
  }

  /**
   * 修改密码
   */
  async changePassword(data: ChangePasswordRequest): Promise<void> {
    await apiClient.post('/api/v1/auth/change-password', data);
  }

  /**
   * 获取用户会话列表
   */
  async getUserSessions(): Promise<UserSession[]> {
    const response = await apiClient.get<UserSession[]>('/api/v1/auth/sessions');
    return response;
  }

  /**
   * 撤销指定会话
   */
  async revokeSession(sessionId: string): Promise<void> {
    await apiClient.delete(`/api/v1/auth/sessions/${sessionId}`);
  }

  /**
   * 设置认证令牌
   */
  setAuthToken(token: string): void {
    // 注意：这里需要根据实际的 apiClient 实现来调整
    // 可能需要调用 apiClient 的特定方法来设置认证头
    if (token) {
      // apiClient.setAuthHeader(`Bearer ${token}`);
      console.log('Setting auth token:', token);
    } else {
      // apiClient.clearAuthHeader();
      console.log('Clearing auth token');
    }
  }

  /**
   * 从本地存储获取令牌
   */
  getStoredTokens(): { accessToken?: string; refreshToken?: string } {
    try {
      const accessToken = localStorage.getItem('access_token');
      const refreshToken = localStorage.getItem('refresh_token');
      return { accessToken: accessToken || undefined, refreshToken: refreshToken || undefined };
    } catch {
      return {};
    }
  }

  /**
   * 存储令牌到本地存储
   */
  storeTokens(accessToken: string, refreshToken: string): void {
    try {
      localStorage.setItem('access_token', accessToken);
      localStorage.setItem('refresh_token', refreshToken);
    } catch (error) {
      console.warn('Failed to store tokens:', error);
    }
  }

  /**
   * 清除本地存储的令牌
   */
  clearStoredTokens(): void {
    try {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
    } catch (error) {
      console.warn('Failed to clear tokens:', error);
    }
  }

  /**
   * 存储用户信息到本地存储
   */
  storeUser(user: User): void {
    try {
      localStorage.setItem('user', JSON.stringify(user));
    } catch (error) {
      console.warn('Failed to store user:', error);
    }
  }

  /**
   * 从本地存储获取用户信息
   */
  getStoredUser(): User | null {
    try {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  }

  /**
   * 检查令牌是否即将过期（提前5分钟）
   */
  isTokenExpiringSoon(expiresAt: string): boolean {
    const expirationTime = new Date(expiresAt).getTime();
    const currentTime = Date.now();
    const fiveMinutesInMs = 5 * 60 * 1000;
    
    return (expirationTime - currentTime) < fiveMinutesInMs;
  }

  /**
   * 自动刷新令牌
   */
  async autoRefreshToken(): Promise<boolean> {
    const { refreshToken } = this.getStoredTokens();
    
    if (!refreshToken) {
      return false;
    }

    try {
      const response = await this.refreshToken({ refresh_token: refreshToken });
      this.setAuthToken(response.access_token);
      this.storeTokens(response.access_token, refreshToken);
      return true;
    } catch (error) {
      console.error('Auto refresh token failed:', error);
      this.clearStoredTokens();
      this.setAuthToken('');
      return false;
    }
  }
}

export const authService = new AuthService();