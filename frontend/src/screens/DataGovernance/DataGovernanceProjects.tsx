import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  PlusIcon,
  SearchIcon,
  FilterIcon,
  UsersIcon,
  DatabaseIcon,
  CalendarIcon,
  TrendingUpIcon,
  PlayIcon,
  PauseIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  MoreVerticalIcon,
  FolderIcon,
  GitBranchIcon,
  Activity,
  BarChart3Icon,
  Loader2Icon,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Select } from '../../components/ui/select';
import { DataGovernanceProject } from '../../types/data-governance';
import { useProjects, useProjectStats } from '../../hooks/useDataGovernance';


export const DataGovernanceProjects: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('updated');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch projects with current filters
  const { projects, total, loading: projectsLoading, error: projectsError, refetch } = useProjects({
    search: debouncedSearchTerm || undefined,
    status: statusFilter === 'all' ? undefined : statusFilter,
    sort_by: sortBy,
    limit: 50,
    offset: 0
  });

  // Fetch project stats
  const { stats, loading: statsLoading, error: statsError } = useProjectStats();

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
    });
  };

  const getStatusBadge = (status: DataGovernanceProject['status']) => {
    const statusConfig = {
      active: { label: '进行中', variant: 'default' as const, icon: PlayIcon },
      draft: { label: '草稿', variant: 'secondary' as const, icon: FolderIcon },
      completed: { label: '已完成', variant: 'default' as const, icon: CheckCircleIcon },
      archived: { label: '已归档', variant: 'outline' as const, icon: PauseIcon },
    };
    
    const config = statusConfig[status];
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon size={12} />
        {config.label}
      </Badge>
    );
  };

  const handleRefresh = () => {
    refetch();
  };

  const displayProjects = projects || [];
  
  // 添加调试日志，帮助诊断数据加载情况
  console.log('DataGovernanceProjects - 数据状态:', {
    projects,
    total,
    loading: projectsLoading,
    error: projectsError,
    displayProjectsLength: displayProjects.length
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* 页面头部 */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <GitBranchIcon className="text-white" size={24} />
                </div>
                数据治理工程
              </h1>
              <p className="text-gray-600 text-lg">
                统一管理企业数据处理管道，将原始数据转化为高质量知识资产
              </p>
            </div>
            <Button 
              onClick={() => navigate('/governance/create')}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg"
            >
              <PlusIcon size={16} className="mr-2" />
              创建工程
            </Button>
          </div>

          {/* 统计卡片 */}
          <div className="grid grid-cols-4 gap-6 mb-6">
            <Card className="p-6 bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">总工程数</p>
                  <p className="text-3xl font-bold">
                    {statsLoading ? (
                      <Loader2Icon size={24} className="animate-spin" />
                    ) : (
                      stats?.totalProjects || 0
                    )}
                  </p>
                </div>
                <FolderIcon size={32} className="text-blue-200" />
              </div>
            </Card>
            <Card className="p-6 bg-gradient-to-r from-green-500 to-green-600 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">进行中</p>
                  <p className="text-3xl font-bold">
                    {statsLoading ? (
                      <Loader2Icon size={24} className="animate-spin" />
                    ) : (
                      stats?.activeProjects || 0
                    )}
                  </p>
                </div>
                <Activity size={32} className="text-green-200" />
              </div>
            </Card>
            <Card className="p-6 bg-gradient-to-r from-purple-500 to-purple-600 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">团队成员</p>
                  <p className="text-3xl font-bold">
                    {statsLoading ? (
                      <Loader2Icon size={24} className="animate-spin" />
                    ) : (
                      stats?.teamMembersCount || 0
                    )}
                  </p>
                </div>
                <UsersIcon size={32} className="text-purple-200" />
              </div>
            </Card>
            <Card className="p-6 bg-gradient-to-r from-orange-500 to-orange-600 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm">数据处理量</p>
                  <p className="text-3xl font-bold">
                    {statsLoading ? (
                      <Loader2Icon size={24} className="animate-spin" />
                    ) : (
                      formatDataSize(stats?.totalDataSize || 0)
                    )}
                  </p>
                </div>
                <DatabaseIcon size={32} className="text-orange-200" />
              </div>
            </Card>
          </div>

          {/* 搜索和过滤 */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <SearchIcon size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="搜索工程名称或描述..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={setStatusFilter}
            >
              <option value="all">全部状态</option>
              <option value="active">进行中</option>
              <option value="draft">草稿</option>
              <option value="completed">已完成</option>
              <option value="archived">已归档</option>
            </Select>
            <Select
              value={sortBy}
              onValueChange={setSortBy}
            >
              <option value="updated">最近更新</option>
              <option value="created">创建时间</option>
              <option value="name">名称</option>
            </Select>
          </div>
        </div>

        {/* Loading状态 */}
        {projectsLoading && (
          <div className="flex justify-center items-center py-12">
            <Loader2Icon size={48} className="animate-spin text-blue-500" />
            <span className="ml-2 text-lg text-gray-600">加载中...</span>
          </div>
        )}

        {/* 错误状态 */}
        {(projectsError || statsError) && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <AlertCircleIcon size={20} className="text-red-500 mr-2" />
              <span className="text-red-700">
                {projectsError || statsError}
              </span>
            </div>
            <Button 
              onClick={handleRefresh}
              variant="outline" 
              size="sm" 
              className="mt-2"
            >
              重试
            </Button>
          </div>
        )}

        {/* 工程列表 */}
        {!projectsLoading && !projectsError && (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {displayProjects.map((project) => (
            <Card 
              key={project.id} 
              className="p-6 hover:shadow-xl transition-all duration-300 cursor-pointer bg-white/80 backdrop-blur-sm border border-gray-200/50"
              onClick={() => navigate(`/governance/projects/${project.id}`)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {project.name}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {project.description}
                  </p>
                </div>
                <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100">
                  <MoreVerticalIcon size={16} />
                </Button>
              </div>

              <div className="mb-4">
                {getStatusBadge(project.status)}
              </div>

              {/* 项目指标 */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-gray-50/80 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <BarChart3Icon size={14} className="text-blue-500" />
                    <span className="text-xs text-gray-600">数据质量</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full"
                        style={{ width: `${project.metrics.dataQualityScore}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">{project.metrics.dataQualityScore}%</span>
                  </div>
                </div>

                <div className="bg-gray-50/80 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUpIcon size={14} className="text-green-500" />
                    <span className="text-xs text-gray-600">处理进度</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full"
                        style={{ width: `${project.metrics.processingProgress}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">{project.metrics.processingProgress}%</span>
                  </div>
                </div>
              </div>

              {/* 统计信息 */}
              <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <DatabaseIcon size={12} />
                    {formatDataSize(project.metrics.totalDataSize)}
                  </span>
                  <span className="flex items-center gap-1">
                    <UsersIcon size={12} />
                    {project.team.length}人
                  </span>
                </div>
                <span className="flex items-center gap-1">
                  <CalendarIcon size={12} />
                  {formatDate(project.updatedAt)}
                </span>
              </div>

              {/* 团队成员头像 */}
              <div className="flex items-center justify-between">
                <div className="flex -space-x-2">
                  {project.team.slice(0, 4).map((member, index) => (
                    <div
                      key={member.id}
                      className="w-8 h-8 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-medium"
                      title={member.fullName}
                    >
                      {member.fullName.charAt(0)}
                    </div>
                  ))}
                  {project.team.length > 4 && (
                    <div className="w-8 h-8 bg-gray-300 rounded-full border-2 border-white flex items-center justify-center text-gray-600 text-xs">
                      +{project.team.length - 4}
                    </div>
                  )}
                </div>
                <div className="text-xs text-gray-500">
                  {project.metrics.processedFiles}/{project.metrics.totalFiles} 文件
                </div>
              </div>
            </Card>
            ))}
          </div>
        )}

        {/* 空状态 */}
        {!projectsLoading && !projectsError && displayProjects.length === 0 && (
          <div className="text-center py-12">
            <FolderIcon size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm || statusFilter !== 'all' ? '没有找到匹配的工程' : '暂无工程'}
            </h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || statusFilter !== 'all' 
                ? '尝试调整搜索条件或过滤器' 
                : '创建您的第一个数据治理工程来开始'
              }
            </p>
            {(!searchTerm && statusFilter === 'all') && (
              <Button 
                onClick={() => navigate('/governance/create')}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
              >
                <PlusIcon size={16} className="mr-2" />
                创建工程
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};