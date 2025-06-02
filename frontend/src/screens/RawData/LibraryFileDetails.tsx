import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Badge } from '../../components/ui/badge';
import { 
  ArrowLeftIcon, 
  DownloadIcon, 
  FileIcon,
  FileTextIcon,
  ClockIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  Loader2Icon,
  EyeIcon,
  CopyIcon,
  RefreshCwIcon,
  InfoIcon
} from 'lucide-react';
import { apiClient } from '../../lib/api-client';
import { useLibraryFiles } from '../../hooks/useLibraries';
import { LibraryFile } from '../../types/library';

export const LibraryFileDetails = (): JSX.Element => {
  const { libraryId, fileId } = useParams<{ libraryId: string; fileId: string }>();
  const navigate = useNavigate();
  const [file, setFile] = useState<LibraryFile | null>(null);
  const [markdownContent, setMarkdownContent] = useState<string>('');
  const [loadingMarkdown, setLoadingMarkdown] = useState(false);
  const [activeTab, setActiveTab] = useState('original');
  
  // 获取文件信息
  useEffect(() => {
    fetchFileDetails();
  }, [fileId]);
  
  const fetchFileDetails = async () => {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: LibraryFile;
      }>(`/api/v1/libraries/${libraryId}/files/${fileId}`);
      
      if (response.success && response.data) {
        setFile(response.data);
        
        // 如果有转换后的文件，自动切换到markdown标签
        if (response.data.converted_object_name) {
          setActiveTab('markdown');
          loadMarkdownContent(response.data.converted_object_name);
        }
      }
    } catch (error) {
      console.error('Failed to fetch file details:', error);
    }
  };
  
  const loadMarkdownContent = async (objectName: string) => {
    try {
      setLoadingMarkdown(true);
      const response = await apiClient.get<string>(
        `/api/v1/storage/download/${objectName}`,
        { responseType: 'text' }
      );
      setMarkdownContent(response);
    } catch (error) {
      console.error('Failed to load markdown content:', error);
    } finally {
      setLoadingMarkdown(false);
    }
  };
  
  const handleDownload = async (objectName: string, filename: string) => {
    try {
      const response = await apiClient.get(
        `/api/v1/storage/download/${objectName}`,
        { responseType: 'blob' }
      );
      
      // 创建下载链接
      const url = window.URL.createObjectURL(response as Blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };
  
  const handleBack = () => {
    navigate(`/rawdata/libraries/${libraryId}`);
  };
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="w-4 h-4 text-green-500" />;
      case 'processing':
        return <Loader2Icon className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'failed':
        return <AlertCircleIcon className="w-4 h-4 text-red-500" />;
      default:
        return <ClockIcon className="w-4 h-4 text-gray-400" />;
    }
  };
  
  const getFileIcon = (fileType: string) => {
    switch (fileType.toLowerCase()) {
      case 'pdf':
        return '📄';
      case 'docx':
      case 'doc':
        return '📝';
      case 'pptx':
      case 'ppt':
        return '📊';
      case 'txt':
        return '📃';
      default:
        return '📄';
    }
  };
  
  if (!file) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2Icon className="w-8 h-8 animate-spin text-[#1977e5]" />
      </div>
    );
  }
  
  return (
    <div className="w-full max-w-[1400px] p-6">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            onClick={handleBack}
            className="text-[#4f7096] hover:text-[#0c141c]"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            返回文件列表
          </Button>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{getFileIcon(file.file_type)}</span>
            <div>
              <h2 className="text-xl font-bold text-[#0c141c]">{file.original_filename}</h2>
              <p className="text-sm text-[#4f7096]">
                {file.file_type.toUpperCase()} • {file.file_size_human} • 上传于 {new Date(file.uploaded_at).toLocaleDateString('zh-CN')}
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {getStatusIcon(file.process_status)}
          <Badge variant={file.process_status === 'completed' ? 'default' : 'secondary'}>
            {file.process_status_label}
          </Badge>
        </div>
      </div>
      
      {/* 标签页 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="original" className="flex items-center gap-2">
            <FileIcon className="w-4 h-4" />
            原始文件
          </TabsTrigger>
          <TabsTrigger 
            value="markdown" 
            disabled={!file.converted_object_name}
            className="flex items-center gap-2"
          >
            <FileTextIcon className="w-4 h-4" />
            Markdown
          </TabsTrigger>
          <TabsTrigger value="info" className="flex items-center gap-2">
            <InfoIcon className="w-4 h-4" />
            文件信息
          </TabsTrigger>
        </TabsList>
        
        {/* 原始文件 */}
        <TabsContent value="original">
          <Card className="p-6">
            <div className="flex flex-col items-center justify-center h-96 space-y-4">
              <span className="text-6xl">{getFileIcon(file.file_type)}</span>
              <h3 className="text-lg font-medium text-[#0c141c]">{file.original_filename}</h3>
              <p className="text-sm text-[#4f7096]">文件类型：{file.file_type.toUpperCase()}</p>
              <Button
                onClick={() => handleDownload(file.minio_object_name, file.original_filename)}
                className="bg-[#1977e5] hover:bg-[#1565c0]"
              >
                <DownloadIcon className="w-4 h-4 mr-2" />
                下载原始文件
              </Button>
            </div>
          </Card>
        </TabsContent>
        
        {/* Markdown预览 */}
        <TabsContent value="markdown">
          <Card className="p-6">
            <div className="mb-4 flex justify-between items-center">
              <h3 className="text-lg font-medium text-[#0c141c]">Markdown 预览</h3>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadMarkdownContent(file.converted_object_name!)}
                >
                  <RefreshCwIcon className="w-4 h-4 mr-2" />
                  刷新
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(markdownContent);
                  }}
                >
                  <CopyIcon className="w-4 h-4 mr-2" />
                  复制
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleDownload(
                    file.converted_object_name!,
                    file.original_filename.replace(/\.[^/.]+$/, '.md')
                  )}
                  className="bg-[#1977e5] hover:bg-[#1565c0]"
                >
                  <DownloadIcon className="w-4 h-4 mr-2" />
                  下载
                </Button>
              </div>
            </div>
            
            {loadingMarkdown ? (
              <div className="flex items-center justify-center h-96">
                <Loader2Icon className="w-8 h-8 animate-spin text-[#1977e5]" />
              </div>
            ) : (
              <div className="max-h-[600px] overflow-y-auto p-6 bg-[#f8fafc] rounded-lg">
                <pre className="whitespace-pre-wrap font-mono text-sm text-[#0c141c]">
                  {markdownContent}
                </pre>
              </div>
            )}
          </Card>
        </TabsContent>
        
        {/* 文件信息 */}
        <TabsContent value="info">
          <Card className="p-6">
            <h3 className="text-lg font-medium text-[#0c141c] mb-4">文件信息</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-[#4f7096]">文件ID</p>
                  <p className="font-mono text-sm">{file.id}</p>
                </div>
                <div>
                  <p className="text-sm text-[#4f7096]">文件名</p>
                  <p className="text-sm">{file.original_filename}</p>
                </div>
                <div>
                  <p className="text-sm text-[#4f7096]">文件类型</p>
                  <p className="text-sm">{file.file_type.toUpperCase()}</p>
                </div>
                <div>
                  <p className="text-sm text-[#4f7096]">文件大小</p>
                  <p className="text-sm">{file.file_size_human}</p>
                </div>
                <div>
                  <p className="text-sm text-[#4f7096]">上传时间</p>
                  <p className="text-sm">{new Date(file.uploaded_at).toLocaleString('zh-CN')}</p>
                </div>
                <div>
                  <p className="text-sm text-[#4f7096]">处理状态</p>
                  <p className="text-sm">{file.process_status_label}</p>
                </div>
              </div>
              
              {file.converted_object_name && (
                <div className="mt-6 pt-6 border-t">
                  <h4 className="font-medium text-[#0c141c] mb-3">转换信息</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-[#4f7096]">转换方法</p>
                      <p className="text-sm">{(file as any).conversion_method === 'markitdown' ? '快速转换' : 'AI智能转换'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-[#4f7096]">转换时间</p>
                      <p className="text-sm">{file.processed_at ? new Date(file.processed_at).toLocaleString('zh-CN') : '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-[#4f7096]">转换后大小</p>
                      <p className="text-sm">{(file as any).converted_file_size ? `${((file as any).converted_file_size / 1024).toFixed(2)} KB` : '-'}</p>
                    </div>
                  </div>
                </div>
              )}
              
              {file.conversion_error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">
                    <strong>转换错误：</strong> {file.conversion_error}
                  </p>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}; 