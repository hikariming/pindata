import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
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
import { LibraryService } from '../../services/library.service';

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
  const { t } = useTranslation();
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
      return t('rawData.fileUpload.fileSizeExceeded');
    }

    // 检查文件格式
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension || !supportedFormats.includes(extension)) {
      return t('rawData.fileUpload.unsupportedFormat', { formats: supportedFormats.join(', ') });
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

  const realUpload = async (uploadFile: UploadFile) => {
    try {
      // 更新状态为上传中
      setUploadFiles(prev => prev.map(f => 
        f.id === uploadFile.id 
          ? { ...f, status: 'uploading', progress: 0 }
          : f
      ));

      // 调用真实的上传 API
      const result = await LibraryService.uploadFiles(libraryId, [uploadFile.file]);
      
      // 上传成功
      setUploadFiles(prev => prev.map(f => 
        f.id === uploadFile.id 
          ? { ...f, status: 'success', progress: 100 }
          : f
      ));
      
      return result;
    } catch (error) {
      // 上传失败
      const errorMessage = error instanceof Error ? error.message : t('rawData.fileUpload.uploadError');
      setUploadFiles(prev => prev.map(f => 
        f.id === uploadFile.id 
          ? { ...f, status: 'error', error: errorMessage }
          : f
      ));
      throw error;
    }
  };

  const handleUpload = async () => {
    const validFiles = uploadFiles.filter(f => f.status === 'pending');
    if (validFiles.length === 0) return;

    setIsProcessing(true);

    try {
      // 使用真实的 API 上传
      const uploadResults = [];
      const successFiles: File[] = [];
      
      for (const uploadFile of validFiles) {
        try {
          const result = await realUpload(uploadFile);
          uploadResults.push(...result);
          // 上传成功后记录文件
          successFiles.push(uploadFile.file);
        } catch (error) {
          console.error(`${t('rawData.fileUpload.uploadError')} ${uploadFile.file.name}:`, error);
        }
      }
      
      // 只有当有成功上传的文件时才调用回调
      if (successFiles.length > 0) {
        onUpload(successFiles);
      }
    } catch (error) {
      console.error(`${t('rawData.fileUpload.uploadError')}:`, error);
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
            <h2 className="text-xl font-bold text-[#0c141c]">{t('rawData.fileUpload.title')}</h2>
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
            {t('rawData.fileUpload.supportedFormats', { formats: supportedFormats.join(', ') })}
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
              {t('rawData.fileUpload.dragDropArea')}
            </h3>
            <p className="text-[#4f7096] mb-4">
              {t('rawData.fileUpload.batchUploadSupport')}
            </p>
            <Button 
              variant="outline" 
              onClick={handleFileSelect}
              className="border-[#1977e5] text-[#1977e5] hover:bg-[#1977e5] hover:text-white"
            >
              {t('rawData.fileUpload.selectFiles')}
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
                  {t('rawData.fileUpload.pendingFiles')} ({uploadFiles.length})
                </h3>
                <div className="text-sm text-[#4f7096]">
                  {t('rawData.fileUpload.totalSize', { size: formatFileSize(totalSize) })}
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
                              {t('rawData.fileUpload.uploading', { progress: uploadFile.progress })}
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
                    {t('rawData.fileUpload.errorFiles', { count: errorFiles.length })}
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
                  {t('rawData.fileUpload.validFiles', { 
                    count: validFiles.length, 
                    size: formatFileSize(validFiles.reduce((total, f) => total + f.file.size, 0))
                  })}
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
                {t('rawData.fileUpload.cancel')}
              </Button>
              <Button
                onClick={handleUpload}
                disabled={validFiles.length === 0 || isProcessing}
                className="bg-[#1977e5] hover:bg-[#1977e5]/90"
              >
                {isProcessing ? (
                  <>
                    <PlayIcon className="w-4 h-4 mr-2 animate-pulse" />
                    {t('rawData.fileUpload.uploadingProgress')}
                  </>
                ) : (
                  <>
                    <UploadIcon className="w-4 h-4 mr-2" />
                    {t('rawData.fileUpload.startUpload', { count: validFiles.length })}
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