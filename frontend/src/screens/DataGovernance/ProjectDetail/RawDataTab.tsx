import React, { useState, useEffect } from 'react';
import { 
  DocumentTextIcon, 
  PhotoIcon, 
  VideoCameraIcon, 
  DocumentIcon,
  TableCellsIcon,
  LinkIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  PlusIcon,
  XMarkIcon,
  ChevronDownIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import { DatabaseIcon, Server, Cloud, Wifi } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { apiClient } from '../../../lib/api-client';
import { LibraryService } from '../../../services/library.service';
import { 
  FileType, 
  FileCategory, 
  FileProcessingStatus, 
  EnhancedRawData, 
  RawDataListResponse,
  FilePreview,
  DataSourceInfo
} from '../types';
import { Library } from '../../../types/library';

interface RawDataTabProps {
  projectId: string;
}

export const RawDataTab: React.FC<RawDataTabProps> = ({ projectId }) => {
  const [projectRawData, setProjectRawData] = useState<EnhancedRawData[]>([]);
  const [projectDataSources, setProjectDataSources] = useState<DataSourceInfo[]>([]);
  const [availableLibraries, setAvailableLibraries] = useState<Library[]>([]);
  const [rawDataStats, setRawDataStats] = useState<any>(null);
  const [selectedFileCategory, setSelectedFileCategory] = useState<FileCategory | 'all'>('all');
  const [fileSearchTerm, setFileSearchTerm] = useState('');
  const [showFilePreview, setShowFilePreview] = useState(false);
  const [showAddDataSourceModal, setShowAddDataSourceModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<EnhancedRawData | null>(null);
  const [filePreview, setFilePreview] = useState<FilePreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [addingDataSources, setAddingDataSources] = useState<Set<string>>(new Set());
  const [expandedDataSources, setExpandedDataSources] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'overview' | 'sources' | 'files'>('overview');

  // 获取数据源类型图标
  const getDataSourceTypeIcon = (sourceType: string) => {
    switch (sourceType) {
      case 'upload':
        return <DatabaseIcon className="h-5 w-5 text-blue-500" />;
      case 'database':
        return <Server className="h-5 w-5 text-green-500" />;
      case 'api':
        return <Wifi className="h-5 w-5 text-purple-500" />;
      case 'storage':
        return <Cloud className="h-5 w-5 text-orange-500" />;
      default:
        return <DocumentIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  // 获取数据源状态显示
  const getDataSourceStatusDisplay = (status: string) => {
    const statusMap: Record<string, { text: string; color: string }> = {
      'connected': { text: '已连接', color: 'green' },
      'disconnected': { text: '未连接', color: 'gray' },
      'error': { text: '错误', color: 'red' },
      'syncing': { text: '同步中', color: 'blue' },
    };
    return statusMap[status] || { text: '未知', color: 'gray' };
  };

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

  // 获取项目关联的原始数据列表
  const fetchProjectRawData = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: 1,
        per_page: 100,
      };
      
      if (selectedFileCategory !== 'all') {
        params.file_category = selectedFileCategory;
      }
      
      if (fileSearchTerm) {
        params.search = fileSearchTerm;
      }
      
      const response = await apiClient.get<RawDataListResponse>(
        `/api/v1/governance/projects/${projectId}/raw-data`, 
        params
      );
      
      setProjectRawData(response.raw_data || []);
      setProjectDataSources(response.data_sources || []);
      setRawDataStats(response.stats || { total_files: 0, total_data_sources: 0, by_category: {}, by_status: {}, total_size: 0 });
    } catch (error) {
      console.error('获取项目原始数据列表失败:', error);
      setProjectRawData([]);
      setProjectDataSources([]);
      setRawDataStats({ total_files: 0, total_data_sources: 0, by_category: {}, by_status: {}, total_size: 0 });
    } finally {
      setLoading(false);
    }
  };

  // 获取可用的文件库作为数据源
  const fetchAvailableLibraries = async () => {
    try {
      const result = await LibraryService.getLibraries({
        page: 1,
        per_page: 100,
      });
      
      setAvailableLibraries(result.libraries || []);
    } catch (error) {
      console.error('获取可用文件库列表失败:', error);
    }
  };

  // 文件预览
  const handlePreviewFile = async (file: EnhancedRawData) => {
    try {
      setSelectedFile(file);
      setShowFilePreview(true);
      setFilePreview(null); // 重置预览数据
      
      if (file.is_supported_preview) {
        const response = await apiClient.get<FilePreview>(
          `/api/v1/governance/projects/${projectId}/raw-data/${file.id}/preview`
        );
        setFilePreview(response);
      }
    } catch (error) {
      console.error('获取文件预览失败:', error);
      setFilePreview(null);
    }
  };

  // 添加Library作为数据源到项目
  const handleAddDataSource = async (libraryId: string) => {
    try {
      setAddingDataSources(prev => new Set(prev).add(libraryId));
      
      await apiClient.post(`/api/v1/governance/projects/${projectId}/libraries`, {
        library_ids: [libraryId]
      });
      
      // 添加成功后刷新数据
      await fetchProjectRawData();
      
      console.log(`成功添加Library ${libraryId} 到项目 ${projectId}`);
    } catch (error) {
      console.error('添加Library到项目失败:', error);
    } finally {
      setAddingDataSources(prev => {
        const newSet = new Set(prev);
        newSet.delete(libraryId);
        return newSet;
      });
    }
  };

  // 从项目移除数据源
  const handleRemoveDataSource = async (rawDataId: number) => {
    try {
      const confirmed = window.confirm('确定要从项目中移除此数据源吗？');
      if (!confirmed) return;
      
      await apiClient.delete(`/api/v1/governance/projects/${projectId}/raw-data/${rawDataId}`);
      
      // 移除成功后刷新数据
      await fetchProjectRawData();
      
      console.log(`成功从项目 ${projectId} 移除数据源 ${rawDataId}`);
    } catch (error) {
      console.error('从项目移除数据源失败:', error);
    }
  };

  // 筛选后的项目数据源列表
  const filteredProjectRawData = projectRawData.filter(file => {
    if (fileSearchTerm) {
      return file.filename.toLowerCase().includes(fileSearchTerm.toLowerCase()) ||
             file.original_filename?.toLowerCase().includes(fileSearchTerm.toLowerCase());
    }
    return true;
  });

  // 筛选后的可用Library列表
  const filteredAvailableLibraries = availableLibraries.filter(library => {
    if (fileSearchTerm) {
      return library.name.toLowerCase().includes(fileSearchTerm.toLowerCase()) ||
             library.description?.toLowerCase().includes(fileSearchTerm.toLowerCase());
    }
    return true;
  });

  useEffect(() => {
    if (projectId) {
      fetchProjectRawData();
    }
  }, [projectId, selectedFileCategory]);

  // 搜索防抖处理
  useEffect(() => {
    if (!projectId) return;
    
    const debounceTimer = setTimeout(() => {
      fetchProjectRawData();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [fileSearchTerm]);

  useEffect(() => {
    if (showAddDataSourceModal) {
      fetchAvailableLibraries();
    }
  }, [showAddDataSourceModal]);

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">原始数据源管理</h3>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowAddDataSourceModal(true)}
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            添加数据源
          </Button>
        </div>
        <p className="text-gray-600 mb-6">
          管理项目中的数据源，支持文件库、数据库、API等多种数据治理形态。
        </p>
        
        {/* 标签页导航 */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              概览统计
            </button>
            <button
              onClick={() => setActiveTab('sources')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'sources'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              数据源 ({rawDataStats?.total_data_sources || 0})
            </button>
            <button
              onClick={() => setActiveTab('files')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'files'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              文件列表 ({rawDataStats?.total_files || 0})
            </button>
          </nav>
        </div>

        {/* 标签页内容 */}
        {activeTab === 'overview' && rawDataStats && (
          <div>
            {/* 统计卡片 */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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
                  <DatabaseIcon className="h-8 w-8 text-blue-400" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-blue-700">数据源数</p>
                    <p className="text-2xl font-semibold text-blue-900">{rawDataStats.total_data_sources}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center">
                  <PhotoIcon className="h-8 w-8 text-green-400" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-green-700">已完成</p>
                    <p className="text-2xl font-semibold text-green-900">{rawDataStats.by_status?.completed || 0}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="flex items-center">
                  <Server className="h-8 w-8 text-purple-400" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-purple-700">总大小</p>
                    <p className="text-2xl font-semibold text-purple-900">{formatFileSize(rawDataStats.total_size)}</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* 分类统计 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">按文件类型分布</h4>
                <div className="space-y-2">
                  {Object.entries(rawDataStats.by_category || {}).map(([category, count]) => (
                    <div key={category} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {category === 'document' && <DocumentTextIcon className="h-4 w-4 text-blue-500" />}
                        {category === 'image' && <PhotoIcon className="h-4 w-4 text-green-500" />}
                        {category === 'video' && <VideoCameraIcon className="h-4 w-4 text-purple-500" />}
                        {category === 'database' && <TableCellsIcon className="h-4 w-4 text-yellow-500" />}
                        {category === 'api' && <LinkIcon className="h-4 w-4 text-indigo-500" />}
                        <span className="text-sm text-gray-700 capitalize">{category}</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{count as number}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">按处理状态分布</h4>
                <div className="space-y-2">
                  {Object.entries(rawDataStats.by_status || {}).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between">
                      <span className="text-sm text-gray-700 capitalize">{status}</span>
                      <span className="text-sm font-medium text-gray-900">{count as number}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'sources' && (
          <div>
            {projectDataSources.length > 0 ? (
              <div className="space-y-4">
                {projectDataSources.map((dataSource) => (
                  <div key={dataSource.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">
                        {getDataSourceTypeIcon(dataSource.source_type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <h4 className="text-sm font-medium text-gray-900">{dataSource.name}</h4>
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {dataSource.source_type}
                          </span>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            getDataSourceStatusDisplay(dataSource.status).color === 'green' ? 'bg-green-100 text-green-800' :
                            getDataSourceStatusDisplay(dataSource.status).color === 'blue' ? 'bg-blue-100 text-blue-800' :
                            getDataSourceStatusDisplay(dataSource.status).color === 'red' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {getDataSourceStatusDisplay(dataSource.status).text}
                          </span>
                        </div>
                        
                        <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                          <span>{dataSource.file_count} 个文件</span>
                          <span>{formatFileSize(dataSource.total_size)}</span>
                          <span>{new Date(dataSource.created_at).toLocaleDateString()}</span>
                        </div>
                        
                        {dataSource.description && (
                          <p className="mt-1 text-xs text-gray-500">{dataSource.description}</p>
                        )}
                        
                        {/* Library信息展示 */}
                        {dataSource.library_info && (
                          <div className="mt-2 p-2 bg-blue-50 rounded-md">
                            <div className="flex items-center space-x-2">
                              <DatabaseIcon className="h-4 w-4 text-blue-500" />
                              <span className="text-sm font-medium text-blue-700">
                                文件库: {dataSource.library_info.name}
                              </span>
                            </div>
                            <div className="mt-1 text-xs text-blue-600">
                              {dataSource.library_info.data_type} • {dataSource.library_info.total_size} • 
                              已处理: {dataSource.library_info.processed_count}/{dataSource.library_info.file_count}
                            </div>
                            {dataSource.library_info.tags.length > 0 && (
                              <div className="mt-1 flex flex-wrap gap-1">
                                {dataSource.library_info.tags.map((tag, index) => (
                                  <span key={index} className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <DatabaseIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">暂无数据源</h3>
                <p className="mt-1 text-sm text-gray-500">
                  点击"添加数据源"来添加现有数据源到项目
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'files' && (
          <div>
            {/* 搜索和筛选 */}
            <div className="flex items-center space-x-4 mb-6">
              <div className="flex-1 relative">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="搜索文件名称..."
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
            
            {/* 文件列表 */}
            <div className="space-y-3">
              {filteredProjectRawData.map((file) => (
                <div key={file.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <div className="flex-shrink-0 mt-1">
                        {getFileTypeIcon(file.file_type as FileType, file.file_category)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <h4 className="text-sm font-medium text-gray-900 truncate">
                            {file.original_filename || file.filename}
                          </h4>
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {file.file_category_display}
                          </span>
                        </div>
                        
                        <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                          <span>{formatFileSize(file.file_size)}</span>
                          <span>{new Date(file.upload_at).toLocaleDateString()}</span>
                        </div>
                        
                        {/* 数据源信息 */}
                        {file.data_source_info && (
                          <div className="mt-2 flex items-center space-x-2 text-xs text-gray-500">
                            {getDataSourceTypeIcon(file.data_source_info.source_type)}
                            <span>来源: {file.data_source_info.name}</span>
                            {file.data_source_info.library_info && (
                              <span className="text-blue-600">• {file.data_source_info.library_info.name}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* 操作按钮 */}
                    <div className="flex items-center space-x-2 ml-4">
                      {file.is_supported_preview && (
                        <button
                          onClick={() => handlePreviewFile(file)}
                          className="inline-flex items-center px-2 py-1 border border-gray-300 rounded text-xs font-medium text-gray-700 bg-white hover:bg-gray-50"
                        >
                          <EyeIcon className="h-3 w-3 mr-1" />
                          预览
                        </button>
                      )}
                      
                      <button
                        onClick={() => handleRemoveDataSource(file.id)}
                        className="inline-flex items-center px-2 py-1 border border-red-300 rounded text-xs font-medium text-red-700 bg-white hover:bg-red-50"
                      >
                        <XMarkIcon className="h-3 w-3 mr-1" />
                        移除
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              
              {filteredProjectRawData.length === 0 && (
                <div className="text-center py-12">
                  <DocumentIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">暂无文件</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {fileSearchTerm ? '没有找到匹配的文件' : '点击"添加数据源"来添加文件到项目'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* 添加数据源模态框 */}
      {showAddDataSourceModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">添加文件库到项目</h3>
                  <button
                    onClick={() => setShowAddDataSourceModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
                
                {/* 搜索框 */}
                <div className="mb-4">
                  <div className="relative">
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="搜索可用文件库..."
                      value={fileSearchTerm}
                      onChange={(e) => setFileSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>
                
                {/* 可用Library列表 */}
                <div className="max-h-96 overflow-y-auto space-y-3">
                  {filteredAvailableLibraries.map((library) => (
                    <div key={library.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          <div className="flex-shrink-0 mt-1">
                            <DatabaseIcon className="h-5 w-5 text-blue-500" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <h4 className="text-sm font-medium text-gray-900 truncate">
                                {library.name}
                              </h4>
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {library.data_type}
                              </span>
                            </div>
                            
                            <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                              <span>{library.file_count} 个文件</span>
                              <span>{library.total_size}</span>
                              <span>{new Date(library.created_at).toLocaleDateString()}</span>
                            </div>
                            
                            {library.description && (
                              <p className="mt-1 text-xs text-gray-500 truncate">
                                {library.description}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2 ml-4">
                          <button
                            onClick={() => handleAddDataSource(library.id)}
                            disabled={addingDataSources.has(library.id)}
                            className={`inline-flex items-center px-3 py-1 border border-transparent rounded text-xs font-medium text-white ${
                              addingDataSources.has(library.id) 
                                ? 'bg-gray-400 cursor-not-allowed' 
                                : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
                            }`}
                          >
                            {addingDataSources.has(library.id) ? (
                              <>
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                                添加中...
                              </>
                            ) : (
                              <>
                                <PlusIcon className="h-3 w-3 mr-1" />
                                添加
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {filteredAvailableLibraries.length === 0 && (
                    <div className="text-center py-8">
                      <DatabaseIcon className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">暂无可用Library</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        {fileSearchTerm ? '没有找到匹配的Library' : '暂无可用的文件库'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  onClick={() => setShowAddDataSourceModal(false)}
                  className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
                    {getFileTypeIcon(selectedFile.file_type as FileType, selectedFile.file_category)}
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
                    <XMarkIcon className="h-6 w-6" />
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