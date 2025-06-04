import { apiClient } from '../lib/api-client';
import { config } from '../lib/config';
import { ApiResponse } from '../types/api';
import {
  EnhancedDatasetVersion,
  DatasetPreview,
  VersionDiff,
  CreateDatasetVersionRequest,
  CloneVersionRequest,
  DatasetVersionQueryParams,
  VersionInfo
} from '../types/enhanced-dataset';

export class EnhancedDatasetService {
  
  /**
   * 创建数据集版本（类似git commit）
   */
  static async createDatasetVersion(
    datasetId: number,
    data: CreateDatasetVersionRequest
  ): Promise<EnhancedDatasetVersion> {
    const formData = new FormData();
    
    // 添加表单字段
    formData.append('version', data.version);
    formData.append('commit_message', data.commit_message);
    formData.append('author', data.author);
    
    if (data.version_type) {
      formData.append('version_type', data.version_type);
    }
    
    if (data.parent_version_id) {
      formData.append('parent_version_id', data.parent_version_id);
    }
    
    if (data.pipeline_config) {
      formData.append('pipeline_config', JSON.stringify(data.pipeline_config));
    }
    
    if (data.metadata) {
      formData.append('metadata', JSON.stringify(data.metadata));
    }
    
    // 添加文件
    if (data.files) {
      data.files.forEach(file => {
        formData.append('files', file);
      });
    }
    
    try {
      const response = await fetch(`${config.apiBaseUrl}/datasets/${datasetId}/versions/enhanced`, {
        method: 'POST',
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
      
      const result = await response.json();
      return result.data;
      
    } catch (error) {
      console.error('创建数据集版本失败:', error);
      throw error;
    }
  }

  /**
   * 获取数据集预览
   */
  static async getDatasetPreview(
    datasetId: number,
    versionId?: string,
    maxItems: number = 10
  ): Promise<DatasetPreview> {
    const params: any = { max_items: maxItems };
    if (versionId) {
      params.version_id = versionId;
    }
    
    const response = await apiClient.get<ApiResponse<DatasetPreview>>(
      `/api/v1/datasets/${datasetId}/preview`,
      params
    );
    return response.data!;
  }

  /**
   * 获取版本差异（类似git diff）
   */
  static async getVersionDiff(
    version1Id: string,
    version2Id: string
  ): Promise<VersionDiff> {
    const response = await apiClient.get<ApiResponse<VersionDiff>>(
      `/api/v1/dataset-versions/${version1Id}/diff/${version2Id}`
    );
    return response.data!;
  }

  /**
   * 设置默认版本
   */
  static async setDefaultVersion(versionId: string): Promise<EnhancedDatasetVersion> {
    const response = await apiClient.post<ApiResponse<EnhancedDatasetVersion>>(
      `/api/v1/dataset-versions/${versionId}/set-default`
    );
    return response.data!;
  }

  /**
   * 克隆版本（类似git branch）
   */
  static async cloneVersion(
    sourceVersionId: string,
    data: CloneVersionRequest
  ): Promise<EnhancedDatasetVersion> {
    const response = await apiClient.post<ApiResponse<EnhancedDatasetVersion>>(
      `/api/v1/dataset-versions/${sourceVersionId}/clone`,
      data
    );
    return response.data!;
  }

  /**
   * 获取版本详细信息
   */
  static async getVersionDetails(versionId: string): Promise<EnhancedDatasetVersion> {
    const response = await apiClient.get<ApiResponse<EnhancedDatasetVersion>>(
      `/api/v1/dataset-versions/${versionId}/details`
    );
    return response.data!;
  }

  /**
   * 下载数据集文件
   */
  static async downloadDatasetFile(
    objectName: string, 
    filename: string
  ): Promise<void> {
    try {
      // 构建完整的下载URL，确保对象名被正确编码
      const encodedObjectName = encodeURIComponent(objectName);
      const downloadUrl = `${config.apiBaseUrl}/storage/download/${encodedObjectName}`;
      console.log('开始下载数据集文件:', { objectName, filename, encodedObjectName, downloadUrl });
      
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
      console.error('数据集文件下载失败:', error);
      throw error;
    }
  }

  /**
   * 获取版本树（显示版本分支关系）
   */
  static async getVersionTree(datasetId: number): Promise<EnhancedDatasetVersion[]> {
    const response = await apiClient.get<ApiResponse<EnhancedDatasetVersion[]>>(
      `/api/v1/datasets/${datasetId}/versions/enhanced`
    );
    return response.data || [];
  }

  /**
   * 搜索版本
   */
  static async searchVersions(
    datasetId: number,
    query: string,
    params?: DatasetVersionQueryParams
  ): Promise<{
    versions: EnhancedDatasetVersion[];
    total: number;
  }> {
    // 这个API需要后端实现，目前返回空数组
    return {
      versions: [],
      total: 0
    };
  }

  /**
   * 获取版本统计信息
   */
  static async getVersionStats(datasetId: number): Promise<{
    total_versions: number;
    default_version?: string;
    latest_version?: string;
    total_files: number;
    total_size: string;
    authors: string[];
    version_types: Record<string, number>;
  }> {
    // 这个API需要后端实现，先返回模拟数据
    return {
      total_versions: 0,
      total_files: 0,
      total_size: '0B',
      authors: [],
      version_types: {}
    };
  }

  /**
   * 批量操作版本
   */
  static async batchUpdateVersions(
    versionIds: string[],
    action: 'deprecate' | 'restore' | 'delete',
    options?: Record<string, any>
  ): Promise<{ success: boolean; message: string }> {
    // 这个API需要后端实现
    throw new Error('批量操作功能暂未实现');
  }

  /**
   * 导出版本信息
   */
  static async exportVersionInfo(
    versionId: string,
    format: 'json' | 'csv' | 'yaml' = 'json'
  ): Promise<void> {
    try {
      const version = await this.getVersionDetails(versionId);
      
      let content: string;
      let mimeType: string;
      let fileExtension: string;
      
      switch (format) {
        case 'csv':
          // 简化的CSV导出
          content = this._convertToCSV(version);
          mimeType = 'text/csv';
          fileExtension = 'csv';
          break;
        case 'yaml':
          // 简化的YAML导出
          content = this._convertToYAML(version);
          mimeType = 'text/yaml';
          fileExtension = 'yaml';
          break;
        default:
          content = JSON.stringify(version, null, 2);
          mimeType = 'application/json';
          fileExtension = 'json';
      }
      
      // 下载文件
      const blob = new Blob([content], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `dataset-version-${version.version}.${fileExtension}`;
      document.body.appendChild(link);
      link.click();
      
      // 清理
      link.remove();
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('导出版本信息失败:', error);
      throw error;
    }
  }

  /**
   * 私有方法：转换为CSV格式
   */
  private static _convertToCSV(version: EnhancedDatasetVersion): string {
    const headers = ['字段', '值'];
    const rows = [
      ['版本号', version.version],
      ['提交哈希', version.commit_hash],
      ['提交信息', version.commit_message],
      ['作者', version.author],
      ['版本类型', version.version_type],
      ['文件数量', version.file_count.toString()],
      ['总大小', version.total_size_formatted],
      ['是否默认', version.is_default ? '是' : '否'],
      ['创建时间', version.created_at],
    ];
    
    return [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
  }

  /**
   * 私有方法：转换为YAML格式
   */
  private static _convertToYAML(version: EnhancedDatasetVersion): string {
    return `version: "${version.version}"
commit_hash: "${version.commit_hash}"
commit_message: "${version.commit_message}"
author: "${version.author}"
version_type: "${version.version_type}"
file_count: ${version.file_count}
total_size: "${version.total_size_formatted}"
is_default: ${version.is_default}
created_at: "${version.created_at}"
files:
${version.files.map(file => `  - filename: "${file.filename}"
    file_type: "${file.file_type}"
    file_size: "${file.file_size_formatted}"`).join('\n')}`;
  }

  /**
   * 向现有版本添加多个文件
   */
  static async addFilesToVersion(
    versionId: string,
    files: File[]
  ): Promise<{
    version_id: string;
    added_files: any[];
    total_added: number;
    new_file_count: number;
    new_total_size: number;
    new_total_size_formatted: string;
  }> {
    const formData = new FormData();
    
    files.forEach(file => {
      formData.append('files', file);
    });
    
    try {
      const response = await fetch(`${config.apiBaseUrl}/dataset-versions/${versionId}/files`, {
        method: 'POST',
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
      
      const result = await response.json();
      return result.data;
      
    } catch (error) {
      console.error('添加文件到版本失败:', error);
      throw error;
    }
  }

  /**
   * 删除版本中的文件
   */
  static async deleteFileFromVersion(
    versionId: string,
    fileId: string
  ): Promise<{
    version_id: string;
    deleted_file: any;
    new_file_count: number;
    new_total_size: number;
    new_total_size_formatted: string;
  }> {
    const response = await apiClient.delete<ApiResponse<any>>(
      `/api/v1/dataset-versions/${versionId}/files/${fileId}`
    );
    return response.data!;
  }

  /**
   * 获取版本中的文件列表
   */
  static async getVersionFiles(
    versionId: string,
    options?: {
      fileType?: string;
      page?: number;
      pageSize?: number;
    }
  ): Promise<{
    version: EnhancedDatasetVersion;
    files: any[];
    pagination: {
      total: number;
      pages: number;
      current_page: number;
      per_page: number;
      has_next: boolean;
      has_prev: boolean;
    };
    type_statistics: Array<{
      file_type: string;
      count: number;
      total_size: number;
      total_size_formatted: string;
    }>;
  }> {
    const params: any = {};
    if (options?.fileType) params.file_type = options.fileType;
    if (options?.page) params.page = options.page;
    if (options?.pageSize) params.page_size = options.pageSize;
    
    const response = await apiClient.get<ApiResponse<any>>(
      `/api/v1/dataset-versions/${versionId}/files`,
      params
    );
    return response.data!;
  }

  /**
   * 下载单个文件
   */
  static async downloadSingleFile(fileId: string): Promise<void> {
    try {
      const downloadUrl = `${config.apiBaseUrl}/dataset-files/${fileId}/download`;
      
      const response = await fetch(downloadUrl, {
        method: 'GET',
      });

      if (!response.ok) {
        let errorText: string;
        try {
          const errorData = await response.json();
          errorText = errorData.message || errorData.error || `HTTP ${response.status}`;
        } catch {
          errorText = await response.text();
        }
        throw new Error(`下载文件失败: ${errorText}`);
      }

      // 从响应头获取文件名
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'download';
      if (contentDisposition) {
        const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition);
        if (matches != null && matches[1]) {
          filename = matches[1].replace(/['"]/g, '');
        }
      }

      // 获取文件内容
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
      console.error('下载文件失败:', error);
      throw error;
    }
  }

  /**
   * 批量操作文件
   */
  static async batchFileOperations(
    versionId: string,
    operation: 'delete' | 'update_metadata',
    fileIds: string[],
    metadata?: Record<string, any>
  ): Promise<{
    version_id: string;
    operation: string;
    affected_files: any[];
    total_affected: number;
    new_file_count: number;
    new_total_size: number;
    new_total_size_formatted: string;
  }> {
    const data: any = {
      operation,
      file_ids: fileIds
    };
    
    if (metadata) {
      data.metadata = metadata;
    }
    
    const response = await apiClient.post<ApiResponse<any>>(
      `/api/v1/dataset-versions/${versionId}/batch-operations`,
      data
    );
    return response.data!;
  }

  /**
   * 获取文件分析统计
   */
  static async getFileAnalytics(versionId: string): Promise<{
    version: EnhancedDatasetVersion;
    type_statistics: Array<{
      file_type: string;
      count: number;
      total_size: number;
      total_size_formatted: string;
      average_size: number;
      average_size_formatted: string;
    }>;
    size_distribution: Array<{
      range: string;
      count: number;
    }>;
    summary: {
      total_files: number;
      total_size: number;
      total_size_formatted: string;
      average_file_size: number;
    };
  }> {
    const response = await apiClient.get<ApiResponse<any>>(
      `/api/v1/dataset-versions/${versionId}/analytics`
    );
    return response.data!;
  }

  /**
   * 获取数据集的可用文件列表（用于创建版本时选择）
   */
  static async getAvailableFiles(
    datasetId: number,
    options?: {
      excludeVersionId?: string;
      fileType?: string;
      search?: string;
      page?: number;
      pageSize?: number;
    }
  ): Promise<{
    dataset: any;
    files: Array<{
      id: string;
      filename: string;
      file_type: string;
      file_size: number;
      file_size_formatted: string;
      checksum: string;
      version_info: {
        version: string;
        is_default: boolean;
        created_at: string;
      };
    }>;
    pagination: {
      total: number;
      pages: number;
      current_page: number;
      per_page: number;
      has_next: boolean;
      has_prev: boolean;
    };
    type_statistics: Array<{
      file_type: string;
      count: number;
    }>;
    summary: {
      total_unique_files: number;
      search_term?: string;
      file_type_filter?: string;
    };
  }> {
    const params: any = {};
    if (options?.excludeVersionId) params.exclude_version_id = options.excludeVersionId;
    if (options?.fileType) params.file_type = options.fileType;
    if (options?.search) params.search = options.search;
    if (options?.page) params.page = options.page;
    if (options?.pageSize) params.page_size = options.pageSize;
    
    const response = await apiClient.get<ApiResponse<any>>(
      `/api/v1/datasets/${datasetId}/available-files`,
      params
    );
    return response.data!;
  }

  /**
   * 使用现有文件创建数据集版本（支持混合模式：现有文件 + 新文件）
   */
  static async createVersionWithExistingFiles(
    datasetId: number,
    data: {
      version: string;
      commit_message: string;
      author: string;
      version_type?: 'major' | 'minor' | 'patch';
      parent_version_id?: string;
      existing_file_ids?: string[];
      new_files?: File[];
      pipeline_config?: Record<string, any>;
      metadata?: Record<string, any>;
    }
  ): Promise<EnhancedDatasetVersion> {
    try {
      // 如果有新文件，使用FormData
      if (data.new_files && data.new_files.length > 0) {
        const formData = new FormData();
        
        // 添加基本信息作为表单字段
        formData.append('version', data.version);
        formData.append('commit_message', data.commit_message);
        formData.append('author', data.author);
        
        if (data.version_type) {
          formData.append('version_type', data.version_type);
        }
        
        if (data.parent_version_id) {
          formData.append('parent_version_id', data.parent_version_id);
        }
        
        if (data.pipeline_config) {
          formData.append('pipeline_config', JSON.stringify(data.pipeline_config));
        }
        
        if (data.metadata) {
          formData.append('metadata', JSON.stringify(data.metadata));
        }
        
        // 添加现有文件ID列表
        if (data.existing_file_ids) {
          formData.append('existing_file_ids', JSON.stringify(data.existing_file_ids));
        }
        
        // 添加新文件
        data.new_files.forEach(file => {
          formData.append('files', file);
        });
        
        const response = await fetch(`${config.apiBaseUrl}/datasets/${datasetId}/versions/enhanced-with-existing`, {
          method: 'POST',
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
        
        const result = await response.json();
        return result.data;
      } else {
        // 仅使用现有文件，发送JSON请求
        const response = await apiClient.post<ApiResponse<EnhancedDatasetVersion>>(
          `/api/v1/datasets/${datasetId}/versions/enhanced-with-existing`,
          {
            version: data.version,
            commit_message: data.commit_message,
            author: data.author,
            version_type: data.version_type || 'minor',
            parent_version_id: data.parent_version_id,
            existing_file_ids: data.existing_file_ids || [],
            pipeline_config: data.pipeline_config,
            metadata: data.metadata
          }
        );
        return response.data!;
      }
      
    } catch (error) {
      console.error('使用现有文件创建版本失败:', error);
      throw error;
    }
  }
}

// 导出单例实例
export const enhancedDatasetService = EnhancedDatasetService; 