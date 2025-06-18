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
    const response = await apiClient.post<{ data: LoginResponse }>('/api/v1/auth/login', data);
    return response.data;
  }

  /**
   * 用户注册
   */
  async register(data: RegisterRequest): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>('/api/v1/auth/register', data);
    return response;
  }

  /**
   * 刷新访问令牌
   */
  async refreshToken(data: RefreshTokenRequest): Promise<{ access_token: string; session_id: string }> {
    const response = await apiClient.post<{ data: { access_token: string; session_id: string } }>('/api/v1/auth/refresh', data);
    return response.data;
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
    const response = await apiClient.get<{data: User, message: string, success: boolean}>('/api/v1/auth/me');
    // 从API响应中提取实际的用户数据
    return response.data;
  }

  /**
   * 更新当前用户信息
   */
  async updateCurrentUser(data: Partial<User>): Promise<User> {
    const response = await apiClient.put<{data: User, message: string, success: boolean}>('/api/v1/auth/me', data);
    return response.data;
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
    const response = await apiClient.get<{ data: UserSession[] }>('/api/v1/auth/sessions');
    return response.data;
  }

  /**
   * 撤销指定会话
   */
  async revokeSession(sessionId: string): Promise<void> {
    await apiClient.delete(`/api/v1/auth/sessions/${sessionId}`);
  }

  // User Administration Methods (Admin Only)

  /**
   * 获取用户列表（管理员功能）
   */
  async getUsers(params?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    status?: string;
  }): Promise<{ users: User[]; total: number; page: number; limit: number }> {
    const response = await apiClient.get<{ users: User[]; total: number; page: number; limit: number }>('/api/v1/users', params);
    return response;
  }

  /**
   * 创建用户（管理员功能）
   */
  async createUser(data: {
    username: string;
    email: string;
    password: string;
    full_name?: string;
    phone?: string;
    role_ids?: string[];
    organization_ids?: string[];
  }): Promise<User> {
    const response = await apiClient.post<User>('/api/v1/users', data);
    return response;
  }

  /**
   * 更新用户（管理员功能）
   */
  async updateUser(userId: string, data: Partial<User>): Promise<User> {
    const response = await apiClient.put<User>(`/api/v1/users/${userId}`, data);
    return response;
  }

  /**
   * 删除用户（管理员功能）
   */
  async deleteUser(userId: string): Promise<void> {
    await apiClient.delete(`/api/v1/users/${userId}`);
  }

  /**
   * 获取用户详情（管理员功能）
   */
  async getUserById(userId: string): Promise<User> {
    const response = await apiClient.get<User>(`/api/v1/users/${userId}`);
    return response;
  }

  /**
   * 分配角色给用户（管理员功能）
   */
  async assignRoleToUser(userId: string, roleId: string, organizationId?: string): Promise<void> {
    await apiClient.post(`/api/v1/users/${userId}/roles`, {
      role_id: roleId,
      organization_id: organizationId
    });
  }

  /**
   * 撤销用户角色（管理员功能）
   */
  async revokeRoleFromUser(userId: string, roleId: string): Promise<void> {
    await apiClient.delete(`/api/v1/users/${userId}/roles/${roleId}`);
  }

  /**
   * 重置用户密码（管理员功能）
   */
  async resetUserPassword(userId: string): Promise<{ new_password: string }> {
    const response = await apiClient.post<{ new_password: string }>(`/api/v1/users/${userId}/reset-password`);
    return response;
  }

  /**
   * 获取用户权限（管理员功能）
   */
  async getUserPermissions(userId: string): Promise<string[]> {
    const response = await apiClient.get<string[]>(`/api/v1/users/${userId}/permissions`);
    return response;
  }

  /**
   * 获取用户会话（管理员功能）
   */
  async getUserSessionsAdmin(userId: string): Promise<UserSession[]> {
    const response = await apiClient.get<UserSession[]>(`/api/v1/users/${userId}/sessions`);
    return response;
  }

  /**
   * 撤销用户会话（管理员功能）
   */
  async revokeUserSessionAdmin(userId: string, sessionId: string): Promise<void> {
    await apiClient.delete(`/api/v1/users/${userId}/sessions/${sessionId}`);
  }

  // Role Management Methods (Admin Only)

  /**
   * 获取角色列表
   */
  async getRoles(): Promise<Role[]> {
    const response = await apiClient.get<Role[]>('/api/v1/roles');
    return response;
  }

  /**
   * 创建角色
   */
  async createRole(data: {
    name: string;
    code: string;
    description?: string;
    permission_ids?: string[];
  }): Promise<Role> {
    const response = await apiClient.post<Role>('/api/v1/roles', data);
    return response;
  }

  /**
   * 更新角色
   */
  async updateRole(roleId: string, data: Partial<Role>): Promise<Role> {
    const response = await apiClient.put<Role>(`/api/v1/roles/${roleId}`, data);
    return response;
  }

  /**
   * 删除角色
   */
  async deleteRole(roleId: string): Promise<void> {
    await apiClient.delete(`/api/v1/roles/${roleId}`);
  }

  // Organization Management Methods (Admin Only)

  /**
   * 获取组织列表
   */
  async getOrganizations(): Promise<Organization[]> {
    const response = await apiClient.get<Organization[]>('/api/v1/organizations');
    return response;
  }

  /**
   * 创建组织
   */
  async createOrganization(data: {
    name: string;
    code: string;
    description?: string;
    parent_id?: string;
  }): Promise<Organization> {
    const response = await apiClient.post<Organization>('/api/v1/organizations', data);
    return response;
  }

  /**
   * 更新组织
   */
  async updateOrganization(orgId: string, data: Partial<Organization>): Promise<Organization> {
    const response = await apiClient.put<Organization>(`/api/v1/organizations/${orgId}`, data);
    return response;
  }

  /**
   * 删除组织
   */
  async deleteOrganization(orgId: string): Promise<void> {
    await apiClient.delete(`/api/v1/organizations/${orgId}`);
  }

  /**
   * 设置认证令牌
   */
  setAuthToken(token: string): void {
    if (token) {
      apiClient.setAuthToken(token);
      console.log('Setting auth token:', token);
    } else {
      apiClient.removeAuthToken();
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
  storeTokens(accessToken: string, refreshToken: string, expiresAt?: string, sessionId?: string): void {
    try {
      localStorage.setItem('access_token', accessToken);
      localStorage.setItem('refresh_token', refreshToken);
      if (expiresAt) {
        localStorage.setItem('token_expires_at', expiresAt);
      }
      if (sessionId) {
        localStorage.setItem('session_id', sessionId);
      }
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
      localStorage.removeItem('token_expires_at');
      localStorage.removeItem('session_id');
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
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      const expiresAt = localStorage.getItem('token_expires_at');
      
      if (!refreshToken) {
        return false;
      }

      // 检查 token 是否即将过期（5分钟内）
      const isExpiringSoon = expiresAt ? this.isTokenExpiringSoon(expiresAt) : true;
      
      // 如果 token 还有效且未即将过期，则不需要刷新
      if (!isExpiringSoon) {
        return true;
      }

      const response = await this.refreshToken({ refresh_token: refreshToken });
      if (response.access_token) {
        // 计算新的过期时间（假设服务器返回的 token 有效期为 2 小时）
        const newExpiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
        
        this.storeTokens(
          response.access_token,
          refreshToken,
          newExpiresAt,
          response.session_id
        );
        this.setAuthToken(response.access_token);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Auto refresh token failed:', error);
      // 只有在确认是 token 无效时才清除
      if (error instanceof Error && error.message.includes('Token refresh failed')) {
        this.clearStoredTokens();
        this.setAuthToken('');
      }
      return false;
    }
  }
}

export const authService = new AuthService();