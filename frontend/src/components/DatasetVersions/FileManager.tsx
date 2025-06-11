import React, { useState, useEffect, useRef } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import { Input } from '../ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import {
  Upload,
  Download,
  Trash2,
  Search,
  Filter,
  FileText,
  Image,
  MoreHorizontal,
  Plus,
  RefreshCw,
  BarChart3,
  Grid,
  List
} from 'lucide-react';
import { enhancedDatasetService } from '../../services/enhanced-dataset.service';
import { EnhancedDatasetVersion } from '../../types/enhanced-dataset';

interface FileManagerProps {
  version: EnhancedDatasetVersion;
  onVersionUpdate?: (version: EnhancedDatasetVersion) => void;
}

interface FileItem {
  id: string;
  filename: string;
  file_type: string;
  file_size: number;
  file_size_formatted: string;
  checksum: string;
  minio_object_name: string;
  created_at: string;
}

export const FileManager: React.FC<FileManagerProps> = ({
  version,
  onVersionUpdate
}) => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadFiles();
  }, [version.id, currentPage, filterType]);

  const loadFiles = async () => {
    try {
      setLoading(true);
      const result = await enhancedDatasetService.getVersionFiles(version.id, {
        fileType: filterType === 'all' ? undefined : filterType,
        page: currentPage,
        pageSize: 20
      });
      
      setFiles(result.files);
      setPagination(result.pagination);
    } catch (error) {
      console.error('加载文件列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAnalytics = async () => {
    try {
      const result = await enhancedDatasetService.getFileAnalytics(version.id);
      setAnalytics(result);
    } catch (error) {
      console.error('加载分析数据失败:', error);
    }
  };

  const handleFileSelect = (fileId: string) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(fileId)) {
      newSelected.delete(fileId);
    } else {
      newSelected.add(fileId);
    }
    setSelectedFiles(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedFiles.size === files.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(files.map(f => f.id)));
    }
  };

  const handleFileUpload = async (uploadFiles: File[]) => {
    if (uploadFiles.length === 0) return;
    
    try {
      setIsUploading(true);
      await enhancedDatasetService.addFilesToVersion(version.id, uploadFiles);
      await loadFiles();
      onVersionUpdate?.(version);
    } catch (error) {
      console.error('文件上传失败:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedFiles.size === 0) return;
    
    try {
      await enhancedDatasetService.batchFileOperations(
        version.id,
        'delete',
        Array.from(selectedFiles)
      );
      setSelectedFiles(new Set());
      await loadFiles();
      onVersionUpdate?.(version);
    } catch (error) {
      console.error('批量删除失败:', error);
    }
  };

  const handleDownloadFile = async (file: FileItem) => {
    try {
      await enhancedDatasetService.downloadSingleFile(file.id);
    } catch (error) {
      console.error('下载文件失败:', error);
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    try {
      await enhancedDatasetService.deleteFileFromVersion(version.id, fileId);
      await loadFiles();
      onVersionUpdate?.(version);
    } catch (error) {
      console.error('删除文件失败:', error);
    }
  };

  const filteredFiles = files.filter(file => {
    if (searchTerm && !file.filename.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    return true;
  });

  const fileTypes = [...new Set(files.map(f => f.file_type))];

  const getFileIcon = (fileType: string) => {
    switch (fileType.toLowerCase()) {
      case 'image':
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return <Image className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* 工具栏 */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-semibold">文件管理</h3>
            <Badge variant="outline">
              {pagination?.total || 0} 个文件
            </Badge>
            <Badge variant="outline">
              {version.total_size_formatted}
            </Badge>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={loadAnalytics}>
              <BarChart3 className="w-4 h-4 mr-2" />
              分析
            </Button>
            <Button variant="outline" size="sm" onClick={loadFiles}>
              <RefreshCw className="w-4 h-4 mr-2" />
              刷新
            </Button>
          </div>
        </div>

        {/* 搜索和过滤 */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="搜索文件名..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="文件类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部类型</SelectItem>
              {fileTypes.map(type => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex border rounded-md">
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* 批量操作 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Checkbox
              checked={selectedFiles.size === filteredFiles.length && filteredFiles.length > 0}
              onCheckedChange={handleSelectAll}
            />
            <span className="text-sm text-gray-600">
              已选择 {selectedFiles.size} / {filteredFiles.length} 个文件
            </span>
          </div>

          <div className="flex gap-2">
            {selectedFiles.size > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBatchDelete}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                删除选中 ({selectedFiles.size})
              </Button>
            )}

            {!version.is_deprecated && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length > 0) {
                      handleFileUpload(files);
                    }
                  }}
                />
                <Button
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {isUploading ? '上传中...' : '添加文件'}
                </Button>
              </>
            )}
          </div>
        </div>
      </Card>

      {/* 文件列表 */}
      {loading ? (
        <Card className="p-6">
          <div className="text-center">加载中...</div>
        </Card>
      ) : (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-2'}>
          {filteredFiles.map((file) => (
            <Card key={file.id} className={viewMode === 'grid' ? 'p-4' : 'p-3'}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <Checkbox
                    checked={selectedFiles.has(file.id)}
                    onCheckedChange={() => handleFileSelect(file.id)}
                  />
                  {getFileIcon(file.file_type)}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{file.filename}</p>
                    <p className="text-sm text-gray-500">
                      {file.file_type} · {file.file_size_formatted}
                    </p>
                    {viewMode === 'list' && (
                      <p className="text-xs text-gray-400 font-mono">
                        {file.checksum.slice(0, 8)}...
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDownloadFile(file)}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  {!version.is_deprecated && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteFile(file.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* 分页 */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!pagination.has_prev}
            onClick={() => setCurrentPage(currentPage - 1)}
          >
            上一页
          </Button>
          <span className="text-sm">
            第 {pagination.current_page} 页，共 {pagination.pages} 页
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={!pagination.has_next}
            onClick={() => setCurrentPage(currentPage + 1)}
          >
            下一页
          </Button>
        </div>
      )}

      {/* 分析对话框 */}
      {analytics && (
        <Dialog>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>文件分析统计</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              {/* 总览 */}
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{analytics.summary.total_files}</div>
                  <div className="text-sm text-gray-600">总文件数</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{analytics.summary.total_size_formatted}</div>
                  <div className="text-sm text-gray-600">总大小</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{analytics.type_statistics.length}</div>
                  <div className="text-sm text-gray-600">文件类型</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {Math.round(analytics.summary.average_file_size / 1024)} KB
                  </div>
                  <div className="text-sm text-gray-600">平均大小</div>
                </div>
              </div>

              {/* 类型统计 */}
              <div>
                <h4 className="font-semibold mb-3">文件类型分布</h4>
                <div className="space-y-2">
                  {analytics.type_statistics.map((stat: any) => (
                    <div key={stat.file_type} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getFileIcon(stat.file_type)}
                        <span>{stat.file_type}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-600">{stat.count} 个文件</span>
                        <span className="text-sm text-gray-600">{stat.total_size_formatted}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 大小分布 */}
              <div>
                <h4 className="font-semibold mb-3">文件大小分布</h4>
                <div className="space-y-2">
                  {analytics.size_distribution.map((item: any) => (
                    <div key={item.range} className="flex items-center justify-between">
                      <span>{item.range}</span>
                      <span className="text-sm text-gray-600">{item.count} 个文件</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}; 