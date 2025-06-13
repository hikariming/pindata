import { apiClient } from '../lib/api-client';
import type {
  DataSourceConfig,
  DataSourceConfigListResponse,
  CreateDataSourceConfigRequest,
  ConnectionTestResult
} from '../types/dataSource';

export class DataSourceService {
  private static baseUrl = '/api/v1/data-source-configs';

  /**
   * 获取数据源配置列表
   */
  static async getDataSourceConfigs(params?: {
    page?: number;
    per_page?: number;
    project_id?: string;
    source_type?: string;
    status?: string;
  }): Promise<DataSourceConfigListResponse> {
    const searchParams = new URLSearchParams();
    
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.per_page) searchParams.set('per_page', params.per_page.toString());
    if (params?.project_id) searchParams.set('project_id', params.project_id);
    if (params?.source_type) searchParams.set('source_type', params.source_type);
    if (params?.status) searchParams.set('status', params.status);

    const url = searchParams.toString() ? `${this.baseUrl}?${searchParams}` : this.baseUrl;
    const response = await apiClient.get(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch data source configs: ${response.statusText}`);
    }
    
    return response.json();
  }

  /**
   * 获取单个数据源配置详情
   */
  static async getDataSourceConfig(configId: string): Promise<DataSourceConfig> {
    const response = await apiClient.get(`${this.baseUrl}/${configId}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch data source config: ${response.statusText}`);
    }
    
    return response.json();
  }

  /**
   * 创建数据源配置
   */
  static async createDataSourceConfig(data: CreateDataSourceConfigRequest): Promise<{
    message: string;
    config: DataSourceConfig;
  }> {
    const response = await apiClient.post(this.baseUrl, data);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create data source config');
    }
    
    return response.json();
  }

  /**
   * 更新数据源配置
   */
  static async updateDataSourceConfig(
    configId: string, 
    data: Partial<CreateDataSourceConfigRequest>
  ): Promise<{
    message: string;
    config: DataSourceConfig;
  }> {
    const response = await apiClient.put(`${this.baseUrl}/${configId}`, data);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update data source config');
    }
    
    return response.json();
  }

  /**
   * 测试数据源连接
   */
  static async testConnection(configId: string): Promise<ConnectionTestResult> {
    const response = await apiClient.post(`${this.baseUrl}/${configId}/test`);
    
    if (!response.ok) {
      const error = await response.json();
      // 连接测试失败时，仍然返回测试结果
      if (response.status === 400) {
        return error;
      }
      throw new Error(error.error || 'Failed to test connection');
    }
    
    return response.json();
  }

  /**
   * 同步数据源数据
   */
  static async syncDataSource(configId: string): Promise<{
    message: string;
    config_id: string;
    sync_started_at: string;
  }> {
    const response = await apiClient.post(`${this.baseUrl}/${configId}/sync`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to sync data source');
    }
    
    return response.json();
  }

  /**
   * 删除数据源配置
   */
  static async deleteDataSourceConfig(configId: string): Promise<{ message: string }> {
    const response = await apiClient.delete(`${this.baseUrl}/${configId}`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete data source config');
    }
    
    return response.json();
  }

  /**
   * 创建数据库数据源
   */
  static async createDatabaseDataSource(data: {
    data_source_config_id: string;
    project_id?: string;
    name: string;
    description?: string;
  }): Promise<{
    message: string;
    data: any;
  }> {
    const response = await apiClient.post('/api/v1/raw-data/create-database-source', data);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create database data source');
    }
    
    return response.json();
  }

  /**
   * 创建API数据源
   */
  static async createAPIDataSource(data: {
    data_source_config_id: string;
    project_id?: string;
    name: string;
    description?: string;
  }): Promise<{
    message: string;
    data: any;
  }> {
    const response = await apiClient.post('/api/v1/raw-data/create-api-source', data);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create API data source');
    }
    
    return response.json();
  }

  /**
   * 同步原始数据
   */
  static async syncRawData(dataId: number): Promise<{
    message: string;
    data_id: number;
    status: string;
  }> {
    const response = await apiClient.post(`/api/v1/raw-data/${dataId}/sync`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to sync raw data');
    }
    
    return response.json();
  }
}