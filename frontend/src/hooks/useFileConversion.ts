import { useState, useCallback } from 'react';
import { apiClient } from '../lib/api-client';
import { ConversionConfig } from '../screens/RawData/LibraryDetails/components/ConvertToMarkdownDialog';

interface ConvertFilesRequest {
  file_ids: string[];
  conversion_config: ConversionConfig;
}

interface ConversionJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  file_count: number;
  completed_count: number;
  failed_count: number;
  created_at: string;
  updated_at: string;
}

export const useFileConversion = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const convertFiles = useCallback(async (
    libraryId: string,
    fileIds: string[],
    config: ConversionConfig
  ): Promise<ConversionJob | null> => {
    try {
      setLoading(true);
      setError(null);

      const request: ConvertFilesRequest = {
        file_ids: fileIds,
        conversion_config: config,
      };

      const response = await apiClient.post<{
        success: boolean;
        data: ConversionJob;
      }>(`/api/v1/libraries/${libraryId}/files/convert-to-markdown`, request);

      if (response.success && response.data) {
        return response.data;
      } else {
        throw new Error('转换请求失败');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '转换失败';
      setError(errorMessage);
      console.error('Failed to convert files:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getConversionJob = useCallback(async (jobId: string): Promise<ConversionJob | null> => {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: ConversionJob;
      }>(`/api/v1/conversion-jobs/${jobId}`);

      if (response.success && response.data) {
        return response.data;
      } else {
        throw new Error('获取转换任务失败');
      }
    } catch (err) {
      console.error('Failed to get conversion job:', err);
      return null;
    }
  }, []);

  const cancelConversionJob = useCallback(async (jobId: string): Promise<boolean> => {
    try {
      const response = await apiClient.post<{
        success: boolean;
      }>(`/api/v1/conversion-jobs/${jobId}/cancel`);

      return response.success;
    } catch (err) {
      console.error('Failed to cancel conversion job:', err);
      return false;
    }
  }, []);

  return {
    convertFiles,
    getConversionJob,
    cancelConversionJob,
    loading,
    error,
  };
}; 