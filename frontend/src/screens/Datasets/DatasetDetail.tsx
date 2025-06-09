import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { DataPreview } from '../../components/DataPreview/DataPreview';
import { VersionManager } from '../../components/DatasetVersions/VersionManager';
import { enhancedDatasetService } from '../../services/enhanced-dataset.service';
import { datasetService } from '../../services/dataset.service';
import { 
  DatasetPreview, 
  EnhancedDatasetVersion 
} from '../../types/enhanced-dataset';
import { Dataset } from '../../types/dataset';
import {
  ArrowLeftIcon,
  DatabaseIcon,
  DownloadIcon,
  HeartIcon,
  GitBranchIcon,
  TagIcon,
  CalendarIcon,
  HardDriveIcon,
  Loader2Icon,
  AlertCircleIcon,
  UserIcon,
  FileText,
  Calendar,
  User,
  Download,
  Eye,
  Settings,
  Info
} from 'lucide-react';

export const DatasetDetailScreen = (): JSX.Element => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [previewData, setPreviewData] = useState<DatasetPreview | null>(null);
  const [currentVersion, setCurrentVersion] = useState<EnhancedDatasetVersion | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('preview');
  const [error, setError] = useState<string | null>(null);

  // 获取数据集详情
  const fetchDatasetDetail = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      setError(null);
      const [datasetInfo, preview] = await Promise.all([
        datasetService.getDatasetById(id),
        enhancedDatasetService.getDatasetPreview(parseInt(id))
      ]);
      setDataset(datasetInfo);
      setPreviewData(preview);
      setCurrentVersion(preview.version);
    } catch (err) {
      console.error('获取数据集详情失败:', err);
      setError(err instanceof Error ? err.message : t('datasets.error'));
    } finally {
      setLoading(false);
    }
  };

  // 处理版本切换
  const handleVersionChange = async (versionId: string) => {
    if (!id) return;
    
    try {
      const newPreviewData = await enhancedDatasetService.getDatasetPreview(
        parseInt(id),
        versionId
      );
      setPreviewData(newPreviewData);
      setCurrentVersion(newPreviewData.version);
    } catch (err) {
      console.error('版本切换失败:', err);
      setError(err instanceof Error ? err.message : t('datasets.error'));
    }
  };

  // 处理数据变更（文件上传、删除等）
  const handleDataChange = () => {
    // 重新获取当前版本的数据
    if (currentVersion) {
      handleVersionChange(currentVersion.id);
    } else {
      fetchDatasetDetail();
    }
  };

  // 处理点赞
  const handleLike = async () => {
    if (!dataset) return;
    
    try {
      const response = await datasetService.likeDataset(dataset.id);
      setDataset(prev => prev ? { ...prev, likes: response.likes } : null);
    } catch (err) {
      console.error('点赞失败:', err);
    }
  };

  // 处理下载
  const handleDownload = async () => {
    if (!dataset) return;
    
    try {
      const response = await datasetService.downloadDataset(dataset.id);
      setDataset(prev => prev ? { ...prev, downloads: response.downloads } : null);
      
      if (response.download_url) {
        window.open(response.download_url, '_blank');
      }
    } catch (err) {
      console.error('下载失败:', err);
    }
  };

  // 格式化数字
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
  };

  // 获取任务类型颜色
  const getTaskTypeColor = (taskType: string): string => {
    const colors: { [key: string]: string } = {
      'Natural Language Processing': 'bg-blue-100 text-blue-800',
      'Question Answering': 'bg-green-100 text-green-800',
      'Text Classification': 'bg-purple-100 text-purple-800',
      'Computer Vision': 'bg-orange-100 text-orange-800',
      'Code Generation': 'bg-indigo-100 text-indigo-800',
      'Audio': 'bg-pink-100 text-pink-800'
    };
    return colors[taskType] || 'bg-gray-100 text-gray-800';
  };

  useEffect(() => {
    fetchDatasetDetail();
  }, [id]);

  if (loading) {
    return (
      <div className="w-full max-w-[1200px] p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2Icon className="w-8 h-8 animate-spin text-[#1977e5]" />
          <span className="ml-2 text-[#4f7096]">{t('datasets.loading')}</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-[1200px] p-6">
        <div className="flex items-center justify-center py-12">
          <AlertCircleIcon className="w-6 h-6 text-red-500 mr-2" />
          <span className="text-red-600">{error}</span>
          <Button 
            variant="outline" 
            className="ml-4"
            onClick={fetchDatasetDetail}
          >
            {t('datasets.retry')}
          </Button>
        </div>
      </div>
    );
  }

  if (!dataset || !previewData) {
    return (
      <div className="w-full max-w-[1200px] p-6">
        <div className="flex items-center justify-center py-12">
          <span className="text-[#4f7096]">{t('datasets.noDatasets')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link to="/datasets">
          <Button variant="outline" size="sm">
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            {t('datasets.detail.backToList')}
          </Button>
        </Link>
        <div className="flex items-center gap-3">
          <DatabaseIcon className="w-6 h-6 text-[#1977e5]" />
          <h1 className="text-[28px] font-bold leading-8 text-[#0c141c]">
            {dataset.owner}/{dataset.name}
          </h1>
          {dataset.featured && (
            <Badge className="bg-[#ff6b35] text-white">{t('datasets.recommended')}</Badge>
          )}
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="preview" className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            {t('datasets.detail.dataPreview')}
          </TabsTrigger>
          <TabsTrigger value="versions" className="flex items-center gap-2">
            <GitBranchIcon className="w-4 h-4" />
            {t('datasets.detail.versionManagement')}
          </TabsTrigger>
          <TabsTrigger value="info" className="flex items-center gap-2">
            <Info className="w-4 h-4" />
            {t('datasets.detail.detailInfo')}
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            {t('datasets.detail.settings')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="preview" className="space-y-4">
          <DataPreview 
            data={previewData} 
            onRefresh={() => fetchDatasetDetail()}
            onVersionChange={handleVersionChange}
            onDataChange={handleDataChange}
          />
        </TabsContent>

        <TabsContent value="versions" className="space-y-4">
          <VersionManager
            datasetId={parseInt(id!)}
            currentVersion={currentVersion || undefined}
            onVersionChange={(newVersion) => {
              setCurrentVersion(newVersion);
              // 同步更新预览数据
              handleVersionChange(newVersion.id);
            }}
          />
        </TabsContent>

        <TabsContent value="info" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">{t('datasets.detail.detailInfo')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-600">{t('datasets.detail.datasetId')}</label>
                  <p className="mt-1">{dataset.id}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">{t('datasets.detail.name')}</label>
                  <p className="mt-1">{dataset.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">{t('datasets.detail.status')}</label>
                  <p className="mt-1">
                    <Badge variant="default">
                      {t('datasets.detail.published')}
                    </Badge>
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">{t('datasets.detail.createdAt')}</label>
                  <p className="mt-1">{dataset.created_at ? new Date(dataset.created_at).toLocaleString('zh-CN') : dataset.created}</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-600">{t('datasets.detail.currentVersion')}</label>
                  <p className="mt-1">{currentVersion?.version || t('datasets.detail.noVersion')}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">{t('datasets.detail.versionType')}</label>
                  <p className="mt-1">
                    {currentVersion && (
                      <Badge variant="outline">
                        {currentVersion.version_type}
                      </Badge>
                    )}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">{t('datasets.detail.fileCount')}</label>
                  <p className="mt-1">{currentVersion?.file_count || 0} {t('datasets.detail.files')}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">{t('datasets.detail.totalSize')}</label>
                  <p className="mt-1">{currentVersion?.total_size_formatted || '0B'}</p>
                </div>
              </div>
            </div>

            {dataset.description && (
              <div className="mt-6">
                <label className="text-sm font-medium text-gray-600">{t('datasets.detail.description')}</label>
                <p className="mt-2 text-gray-700">{dataset.description}</p>
              </div>
            )}

            {currentVersion && (
              <div className="mt-6">
                <label className="text-sm font-medium text-gray-600">{t('datasets.detail.versionInfo')}</label>
                <div className="mt-2 p-4 bg-gray-50 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">{t('datasets.detail.commitHash')}:</span>
                      <span className="ml-2 font-mono">{currentVersion.commit_hash}</span>
                    </div>
                    <div>
                      <span className="font-medium">{t('datasets.detail.author')}:</span>
                      <span className="ml-2">{currentVersion.author}</span>
                    </div>
                    <div className="md:col-span-2">
                      <span className="font-medium">{t('datasets.detail.commitMessage')}:</span>
                      <span className="ml-2">{currentVersion.commit_message}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">{t('datasets.detail.settings')}</h3>
            <div className="text-gray-500">
              {t('datasets.detail.settingsInDevelopment')}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}; 