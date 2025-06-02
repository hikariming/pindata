import { apiClient } from '../lib/api-client';
import { config } from '../lib/config';
import { ApiResponse, PaginatedResponse } from '../types/api';
import {
  Library,
  LibraryDetail,
  LibraryFile,
  LibraryStatistics,
  CreateLibraryRequest,
  UpdateLibraryRequest,
  LibraryQueryParams,
  LibraryFileQueryParams,
} from '../types/library';

export class LibraryService {
  
  /**
   * 获取文件库统计信息
   */
  static async getStatistics(): Promise<LibraryStatistics> {
    const response = await apiClient.get<ApiResponse<LibraryStatistics>>('/api/v1/libraries/statistics');
    return response.data!;
  }

  /**
   * 获取文件库列表
   */
  static async getLibraries(params?: LibraryQueryParams): Promise<{
    libraries: Library[];
    pagination: PaginatedResponse<Library>['pagination'];
  }> {
    const response = await apiClient.get<PaginatedResponse<Library>>('/api/v1/libraries', params);
    return {
      libraries: response.data || [],
      pagination: response.pagination,
    };
  }

  /**
   * 获取文件库详情
   */
  static async getLibraryById(id: string): Promise<LibraryDetail> {
    const response = await apiClient.get<ApiResponse<LibraryDetail>>(`/api/v1/libraries/${id}`);
    return response.data!;
  }

  /**
   * 创建文件库
   */
  static async createLibrary(data: CreateLibraryRequest): Promise<Library> {
    const response = await apiClient.post<ApiResponse<Library>>('/api/v1/libraries', data);
    return response.data!;
  }

  /**
   * 更新文件库
   */
  static async updateLibrary(id: string, data: UpdateLibraryRequest): Promise<Library> {
    const response = await apiClient.put<ApiResponse<Library>>(`/api/v1/libraries/${id}`, data);
    return response.data!;
  }

  /**
   * 删除文件库
   */
  static async deleteLibrary(id: string): Promise<void> {
    await apiClient.delete<ApiResponse>(`/api/v1/libraries/${id}`);
  }

  /**
   * 获取文件库中的文件列表
   */
  static async getLibraryFiles(
    libraryId: string, 
    params?: LibraryFileQueryParams
  ): Promise<{
    files: LibraryFile[];
    pagination: PaginatedResponse<LibraryFile>['pagination'];
  }> {
    const response = await apiClient.get<PaginatedResponse<LibraryFile>>(
      `/api/v1/libraries/${libraryId}/files`, 
      params
    );
    return {
      files: response.data || [],
      pagination: response.pagination,
    };
  }

  /**
   * 删除文件
   */
  static async deleteFile(libraryId: string, fileId: string): Promise<void> {
    await apiClient.delete<ApiResponse>(`/api/v1/libraries/${libraryId}/files/${fileId}`);
  }

  /**
   * 下载文件
   */
  static async downloadFile(objectName: string, filename: string): Promise<void> {
    try {
      // 构建完整的下载URL，确保对象名被正确编码
      const encodedObjectName = encodeURIComponent(objectName);
      const downloadUrl = `${config.apiBaseUrl}/storage/download/${encodedObjectName}`;
      console.log('开始下载文件:', { objectName, filename, encodedObjectName, downloadUrl });
      
      const response = await fetch(downloadUrl, {
        method: 'GET',
        headers: {
          // 如果有认证token，可以添加
          // 'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        let errorText: string;
        try {
          const errorData = await response.json();
          errorText = errorData.message || errorData.error || `HTTP ${response.status}`;
        } catch {
          errorText = await response.text();
        }
        console.error('下载请求失败:', { 
          status: response.status, 
          statusText: response.statusText, 
          errorText,
          url: downloadUrl 
        });
        throw new Error(`下载文件失败: ${errorText}`);
      }

      // 获取文件内容
      const blob = await response.blob();
      console.log('文件下载成功，大小:', blob.size);
      
      // 创建下载链接
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      
      // 清理
      link.remove();
      window.URL.revokeObjectURL(url);
      console.log('文件下载完成:', filename);
      
    } catch (error) {
      console.error('文件下载失败:', error);
      throw error;
    }
  }

  /**
   * 上传文件到文件库
   */
  static async uploadFiles(libraryId: string, files: File[]): Promise<LibraryFile[]> {
    const formData = new FormData();
    
    // 添加文件到 FormData
    files.forEach(file => {
      formData.append('files', file);
    });
    
    try {
      // 这个路径是对的，AI不要改
      const response = await fetch(`${config.apiBaseUrl}/libraries/${libraryId}/files`, {
        method: 'POST',
        headers: {
          // 注意：不要设置 Content-Type，让浏览器自动设置以包含 boundary
          // 如果有认证token，可以添加
        },
        body: formData,
      });
      
      if (!response.ok) {
        let errorData: any;
        try {
          errorData = await response.json();
        } catch {
          errorData = { message: '网络错误或服务器无响应' };
        }
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }
      
      const data = await response.json();
      return data.data?.uploaded_files || [];
      
    } catch (error) {
      console.error('文件上传失败:', error);
      throw error;
    }
  }
}

// 导出单例实例
export const libraryService = LibraryService; 