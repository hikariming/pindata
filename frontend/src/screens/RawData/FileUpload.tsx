import React, { useState, useRef } from 'react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { 
  UploadIcon, 
  FileIcon, 
  XIcon, 
  CheckCircleIcon,
  AlertCircleIcon,
  FileTextIcon,
  FileSpreadsheetIcon,
  PresentationIcon,
  PlayIcon
} from 'lucide-react';

interface FileUploadProps {
  onUpload: (files: File[]) => void;
  onClose: () => void;
  libraryId: string;
  supportedFormats: string[];
}

interface UploadFile {
  file: File;
  id: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
}

export const FileUpload = ({ onUpload, onClose, libraryId, supportedFormats }: FileUploadProps): JSX.Element => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const supportedExtensions = supportedFormats.map(format => `.${format}`).join(',');
  const maxFileSize = 50 * 1024 * 1024; // 50MB

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return <FileTextIcon className="w-6 h-6 text-red-500" />;
      case 'docx':
      case 'doc':
        return <FileTextIcon className="w-6 h-6 text-blue-500" />;
      case 'xlsx':
      case 'xls':
        return <FileSpreadsheetIcon className="w-6 h-6 text-green-500" />;
      case 'pptx':
      case 'ppt':
        return <PresentationIcon className="w-6 h-6 text-orange-500" />;
      default:
        return <FileIcon className="w-6 h-6 text-gray-500" />;
    }
  };

  const validateFile = (file: File): string | undefined => {
    // 检查文件大小
    if (file.size > maxFileSize) {
      return '文件大小不能超过50MB';
    }

    // 检查文件格式
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension || !supportedFormats.includes(extension)) {
      return `不支持的文件格式。支持的格式：${supportedFormats.join(', ')}`;
    }

    return undefined;
  };

  const handleFiles = (files: FileList) => {
    const newFiles: UploadFile[] = [];
    
    Array.from(files).forEach((file) => {
      const error = validateFile(file);
      newFiles.push({
        file,
        id: `${Date.now()}-${Math.random()}`,
        status: error ? 'error' : 'pending',
        progress: 0,
        error
      });
    });

    setUploadFiles(prev => [...prev, ...newFiles]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFiles(files);
    }
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFiles(files);
    }
    // 重置input value以允许重复选择同一文件
    e.target.value = '';
  };

  const removeFile = (fileId: string) => {
    setUploadFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const simulateUpload = (uploadFile: UploadFile) => {
    return new Promise<void>((resolve, reject) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 20;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
          setUploadFiles(prev => prev.map(f => 
            f.id === uploadFile.id 
              ? { ...f, status: 'success', progress: 100 }
              : f
          ));
          resolve();
        } else {
          setUploadFiles(prev => prev.map(f => 
            f.id === uploadFile.id 
              ? { ...f, status: 'uploading', progress: Math.floor(progress) }
              : f
          ));
        }
      }, 200);
    });
  };

  const handleUpload = async () => {
    const validFiles = uploadFiles.filter(f => f.status === 'pending');
    if (validFiles.length === 0) return;

    setIsProcessing(true);

    try {
      // 模拟批量上传
      for (const uploadFile of validFiles) {
        await simulateUpload(uploadFile);
      }
      
      // 调用上传回调
      onUpload(validFiles.map(f => f.file));
    } catch (error) {
      console.error('上传失败:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const validFiles = uploadFiles.filter(f => f.status !== 'error');
  const errorFiles = uploadFiles.filter(f => f.status === 'error');
  const totalSize = uploadFiles.reduce((total, f) => total + f.file.size, 0);
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-4xl max-h-[90vh] bg-white border-[#d1dbe8] m-4 overflow-hidden">
        <div className="p-6 border-b border-[#d1dbe8]">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-[#0c141c]">上传训练数据文件</h2>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClose}
              className="text-[#4f7096] hover:text-[#0c141c]"
            >
              <XIcon className="w-5 h-5" />
            </Button>
          </div>
          <p className="text-sm text-[#4f7096] mt-2">
            支持格式：{supportedFormats.join(', ')} | 单文件最大50MB
          </p>
        </div>

        <div className="p-6 overflow-auto max-h-[calc(90vh-200px)]">
          {/* 拖拽上传区域 */}
          <div
            className={`
              border-2 border-dashed rounded-lg p-8 text-center transition-colors
              ${isDragging 
                ? 'border-[#1977e5] bg-blue-50' 
                : 'border-[#d1dbe8] hover:border-[#1977e5] hover:bg-[#f7f9fc]'
              }
            `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <UploadIcon className="w-12 h-12 text-[#4f7096] mx-auto mb-4" />
            <h3 className="text-lg font-medium text-[#0c141c] mb-2">
              拖拽文件到此处或点击选择文件
            </h3>
            <p className="text-[#4f7096] mb-4">
              支持批量上传多个文件
            </p>
            <Button 
              variant="outline" 
              onClick={handleFileSelect}
              className="border-[#1977e5] text-[#1977e5] hover:bg-[#1977e5] hover:text-white"
            >
              选择文件
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={supportedExtensions}
              onChange={handleFileInputChange}
              className="hidden"
            />
          </div>

          {/* 文件列表 */}
          {uploadFiles.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-[#0c141c]">
                  待上传文件 ({uploadFiles.length})
                </h3>
                <div className="text-sm text-[#4f7096]">
                  总大小：{formatFileSize(totalSize)}
                </div>
              </div>

              <div className="space-y-3 max-h-64 overflow-auto">
                {uploadFiles.map((uploadFile) => (
                  <div 
                    key={uploadFile.id}
                    className="flex items-center p-3 border border-[#d1dbe8] rounded-lg"
                  >
                    <div className="flex items-center flex-1 min-w-0">
                      {getFileIcon(uploadFile.file.name)}
                      <div className="ml-3 flex-1 min-w-0">
                        <div className="font-medium text-[#0c141c] truncate">
                          {uploadFile.file.name}
                        </div>
                        <div className="text-sm text-[#4f7096]">
                          {formatFileSize(uploadFile.file.size)}
                        </div>
                        
                        {uploadFile.status === 'uploading' && (
                          <div className="mt-2">
                            <div className="w-full bg-[#e8edf2] rounded-full h-1.5">
                              <div 
                                className="bg-[#1977e5] h-1.5 rounded-full transition-all duration-300" 
                                style={{ width: `${uploadFile.progress}%` }}
                              ></div>
                            </div>
                            <div className="text-xs text-[#4f7096] mt-1">
                              上传中... {uploadFile.progress}%
                            </div>
                          </div>
                        )}
                        
                        {uploadFile.status === 'error' && uploadFile.error && (
                          <div className="text-xs text-red-600 mt-1">
                            {uploadFile.error}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center ml-3">
                      {uploadFile.status === 'success' && (
                        <CheckCircleIcon className="w-5 h-5 text-green-500" />
                      )}
                      {uploadFile.status === 'error' && (
                        <AlertCircleIcon className="w-5 h-5 text-red-500" />
                      )}
                      {(uploadFile.status === 'pending' || uploadFile.status === 'error') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(uploadFile.id)}
                          className="h-8 w-8 p-0 text-[#4f7096] hover:text-red-600"
                        >
                          <XIcon className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {errorFiles.length > 0 && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="text-sm text-red-700">
                    {errorFiles.length} 个文件有错误，请检查并重新选择
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 底部操作栏 */}
        <div className="p-6 border-t border-[#d1dbe8] bg-[#f7f9fc]">
          <div className="flex items-center justify-between">
            <div className="text-sm text-[#4f7096]">
              {validFiles.length > 0 && (
                <span>
                  {validFiles.length} 个有效文件，共 {formatFileSize(validFiles.reduce((total, f) => total + f.file.size, 0))}
                </span>
              )}
            </div>
            
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isProcessing}
                className="border-[#d1dbe8] text-[#4f7096] hover:bg-[#e8edf2]"
              >
                取消
              </Button>
              <Button
                onClick={handleUpload}
                disabled={validFiles.length === 0 || isProcessing}
                className="bg-[#1977e5] hover:bg-[#1977e5]/90"
              >
                {isProcessing ? (
                  <>
                    <PlayIcon className="w-4 h-4 mr-2 animate-pulse" />
                    上传中...
                  </>
                ) : (
                  <>
                    <UploadIcon className="w-4 h-4 mr-2" />
                    开始上传 ({validFiles.length})
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}; 