import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useProject } from '../../../hooks/useDataGovernance';
import {
  ArrowLeftIcon,
  SettingsIcon,
  ShareIcon,
  MoreVerticalIcon,
  PlayIcon,
  PauseIcon,
  RefreshCwIcon,
  TrendingUpIcon,
  DatabaseIcon,
  UsersIcon,
  CalendarIcon,
  ActivityIcon,
  BarChart3Icon,
  FileTextIcon,
  GitBranchIcon,
  AlertCircleIcon,
  CheckCircleIcon,
  ClockIcon,
  LoaderIcon,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Tabs } from '../../../components/ui/tabs';
import { DataPipelineVisualization } from '../components/DataPipelineVisualization';
import { TeamManagement } from '../components/TeamManagement';
import { 
  DataGovernanceProject, 
  GovernedData, 
  KnowledgeItem, 
  DataQualityAssessment,
  DataFlow,
  ProcessingStatus 
} from '../types';

import { RawDataTab } from './RawDataTab';
import { GovernedDataTab } from './GovernedDataTab';
import { KnowledgeTab } from './KnowledgeTab';
import { DatasetsTab } from './DatasetsTab';
import { AnalyticsTab } from './AnalyticsTab';

export const ProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('raw-data');
  
  // Use the real API hook
  const { project, loading, error, refetch } = useProject(id || '', !!id);

  const formatDataSize = (bytes: number): string => {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'success' | 'outline' | 'destructive'; color: string; icon: any }> = {
      active: { label: '进行中', variant: 'default' as const, color: 'bg-green-100 text-green-800', icon: PlayIcon },
      draft: { label: '草稿', variant: 'secondary' as const, color: 'bg-gray-100 text-gray-800', icon: FileTextIcon },
      completed: { label: '已完成', variant: 'success' as const, color: 'bg-blue-100 text-blue-800', icon: CheckCircleIcon },
      archived: { label: '已归档', variant: 'outline' as const, color: 'bg-purple-100 text-purple-800', icon: PauseIcon },
      running: { label: '运行中', variant: 'default' as const, color: 'bg-blue-100 text-blue-800', icon: LoaderIcon },
      pending: { label: '待处理', variant: 'secondary' as const, color: 'bg-yellow-100 text-yellow-800', icon: ClockIcon },
      failed: { label: '失败', variant: 'destructive' as const, color: 'bg-red-100 text-red-800', icon: AlertCircleIcon },
    };
    
    const config = statusConfig[status] || statusConfig.draft;
    const Icon = config.icon;
    
    return (
      <Badge className={config.color}>
        <Icon size={12} className="mr-1" />
        {config.label}
      </Badge>
    );
  };

  const handleRunPipeline = async () => {
    // TODO: Implement pipeline run API call
    console.log('Running pipeline for project:', id);
  };

  const handlePausePipeline = () => {
    // TODO: Implement pipeline pause API call
    console.log('Pausing pipeline for project:', id);
  };

  const handleRefreshData = () => {
    refetch();
  };

  // Handle loading and error states
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <LoaderIcon className="animate-spin" size={24} />
          <span className="text-lg">加载中...</span>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircleIcon className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">加载失败</h3>
          <p className="text-gray-600 mb-4">{error || '项目不存在'}</p>
          <Button onClick={() => navigate('/governance')}>
            返回项目列表
          </Button>
        </div>
      </div>
    );
  }

  const statusConfig = getStatusBadge(project.status);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* 页面头部 */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/governance')}
              className="p-2"
            >
              <ArrowLeftIcon size={20} />
            </Button>
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-2">
                <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
                {statusConfig}
              </div>
              <p className="text-gray-600 text-lg leading-relaxed max-w-4xl">
                {project.description}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline">
                <ShareIcon size={16} className="mr-2" />
                分享
              </Button>
              <Button variant="outline">
                <SettingsIcon size={16} className="mr-2" />
                设置
              </Button>
              <Button variant="outline" size="sm">
                <MoreVerticalIcon size={16} />
              </Button>
            </div>
          </div>

          {/* 项目快速操作 */}
          <div className="flex items-center gap-4 mb-4">
            <Button 
              className="bg-green-500 hover:bg-green-600"
              onClick={handleRunPipeline}
              disabled={loading}
            >
              {loading ? (
                <LoaderIcon size={16} className="mr-2 animate-spin" />
              ) : (
                <PlayIcon size={16} className="mr-2" />
              )}
              运行管道
            </Button>
            <Button variant="outline" onClick={handlePausePipeline}>
              <PauseIcon size={16} className="mr-2" />
              暂停处理
            </Button>
            <Button variant="outline" onClick={handleRefreshData}>
              <RefreshCwIcon size={16} className="mr-2" />
              刷新数据
            </Button>
          </div>

          {/* 实时处理状态 */}
          {project.pipeline && project.pipeline.length > 0 && (
            <Card className="p-4 mb-6 bg-white/80 backdrop-blur-sm">
              <h3 className="text-sm font-medium text-gray-700 mb-3">处理进度</h3>
              <div className="grid grid-cols-3 gap-4">
                {project.pipeline.map((stage, index) => (
                  <div key={stage.id} className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      {getStatusBadge(stage.status)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{stage.name}</span>
                        <span>{Math.round((stage.outputCount || 0) / (stage.inputCount || 1) * 100)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                        <div 
                          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.round((stage.outputCount || 0) / (stage.inputCount || 1) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* 项目指标总览 */}
        <div className="grid grid-cols-6 gap-3 mb-6">
          <Card className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <div className="flex items-center justify-between mb-1">
              <span className="text-blue-100 text-xs">数据总量</span>
              <DatabaseIcon size={14} className="text-blue-200" />
            </div>
            <p className="text-lg font-bold">{formatDataSize(project.metrics?.totalDataSize || 0)}</p>
            <p className="text-blue-100 text-xs">
              {project.metrics?.processedFiles || 0}/{project.metrics?.totalFiles || 0} 文件
            </p>
          </Card>

          <Card className="p-3 bg-gradient-to-r from-green-500 to-green-600 text-white">
            <div className="flex items-center justify-between mb-1">
              <span className="text-green-100 text-xs">数据质量</span>
              <BarChart3Icon size={14} className="text-green-200" />
            </div>
            <p className="text-lg font-bold">{project.metrics?.dataQualityScore || 0}%</p>
            <p className="text-green-100 text-xs">质量评分</p>
          </Card>

          <Card className="p-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <div className="flex items-center justify-between mb-1">
              <span className="text-purple-100 text-xs">处理进度</span>
              <TrendingUpIcon size={14} className="text-purple-200" />
            </div>
            <p className="text-lg font-bold">{project.metrics?.processingProgress || 0}%</p>
            <p className="text-purple-100 text-xs">已完成</p>
          </Card>

          <Card className="p-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white">
            <div className="flex items-center justify-between mb-1">
              <span className="text-orange-100 text-xs">团队规模</span>
              <UsersIcon size={14} className="text-orange-200" />
            </div>
            <p className="text-lg font-bold">{project.team?.length || 0}</p>
            <p className="text-orange-100 text-xs">成员</p>
          </Card>

          <Card className="p-3 bg-gradient-to-r from-teal-500 to-teal-600 text-white">
            <div className="flex items-center justify-between mb-1">
              <span className="text-teal-100 text-xs">数据源</span>
              <GitBranchIcon size={14} className="text-teal-200" />
            </div>
            <p className="text-lg font-bold">{project.dataSource?.length || 0}</p>
            <p className="text-teal-100 text-xs">已连接</p>
          </Card>

          <Card className="p-3 bg-gradient-to-r from-pink-500 to-pink-600 text-white">
            <div className="flex items-center justify-between mb-1">
              <span className="text-pink-100 text-xs">最后更新</span>
              <CalendarIcon size={14} className="text-pink-200" />
            </div>
            <p className="text-base font-bold">
              {project.metrics?.lastProcessedAt ? formatDate(project.metrics.lastProcessedAt).split(' ')[0] : '--'}
            </p>
            <p className="text-pink-100 text-xs">
              {project.metrics?.lastProcessedAt ? formatDate(project.metrics.lastProcessedAt).split(' ')[1] : '--'}
            </p>
          </Card>
        </div>

        {/* 标签页内容 */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="border-b border-gray-200 mb-6">
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveTab('raw-data')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'raw-data'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                原始数据
              </button>
              <button
                onClick={() => setActiveTab('governed-data')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'governed-data'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                治理后数据
              </button>
              <button
                onClick={() => setActiveTab('knowledge')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'knowledge'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                知识
              </button>
              <button
                onClick={() => setActiveTab('datasets')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'datasets'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                数据集
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'analytics'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                数据分析
              </button>
            </nav>
          </div>

          <div className="tab-content">
            {activeTab === 'raw-data' && <RawDataTab projectId={id || ''} />}
            {activeTab === 'governed-data' && <GovernedDataTab project={project} />}
            {activeTab === 'knowledge' && <KnowledgeTab project={project} />}
            {activeTab === 'datasets' && <DatasetsTab project={project} />}
            {activeTab === 'analytics' && <AnalyticsTab project={project} />}
          </div>
        </Tabs>
      </div>
    </div>
  );
}; 