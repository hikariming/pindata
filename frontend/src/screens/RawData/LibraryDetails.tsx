import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  ArrowLeftIcon, 
  FileIcon, 
  UploadIcon, 
  TrashIcon, 
  PlayIcon,
  PauseIcon,
  EyeIcon,
  DownloadIcon,
  RefreshCwIcon,
  FilterIcon,
  SearchIcon,
  FileTextIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  FileImageIcon,
  FileSpreadsheetIcon,
  PresentationIcon,
  SettingsIcon
} from 'lucide-react';
import { Input } from '../../components/ui/input';
import { useNavigate } from 'react-router-dom';
import { FileUpload } from './FileUpload';

interface LibraryDetailsProps {
  onBack: () => void;
  onFileSelect: (file: any) => void;
  library: {
    id: string;
    name: string;
    description?: string;
    fileCount: number;
    lastUpdated: string;
    totalSize: string;
    processedCount: number;
    processingCount: number;
    pendingCount: number;
    mdCount: number;
    dataType: 'training' | 'evaluation' | 'mixed';
    tags: string[];
  };
}

interface LibraryFile {
  id: string;
  name: string;
  type: string;
  size: string;
  uploadDate: string;
  status: 'pending' | 'processing' | 'processed' | 'error';
  conversionProgress?: number;
  errorMessage?: string;
  mdPath?: string;
  extractedText?: string;
  pageCount?: number;
  quality: 'high' | 'medium' | 'low';
}

type FilterStatus = 'all' | 'pending' | 'processing' | 'processed' | 'error';

export const LibraryDetails = ({ onBack, onFileSelect, library }: LibraryDetailsProps): JSX.Element => {
  const { t } = useTranslation();
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const navigate = useNavigate();
  
  const [files] = React.useState<LibraryFile[]>([
    {
      id: '1',
      name: 'AI研究论文合集.pdf',
      type: 'PDF',
      size: '2.5 MB',
      uploadDate: '2024-03-15',
      status: 'processed',
      mdPath: '/md/ai-research.md',
      pageCount: 45,
      quality: 'high'
    },
    {
      id: '2',
      name: '数据分析方法论.docx',
      type: 'DOCX',
      size: '1.8 MB',
      uploadDate: '2024-03-14',
      status: 'processing',
      conversionProgress: 65,
      pageCount: 120,
      quality: 'medium'
    },
    {
      id: '3',
      name: '机器学习算法对比.xlsx',
      type: 'XLSX',
      size: '3.2 MB',
      uploadDate: '2024-03-13',
      status: 'pending',
      quality: 'high'
    },
    {
      id: '4',
      name: '深度学习应用案例.pptx',
      type: 'PPTX',
      size: '5.7 MB',
      uploadDate: '2024-03-12',
      status: 'error',
      errorMessage: '文件格式不支持或损坏',
      quality: 'low'
    },
    {
      id: '5',
      name: '神经网络架构设计.pdf',
      type: 'PDF',
      size: '4.1 MB',
      uploadDate: '2024-03-11',
      status: 'processed',
      mdPath: '/md/neural-networks.md',
      pageCount: 78,
      quality: 'high'
    }
  ]);

  const getStatusColor = (status: LibraryFile['status']) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'processing':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'processed':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200';
    }
  };

  const getStatusLabel = (status: LibraryFile['status']) => {
    switch (status) {
      case 'pending':
        return '等待处理';
      case 'processing':
        return '处理中';
      case 'processed':
        return '已完成';
      case 'error':
        return '失败';
    }
  };

  const getFileIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'pdf':
        return <FileTextIcon className="w-4 h-4 text-red-500" />;
      case 'docx':
      case 'doc':
        return <FileTextIcon className="w-4 h-4 text-blue-500" />;
      case 'xlsx':
      case 'xls':
        return <FileSpreadsheetIcon className="w-4 h-4 text-green-500" />;
      case 'pptx':
      case 'ppt':
        return <PresentationIcon className="w-4 h-4 text-orange-500" />;
      case 'png':
      case 'jpg':
      case 'jpeg':
        return <FileImageIcon className="w-4 h-4 text-purple-500" />;
      default:
        return <FileIcon className="w-4 h-4 text-gray-500" />;
    }
  };

  const getQualityColor = (quality: LibraryFile['quality']) => {
    switch (quality) {
      case 'high':
        return 'text-green-600';
      case 'medium':
        return 'text-yellow-600';
      case 'low':
        return 'text-red-600';
    }
  };

  const getQualityLabel = (quality: LibraryFile['quality']) => {
    switch (quality) {
      case 'high':
        return '高';
      case 'medium':
        return '中';
      case 'low':
        return '低';
    }
  };

  const filteredFiles = files.filter(file => {
    const matchesSearch = file.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || file.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const toggleSelectAll = () => {
    if (selectedFiles.size === filteredFiles.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(filteredFiles.map(file => file.id)));
    }
  };

  const toggleFileSelection = (fileId: string) => {
    const newSelectedFiles = new Set(selectedFiles);
    if (selectedFiles.has(fileId)) {
      newSelectedFiles.delete(fileId);
    } else {
      newSelectedFiles.add(fileId);
    }
    setSelectedFiles(newSelectedFiles);
  };

  const handleBatchProcess = () => {
    setIsProcessing(true);
    console.log('批量处理文件:', Array.from(selectedFiles));
    // 模拟处理过程
    setTimeout(() => {
      setIsProcessing(false);
      setSelectedFiles(new Set());
    }, 3000);
  };

  const handleRetryFailed = () => {
    const failedFiles = files.filter(f => f.status === 'error').map(f => f.id);
    console.log('重试失败文件:', failedFiles);
  };

  const statusCounts = {
    all: files.length,
    pending: files.filter(f => f.status === 'pending').length,
    processing: files.filter(f => f.status === 'processing').length,
    processed: files.filter(f => f.status === 'processed').length,
    error: files.filter(f => f.status === 'error').length,
  };

  const handleFileSelect = (file: LibraryFile) => {
    navigate(`/rawdata/file/${file.id}`);
  };

  const handleFileUpload = (uploadedFiles: File[]) => {
    console.log('上传的文件:', uploadedFiles);
    // 这里处理文件上传逻辑
    setShowUpload(false);
    // 可以添加上传后刷新文件列表的逻辑
  };

  return (
    <div className="w-full max-w-[1400px] p-6">
      <Button
        variant="ghost"
        className="mb-6 text-[#4f7096] hover:text-[#0c141c] hover:bg-[#e8edf2]"
        onClick={onBack}
      >
        <ArrowLeftIcon className="w-4 h-4 mr-2" />
        返回列表
      </Button>

      {/* 库信息头部 */}
      <div className="mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-[26px] font-bold leading-8 text-[#0c141c] mb-2">
              {library.name}
            </h2>
            <p className="text-[#4f7096] mb-3">{library.description}</p>
            <div className="flex flex-wrap gap-2 mb-2">
              {library.tags.map((tag, index) => (
                <span 
                  key={index}
                  className="inline-block px-2 py-1 text-xs bg-[#e8edf2] text-[#4f7096] rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="border-[#d1dbe8]">
              <SettingsIcon className="w-4 h-4 mr-2" />
              库设置
            </Button>
          </div>
        </div>

        {/* 统计信息 */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
          <Card className="border-[#d1dbe8] bg-white p-3">
            <div className="text-center">
              <div className="text-lg font-bold text-[#0c141c]">{library.fileCount}</div>
              <div className="text-xs text-[#4f7096]">总文件</div>
            </div>
          </Card>
          <Card className="border-[#d1dbe8] bg-white p-3">
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">{library.processedCount}</div>
              <div className="text-xs text-[#4f7096]">已完成</div>
            </div>
          </Card>
          <Card className="border-[#d1dbe8] bg-white p-3">
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600">{library.processingCount}</div>
              <div className="text-xs text-[#4f7096]">处理中</div>
            </div>
          </Card>
          <Card className="border-[#d1dbe8] bg-white p-3">
            <div className="text-center">
              <div className="text-lg font-bold text-yellow-600">{library.pendingCount}</div>
              <div className="text-xs text-[#4f7096]">等待中</div>
            </div>
          </Card>
          <Card className="border-[#d1dbe8] bg-white p-3">
            <div className="text-center">
              <div className="text-lg font-bold text-[#1977e5]">{library.mdCount}</div>
              <div className="text-xs text-[#4f7096]">MD文件</div>
            </div>
          </Card>
          <Card className="border-[#d1dbe8] bg-white p-3">
            <div className="text-center">
              <div className="text-lg font-bold text-[#0c141c]">{library.totalSize}</div>
              <div className="text-xs text-[#4f7096]">总大小</div>
            </div>
          </Card>
        </div>

        {/* 操作栏 */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2">
            {selectedFiles.size > 0 && (
              <>
                <Button 
                  variant="outline" 
                  className={`border-[#d1dbe8] text-[#1977e5] hover:text-[#1977e5] hover:bg-[#e8edf2] ${
                    isProcessing ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  onClick={handleBatchProcess}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <RefreshCwIcon className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <PlayIcon className="w-4 h-4 mr-2" />
                  )}
                  {isProcessing ? '处理中...' : `批量转换 (${selectedFiles.size})`}
                </Button>
                <Button variant="outline" className="border-[#d1dbe8] text-red-600 hover:text-red-700 hover:bg-red-50">
                  <TrashIcon className="w-4 h-4 mr-2" />
                  删除选中
                </Button>
              </>
            )}
            {statusCounts.error > 0 && (
              <Button 
                variant="outline" 
                className="border-[#d1dbe8] text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                onClick={handleRetryFailed}
              >
                <RefreshCwIcon className="w-4 h-4 mr-2" />
                重试失败 ({statusCounts.error})
              </Button>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button 
              className="bg-[#1977e5] hover:bg-[#1977e5]/90"
              onClick={() => setShowUpload(true)}
            >
              <UploadIcon className="w-4 h-4 mr-2" />
              上传文件
            </Button>
          </div>
        </div>

        {/* 搜索和筛选 */}
        <div className="flex gap-3 mb-4">
          <div className="relative flex-1 max-w-md">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#4f7096]" />
            <Input
              placeholder="搜索文件名..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 border-[#d1dbe8] focus:border-[#1977e5]"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <FilterIcon className="w-4 h-4 text-[#4f7096]" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as FilterStatus)}
              className="px-3 py-2 border border-[#d1dbe8] rounded-md focus:border-[#1977e5] focus:outline-none bg-white"
            >
              <option value="all">全部 ({statusCounts.all})</option>
              <option value="pending">等待处理 ({statusCounts.pending})</option>
              <option value="processing">处理中 ({statusCounts.processing})</option>
              <option value="processed">已完成 ({statusCounts.processed})</option>
              <option value="error">失败 ({statusCounts.error})</option>
            </select>
          </div>
        </div>
      </div>

      {/* 文件列表 */}
      <Card className="border-[#d1dbe8] bg-white">
        <Table>
          <TableHeader>
            <TableRow className="border-[#d1dbe8] hover:bg-transparent">
              <TableHead className="w-[40px]">
                <input
                  type="checkbox"
                  checked={selectedFiles.size === filteredFiles.length && filteredFiles.length > 0}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 text-[#1977e5] border-[#d1dbe8] rounded focus:ring-[#1977e5]"
                />
              </TableHead>
              <TableHead className="text-[#4f7096] font-medium">文件信息</TableHead>
              <TableHead className="text-[#4f7096] font-medium w-[100px]">大小</TableHead>
              <TableHead className="text-[#4f7096] font-medium w-[120px]">状态</TableHead>
              <TableHead className="text-[#4f7096] font-medium w-[100px]">质量</TableHead>
              <TableHead className="text-[#4f7096] font-medium w-[120px]">上传时间</TableHead>
              <TableHead className="text-[#4f7096] font-medium w-[140px]">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredFiles.map((file) => (
              <TableRow 
                key={file.id} 
                className="border-[#d1dbe8] hover:bg-[#f7f9fc] cursor-pointer"
                onClick={() => handleFileSelect(file)}
              >
                <TableCell className="w-[40px]" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedFiles.has(file.id)}
                    onChange={() => toggleFileSelection(file.id)}
                    className="w-4 h-4 text-[#1977e5] border-[#d1dbe8] rounded focus:ring-[#1977e5]"
                  />
                </TableCell>
                
                <TableCell className="py-3">
                  <div className="flex items-center">
                    {getFileIcon(file.type)}
                    <div className="ml-3">
                      <div className="font-medium text-[#0c141c] mb-1">{file.name}</div>
                      <div className="text-xs text-[#4f7096]">
                        {file.type} {file.pageCount && `· ${file.pageCount} 页`}
                      </div>
                    </div>
                  </div>
                </TableCell>
                
                <TableCell className="py-3 text-[#4f7096]">{file.size}</TableCell>
                
                <TableCell className="py-3">
                  <div className="space-y-1">
                    <span className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(file.status)}`}>
                      {getStatusLabel(file.status)}
                    </span>
                    {file.status === 'processing' && file.conversionProgress && (
                      <div className="w-full bg-[#e8edf2] rounded-full h-1">
                        <div 
                          className="bg-[#1977e5] h-1 rounded-full" 
                          style={{ width: `${file.conversionProgress}%` }}
                        ></div>
                      </div>
                    )}
                    {file.status === 'error' && file.errorMessage && (
                      <div className="text-xs text-red-600 max-w-[100px] truncate" title={file.errorMessage}>
                        {file.errorMessage}
                      </div>
                    )}
                  </div>
                </TableCell>
                
                <TableCell className="py-3">
                  <span className={`text-sm font-medium ${getQualityColor(file.quality)}`}>
                    {getQualityLabel(file.quality)}
                  </span>
                </TableCell>
                
                <TableCell className="py-3 text-[#4f7096]">{file.uploadDate}</TableCell>
                
                <TableCell className="py-3" onClick={(e) => e.stopPropagation()}>
                  <div className="flex gap-1">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0 text-[#4f7096] hover:text-[#0c141c] hover:bg-[#e8edf2]"
                      title="预览文件"
                    >
                      <EyeIcon className="h-4 w-4" />
                    </Button>
                    {file.status === 'processed' && file.mdPath && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0 text-[#4f7096] hover:text-[#0c141c] hover:bg-[#e8edf2]"
                        title="下载MD文件"
                      >
                        <DownloadIcon className="h-4 w-4" />
                      </Button>
                    )}
                    {file.status === 'error' && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                        title="重试转换"
                      >
                        <RefreshCwIcon className="h-4 w-4" />
                      </Button>
                    )}
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                      title="删除文件"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        
        {filteredFiles.length === 0 && (
          <div className="text-center py-8 text-[#4f7096]">
            {searchTerm || statusFilter !== 'all' ? '没有找到匹配的文件' : '暂无文件'}
          </div>
        )}
      </Card>

      {/* 文件上传对话框 */}
      {showUpload && (
        <FileUpload
          onUpload={handleFileUpload}
          onClose={() => setShowUpload(false)}
          libraryId={library.id}
          supportedFormats={['pdf', 'docx', 'pptx', 'xlsx', 'txt', 'md']}
        />
      )}
    </div>
  );
};