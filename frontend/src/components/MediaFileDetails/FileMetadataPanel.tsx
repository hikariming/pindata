import React from 'react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { 
  FileIcon, 
  CalendarIcon, 
  HardDriveIcon, 
  ImageIcon,
  VideoIcon,
  InfoIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon
} from 'lucide-react';

interface FileMetadataPanelProps {
  fileData: any;
}

export const FileMetadataPanel: React.FC<FileMetadataPanelProps> = ({ fileData }) => {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getProcessingStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon size={16} className="text-green-500" />;
      case 'failed':
        return <XCircleIcon size={16} className="text-red-500" />;
      case 'processing':
      case 'analyzing':
      case 'extracting':
        return <ClockIcon size={16} className="text-blue-500" />;
      default:
        return <InfoIcon size={16} className="text-gray-500" />;
    }
  };

  const getFileTypeIcon = () => {
    switch (fileData.file_category) {
      case 'image':
        return <ImageIcon size={20} className="text-green-500" />;
      case 'video':
        return <VideoIcon size={20} className="text-blue-500" />;
      default:
        return <FileIcon size={20} className="text-gray-500" />;
    }
  };

  return (
    <div className="h-full overflow-y-auto p-6 bg-gray-50">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* 基本文件信息 */}
        <Card className="p-6">
          <div className="flex items-center space-x-3 mb-4">
            {getFileTypeIcon()}
            <h3 className="text-lg font-semibold">基本信息</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">文件名</label>
              <p className="text-sm mt-1">{fileData.filename}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">原始文件名</label>
              <p className="text-sm mt-1">{fileData.original_filename || '未知'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">文件类型</label>
              <div className="flex items-center space-x-2 mt-1">
                <Badge variant="outline">{fileData.file_type}</Badge>
                <Badge variant="secondary">{fileData.file_category_display}</Badge>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">文件大小</label>
              <p className="text-sm mt-1">
                {fileData.file_size ? formatFileSize(fileData.file_size) : '未知'}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">MIME类型</label>
              <p className="text-sm mt-1">{fileData.mime_type || '未知'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">文件编码</label>
              <p className="text-sm mt-1">{fileData.encoding || '未知'}</p>
            </div>
            {fileData.checksum && (
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700">文件校验和</label>
                <p className="text-sm mt-1 font-mono break-all">{fileData.checksum}</p>
              </div>
            )}
          </div>
        </Card>

        {/* 处理状态信息 */}
        <Card className="p-6">
          <div className="flex items-center space-x-3 mb-4">
            {getProcessingStatusIcon(fileData.processing_status)}
            <h3 className="text-lg font-semibold">处理状态</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">处理状态</label>
              <div className="flex items-center space-x-2 mt-1">
                {getProcessingStatusIcon(fileData.processing_status)}
                <Badge 
                  variant={fileData.processing_status === 'completed' ? 'default' : 'secondary'}
                  className={
                    fileData.processing_status === 'completed' ? 'bg-green-100 text-green-800' :
                    fileData.processing_status === 'failed' ? 'bg-red-100 text-red-800' :
                    fileData.processing_status === 'processing' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }
                >
                  {fileData.processing_status}
                </Badge>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">处理进度</label>
              <p className="text-sm mt-1">{fileData.processing_progress || 0}%</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">内容质量分数</label>
              <div className="flex items-center space-x-2 mt-1">
                <Badge variant="outline">{fileData.content_quality_score || 0}/100</Badge>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">提取置信度</label>
              <div className="flex items-center space-x-2 mt-1">
                <Badge variant="outline">{fileData.extraction_confidence || 0}%</Badge>
              </div>
            </div>
            {fileData.processing_error && (
              <div className="col-span-2">
                <label className="text-sm font-medium text-red-700">处理错误</label>
                <p className="text-sm mt-1 text-red-600 bg-red-50 p-2 rounded">
                  {fileData.processing_error}
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* 图片特定信息 */}
        {fileData.file_category === 'image' && (
          <Card className="p-6">
            <div className="flex items-center space-x-3 mb-4">
              <ImageIcon size={20} className="text-green-500" />
              <h3 className="text-lg font-semibold">图片信息</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">图片尺寸</label>
                <p className="text-sm mt-1">
                  {fileData.image_width && fileData.image_height 
                    ? `${fileData.image_width} × ${fileData.image_height} 像素`
                    : '未知'
                  }
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">颜色模式</label>
                <p className="text-sm mt-1">{fileData.color_mode || '未知'}</p>
              </div>
              {fileData.image_width && fileData.image_height && (
                <div>
                  <label className="text-sm font-medium text-gray-700">宽高比</label>
                  <p className="text-sm mt-1">
                    {(fileData.image_width / fileData.image_height).toFixed(2)}:1
                  </p>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* 视频特定信息 */}
        {fileData.file_category === 'video' && (
          <Card className="p-6">
            <div className="flex items-center space-x-3 mb-4">
              <VideoIcon size={20} className="text-blue-500" />
              <h3 className="text-lg font-semibold">视频信息</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">视频尺寸</label>
                <p className="text-sm mt-1">
                  {fileData.video_width && fileData.video_height 
                    ? `${fileData.video_width} × ${fileData.video_height} 像素`
                    : '未知'
                  }
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">时长</label>
                <p className="text-sm mt-1">
                  {fileData.duration 
                    ? `${Math.floor(fileData.duration / 60)}:${(fileData.duration % 60).toString().padStart(2, '0')}`
                    : '未知'
                  }
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">帧率</label>
                <p className="text-sm mt-1">{fileData.frame_rate || '未知'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">视频编码</label>
                <p className="text-sm mt-1">{fileData.video_codec || '未知'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">音频编码</label>
                <p className="text-sm mt-1">{fileData.audio_codec || '未知'}</p>
              </div>
              {fileData.video_width && fileData.video_height && (
                <div>
                  <label className="text-sm font-medium text-gray-700">宽高比</label>
                  <p className="text-sm mt-1">
                    {(fileData.video_width / fileData.video_height).toFixed(2)}:1
                  </p>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* 时间信息 */}
        <Card className="p-6">
          <div className="flex items-center space-x-3 mb-4">
            <CalendarIcon size={20} className="text-purple-500" />
            <h3 className="text-lg font-semibold">时间信息</h3>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">上传时间</label>
              <p className="text-sm mt-1">
                {fileData.upload_at ? formatDate(fileData.upload_at) : '未知'}
              </p>
            </div>
            {fileData.processed_at && (
              <div>
                <label className="text-sm font-medium text-gray-700">处理完成时间</label>
                <p className="text-sm mt-1">{formatDate(fileData.processed_at)}</p>
              </div>
            )}
          </div>
        </Card>

        {/* 存储信息 */}
        <Card className="p-6">
          <div className="flex items-center space-x-3 mb-4">
            <HardDriveIcon size={20} className="text-orange-500" />
            <h3 className="text-lg font-semibold">存储信息</h3>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">MinIO对象名</label>
              <p className="text-sm mt-1 font-mono break-all">{fileData.minio_object_name}</p>
            </div>
            {fileData.thumbnail_path && (
              <div>
                <label className="text-sm font-medium text-gray-700">缩略图路径</label>
                <p className="text-sm mt-1 font-mono break-all">{fileData.thumbnail_path}</p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-gray-700">支持预览</label>
              <Badge variant={fileData.is_supported_preview ? 'default' : 'secondary'}>
                {fileData.is_supported_preview ? '是' : '否'}
              </Badge>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">预览类型</label>
              <Badge variant="outline">{fileData.preview_type || '无'}</Badge>
            </div>
          </div>
        </Card>

        {/* 元数据 */}
        {(fileData.file_metadata || fileData.extraction_metadata) && (
          <Card className="p-6">
            <div className="flex items-center space-x-3 mb-4">
              <InfoIcon size={20} className="text-gray-500" />
              <h3 className="text-lg font-semibold">扩展元数据</h3>
            </div>
            
            <div className="space-y-4">
              {fileData.file_metadata && (
                <div>
                  <label className="text-sm font-medium text-gray-700">文件元数据</label>
                  <pre className="text-xs mt-1 bg-gray-50 p-3 rounded overflow-auto max-h-40">
                    {JSON.stringify(fileData.file_metadata, null, 2)}
                  </pre>
                </div>
              )}
              
              {fileData.extraction_metadata && (
                <div>
                  <label className="text-sm font-medium text-gray-700">提取元数据</label>
                  <pre className="text-xs mt-1 bg-gray-50 p-3 rounded overflow-auto max-h-40">
                    {JSON.stringify(fileData.extraction_metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* 内容预览 */}
        {(fileData.preview_content || fileData.extracted_text) && (
          <Card className="p-6">
            <div className="flex items-center space-x-3 mb-4">
              <FileIcon size={20} className="text-indigo-500" />
              <h3 className="text-lg font-semibold">内容预览</h3>
            </div>
            
            <div className="space-y-4">
              {fileData.preview_content && (
                <div>
                  <label className="text-sm font-medium text-gray-700">预览内容</label>
                  <div className="text-sm mt-1 bg-gray-50 p-3 rounded max-h-40 overflow-auto">
                    {fileData.preview_content}
                  </div>
                </div>
              )}
              
              {fileData.extracted_text && (
                <div>
                  <label className="text-sm font-medium text-gray-700">提取文本</label>
                  <div className="text-sm mt-1 bg-gray-50 p-3 rounded max-h-40 overflow-auto">
                    {fileData.extracted_text}
                  </div>
                </div>
              )}
              
              {fileData.word_count > 0 && (
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span>字数: {fileData.word_count}</span>
                  {fileData.page_count > 0 && (
                    <span>页数: {fileData.page_count}</span>
                  )}
                </div>
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};