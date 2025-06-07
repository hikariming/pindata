import { apiClient } from '../lib/api-client';
import { config } from '../lib/config';
import { ApiResponse, PaginatedResponse } from '../types/api';
import { LibraryFile, Library } from '../types/library';

export class FileService {
  
  /**
   * 获取文件详情
   */
  static async getFileDetail(libraryId: string, fileId: string): Promise<LibraryFile> {
    const response = await apiClient.get<ApiResponse<LibraryFile>>(`/api/v1/libraries/${libraryId}/files/${fileId}`);
    return response.data!;
  }

  /**
   * 获取所有数据集合（Libraries）
   */
  static async getLibraries(): Promise<Library[]> {
    try {
      const response = await apiClient.get<PaginatedResponse<Library>>('/api/v1/libraries', {
        per_page: 100 // 修改为API允许的最大值
      });
      return response.data || [];
    } catch (error) {
      console.error('获取数据集合失败:', error);
      throw error;
    }
  }

  /**
   * 获取指定数据集合中已转换的MD文件
   */
  static async getLibraryMarkdownFiles(libraryId: string): Promise<LibraryFile[]> {
    try {
      const response = await apiClient.get<PaginatedResponse<LibraryFile>>(`/api/v1/libraries/${libraryId}/files`, {
        process_status: 'completed',
        per_page: 100 // 修改为API允许的最大值
      });
      
      // 过滤出已转换为markdown的文件
      const allFiles = response.data || [];
      const markdownFiles = allFiles.filter(file => 
        file.process_status === 'completed' && 
        (file.converted_format === 'markdown' || file.file_type === 'markdown' || file.filename.endsWith('.md'))
      );
      
      return markdownFiles;
    } catch (error) {
      console.error('获取MD文件列表失败:', error);
      throw error;
    }
  }

  /**
   * 获取文件内容（原始文本内容，用于内容预览）
   */
  static async getFileContent(objectName: string): Promise<string> {
    try {
      const encodedObjectName = encodeURIComponent(objectName);
      const downloadUrl = `${config.apiBaseUrl}/storage/download/${encodedObjectName}`;
      
      const response = await fetch(downloadUrl, {
        method: 'GET',
        headers: {
          'Accept': 'text/plain, text/markdown, */*',
        },
      });

      if (!response.ok) {
        throw new Error(`获取文件内容失败: HTTP ${response.status}`);
      }

      const content = await response.text();
      return content;
      
    } catch (error) {
      console.error('获取文件内容失败:', error);
      throw error;
    }
  }

  /**
   * 获取Markdown内容（用于MD预览）
   */
  static async getMarkdownContent(objectName: string): Promise<string> {
    try {
      const encodedObjectName = encodeURIComponent(objectName);
      const downloadUrl = `${config.apiBaseUrl}/storage/download/${encodedObjectName}`;
      
      const response = await fetch(downloadUrl, {
        method: 'GET',
        headers: {
          'Accept': 'text/markdown, text/plain, */*',
        },
      });

      if (!response.ok) {
        throw new Error(`获取Markdown内容失败: HTTP ${response.status}`);
      }

      const content = await response.text();
      return content;
      
    } catch (error) {
      console.error('获取Markdown内容失败:', error);
      throw error;
    }
  }

  /**
   * 下载Markdown文件
   */
  static async downloadMarkdownFile(objectName: string, filename: string): Promise<void> {
    try {
      const encodedObjectName = encodeURIComponent(objectName);
      const downloadUrl = `${config.apiBaseUrl}/storage/download/${encodedObjectName}`;
      
      const response = await fetch(downloadUrl, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`下载文件失败: HTTP ${response.status}`);
      }

      const blob = await response.blob();
      
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
      
    } catch (error) {
      console.error('下载Markdown文件失败:', error);
      throw error;
    }
  }

  /**
   * 更新文件名
   */
  static async updateFileName(libraryId: string, fileId: string, newName: string): Promise<LibraryFile> {
    const response = await apiClient.put<ApiResponse<LibraryFile>>(`/api/v1/libraries/${libraryId}/files/${fileId}`, {
      filename: newName
    });
    return response.data!;
  }

  /**
   * 删除文件
   */
  static async deleteFile(libraryId: string, fileId: string): Promise<void> {
    await apiClient.delete<ApiResponse>(`/api/v1/libraries/${libraryId}/files/${fileId}`);
  }
}

// 导出单例实例
export const fileService = FileService; 