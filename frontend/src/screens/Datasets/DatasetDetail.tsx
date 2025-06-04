import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
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
  UserIcon
} from 'lucide-react';

import { DatasetDetail } from '../../types/dataset';
import { datasetService } from '../../services/dataset.service';

export const DatasetDetailScreen = (): JSX.Element => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [dataset, setDataset] = useState<DatasetDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 获取数据集详情
  const fetchDatasetDetail = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      setError(null);
      const data = await datasetService.getDatasetById(id);
      setDataset(data);
    } catch (err) {
      console.error('获取数据集详情失败:', err);
      setError(err instanceof Error ? err.message : '获取数据集详情失败');
    } finally {
      setLoading(false);
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
          <span className="ml-2 text-[#4f7096]">加载中...</span>
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
            重试
          </Button>
        </div>
      </div>
    );
  }

  if (!dataset) {
    return (
      <div className="w-full max-w-[1200px] p-6">
        <div className="flex items-center justify-center py-12">
          <span className="text-[#4f7096]">数据集不存在</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1200px] p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link to="/datasets">
          <Button variant="outline" size="sm">
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            返回列表
          </Button>
        </Link>
        <div className="flex items-center gap-3">
          <DatabaseIcon className="w-6 h-6 text-[#1977e5]" />
          <h1 className="text-[28px] font-bold leading-8 text-[#0c141c]">
            {dataset.owner}/{dataset.name}
          </h1>
          {dataset.featured && (
            <Badge className="bg-[#ff6b35] text-white">推荐</Badge>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-3">描述</h2>
            <p className="text-[#4f7096] leading-relaxed">
              {dataset.description || '暂无描述'}
            </p>
          </Card>

          {/* Tags */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-3">标签</h2>
            <div className="flex flex-wrap gap-2">
              <Badge className={getTaskTypeColor(dataset.taskType)}>
                {dataset.taskType}
              </Badge>
              {dataset.tags.map((tag) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>
          </Card>

          {/* Versions */}
          {dataset.version_list && dataset.version_list.length > 0 && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-3">版本历史</h2>
              <div className="space-y-3">
                {dataset.version_list.map((version) => (
                  <div key={version.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <span className="font-medium">{version.version}</span>
                      <span className="text-sm text-[#4f7096] ml-2">
                        {new Date(version.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <Button size="sm" variant="outline">
                      下载
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Actions */}
          <Card className="p-6">
            <div className="space-y-3">
              <Button 
                className="w-full bg-[#1977e5] hover:bg-[#1565c0]"
                onClick={handleDownload}
              >
                <DownloadIcon className="w-4 h-4 mr-2" />
                下载数据集
              </Button>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={handleLike}
              >
                <HeartIcon className="w-4 h-4 mr-2" />
                点赞
              </Button>
            </div>
          </Card>

          {/* Stats */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4">统计信息</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DownloadIcon className="w-4 h-4 text-[#4f7096]" />
                  <span className="text-sm">下载量</span>
                </div>
                <span className="font-medium">{formatNumber(dataset.downloads)}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HeartIcon className="w-4 h-4 text-[#4f7096]" />
                  <span className="text-sm">点赞数</span>
                </div>
                <span className="font-medium">{dataset.likes}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GitBranchIcon className="w-4 h-4 text-[#4f7096]" />
                  <span className="text-sm">版本数</span>
                </div>
                <span className="font-medium">{dataset.versions}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HardDriveIcon className="w-4 h-4 text-[#4f7096]" />
                  <span className="text-sm">大小</span>
                </div>
                <span className="font-medium">{dataset.size}</span>
              </div>
            </div>
          </Card>

          {/* Meta Info */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4">详细信息</h3>
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <UserIcon className="w-4 h-4 text-[#4f7096]" />
                  <span className="text-sm">拥有者</span>
                </div>
                <span className="font-medium text-right">{dataset.owner}</span>
              </div>
              {dataset.license && (
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <TagIcon className="w-4 h-4 text-[#4f7096]" />
                    <span className="text-sm">许可证</span>
                  </div>
                  <span className="font-medium text-right">{dataset.license}</span>
                </div>
              )}
              {dataset.language && (
                <div className="flex items-start justify-between">
                  <span className="text-sm">语言</span>
                  <span className="font-medium text-right">{dataset.language}</span>
                </div>
              )}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-[#4f7096]" />
                  <span className="text-sm">创建时间</span>
                </div>
                <span className="font-medium text-right">{dataset.created}</span>
              </div>
              <div className="flex items-start justify-between">
                <span className="text-sm">最后更新</span>
                <span className="font-medium text-right">{dataset.lastUpdated}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}; 