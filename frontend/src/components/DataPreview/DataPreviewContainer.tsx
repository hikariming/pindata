import React, { useState, useEffect, useRef } from 'react';
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
  const [isVersionChanging, setIsVersionChanging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 版本数据缓存，避免重复请求
  const [versionCache, setVersionCache] = useState<Map<string, DatasetPreviewType>>(new Map());
  
  // 防止重复请求的引用
  const currentRequestRef = useRef<AbortController | null>(null);
  const lastRequestedVersionRef = useRef<string | null>(null);

  // 加载数据预览
  const loadData = async (versionId?: string, isVersionChange = false) => {
    const targetVersionId = versionId || initialVersionId || 'default';
    
    // 防止重复请求相同版本
    if (lastRequestedVersionRef.current === targetVersionId && !isVersionChange) {
      return;
    }
    
    // 检查缓存 - 只有明确的版本ID才使用缓存
    if (versionId && versionCache.has(versionId)) {
      const cachedData = versionCache.get(versionId)!;
      setCurrentData(cachedData);
      if (isVersionChange) {
        setIsVersionChanging(false);
      } else {
        setIsLoading(false);
      }
      return;
    }
    
    // 取消之前的请求
    if (currentRequestRef.current) {
      currentRequestRef.current.abort();
    }
    
    // 创建新的请求控制器
    const abortController = new AbortController();
    currentRequestRef.current = abortController;
    lastRequestedVersionRef.current = targetVersionId;

    try {
      if (isVersionChange) {
        setIsVersionChanging(true);
      } else {
        setIsLoading(true);
      }
      setError(null);
      
      const data = await enhancedDatasetService.getDatasetPreview(
        datasetId,
        versionId || initialVersionId
      );
      
      // 检查请求是否被取消
      if (abortController.signal.aborted) {
        return;
      }
      
      setCurrentData(data);
      
      // 缓存数据 - 只有当有明确版本ID时才缓存
      if (data.version?.id) {
        setVersionCache(prev => {
          const newCache = new Map(prev);
          if (newCache.size >= 10) {
            // 删除最旧的缓存项
            const firstKey = newCache.keys().next().value;
            newCache.delete(firstKey);
          }
          newCache.set(data.version!.id, data);
          return newCache;
        });
      }
      
    } catch (err) {
      // 如果是因为请求被取消，不处理错误
      if (abortController.signal.aborted) {
        return;
      }
      
      const errorMessage = err instanceof Error ? err.message : '加载数据失败';
      setError(errorMessage);
      onError?.(err instanceof Error ? err : new Error(errorMessage));
    } finally {
      if (!abortController.signal.aborted) {
        if (isVersionChange) {
          setIsVersionChanging(false);
        } else {
          setIsLoading(false);
        }
        currentRequestRef.current = null;
      }
    }
  };

  // 处理版本切换
  const handleVersionChange = async (versionId: string) => {
    // 如果正在切换版本，忽略新的切换请求
    if (isVersionChanging) {
      return;
    }
    
    // 如果切换到当前版本，直接返回
    if (currentData?.version?.id === versionId) {
      return;
    }
    
    try {
      await loadData(versionId, true);
    } catch (error) {
      console.error('版本切换处理失败:', error);
      // 错误已经在 loadData 中处理了
    }
  };

  // 处理数据刷新 - 清除缓存并重新加载
  const handleRefresh = () => {
    const currentVersionId = currentData?.version?.id;
    // 清除当前版本的缓存
    if (currentVersionId) {
      setVersionCache(prev => {
        const newCache = new Map(prev);
        newCache.delete(currentVersionId);
        return newCache;
      });
    }
    loadData(currentVersionId, false);
  };

  // 处理数据变更（文件上传、删除等） - 清除缓存并重新加载
  const handleDataChange = () => {
    const currentVersionId = currentData?.version?.id;
    // 清除当前版本的缓存，因为数据已经改变
    if (currentVersionId) {
      setVersionCache(prev => {
        const newCache = new Map(prev);
        newCache.delete(currentVersionId);
        return newCache;
      });
    }
    loadData(currentVersionId, false);
  };

  // 清理函数，组件卸载时取消请求
  useEffect(() => {
    return () => {
      if (currentRequestRef.current) {
        currentRequestRef.current.abort();
      }
    };
  }, []);

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
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <span className="text-red-700">{error}</span>
          </div>
          <button
            onClick={() => {
              setError(null);
              loadData(currentData?.version?.id);
            }}
            className="text-red-600 hover:text-red-800 underline text-sm"
          >
            重试
          </button>
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