import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Progress } from '../ui/progress';
import { 
  FileIcon, 
  ImageIcon, 
  VideoIcon, 
  DownloadIcon, 
  EditIcon, 
  TrashIcon,
  BrainIcon,
  EyeIcon,
  ClockIcon,
  InfoIcon,
  MessageSquare
} from 'lucide-react';

import { ImagePreviewPanel } from './ImagePreviewPanel';
import { VideoPreviewPanel } from './VideoPreviewPanel';
import { MediaAnnotationPanel } from './MediaAnnotationPanel';
import { FileMetadataPanel } from './FileMetadataPanel';
import { ImageAnnotationPanel } from './ImageAnnotationPanel';
import { ProcessingHistoryPanel } from './ProcessingHistoryPanel';

import { useFileDetails } from '../../hooks/useFileDetails';
import { useAnnotations } from '../../hooks/useAnnotations';
import { useImageAnnotations } from '../../hooks/useImageAnnotations';
import { fileService } from '../../services/file.service';
import { annotationService } from '../../services/annotation.service';

interface MediaFileDetailsContainerProps {
  libraryId?: string;
  fileId?: string;
}

export const MediaFileDetailsContainer: React.FC<MediaFileDetailsContainerProps> = ({
  libraryId,
  fileId
}) => {
  const params = useParams();
  const actualLibraryId = libraryId || params.libraryId;
  const actualFileId = fileId || params.fileId;

  const { 
    fileData, 
    loading: fileLoading, 
    error: fileError,
    refreshFile
  } = useFileDetails(actualLibraryId!, actualFileId!);

  const {
    annotations,
    loading: annotationsLoading,
    createAnnotation,
    updateAnnotation,
    deleteAnnotation,
    requestAIAnnotation
  } = useAnnotations(actualFileId!, fileData?.file_type);

  // 使用新的图片标注hook（如果是图片文件）
  const {
    annotations: imageAnnotations,
    loading: imageAnnotationsLoading,
    generateAIAnnotation,
    createAnnotation: createImageAnnotation,
    updateAnnotation: updateImageAnnotation,
    deleteAnnotation: deleteImageAnnotation,
    stats: annotationStats
  } = useImageAnnotations(actualFileId!, {
    autoRefresh: false
  });

  const [activeTab, setActiveTab] = useState('preview');
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (fileData && (fileData.file_category === 'image' || fileData.file_category === 'video')) {
      loadPreviewUrl();
    }
  }, [fileData]);

  const loadPreviewUrl = async () => {
    if (!fileData) return;
    
    try {
      const url = await fileService.getFilePreviewUrl(actualLibraryId!, actualFileId!);
      setPreviewUrl(url);
    } catch (error) {
      console.error('获取预览URL失败:', error);
    }
  };

  const handleAIAnnotation = async (annotationType: 'qa' | 'caption' | 'transcript', options?: any) => {
    if (!fileData) return;

    setIsProcessing(true);
    try {
      const result = await requestAIAnnotation(annotationType, options);
      if (result) {
        // 刷新标注列表
        // 这里可以根据实际API结构调整
      }
    } catch (error) {
      console.error('AI标注失败:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = async (type: 'original' | 'processed' = 'original') => {
    if (!fileData) return;
    
    try {
      await fileService.downloadFile(actualLibraryId!, actualFileId!, type);
    } catch (error) {
      console.error('下载失败:', error);
    }
  };

  const handleDelete = async () => {
    if (!fileData || !confirm('确定要删除这个文件吗？')) return;
    
    try {
      await fileService.deleteFile(actualLibraryId!, actualFileId!);
      // 导航回库页面
      window.history.back();
    } catch (error) {
      console.error('删除失败:', error);
    }
  };

  const getFileIcon = () => {
    if (!fileData) return <FileIcon size={24} />;
    
    switch (fileData.file_category) {
      case 'image':
        return <ImageIcon size={24} className="text-green-500" />;
      case 'video':
        return <VideoIcon size={24} className="text-blue-500" />;
      default:
        return <FileIcon size={24} />;
    }
  };

  const getProcessingStatusBadge = () => {
    if (!fileData) return null;
    
    const statusColors = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'processing': 'bg-blue-100 text-blue-800',
      'completed': 'bg-green-100 text-green-800',
      'failed': 'bg-red-100 text-red-800',
      'analyzing': 'bg-purple-100 text-purple-800',
      'extracting': 'bg-indigo-100 text-indigo-800'
    };

    const statusTexts = {
      'pending': '待处理',
      'processing': '处理中',
      'completed': '已完成',
      'failed': '处理失败',
      'analyzing': '分析中',
      'extracting': '提取中'
    };

    return (
      <Badge className={statusColors[fileData.processing_status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}>
        {statusTexts[fileData.processing_status as keyof typeof statusTexts] || fileData.processing_status}
      </Badge>
    );
  };

  if (fileLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">正在加载文件详情...</p>
        </div>
      </div>
    );
  }

  if (fileError || !fileData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 mb-4">加载文件详情失败</p>
          <Button onClick={refreshFile} variant="outline">
            重试
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* 文件头部信息 */}
      <div className="bg-white border-b p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-gray-100 rounded-lg">
              {getFileIcon()}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {fileData.original_filename || fileData.filename}
              </h1>
              <div className="flex items-center space-x-4 mb-3">
                {getProcessingStatusBadge()}
                <Badge variant="outline">
                  {fileData.file_category_display}
                </Badge>
                <span className="text-sm text-gray-500">
                  {fileData.file_size ? `${(fileData.file_size / 1024 / 1024).toFixed(2)} MB` : ''}
                </span>
                {fileData.upload_at && (
                  <span className="text-sm text-gray-500">
                    {new Date(fileData.upload_at).toLocaleString()}
                  </span>
                )}
              </div>
              
              {/* 处理进度 */}
              {fileData.processing_status === 'processing' && fileData.processing_progress !== undefined && (
                <div className="mb-3">
                  <div className="flex items-center space-x-2 mb-1">
                    <ClockIcon size={14} className="text-blue-500" />
                    <span className="text-sm text-gray-600">处理进度</span>
                  </div>
                  <Progress value={fileData.processing_progress} className="w-64" />
                  <span className="text-xs text-gray-500 mt-1">
                    {fileData.processing_progress}%
                  </span>
                </div>
              )}
              
              {/* 质量分数 */}
              {fileData.content_quality_score > 0 && (
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary">
                    质量分数: {fileData.content_quality_score}/100
                  </Badge>
                  {fileData.extraction_confidence > 0 && (
                    <Badge variant="secondary">
                      提取置信度: {fileData.extraction_confidence}%
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* 操作按钮 */}
          <div className="flex items-center space-x-2">
            <Button
              onClick={() => handleAIAnnotation('qa')}
              disabled={isProcessing}
              className="bg-blue-500 hover:bg-blue-600"
            >
              <BrainIcon size={16} className="mr-2" />
              {isProcessing ? 'AI处理中...' : 'AI标注'}
            </Button>
            <Button onClick={() => handleDownload('original')} variant="outline">
              <DownloadIcon size={16} className="mr-2" />
              下载
            </Button>
            <Button variant="outline">
              <EditIcon size={16} className="mr-2" />
              编辑
            </Button>
            <Button 
              onClick={handleDelete} 
              variant="outline" 
              className="text-red-600 hover:text-red-700"
            >
              <TrashIcon size={16} className="mr-2" />
              删除
            </Button>
          </div>
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="px-6 py-2 bg-white border-b">
            <TabsTrigger value="preview" className="flex items-center space-x-2">
              <EyeIcon size={16} />
              <span>预览</span>
            </TabsTrigger>
            <TabsTrigger value="annotations" className="flex items-center space-x-2">
              <MessageSquare size={16} />
              <span>标注 ({annotations.length})</span>
            </TabsTrigger>
            <TabsTrigger value="metadata" className="flex items-center space-x-2">
              <InfoIcon size={16} />
              <span>元数据</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center space-x-2">
              <ClockIcon size={16} />
              <span>处理历史</span>
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-hidden">
            <TabsContent value="preview" className="h-full m-0 p-0">
              {fileData.file_category === 'image' && (
                <ImagePreviewPanel
                  fileData={fileData}
                  previewUrl={previewUrl}
                  onAIAnnotation={handleAIAnnotation}
                />
              )}
              {fileData.file_category === 'video' && (
                <VideoPreviewPanel
                  fileData={fileData}
                  previewUrl={previewUrl}
                  onAIAnnotation={handleAIAnnotation}
                />
              )}
              {fileData.file_category !== 'image' && fileData.file_category !== 'video' && (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-500">该文件类型不支持预览</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="annotations" className="h-full m-0 p-0">
              {fileData?.file_type?.startsWith('image/') ? (
                <ImageAnnotationPanel
                  fileData={fileData}
                />
              ) : (
                <MediaAnnotationPanel
                  fileData={fileData}
                  annotations={annotations}
                  loading={annotationsLoading}
                  onCreateAnnotation={createAnnotation}
                  onUpdateAnnotation={updateAnnotation}
                  onDeleteAnnotation={deleteAnnotation}
                  onAIAnnotation={handleAIAnnotation}
                  isProcessing={isProcessing}
                />
              )}
            </TabsContent>

            <TabsContent value="metadata" className="h-full m-0 p-0">
              <FileMetadataPanel fileData={fileData} />
            </TabsContent>

            <TabsContent value="history" className="h-full m-0 p-0">
              <ProcessingHistoryPanel fileData={fileData} />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
};