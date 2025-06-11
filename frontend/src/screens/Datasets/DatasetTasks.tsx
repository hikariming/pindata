import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { 
  ArrowLeftIcon,
  DatabaseIcon, 
  PlayIcon,
  PauseIcon,
  Square,
  RefreshCw,
  EyeIcon,
  MoreHorizontalIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  LoaderIcon,
  FileIcon,
  GlobeIcon,
  BrainIcon,
  DownloadIcon,
  TrashIcon
} from 'lucide-react';

interface DatasetTask {
  id: string;
  name: string;
  type: 'extract' | 'download' | 'distill';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused';
  progress: number;
  startTime: string;
  estimatedTime?: string;
  completedTime?: string;
  sourceInfo: string;
  outputFormat: string;
  errorMessage?: string;
  sampleCount?: number;
  processedSamples?: number;
}

/**
 * @deprecated 此组件使用模拟数据，未连接真实的后端API
 * 实际任务管理请使用 /tasks 页面
 */
export const DatasetTasks = (): JSX.Element => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState('all');

  // TODO: 连接真实的数据集任务API
  const [tasks] = useState<DatasetTask[]>([
    {
      id: '1',
      name: 'AI研究论文问答数据集',
      type: 'extract',
      status: 'running',
      progress: 65,
      startTime: '2024-02-20 14:30:00',
      estimatedTime: '2024-02-20 16:45:00',
      sourceInfo: 'research_papers.pdf (150MB)',
      outputFormat: 'JSONL',
      sampleCount: 5000,
      processedSamples: 3250
    },
    {
      id: '2',
      name: 'SQuAD v2.0',
      type: 'download',
      status: 'completed',
      progress: 100,
      startTime: '2024-02-20 10:15:00',
      completedTime: '2024-02-20 10:45:00',
      sourceInfo: 'https://huggingface.co/datasets/squad_v2',
      outputFormat: 'JSON',
      sampleCount: 130319,
      processedSamples: 130319
    },
    {
      id: '3',
      name: '数学推理数据集',
      type: 'distill',
      status: 'failed',
      progress: 25,
      startTime: '2024-02-20 09:00:00',
      sourceInfo: 'GPT-4',
      outputFormat: 'JSONL',
      errorMessage: 'API 配额不足，请检查账户余额',
      sampleCount: 10000,
      processedSamples: 2500
    },
    {
      id: '4',
      name: '产品评论情感分析',
      type: 'extract',
      status: 'pending',
      progress: 0,
      startTime: '2024-02-20 15:30:00',
      sourceInfo: 'product_reviews.csv (80MB)',
      outputFormat: 'CSV',
      sampleCount: 0,
      processedSamples: 0
    },
    {
      id: '5',
      name: '代码生成数据集',
      type: 'distill',
      status: 'paused',
      progress: 45,
      startTime: '2024-02-20 12:00:00',
      sourceInfo: 'Claude-3',
      outputFormat: 'JSONL',
      sampleCount: 8000,
      processedSamples: 3600
    }
  ]);

  const getStatusIcon = (status: DatasetTask['status']) => {
    switch (status) {
      case 'pending':
        return <ClockIcon className="w-4 h-4 text-[#f59e0b]" />;
      case 'running':
        return <LoaderIcon className="w-4 h-4 text-[#1977e5] animate-spin" />;
      case 'completed':
        return <CheckCircleIcon className="w-4 h-4 text-[#10b981]" />;
      case 'failed':
        return <XCircleIcon className="w-4 h-4 text-[#ef4444]" />;
      case 'paused':
        return <PauseIcon className="w-4 h-4 text-[#6b7280]" />;
      default:
        return <ClockIcon className="w-4 h-4 text-[#6b7280]" />;
    }
  };

  const getStatusBadge = (status: DatasetTask['status']) => {
    const styles = {
      pending: 'bg-orange-100 text-orange-800',
      running: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      paused: 'bg-gray-100 text-gray-800'
    };

    const labels = {
      pending: t('datasets.tasks.pending'),
      running: t('datasets.tasks.running'),
      completed: t('datasets.tasks.completed'),
      failed: t('datasets.tasks.failed'),
      paused: t('datasets.tasks.paused')
    };

    return (
      <Badge className={styles[status]}>
        {labels[status]}
      </Badge>
    );
  };

  const getTypeIcon = (type: DatasetTask['type']) => {
    switch (type) {
      case 'extract':
        return <FileIcon className="w-4 h-4 text-[#1977e5]" />;
      case 'download':
        return <GlobeIcon className="w-4 h-4 text-[#10b981]" />;
      case 'distill':
        return <BrainIcon className="w-4 h-4 text-[#8b5cf6]" />;
      default:
        return <FileIcon className="w-4 h-4 text-[#6b7280]" />;
    }
  };

  const getTypeLabel = (type: DatasetTask['type']) => {
    const labels = {
      extract: t('datasets.tasks.fileExtraction'),
      download: t('datasets.tasks.networkDownload'),
      distill: t('datasets.tasks.modelDistillation')
    };
    return labels[type];
  };

  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleString('zh-CN');
  };

  const calculateDuration = (startTime: string, endTime: string) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffMs = end.getTime() - start.getTime();
    const diffMins = Math.round(diffMs / 60000);
    
    if (diffMins < 60) {
      return t('datasets.tasks.minutes', { count: diffMins });
    } else {
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      return t('datasets.tasks.hours', { count: hours, mins });
    }
  };

  const filteredTasks = tasks.filter(task => {
    if (activeTab === 'all') return true;
    return task.status === activeTab;
  });

  const handleTaskAction = (taskId: string, action: 'pause' | 'resume' | 'stop' | 'retry') => {
    console.log(`Task ${taskId}: ${action}`);
    // 这里添加任务操作的逻辑
  };

  return (
    <div className="w-full max-w-[1200px] p-6">
      {/* Back Button */}
      <div className="mb-6">
        <Link to="/datasets">
          <Button variant="outline" className="border-[#d1dbe8] flex items-center gap-2">
            <ArrowLeftIcon className="w-4 h-4" />
            {t('datasets.tasks.backToList')}
          </Button>
        </Link>
      </div>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <DatabaseIcon className="w-8 h-8 text-[#1977e5]" />
            <div>
              <h1 className="text-2xl font-bold text-[#0c141c]">{t('datasets.tasks.title')}</h1>
              <p className="text-[#4f7096] text-lg">
                {t('datasets.tasks.subtitle')}
              </p>
            </div>
          </div>
          <Button className="bg-[#1977e5] hover:bg-[#1565c0] flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            {t('datasets.tasks.refreshStatus')}
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="border-[#d1dbe8] p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <LoaderIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-[#4f7096]">{t('datasets.tasks.running')}</p>
              <p className="text-xl font-bold text-[#0c141c]">
                {tasks.filter(t => t.status === 'running').length}
              </p>
            </div>
          </div>
        </Card>
        
        <Card className="border-[#d1dbe8] p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircleIcon className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-[#4f7096]">{t('datasets.tasks.completed')}</p>
              <p className="text-xl font-bold text-[#0c141c]">
                {tasks.filter(t => t.status === 'completed').length}
              </p>
            </div>
          </div>
        </Card>
        
        <Card className="border-[#d1dbe8] p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <ClockIcon className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-[#4f7096]">{t('datasets.tasks.pending')}</p>
              <p className="text-xl font-bold text-[#0c141c]">
                {tasks.filter(t => t.status === 'pending').length}
              </p>
            </div>
          </div>
        </Card>
        
        <Card className="border-[#d1dbe8] p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <XCircleIcon className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-[#4f7096]">{t('datasets.tasks.failed')}</p>
              <p className="text-xl font-bold text-[#0c141c]">
                {tasks.filter(t => t.status === 'failed').length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* 任务列表 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="all">{t('datasets.tasks.allTasks')}</TabsTrigger>
          <TabsTrigger value="running">{t('datasets.tasks.running')}</TabsTrigger>
          <TabsTrigger value="completed">{t('datasets.tasks.completed')}</TabsTrigger>
          <TabsTrigger value="failed">{t('datasets.tasks.failed')}</TabsTrigger>
          <TabsTrigger value="pending">{t('datasets.tasks.pending')}</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          <Card className="border-[#d1dbe8]">
            <div className="p-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('datasets.tasks.taskInfo')}</TableHead>
                    <TableHead>{t('datasets.tasks.type')}</TableHead>
                    <TableHead>{t('datasets.tasks.status')}</TableHead>
                    <TableHead>{t('datasets.tasks.progress')}</TableHead>
                    <TableHead>{t('datasets.tasks.time')}</TableHead>
                    <TableHead>{t('datasets.tasks.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTasks.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell>
                        <div>
                          <Link to={`/datasets/${task.id}`}>
                            <div className="font-medium text-[#0c141c] mb-1 hover:text-[#1977e5] cursor-pointer">
                              {task.name}
                            </div>
                          </Link>
                          <div className="text-sm text-[#4f7096]">
                            {task.sourceInfo}
                          </div>
                          {task.errorMessage && (
                            <div className="text-sm text-red-600 mt-1">
                              {t('datasets.tasks.error')}: {task.errorMessage}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getTypeIcon(task.type)}
                          <span className="text-sm">{getTypeLabel(task.type)}</span>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(task.status)}
                          {getStatusBadge(task.status)}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span>{task.progress}%</span>
                            {task.sampleCount && task.sampleCount > 0 && (
                              <span className="text-[#4f7096]">
                                {task.processedSamples?.toLocaleString()} / {task.sampleCount.toLocaleString()}
                              </span>
                            )}
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${
                                task.status === 'completed' ? 'bg-green-500' :
                                task.status === 'failed' ? 'bg-red-500' :
                                task.status === 'running' ? 'bg-blue-500' :
                                'bg-gray-400'
                              }`}
                              style={{ width: `${task.progress}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="text-sm space-y-1">
                          <div>{t('datasets.tasks.startTime')}: {formatTime(task.startTime)}</div>
                          {task.completedTime && (
                            <div className="text-green-600">
                              {t('datasets.tasks.completedTime')}: {formatTime(task.completedTime)}
                            </div>
                          )}
                          {task.estimatedTime && task.status === 'running' && (
                            <div className="text-[#4f7096]">
                              {t('datasets.tasks.estimatedTime')}: {formatTime(task.estimatedTime)}
                            </div>
                          )}
                          {task.completedTime && (
                            <div className="text-[#4f7096]">
                              {t('datasets.tasks.duration')}: {calculateDuration(task.startTime, task.completedTime)}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Link to={`/datasets/${task.id}`}>
                            <Button variant="outline" size="sm" className="h-8 px-2">
                              <EyeIcon className="w-4 h-4" />
                            </Button>
                          </Link>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm" className="h-8 px-2">
                                <MoreHorizontalIcon className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              {task.status === 'running' && (
                                <DropdownMenuItem onClick={() => handleTaskAction(task.id, 'pause')}>
                                  <PauseIcon className="w-4 h-4 mr-2" />
                                  {t('datasets.tasks.pause')}
                                </DropdownMenuItem>
                              )}
                              {task.status === 'paused' && (
                                <DropdownMenuItem onClick={() => handleTaskAction(task.id, 'resume')}>
                                  <PlayIcon className="w-4 h-4 mr-2" />
                                  {t('datasets.tasks.resume')}
                                </DropdownMenuItem>
                              )}
                              {(task.status === 'running' || task.status === 'paused') && (
                                <DropdownMenuItem onClick={() => handleTaskAction(task.id, 'stop')}>
                                  <Square className="w-4 h-4 mr-2" />
                                  {t('datasets.tasks.stop')}
                                </DropdownMenuItem>
                              )}
                              {task.status === 'failed' && (
                                <DropdownMenuItem onClick={() => handleTaskAction(task.id, 'retry')}>
                                  <RefreshCw className="w-4 h-4 mr-2" />
                                  {t('datasets.tasks.retry')}
                                </DropdownMenuItem>
                              )}
                              {task.status === 'completed' && (
                                <DropdownMenuItem>
                                  <DownloadIcon className="w-4 h-4 mr-2" />
                                  {t('datasets.tasks.downloadResult')}
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem className="text-red-600">
                                <TrashIcon className="w-4 h-4 mr-2" />
                                {t('datasets.tasks.deleteTask')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {filteredTasks.length === 0 && (
                <div className="text-center py-8 text-[#4f7096]">
                  {t('datasets.tasks.noTasks', { status: activeTab === 'all' ? '' : activeTab })}
                </div>
              )}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}; 