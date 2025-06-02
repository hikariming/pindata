import { apiClient } from '../lib/api-client';
import { ApiResponse, PaginatedResponse } from '../types/api';
import {
  LLMConfig,
  CreateLLMConfigRequest,
  UpdateLLMConfigRequest,
  LLMConfigQueryParams,
  SetDefaultConfigRequest,
  TestConfigResponse,
} from '../types/llm';

export class LLMService {
  /**
   * 获取LLM配置列表
   */
  static async getConfigs(params?: LLMConfigQueryParams): Promise<{
    configs: LLMConfig[];
    pagination: PaginatedResponse<LLMConfig>['pagination'];
  }> {
    const response = await apiClient.get<{
      success: boolean;
      data: {
        configs: LLMConfig[];
        pagination: PaginatedResponse<LLMConfig>['pagination'];
      };
    }>('/api/v1/llm/configs', params);
    
    return {
      configs: response.data?.configs || [],
      pagination: response.data?.pagination || {
        page: 1,
        per_page: 20,
        total: 0,
        total_pages: 0,
        has_next: false,
        has_prev: false,
      },
    };
  }

  /**
   * 获取单个LLM配置
   */
  static async getConfigById(id: string): Promise<LLMConfig> {
    const response = await apiClient.get<{
      success: boolean;
      data: LLMConfig;
    }>(`/api/v1/llm/configs/${id}`);
    return response.data!;
  }

  /**
   * 创建LLM配置
   */
  static async createConfig(data: CreateLLMConfigRequest): Promise<LLMConfig> {
    const response = await apiClient.post<{
      success: boolean;
      data: LLMConfig;
      message: string;
    }>('/api/v1/llm/configs', data);
    return response.data!;
  }

  /**
   * 更新LLM配置
   */
  static async updateConfig(id: string, data: UpdateLLMConfigRequest): Promise<LLMConfig> {
    const response = await apiClient.put<{
      success: boolean;
      data: LLMConfig;
      message: string;
    }>(`/api/v1/llm/configs/${id}`, data);
    return response.data!;
  }

  /**
   * 删除LLM配置
   */
  static async deleteConfig(id: string): Promise<void> {
    await apiClient.delete<{
      success: boolean;
      message: string;
    }>(`/api/v1/llm/configs/${id}`);
  }

  /**
   * 设置默认配置
   */
  static async setDefaultConfig(configId: string): Promise<LLMConfig> {
    const response = await apiClient.post<{
      success: boolean;
      data: LLMConfig;
      message: string;
    }>('/api/v1/llm/configs/set-default', { config_id: configId });
    return response.data!;
  }

  /**
   * 测试配置连接
   */
  static async testConfig(id: string): Promise<TestConfigResponse> {
    const response = await apiClient.post<{
      success: boolean;
      data: TestConfigResponse;
      message: string;
    }>(`/api/v1/llm/configs/${id}/test`);
    return response.data!;
  }
}

// 导出单例实例
export const llmService = LLMService; 