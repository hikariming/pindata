import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DatabaseIcon,
  FolderIcon,
  LinkIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  RefreshCwIcon,
  PlusIcon,
  ExternalLinkIcon,
  FileTextIcon,
  BarChartIcon,
  SearchIcon,
  FilterIcon
} from 'lucide-react';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import { Select } from '../../../components/ui/select';
import { Checkbox } from '../../../components/ui/checkbox';

interface Dataset {
  id: string;
  name: string;
  description: string;
  size: number;
  fileCount: number;
  status: 'ready' | 'processing' | 'error';
  type: 'training' | 'validation' | 'test';
  createdAt: string;
  tags: string[];
}

interface Library {
  id: string;
  name: string;
  description: string;
  size: number;
  fileCount: number;
  status: 'active' | 'processing' | 'error';
  type: 'documents' | 'images' | 'audio' | 'mixed';
  lastUpdated: string;
  processingProgress: number;
}

interface ProjectDataIntegrationProps {
  projectId: string;
  onDatasetLink?: (datasetId: string) => void;
  onLibraryLink?: (libraryId: string) => void;
  onRefresh?: () => void;
}

const mockDatasets: Dataset[] = [
  {
    id: '1',
    name: '企业文档训练集',
    description: '包含公司政策、流程文档的训练数据集',
    size: 1.2e9,
    fileCount: 1500,
    status: 'ready',
    type: 'training',
    createdAt: '2024-01-15',
    tags: ['文档', '企业', '政策']
  },
  {
    id: '2',
    name: '产品手册验证集',
    description: '产品用户手册和技术文档验证集',
    size: 0.8e9,
    fileCount: 800,
    status: 'ready',
    type: 'validation',
    createdAt: '2024-02-01',
    tags: ['产品', '手册', '技术']
  },
  {
    id: '3',
    name: '财务报表数据集',
    description: '历史财务报表和分析报告数据',
    size: 2.1e9,
    fileCount: 2000,
    status: 'processing',
    type: 'training',
    createdAt: '2024-03-10',
    tags: ['财务', '报表', '分析']
  }
];

const mockLibraries: Library[] = [
  {
    id: '1',
    name: '企业知识库',
    description: '公司内部文档和知识资料',
    size: 3.5e9,
    fileCount: 2500,
    status: 'active',
    type: 'documents',
    lastUpdated: '2024-06-10',
    processingProgress: 85
  },
  {
    id: '2',
    name: '产品资料库',
    description: '产品相关文档、图片和视频资料',
    size: 1.8e9,
    fileCount: 1200,
    status: 'active',
    type: 'mixed',
    lastUpdated: '2024-06-09',
    processingProgress: 100
  },
  {
    id: '3',
    name: '培训材料库',
    description: '员工培训和学习资料',
    size: 0.9e9,
    fileCount: 600,
    status: 'processing',
    type: 'documents',
    lastUpdated: '2024-06-08',
    processingProgress: 45
  }
];

export const ProjectDataIntegration: React.FC<ProjectDataIntegrationProps> = ({
  projectId,
  onDatasetLink,
  onLibraryLink,
  onRefresh
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'datasets' | 'libraries'>('datasets');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [linkedDatasets, setLinkedDatasets] = useState<string[]>(['1']); // 已链接的数据集
  const [linkedLibraries, setLinkedLibraries] = useState<string[]>(['1']); // 已链接的库

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const filteredDatasets = mockDatasets.filter(dataset => {
    const matchesSearch = dataset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         dataset.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || dataset.status === statusFilter;
    const matchesType = typeFilter === 'all' || dataset.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const filteredLibraries = mockLibraries.filter(library => {
    const matchesSearch = library.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         library.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || library.status === statusFilter;
    const matchesType = typeFilter === 'all' || library.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const handleItemSelect = (itemId: string) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleBatchLink = () => {
    if (activeTab === 'datasets') {
      selectedItems.forEach(id => {
        if (!linkedDatasets.includes(id)) {
          setLinkedDatasets(prev => [...prev, id]);
          onDatasetLink?.(id);
        }
      });
    } else {
      selectedItems.forEach(id => {
        if (!linkedLibraries.includes(id)) {
          setLinkedLibraries(prev => [...prev, id]);
          onLibraryLink?.(id);
        }
      });
    }
    setSelectedItems([]);
  };

  const handleUnlink = (itemId: string) => {
    if (activeTab === 'datasets') {
      setLinkedDatasets(prev => prev.filter(id => id !== itemId));
    } else {
      setLinkedLibraries(prev => prev.filter(id => id !== itemId));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready':
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'training':
        return 'bg-blue-100 text-blue-800';
      case 'validation':
        return 'bg-purple-100 text-purple-800';
      case 'test':
        return 'bg-orange-100 text-orange-800';
      case 'documents':
        return 'bg-indigo-100 text-indigo-800';
      case 'images':
        return 'bg-pink-100 text-pink-800';
      case 'mixed':
        return 'bg-teal-100 text-teal-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* 头部信息和统计 */}
      <Card className="p-6 bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">数据集成管理</h3>
            <p className="text-gray-600">将现有数据集和数据库集成到工程中</p>
          </div>
          <Button onClick={onRefresh} variant="outline" className="flex items-center gap-2">
            <RefreshCwIcon size={16} />
            刷新
          </Button>
        </div>

        {/* 统计信息 */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white/80 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <BarChartIcon size={16} className="text-blue-600" />
              <span className="text-sm text-gray-600">已链接数据集</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{linkedDatasets.length}</p>
          </div>
          <div className="bg-white/80 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <DatabaseIcon size={16} className="text-purple-600" />
              <span className="text-sm text-gray-600">已链接数据库</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{linkedLibraries.length}</p>
          </div>
          <div className="bg-white/80 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileTextIcon size={16} className="text-green-600" />
              <span className="text-sm text-gray-600">总文件数</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {linkedDatasets.reduce((sum, id) => {
                const dataset = mockDatasets.find(d => d.id === id);
                return sum + (dataset?.fileCount || 0);
              }, 0) + linkedLibraries.reduce((sum, id) => {
                const library = mockLibraries.find(l => l.id === id);
                return sum + (library?.fileCount || 0);
              }, 0)}
            </p>
          </div>
          <div className="bg-white/80 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <LinkIcon size={16} className="text-orange-600" />
              <span className="text-sm text-gray-600">数据总量</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {formatFileSize(
                linkedDatasets.reduce((sum, id) => {
                  const dataset = mockDatasets.find(d => d.id === id);
                  return sum + (dataset?.size || 0);
                }, 0) + linkedLibraries.reduce((sum, id) => {
                  const library = mockLibraries.find(l => l.id === id);
                  return sum + (library?.size || 0);
                }, 0)
              )}
            </p>
          </div>
        </div>
      </Card>

      {/* 选项卡切换 */}
      <div className="flex items-center justify-between">
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('datasets')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'datasets'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <BarChartIcon size={16} className="inline mr-2" />
            数据集 ({mockDatasets.length})
          </button>
          <button
            onClick={() => setActiveTab('libraries')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'libraries'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <DatabaseIcon size={16} className="inline mr-2" />
            数据库 ({mockLibraries.length})
          </button>
        </div>

        {selectedItems.length > 0 && (
          <Button onClick={handleBatchLink} className="flex items-center gap-2">
            <LinkIcon size={16} />
            链接选中的 {activeTab === 'datasets' ? '数据集' : '数据库'} ({selectedItems.length})
          </Button>
        )}
      </div>

      {/* 搜索和过滤 */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <SearchIcon size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              placeholder={`搜索${activeTab === 'datasets' ? '数据集' : '数据库'}名称或描述...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <option value="all">全部状态</option>
            <option value="ready">就绪</option>
            <option value="active">活跃</option>
            <option value="processing">处理中</option>
            <option value="error">错误</option>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <option value="all">全部类型</option>
            {activeTab === 'datasets' ? (
              <>
                <option value="training">训练集</option>
                <option value="validation">验证集</option>
                <option value="test">测试集</option>
              </>
            ) : (
              <>
                <option value="documents">文档</option>
                <option value="images">图像</option>
                <option value="mixed">混合</option>
              </>
            )}
          </Select>
        </div>
      </Card>

      {/* 数据集列表 */}
      {activeTab === 'datasets' && (
        <div className="grid gap-4">
          {filteredDatasets.map((dataset) => {
            const isLinked = linkedDatasets.includes(dataset.id);
            const isSelected = selectedItems.includes(dataset.id);
            
            return (
              <Card key={dataset.id} className={`p-6 transition-all ${
                isLinked ? 'border-green-500 bg-green-50' : 'hover:shadow-md'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleItemSelect(dataset.id)}
                      disabled={isLinked}
                    />
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-400 to-purple-500 rounded-lg flex items-center justify-center">
                        <BarChartIcon size={24} className="text-white" />
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h4 className="text-lg font-semibold text-gray-900">{dataset.name}</h4>
                          {isLinked && (
                            <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
                              <CheckCircleIcon size={12} />
                              已链接
                            </Badge>
                          )}
                        </div>
                        <p className="text-gray-600 mb-2">{dataset.description}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span>{formatFileSize(dataset.size)}</span>
                          <span>{dataset.fileCount} 文件</span>
                          <span>创建于 {formatDate(dataset.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(dataset.status)}>
                        {dataset.status === 'ready' ? '就绪' : 
                         dataset.status === 'processing' ? '处理中' : '错误'}
                      </Badge>
                      <Badge className={getTypeColor(dataset.type)}>
                        {dataset.type === 'training' ? '训练集' :
                         dataset.type === 'validation' ? '验证集' : '测试集'}
                      </Badge>
                    </div>
                    
                    {isLinked ? (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUnlink(dataset.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          取消链接
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex items-center gap-1"
                        >
                          <ExternalLinkIcon size={14} />
                          查看详情
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => {
                          setLinkedDatasets(prev => [...prev, dataset.id]);
                          onDatasetLink?.(dataset.id);
                        }}
                        className="flex items-center gap-1"
                      >
                        <LinkIcon size={14} />
                        链接到工程
                      </Button>
                    )}
                  </div>
                </div>

                {/* 标签 */}
                {dataset.tags.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {dataset.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* 数据库列表 */}
      {activeTab === 'libraries' && (
        <div className="grid gap-4">
          {filteredLibraries.map((library) => {
            const isLinked = linkedLibraries.includes(library.id);
            const isSelected = selectedItems.includes(library.id);
            
            return (
              <Card key={library.id} className={`p-6 transition-all ${
                isLinked ? 'border-green-500 bg-green-50' : 'hover:shadow-md'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleItemSelect(library.id)}
                      disabled={isLinked}
                    />
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-r from-green-400 to-blue-500 rounded-lg flex items-center justify-center">
                        <DatabaseIcon size={24} className="text-white" />
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h4 className="text-lg font-semibold text-gray-900">{library.name}</h4>
                          {isLinked && (
                            <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
                              <CheckCircleIcon size={12} />
                              已链接
                            </Badge>
                          )}
                        </div>
                        <p className="text-gray-600 mb-2">{library.description}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span>{formatFileSize(library.size)}</span>
                          <span>{library.fileCount} 文件</span>
                          <span>更新于 {formatDate(library.lastUpdated)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(library.status)}>
                        {library.status === 'active' ? '活跃' : 
                         library.status === 'processing' ? '处理中' : '错误'}
                      </Badge>
                      <Badge className={getTypeColor(library.type)}>
                        {library.type === 'documents' ? '文档' :
                         library.type === 'images' ? '图像' : '混合'}
                      </Badge>
                    </div>
                    
                    {isLinked ? (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUnlink(library.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          取消链接
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex items-center gap-1"
                        >
                          <ExternalLinkIcon size={14} />
                          查看详情
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => {
                          setLinkedLibraries(prev => [...prev, library.id]);
                          onLibraryLink?.(library.id);
                        }}
                        className="flex items-center gap-1"
                      >
                        <LinkIcon size={14} />
                        链接到工程
                      </Button>
                    )}
                  </div>
                </div>

                {/* 处理进度 */}
                {library.status === 'processing' && (
                  <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-yellow-800">处理进度</span>
                      <span className="text-sm font-medium text-yellow-800">
                        {library.processingProgress}%
                      </span>
                    </div>
                    <div className="w-full bg-yellow-200 rounded-full h-2">
                      <div
                        className="bg-yellow-600 h-2 rounded-full transition-all"
                        style={{ width: `${library.processingProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* 空状态 */}
      {((activeTab === 'datasets' && filteredDatasets.length === 0) ||
        (activeTab === 'libraries' && filteredLibraries.length === 0)) && (
        <div className="text-center py-12">
          {activeTab === 'datasets' ? (
            <BarChartIcon size={48} className="mx-auto text-gray-400 mb-4" />
          ) : (
            <DatabaseIcon size={48} className="mx-auto text-gray-400 mb-4" />
          )}
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            未找到{activeTab === 'datasets' ? '数据集' : '数据库'}
          </h3>
          <p className="text-gray-600">
            请尝试调整搜索条件，或前往相应模块创建新的{activeTab === 'datasets' ? '数据集' : '数据库'}
          </p>
        </div>
      )}
    </div>
  );
}; 