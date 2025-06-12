import React, { useState } from 'react';
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
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Select } from '../../components/ui/select';
import { DataGovernanceProject } from './types';

const mockProjects: DataGovernanceProject[] = [
  {
    id: '1',
    name: '客户数据统一治理',
    description: '整合来自多个业务系统的客户数据，建立统一的客户画像',
    status: 'active',
    createdAt: '2024-01-15',
    updatedAt: '2024-06-10',
    owner: {
      id: '1',
      username: 'zhangsan',
      fullName: '张三',
      email: 'zhangsan@company.com',
      role: 'owner',
      joinedAt: '2024-01-15',
    },
    team: [
      { id: '1', username: 'zhangsan', fullName: '张三', email: 'zhangsan@company.com', role: 'owner', joinedAt: '2024-01-15' },
      { id: '2', username: 'lisi', fullName: '李四', email: 'lisi@company.com', role: 'admin', joinedAt: '2024-01-16' },
      { id: '3', username: 'wangwu', fullName: '王五', email: 'wangwu@company.com', role: 'editor', joinedAt: '2024-01-20' },
    ],
    metrics: {
      totalDataSize: 2.5e9, // 2.5GB
      processedFiles: 1250,
      totalFiles: 1500,
      dataQualityScore: 85,
      lastProcessedAt: '2024-06-10T10:30:00Z',
      processingProgress: 83,
    },
    pipeline: [],
    dataSource: [],
  },
  {
    id: '2',
    name: '产品文档知识库构建',
    description: '将产品相关的技术文档、用户手册转换为结构化知识库',
    status: 'active',
    createdAt: '2024-02-01',
    updatedAt: '2024-06-09',
    owner: {
      id: '4',
      username: 'zhaoliu',
      fullName: '赵六',
      email: 'zhaoliu@company.com',
      role: 'owner',
      joinedAt: '2024-02-01',
    },
    team: [
      { id: '4', username: 'zhaoliu', fullName: '赵六', email: 'zhaoliu@company.com', role: 'owner', joinedAt: '2024-02-01' },
      { id: '5', username: 'sunqi', fullName: '孙七', email: 'sunqi@company.com', role: 'editor', joinedAt: '2024-02-05' },
    ],
    metrics: {
      totalDataSize: 1.2e9, // 1.2GB
      processedFiles: 850,
      totalFiles: 1000,
      dataQualityScore: 92,
      lastProcessedAt: '2024-06-09T15:45:00Z',
      processingProgress: 85,
    },
    pipeline: [],
    dataSource: [],
  },
  {
    id: '3', 
    name: '财务报表数据分析',
    description: '对历史财务数据进行清洗和分析，支持AI驱动的财务洞察',
    status: 'draft',
    createdAt: '2024-05-20',
    updatedAt: '2024-06-08',
    owner: {
      id: '6',
      username: 'qianba',
      fullName: '钱八',
      email: 'qianba@company.com',
      role: 'owner',
      joinedAt: '2024-05-20',
    },
    team: [
      { id: '6', username: 'qianba', fullName: '钱八', email: 'qianba@company.com', role: 'owner', joinedAt: '2024-05-20' },
    ],
    metrics: {
      totalDataSize: 0.8e9, // 0.8GB
      processedFiles: 120,
      totalFiles: 300,
      dataQualityScore: 78,
      lastProcessedAt: '2024-06-08T09:20:00Z',
      processingProgress: 40,
    },
    pipeline: [],
    dataSource: [],
  },
];

export const DataGovernanceProjects: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('updated');

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

  const filteredProjects = mockProjects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    return matchesSearch && matchesStatus;
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
                  <p className="text-3xl font-bold">{mockProjects.length}</p>
                </div>
                <FolderIcon size={32} className="text-blue-200" />
              </div>
            </Card>
            <Card className="p-6 bg-gradient-to-r from-green-500 to-green-600 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">进行中</p>
                  <p className="text-3xl font-bold">
                    {mockProjects.filter(p => p.status === 'active').length}
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
                    {new Set(mockProjects.flatMap(p => p.team.map(m => m.id))).size}
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
                    {formatDataSize(mockProjects.reduce((sum, p) => sum + p.metrics.totalDataSize, 0))}
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

        {/* 工程列表 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
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

        {filteredProjects.length === 0 && (
          <div className="text-center py-12">
            <FolderIcon size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">暂无工程</h3>
            <p className="text-gray-600 mb-4">创建您的第一个数据治理工程来开始</p>
            <Button 
              onClick={() => navigate('/governance/create')}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
            >
              <PlusIcon size={16} className="mr-2" />
              创建工程
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};