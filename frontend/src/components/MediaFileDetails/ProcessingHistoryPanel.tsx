import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { 
  ClockIcon, 
  CheckCircleIcon, 
  XCircleIcon, 
  PlayIcon,
  PauseIcon,
  AlertCircleIcon,
  RotateCcwIcon,
  InfoIcon,
  DownloadIcon,
  EyeIcon
} from 'lucide-react';

interface ProcessingStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startTime?: string;
  endTime?: string;
  duration?: number;
  progress?: number;
  error?: string;
  outputPath?: string;
  metadata?: any;
}

interface ProcessingHistoryPanelProps {
  fileData: any;
}

export const ProcessingHistoryPanel: React.FC<ProcessingHistoryPanelProps> = ({ fileData }) => {
  const [processingSteps, setProcessingSteps] = useState<ProcessingStep[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 模拟处理步骤数据，实际应该从API获取
  useEffect(() => {
    generateProcessingSteps();
  }, [fileData]);

  const generateProcessingSteps = () => {
    // 根据文件类型生成相应的处理步骤
    const steps: ProcessingStep[] = [];
    
    // 通用步骤
    steps.push({
      id: 'upload',
      name: '文件上传',
      status: 'completed',
      startTime: fileData.upload_at,
      endTime: fileData.upload_at,
      duration: 0
    });

    steps.push({
      id: 'validation',
      name: '文件验证',
      status: 'completed',
      startTime: fileData.upload_at,
      endTime: fileData.upload_at,
      duration: 1,
      metadata: {
        fileSize: fileData.file_size,
        mimeType: fileData.mime_type,
        checksum: fileData.checksum
      }
    });

    // 根据文件类型添加特定步骤
    if (fileData.file_category === 'image') {
      steps.push({
        id: 'image_analysis',
        name: '图片分析',
        status: fileData.processing_status === 'completed' ? 'completed' : 
               fileData.processing_status === 'failed' ? 'failed' :
               fileData.processing_status === 'processing' ? 'running' : 'pending',
        startTime: fileData.upload_at,
        endTime: fileData.processed_at,
        progress: fileData.processing_progress || 0,
        metadata: {
          width: fileData.image_width,
          height: fileData.image_height,
          colorMode: fileData.color_mode
        }
      });

      steps.push({
        id: 'thumbnail_generation',
        name: '缩略图生成',
        status: fileData.thumbnail_path ? 'completed' : 'pending',
        outputPath: fileData.thumbnail_path
      });

      steps.push({
        id: 'metadata_extraction',
        name: '元数据提取',
        status: fileData.file_metadata ? 'completed' : 'pending',
        metadata: fileData.file_metadata
      });
    }

    if (fileData.file_category === 'video') {
      steps.push({
        id: 'video_analysis',
        name: '视频分析',
        status: fileData.processing_status === 'completed' ? 'completed' : 
               fileData.processing_status === 'failed' ? 'failed' :
               fileData.processing_status === 'processing' ? 'running' : 'pending',
        startTime: fileData.upload_at,
        endTime: fileData.processed_at,
        progress: fileData.processing_progress || 0,
        metadata: {
          width: fileData.video_width,
          height: fileData.video_height,
          duration: fileData.duration,
          frameRate: fileData.frame_rate,
          videoCodec: fileData.video_codec,
          audioCodec: fileData.audio_codec
        }
      });

      steps.push({
        id: 'video_thumbnail',
        name: '视频缩略图',
        status: fileData.thumbnail_path ? 'completed' : 'pending',
        outputPath: fileData.thumbnail_path
      });

      steps.push({
        id: 'audio_extraction',
        name: '音频提取',
        status: 'pending'
      });
    }

    // 质量评估
    if (fileData.content_quality_score > 0) {
      steps.push({
        id: 'quality_assessment',
        name: '质量评估',
        status: 'completed',
        metadata: {
          qualityScore: fileData.content_quality_score,
          extractionConfidence: fileData.extraction_confidence
        }
      });
    }

    setProcessingSteps(steps);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon size={16} className="text-green-500" />;
      case 'failed':
        return <XCircleIcon size={16} className="text-red-500" />;
      case 'running':
        return <PlayIcon size={16} className="text-blue-500" />;
      case 'skipped':
        return <AlertCircleIcon size={16} className="text-yellow-500" />;
      default:
        return <ClockIcon size={16} className="text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      'completed': 'bg-green-100 text-green-800',
      'failed': 'bg-red-100 text-red-800',
      'running': 'bg-blue-100 text-blue-800',
      'pending': 'bg-gray-100 text-gray-600',
      'skipped': 'bg-yellow-100 text-yellow-800'
    };

    const texts = {
      'completed': '已完成',
      'failed': '失败',
      'running': '进行中',
      'pending': '待处理',
      'skipped': '已跳过'
    };

    return (
      <Badge className={variants[status as keyof typeof variants] || variants.pending}>
        {texts[status as keyof typeof texts] || status}
      </Badge>
    );
  };

  const formatDuration = (duration?: number) => {
    if (!duration) return '未知';
    if (duration < 60) return `${duration}秒`;
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}分${seconds}秒`;
  };

  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return '未知';
    return new Date(timestamp).toLocaleString('zh-CN');
  };

  const refreshHistory = async () => {
    setIsRefreshing(true);
    // 模拟API调用
    setTimeout(() => {
      generateProcessingSteps();
      setIsRefreshing(false);
    }, 1000);
  };

  const totalSteps = processingSteps.length;
  const completedSteps = processingSteps.filter(step => step.status === 'completed').length;
  const failedSteps = processingSteps.filter(step => step.status === 'failed').length;
  const overallProgress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  return (
    <div className="h-full overflow-y-auto p-6 bg-gray-50">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* 概览统计 */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">处理概览</h3>
            <Button
              onClick={refreshHistory}
              disabled={isRefreshing}
              variant="outline"
              size="sm"
            >
              <RotateCcwIcon size={16} className={`mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              刷新
            </Button>
          </div>
          
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{totalSteps}</div>
              <div className="text-sm text-gray-600">总步骤</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{completedSteps}</div>
              <div className="text-sm text-gray-600">已完成</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{failedSteps}</div>
              <div className="text-sm text-gray-600">失败</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">{totalSteps - completedSteps - failedSteps}</div>
              <div className="text-sm text-gray-600">待处理</div>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>总体进度</span>
              <span>{Math.round(overallProgress)}%</span>
            </div>
            <Progress value={overallProgress} className="w-full" />
          </div>
        </Card>

        {/* 处理步骤时间线 */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">处理时间线</h3>
          
          <div className="relative">
            {/* 时间线线条 */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>
            
            <div className="space-y-6">
              {processingSteps.map((step, index) => (
                <div key={step.id} className="relative flex items-start space-x-4">
                  {/* 时间线节点 */}
                  <div className="relative z-10 flex items-center justify-center w-8 h-8 bg-white border-2 border-gray-200 rounded-full">
                    {getStatusIcon(step.status)}
                  </div>
                  
                  {/* 步骤内容 */}
                  <div className="flex-1 min-w-0">
                    <Card className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <h4 className="text-sm font-medium">{step.name}</h4>
                          {getStatusBadge(step.status)}
                        </div>
                        <div className="flex items-center space-x-2">
                          {step.outputPath && (
                            <Button size="sm" variant="ghost">
                              <DownloadIcon size={14} />
                            </Button>
                          )}
                          {step.metadata && (
                            <Button size="sm" variant="ghost">
                              <InfoIcon size={14} />
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      {/* 进度条（运行中的步骤） */}
                      {step.status === 'running' && step.progress !== undefined && (
                        <div className="mb-3">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span>进度</span>
                            <span>{step.progress}%</span>
                          </div>
                          <Progress value={step.progress} className="w-full h-2" />
                        </div>
                      )}
                      
                      {/* 时间信息 */}
                      <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
                        <div>
                          <span className="font-medium">开始时间:</span>
                          <div>{formatTimestamp(step.startTime)}</div>
                        </div>
                        <div>
                          <span className="font-medium">结束时间:</span>
                          <div>{formatTimestamp(step.endTime)}</div>
                        </div>
                        {step.duration !== undefined && (
                          <div>
                            <span className="font-medium">耗时:</span>
                            <div>{formatDuration(step.duration)}</div>
                          </div>
                        )}
                        {step.outputPath && (
                          <div>
                            <span className="font-medium">输出:</span>
                            <div className="truncate">{step.outputPath}</div>
                          </div>
                        )}
                      </div>
                      
                      {/* 错误信息 */}
                      {step.status === 'failed' && step.error && (
                        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs">
                          <div className="font-medium text-red-800 mb-1">错误信息:</div>
                          <div className="text-red-600">{step.error}</div>
                        </div>
                      )}
                      
                      {/* 元数据信息 */}
                      {step.metadata && (
                        <div className="mt-3">
                          <details className="text-xs">
                            <summary className="cursor-pointer font-medium text-gray-700 hover:text-gray-900">
                              查看详细信息
                            </summary>
                            <pre className="mt-2 p-2 bg-gray-50 rounded text-xs overflow-auto max-h-32">
                              {JSON.stringify(step.metadata, null, 2)}
                            </pre>
                          </details>
                        </div>
                      )}
                    </Card>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* 性能统计 */}
        {fileData.processed_at && fileData.upload_at && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">性能统计</h3>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">总处理时间</label>
                <p className="text-lg font-semibold mt-1">
                  {formatDuration(
                    Math.floor((new Date(fileData.processed_at).getTime() - new Date(fileData.upload_at).getTime()) / 1000)
                  )}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">处理速度</label>
                <p className="text-lg font-semibold mt-1">
                  {fileData.file_size ? 
                    `${(fileData.file_size / 1024 / Math.max(1, Math.floor((new Date(fileData.processed_at).getTime() - new Date(fileData.upload_at).getTime()) / 1000))).toFixed(2)} KB/s`
                    : '未知'
                  }
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">成功率</label>
                <p className="text-lg font-semibold mt-1">
                  {totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0}%
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};