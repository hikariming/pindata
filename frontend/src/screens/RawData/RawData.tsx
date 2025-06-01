import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { 
  FolderIcon, 
  PlusIcon, 
  MoreVerticalIcon, 
  EyeIcon, 
  TrashIcon,
  FileTextIcon,
  TrendingUpIcon,
  ClockIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  Settings2Icon,
  Loader2Icon,
  RefreshCwIcon
} from 'lucide-react';
import { CreateLibrary } from './CreateLibrary';
import { LibraryDetails } from './LibraryDetails';

// 导入API相关
import { useLibraries, useLibraryStatistics, useLibraryActions } from '../../hooks/useLibraries';
import { Library } from '../../types/library';
import { dataTypeLabels } from '../../lib/config';

type View = 'list' | 'create' | 'details';

export const RawData = (): JSX.Element => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [view, setView] = useState<View>('list');
  const [selectedLibrary, setSelectedLibrary] = useState<Library | null>(null);
  
  // 使用API Hooks
  const { 
    libraries, 
    pagination, 
    loading: librariesLoading, 
    error: librariesError, 
    refresh: refreshLibraries 
  } = useLibraries();
  
  const { 
    statistics, 
    loading: statisticsLoading, 
    error: statisticsError, 
    refresh: refreshStatistics 
  } = useLibraryStatistics();
  
  const { 
    loading: actionLoading, 
    error: actionError, 
    deleteLibrary 
  } = useLibraryActions();

  const handleViewLibrary = (library: Library) => {
    setSelectedLibrary(library);
    setView('details');
  };

  const handleFileSelect = (file: any) => {
    navigate(`/rawdata/file/${file.id}`);
  };

  const handleDeleteLibrary = async (library: Library) => {
    if (window.confirm(`确定要删除文件库 "${library.name}" 吗？此操作不可撤销。`)) {
      const success = await deleteLibrary(library.id);
      if (success) {
        refreshLibraries();
        refreshStatistics();
      }
    }
  };

  const getDataTypeColor = (dataType: Library['data_type']) => {
    switch (dataType) {
      case 'training':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'evaluation':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'mixed':
        return 'text-purple-600 bg-purple-50 border-purple-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getDataTypeLabel = (dataType: Library['data_type']) => {
    return dataTypeLabels[dataType] || dataType;
  };

  const handleRefresh = () => {
    refreshLibraries();
    refreshStatistics();
  };

  if (view === 'create') {
    return <CreateLibrary 
      onBack={() => setView('list')} 
      onSuccess={() => {
        setView('list');
        refreshLibraries();
        refreshStatistics();
      }}
    />;
  }

  if (view === 'details' && selectedLibrary) {
    return (
      <LibraryDetails 
        onBack={() => setView('list')} 
        library={selectedLibrary}
        onFileSelect={handleFileSelect}
      />
    );
  }

  return (
    <div className="w-full max-w-[1400px] p-6">
      {/* 页面标题和操作按钮 */}
      <div className="mb-6">
        <h1 className="text-[28px] font-bold leading-8 text-[#0c141c] mb-2">训练数据管理</h1>
        <p className="text-[#4f7096] mb-4">管理多源异构数据，批量转换为Markdown格式，用于大模型训练和数据蒸馏</p>
        <div className="flex gap-2">
          <Button
            size="sm"
            className="h-9 px-4 bg-[#1977e5] hover:bg-[#1977e5]/90"
            onClick={() => setView('create')}
            disabled={actionLoading}
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            创建数据库
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-9 px-4 border-[#d1dbe8] text-[#4f7096] hover:bg-[#e8edf2]"
            onClick={handleRefresh}
            disabled={librariesLoading || statisticsLoading}
          >
            {(librariesLoading || statisticsLoading) ? (
              <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCwIcon className="w-4 h-4 mr-2" />
            )}
            刷新数据
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-9 px-4 border-[#d1dbe8] text-[#4f7096] hover:bg-[#e8edf2]"
          >
            <Settings2Icon className="w-4 h-4 mr-2" />
            转换设置
          </Button>
        </div>
      </div>

      {/* 错误提示 */}
      {(librariesError || statisticsError || actionError) && (
        <Card className="border-red-200 bg-red-50 p-4 mb-6">
          <div className="text-red-600">
            {librariesError || statisticsError || actionError}
          </div>
        </Card>
      )}

      {/* 数据统计面板 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Card className="border-[#d1dbe8] bg-white p-4">
          <div className="flex items-center">
            <FolderIcon className="w-8 h-8 text-[#1977e5] mr-3" />
            <div>
              <p className="text-sm text-[#4f7096]">数据库总数</p>
              <p className="text-xl font-bold text-[#0c141c]">
                {statisticsLoading ? '...' : (statistics?.total_libraries || 0)}
              </p>
            </div>
          </div>
        </Card>
        
        <Card className="border-[#d1dbe8] bg-white p-4">
          <div className="flex items-center">
            <FileTextIcon className="w-8 h-8 text-[#10b981] mr-3" />
            <div>
              <p className="text-sm text-[#4f7096]">文件总数</p>
              <p className="text-xl font-bold text-[#0c141c]">
                {statisticsLoading ? '...' : (statistics?.total_files || 0)}
              </p>
            </div>
          </div>
        </Card>
        
        <Card className="border-[#d1dbe8] bg-white p-4">
          <div className="flex items-center">
            <CheckCircleIcon className="w-8 h-8 text-[#10b981] mr-3" />
            <div>
              <p className="text-sm text-[#4f7096]">已处理</p>
              <p className="text-xl font-bold text-[#0c141c]">
                {statisticsLoading ? '...' : (statistics?.total_processed || 0)}
              </p>
            </div>
          </div>
        </Card>
        
        <Card className="border-[#d1dbe8] bg-white p-4">
          <div className="flex items-center">
            <TrendingUpIcon className="w-8 h-8 text-[#8b5cf6] mr-3" />
            <div>
              <p className="text-sm text-[#4f7096]">转换率</p>
              <p className="text-xl font-bold text-[#0c141c]">
                {statisticsLoading ? '...' : `${statistics?.conversion_rate || 0}%`}
              </p>
            </div>
          </div>
        </Card>
        
        <Card className="border-[#d1dbe8] bg-white p-4">
          <div className="flex items-center">
            <AlertCircleIcon className="w-8 h-8 text-[#f59e0b] mr-3" />
            <div>
              <p className="text-sm text-[#4f7096]">总大小</p>
              <p className="text-xl font-bold text-[#0c141c]">
                {statisticsLoading ? '...' : (statistics?.total_size || '0 B')}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* 数据库列表 */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[22px] font-bold leading-7 text-[#0c141c]">数据库列表</h2>
          <div className="text-sm text-[#4f7096]">
            {librariesLoading ? '加载中...' : `共 ${libraries.length} 个数据库`}
          </div>
        </div>
        
        <Card className="border-[#d1dbe8] bg-white">
          {librariesLoading ? (
            <div className="p-8 text-center">
              <Loader2Icon className="w-8 h-8 animate-spin mx-auto mb-4 text-[#1977e5]" />
              <p className="text-[#4f7096]">加载文件库列表中...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-[#d1dbe8] hover:bg-transparent">
                  <TableHead className="text-[#4f7096] font-medium">数据库信息</TableHead>
                  <TableHead className="text-[#4f7096] font-medium w-[120px]">数据类型</TableHead>
                  <TableHead className="text-[#4f7096] font-medium w-[140px]">处理进度</TableHead>
                  <TableHead className="text-[#4f7096] font-medium w-[100px]">文件数量</TableHead>
                  <TableHead className="text-[#4f7096] font-medium w-[100px]">总大小</TableHead>
                  <TableHead className="text-[#4f7096] font-medium w-[120px]">最后更新</TableHead>
                  <TableHead className="text-[#4f7096] font-medium w-[80px]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {libraries.map((library) => (
                  <TableRow 
                    key={library.id} 
                    className="border-[#d1dbe8] hover:bg-[#f7f9fc] cursor-pointer"
                    onClick={() => handleViewLibrary(library)}
                  >
                    <TableCell className="py-4">
                      <div className="flex items-start">
                        <FolderIcon className="w-5 h-5 mr-3 text-[#1977e5] mt-0.5" />
                        <div>
                          <div className="font-medium text-[#0c141c] mb-1">{library.name}</div>
                          <div className="text-sm text-[#4f7096] mb-2">{library.description}</div>
                          <div className="flex gap-1">
                            {library.tags.map((tag, index) => (
                              <span 
                                key={index}
                                className="inline-block px-2 py-0.5 text-xs bg-[#e8edf2] text-[#4f7096] rounded"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell className="py-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium border ${getDataTypeColor(library.data_type)}`}>
                        {getDataTypeLabel(library.data_type)}
                      </span>
                    </TableCell>
                    
                    <TableCell className="py-4">
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-[#4f7096]">已完成</span>
                          <span className="text-[#0c141c] font-medium">
                            {library.file_count > 0 
                              ? Math.round((library.processed_count / library.file_count) * 100)
                              : 0}%
                          </span>
                        </div>
                        <div className="w-full bg-[#e8edf2] rounded-full h-1.5">
                          <div 
                            className="bg-[#10b981] h-1.5 rounded-full" 
                            style={{ 
                              width: `${library.file_count > 0 
                                ? (library.processed_count / library.file_count) * 100 
                                : 0}%` 
                            }}
                          ></div>
                        </div>
                        <div className="flex justify-between text-xs text-[#4f7096]">
                          <span>已处理: {library.processed_count}</span>
                          <span>处理中: {library.processing_count}</span>
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell className="py-4">
                      <div className="text-center">
                        <div className="text-[#0c141c] font-medium">{library.file_count}</div>
                        <div className="text-xs text-[#4f7096]">MD: {library.md_count}</div>
                      </div>
                    </TableCell>
                    
                    <TableCell className="py-4 text-[#4f7096]">{library.total_size}</TableCell>
                    
                    <TableCell className="py-4">
                      <div className="flex items-center text-[#4f7096]">
                        <ClockIcon className="w-3 h-3 mr-1" />
                        {library.last_updated}
                      </div>
                    </TableCell>
                    
                    <TableCell className="py-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-[#e8edf2]">
                            <MoreVerticalIcon className="h-4 w-4 text-[#4f7096]" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[160px]">
                          <DropdownMenuItem
                            className="cursor-pointer text-[#0c141c]"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewLibrary(library);
                            }}
                          >
                            <EyeIcon className="mr-2 h-4 w-4" />
                            <span>查看详情</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="cursor-pointer text-[#0c141c]"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Settings2Icon className="mr-2 h-4 w-4" />
                            <span>编辑设置</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="cursor-pointer text-red-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteLibrary(library);
                            }}
                            disabled={actionLoading}
                          >
                            <TrashIcon className="mr-2 h-4 w-4" />
                            <span>删除</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {libraries.length === 0 && !librariesLoading && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-[#4f7096]">
                      暂无文件库数据，点击"创建数据库"开始添加
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    </div>
  );
};