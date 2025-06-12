import React, { useState } from 'react';
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
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Tabs } from '../../components/ui/tabs';
import { DataPipelineVisualization } from './components/DataPipelineVisualization';
import { TeamManagement } from './components/TeamManagement';
import { DataGovernanceProject } from './types';

// Mock data for project detail
const mockProject: DataGovernanceProject = {
  id: '1',
  name: '客户数据统一治理',
  description: '整合来自多个业务系统的客户数据，建立统一的客户画像，提升数据质量和一致性，为业务决策提供可靠的数据基础。',
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
    { id: '4', username: 'zhaoliu', fullName: '赵六', email: 'zhaoliu@company.com', role: 'viewer', joinedAt: '2024-02-01' },
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
  dataSource: [
    {
      id: '1',
      name: 'CRM数据库',
      type: 'database',
      config: { host: 'crm.company.com', database: 'customers' },
      status: 'connected',
      lastSyncAt: '2024-06-10T08:00:00Z',
    },
    {
      id: '2',
      name: '营销文档',
      type: 'upload',
      config: { path: '/uploads/marketing' },
      status: 'connected',
    },
  ],
};

export const ProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('raw-data');
  const [project] = useState<DataGovernanceProject>(mockProject);

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

  const getStatusBadge = (status: DataGovernanceProject['status']) => {
    const statusConfig = {
      active: { label: '进行中', variant: 'default' as const, color: 'bg-green-100 text-green-800' },
      draft: { label: '草稿', variant: 'secondary' as const, color: 'bg-gray-100 text-gray-800' },
      completed: { label: '已完成', variant: 'success' as const, color: 'bg-blue-100 text-blue-800' },
      archived: { label: '已归档', variant: 'outline' as const, color: 'bg-purple-100 text-purple-800' },
    };
    return statusConfig[status];
  };

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
                <Badge className={statusConfig.color}>
                  {statusConfig.label}
                </Badge>
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
          <div className="flex items-center gap-4">
            <Button className="bg-green-500 hover:bg-green-600">
              <PlayIcon size={16} className="mr-2" />
              运行管道
            </Button>
            <Button variant="outline">
              <PauseIcon size={16} className="mr-2" />
              暂停处理
            </Button>
            <Button variant="outline">
              <RefreshCwIcon size={16} className="mr-2" />
              刷新数据
            </Button>
          </div>
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
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">原始数据</h3>
                  <p className="text-gray-600 mb-4">
                    查看和管理项目中的原始数据源，包括数据库表、文件、API等各种数据来源。
                  </p>
                  <div className="space-y-3">
                    {project.dataSource.map((source) => (
                      <div key={source.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                        <div className="flex items-center gap-4">
                          <div className={`w-4 h-4 rounded-full ${
                            source.status === 'connected' ? 'bg-green-500' : 'bg-red-500'
                          }`} />
                          <div>
                            <p className="font-medium text-gray-900">{source.name}</p>
                            <p className="text-sm text-gray-600">{source.type}</p>
                            {source.lastSyncAt && (
                              <p className="text-xs text-gray-500">
                                最后同步: {formatDate(source.lastSyncAt)}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            查看数据
                          </Button>
                          <Button size="sm" variant="outline">
                            配置
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {activeTab === 'governed-data' && (
              <div className="space-y-6">
                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">治理后数据</h3>
                  <p className="text-gray-600 mb-4">
                    经过数据清洗、质量检查和标准化处理的高质量数据。
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <h4 className="font-medium text-green-800 mb-2">客户主数据</h4>
                      <p className="text-sm text-green-600 mb-2">已完成统一标识符分配和重复数据清理</p>
                      <div className="flex justify-between text-sm">
                        <span className="text-green-600">数据质量: 95%</span>
                        <span className="text-green-600">1,234,567 条记录</span>
                      </div>
                    </div>
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <h4 className="font-medium text-blue-800 mb-2">交易流水数据</h4>
                      <p className="text-sm text-blue-600 mb-2">已完成数据格式标准化和异常值处理</p>
                      <div className="flex justify-between text-sm">
                        <span className="text-blue-600">数据质量: 88%</span>
                        <span className="text-blue-600">8,765,432 条记录</span>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {activeTab === 'knowledge' && (
              <div className="space-y-6">
                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">知识管理</h3>
                  <p className="text-gray-600 mb-4">
                    项目相关的知识库，包括数据字典、业务规则、最佳实践等。
                  </p>
                  <div className="grid grid-cols-3 gap-4">
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
                  </div>
                </Card>
              </div>
            )}

            {activeTab === 'datasets' && (
              <div className="space-y-6">
                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">数据集管理</h3>
                  <p className="text-gray-600 mb-4">
                    管理项目中创建的各类数据集，用于分析和建模。
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                      <div className="flex items-center gap-4">
                        <DatabaseIcon size={20} className="text-blue-600" />
                        <div>
                          <p className="font-medium text-gray-900">客户360度画像数据集</p>
                          <p className="text-sm text-gray-600">综合客户基础信息、行为数据和偏好分析</p>
                          <p className="text-xs text-gray-500">更新时间: 2024-06-10 10:30</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          预览
                        </Button>
                        <Button size="sm" variant="outline">
                          下载
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                      <div className="flex items-center gap-4">
                        <DatabaseIcon size={20} className="text-green-600" />
                        <div>
                          <p className="font-medium text-gray-900">营销效果分析数据集</p>
                          <p className="text-sm text-gray-600">包含营销活动数据和效果指标</p>
                          <p className="text-xs text-gray-500">更新时间: 2024-06-09 15:20</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          预览
                        </Button>
                        <Button size="sm" variant="outline">
                          下载
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {activeTab === 'analytics' && (
              <div className="space-y-6">
                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">数据分析</h3>
                  <p className="text-gray-600 mb-4">
                    基于治理后数据进行的各类分析报告和洞察。
                  </p>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border">
                      <BarChart3Icon size={24} className="text-blue-600 mb-2" />
                      <h4 className="font-medium text-blue-800 mb-2">数据质量趋势</h4>
                      <p className="text-sm text-blue-600 mb-2">过去30天数据质量变化趋势</p>
                      <Button size="sm" variant="outline" className="mt-2">
                        查看详情
                      </Button>
                    </div>
                    <div className="p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg border">
                      <TrendingUpIcon size={24} className="text-green-600 mb-2" />
                      <h4 className="font-medium text-green-800 mb-2">处理效率分析</h4>
                      <p className="text-sm text-green-600 mb-2">数据处理速度和资源使用情况</p>
                      <Button size="sm" variant="outline" className="mt-2">
                        查看详情
                      </Button>
                    </div>
                    <div className="p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg border">
                      <UsersIcon size={24} className="text-purple-600 mb-2" />
                      <h4 className="font-medium text-purple-800 mb-2">数据使用统计</h4>
                      <p className="text-sm text-purple-600 mb-2">各业务部门数据访问和使用情况</p>
                      <Button size="sm" variant="outline" className="mt-2">
                        查看详情
                      </Button>
                    </div>
                    <div className="p-4 bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg border">
                      <ActivityIcon size={24} className="text-orange-600 mb-2" />
                      <h4 className="font-medium text-orange-800 mb-2">异常检测报告</h4>
                      <p className="text-sm text-orange-600 mb-2">数据异常和质量问题分析</p>
                      <Button size="sm" variant="outline" className="mt-2">
                        查看详情
                      </Button>
                    </div>
                  </div>
                </Card>
              </div>
            )}
          </div>
        </Tabs>
      </div>
    </div>
  );
};