import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
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
  PlayIcon, 
  PauseIcon, 
  XIcon, 
  RefreshCwIcon,
  TrashIcon,
  EyeIcon,
  FilterIcon,
  SearchIcon,
  MoreVerticalIcon,
  AlertCircleIcon,
  CheckCircleIcon,
  ClockIcon,
  ZapIcon,
  FileTextIcon,
  DatabaseIcon,
  BrainIcon,
  PackageIcon,
  TrendingUpIcon,
  ActivityIcon,
  DownloadIcon,
  CloudDownloadIcon,
  AlertTriangleIcon,
  ListIcon,
  Layers3Icon,
  LoaderIcon
} from 'lucide-react';
import { Input } from '../../components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { TaskQueue } from './TaskQueue';
import { SystemMonitor } from './SystemMonitor';
import { taskService } from '../../services/task.service';
import { 
  DisplayTask, 
  TaskStatistics as ApiTaskStatistics,
  TaskStatus as ApiTaskStatus,
  TaskType as ApiTaskType 
} from '../../types/task';

// 兼容现有接口定义
interface Task extends DisplayTask {}

interface TaskStatistics {
  total: number;
  running: number;
  pending: number;
  completed: number;
  failed: number;
}

type TaskStatus = 'all' | 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
type TaskType = 'all' | 'file_conversion' | 'dataset_generation' | 'data_distillation' | 'batch_processing' | 'model_training' | 'data_preprocessing';

export const Tasks = (): JSX.Element => {
  const { t } = useTranslation();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatus>('all');
  const [typeFilter, setTypeFilter] = useState<TaskType>('all');
  const [showDetails, setShowDetails] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('tasks');
  const [loading, setLoading] = useState(false);
  const [statistics, setStatistics] = useState<TaskStatistics>({
    total: 0,
    running: 0,
    pending: 0,
    completed: 0,
    failed: 0
  });
  const [pagination, setPagination] = useState({
    page: 1,
    per_page: 20,
    total: 0,
    total_pages: 0,
    has_next: false,
    has_prev: false
  });

  // 获取任务列表
  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      
      const params: any = {
        page: pagination.page,
        per_page: pagination.per_page
      };

      // 添加过滤参数
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      
      if (typeFilter !== 'all') {
        // 映射前端类型到后端类型
        const typeMapping: Record<string, string> = {
          'file_conversion': 'DOCUMENT_CONVERSION',
          'data_preprocessing': 'DATA_PROCESSING',
          'dataset_generation': 'DATA_IMPORT',
          'batch_processing': 'DATA_EXPORT',
          'model_training': 'PIPELINE_EXECUTION'
        };
        params.type = typeMapping[typeFilter];
      }

      if (searchTerm.trim()) {
        params.search = searchTerm.trim();
      }

      const { tasks: taskList, pagination: paginationData } = await taskService.getDisplayTasks(params);
      
      setTasks(taskList);
      setPagination(paginationData);
    } catch (error) {
      console.error('获取任务列表失败:', error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.per_page, statusFilter, typeFilter, searchTerm]);

  // 获取任务统计
  const fetchStatistics = useCallback(async () => {
    try {
      const stats: ApiTaskStatistics = await taskService.getTaskStatistics();
      setStatistics({
        total: stats.total,
        running: stats.running,
        pending: stats.pending,
        completed: stats.completed,
        failed: stats.failed
      });
    } catch (error) {
      console.error('获取任务统计失败:', error);
    }
  }, []);

  // 初始化数据
  useEffect(() => {
    fetchTasks();
    fetchStatistics();
  }, [fetchTasks, fetchStatistics]);

  // 实时更新运行中任务的进度 - 简化为定期刷新
  useEffect(() => {
    let intervalId: number;
    
    // 如果有运行中的任务，设置定时刷新
    const runningTasksCount = tasks.filter(task => task.status === 'running').length;
    if (runningTasksCount > 0) {
      console.info(`启动定时刷新，${runningTasksCount} 个运行中任务，刷新间隔: 10秒`);
      
      intervalId = window.setInterval(async () => {
        try {
          console.debug('定时刷新任务列表...');
          await fetchTasks();
          await fetchStatistics();
          console.debug('定时刷新完成');
        } catch (error) {
          console.warn('定时刷新失败:', error);
        }
      }, 10000); // 每10秒刷新一次
    }
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
        console.info('停止定时刷新');
      }
    };
  }, [tasks.filter(task => task.status === 'running').length, fetchTasks, fetchStatistics]); // 依赖运行中任务的数量

  // 清理已完成任务的进度缓存
  useEffect(() => {
    tasks.forEach(task => {
      if (task.status === 'completed' || task.status === 'failed' || task.status === 'cancelled') {
        taskService.clearProgressCache(task.id);
      }
    });
  }, [tasks]);

  // 搜索防抖
  useEffect(() => {
    const timer = setTimeout(() => {
      if (pagination.page !== 1) {
        setPagination(prev => ({ ...prev, page: 1 }));
      } else {
        fetchTasks();
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // 过滤器变化时重新获取数据
  useEffect(() => {
    if (pagination.page !== 1) {
      setPagination(prev => ({ ...prev, page: 1 }));
    } else {
      fetchTasks();
    }
  }, [statusFilter, typeFilter]);

  const getTaskTypeIcon = (type: Task['type']) => {
    switch (type) {
      case 'file_conversion':
        return <FileTextIcon className="w-4 h-4 text-blue-500" />;
      case 'dataset_generation':
        return <DatabaseIcon className="w-4 h-4 text-green-500" />;
      case 'DATASET_GENERATION':
        return <DatabaseIcon className="w-4 h-4 text-green-500" />;
      case 'DATA_IMPORT':
        return <CloudDownloadIcon className="w-4 h-4 text-blue-500" />;
      case 'data_distillation':
        return <BrainIcon className="w-4 h-4 text-purple-500" />;
      case 'batch_processing':
        return <PackageIcon className="w-4 h-4 text-orange-500" />;
      case 'model_training':
        return <TrendingUpIcon className="w-4 h-4 text-red-500" />;
      case 'data_preprocessing':
        return <ZapIcon className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getTaskTypeLabel = (type: Task['type']) => {
    switch (type) {
      case 'file_conversion':
        return t('tasks.filters.typeLabels.fileConversion');
      case 'dataset_generation':
        return t('tasks.filters.typeLabels.datasetGeneration');
      case 'DATASET_GENERATION':
        return t('tasks.filters.typeLabels.datasetGeneration');
      case 'data_distillation':
        return t('tasks.filters.typeLabels.dataDistillation');
      case 'batch_processing':
        return t('tasks.filters.typeLabels.batchProcessing');
      case 'model_training':
        return t('tasks.filters.typeLabels.modelTraining');
      case 'data_preprocessing':
        return t('tasks.filters.typeLabels.dataPreprocessing');
      case 'DATA_IMPORT':
        return t('rawData.fileStatus.processed'); // 数据导入使用现有的翻译
    }
  };

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'running':
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

  const getStatusLabel = (status: Task['status']) => {
    switch (status) {
      case 'pending':
        return t('tasks.status.pending');
      case 'running':
        return t('tasks.status.running');
      case 'completed':
        return t('tasks.status.completed');
      case 'failed':
        return t('tasks.status.failed');
      case 'cancelled':
        return t('tasks.status.cancelled');
      default:
        return t('tasks.status.unknown');
    }
  };

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'low':
        return 'text-gray-600';
      case 'medium':
        return 'text-blue-600';
      case 'high':
        return 'text-orange-600';
      case 'urgent':
        return 'text-red-600';
    }
  };

  const getPriorityLabel = (priority: Task['priority']) => {
    switch (priority) {
      case 'low':
        return t('tasks.priority.low');
      case 'medium':
        return t('tasks.priority.medium');
      case 'high':
        return t('tasks.priority.high');
      case 'urgent':
        return t('tasks.priority.urgent');
    }
  };

  const formatDuration = (startTime: string, endTime?: string) => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const duration = Math.floor((end.getTime() - start.getTime()) / 1000 / 60);
    
    if (duration < 60) {
      return t('tasks.duration.minutes', { count: duration });
    } else {
      const hours = Math.floor(duration / 60);
      const minutes = duration % 60;
      return t('tasks.duration.hoursMinutes', { hours, minutes });
    }
  };

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.libraryName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.datasetName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    const matchesType = typeFilter === 'all' || task.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const toggleSelectAll = () => {
    if (selectedTasks.size === filteredTasks.length) {
      setSelectedTasks(new Set());
    } else {
      setSelectedTasks(new Set(filteredTasks.map(task => task.id)));
    }
  };

  const toggleTaskSelection = (taskId: string) => {
    const newSelectedTasks = new Set(selectedTasks);
    if (selectedTasks.has(taskId)) {
      newSelectedTasks.delete(taskId);
    } else {
      newSelectedTasks.add(taskId);
    }
    setSelectedTasks(newSelectedTasks);
  };

  const handleBatchOperation = async (operation: 'pause' | 'resume' | 'cancel' | 'delete') => {
    if (selectedTasks.size === 0) {
      console.log('请选择要操作的任务');
      return;
    }

    try {
      setLoading(true);
      const taskIds = Array.from(selectedTasks).map(id => parseInt(id));
      
      if (operation === 'delete') {
        const result = await taskService.batchDeleteTasks(taskIds);
        console.log(`成功删除 ${result.deleted_count} 个任务${result.failed_count > 0 ? `，${result.failed_count} 个任务删除失败` : ''}`);
      } else if (operation === 'cancel') {
        // 批量取消任务
        let successCount = 0;
        let failCount = 0;
        
        for (const taskId of taskIds) {
          try {
            await taskService.cancelTask(taskId);
            successCount++;
          } catch (error) {
            failCount++;
          }
        }
        
        console.log(`成功取消 ${successCount} 个任务${failCount > 0 ? `，${failCount} 个任务取消失败` : ''}`);
      }
      
      setSelectedTasks(new Set());
      await fetchTasks();
      await fetchStatistics();
    } catch (error) {
      console.error(`批量${operation}任务失败:`, error);
      console.log(`批量${operation}任务失败`);
    } finally {
      setLoading(false);
    }
  };

  const handleTaskOperation = async (taskId: string, operation: 'pause' | 'resume' | 'cancel' | 'retry' | 'delete') => {
    try {
      setLoading(true);
      const numericTaskId = parseInt(taskId);
      
      if (operation === 'delete') {
        await taskService.deleteTask(numericTaskId);
        console.log('任务删除成功');
      } else if (operation === 'cancel') {
        await taskService.cancelTask(numericTaskId);
        console.log('任务取消成功');
      }
      
      await fetchTasks();
      await fetchStatistics();
    } catch (error: any) {
      console.error(`${operation}任务失败:`, error);
      console.log(error.message || `${operation}任务失败`);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    await fetchTasks();
    await fetchStatistics();
  };

  return (
    <div className="w-full max-w-[1400px] p-6">
      {/* 页面标题 */}
      <div className="mb-6">
        <h1 className="text-[28px] font-bold leading-8 text-[#0c141c] mb-2">{t('tasks.title')}</h1>
        <p className="text-[#4f7096] mb-4">{t('tasks.description')}</p>
      </div>

      {/* 统计面板 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Card className="border-[#d1dbe8] bg-white p-4">
          <div className="flex items-center">
            <ActivityIcon className="w-8 h-8 text-[#1977e5] mr-3" />
            <div>
              <p className="text-sm text-[#4f7096]">{t('tasks.statistics.totalTasks')}</p>
              <p className="text-xl font-bold text-[#0c141c]">{statistics.total}</p>
            </div>
          </div>
        </Card>
        
        <Card className="border-[#d1dbe8] bg-white p-4">
          <div className="flex items-center">
            <PlayIcon className="w-8 h-8 text-blue-500 mr-3" />
            <div>
              <p className="text-sm text-[#4f7096]">{t('tasks.statistics.running')}</p>
              <p className="text-xl font-bold text-[#0c141c]">{statistics.running}</p>
            </div>
          </div>
        </Card>
        
        <Card className="border-[#d1dbe8] bg-white p-4">
          <div className="flex items-center">
            <ClockIcon className="w-8 h-8 text-yellow-500 mr-3" />
            <div>
              <p className="text-sm text-[#4f7096]">{t('tasks.statistics.pending')}</p>
              <p className="text-xl font-bold text-[#0c141c]">{statistics.pending}</p>
            </div>
          </div>
        </Card>
        
        <Card className="border-[#d1dbe8] bg-white p-4">
          <div className="flex items-center">
            <CheckCircleIcon className="w-8 h-8 text-green-500 mr-3" />
            <div>
              <p className="text-sm text-[#4f7096]">{t('tasks.statistics.completed')}</p>
              <p className="text-xl font-bold text-[#0c141c]">{statistics.completed}</p>
            </div>
          </div>
        </Card>
        
        <Card className="border-[#d1dbe8] bg-white p-4">
          <div className="flex items-center">
            <AlertCircleIcon className="w-8 h-8 text-red-500 mr-3" />
            <div>
              <p className="text-sm text-[#4f7096]">{t('tasks.statistics.failed')}</p>
              <p className="text-xl font-bold text-[#0c141c]">{statistics.failed}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* 标签页 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start mb-6">
          <TabsTrigger value="tasks" className="flex items-center gap-2">
            <ListIcon className="w-4 h-4" />
            {t('tasks.tabs.taskList')}
          </TabsTrigger>
          <TabsTrigger value="queue" className="flex items-center gap-2">
            <Layers3Icon className="w-4 h-4" />
            {t('tasks.tabs.taskQueue')}
          </TabsTrigger>
          <TabsTrigger value="monitor" className="flex items-center gap-2">
            <ActivityIcon className="w-4 h-4" />
            {t('tasks.tabs.systemMonitor')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tasks">
          {/* 操作栏 */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-2">
              {selectedTasks.size > 0 && (
                <>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleBatchOperation('pause')}
                    className="border-[#d1dbe8] text-[#4f7096] hover:bg-[#e8edf2]"
                  >
                    <PauseIcon className="w-4 h-4 mr-2" />
                    {t('tasks.actions.pauseSelected')} ({selectedTasks.size})
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleBatchOperation('cancel')}
                    className="border-[#d1dbe8] text-red-600 hover:bg-red-50"
                  >
                    <XIcon className="w-4 h-4 mr-2" />
                    {t('tasks.actions.cancelSelected')}
                  </Button>
                </>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                className="border-[#d1dbe8] text-[#4f7096] hover:bg-[#e8edf2]"
                onClick={handleRefresh}
                disabled={loading}
              >
                {loading ? (
                  <LoaderIcon className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCwIcon className="w-4 h-4 mr-2" />
                )}
                {t('tasks.actions.refresh')}
              </Button>
              
              {/* 显示运行中任务的自动刷新状态 */}
              {tasks.filter(task => task.status === 'running').length > 0 && (
                <div className="flex items-center text-sm text-[#4f7096] bg-blue-50 px-3 py-1 rounded-md">
                  <ActivityIcon className="w-4 h-4 mr-2 animate-pulse text-blue-500" />
                  <span>{t('tasks.actions.autoRefreshStatus')}</span>
                </div>
              )}
            </div>
          </div>

          {/* 搜索和筛选 */}
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1 max-w-md">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#4f7096]" />
              <Input
                placeholder={t('tasks.filters.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-[#d1dbe8] focus:border-[#1977e5]"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <FilterIcon className="w-4 h-4 text-[#4f7096]" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as TaskStatus)}
                className="px-3 py-2 border border-[#d1dbe8] rounded-md focus:border-[#1977e5] focus:outline-none bg-white"
              >
                <option value="all">{t('tasks.filters.allStatuses')}</option>
                <option value="running">{t('tasks.status.running')}</option>
                <option value="pending">{t('tasks.status.pending')}</option>
                <option value="completed">{t('tasks.status.completed')}</option>
                <option value="failed">{t('tasks.status.failed')}</option>
                <option value="cancelled">{t('tasks.status.cancelled')}</option>
              </select>
              
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as TaskType)}
                className="px-3 py-2 border border-[#d1dbe8] rounded-md focus:border-[#1977e5] focus:outline-none bg-white"
              >
                <option value="all">{t('tasks.filters.allTypes')}</option>
                <option value="file_conversion">{t('tasks.filters.typeLabels.fileConversion')}</option>
                <option value="dataset_generation">{t('tasks.filters.typeLabels.datasetGeneration')}</option>
                <option value="data_distillation">{t('tasks.filters.typeLabels.dataDistillation')}</option>
                <option value="batch_processing">{t('tasks.filters.typeLabels.batchProcessing')}</option>
                <option value="model_training">{t('tasks.filters.typeLabels.modelTraining')}</option>
                <option value="data_preprocessing">{t('tasks.filters.typeLabels.dataPreprocessing')}</option>
              </select>
            </div>
          </div>

          {/* 任务列表 */}
          <Card className="border-[#d1dbe8] bg-white">
            <Table>
              <TableHeader>
                <TableRow className="border-[#d1dbe8] hover:bg-transparent">
                  <TableHead className="w-[40px]">
                    <input
                      type="checkbox"
                      checked={selectedTasks.size === filteredTasks.length && filteredTasks.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 text-[#1977e5] border-[#d1dbe8] rounded focus:ring-[#1977e5]"
                    />
                  </TableHead>
                  <TableHead className="text-[#4f7096] font-medium">{t('tasks.table.taskInfo')}</TableHead>
                  <TableHead className="text-[#4f7096] font-medium w-[100px]">{t('tasks.table.type')}</TableHead>
                  <TableHead className="text-[#4f7096] font-medium w-[100px]">{t('tasks.table.status')}</TableHead>
                  <TableHead className="text-[#4f7096] font-medium w-[160px]">{t('tasks.table.progress')}</TableHead>
                  <TableHead className="text-[#4f7096] font-medium w-[80px]">{t('tasks.table.priority')}</TableHead>
                  <TableHead className="text-[#4f7096] font-medium w-[120px]">{t('tasks.table.duration')}</TableHead>
                  <TableHead className="text-[#4f7096] font-medium w-[100px]">{t('tasks.table.creator')}</TableHead>
                  <TableHead className="text-[#4f7096] font-medium w-[120px]">{t('tasks.table.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTasks.map((task) => (
                  <TableRow 
                    key={task.id} 
                    className="border-[#d1dbe8] hover:bg-[#f7f9fc]"
                  >
                    <TableCell className="w-[40px]">
                      <input
                        type="checkbox"
                        checked={selectedTasks.has(task.id)}
                        onChange={() => toggleTaskSelection(task.id)}
                        className="w-4 h-4 text-[#1977e5] border-[#d1dbe8] rounded focus:ring-[#1977e5]"
                      />
                    </TableCell>
                    
                    <TableCell className="py-4">
                      <div className="max-w-[300px]">
                        <div className="font-medium text-[#0c141c] mb-1">{task.name}</div>
                        <div className="text-sm text-[#4f7096] mb-1">
                          {task.libraryName && `库: ${task.libraryName}`}
                          {task.datasetName && `数据集: ${task.datasetName}`}
                        </div>
                        {task.details.currentItem && (
                          <div className="text-xs text-[#4f7096] truncate">
                            当前: {task.details.currentItem}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell className="py-4">
                      <div className="flex items-center">
                        {getTaskTypeIcon(task.type)}
                        <span className="ml-2 text-sm text-[#4f7096]">
                          {getTaskTypeLabel(task.type)}
                        </span>
                      </div>
                    </TableCell>
                    
                    <TableCell className="py-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(task.status)}`}>
                        {getStatusLabel(task.status)}
                      </span>
                    </TableCell>
                    
                    <TableCell className="py-4">
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-[#4f7096]">
                            {task.details.processedItems || 0} / {task.details.totalItems || 0}
                          </span>
                          <span className="text-[#0c141c] font-medium">{task.progress}%</span>
                        </div>
                        <div className="w-full bg-[#e8edf2] rounded-full h-1.5 relative">
                          <div 
                            className={`h-1.5 rounded-full transition-all duration-300 ${
                              task.status === 'failed' ? 'bg-red-500' : 
                              task.status === 'completed' ? 'bg-green-500' : 
                              task.status === 'running' ? 'bg-[#1977e5] animate-pulse' : 'bg-[#1977e5]'
                            }`}
                            style={{ width: `${task.progress}%` }}
                          ></div>
                          {/* 为运行中的任务添加闪烁效果 */}
                          {task.status === 'running' && task.progress < 100 && (
                            <div 
                              className="absolute top-0 h-1.5 w-2 bg-white opacity-30 rounded-full animate-ping"
                              style={{ left: `${Math.min(task.progress, 95)}%` }}
                            ></div>
                          )}
                        </div>
                        {/* 显示当前处理项目 */}
                        {task.details.currentItem && task.status === 'running' && (
                          <div className="text-xs text-[#4f7096] truncate max-w-[150px]" title={task.details.currentItem}>
                            {t('tasks.progress.processing')}: {task.details.currentItem}
                          </div>
                        )}
                        {/* 显示预估时间，特别是对于大模型任务 */}
                        {task.estimatedTime && task.status === 'running' && (
                          <div className="text-xs text-[#4f7096] flex items-center gap-1">
                            <ClockIcon className="w-3 h-3" />
                            {t('tasks.progress.estimatedRemaining', { time: task.estimatedTime })}
                          </div>
                        )}
                        {/* 显示错误和警告计数 */}
                        {(task.details.errorCount! > 0 || task.details.warningCount! > 0) && (
                          <div className="flex gap-2 text-xs">
                            {task.details.errorCount! > 0 && (
                              <span className="text-red-600 flex items-center gap-1">
                                <AlertTriangleIcon className="w-3 h-3" />
                                {t('tasks.progress.errors', { count: task.details.errorCount })}
                              </span>
                            )}
                            {task.details.warningCount! > 0 && (
                              <span className="text-yellow-600 flex items-center gap-1">
                                <AlertCircleIcon className="w-3 h-3" />
                                {t('tasks.progress.warnings', { count: task.details.warningCount })}
                              </span>
                            )}
                          </div>
                        )}
                        {/* 大模型任务的额外信息 */}
                        {task.type === 'file_conversion' && task.status === 'running' && (
                          <div className="text-xs text-[#4f7096] flex items-center gap-1">
                            <BrainIcon className="w-3 h-3" />
                            <span>{t('tasks.progress.aiProcessing')}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell className="py-4">
                      <span className={`text-sm font-medium ${getPriorityColor(task.priority)}`}>
                        {getPriorityLabel(task.priority)}
                      </span>
                    </TableCell>
                    
                    <TableCell className="py-4 text-[#4f7096] text-sm">
                      {formatDuration(task.startTime, task.endTime)}
                    </TableCell>
                    
                    <TableCell className="py-4 text-[#4f7096] text-sm">
                      {task.createdBy}
                    </TableCell>
                    
                    <TableCell className="py-4">
                      <div className="flex gap-1">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-[#e8edf2]">
                              <MoreVerticalIcon className="h-4 w-4 text-[#4f7096]" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-[160px]">
                            <DropdownMenuItem
                              onClick={() => setShowDetails(task.id)}
                              className="cursor-pointer text-[#0c141c]"
                            >
                              <EyeIcon className="mr-2 h-4 w-4" />
                              {t('tasks.operations.viewDetails')}
                            </DropdownMenuItem>
                            
                            {task.status === 'running' && (
                              <DropdownMenuItem
                                onClick={() => handleTaskOperation(task.id, 'pause')}
                                className="cursor-pointer text-[#0c141c]"
                              >
                                <PauseIcon className="mr-2 h-4 w-4" />
                                {t('tasks.operations.pauseTask')}
                              </DropdownMenuItem>
                            )}
                            
                            {task.status === 'cancelled' && (
                              <DropdownMenuItem
                                onClick={() => handleTaskOperation(task.id, 'resume')}
                                className="cursor-pointer text-[#0c141c]"
                              >
                                <PlayIcon className="mr-2 h-4 w-4" />
                                {t('tasks.operations.resumeTask')}
                              </DropdownMenuItem>
                            )}
                            
                            {task.status === 'failed' && (
                              <DropdownMenuItem
                                onClick={() => handleTaskOperation(task.id, 'retry')}
                                className="cursor-pointer text-[#0c141c]"
                              >
                                <RefreshCwIcon className="mr-2 h-4 w-4" />
                                {t('tasks.operations.retryTask')}
                              </DropdownMenuItem>
                            )}
                            
                            {task.status === 'completed' && (
                              <DropdownMenuItem
                                onClick={() => handleTaskOperation(task.id, 'retry')}
                                className="cursor-pointer text-[#0c141c]"
                              >
                                <DownloadIcon className="mr-2 h-4 w-4" />
                                {t('tasks.operations.downloadResult')}
                              </DropdownMenuItem>
                            )}
                            
                            {(task.status === 'pending' || task.status === 'running') && (
                              <DropdownMenuItem
                                onClick={() => handleTaskOperation(task.id, 'cancel')}
                                className="cursor-pointer text-orange-600"
                              >
                                <XIcon className="mr-2 h-4 w-4" />
                                {t('tasks.operations.cancelTask')}
                              </DropdownMenuItem>
                            )}
                            
                            {(task.status === 'completed' || task.status === 'failed' || task.status === 'cancelled') && (
                              <DropdownMenuItem 
                                onClick={() => handleTaskOperation(task.id, 'delete')}
                                className="cursor-pointer text-red-600"
                              >
                                <TrashIcon className="mr-2 h-4 w-4" />
                                {t('tasks.operations.deleteTask')}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {filteredTasks.length === 0 && !loading && (
              <div className="text-center py-8 text-[#4f7096]">
                {searchTerm || statusFilter !== 'all' || typeFilter !== 'all' ? t('tasks.messages.noMatchingTasks') : t('tasks.messages.noTasks')}
              </div>
            )}
            
            {loading && (
              <div className="text-center py-8 text-[#4f7096]">
                <LoaderIcon className="w-6 h-6 mx-auto mb-2 animate-spin" />
                <p>{t('tasks.messages.loading')}</p>
              </div>
            )}

            {/* 分页 */}
            {pagination.total > 0 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-[#4f7096]">
                  {t('tasks.pagination.showing', {
                    start: (pagination.page - 1) * pagination.per_page + 1,
                    end: Math.min(pagination.page * pagination.per_page, pagination.total),
                    total: pagination.total
                  })}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!pagination.has_prev || loading}
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                    className="border-[#d1dbe8] text-[#4f7096] hover:bg-[#e8edf2]"
                  >
                    {t('tasks.pagination.previous')}
                  </Button>
                  <span className="flex items-center px-3 text-sm text-[#4f7096]">
                    {t('tasks.pagination.page', { current: pagination.page, total: pagination.total_pages })}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!pagination.has_next || loading}
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                    className="border-[#d1dbe8] text-[#4f7096] hover:bg-[#e8edf2]"
                  >
                    {t('tasks.pagination.next')}
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="queue">
          <TaskQueue 
            onTaskReorder={(taskId, newPosition) => {
              console.log('任务重新排序:', taskId, newPosition);
            }}
            onTaskPriorityChange={(taskId, newPriority) => {
              console.log('任务优先级变更:', taskId, newPriority);
            }}
          />
        </TabsContent>

        <TabsContent value="monitor">
          <SystemMonitor />
        </TabsContent>
      </Tabs>

      {/* 任务详情弹窗 */}
      {showDetails && (
        <TaskDetailsModal 
          taskId={showDetails}
          task={tasks.find(t => t.id === showDetails)!}
          onClose={() => setShowDetails(null)}
          onRefresh={async () => {
            await fetchTasks();
            await fetchStatistics();
          }}
        />
      )}
    </div>
  );
};

// 任务详情弹窗组件
interface TaskDetailsModalProps {
  taskId: string;
  task: Task;
  onClose: () => void;
  onRefresh: () => Promise<void>;
}

const TaskDetailsModal = ({ taskId, task, onClose, onRefresh }: TaskDetailsModalProps) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-[#e8edf2]">
          <h3 className="text-lg font-semibold text-[#0c141c]">{t('tasks.details.title')}</h3>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={onRefresh}
              className="border-[#d1dbe8] text-[#4f7096] hover:bg-[#e8edf2]"
            >
              <RefreshCwIcon className="w-4 h-4 mr-1" />
              {t('tasks.actions.refresh')}
            </Button>
            <Button variant="ghost" onClick={onClose} className="h-8 w-8 p-0">
              ✕
            </Button>
          </div>
        </div>
        
        <div className="p-6 overflow-auto max-h-[60vh]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 基本信息 */}
            <Card className="border-[#d1dbe8] bg-white p-4">
              <h4 className="font-medium text-[#0c141c] mb-3">{t('tasks.details.basicInfo')}</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#4f7096]">{t('tasks.details.taskName')}</span>
                  <span className="text-[#0c141c]">{task.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#4f7096]">{t('tasks.details.taskType')}</span>
                  <span className="text-[#0c141c]">{task.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#4f7096]">{t('tasks.details.startTime')}</span>
                  <span className="text-[#0c141c]">{task.startTime}</span>
                </div>
                {task.endTime && (
                  <div className="flex justify-between">
                    <span className="text-[#4f7096]">{t('tasks.details.endTime')}</span>
                    <span className="text-[#0c141c]">{task.endTime}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-[#4f7096]">{t('tasks.details.creator')}</span>
                  <span className="text-[#0c141c]">{task.createdBy}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#4f7096]">{t('tasks.details.priority')}</span>
                  <span className="text-[#0c141c]">{task.priority}</span>
                </div>
              </div>
            </Card>

            {/* 进度信息 */}
            <Card className="border-[#d1dbe8] bg-white p-4">
              <h4 className="font-medium text-[#0c141c] mb-3">{t('tasks.details.progressInfo')}</h4>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-[#4f7096]">{t('tasks.details.overallProgress')}</span>
                    <span className="text-[#0c141c] font-medium">{task.progress}%</span>
                  </div>
                  <div className="w-full bg-[#e8edf2] rounded-full h-2">
                    <div 
                      className="bg-[#1977e5] h-2 rounded-full" 
                      style={{ width: `${task.progress}%` }}
                    ></div>
                  </div>
                </div>
                
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-[#4f7096]">{t('tasks.details.processedItems')}</span>
                    <span className="text-[#0c141c]">{task.details.processedItems || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#4f7096]">{t('tasks.details.totalItems')}</span>
                    <span className="text-[#0c141c]">{task.details.totalItems || 0}</span>
                  </div>
                  {task.details.errorCount! > 0 && (
                    <div className="flex justify-between">
                      <span className="text-[#4f7096]">{t('tasks.details.errorCount')}</span>
                      <span className="text-red-600">{task.details.errorCount}</span>
                    </div>
                  )}
                  {task.details.warningCount! > 0 && (
                    <div className="flex justify-between">
                      <span className="text-[#4f7096]">{t('tasks.details.warningCount')}</span>
                      <span className="text-yellow-600">{task.details.warningCount}</span>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* 任务日志 */}
          {task.logs && task.logs.length > 0 && (
            <Card className="border-[#d1dbe8] bg-white p-4 mt-6">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-[#0c141c]">{t('tasks.details.taskLogs')}</h4>
                {task.status === 'running' && (
                  <div className="flex items-center text-xs text-[#4f7096]">
                    <ActivityIcon className="w-3 h-3 mr-1 animate-pulse" />
                    {t('tasks.details.realTimeUpdate')}
                  </div>
                )}
              </div>
              <div className="bg-[#f7f9fc] border border-[#e8edf2] rounded-lg p-3 max-h-60 overflow-auto">
                {task.logs.map((log, index) => {
                  // 解析日志级别
                  const isError = log.includes('错误:') || log.includes('失败');
                  const isWarning = log.includes('警告:');
                  const isInfo = log.includes('正在处理:') || log.includes('开始') || log.includes('完成');
                  
                  return (
                    <div 
                      key={index} 
                      className={`text-xs font-mono mb-1 p-1 rounded ${
                        isError ? 'text-red-700 bg-red-50' :
                        isWarning ? 'text-yellow-700 bg-yellow-50' :
                        isInfo ? 'text-blue-700 bg-blue-50' :
                        'text-[#0c141c]'
                      }`}
                    >
                      <span className="text-[#4f7096] mr-2">
                        [{String(index + 1).padStart(3, '0')}]
                      </span>
                      {log}
                    </div>
                  );
                })}
                {task.status === 'running' && (
                  <div className="text-xs text-[#4f7096] font-mono mt-2 p-1 bg-blue-50 rounded flex items-center">
                    <LoaderIcon className="w-3 h-3 mr-2 animate-spin" />
                    {t('tasks.details.taskExecuting')}
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};