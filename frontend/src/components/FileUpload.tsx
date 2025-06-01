import React, { useCallback, useState } from 'react';
import { useFileUpload } from '../hooks/useLibraries';
import { config } from '../lib/config';

interface FileUploadProps {
  libraryId: string;
  onUploadSuccess?: (files: any[]) => void;
  onUploadError?: (error: string) => void;
  className?: string;
}

export default function FileUpload({ 
  libraryId, 
  onUploadSuccess, 
  onUploadError, 
  className = '' 
}: FileUploadProps) {
  const { loading, error, uploadFiles } = useFileUpload();
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const files = Array.from(e.dataTransfer.files);
      setSelectedFiles(prev => [...prev, ...files]);
    }
  }, []);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      const files = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...files]);
    }
  }, []);

  const removeFile = useCallback((index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleUpload = useCallback(async () => {
    if (selectedFiles.length === 0) return;

    try {
      const uploadedFiles = await uploadFiles(libraryId, selectedFiles);
      setSelectedFiles([]);
      onUploadSuccess?.(uploadedFiles);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '上传失败';
      onUploadError?.(errorMessage);
    }
  }, [selectedFiles, uploadFiles, libraryId, onUploadSuccess, onUploadError]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={`file-upload ${className}`}>
      {/* 拖拽上传区域 */}
      <div
        className={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
          transition-colors duration-200
          ${dragActive 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
          }
          ${loading ? 'pointer-events-none opacity-50' : ''}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => document.getElementById('fileInput')?.click()}
      >
        <div className="space-y-2">
          <div className="text-gray-600">
            <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
              <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="text-sm text-gray-600">
            <span className="font-medium text-blue-600 hover:text-blue-500">点击上传</span>
            {' '}或拖拽文件到这里
          </div>
          <p className="text-xs text-gray-500">
            支持 PDF, Word, PowerPoint, TXT, Markdown 文件
          </p>
          <p className="text-xs text-gray-500">
            最大文件大小: {formatFileSize(config.maxFileSize)}
          </p>
        </div>
      </div>

      {/* 隐藏的文件选择器 */}
      <input
        id="fileInput"
        type="file"
        multiple
        accept=".pdf,.docx,.doc,.pptx,.ppt,.txt,.md"
        onChange={handleChange}
        className="hidden"
      />

      {/* 选中的文件列表 */}
      {selectedFiles.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">
            已选择的文件 ({selectedFiles.length})
          </h4>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {selectedFiles.map((file, index) => (
              <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(file.size)}
                  </p>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className="ml-2 text-red-500 hover:text-red-700 text-sm"
                >
                  删除
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 错误信息 */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* 上传按钮 */}
      {selectedFiles.length > 0 && (
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleUpload}
            disabled={loading}
            className={`
              px-4 py-2 text-sm font-medium rounded-md
              ${loading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
              }
            `}
          >
            {loading ? '上传中...' : `上传 ${selectedFiles.length} 个文件`}
          </button>
        </div>
      )}
    </div>
  );
} 