import { useState, useEffect, useCallback } from 'react';
import { llmService } from '../services/llm.service';
import {
  LLMConfig,
  CreateLLMConfigRequest,
  UpdateLLMConfigRequest,
  LLMConfigQueryParams,
} from '../types/llm';

interface UseLLMConfigsReturn {
  configs: LLMConfig[];
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
  // Actions
  fetchConfigs: (params?: LLMConfigQueryParams) => Promise<void>;
  createConfig: (data: CreateLLMConfigRequest) => Promise<LLMConfig>;
  updateConfig: (id: string, data: UpdateLLMConfigRequest) => Promise<LLMConfig>;
  deleteConfig: (id: string) => Promise<void>;
  setDefaultConfig: (id: string) => Promise<LLMConfig>;
  testConfig: (id: string) => Promise<{ latency: number; status: string }>;
  refreshConfigs: () => Promise<void>;
}

export const useLLMConfigs = (initialParams?: LLMConfigQueryParams): UseLLMConfigsReturn => {
  const [configs, setConfigs] = useState<LLMConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentParams, setCurrentParams] = useState<LLMConfigQueryParams>(initialParams || {});
  const [pagination, setPagination] = useState({
    page: 1,
    per_page: 20,
    total: 0,
    total_pages: 0,
    has_next: false,
    has_prev: false,
  });

  const fetchConfigs = useCallback(async (params?: LLMConfigQueryParams) => {
    try {
      setLoading(true);
      setError(null);
      
      const queryParams = { ...currentParams, ...params };
      setCurrentParams(queryParams);
      
      const response = await llmService.getConfigs(queryParams);
      setConfigs(response.configs);
      setPagination(response.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取配置列表失败');
      console.error('Failed to fetch LLM configs:', err);
    } finally {
      setLoading(false);
    }
  }, [currentParams]);

  const createConfig = useCallback(async (data: CreateLLMConfigRequest): Promise<LLMConfig> => {
    try {
      setError(null);
      const newConfig = await llmService.createConfig(data);
      
      // 刷新配置列表
      await fetchConfigs();
      
      return newConfig;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '创建配置失败';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [fetchConfigs]);

  const updateConfig = useCallback(async (id: string, data: UpdateLLMConfigRequest): Promise<LLMConfig> => {
    try {
      setError(null);
      const updatedConfig = await llmService.updateConfig(id, data);
      
      // 更新本地状态
      setConfigs(prev => prev.map(config => 
        config.id === id ? updatedConfig : config
      ));
      
      return updatedConfig;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '更新配置失败';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const deleteConfig = useCallback(async (id: string): Promise<void> => {
    try {
      setError(null);
      await llmService.deleteConfig(id);
      
      // 从本地状态中移除
      setConfigs(prev => prev.filter(config => config.id !== id));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '删除配置失败';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const setDefaultConfig = useCallback(async (id: string): Promise<LLMConfig> => {
    try {
      setError(null);
      const updatedConfig = await llmService.setDefaultConfig(id);
      
      // 更新本地状态：清除所有默认状态，然后设置新的默认配置
      setConfigs(prev => prev.map(config => ({
        ...config,
        is_default: config.id === id
      })));
      
      return updatedConfig;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '设置默认配置失败';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const testConfig = useCallback(async (id: string) => {
    try {
      setError(null);
      return await llmService.testConfig(id);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '测试连接失败';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const refreshConfigs = useCallback(async () => {
    await fetchConfigs();
  }, [fetchConfigs]);

  // 初始加载
  useEffect(() => {
    fetchConfigs();
  }, []);

  return {
    configs,
    loading,
    error,
    pagination,
    fetchConfigs,
    createConfig,
    updateConfig,
    deleteConfig,
    setDefaultConfig,
    testConfig,
    refreshConfigs,
  };
}; 