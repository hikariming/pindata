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
  FileTextIcon,
  CheckCircleIcon,
  ClockIcon,
  AlertTriangleIcon,
  UploadIcon,
  MoreHorizontalIcon,
  TrashIcon,
  EyeIcon,
  DownloadIcon,
  RefreshCwIcon,
  FileEditIcon,
  Trash2Icon,
  CheckSquareIcon,
  SquareIcon,
} from 'lucide-react';

// 导入API相关类型和Hook
import { Library } from '../../types/library';
import { FileUpload } from './FileUpload';
import { useLibraryFiles, useFileActions } from '../../hooks/useLibraries';

interface LibraryDetailsProps {
  onBack: () => void;
  onFileSelect: (file: any) => void;
  library: Library;
}

export const LibraryDetails = ({ onBack, onFileSelect, library }: LibraryDetailsProps): JSX.Element => {
  const { t } = useTranslation();
  const [showUpload, setShowUpload] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // 使用Hook获取文件列表
  const { files, loading: filesLoading, error: filesError, refresh: refreshFiles } = useLibraryFiles(library.id);
  const { deleteFile, loading: deleteLoading } = useFileActions();

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000); // 3秒后自动隐藏
  };

  const handleUpload = (files: File[]) => {
    console.log('上传文件:', files);
    setShowUpload(false);
    // 刷新文件列表
    refreshFiles();
    showNotification('success', `成功上传 ${files.length} 个文件`);
  };

  const handleDeleteFile = async (fileId: string, fileName: string) => {
    if (window.confirm(`确定要删除文件 "${fileName}" 吗？`)) {
      const success = await deleteFile(library.id, fileId);
      if (success) {
        refreshFiles(); // 刷新文件列表
        showNotification('success', `文件 "${fileName}" 删除成功`);
      } else {
        showNotification('error', `文件 "${fileName}" 删除失败`);
      }
    }
  };

  const handleSelectFile = (fileId: string, checked: boolean) => {
    const newSelected = new Set(selectedFiles);
    if (checked) {
      newSelected.add(fileId);
    } else {
      newSelected.delete(fileId);
    }
    setSelectedFiles(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedFiles(new Set(files.map(f => f.id)));
    } else {
      setSelectedFiles(new Set());
    }
  };

  const handleBatchDelete = async () => {
    const selectedFilesList = files.filter(f => selectedFiles.has(f.id));
    const fileNames = selectedFilesList.map(f => f.original_filename).join('、');
    
    if (window.confirm(`⚠️ 警告：您即将删除 ${selectedFiles.size} 个文件！\n\n文件列表：\n${fileNames}\n\n此操作不可撤销，确定要继续吗？`)) {
      let successCount = 0;
      let failCount = 0;
      
      for (const file of selectedFilesList) {
        const success = await deleteFile(library.id, file.id);
        if (success) {
          successCount++;
        } else {
          failCount++;
        }
      }
      
      refreshFiles();
      setSelectedFiles(new Set());
      
      if (failCount === 0) {
        showNotification('success', `成功删除 ${successCount} 个文件`);
      } else {
        showNotification('error', `删除完成：成功 ${successCount} 个，失败 ${failCount} 个`);
      }
    }
  };

  const handleBatchConvertToMD = async () => {
    const selectedFilesList = files.filter(f => selectedFiles.has(f.id));
    const fileNames = selectedFilesList.map(f => f.original_filename).join('、');
    
    if (window.confirm(`确定要将选中的 ${selectedFiles.size} 个文件转换为 Markdown 格式吗？\n\n文件列表：\n${fileNames}`)) {
      // TODO: 这里需要调用转换API
      console.log('批量转换为MD:', selectedFilesList);
      
      // 模拟转换成功
      showNotification('success', `已提交 ${selectedFiles.size} 个文件的转换任务`);
      setSelectedFiles(new Set());
      refreshFiles();
    }
  };

  const getSelectAllState = () => {
    if (files.length === 0) return { checked: false, indeterminate: false };
    const selectedCount = selectedFiles.size;
    if (selectedCount === 0) return { checked: false, indeterminate: false };
    if (selectedCount === files.length) return { checked: true, indeterminate: false };
    return { checked: false, indeterminate: true };
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="w-4 h-4 text-green-500" />;
      case 'processing':
        return <ClockIcon className="w-4 h-4 text-blue-500" />;
      case 'failed':
        return <AlertTriangleIcon className="w-4 h-4 text-red-500" />;
      default:
        return <ClockIcon className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return '已完成';
      case 'processing':
        return '处理中';
      case 'failed':
        return '处理失败';
      case 'pending':
        return '等待处理';
      default:
        return '未知';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'processing':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'failed':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'pending':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const supportedFormats = ['pdf', 'docx', 'doc', 'pptx', 'ppt', 'txt', 'md'];

  const selectAllState = getSelectAllState();

  return (
    <div className="w-full max-w-[1400px] p-6">
      <div className="flex items-center justify-between mb-6">
        <Button
          variant="ghost"
          className="text-[#4f7096] hover:text-[#0c141c] hover:bg-[#e8edf2]"
          onClick={onBack}
        >
          <ArrowLeftIcon className="w-4 h-4 mr-2" />
          返回列表
        </Button>

        <Button 
          onClick={() => setShowUpload(true)}
          className="bg-[#1977e5] hover:bg-[#1565c0] text-white"
        >
          <UploadIcon className="w-4 h-4 mr-2" />
          上传文件
        </Button>
      </div>

      <div className="mb-6">
        <h2 className="text-[26px] font-bold leading-8 text-[#0c141c] mb-2">
          {library.name}
        </h2>
        <p className="text-[#4f7096] mb-4">{library.description}</p>
        <div className="flex gap-2">
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

      {/* 统计信息 */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <Card className="border-[#d1dbe8] bg-white p-4">
          <div className="flex items-center">
            <FileIcon className="w-6 h-6 text-[#1977e5] mr-2" />
            <div>
              <p className="text-sm text-[#4f7096]">总文件数</p>
              <p className="text-lg font-bold text-[#0c141c]">{files.length}</p>
            </div>
          </div>
        </Card>
        
        <Card className="border-[#d1dbe8] bg-white p-4">
          <div className="flex items-center">
            <CheckCircleIcon className="w-6 h-6 text-[#10b981] mr-2" />
            <div>
              <p className="text-sm text-[#4f7096]">已处理</p>
              <p className="text-lg font-bold text-[#0c141c]">
                {files.filter(f => f.process_status === 'completed').length}
              </p>
            </div>
          </div>
        </Card>
        
        <Card className="border-[#d1dbe8] bg-white p-4">
          <div className="flex items-center">
            <ClockIcon className="w-6 h-6 text-[#f59e0b] mr-2" />
            <div>
              <p className="text-sm text-[#4f7096]">处理中</p>
              <p className="text-lg font-bold text-[#0c141c]">
                {files.filter(f => f.process_status === 'processing').length}
              </p>
            </div>
          </div>
        </Card>
        
        <Card className="border-[#d1dbe8] bg-white p-4">
          <div className="flex items-center">
            <AlertTriangleIcon className="w-6 h-6 text-[#ef4444] mr-2" />
            <div>
              <p className="text-sm text-[#4f7096]">待处理</p>
              <p className="text-lg font-bold text-[#0c141c]">
                {files.filter(f => f.process_status === 'pending').length}
              </p>
            </div>
          </div>
        </Card>
        
        <Card className="border-[#d1dbe8] bg-white p-4">
          <div className="flex items-center">
            <FileTextIcon className="w-6 h-6 text-[#8b5cf6] mr-2" />
            <div>
              <p className="text-sm text-[#4f7096]">MD文件</p>
              <p className="text-lg font-bold text-[#0c141c]">
                {files.filter(f => f.converted_format === 'markdown').length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* 文件列表 */}
      <Card className="border-[#d1dbe8] bg-white">
        <div className="p-4 border-b border-[#d1dbe8]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-[#0c141c]">文件列表</h3>
              <p className="text-sm text-[#4f7096]">
                共 {files.length} 个文件
                {selectedFiles.size > 0 && (
                  <span className="ml-2 text-[#1977e5]">
                    已选择 {selectedFiles.size} 个
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {selectedFiles.size > 0 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBatchConvertToMD}
                    className="flex items-center gap-2 text-[#1977e5] border-[#1977e5] hover:bg-[#1977e5] hover:text-white"
                  >
                    <FileEditIcon className="w-4 h-4" />
                    转换为MD ({selectedFiles.size})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBatchDelete}
                    disabled={deleteLoading}
                    className="flex items-center gap-2 text-red-600 border-red-300 hover:bg-red-600 hover:text-white"
                  >
                    <Trash2Icon className="w-4 h-4" />
                    批量删除 ({selectedFiles.size})
                  </Button>
                </>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={refreshFiles}
                disabled={filesLoading}
                className="flex items-center gap-2"
              >
                <RefreshCwIcon className={`w-4 h-4 ${filesLoading ? 'animate-spin' : ''}`} />
                刷新
              </Button>
            </div>
          </div>
        </div>

        {filesLoading ? (
          <div className="p-8 text-center text-[#4f7096]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1977e5] mx-auto mb-4"></div>
            <p>加载文件列表中...</p>
          </div>
        ) : filesError ? (
          <div className="p-8 text-center text-red-600">
            <AlertTriangleIcon className="w-12 h-12 mx-auto mb-4" />
            <p>加载文件列表失败: {filesError}</p>
            <Button 
              onClick={refreshFiles} 
              className="mt-4"
              variant="outline"
            >
              重试
            </Button>
          </div>
        ) : files.length === 0 ? (
          <div className="p-8 text-center text-[#4f7096]">
            <FileIcon className="w-12 h-12 mx-auto mb-4 text-[#d1dbe8]" />
            <p>暂无文件</p>
            <p className="text-xs mt-2">点击上方"上传文件"按钮开始添加文件</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      checked={selectAllState.checked}
                      ref={(el) => {
                        if (el) el.indeterminate = selectAllState.indeterminate;
                      }}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="w-4 h-4 text-[#1977e5] bg-gray-100 border-gray-300 rounded focus:ring-[#1977e5] focus:ring-2"
                      aria-label="全选"
                    />
                  </TableHead>
                  <TableHead>文件名</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>大小</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>上传时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {files.map((file) => (
                  <TableRow key={file.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedFiles.has(file.id)}
                        onChange={(e) => handleSelectFile(file.id, e.target.checked)}
                        className="w-4 h-4 text-[#1977e5] bg-gray-100 border-gray-300 rounded focus:ring-[#1977e5] focus:ring-2"
                        aria-label={`选择文件 ${file.original_filename}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <FileIcon className="w-4 h-4 text-[#4f7096] mr-2" />
                        <div>
                          <p className="font-medium text-[#0c141c]">{file.original_filename}</p>
                          {file.filename !== file.original_filename && (
                            <p className="text-xs text-[#4f7096]">{file.filename}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="uppercase text-xs font-medium text-[#4f7096]">
                        {file.file_type}
                      </span>
                    </TableCell>
                    <TableCell className="text-[#4f7096]">
                      {file.file_size_human}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        {getStatusIcon(file.process_status)}
                        <span className={`ml-2 px-2 py-1 text-xs rounded-full border ${getStatusColor(file.process_status)}`}>
                          {getStatusText(file.process_status)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-[#4f7096]">
                      {file.uploaded_at ? new Date(file.uploaded_at).toLocaleString('zh-CN') : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onFileSelect(file)}
                          className="h-8 w-8 p-0 text-[#4f7096] hover:text-[#1977e5]"
                          title="查看详情"
                        >
                          <EyeIcon className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteFile(file.id, file.original_filename)}
                          disabled={deleteLoading}
                          className="h-8 w-8 p-0 text-[#4f7096] hover:text-red-600"
                          title="删除文件"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* 文件上传弹窗 */}
      {showUpload && (
        <FileUpload
          onUpload={handleUpload}
          onClose={() => setShowUpload(false)}
          libraryId={library.id}
          supportedFormats={supportedFormats}
        />
      )}

      {/* 通知组件 */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
          notification.type === 'success' 
            ? 'bg-green-50 border-green-200 text-green-800' 
            : 'bg-red-50 border-red-200 text-red-800'
        } border`}>
          <div className="flex items-center">
            {notification.type === 'success' ? (
              <CheckCircleIcon className="w-5 h-5 mr-2" />
            ) : (
              <AlertTriangleIcon className="w-5 h-5 mr-2" />
            )}
            {notification.message}
          </div>
        </div>
      )}
    </div>
  );
};