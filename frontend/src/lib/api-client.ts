import { ApiResponse, ApiError } from '../types/api';
import { config } from './config';

export class ApiClient {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;

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
  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      let errorData: any;
      try {
        errorData = await response.json();
      } catch {
        errorData = { message: '网络错误或服务器无响应' };
      }

      throw new ApiError(
        errorData.message || `HTTP ${response.status}`,
        response.status,
        errorData.errors
      );
    }

    try {
      const data = await response.json();
      return data;
    } catch {
      throw new ApiError('响应数据格式错误', response.status);
    }
  }

  // GET请求
  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const url = this.buildUrl(endpoint, params);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: this.defaultHeaders,
    });

    return this.handleResponse<T>(response);
  }

  // POST请求
  async post<T>(endpoint: string, data?: any): Promise<T> {
    const url = this.buildUrl(endpoint);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: this.defaultHeaders,
      body: data ? JSON.stringify(data) : undefined,
    });

    return this.handleResponse<T>(response);
  }

  // PUT请求
  async put<T>(endpoint: string, data?: any): Promise<T> {
    const url = this.buildUrl(endpoint);
    
    const response = await fetch(url, {
      method: 'PUT',
      headers: this.defaultHeaders,
      body: data ? JSON.stringify(data) : undefined,
    });

    return this.handleResponse<T>(response);
  }

  // DELETE请求
  async delete<T>(endpoint: string): Promise<T> {
    const url = this.buildUrl(endpoint);
    
    const response = await fetch(url, {
      method: 'DELETE',
      headers: this.defaultHeaders,
    });

    return this.handleResponse<T>(response);
  }

  // PATCH请求
  async patch<T>(endpoint: string, data?: any): Promise<T> {
    const url = this.buildUrl(endpoint);
    
    const response = await fetch(url, {
      method: 'PATCH',
      headers: this.defaultHeaders,
      body: data ? JSON.stringify(data) : undefined,
    });

    return this.handleResponse<T>(response);
  }
}

// 创建默认实例
export const apiClient = new ApiClient(); 