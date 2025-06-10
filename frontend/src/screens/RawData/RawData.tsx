import React, { useState, useMemo, useEffect, useCallback } from 'react';
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
import { useLibraries, useLibraryActions } from '../../hooks/useLibraries';
import { LibraryService } from '../../services/library.service';
import { Library, LibraryFile } from '../../types/library';
import { dataTypeLabels } from '../../lib/config';

type View = 'list' | 'create' | 'details';

// 将字符串大小转换为字节数
const parseSizeToBytes = (sizeStr: string): number => {
  if (!sizeStr || sizeStr === '0 B') return 0;
  
  const match = sizeStr.match(/^([\d.]+)\s*([KMGT]?B?)$/i);
  if (!match) return 0;
  
  const value = parseFloat(match[1]);
  const unit = match[2].toUpperCase();
  
  const multipliers: { [key: string]: number } = {
    'B': 1,
    'KB': 1024,
    'MB': 1024 * 1024,
    'GB': 1024 * 1024 * 1024,
    'TB': 1024 * 1024 * 1024 * 1024
  };
  
  return value * (multipliers[unit] || 1);
};

// 格式化字节数为易读格式
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
};

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
    loading: actionLoading, 
    error: actionError, 
    deleteLibrary 
  } = useLibraryActions();

  // 获取所有libraries的准确文件统计信息
  const [allLibraryFiles, setAllLibraryFiles] = useState<{[libraryId: string]: LibraryFile[]}>({});
  const [filesLoading, setFilesLoading] = useState(false);
  const [filesError, setFilesError] = useState<string | null>(null);

  const fetchAllLibraryFiles = useCallback(async () => {
    if (!libraries || libraries.length === 0) {
      setAllLibraryFiles({});
      return;
    }

    setFilesLoading(true);
    setFilesError(null);
    const filesMap: {[libraryId: string]: LibraryFile[]} = {};

    try {
      // 并行获取所有libraries的文件列表
      const filePromises = libraries.map(async (library) => {
        try {
          const result = await LibraryService.getLibraryFiles(library.id);
          filesMap[library.id] = result.files;
        } catch (error) {
          console.error(`获取文件库 ${library.name} 的文件列表失败:`, error);
          filesMap[library.id] = [];
        }
      });

      await Promise.all(filePromises);
      setAllLibraryFiles(filesMap);
    } catch (error) {
      setFilesError('获取文件统计信息失败');
      console.error('获取文件统计信息失败:', error);
    } finally {
      setFilesLoading(false);
    }
  }, [libraries]);

  // 当libraries变化时，重新获取文件统计信息
  useEffect(() => {
    fetchAllLibraryFiles();
  }, [fetchAllLibraryFiles]);

  // 基于实际文件数据计算统计信息
  const calculatedStatistics = useMemo(() => {
    if (!libraries || libraries.length === 0) {
      return {
        total_libraries: 0,
        total_files: 0,
        total_processed: 0,
        total_size: '0 B',
        conversion_rate: 0
      };
    }

    const totalLibraries = libraries.length;
    
    // 基于实际文件数据计算统计信息
    let totalFiles = 0;
    let totalProcessed = 0;
    let totalProcessing = 0;
    let totalPending = 0;
    let totalFailed = 0;
    let totalSizeBytes = 0;

    libraries.forEach(library => {
      const libraryFiles = allLibraryFiles[library.id] || [];
      
      // 计算文件数量
      totalFiles += libraryFiles.length;
      
      // 计算文件大小
      totalSizeBytes += libraryFiles.reduce((sum, file) => sum + (file.file_size || 0), 0);
      
      // 按状态统计文件
      libraryFiles.forEach(file => {
        switch (file.process_status) {
          case 'completed':
            totalProcessed++;
            break;
          case 'processing':
            totalProcessing++;
            break;
          case 'pending':
            totalPending++;
            break;
          case 'failed':
            totalFailed++;
            break;
        }
      });
    });

    const totalSize = formatBytes(totalSizeBytes);
    const conversionRate = totalFiles > 0 ? Math.round((totalProcessed / totalFiles) * 100) : 0;

    return {
      total_libraries: totalLibraries,
      total_files: totalFiles,
      total_processed: totalProcessed,
      total_processing: totalProcessing,
      total_pending: totalPending,
      total_failed: totalFailed,
      total_size: totalSize,
      conversion_rate: conversionRate
    };
  }, [libraries, allLibraryFiles]);

  // 计算单个library的准确统计信息
  const getLibraryStats = useCallback((library: Library) => {
    const libraryFiles = allLibraryFiles[library.id] || [];
    
    const stats = {
      file_count: libraryFiles.length,
      processed_count: 0,
      processing_count: 0,
      pending_count: 0,
      failed_count: 0,
      md_count: 0,
      total_size_bytes: 0
    };

    libraryFiles.forEach(file => {
      // 统计文件状态
      switch (file.process_status) {
        case 'completed':
          stats.processed_count++;
          // 如果转换格式为markdown，计入MD文件数
          if (file.converted_format === 'markdown') {
            stats.md_count++;
          }
          break;
        case 'processing':
          stats.processing_count++;
          break;
        case 'pending':
          stats.pending_count++;
          break;
        case 'failed':
          stats.failed_count++;
          break;
      }
      
      // 累计文件大小
      stats.total_size_bytes += file.file_size || 0;
    });

    return {
      ...stats,
      total_size: formatBytes(stats.total_size_bytes),
      progress_percentage: stats.file_count > 0 
        ? Math.round((stats.processed_count / stats.file_count) * 100) 
        : 0
    };
  }, [allLibraryFiles]);

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
        fetchAllLibraryFiles(); // 删除成功后刷新文件统计信息
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
    fetchAllLibraryFiles(); // 同时刷新文件统计信息
  };

  if (view === 'create') {
    return <CreateLibrary 
      onBack={() => setView('list')} 
      onSuccess={() => {
        setView('list');
        refreshLibraries();
        fetchAllLibraryFiles(); // 创建成功后刷新文件统计信息
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
        <h1 className="text-[28px] font-bold leading-8 text-[#0c141c] mb-2">{t('rawData.libraryManagement')}</h1>
        <p className="text-[#4f7096] mb-4">管理多源异构数据，支持批量转换为MD，用于大模型训练和数据蒸馏</p>
        <div className="flex gap-2">
          <Button
            size="sm"
            className="h-9 px-4 bg-[#1977e5] hover:bg-[#1977e5]/90"
            onClick={() => setView('create')}
            disabled={actionLoading}
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            {t('rawData.createLibrary')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-9 px-4 border-[#d1dbe8] text-[#4f7096] hover:bg-[#e8edf2]"
            onClick={handleRefresh}
            disabled={librariesLoading || filesLoading}
          >
            {(librariesLoading || filesLoading) ? (
              <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCwIcon className="w-4 h-4 mr-2" />
            )}
            {t('rawData.refreshData')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-9 px-4 border-[#d1dbe8] text-[#4f7096] hover:bg-[#e8edf2]"
          >
            <Settings2Icon className="w-4 h-4 mr-2" />
            {t('rawData.conversionSettings')}
          </Button>
        </div>
      </div>

      {/* 错误提示 */}
      {(librariesError || actionError || filesError) && (
        <Card className="border-red-200 bg-red-50 p-4 mb-6">
          <div className="text-red-600">
            {librariesError || actionError || filesError}
          </div>
        </Card>
      )}

      {/* 数据统计面板 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Card className="border-[#d1dbe8] bg-white p-4">
          <div className="flex items-center">
            <FolderIcon className="w-8 h-8 text-[#1977e5] mr-3" />
            <div>
              <p className="text-sm text-[#4f7096]">{t('rawData.totalLibraries')}</p>
              <p className="text-xl font-bold text-[#0c141c]">
                {(librariesLoading || filesLoading) ? '...' : calculatedStatistics.total_libraries}
              </p>
            </div>
          </div>
        </Card>
        
        <Card className="border-[#d1dbe8] bg-white p-4">
          <div className="flex items-center">
            <FileTextIcon className="w-8 h-8 text-[#10b981] mr-3" />
            <div>
              <p className="text-sm text-[#4f7096]">{t('rawData.totalFiles')}</p>
              <p className="text-xl font-bold text-[#0c141c]">
                {(librariesLoading || filesLoading) ? '...' : calculatedStatistics.total_files}
              </p>
            </div>
          </div>
        </Card>
        
        <Card className="border-[#d1dbe8] bg-white p-4">
          <div className="flex items-center">
            <CheckCircleIcon className="w-8 h-8 text-[#10b981] mr-3" />
            <div>
              <p className="text-sm text-[#4f7096]">{t('rawData.processed')}</p>
              <p className="text-xl font-bold text-[#0c141c]">
                {(librariesLoading || filesLoading) ? '...' : calculatedStatistics.total_processed}
              </p>
            </div>
          </div>
        </Card>
        
        <Card className="border-[#d1dbe8] bg-white p-4">
          <div className="flex items-center">
            <TrendingUpIcon className="w-8 h-8 text-[#8b5cf6] mr-3" />
            <div>
              <p className="text-sm text-[#4f7096]">{t('rawData.conversionRate')}</p>
              <p className="text-xl font-bold text-[#0c141c]">
                {(librariesLoading || filesLoading) ? '...' : `${calculatedStatistics.conversion_rate}%`}
              </p>
            </div>
          </div>
        </Card>
        
        <Card className="border-[#d1dbe8] bg-white p-4">
          <div className="flex items-center">
            <AlertCircleIcon className="w-8 h-8 text-[#f59e0b] mr-3" />
            <div>
              <p className="text-sm text-[#4f7096]">{t('rawData.totalSize')}</p>
              <p className="text-xl font-bold text-[#0c141c]">
                {(librariesLoading || filesLoading) ? '...' : calculatedStatistics.total_size}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* 数据库列表 */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[22px] font-bold leading-7 text-[#0c141c]">{t('rawData.libraryList')}</h2>
          <div className="text-sm text-[#4f7096]">
            {librariesLoading ? t('datasets.loading') : `共 ${libraries.length} 个数据库`}
          </div>
        </div>
        
        <Card className="border-[#d1dbe8] bg-white">
          {librariesLoading ? (
            <div className="p-8 text-center">
              <Loader2Icon className="w-8 h-8 animate-spin mx-auto mb-4 text-[#1977e5]" />
              <p className="text-[#4f7096]">{t('datasets.loading')}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-[#d1dbe8] hover:bg-transparent">
                  <TableHead className="text-[#4f7096] font-medium">{t('rawData.libraryInfo')}</TableHead>
                  <TableHead className="text-[#4f7096] font-medium w-[120px]">{t('rawData.dataType')}</TableHead>
                  <TableHead className="text-[#4f7096] font-medium w-[140px]">{t('rawData.processingProgress')}</TableHead>
                  <TableHead className="text-[#4f7096] font-medium w-[100px]">{t('rawData.fileCount')}</TableHead>
                  <TableHead className="text-[#4f7096] font-medium w-[100px]">{t('rawData.totalSize')}</TableHead>
                  <TableHead className="text-[#4f7096] font-medium w-[120px]">{t('rawData.lastUpdated')}</TableHead>
                  <TableHead className="text-[#4f7096] font-medium w-[80px]">{t('rawData.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {libraries.map((library) => {
                  const libraryStats = getLibraryStats(library);
                  
                  return (
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
                            {libraryStats.progress_percentage}%
                          </span>
                        </div>
                        <div className="w-full bg-[#e8edf2] rounded-full h-1.5">
                          <div 
                            className="bg-[#10b981] h-1.5 rounded-full" 
                            style={{ 
                              width: `${libraryStats.progress_percentage}%` 
                            }}
                          ></div>
                        </div>
                        <div className="flex justify-between text-xs text-[#4f7096]">
                          <span>已处理: {libraryStats.processed_count}</span>
                          <span>处理中: {libraryStats.processing_count}</span>
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell className="py-4">
                      <div className="text-center">
                        <div className="text-[#0c141c] font-medium">{libraryStats.file_count}</div>
                        <div className="text-xs text-[#4f7096]">MD: {libraryStats.md_count}</div>
                      </div>
                    </TableCell>
                    
                    <TableCell className="py-4 text-[#4f7096]">{libraryStats.total_size}</TableCell>
                    
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
                            <span>{t('rawData.viewDetails')}</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="cursor-pointer text-[#0c141c]"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Settings2Icon className="mr-2 h-4 w-4" />
                            <span>{t('rawData.editSettings')}</span>
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
                            <span>{t('rawData.delete')}</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )})}
                {libraries.length === 0 && !librariesLoading && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-[#4f7096]">
                      {t('rawData.noLibrariesMessage')}
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