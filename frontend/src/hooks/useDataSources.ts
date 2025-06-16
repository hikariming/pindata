import { useState, useEffect, useCallback } from 'react';
import { DataSourceService } from '../services/dataSource.service';
import type {
  DataSourceConfig,
  DataSourceConfigListResponse,
  CreateDataSourceConfigRequest,
  ConnectionTestResult
} from '../types/dataSource';

export interface UseDataSourcesResult {
  configs: DataSourceConfig[];
  stats: any;
  pagination: {
    total: number;
    page: number;
    per_page: number;
    pages: number;
  };
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useDataSources(params?: {
  page?: number;
  per_page?: number;
  project_id?: string;
  source_type?: string;
  status?: string;
}): UseDataSourcesResult {
  const [configs, setConfigs] = useState<DataSourceConfig[]>([]);
  const [stats, setStats] = useState<any>({});
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    per_page: 20,
    pages: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConfigs = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response: DataSourceConfigListResponse = await DataSourceService.getDataSourceConfigs(params);
      setConfigs(response.configs);
      setStats(response.stats);
      setPagination({
        total: response.total,
        page: response.page,
        per_page: response.per_page,
        pages: response.pages,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data source configs');
      console.error('Failed to fetch data source configs:', err);
    } finally {
      setLoading(false);
    }
  }, [params?.page, params?.per_page, params?.project_id, params?.source_type, params?.status]);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  return {
    configs,
    stats,
    pagination,
    loading,
    error,
    refresh: fetchConfigs,
  };
}

export interface UseDataSourceActionsResult {
  createConfig: (data: CreateDataSourceConfigRequest) => Promise<DataSourceConfig | null>;
  updateConfig: (configId: string, data: Partial<CreateDataSourceConfigRequest>) => Promise<DataSourceConfig | null>;
  deleteConfig: (configId: string) => Promise<boolean>;
  testConnection: (configId: string) => Promise<ConnectionTestResult | null>;
  syncDataSource: (configId: string) => Promise<boolean>;
  createDatabaseDataSource: (data: {
    data_source_config_id: string;
    project_id?: string;
    name: string;
    description?: string;
  }) => Promise<any>;
  createAPIDataSource: (data: {
    data_source_config_id: string;
    project_id?: string;
    name: string;
    description?: string;
  }) => Promise<any>;
  syncRawData: (dataId: number) => Promise<boolean>;
  loading: boolean;
  error: string | null;
}

export function useDataSourceActions(): UseDataSourceActionsResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createConfig = async (data: CreateDataSourceConfigRequest): Promise<DataSourceConfig | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await DataSourceService.createDataSourceConfig(data);
      return response.config;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create data source config';
      setError(errorMessage);
      console.error('Failed to create data source config:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = async (
    configId: string, 
    data: Partial<CreateDataSourceConfigRequest>
  ): Promise<DataSourceConfig | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await DataSourceService.updateDataSourceConfig(configId, data);
      return response.config;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update data source config';
      setError(errorMessage);
      console.error('Failed to update data source config:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const deleteConfig = async (configId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      await DataSourceService.deleteDataSourceConfig(configId);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete data source config';
      setError(errorMessage);
      console.error('Failed to delete data source config:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async (configId: string): Promise<ConnectionTestResult | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await DataSourceService.testConnection(configId);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to test connection';
      setError(errorMessage);
      console.error('Failed to test connection:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const syncDataSource = async (configId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      await DataSourceService.syncDataSource(configId);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sync data source';
      setError(errorMessage);
      console.error('Failed to sync data source:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const createDatabaseDataSource = async (data: {
    data_source_config_id: string;
    project_id?: string;
    name: string;
    description?: string;
  }): Promise<any> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await DataSourceService.createDatabaseDataSource(data);
      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create database data source';
      setError(errorMessage);
      console.error('Failed to create database data source:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const createAPIDataSource = async (data: {
    data_source_config_id: string;
    project_id?: string;
    name: string;
    description?: string;
  }): Promise<any> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await DataSourceService.createAPIDataSource(data);
      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create API data source';
      setError(errorMessage);
      console.error('Failed to create API data source:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const syncRawData = async (dataId: number): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      await DataSourceService.syncRawData(dataId);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sync raw data';
      setError(errorMessage);
      console.error('Failed to sync raw data:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    createConfig,
    updateConfig,
    deleteConfig,
    testConnection,
    syncDataSource,
    createDatabaseDataSource,
    createAPIDataSource,
    syncRawData,
    loading,
    error,
  };
}