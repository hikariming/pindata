import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import {
  Search,
  Filter,
  FileText,
  Image,
  RefreshCw,
  CheckCircle,
  Clock,
  Tag
} from 'lucide-react';
import { enhancedDatasetService } from '../../services/enhanced-dataset.service';

interface FileSelectorProps {
  datasetId: number;
  selectedFileIds: string[];
  onSelectionChange: (fileIds: string[]) => void;
  excludeVersionId?: string;
  maxSelection?: number;
  inline?: boolean; // 新增：是否内嵌模式（不显示Dialog包装）
}

interface AvailableFile {
  id: string;
  filename: string;
  file_type: string;
  file_size: number;
  file_size_formatted: string;
  checksum: string;
  version_info: {
    version: string;
    is_default: boolean;
    created_at: string;
  };
}

export const FileSelector: React.FC<FileSelectorProps> = ({
  datasetId,
  selectedFileIds,
  onSelectionChange,
  excludeVersionId,
  maxSelection,
  inline = false
}) => {
  const [files, setFiles] = useState<AvailableFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);
  const [typeStats, setTypeStats] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    if (isDialogOpen || inline) {
      loadFiles();
    }
  }, [datasetId, currentPage, filterType, searchTerm, isDialogOpen, inline]);

  const loadFiles = async () => {
    try {
      setLoading(true);
      const result = await enhancedDatasetService.getAvailableFiles(datasetId, {
        excludeVersionId,
        fileType: filterType === 'all' ? undefined : filterType,
        search: searchTerm || undefined,
        page: currentPage,
        pageSize: 20
      });
      
      setFiles(result.files);
      setPagination(result.pagination);
      setTypeStats(result.type_statistics);
    } catch (error) {
      console.error('加载可用文件失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (fileId: string) => {
    const newSelection = [...selectedFileIds];
    const index = newSelection.indexOf(fileId);
    
    if (index >= 0) {
      // 取消选择
      newSelection.splice(index, 1);
    } else {
      // 选择文件
      if (maxSelection && newSelection.length >= maxSelection) {
        alert(`最多只能选择 ${maxSelection} 个文件`);
        return;
      }
      newSelection.push(fileId);
    }
    
    onSelectionChange(newSelection);
  };

  const handleSelectAll = () => {
    const currentPageFileIds = files.map(f => f.id);
    const allSelected = currentPageFileIds.every(id => selectedFileIds.includes(id));
    
    if (allSelected) {
      // 取消当前页所有选择
      const newSelection = selectedFileIds.filter(id => !currentPageFileIds.includes(id));
      onSelectionChange(newSelection);
    } else {
      // 选择当前页所有文件
      const newIds = currentPageFileIds.filter(id => !selectedFileIds.includes(id));
      
      if (maxSelection && selectedFileIds.length + newIds.length > maxSelection) {
        const remainingSlots = maxSelection - selectedFileIds.length;
        if (remainingSlots > 0) {
          onSelectionChange([...selectedFileIds, ...newIds.slice(0, remainingSlots)]);
        }
        alert(`最多只能选择 ${maxSelection} 个文件`);
      } else {
        onSelectionChange([...selectedFileIds, ...newIds]);
      }
    }
  };

  const clearSelection = () => {
    onSelectionChange([]);
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType.toLowerCase()) {
      case 'image':
        return <Image className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getVersionBadgeVariant = (versionInfo: any) => {
    if (versionInfo.is_default) return 'default';
    return 'secondary';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN');
  };

  // 文件选择器的主要内容
  const selectorContent = (
    <div className="flex flex-col space-y-4 h-96 overflow-hidden">
      {/* 工具栏 */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="搜索文件名..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-10"
          />
        </div>
        
        <Select value={filterType} onValueChange={(value) => {
          setFilterType(value);
          setCurrentPage(1);
        }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="文件类型" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部类型</SelectItem>
            {typeStats.map(stat => (
              <SelectItem key={stat.file_type} value={stat.file_type}>
                {stat.file_type} ({stat.count})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm" onClick={loadFiles}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* 选择统计 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Checkbox
            checked={files.length > 0 && files.every(f => selectedFileIds.includes(f.id))}
            onCheckedChange={handleSelectAll}
          />
          <span className="text-sm text-gray-600">
            已选择 {selectedFileIds.length} 个文件
            {pagination && ` (当前页 ${files.filter(f => selectedFileIds.includes(f.id)).length}/${files.length})`}
            {maxSelection && ` / 最多 ${maxSelection}`}
          </span>
        </div>
        
        {selectedFileIds.length > 0 && (
          <Button variant="outline" size="sm" onClick={clearSelection}>
            清空选择
          </Button>
        )}
      </div>

      {/* 文件列表 */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {loading ? (
          <div className="text-center py-8">加载中...</div>
        ) : files.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            暂无可选文件
          </div>
        ) : (
          files.map((file) => (
            <Card key={file.id} className="p-3">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={selectedFileIds.includes(file.id)}
                  onCheckedChange={() => handleFileSelect(file.id)}
                />
                
                {getFileIcon(file.file_type)}
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium truncate">{file.filename}</p>
                    {selectedFileIds.includes(file.id) && (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span>{file.file_type}</span>
                    <span>·</span>
                    <span>{file.file_size_formatted}</span>
                    <span>·</span>
                    <Badge variant={getVersionBadgeVariant(file.version_info)}>
                      {file.version_info.version}
                    </Badge>
                    <span>·</span>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{formatDate(file.version_info.created_at)}</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 font-mono mt-1">
                    {file.checksum.slice(0, 8)}...
                  </p>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* 分页 */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2 border-t">
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

      {/* 底部统计信息 */}
      {!inline && (
        <div className="text-sm text-gray-600 pt-2 border-t">
          {pagination && `总共 ${pagination.total} 个可用文件`}
        </div>
      )}
    </div>
  );

  // 如果是内嵌模式，直接返回内容
  if (inline) {
    return selectorContent;
  }

  // 否则返回带Dialog的完整组件
  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Tag className="w-4 h-4 mr-2" />
          选择现有文件 {selectedFileIds.length > 0 && `(${selectedFileIds.length})`}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>选择现有文件</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden">
          {selectorContent}
        </div>

        {/* 底部操作栏 */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-gray-600">
            {pagination && `总共 ${pagination.total} 个可用文件`}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={() => setIsDialogOpen(false)}>
              确认选择 ({selectedFileIds.length})
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}; 