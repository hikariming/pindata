import React, { useState, useEffect } from 'react';
import { Card } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { Badge } from '../../../../components/ui/badge';
import {
  CheckCircleIcon,
  ClockIcon,
  AlertCircleIcon,
  XIcon,
  RefreshCwIcon,
  FileEditIcon,
  PlayIcon,
  PauseIcon,
  SquareIcon,
  Loader2Icon,
} from 'lucide-react';
import { useFileConversion } from '../../../../hooks/useFileConversion';

interface ConversionJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  file_count: number;
  completed_count: number;
  failed_count: number;
  progress_percentage: number;
  created_at: string;
  updated_at: string;
  method: 'markitdown' | 'vision_llm';
  error_message?: string;
}

interface ConversionProgressProps {
  jobs: ConversionJob[];
  onRefresh: () => void;
  onCancel: (jobId: string) => void;
  className?: string;
}

export const ConversionProgress = ({
  jobs,
  onRefresh,
  onCancel,
  className = '',
}: ConversionProgressProps): JSX.Element => {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await onRefresh();
    setTimeout(() => setRefreshing(false), 500);
  };

  const getStatusIcon = (status: ConversionJob['status']) => {
    switch (status) {
      case 'pending':
        return <ClockIcon className="w-4 h-4 text-yellow-500" />;
      case 'processing':
        return <Loader2Icon className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircleIcon className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <AlertCircleIcon className="w-4 h-4 text-red-500" />;
      case 'cancelled':
        return <XIcon className="w-4 h-4 text-gray-500" />;
      default:
        return <ClockIcon className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusText = (status: ConversionJob['status']) => {
    switch (status) {
      case 'pending':
        return '等待中';
      case 'processing':
        return '转换中';
      case 'completed':
        return '已完成';
      case 'failed':
        return '失败';
      case 'cancelled':
        return '已取消';
      default:
        return '未知';
    }
  };

  const getStatusColor = (status: ConversionJob['status']) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'processing':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'completed':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'failed':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'cancelled':
        return 'text-gray-600 bg-gray-50 border-gray-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getMethodIcon = (method: ConversionJob['method']) => {
    switch (method) {
      case 'markitdown':
        return '⚡';
      case 'vision_llm':
        return '🧠';
      default:
        return '📄';
    }
  };

  const getMethodText = (method: ConversionJob['method']) => {
    switch (method) {
      case 'markitdown':
        return '快速转换';
      case 'vision_llm':
        return 'AI 智能转换';
      default:
        return '未知方法';
    }
  };

  const formatTime = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleString('zh-CN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '无效时间';
    }
  };

  const activeJobs = jobs.filter(job => job.status === 'pending' || job.status === 'processing');
  const completedJobs = jobs.filter(job => job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled');

  if (jobs.length === 0) {
    return (
      <Card className={`border-[#d1dbe8] bg-white p-4 ${className}`}>
        <div className="text-center text-[#4f7096]">
          <FileEditIcon className="w-8 h-8 mx-auto mb-2 text-[#d1dbe8]" />
          <p className="text-sm">暂无转换任务</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`border-[#d1dbe8] bg-white ${className}`}>
      <div className="p-4 border-b border-[#d1dbe8]">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-[#0c141c]">转换进度</h3>
            <p className="text-sm text-[#4f7096]">
              {activeJobs.length > 0 ? `${activeJobs.length} 个任务正在执行` : '所有任务已完成'}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2"
          >
            <RefreshCwIcon className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            刷新
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* 进行中的任务 */}
        {activeJobs.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-[#0c141c] mb-3">正在执行</h4>
            <div className="space-y-3">
              {activeJobs.map((job) => (
                <div key={job.id} className="p-3 border border-[#e2e8f0] rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(job.status)}
                      <span className="text-sm font-medium text-[#0c141c]">
                        {getMethodIcon(job.method)} {getMethodText(job.method)}
                      </span>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${getStatusColor(job.status)}`}
                      >
                        {getStatusText(job.status)}
                      </Badge>
                    </div>
                    {(job.status === 'pending' || job.status === 'processing') && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onCancel(job.id)}
                        className="h-6 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <SquareIcon className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-[#4f7096]">
                      <span>进度</span>
                      <span>{job.completed_count}/{job.file_count} 文件</span>
                    </div>
                    <div className="w-full bg-[#f1f5f9] rounded-full h-2">
                      <div
                        className="bg-[#1977e5] h-2 rounded-full transition-all duration-300"
                        style={{ width: `${job.progress_percentage}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-[#4f7096]">
                      <span>开始时间: {formatTime(job.created_at)}</span>
                      <span>{job.progress_percentage.toFixed(1)}%</span>
                    </div>
                  </div>
                  
                  {job.error_message && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                      <strong>错误信息:</strong> {job.error_message}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 已完成的任务 */}
        {completedJobs.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-[#0c141c] mb-3">
              最近完成 ({completedJobs.slice(0, 3).length}/{completedJobs.length})
            </h4>
            <div className="space-y-2">
              {completedJobs.slice(0, 3).map((job) => (
                <div key={job.id} className="flex items-center justify-between p-2 border border-[#e2e8f0] rounded">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(job.status)}
                    <span className="text-sm text-[#0c141c]">
                      {getMethodIcon(job.method)} {getMethodText(job.method)}
                    </span>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${getStatusColor(job.status)}`}
                    >
                      {getStatusText(job.status)}
                    </Badge>
                  </div>
                  <div className="text-xs text-[#4f7096]">
                    {job.status === 'completed' && (
                      <span>{job.completed_count}/{job.file_count} 成功</span>
                    )}
                    {job.status === 'failed' && (
                      <span>{job.failed_count} 失败</span>
                    )}
                    {job.status === 'cancelled' && (
                      <span>已取消</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {completedJobs.length > 3 && (
              <p className="text-xs text-[#4f7096] mt-2 text-center">
                还有 {completedJobs.length - 3} 个已完成的任务...
              </p>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}; 