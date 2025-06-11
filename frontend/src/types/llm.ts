import { ApiResponse, PaginatedResponse } from './api';

export type ProviderType = 'openai' | 'claude' | 'gemini' | 'custom';

export interface LLMConfig {
  id: string;
  name: string;
  provider: ProviderType;
  model_name: string;
  api_key: string; // 脱敏后的API密钥
  base_url?: string;
  temperature: number;
  max_tokens: number;
  supports_vision: boolean;
  is_active: boolean;
  is_default: boolean;
  custom_headers?: Record<string, string>;
  provider_config?: Record<string, any>;
  usage_count: number;
  total_tokens_used: number;
  last_used_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateLLMConfigRequest {
  name: string;
  provider: ProviderType;
  model_name: string;
  api_key: string;
  base_url?: string;
  temperature?: number;
  max_tokens?: number;
  supports_vision?: boolean;
  is_active?: boolean;
  custom_headers?: Record<string, string>;
  provider_config?: Record<string, any>;
}

export interface UpdateLLMConfigRequest {
  name?: string;
  provider?: ProviderType;
  model_name?: string;
  api_key?: string;
  base_url?: string;
  temperature?: number;
  max_tokens?: number;
  supports_vision?: boolean;
  is_active?: boolean;
  custom_headers?: Record<string, string>;
  provider_config?: Record<string, any>;
}

export interface LLMConfigQueryParams {
  page?: number;
  per_page?: number;
  provider?: ProviderType;
  is_active?: boolean;
  supports_vision?: boolean;
  search?: string;
}

export interface SetDefaultConfigRequest {
  config_id: string;
}

export interface TestConfigResponse {
  latency: number;
  status: string;
  model_info?: {
    model: string;
    provider: string;
    response_preview?: string;
  };
  test_time?: string;
  error_detail?: string;
}

export interface ModelProvider {
  id: string;
  name: string;
  type: ProviderType;
  icon: string;
  baseUrl?: string;
  models: string[];
} 