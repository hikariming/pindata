import React from 'react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  TableIcon,
  ImageIcon,
  FileTextIcon,
  AlertCircleIcon,
  DownloadIcon,
  EyeIcon
} from 'lucide-react';
import { enhancedDatasetService } from '../../services/enhanced-dataset.service';
import { DatasetPreview as DatasetPreviewType } from '../../types/enhanced-dataset';

interface DataPreviewProps {
  data: DatasetPreviewType;
  onRefresh?: () => void;
}

export const DataPreview: React.FC<DataPreviewProps> = ({ data, onRefresh }) => {
  const handleDownloadFile = async (objectName: string, filename: string) => {
    try {
      await enhancedDatasetService.downloadDatasetFile(objectName, filename);
    } catch (error) {
      console.error('下载文件失败:', error);
      // 这里可以添加错误提示
    }
  };

  const renderPreviewContent = (filePreview: any) => {
    const { file, preview } = filePreview;

    if (preview.type === 'error') {
      return (
        <div className="flex items-center justify-center py-8 text-red-500">
          <AlertCircleIcon className="w-5 h-5 mr-2" />
          <span>{preview.message}</span>
        </div>
      );
    }

    switch (preview.type) {
      case 'tabular':
        return renderTabularPreview(preview);
      case 'json':
        return renderJsonPreview(preview);
      case 'text':
        return renderTextPreview(preview);
      case 'image':
        return renderImagePreview(preview);
      case 'unsupported':
        return (
          <div className="flex items-center justify-center py-8 text-gray-500">
            <FileTextIcon className="w-5 h-5 mr-2" />
            <span>{preview.message || '预览功能开发中'}</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center justify-center py-8 text-gray-500">
            <span>暂不支持此类型的预览</span>
          </div>
        );
    }
  };

  const renderTabularPreview = (preview: any) => {
    if (!preview.items || preview.items.length === 0) {
      return <div className="text-center py-4 text-gray-500">暂无数据</div>;
    }

    const columns = preview.stats?.columns || [];
    
    return (
      <div className="space-y-4">
        {/* 统计信息 */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">
            总行数: {preview.stats?.total_rows || preview.total_items}
          </Badge>
          <Badge variant="secondary">
            列数: {preview.stats?.total_columns || columns.length}
          </Badge>
          <Badge variant="secondary">
            预览: {preview.preview_count} 行
          </Badge>
        </div>

        {/* 表格预览 */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-200">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-200 px-2 py-1 text-xs font-medium text-left">
                  #
                </th>
                {columns.map((col: string) => (
                  <th key={col} className="border border-gray-200 px-2 py-1 text-xs font-medium text-left">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.items.map((item: any) => (
                <tr key={item.index} className="hover:bg-gray-50">
                  <td className="border border-gray-200 px-2 py-1 text-xs text-gray-600">
                    {item.index}
                  </td>
                  {columns.map((col: string) => (
                    <td key={col} className="border border-gray-200 px-2 py-1 text-xs">
                      {String(item.data?.[col] ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderJsonPreview = (preview: any) => {
    return (
      <div className="space-y-4">
        <div className="flex gap-2">
          <Badge variant="secondary">
            格式: {preview.format}
          </Badge>
          <Badge variant="secondary">
            总条目: {preview.total_items}
          </Badge>
          <Badge variant="secondary">
            预览: {preview.preview_count} 条
          </Badge>
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {preview.items.map((item: any) => (
            <div key={item.index} className="bg-gray-50 rounded p-3">
              <div className="text-xs text-gray-500 mb-2">条目 #{item.index}</div>
              <pre className="text-xs overflow-x-auto">
                {JSON.stringify(item.data, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderTextPreview = (preview: any) => {
    return (
      <div className="space-y-4">
        <div className="flex gap-2">
          <Badge variant="secondary">
            总行数: {preview.total_items}
          </Badge>
          <Badge variant="secondary">
            预览: {preview.preview_count} 行
          </Badge>
        </div>

        <div className="bg-gray-50 rounded p-4 max-h-96 overflow-y-auto">
          {preview.items.map((item: any) => (
            <div key={item.index} className="flex text-sm">
              <span className="text-gray-400 mr-3 w-8 text-right">
                {item.index}
              </span>
              <span className="flex-1 font-mono">
                {item.content}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderImagePreview = (preview: any) => {
    if (preview.format === 'single_image' && preview.items.length > 0) {
      const item = preview.items[0];
      return (
        <div className="space-y-4">
          <div className="flex gap-2">
            <Badge variant="secondary">
              尺寸: {item.metadata?.width} × {item.metadata?.height}
            </Badge>
            <Badge variant="secondary">
              模式: {item.metadata?.mode}
            </Badge>
            <Badge variant="secondary">
              大小: {(item.metadata?.size / 1024).toFixed(1)} KB
            </Badge>
          </div>

          <div className="flex justify-center">
            <img
              src={item.thumbnail}
              alt={item.filename}
              className="max-w-full max-h-64 rounded border"
            />
          </div>
        </div>
      );
    }

    return (
      <div className="text-center py-8 text-gray-500">
        <ImageIcon className="w-8 h-8 mx-auto mb-2" />
        <span>{preview.message || '图像预览功能开发中'}</span>
      </div>
    );
  };

  const getFileTypeIcon = (fileType: string) => {
    switch (fileType.toLowerCase()) {
      case 'text':
        return <FileTextIcon className="w-4 h-4" />;
      case 'image':
        return <ImageIcon className="w-4 h-4" />;
      default:
        return <FileTextIcon className="w-4 h-4" />;
    }
  };

  if (!data.preview || !data.preview.files || data.preview.files.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center py-8 text-gray-500">
          <FileTextIcon className="w-8 h-8 mx-auto mb-2" />
          <p>{data.preview?.message || '暂无可预览的数据'}</p>
          {onRefresh && (
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={onRefresh}
            >
              刷新预览
            </Button>
          )}
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* 总览信息 */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold mb-2">数据预览</h3>
            <div className="space-y-1">
              <p className="text-sm text-gray-600">
                数据集: {data.dataset?.name} | 
                版本: {data.version?.version || '暂无版本'}
              </p>
              <p className="text-sm text-gray-600">
                总文件数: {data.preview.total_files} | 
                预览文件数: {data.preview.preview_files}
              </p>
              {data.version && (
                <div className="flex gap-2 mt-2">
                  <Badge variant={data.version.is_default ? "default" : "secondary"}>
                    {data.version.is_default ? '默认版本' : data.version.version_type}
                  </Badge>
                  <Badge variant="outline">
                    {data.version.author}
                  </Badge>
                  <Badge variant="outline">
                    {data.version.total_size_formatted}
                  </Badge>
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {onRefresh && (
              <Button variant="outline" size="sm" onClick={onRefresh}>
                <EyeIcon className="w-4 h-4 mr-2" />
                刷新预览
              </Button>
            )}
            {data.version && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => enhancedDatasetService.exportVersionInfo(data.version!.id)}
              >
                导出信息
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* 文件预览列表 */}
      {data.preview.files.map((filePreview, index) => (
        <Card key={filePreview.file.id} className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {getFileTypeIcon(filePreview.file.file_type)}
              <div>
                <h4 className="font-medium">{filePreview.file.filename}</h4>
                <p className="text-sm text-gray-600">
                  {filePreview.file.file_type} · {filePreview.file.file_size_formatted}
                </p>
                {filePreview.file.checksum && (
                  <p className="text-xs text-gray-400 font-mono">
                    校验和: {filePreview.file.checksum.slice(0, 8)}...
                  </p>
                )}
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleDownloadFile(
                filePreview.file.minio_object_name,
                filePreview.file.filename
              )}
            >
              <DownloadIcon className="w-4 h-4 mr-2" />
              下载
            </Button>
          </div>

          {renderPreviewContent(filePreview)}
        </Card>
      ))}

      {/* 版本信息卡片 */}
      {data.version && (
        <Card className="p-6">
          <h4 className="font-semibold mb-3">版本信息</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">提交哈希:</span>
              <span className="ml-2 font-mono">{data.version.commit_hash}</span>
            </div>
            <div>
              <span className="text-gray-600">创建时间:</span>
              <span className="ml-2">{new Date(data.version.created_at).toLocaleString()}</span>
            </div>
            <div className="md:col-span-2">
              <span className="text-gray-600">提交信息:</span>
              <span className="ml-2">{data.version.commit_message}</span>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}; 