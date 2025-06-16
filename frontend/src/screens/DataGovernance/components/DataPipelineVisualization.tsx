import React, { useState } from 'react';
import { 
  PlayIcon, 
  PauseIcon, 
  CheckCircleIcon, 
  AlertCircleIcon, 
  ClockIcon,
  ArrowRightIcon,
  DatabaseIcon,
  FileTextIcon,
  FilterIcon,
  WandIcon,
  DownloadIcon,
  ChevronDownIcon,
  SettingsIcon,
  TrendingUpIcon,
  ActivityIcon,
} from 'lucide-react';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { PipelineStage } from '../types';

interface DataPipelineVisualizationProps {
  pipeline: PipelineStage[];
  onStageClick?: (stage: PipelineStage) => void;
  onRunPipeline?: () => void;
  onPausePipeline?: () => void;
}

const mockPipeline: PipelineStage[] = [
  {
    id: '1',
    name: '数据源接入',
    type: 'extract',
    status: 'completed',
    config: { sources: ['MySQL', 'Files', 'API'] },
    inputCount: 0,
    outputCount: 1500,
    processingTime: 45,
  },
  {
    id: '2', 
    name: '数据解析',
    type: 'extract',
    status: 'completed',
    config: { parsers: ['PDF', 'DOCX', 'CSV'] },
    inputCount: 1500,
    outputCount: 1450,
    processingTime: 120,
  },
  {
    id: '3',
    name: '数据清洗',
    type: 'clean',
    status: 'completed',
    config: { rules: ['remove_duplicates', 'validate_format'] },
    inputCount: 1450,
    outputCount: 1380,
    processingTime: 85,
  },
  {
    id: '4',
    name: '数据转换',
    type: 'transform',
    status: 'running',
    config: { transformers: ['normalize', 'enrich'] },
    inputCount: 1380,
    outputCount: 856,
    processingTime: 156,
  },
  {
    id: '5',
    name: '质量验证',
    type: 'validate',
    status: 'pending',
    config: { validators: ['schema_check', 'data_quality'] },
    inputCount: 0,
    outputCount: 0,
  },
  {
    id: '6',
    name: '数据输出',
    type: 'output',
    status: 'pending',
    config: { outputs: ['dataset', 'knowledge_base'] },
    inputCount: 0,
    outputCount: 0,
  },
];

export const DataPipelineVisualization: React.FC<DataPipelineVisualizationProps> = ({
  pipeline = mockPipeline,
  onStageClick,
  onRunPipeline,
  onPausePipeline,
}) => {
  const [expandedStage, setExpandedStage] = useState<string | null>(null);

  const getStageIcon = (type: PipelineStage['type']) => {
    const iconMap = {
      extract: DatabaseIcon,
      clean: FilterIcon,
      transform: WandIcon,
      validate: CheckCircleIcon,
      output: DownloadIcon,
    };
    return iconMap[type] || FileTextIcon;
  };

  const getStatusIcon = (status: PipelineStage['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon size={16} className="text-green-500" />;
      case 'running':
        return <ActivityIcon size={16} className="text-blue-500 animate-pulse" />;
      case 'error':
        return <AlertCircleIcon size={16} className="text-red-500" />;
      case 'pending':
      default:
        return <ClockIcon size={16} className="text-gray-400" />;
    }
  };

  const getStatusBadge = (status: PipelineStage['status']) => {
    const statusMap = {
      completed: { label: '已完成', variant: 'success' as const },
      running: { label: '运行中', variant: 'default' as const },
      error: { label: '错误', variant: 'destructive' as const },
      pending: { label: '等待中', variant: 'secondary' as const },
    };
    const config = statusMap[status];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getTotalProgress = () => {
    const completed = pipeline.filter(s => s.status === 'completed').length;
    return Math.round((completed / pipeline.length) * 100);
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}秒`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}分钟`;
    return `${Math.round(seconds / 3600)}小时`;
  };

  return (
    <div className="space-y-6">
      {/* 管道控制面板 */}
      <Card className="p-6 bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">数据处理管道</h3>
            <p className="text-gray-600">自动化数据转换和质量控制流程</p>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setExpandedStage(expandedStage ? null : pipeline[0]?.id)}
            >
              <SettingsIcon size={16} className="mr-2" />
              配置
            </Button>
            <Button onClick={onRunPipeline} className="bg-green-500 hover:bg-green-600">
              <PlayIcon size={16} className="mr-2" />
              运行管道
            </Button>
            <Button variant="outline" onClick={onPausePipeline}>
              <PauseIcon size={16} className="mr-2" />
              暂停
            </Button>
          </div>
        </div>

        {/* 总体进度 */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">总体进度</span>
            <span className="text-sm font-medium">{getTotalProgress()}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-500"
              style={{ width: `${getTotalProgress()}%` }}
            />
          </div>
        </div>

        {/* 快速统计 */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white/80 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUpIcon size={16} className="text-blue-500" />
              <span className="text-sm text-gray-600">总输入</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {pipeline[0]?.outputCount || 0}
            </p>
          </div>
          <div className="bg-white/80 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircleIcon size={16} className="text-green-500" />
              <span className="text-sm text-gray-600">已处理</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {pipeline.filter(s => s.status === 'completed').reduce((sum, s) => sum + s.outputCount, 0)}
            </p>
          </div>
          <div className="bg-white/80 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <ActivityIcon size={16} className="text-orange-500" />
              <span className="text-sm text-gray-600">处理中</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {pipeline.filter(s => s.status === 'running').length}
            </p>
          </div>
          <div className="bg-white/80 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <ClockIcon size={16} className="text-purple-500" />
              <span className="text-sm text-gray-600">总耗时</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {formatTime(pipeline.reduce((sum, s) => sum + (s.processingTime || 0), 0))}
            </p>
          </div>
        </div>
      </Card>

      {/* 管道阶段可视化 */}
      <div className="relative">
        {/* 连接线 */}
        <div className="absolute left-8 top-16 bottom-16 w-0.5 bg-gradient-to-b from-blue-200 via-purple-200 to-green-200 z-0" />
        
        <div className="space-y-4 relative z-10">
          {pipeline.map((stage, index) => {
            const StageIcon = getStageIcon(stage.type);
            const isExpanded = expandedStage === stage.id;
            
            return (
              <Card 
                key={stage.id} 
                className={`transition-all duration-300 hover:shadow-lg cursor-pointer ${
                  isExpanded ? 'ring-2 ring-blue-500 shadow-lg' : ''
                }`}
                onClick={() => {
                  setExpandedStage(isExpanded ? null : stage.id);
                  onStageClick?.(stage);
                }}
              >
                <div className="p-6">
                  <div className="flex items-center gap-4">
                    {/* 阶段图标 */}
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                      stage.status === 'completed' ? 'bg-green-100' :
                      stage.status === 'running' ? 'bg-blue-100' :
                      stage.status === 'error' ? 'bg-red-100' : 'bg-gray-100'
                    }`}>
                      <StageIcon size={24} className={
                        stage.status === 'completed' ? 'text-green-600' :
                        stage.status === 'running' ? 'text-blue-600' :
                        stage.status === 'error' ? 'text-red-600' : 'text-gray-400'
                      } />
                    </div>

                    {/* 阶段信息 */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-lg font-semibold text-gray-900">{stage.name}</h4>
                        {getStatusBadge(stage.status)}
                        {getStatusIcon(stage.status)}
                      </div>
                      
                      <div className="flex items-center gap-6 text-sm text-gray-600">
                        <span>输入: {stage.inputCount.toLocaleString()}</span>
                        <ArrowRightIcon size={14} />
                        <span>输出: {stage.outputCount.toLocaleString()}</span>
                        {stage.processingTime && (
                          <>
                            <span>•</span>
                            <span>耗时: {formatTime(stage.processingTime)}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* 数据流动指示器 */}
                    <div className="flex flex-col items-center gap-2">
                      <div className={`w-4 h-4 rounded-full ${
                        stage.status === 'running' ? 'bg-blue-500 animate-pulse' :
                        stage.status === 'completed' ? 'bg-green-500' : 'bg-gray-300'
                      }`} />
                      {stage.status === 'running' && (
                        <div className="text-xs text-blue-600 animate-pulse">
                          {Math.round((stage.outputCount / stage.inputCount) * 100) || 0}%
                        </div>
                      )}
                    </div>

                    {/* 展开按钮 */}
                    <Button variant="ghost" size="sm">
                      <ChevronDownIcon 
                        size={16} 
                        className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      />
                    </Button>
                  </div>

                  {/* 展开详细信息 */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <h5 className="font-medium text-gray-900 mb-2">配置信息</h5>
                          <div className="space-y-2">
                            {Object.entries(stage.config).map(([key, value]) => (
                              <div key={key} className="flex justify-between text-sm">
                                <span className="text-gray-600 capitalize">{key}:</span>
                                <span className="text-gray-900">
                                  {Array.isArray(value) ? value.join(', ') : String(value)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h5 className="font-medium text-gray-900 mb-2">处理统计</h5>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">数据通过率:</span>
                              <span className="text-gray-900">
                                {stage.inputCount > 0 
                                  ? Math.round((stage.outputCount / stage.inputCount) * 100) 
                                  : 0}%
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">处理速度:</span>
                              <span className="text-gray-900">
                                {stage.processingTime && stage.inputCount > 0
                                  ? `${Math.round(stage.inputCount / stage.processingTime)}/秒`
                                  : 'N/A'}
                              </span>
                            </div>
                            {stage.error && (
                              <div className="text-red-600 text-xs mt-2">
                                错误: {stage.error}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 flex gap-2">
                        <Button size="sm" variant="outline">
                          <SettingsIcon size={14} className="mr-2" />
                          配置
                        </Button>
                        <Button size="sm" variant="outline">
                          <PlayIcon size={14} className="mr-2" />
                          重新运行
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};