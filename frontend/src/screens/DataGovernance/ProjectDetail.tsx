import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Tabs } from '../../components/ui/tabs';
import { DataPipelineVisualization } from './components/DataPipelineVisualization';
import { TeamManagement } from './components/TeamManagement';
import { 
  DataGovernanceProject, 
  GovernedData, 
  KnowledgeItem, 
  DataQualityAssessment,
  DataFlow,
  ProcessingStatus 
} from './types';
import { 
  DocumentTextIcon, 
  PhotoIcon, 
  VideoCameraIcon, 
  DocumentIcon,
  TableCellsIcon,
  LinkIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  CloudArrowUpIcon
} from '@heroicons/react/24/outline';
import { 
  FileType, 
  FileCategory, 
  FileProcessingStatus, 
  RawData, 
  RawDataListResponse,
  FilePreview,
  FileMetadata
} from './types';

// Mock data for project detail with enhanced structure
const mockProject: DataGovernanceProject = {
  id: '1',
  name: '客户数据统一治理',
  description: '整合来自多个业务系统的客户数据，建立统一的客户画像，提升数据质量和一致性，为业务决策提供可靠的数据基础。',
  status: 'active',
  owner_id: '1',
  organization_id: '1',
  createdAt: '2024-01-15',
  updatedAt: '2024-06-10',
  owner: {
    id: '1',
    user_id: '1',
    username: 'zhangsan',
    fullName: '张三',
    email: 'zhangsan@company.com',
    role: 'owner',
    status: 'active',
    joinedAt: '2024-01-15',
  },
  team: [
    { id: '1', user_id: '1', username: 'zhangsan', fullName: '张三', email: 'zhangsan@company.com', role: 'owner', status: 'active', joinedAt: '2024-01-15' },
    { id: '2', user_id: '2', username: 'lisi', fullName: '李四', email: 'lisi@company.com', role: 'admin', status: 'active', joinedAt: '2024-01-16' },
    { id: '3', user_id: '3', username: 'wangwu', fullName: '王五', email: 'wangwu@company.com', role: 'editor', status: 'active', joinedAt: '2024-01-20' },
    { id: '4', user_id: '4', username: 'zhaoliu', fullName: '赵六', email: 'zhaoliu@company.com', role: 'viewer', status: 'active', joinedAt: '2024-02-01' },
  ],
  metrics: {
    totalDataSize: 2.5e9, // 2.5GB
    processedFiles: 1250,
    totalFiles: 1500,
    dataQualityScore: 85,
    lastProcessedAt: '2024-06-10T10:30:00Z',
    processingProgress: 83,
  },
  pipeline: [
    {
      id: 'stage-1',
      project_id: '1',
      name: '数据提取',
      type: 'extract',
      stage_order: 1,
      status: 'completed',
      depends_on: [],
      parallel_execution: false,
      config: {},
      inputCount: 1500,
      outputCount: 1450,
      error_count: 50,
      processingTime: 120,
      max_retries: 3,
      retry_count: 0,
      retry_delay: 60,
      created_at: '2024-01-15T08:00:00Z',
      updated_at: '2024-01-15T08:02:00Z',
      started_at: '2024-01-15T08:00:00Z',
      completed_at: '2024-01-15T08:02:00Z',
    },
    {
      id: 'stage-2',
      project_id: '1',
      name: '数据清洗',
      type: 'clean',
      stage_order: 2,
      status: 'running',
      depends_on: ['stage-1'],
      parallel_execution: false,
      config: {},
      inputCount: 1450,
      outputCount: 1250,
      error_count: 0,
      processingTime: 180,
      max_retries: 3,
      retry_count: 0,
      retry_delay: 60,
      created_at: '2024-01-15T08:02:00Z',
      updated_at: '2024-01-15T08:05:00Z',
      started_at: '2024-01-15T08:02:00Z',
    },
  ],
  dataSource: [
    {
      id: '1',
      project_id: '1',
      name: 'CRM数据库',
      description: '客户关系管理系统数据库',
      type: 'database',
      config: { host: 'crm.company.com', database: 'customers' },
      status: 'connected',
      lastSyncAt: '2024-06-10T08:00:00Z',
      sync_frequency: 'daily',
      auto_sync_enabled: true,
      file_count: 800,
      total_size: 1.2e9,
      created_at: '2024-01-15T00:00:00Z',
      updated_at: '2024-06-10T08:00:00Z',
    },
    {
      id: '2',
      project_id: '1',
      name: '营销文档',
      description: '营销部门上传的客户资料文档',
      type: 'upload',
      config: { path: '/uploads/marketing' },
      status: 'connected',
      sync_frequency: 'manual',
      auto_sync_enabled: false,
      file_count: 700,
      total_size: 1.3e9,
      created_at: '2024-01-15T00:00:00Z',
      updated_at: '2024-06-09T15:00:00Z',
    },
  ],
  governedData: [
    {
      id: 'gov-1',
      project_id: '1',
      raw_data_id: 1,
      name: '客户主数据',
      description: '经过清洗和标准化的客户基础信息',
      data_type: 'structured',
      governance_status: 'completed',
      file_size: 800000000,
      quality_score: 95,
      tags: ['客户', '主数据', '已验证'],
      category: '核心数据',
      business_domain: '客户管理',
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-06-10T10:30:00Z',
      processed_at: '2024-06-10T10:30:00Z',
    },
    {
      id: 'gov-2',
      project_id: '1',
      raw_data_id: 2,
      name: '交易流水数据',
      description: '客户交易记录的标准化数据',
      data_type: 'structured',
      governance_status: 'processing',
      file_size: 1200000000,
      quality_score: 88,
      tags: ['交易', '流水', '处理中'],
      category: '交易数据',
      business_domain: '业务分析',
      created_at: '2024-01-16T10:00:00Z',
      updated_at: '2024-06-10T11:00:00Z',
    },
  ],
  knowledgeItems: [
    {
      id: 'knowledge-1',
      project_id: '1',
      governed_data_id: 'gov-1',
      title: '客户数据字典',
      description: '客户相关数据字段的定义和说明',
      content: '包含客户ID、姓名、联系方式等字段的详细定义',
      knowledge_type: 'metadata',
      status: 'published',
      category: '数据字典',
      tags: ['客户', '字典', '元数据'],
      version: '1.0',
      visibility: 'team',
      view_count: 125,
      like_count: 15,
      share_count: 8,
      similarity_threshold: 0.8,
      created_at: '2024-01-20T00:00:00Z',
      updated_at: '2024-06-05T00:00:00Z',
      published_at: '2024-01-20T00:00:00Z',
    },
  ],
  qualityAssessments: [
    {
      id: 'qa-1',
      project_id: '1',
      governed_data_id: 'gov-1',
      assessment_name: '客户数据完整性评估',
      quality_dimension: 'completeness',
      assessment_method: 'ai_powered',
      status: 'completed',
      overall_score: 95,
      dimension_scores: {
        completeness: 95,
        accuracy: 92,
        consistency: 89,
      },
      total_records: 100000,
      processed_records: 100000,
      error_records: 5000,
      llm_model_used: 'gpt-4',
      confidence_score: 0.92,
      version: '1.0',
      created_at: '2024-06-05T00:00:00Z',
      completed_at: '2024-06-05T01:30:00Z',
    },
  ],
};

export const ProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('raw-data');
  const [project, setProject] = useState<DataGovernanceProject>(mockProject);
  const [loading, setLoading] = useState(false);
  const [dataFlow, setDataFlow] = useState<DataFlow>({
    rawDataCount: 1500,
    governedDataCount: 1250,
    knowledgeItemCount: 125,
    qualityScore: 85,
    processingProgress: 83,
  });
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus[]>([
    { stage: '数据提取', progress: 100, status: 'completed', startTime: '2024-06-10T08:00:00Z', endTime: '2024-06-10T08:02:00Z' },
    { stage: '数据清洗', progress: 75, status: 'running', startTime: '2024-06-10T08:02:00Z' },
    { stage: '数据验证', progress: 0, status: 'pending' },
  ]);
  const [rawDataList, setRawDataList] = useState<RawData[]>([]);
  const [rawDataStats, setRawDataStats] = useState<any>(null);
  const [selectedFileCategory, setSelectedFileCategory] = useState<FileCategory | 'all'>('all');
  const [fileSearchTerm, setFileSearchTerm] = useState('');
  const [showFilePreview, setShowFilePreview] = useState(false);
  const [selectedFile, setSelectedFile] = useState<RawData | null>(null);
  const [filePreview, setFilePreview] = useState<FilePreview | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);

  useEffect(() => {
    // 模拟数据加载
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  }, [id]);

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
    setLoading(true);
    // 模拟API调用
    setTimeout(() => {
      setLoading(false);
      // 更新处理状态
      setProcessingStatus(prev => prev.map(stage => 
        stage.stage === '数据验证' 
          ? { ...stage, status: 'running', progress: 10, startTime: new Date().toISOString() }
          : stage
      ));
    }, 2000);
  };

  const handlePausePipeline = () => {
    // 暂停管道处理
    console.log('Pausing pipeline...');
  };

  const handleRefreshData = () => {
    // 刷新数据
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  };

  const statusConfig = getStatusBadge(project.status);

  // 文件类型图标映射
  const getFileTypeIcon = (fileType: FileType, fileCategory: FileCategory) => {
    switch (fileCategory) {
      case 'document':
        switch (fileType) {
          case FileType.DOCUMENT_PDF:
            return <DocumentIcon className="h-5 w-5 text-red-500" />;
          case FileType.DOCUMENT_MD:
          case FileType.DOCUMENT_TXT:
            return <DocumentTextIcon className="h-5 w-5 text-blue-500" />;
          default:
            return <DocumentIcon className="h-5 w-5 text-gray-500" />;
        }
      case 'image':
        return <PhotoIcon className="h-5 w-5 text-green-500" />;
      case 'video':
        return <VideoCameraIcon className="h-5 w-5 text-purple-500" />;
      case 'database':
        return <TableCellsIcon className="h-5 w-5 text-yellow-500" />;
      case 'api':
        return <LinkIcon className="h-5 w-5 text-indigo-500" />;
      default:
        return <DocumentIcon className="h-5 w-5 text-gray-400" />;
    }
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 获取处理状态显示
  const getProcessingStatusDisplay = (status: FileProcessingStatus) => {
    const statusMap = {
      [FileProcessingStatus.PENDING]: { text: '待处理', color: 'gray' },
      [FileProcessingStatus.PROCESSING]: { text: '处理中', color: 'blue' },
      [FileProcessingStatus.ANALYZING]: { text: '分析中', color: 'purple' },
      [FileProcessingStatus.EXTRACTING]: { text: '提取中', color: 'indigo' },
      [FileProcessingStatus.COMPLETED]: { text: '已完成', color: 'green' },
      [FileProcessingStatus.FAILED]: { text: '失败', color: 'red' },
    };
    return statusMap[status] || { text: '未知', color: 'gray' };
  };

  // 获取原始数据列表
  const fetchRawDataList = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        project_id: id,
        page: '1',
        per_page: '50'
      });
      
      if (selectedFileCategory !== 'all') {
        params.append('file_category', selectedFileCategory);
      }
      
      const response = await fetch(`/api/v1/raw-data?${params}`);
      const data: RawDataListResponse = await response.json();
      
      setRawDataList(data.raw_data);
      setRawDataStats(data.stats);
    } catch (error) {
      console.error('获取原始数据列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 文件预览
  const handlePreviewFile = async (file: RawData) => {
    try {
      setSelectedFile(file);
      setShowFilePreview(true);
      
      if (file.is_supported_preview) {
        const response = await fetch(`/api/v1/raw-data/${file.id}/preview`);
        const preview: FilePreview = await response.json();
        setFilePreview(preview);
      }
    } catch (error) {
      console.error('获取文件预览失败:', error);
    }
  };

  // 处理文件上传
  const handleFileUpload = async (files: FileList) => {
    if (!files.length) return;
    
    setLoading(true);
    
    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('project_id', id);
      
      try {
        const response = await fetch('/api/v1/raw-data/upload', {
          method: 'POST',
          body: formData
        });
        
        if (response.ok) {
          await fetchRawDataList(); // 刷新列表
        }
      } catch (error) {
        console.error('文件上传失败:', error);
      }
    }
    
    setLoading(false);
  };

  // 筛选后的文件列表
  const filteredRawData = rawDataList.filter(file => {
    if (fileSearchTerm) {
      return file.filename.toLowerCase().includes(fileSearchTerm.toLowerCase()) ||
             file.original_filename?.toLowerCase().includes(fileSearchTerm.toLowerCase());
    }
    return true;
  });

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
          <Card className="p-4 mb-6 bg-white/80 backdrop-blur-sm">
            <h3 className="text-sm font-medium text-gray-700 mb-3">处理进度</h3>
            <div className="grid grid-cols-3 gap-4">
              {processingStatus.map((stage, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    {getStatusBadge(stage.status)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{stage.stage}</span>
                      <span>{stage.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${stage.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* 项目指标总览 */}
        <div className="grid grid-cols-6 gap-3 mb-6">
          <Card className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <div className="flex items-center justify-between mb-1">
              <span className="text-blue-100 text-xs">数据总量</span>
              <DatabaseIcon size={14} className="text-blue-200" />
            </div>
            <p className="text-lg font-bold">{formatDataSize(project.metrics.totalDataSize)}</p>
            <p className="text-blue-100 text-xs">
              {project.metrics.processedFiles}/{project.metrics.totalFiles} 文件
            </p>
          </Card>

          <Card className="p-3 bg-gradient-to-r from-green-500 to-green-600 text-white">
            <div className="flex items-center justify-between mb-1">
              <span className="text-green-100 text-xs">数据质量</span>
              <BarChart3Icon size={14} className="text-green-200" />
            </div>
            <p className="text-lg font-bold">{project.metrics.dataQualityScore}%</p>
            <p className="text-green-100 text-xs">质量评分</p>
          </Card>

          <Card className="p-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <div className="flex items-center justify-between mb-1">
              <span className="text-purple-100 text-xs">处理进度</span>
              <TrendingUpIcon size={14} className="text-purple-200" />
            </div>
            <p className="text-lg font-bold">{project.metrics.processingProgress}%</p>
            <p className="text-purple-100 text-xs">已完成</p>
          </Card>

          <Card className="p-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white">
            <div className="flex items-center justify-between mb-1">
              <span className="text-orange-100 text-xs">团队规模</span>
              <UsersIcon size={14} className="text-orange-200" />
            </div>
            <p className="text-lg font-bold">{project.team.length}</p>
            <p className="text-orange-100 text-xs">成员</p>
          </Card>

          <Card className="p-3 bg-gradient-to-r from-teal-500 to-teal-600 text-white">
            <div className="flex items-center justify-between mb-1">
              <span className="text-teal-100 text-xs">数据源</span>
              <GitBranchIcon size={14} className="text-teal-200" />
            </div>
            <p className="text-lg font-bold">{project.dataSource.length}</p>
            <p className="text-teal-100 text-xs">已连接</p>
          </Card>

          <Card className="p-3 bg-gradient-to-r from-pink-500 to-pink-600 text-white">
            <div className="flex items-center justify-between mb-1">
              <span className="text-pink-100 text-xs">最后更新</span>
              <CalendarIcon size={14} className="text-pink-200" />
            </div>
            <p className="text-base font-bold">
              {formatDate(project.metrics.lastProcessedAt).split(' ')[0]}
            </p>
            <p className="text-pink-100 text-xs">
              {formatDate(project.metrics.lastProcessedAt).split(' ')[1]}
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
            {activeTab === 'raw-data' && (
              <div className="space-y-6">
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">原始数据源</h3>
                    <Button variant="outline" size="sm">
                      <DatabaseIcon size={16} className="mr-2" />
                      添加数据源
                    </Button>
                  </div>
                  <p className="text-gray-600 mb-4">
                    查看和管理项目中的原始数据源，包括数据库表、文件、API等各种数据来源。
                  </p>
                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 flex items-center">
                          <DocumentIcon className="h-5 w-5 text-gray-400 mr-2" />
                          原始数据管理
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">管理项目中的原始数据文件</p>
                      </div>
                      
                      {/* 文件上传 */}
                      <div className="flex items-center space-x-3">
                        <input
                          type="file"
                          multiple
                          accept=".md,.pdf,.docx,.xlsx,.pptx,.txt,.jpg,.jpeg,.png,.gif,.bmp,.svg,.webp,.mp4,.avi,.mov,.wmv,.flv,.webm"
                          onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                          className="hidden"
                          id="file-upload"
                        />
                        <label
                          htmlFor="file-upload"
                          className={`inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 cursor-pointer ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <CloudArrowUpIcon className="h-4 w-4 mr-2" />
                          {loading ? '上传中...' : '上传文件'}
                        </label>
                      </div>
                    </div>
                    
                    {/* 数据统计和筛选 */}
                    {rawDataStats && (
                      <div className="mb-6">
                        {/* 统计卡片 */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                          <div className="bg-gray-50 rounded-lg p-4">
                            <div className="flex items-center">
                              <DocumentIcon className="h-8 w-8 text-gray-400" />
                              <div className="ml-3">
                                <p className="text-sm font-medium text-gray-500">总文件数</p>
                                <p className="text-2xl font-semibold text-gray-900">{rawDataStats.total_files}</p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="bg-blue-50 rounded-lg p-4">
                            <div className="flex items-center">
                              <DocumentTextIcon className="h-8 w-8 text-blue-400" />
                              <div className="ml-3">
                                <p className="text-sm font-medium text-blue-700">文档</p>
                                <p className="text-2xl font-semibold text-blue-900">{rawDataStats.by_category.document || 0}</p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="bg-green-50 rounded-lg p-4">
                            <div className="flex items-center">
                              <PhotoIcon className="h-8 w-8 text-green-400" />
                              <div className="ml-3">
                                <p className="text-sm font-medium text-green-700">图片</p>
                                <p className="text-2xl font-semibold text-green-900">{rawDataStats.by_category.image || 0}</p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="bg-purple-50 rounded-lg p-4">
                            <div className="flex items-center">
                              <VideoCameraIcon className="h-8 w-8 text-purple-400" />
                              <div className="ml-3">
                                <p className="text-sm font-medium text-purple-700">视频</p>
                                <p className="text-2xl font-semibold text-purple-900">{rawDataStats.by_category.video || 0}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* 搜索和筛选 */}
                        <div className="flex items-center space-x-4">
                          <div className="flex-1 relative">
                            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                            <input
                              type="text"
                              placeholder="搜索文件名..."
                              value={fileSearchTerm}
                              onChange={(e) => setFileSearchTerm(e.target.value)}
                              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                            />
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <FunnelIcon className="h-5 w-5 text-gray-400" />
                            <select
                              value={selectedFileCategory}
                              onChange={(e) => setSelectedFileCategory(e.target.value as FileCategory | 'all')}
                              className="border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                            >
                              <option value="all">全部类型</option>
                              <option value="document">文档</option>
                              <option value="image">图片</option>
                              <option value="video">视频</option>
                              <option value="database">数据库</option>
                              <option value="api">API</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* 文件列表 */}
                    <div className="space-y-3">
                      {filteredRawData.map((file) => (
                        <div key={file.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-3 flex-1">
                              {/* 文件图标 */}
                              <div className="flex-shrink-0 mt-1">
                                {getFileTypeIcon(file.file_type, file.file_category)}
                              </div>
                              
                              {/* 文件信息 */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2">
                                  <h4 className="text-sm font-medium text-gray-900 truncate">
                                    {file.original_filename || file.filename}
                                  </h4>
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                    {file.file_category_display}
                                  </span>
                                  
                                  {/* 处理状态 */}
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                    getProcessingStatusDisplay(file.processing_status).color === 'green' ? 'bg-green-100 text-green-800' :
                                    getProcessingStatusDisplay(file.processing_status).color === 'blue' ? 'bg-blue-100 text-blue-800' :
                                    getProcessingStatusDisplay(file.processing_status).color === 'red' ? 'bg-red-100 text-red-800' :
                                    getProcessingStatusDisplay(file.processing_status).color === 'purple' ? 'bg-purple-100 text-purple-800' :
                                    getProcessingStatusDisplay(file.processing_status).color === 'indigo' ? 'bg-indigo-100 text-indigo-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {getProcessingStatusDisplay(file.processing_status).text}
                                  </span>
                                </div>
                                
                                <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                                  <span>{formatFileSize(file.file_size)}</span>
                                  <span>{new Date(file.upload_at).toLocaleDateString()}</span>
                                  
                                  {/* 文件特定信息 */}
                                  {file.file_category === 'document' && file.page_count && (
                                    <span>{file.page_count} 页</span>
                                  )}
                                  {file.file_category === 'document' && file.word_count && (
                                    <span>{file.word_count} 字</span>
                                  )}
                                  {file.file_category === 'image' && file.image_width && file.image_height && (
                                    <span>{file.image_width} × {file.image_height}</span>
                                  )}
                                  {file.file_category === 'video' && file.duration && (
                                    <span>{Math.floor(file.duration / 60)}:{String(file.duration % 60).padStart(2, '0')}</span>
                                  )}
                                </div>
                                
                                {/* 处理进度 */}
                                {file.processing_status === FileProcessingStatus.PROCESSING && (
                                  <div className="mt-2">
                                    <div className="flex items-center space-x-2">
                                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                                        <div 
                                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                          style={{ width: `${file.processing_progress}%` }}
                                        />
                                      </div>
                                      <span className="text-xs text-gray-500">{file.processing_progress}%</span>
                                    </div>
                                  </div>
                                )}
                                
                                {/* 质量评分 */}
                                {file.content_quality_score > 0 && (
                                  <div className="mt-2 flex items-center space-x-2">
                                    <span className="text-xs text-gray-500">质量评分:</span>
                                    <div className="flex items-center space-x-1">
                                      <div className="w-16 bg-gray-200 rounded-full h-1.5">
                                        <div 
                                          className={`h-1.5 rounded-full ${
                                            file.content_quality_score >= 80 ? 'bg-green-500' :
                                            file.content_quality_score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                                          }`}
                                          style={{ width: `${file.content_quality_score}%` }}
                                        />
                                      </div>
                                      <span className="text-xs text-gray-600">{file.content_quality_score}/100</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {/* 操作按钮 */}
                            <div className="flex items-center space-x-2 ml-4">
                              {file.is_supported_preview && (
                                <button
                                  onClick={() => handlePreviewFile(file)}
                                  className="inline-flex items-center px-2 py-1 border border-gray-300 rounded text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                >
                                  <EyeIcon className="h-3 w-3 mr-1" />
                                  预览
                                </button>
                              )}
                              
                              {file.file_category === 'database' && (
                                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                  即将上线
                                </span>
                              )}
                              
                              {file.file_category === 'api' && (
                                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                  即将上线
                                </span>
                              )}
                              
                              <button className="inline-flex items-center px-2 py-1 border border-gray-300 rounded text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                                <ArrowDownTrayIcon className="h-3 w-3 mr-1" />
                                下载
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {filteredRawData.length === 0 && (
                        <div className="text-center py-12">
                          <DocumentIcon className="mx-auto h-12 w-12 text-gray-400" />
                          <h3 className="mt-2 text-sm font-medium text-gray-900">暂无文件</h3>
                          <p className="mt-1 text-sm text-gray-500">
                            {fileSearchTerm ? '没有找到匹配的文件' : '开始上传文件来管理原始数据'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {activeTab === 'governed-data' && (
              <div className="space-y-6">
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">治理后数据</h3>
                    <Button variant="outline" size="sm">
                      <RefreshCwIcon size={16} className="mr-2" />
                      重新处理
                    </Button>
                  </div>
                  <p className="text-gray-600 mb-4">
                    经过数据清洗、质量检查和标准化处理的高质量数据。
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {project.governedData?.map((data) => (
                      <Card key={data.id} className="p-4 border border-gray-200 hover:border-blue-300 transition-colors">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium text-gray-900">{data.name}</h4>
                          {getStatusBadge(data.governance_status)}
                        </div>
                        <p className="text-sm text-gray-600 mb-3">{data.description}</p>
                        
                        <div className="mb-3">
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-gray-500">数据质量</span>
                            <span className="font-medium">{data.quality_score}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full transition-all duration-300 ${
                                data.quality_score >= 90 ? 'bg-green-500' :
                                data.quality_score >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${data.quality_score}%` }}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                          <div>
                            <span className="text-gray-500">数据类型:</span>
                            <Badge variant="outline" className="ml-2 text-xs">
                              {data.data_type}
                            </Badge>
                          </div>
                          <div>
                            <span className="text-gray-500">文件大小:</span>
                            <span className="ml-2 font-medium">{formatDataSize(data.file_size)}</span>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1 mb-3">
                          {data.tags?.map((tag, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>

                        <div className="text-xs text-gray-500 mb-3">
                          {data.processed_at && `处理完成: ${formatDate(data.processed_at)}`}
                        </div>

                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            预览数据
                          </Button>
                          <Button size="sm" variant="outline">
                            下载
                          </Button>
                          <Button size="sm" variant="outline">
                            质量报告
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {activeTab === 'knowledge' && (
              <div className="space-y-6">
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">知识管理</h3>
                    <Button variant="outline" size="sm">
                      <FileTextIcon size={16} className="mr-2" />
                      创建知识项
                    </Button>
                  </div>
                  <p className="text-gray-600 mb-4">
                    项目相关的知识库，包括数据字典、业务规则、最佳实践等。
                  </p>
                  
                  {/* 知识统计 */}
                  <div className="grid grid-cols-4 gap-4 mb-6">
                    <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                      <FileTextIcon size={24} className="text-purple-600 mb-2" />
                      <h4 className="font-medium text-purple-800 mb-1">数据字典</h4>
                      <p className="text-sm text-purple-600">125 个数据元素定义</p>
                    </div>
                    <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                      <ActivityIcon size={24} className="text-orange-600 mb-2" />
                      <h4 className="font-medium text-orange-800 mb-1">业务规则</h4>
                      <p className="text-sm text-orange-600">78 条数据治理规则</p>
                    </div>
                    <div className="p-4 bg-teal-50 rounded-lg border border-teal-200">
                      <GitBranchIcon size={24} className="text-teal-600 mb-2" />
                      <h4 className="font-medium text-teal-800 mb-1">最佳实践</h4>
                      <p className="text-sm text-teal-600">12 个治理模板</p>
                    </div>
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <BarChart3Icon size={24} className="text-blue-600 mb-2" />
                      <h4 className="font-medium text-blue-800 mb-1">RAG向量</h4>
                      <p className="text-sm text-blue-600">1,024 个语义索引</p>
                    </div>
                  </div>

                  {/* 知识项列表 */}
                  <div className="space-y-4">
                    {project.knowledgeItems?.map((item) => (
                      <Card key={item.id} className="p-4 border border-gray-200 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="font-medium text-gray-900">{item.title}</h4>
                              <Badge variant="outline" className="text-xs">
                                {item.knowledge_type}
                              </Badge>
                              {getStatusBadge(item.status)}
                            </div>
                            <p className="text-sm text-gray-600 mb-3">{item.description}</p>
                            
                            <div className="flex flex-wrap gap-1 mb-3">
                              {item.tags?.map((tag, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>

                            <div className="grid grid-cols-3 gap-4 text-sm text-gray-500">
                              <div className="flex items-center gap-1">
                                <ActivityIcon size={12} />
                                <span>{item.view_count} 次查看</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <CheckCircleIcon size={12} />
                                <span>{item.like_count} 个赞</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <ShareIcon size={12} />
                                <span>{item.share_count} 次分享</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline">
                              查看
                            </Button>
                            <Button size="sm" variant="outline">
                              编辑
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {activeTab === 'datasets' && (
              <div className="space-y-6">
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">数据集管理</h3>
                    <Button variant="outline" size="sm">
                      <DatabaseIcon size={16} className="mr-2" />
                      创建数据集
                    </Button>
                  </div>
                  <p className="text-gray-600 mb-4">
                    管理项目中创建的各类数据集，用于分析和建模。
                  </p>
                  <div className="space-y-4">
                    <Card className="p-4 border border-gray-200 hover:border-blue-300 transition-colors">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-4">
                          <DatabaseIcon size={20} className="text-blue-600" />
                          <div>
                            <h4 className="font-medium text-gray-900">客户360度画像数据集</h4>
                            <p className="text-sm text-gray-600">综合客户基础信息、行为数据和偏好分析</p>
                          </div>
                        </div>
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          已发布
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-4 gap-4 text-sm mb-3">
                        <div>
                          <span className="text-gray-500">记录数:</span>
                          <span className="ml-2 font-medium">1,234,567</span>
                        </div>
                        <div>
                          <span className="text-gray-500">字段数:</span>
                          <span className="ml-2 font-medium">45</span>
                        </div>
                        <div>
                          <span className="text-gray-500">大小:</span>
                          <span className="ml-2 font-medium">1.2 GB</span>
                        </div>
                        <div>
                          <span className="text-gray-500">格式:</span>
                          <span className="ml-2 font-medium">Parquet</span>
                        </div>
                      </div>

                      <div className="text-xs text-gray-500 mb-3">
                        更新时间: 2024-06-10 10:30
                      </div>

                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          预览
                        </Button>
                        <Button size="sm" variant="outline">
                          下载
                        </Button>
                        <Button size="sm" variant="outline">
                          API访问
                        </Button>
                      </div>
                    </Card>

                    <Card className="p-4 border border-gray-200 hover:border-blue-300 transition-colors">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-4">
                          <DatabaseIcon size={20} className="text-green-600" />
                          <div>
                            <h4 className="font-medium text-gray-900">营销效果分析数据集</h4>
                            <p className="text-sm text-gray-600">包含营销活动数据和效果指标</p>
                          </div>
                        </div>
                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                          处理中
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-4 gap-4 text-sm mb-3">
                        <div>
                          <span className="text-gray-500">记录数:</span>
                          <span className="ml-2 font-medium">856,342</span>
                        </div>
                        <div>
                          <span className="text-gray-500">字段数:</span>
                          <span className="ml-2 font-medium">32</span>
                        </div>
                        <div>
                          <span className="text-gray-500">大小:</span>
                          <span className="ml-2 font-medium">0.8 GB</span>
                        </div>
                        <div>
                          <span className="text-gray-500">格式:</span>
                          <span className="ml-2 font-medium">CSV</span>
                        </div>
                      </div>

                      <div className="text-xs text-gray-500 mb-3">
                        更新时间: 2024-06-09 15:20
                      </div>

                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          预览
                        </Button>
                        <Button size="sm" variant="outline">
                          下载
                        </Button>
                        <Button size="sm" variant="outline" disabled>
                          API访问
                        </Button>
                      </div>
                    </Card>
                  </div>
                </Card>
              </div>
            )}

            {activeTab === 'analytics' && (
              <div className="space-y-6">
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">数据分析</h3>
                    <Button variant="outline" size="sm">
                      <BarChart3Icon size={16} className="mr-2" />
                      生成报告
                    </Button>
                  </div>
                  <p className="text-gray-600 mb-4">
                    基于治理后数据进行的各类分析报告和洞察。
                  </p>
                  
                  <div className="grid grid-cols-2 gap-6">
                    {/* 质量评估报告 */}
                    <Card className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <BarChart3Icon size={24} className="text-blue-600" />
                          <h4 className="font-medium text-blue-800">数据质量趋势</h4>
                        </div>
                        <Badge variant="outline" className="text-blue-700 border-blue-300">
                          AI评估
                        </Badge>
                      </div>
                      <p className="text-sm text-blue-600 mb-3">过去30天数据质量变化趋势及AI驱动的改进建议</p>
                      
                      <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                        <div className="text-center">
                          <div className="text-blue-800 font-medium">完整性</div>
                          <div className="text-blue-600">95%</div>
                        </div>
                        <div className="text-center">
                          <div className="text-blue-800 font-medium">准确性</div>
                          <div className="text-blue-600">92%</div>
                        </div>
                        <div className="text-center">
                          <div className="text-blue-800 font-medium">一致性</div>
                          <div className="text-blue-600">89%</div>
                        </div>
                      </div>

                      <Button size="sm" variant="outline" className="w-full mt-2">
                        查看详细报告
                      </Button>
                    </Card>

                    {/* 处理效率分析 */}
                    <Card className="p-4 bg-gradient-to-r from-green-50 to-green-100 border border-green-200">
                      <div className="flex items-center gap-3 mb-3">
                        <TrendingUpIcon size={24} className="text-green-600" />
                        <h4 className="font-medium text-green-800">处理效率分析</h4>
                      </div>
                      <p className="text-sm text-green-600 mb-3">数据处理速度和资源使用情况分析</p>
                      
                      <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                        <div>
                          <div className="text-green-800 font-medium">平均处理时间</div>
                          <div className="text-green-600">2.3 小时</div>
                        </div>
                        <div>
                          <div className="text-green-800 font-medium">资源利用率</div>
                          <div className="text-green-600">78%</div>
                        </div>
                      </div>

                      <Button size="sm" variant="outline" className="w-full mt-2">
                        查看详细分析
                      </Button>
                    </Card>

                    {/* 数据使用统计 */}
                    <Card className="p-4 bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-200">
                      <div className="flex items-center gap-3 mb-3">
                        <UsersIcon size={24} className="text-purple-600" />
                        <h4 className="font-medium text-purple-800">数据使用统计</h4>
                      </div>
                      <p className="text-sm text-purple-600 mb-3">各业务部门数据访问和使用情况</p>
                      
                      <div className="space-y-1 text-xs mb-3">
                        <div className="flex justify-between">
                          <span className="text-purple-700">营销部门</span>
                          <span className="text-purple-600">45%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-purple-700">数据团队</span>
                          <span className="text-purple-600">30%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-purple-700">业务分析</span>
                          <span className="text-purple-600">25%</span>
                        </div>
                      </div>

                      <Button size="sm" variant="outline" className="w-full mt-2">
                        查看详细统计
                      </Button>
                    </Card>

                    {/* 异常检测报告 */}
                    <Card className="p-4 bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <AlertCircleIcon size={24} className="text-orange-600" />
                          <h4 className="font-medium text-orange-800">异常检测报告</h4>
                        </div>
                        <Badge variant="destructive" className="text-xs">
                          3个异常
                        </Badge>
                      </div>
                      <p className="text-sm text-orange-600 mb-3">数据异常和质量问题分析</p>
                      
                      <div className="space-y-1 text-xs mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                          <span className="text-orange-700">重复数据检测到</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                          <span className="text-orange-700">格式不一致</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                          <span className="text-orange-700">缺失值增加</span>
                        </div>
                      </div>

                      <Button size="sm" variant="outline" className="w-full mt-2">
                        查看详细报告
                      </Button>
                    </Card>
                  </div>
                </Card>
              </div>
            )}
          </div>
        </Tabs>
      </div>

      {/* 文件预览模态框 */}
      {showFilePreview && selectedFile && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    {getFileTypeIcon(selectedFile.file_type, selectedFile.file_category)}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        {selectedFile.original_filename || selectedFile.filename}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {selectedFile.file_category_display} • {formatFileSize(selectedFile.file_size)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowFilePreview(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <span className="sr-only">关闭</span>
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                {/* 预览内容 */}
                <div className="max-h-96 overflow-y-auto">
                  {filePreview ? (
                    <div>
                      {filePreview.type === 'text' && (
                        <div className="bg-gray-50 rounded-lg p-4">
                          <pre className="whitespace-pre-wrap text-sm text-gray-900">
                            {filePreview.content || filePreview.extracted_text || '无法提取文本内容'}
                          </pre>
                        </div>
                      )}
                      
                      {filePreview.type === 'image' && (
                        <div className="text-center">
                          <img 
                            src={filePreview.thumbnail_url || '#'} 
                            alt={selectedFile.filename}
                            className="max-h-80 mx-auto rounded-lg shadow-sm"
                            style={{ maxWidth: '100%', height: 'auto' }}
                          />
                          <div className="mt-2 text-sm text-gray-500">
                            {filePreview.width} × {filePreview.height} • {filePreview.color_mode}
                          </div>
                        </div>
                      )}
                      
                      {filePreview.type === 'video' && (
                        <div className="text-center">
                          <div className="bg-gray-100 rounded-lg p-8">
                            <VideoCameraIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                            <p className="text-sm text-gray-500">视频预览功能正在开发中</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                      <p className="mt-2 text-sm text-gray-500">正在加载预览...</p>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  onClick={() => setShowFilePreview(false)}
                  className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};