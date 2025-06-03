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
        return '文件转换';
      case 'dataset_generation':
        return '数据集生成';
      case 'data_distillation':
        return '数据蒸馏';
      case 'batch_processing':
        return '批量处理';
      case 'model_training':
        return '模型训练';
      case 'data_preprocessing':
        return '数据预处理';
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
        return '等待中';
      case 'running':
        return '运行中';
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
        return '低';
      case 'medium':
        return '中';
      case 'high':
        return '高';
      case 'urgent':
        return '紧急';
    }
  };

  const formatDuration = (startTime: string, endTime?: string) => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const duration = Math.floor((end.getTime() - start.getTime()) / 1000 / 60);
    
    if (duration < 60) {
      return `${duration}分钟`;
    } else {
      const hours = Math.floor(duration / 60);
      const minutes = duration % 60;
      return `${hours}小时${minutes}分钟`;
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
        <h1 className="text-[28px] font-bold leading-8 text-[#0c141c] mb-2">任务管理</h1>
        <p className="text-[#4f7096] mb-4">监控和管理所有后台运行的数据处理任务</p>
      </div>

      {/* 统计面板 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Card className="border-[#d1dbe8] bg-white p-4">
          <div className="flex items-center">
            <ActivityIcon className="w-8 h-8 text-[#1977e5] mr-3" />
            <div>
              <p className="text-sm text-[#4f7096]">总任务数</p>
              <p className="text-xl font-bold text-[#0c141c]">{statistics.total}</p>
            </div>
          </div>
        </Card>
        
        <Card className="border-[#d1dbe8] bg-white p-4">
          <div className="flex items-center">
            <PlayIcon className="w-8 h-8 text-blue-500 mr-3" />
            <div>
              <p className="text-sm text-[#4f7096]">运行中</p>
              <p className="text-xl font-bold text-[#0c141c]">{statistics.running}</p>
            </div>
          </div>
        </Card>
        
        <Card className="border-[#d1dbe8] bg-white p-4">
          <div className="flex items-center">
            <ClockIcon className="w-8 h-8 text-yellow-500 mr-3" />
            <div>
              <p className="text-sm text-[#4f7096]">等待中</p>
              <p className="text-xl font-bold text-[#0c141c]">{statistics.pending}</p>
            </div>
          </div>
        </Card>
        
        <Card className="border-[#d1dbe8] bg-white p-4">
          <div className="flex items-center">
            <CheckCircleIcon className="w-8 h-8 text-green-500 mr-3" />
            <div>
              <p className="text-sm text-[#4f7096]">已完成</p>
              <p className="text-xl font-bold text-[#0c141c]">{statistics.completed}</p>
            </div>
          </div>
        </Card>
        
        <Card className="border-[#d1dbe8] bg-white p-4">
          <div className="flex items-center">
            <AlertCircleIcon className="w-8 h-8 text-red-500 mr-3" />
            <div>
              <p className="text-sm text-[#4f7096]">失败</p>
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
            任务列表
          </TabsTrigger>
          <TabsTrigger value="queue" className="flex items-center gap-2">
            <Layers3Icon className="w-4 h-4" />
            任务队列
          </TabsTrigger>
          <TabsTrigger value="monitor" className="flex items-center gap-2">
            <ActivityIcon className="w-4 h-4" />
            系统监控
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
                    暂停选中 ({selectedTasks.size})
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleBatchOperation('cancel')}
                    className="border-[#d1dbe8] text-red-600 hover:bg-red-50"
                  >
                    <XIcon className="w-4 h-4 mr-2" />
                    取消选中
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
                刷新
              </Button>
            </div>
          </div>

          {/* 搜索和筛选 */}
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1 max-w-md">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#4f7096]" />
              <Input
                placeholder="搜索任务名称、数据库或数据集..."
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
                <option value="all">全部状态</option>
                <option value="running">运行中</option>
                <option value="pending">等待中</option>
                <option value="completed">已完成</option>
                <option value="failed">失败</option>
                <option value="cancelled">已取消</option>
              </select>
              
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as TaskType)}
                className="px-3 py-2 border border-[#d1dbe8] rounded-md focus:border-[#1977e5] focus:outline-none bg-white"
              >
                <option value="all">全部类型</option>
                <option value="file_conversion">文件转换</option>
                <option value="dataset_generation">数据集生成</option>
                <option value="data_distillation">数据蒸馏</option>
                <option value="batch_processing">批量处理</option>
                <option value="model_training">模型训练</option>
                <option value="data_preprocessing">数据预处理</option>
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
                  <TableHead className="text-[#4f7096] font-medium">任务信息</TableHead>
                  <TableHead className="text-[#4f7096] font-medium w-[100px]">类型</TableHead>
                  <TableHead className="text-[#4f7096] font-medium w-[100px]">状态</TableHead>
                  <TableHead className="text-[#4f7096] font-medium w-[160px]">进度</TableHead>
                  <TableHead className="text-[#4f7096] font-medium w-[80px]">优先级</TableHead>
                  <TableHead className="text-[#4f7096] font-medium w-[120px]">用时</TableHead>
                  <TableHead className="text-[#4f7096] font-medium w-[100px]">创建者</TableHead>
                  <TableHead className="text-[#4f7096] font-medium w-[120px]">操作</TableHead>
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
                        {task.resourceUsage && (
                          <div className="text-xs text-[#4f7096] mt-1">
                            CPU: {task.resourceUsage.cpu}% | 内存: {Math.round(task.resourceUsage.memory / 1024)}GB
                            {task.resourceUsage.gpu && ` | GPU: ${task.resourceUsage.gpu}%`}
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
                        <div className="w-full bg-[#e8edf2] rounded-full h-1.5">
                          <div 
                            className={`h-1.5 rounded-full transition-all duration-300 ${
                              task.status === 'failed' ? 'bg-red-500' : 
                              task.status === 'completed' ? 'bg-green-500' : 'bg-[#1977e5]'
                            }`}
                            style={{ width: `${task.progress}%` }}
                          ></div>
                        </div>
                        {task.estimatedTime && task.status === 'running' && (
                          <div className="text-xs text-[#4f7096]">预计剩余: {task.estimatedTime}</div>
                        )}
                        {(task.details.errorCount! > 0 || task.details.warningCount! > 0) && (
                          <div className="flex gap-2 text-xs">
                            {task.details.errorCount! > 0 && (
                              <span className="text-red-600">错误: {task.details.errorCount}</span>
                            )}
                            {task.details.warningCount! > 0 && (
                              <span className="text-yellow-600">警告: {task.details.warningCount}</span>
                            )}
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
                              查看详情
                            </DropdownMenuItem>
                            
                            {task.status === 'running' && (
                              <DropdownMenuItem
                                onClick={() => handleTaskOperation(task.id, 'pause')}
                                className="cursor-pointer text-[#0c141c]"
                              >
                                <PauseIcon className="mr-2 h-4 w-4" />
                                暂停任务
                              </DropdownMenuItem>
                            )}
                            
                            {task.status === 'cancelled' && (
                              <DropdownMenuItem
                                onClick={() => handleTaskOperation(task.id, 'resume')}
                                className="cursor-pointer text-[#0c141c]"
                              >
                                <PlayIcon className="mr-2 h-4 w-4" />
                                恢复任务
                              </DropdownMenuItem>
                            )}
                            
                            {task.status === 'failed' && (
                              <DropdownMenuItem
                                onClick={() => handleTaskOperation(task.id, 'retry')}
                                className="cursor-pointer text-[#0c141c]"
                              >
                                <RefreshCwIcon className="mr-2 h-4 w-4" />
                                重试任务
                              </DropdownMenuItem>
                            )}
                            
                            {task.status === 'completed' && (
                              <DropdownMenuItem
                                onClick={() => handleTaskOperation(task.id, 'retry')}
                                className="cursor-pointer text-[#0c141c]"
                              >
                                <DownloadIcon className="mr-2 h-4 w-4" />
                                下载结果
                              </DropdownMenuItem>
                            )}
                            
                            {(task.status === 'pending' || task.status === 'running') && (
                              <DropdownMenuItem
                                onClick={() => handleTaskOperation(task.id, 'cancel')}
                                className="cursor-pointer text-orange-600"
                              >
                                <XIcon className="mr-2 h-4 w-4" />
                                取消任务
                              </DropdownMenuItem>
                            )}
                            
                            {(task.status === 'completed' || task.status === 'failed' || task.status === 'cancelled') && (
                              <DropdownMenuItem 
                                onClick={() => handleTaskOperation(task.id, 'delete')}
                                className="cursor-pointer text-red-600"
                              >
                                <TrashIcon className="mr-2 h-4 w-4" />
                                删除任务
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
                {searchTerm || statusFilter !== 'all' || typeFilter !== 'all' ? '没有找到匹配的任务' : '暂无任务'}
              </div>
            )}
            
            {loading && (
              <div className="text-center py-8 text-[#4f7096]">
                <LoaderIcon className="w-6 h-6 mx-auto mb-2 animate-spin" />
                <p>正在加载任务数据...</p>
              </div>
            )}

            {/* 分页 */}
            {pagination.total > 0 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-[#4f7096]">
                  显示 {(pagination.page - 1) * pagination.per_page + 1} - {Math.min(pagination.page * pagination.per_page, pagination.total)} 条，
                  共 {pagination.total} 条
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!pagination.has_prev || loading}
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                    className="border-[#d1dbe8] text-[#4f7096] hover:bg-[#e8edf2]"
                  >
                    上一页
                  </Button>
                  <span className="flex items-center px-3 text-sm text-[#4f7096]">
                    第 {pagination.page} / {pagination.total_pages} 页
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!pagination.has_next || loading}
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                    className="border-[#d1dbe8] text-[#4f7096] hover:bg-[#e8edf2]"
                  >
                    下一页
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
}

const TaskDetailsModal = ({ taskId, task, onClose }: TaskDetailsModalProps) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-[#e8edf2]">
          <h3 className="text-lg font-semibold text-[#0c141c]">任务详情</h3>
          <Button variant="ghost" onClick={onClose} className="h-8 w-8 p-0">
            ✕
          </Button>
        </div>
        
        <div className="p-6 overflow-auto max-h-[60vh]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 基本信息 */}
            <Card className="border-[#d1dbe8] bg-white p-4">
              <h4 className="font-medium text-[#0c141c] mb-3">基本信息</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#4f7096]">任务名称</span>
                  <span className="text-[#0c141c]">{task.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#4f7096]">任务类型</span>
                  <span className="text-[#0c141c]">{task.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#4f7096]">开始时间</span>
                  <span className="text-[#0c141c]">{task.startTime}</span>
                </div>
                {task.endTime && (
                  <div className="flex justify-between">
                    <span className="text-[#4f7096]">结束时间</span>
                    <span className="text-[#0c141c]">{task.endTime}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-[#4f7096]">创建者</span>
                  <span className="text-[#0c141c]">{task.createdBy}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#4f7096]">优先级</span>
                  <span className="text-[#0c141c]">{task.priority}</span>
                </div>
              </div>
            </Card>

            {/* 进度信息 */}
            <Card className="border-[#d1dbe8] bg-white p-4">
              <h4 className="font-medium text-[#0c141c] mb-3">进度信息</h4>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-[#4f7096]">总体进度</span>
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
                    <span className="text-[#4f7096]">已处理项目</span>
                    <span className="text-[#0c141c]">{task.details.processedItems || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#4f7096]">总项目数</span>
                    <span className="text-[#0c141c]">{task.details.totalItems || 0}</span>
                  </div>
                  {task.details.errorCount! > 0 && (
                    <div className="flex justify-between">
                      <span className="text-[#4f7096]">错误数量</span>
                      <span className="text-red-600">{task.details.errorCount}</span>
                    </div>
                  )}
                  {task.details.warningCount! > 0 && (
                    <div className="flex justify-between">
                      <span className="text-[#4f7096]">警告数量</span>
                      <span className="text-yellow-600">{task.details.warningCount}</span>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* 资源使用情况 */}
          {task.resourceUsage && (
            <Card className="border-[#d1dbe8] bg-white p-4 mt-6">
              <h4 className="font-medium text-[#0c141c] mb-3">资源使用情况</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-[#4f7096]">CPU使用率</span>
                    <span className="text-[#0c141c] font-medium">{task.resourceUsage.cpu}%</span>
                  </div>
                  <div className="w-full bg-[#e8edf2] rounded-full h-1.5">
                    <div 
                      className="bg-blue-500 h-1.5 rounded-full" 
                      style={{ width: `${task.resourceUsage.cpu}%` }}
                    ></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-[#4f7096]">内存使用</span>
                    <span className="text-[#0c141c] font-medium">{Math.round(task.resourceUsage.memory / 1024)}GB</span>
                  </div>
                  <div className="w-full bg-[#e8edf2] rounded-full h-1.5">
                    <div 
                      className="bg-green-500 h-1.5 rounded-full" 
                      style={{ width: `${Math.min((task.resourceUsage.memory / 16384) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
                
                {task.resourceUsage.gpu && (
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-[#4f7096]">GPU使用率</span>
                      <span className="text-[#0c141c] font-medium">{task.resourceUsage.gpu}%</span>
                    </div>
                    <div className="w-full bg-[#e8edf2] rounded-full h-1.5">
                      <div 
                        className="bg-purple-500 h-1.5 rounded-full" 
                        style={{ width: `${task.resourceUsage.gpu}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* 任务日志 */}
          {task.logs && task.logs.length > 0 && (
            <Card className="border-[#d1dbe8] bg-white p-4 mt-6">
              <h4 className="font-medium text-[#0c141c] mb-3">任务日志</h4>
              <div className="bg-[#f7f9fc] border border-[#e8edf2] rounded-lg p-3 max-h-40 overflow-auto">
                {task.logs.map((log, index) => (
                  <div key={index} className="text-xs text-[#0c141c] font-mono mb-1">
                    {log}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};