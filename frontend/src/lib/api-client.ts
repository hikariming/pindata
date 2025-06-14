import { ApiResponse, ApiError } from '../types/api';
import { config } from './config';

export class ApiClient {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;
  private isRefreshing: boolean = false;
  private refreshSubscribers: Array<(token: string) => void> = [];

  constructor(baseURL: string = config.apiBaseUrl) {
    this.baseURL = baseURL;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }

  // 设置认证token
  setAuthToken(token: string) {
    this.defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  // 移除认证token
  removeAuthToken() {
    delete this.defaultHeaders['Authorization'];
  }

  // 添加刷新订阅者
  private addRefreshSubscriber(callback: (token: string) => void) {
    this.refreshSubscribers.push(callback);
  }

  // 通知所有订阅者token已刷新
  private notifyRefreshSubscribers(token: string) {
    this.refreshSubscribers.forEach(callback => callback(token));
    this.refreshSubscribers = [];
  }

  // 刷新token
  private async refreshToken(): Promise<string | null> {
    if (this.isRefreshing) {
      // 如果正在刷新，返回一个Promise等待刷新完成
      return new Promise((resolve) => {
        this.addRefreshSubscriber((token: string) => {
          resolve(token);
        });
      });
    }

    this.isRefreshing = true;

    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await fetch(`${this.baseURL}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      const newToken = data.data?.access_token || data.access_token;
      
      if (newToken) {
        localStorage.setItem('access_token', newToken);
        this.setAuthToken(newToken);
        this.notifyRefreshSubscribers(newToken);
        return newToken;
      }

      throw new Error('No access token in refresh response');
    } catch (error) {
      console.error('Token refresh failed:', error);
      
      // 只有在确认是 token 无效时才清除
      if (error instanceof Error && error.message.includes('Token refresh failed')) {
        // 清除所有token
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('token_expires_at');
        localStorage.removeItem('session_id');
        localStorage.removeItem('user');
        this.removeAuthToken();
        
        // 使用更优雅的方式重定向到登录页
        const currentPath = window.location.pathname;
        if (!currentPath.startsWith('/auth/')) {
          window.location.href = `/auth/login?redirect=${encodeURIComponent(currentPath)}`;
        }
      }
      return null;
    } finally {
      this.isRefreshing = false;
    }
  }

  // 构建完整URL
  private buildUrl(endpoint: string, params?: Record<string, any>): string {
    const url = new URL(endpoint, this.baseURL);
    
    if (params) {
      Object.keys(params).forEach(key => {
        const value = params[key];
        if (value !== undefined && value !== null && value !== '') {
          // 处理数组参数
          if (Array.isArray(value)) {
            value.forEach(item => url.searchParams.append(key, String(item)));
          } else {
            url.searchParams.append(key, String(value));
          }
        }
      });
    }
    
    return url.toString();
  }

  // 处理响应
  private async handleResponse<T>(response: Response, originalRequest?: () => Promise<Response>): Promise<T> {
    if (!response.ok) {
      let errorData: any;
      try {
        errorData = await response.json();
      } catch {
        errorData = { message: '网络错误或服务器无响应' };
      }

      // 如果是401错误且有原始请求函数，尝试刷新token并重试
      if (response.status === 401 && originalRequest) {
        const newToken = await this.refreshToken();
        if (newToken) {
          // token刷新成功，重试原始请求
          const retryResponse = await originalRequest();
          return this.handleResponse<T>(retryResponse);
        }
      }

      throw new ApiError(
        errorData.message || `HTTP ${response.status}`,
        response.status,
        errorData.errors
      );
    }

    try {
      const jsonResponse = await response.json();
      console.log('api-client handleResponse - raw JSON:', jsonResponse);
      // For endpoints that need both data and pagination, return the whole response
      // This includes paginated endpoints like /api/v1/libraries
      return jsonResponse;
    } catch {
      throw new ApiError('响应数据格式错误', response.status);
    }
  }

  // GET请求
  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const url = this.buildUrl(endpoint, params);
    
    const makeRequest = () => fetch(url, {
      method: 'GET',
      headers: this.defaultHeaders,
    });

    const response = await makeRequest();
    return this.handleResponse<T>(response, makeRequest);
  }

  // POST请求
  async post<T>(endpoint: string, data?: any): Promise<T> {
    const url = this.buildUrl(endpoint);
    
    const makeRequest = () => fetch(url, {
      method: 'POST',
      headers: this.defaultHeaders,
      body: data ? JSON.stringify(data) : undefined,
    });

    const response = await makeRequest();
    return this.handleResponse<T>(response, makeRequest);
  }

  // PUT请求
  async put<T>(endpoint: string, data?: any): Promise<T> {
    const url = this.buildUrl(endpoint);
    
    const makeRequest = () => fetch(url, {
      method: 'PUT',
      headers: this.defaultHeaders,
      body: data ? JSON.stringify(data) : undefined,
    });

    const response = await makeRequest();
    return this.handleResponse<T>(response, makeRequest);
  }

  // DELETE请求
  async delete<T>(endpoint: string, data?: any): Promise<T> {
    const url = this.buildUrl(endpoint);
    
    const makeRequest = () => fetch(url, {
      method: 'DELETE',
      headers: this.defaultHeaders,
      body: data ? JSON.stringify(data) : undefined,
    });

    const response = await makeRequest();
    return this.handleResponse<T>(response, makeRequest);
  }

  // PATCH请求
  async patch<T>(endpoint: string, data?: any): Promise<T> {
    const url = this.buildUrl(endpoint);
    
    const makeRequest = () => fetch(url, {
      method: 'PATCH',
      headers: this.defaultHeaders,
      body: data ? JSON.stringify(data) : undefined,
    });

    const response = await makeRequest();
    return this.handleResponse<T>(response, makeRequest);
  }
}

// 创建默认实例
export const apiClient = new ApiClient(); 