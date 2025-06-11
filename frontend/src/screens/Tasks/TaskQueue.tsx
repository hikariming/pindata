import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { 
  ArrowUpIcon,
  ArrowDownIcon,
  PlayIcon,
  PauseIcon,
  ClockIcon,
  ZapIcon,
  AlertTriangleIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  SettingsIcon
} from 'lucide-react';

interface QueueTask {
  id: string;
  name: string;
  type: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  estimatedDuration: string;
  dependencies?: string[];
  queuePosition: number;
  status: 'waiting' | 'ready' | 'blocked';
  resourceRequirements: {
    cpu: number;
    memory: number;
    gpu?: number;
  };
}

interface TaskQueueProps {
  onTaskReorder?: (taskId: string, newPosition: number) => void;
  onTaskPriorityChange?: (taskId: string, newPriority: QueueTask['priority']) => void;
}

export const TaskQueue = ({ onTaskReorder, onTaskPriorityChange }: TaskQueueProps): JSX.Element => {
  const [queueTasks, setQueueTasks] = useState<QueueTask[]>([]);
  const [isQueueRunning, setIsQueueRunning] = useState(true);

  useEffect(() => {
    const mockQueueTasks: QueueTask[] = [
      {
        id: 'q1',
        name: '技术文档批量转换',
        type: 'file_conversion',
        priority: 'high',
        estimatedDuration: '15分钟',
        queuePosition: 1,
        status: 'ready',
        resourceRequirements: {
          cpu: 60,
          memory: 4096
        }
      },
      {
        id: 'q2',
        name: '大型数据集生成',
        type: 'dataset_generation',
        priority: 'urgent',
        estimatedDuration: '3小时',
        queuePosition: 2,
        status: 'ready',
        resourceRequirements: {
          cpu: 90,
          memory: 16384,
          gpu: 80
        }
      },
      {
        id: 'q3',
        name: '模型蒸馏任务',
        type: 'data_distillation',
        priority: 'medium',
        estimatedDuration: '45分钟',
        dependencies: ['q2'],
        queuePosition: 3,
        status: 'blocked',
        resourceRequirements: {
          cpu: 75,
          memory: 8192,
          gpu: 90
        }
      },
      {
        id: 'q4',
        name: '图像数据预处理',
        type: 'data_preprocessing',
        priority: 'low',
        estimatedDuration: '20分钟',
        queuePosition: 4,
        status: 'waiting',
        resourceRequirements: {
          cpu: 40,
          memory: 2048
        }
      },
      {
        id: 'q5',
        name: '文本清洗任务',
        type: 'data_preprocessing',
        priority: 'medium',
        estimatedDuration: '30分钟',
        queuePosition: 5,
        status: 'waiting',
        resourceRequirements: {
          cpu: 50,
          memory: 4096
        }
      }
    ];
    
    setQueueTasks(mockQueueTasks);
  }, []);

  const getPriorityColor = (priority: QueueTask['priority']) => {
    switch (priority) {
      case 'low':
        return 'text-gray-600 bg-gray-50 border-gray-200';
      case 'medium':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'high':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'urgent':
        return 'text-red-600 bg-red-50 border-red-200';
    }
  };

  const getPriorityLabel = (priority: QueueTask['priority']) => {
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

  const getStatusColor = (status: QueueTask['status']) => {
    switch (status) {
      case 'waiting':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'ready':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'blocked':
        return 'text-red-600 bg-red-50 border-red-200';
    }
  };

  const getStatusLabel = (status: QueueTask['status']) => {
    switch (status) {
      case 'waiting':
        return '等待中';
      case 'ready':
        return '就绪';
      case 'blocked':
        return '阻塞';
    }
  };

  const getStatusIcon = (status: QueueTask['status']) => {
    switch (status) {
      case 'waiting':
        return <ClockIcon className="w-4 h-4" />;
      case 'ready':
        return <PlayIcon className="w-4 h-4" />;
      case 'blocked':
        return <AlertTriangleIcon className="w-4 h-4" />;
    }
  };

  const moveTaskUp = (taskId: string) => {
    const taskIndex = queueTasks.findIndex(t => t.id === taskId);
    if (taskIndex > 0) {
      const newTasks = [...queueTasks];
      [newTasks[taskIndex], newTasks[taskIndex - 1]] = [newTasks[taskIndex - 1], newTasks[taskIndex]];
      // 更新队列位置
      newTasks.forEach((task, index) => {
        task.queuePosition = index + 1;
      });
      setQueueTasks(newTasks);
      onTaskReorder?.(taskId, taskIndex);
    }
  };

  const moveTaskDown = (taskId: string) => {
    const taskIndex = queueTasks.findIndex(t => t.id === taskId);
    if (taskIndex < queueTasks.length - 1) {
      const newTasks = [...queueTasks];
      [newTasks[taskIndex], newTasks[taskIndex + 1]] = [newTasks[taskIndex + 1], newTasks[taskIndex]];
      // 更新队列位置
      newTasks.forEach((task, index) => {
        task.queuePosition = index + 1;
      });
      setQueueTasks(newTasks);
      onTaskReorder?.(taskId, taskIndex + 2);
    }
  };

  const totalEstimatedTime = queueTasks.reduce((total, task) => {
    const duration = parseInt(task.estimatedDuration);
    const unit = task.estimatedDuration.includes('小时') ? 'hour' : 'minute';
    return total + (unit === 'hour' ? duration * 60 : duration);
  }, 0);

  const formatTotalTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}分钟`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return `${hours}小时${remainingMinutes}分钟`;
    }
  };

  return (
    <div className="space-y-4">
      {/* 预览提示 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          <span className="text-blue-700 font-medium text-sm">预览功能</span>
        </div>
        <p className="text-blue-600 text-sm mt-1">目前的预览效果，待后续更新</p>
      </div>

      <Card className="border-[#d1dbe8] bg-white p-6">
        {/* 队列头部 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-[#0c141c] mb-1">任务队列</h3>
            <p className="text-sm text-[#4f7096]">
              队列中 {queueTasks.length} 个任务 · 预计总时长: {formatTotalTime(totalEstimatedTime)}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isQueueRunning ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm text-[#4f7096]">
                {isQueueRunning ? '队列运行中' : '队列已暂停'}
              </span>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsQueueRunning(!isQueueRunning)}
              className="border-[#d1dbe8]"
            >
              {isQueueRunning ? <PauseIcon className="w-4 h-4 mr-2" /> : <PlayIcon className="w-4 h-4 mr-2" />}
              {isQueueRunning ? '暂停队列' : '启动队列'}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              className="border-[#d1dbe8]"
            >
              <SettingsIcon className="w-4 h-4 mr-2" />
              队列设置
            </Button>
          </div>
        </div>

        {/* 队列统计 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-[#f7f9fc] border border-[#e8edf2] rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#4f7096]">就绪任务</span>
              <span className="text-lg font-bold text-green-600">
                {queueTasks.filter(t => t.status === 'ready').length}
              </span>
            </div>
          </div>
          
          <div className="bg-[#f7f9fc] border border-[#e8edf2] rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#4f7096]">等待任务</span>
              <span className="text-lg font-bold text-yellow-600">
                {queueTasks.filter(t => t.status === 'waiting').length}
              </span>
            </div>
          </div>
          
          <div className="bg-[#f7f9fc] border border-[#e8edf2] rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#4f7096]">阻塞任务</span>
              <span className="text-lg font-bold text-red-600">
                {queueTasks.filter(t => t.status === 'blocked').length}
              </span>
            </div>
          </div>
          
          <div className="bg-[#f7f9fc] border border-[#e8edf2] rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#4f7096]">高优先级</span>
              <span className="text-lg font-bold text-orange-600">
                {queueTasks.filter(t => t.priority === 'high' || t.priority === 'urgent').length}
              </span>
            </div>
          </div>
        </div>

        {/* 队列列表 */}
        <div className="space-y-3">
          {queueTasks.map((task, index) => (
            <div
              key={task.id}
              className={`border border-[#e8edf2] rounded-lg p-4 ${
                task.status === 'ready' ? 'bg-green-50 border-green-200' : 
                task.status === 'blocked' ? 'bg-red-50 border-red-200' : 'bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                {/* 任务基本信息 */}
                <div className="flex items-center flex-1">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#1977e5] text-white text-sm font-medium mr-3">
                    {task.queuePosition}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-[#0c141c]">{task.name}</h4>
                      <span className={`px-2 py-1 rounded text-xs font-medium border ${getPriorityColor(task.priority)}`}>
                        {getPriorityLabel(task.priority)}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(task.status)} flex items-center gap-1`}>
                        {getStatusIcon(task.status)}
                        {getStatusLabel(task.status)}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-[#4f7096]">
                      <span>预计用时: {task.estimatedDuration}</span>
                      <span>
                        资源需求: CPU {task.resourceRequirements.cpu}% | 
                        内存 {Math.round(task.resourceRequirements.memory / 1024)}GB
                        {task.resourceRequirements.gpu && ` | GPU ${task.resourceRequirements.gpu}%`}
                      </span>
                    </div>
                    
                    {task.dependencies && task.dependencies.length > 0 && (
                      <div className="text-xs text-orange-600 mt-1">
                        依赖任务: {task.dependencies.join(', ')}
                      </div>
                    )}
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className="flex items-center gap-1 ml-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => moveTaskUp(task.id)}
                    disabled={index === 0}
                    className="h-8 w-8 p-0"
                    title="上移"
                  >
                    <ChevronUpIcon className="w-4 h-4" />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => moveTaskDown(task.id)}
                    disabled={index === queueTasks.length - 1}
                    className="h-8 w-8 p-0"
                    title="下移"
                  >
                    <ChevronDownIcon className="w-4 h-4" />
                  </Button>
                  
                  <select
                    value={task.priority}
                    onChange={(e) => {
                      const newPriority = e.target.value as QueueTask['priority'];
                      const newTasks = queueTasks.map(t => 
                        t.id === task.id ? { ...t, priority: newPriority } : t
                      );
                      setQueueTasks(newTasks);
                      onTaskPriorityChange?.(task.id, newPriority);
                    }}
                    className="px-2 py-1 border border-[#d1dbe8] rounded text-xs focus:border-[#1977e5] focus:outline-none bg-white"
                  >
                    <option value="low">低</option>
                    <option value="medium">中</option>
                    <option value="high">高</option>
                    <option value="urgent">紧急</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>

        {queueTasks.length === 0 && (
          <div className="text-center py-8 text-[#4f7096]">
            <ClockIcon className="w-12 h-12 mx-auto mb-2 text-[#d1dbe8]" />
            <p>队列为空</p>
          </div>
        )}
      </Card>
    </div>
  );
}; 