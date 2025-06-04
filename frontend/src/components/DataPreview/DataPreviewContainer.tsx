import React, { useState, useEffect } from 'react';
import { DataPreview } from './DataPreview';
import { enhancedDatasetService } from '../../services/enhanced-dataset.service';
import { DatasetPreview as DatasetPreviewType } from '../../types/enhanced-dataset';
import { Loader2, AlertCircle, Info } from 'lucide-react';

interface DataPreviewContainerProps {
  datasetId: number;
  initialVersionId?: string;
  onError?: (error: Error) => void;
}

export const DataPreviewContainer: React.FC<DataPreviewContainerProps> = ({
  datasetId,
  initialVersionId,
  onError
}) => {
  const [currentData, setCurrentData] = useState<DatasetPreviewType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 加载数据预览
  const loadData = async (versionId?: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const data = await enhancedDatasetService.getDatasetPreview(
        datasetId,
        versionId || initialVersionId
      );
      
      setCurrentData(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '加载数据失败';
      setError(errorMessage);
      onError?.(err instanceof Error ? err : new Error(errorMessage));
    } finally {
      setIsLoading(false);
    }
  };

  // 处理版本切换
  const handleVersionChange = async (versionId: string) => {
    await loadData(versionId);
  };

  // 处理数据刷新
  const handleRefresh = () => {
    loadData(currentData?.version?.id);
  };

  // 处理数据变更（文件上传、删除等）
  const handleDataChange = () => {
    loadData(currentData?.version?.id);
  };

  // 初始加载
  useEffect(() => {
    if (datasetId) {
      loadData();
    }
  }, [datasetId, initialVersionId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        <span>加载数据预览中...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md">
        <div className="flex items-center">
          <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
          <span className="text-red-700">{error}</span>
        </div>
      </div>
    );
  }

  if (!currentData) {
    return (
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
        <div className="flex items-center">
          <Info className="w-5 h-5 text-blue-500 mr-2" />
          <span className="text-blue-700">暂无数据可预览</span>
        </div>
      </div>
    );
  }

  return (
    <DataPreview
      data={currentData}
      onVersionChange={handleVersionChange}
      onRefresh={handleRefresh}
      onDataChange={handleDataChange}
    />
  );
}; 