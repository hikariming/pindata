/**
 * DataFlow流水线面板组件
 */
import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';

import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { dataflowService, DataFlowTask, PipelineType, PipelineConfig } from '../../services/dataflow.service';
import { LibraryFile } from '../../types/library';
import { toast } from 'react-hot-toast';
import { 
  Play, 
  Pause, 
  Download, 
  RefreshCw, 
  Settings, 
  AlertCircle,
  CheckCircle,
  Clock,
  X,
  FileText,
  AlertTriangle
} from 'lucide-react';

// 导入config
import { config } from '../../lib/config';

interface DataFlowPanelProps {
  libraryId: string;
  libraryName: string;
  markdownFiles: LibraryFile[]; // 这里仍然接收markdown文件，但我们会处理所有文件
  onRefresh?: () => void;
}

interface TaskConfigForm {
  pipeline_type: string;
  task_name: string;
  description: string;
  config: PipelineConfig;
}

export const DataFlowPanel: React.FC<DataFlowPanelProps> = ({
  libraryId,
  libraryName,
  markdownFiles,
  onRefresh
}) => {
  const [tasks, setTasks] = useState<DataFlowTask[]>([]);
  const [pipelineTypes, setPipelineTypes] = useState<PipelineType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isHealthy, setIsHealthy] = useState(false);
  const [healthInfo, setHealthInfo] = useState<any>(null);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [configForm, setConfigForm] = useState<TaskConfigForm>({
    pipeline_type: '',
    task_name: '',
    description: '',
    config: {}
  });

  useEffect(() => {
    loadInitialData();
    const interval = setInterval(loadTasks, 5000); // 每5秒刷新任务状态
    return () => clearInterval(interval);
  }, [libraryId]);

  const loadInitialData = async () => {
    try {
      setIsLoading(true);
      await Promise.all([
        loadPipelineTypes(),
        loadTasks(),
        checkHealth()
      ]);
    } catch (error) {
      console.error('加载初始数据失败:', error);
      toast.error('加载DataFlow数据失败');
    } finally {
      setIsLoading(false);
    }
  };

  const loadPipelineTypes = async () => {
    try {
      const types = await dataflowService.getPipelineTypes();
      setPipelineTypes(types);
    } catch (error) {
      console.error('加载流水线类型失败:', error);
    }
  };

  const loadTasks = async () => {
    try {
      const libraryTasks = await dataflowService.getLibraryTasks(libraryId);
      setTasks(libraryTasks);
    } catch (error) {
      console.error('加载任务列表失败:', error);
    }
  };

  const checkHealth = async () => {
    try {
      const health = await dataflowService.healthCheck();
      setIsHealthy(health.dataflow_available);
      setHealthInfo(health);
    } catch (error) {
      console.error('健康检查失败:', error);
      setIsHealthy(false);
      setHealthInfo(null);
    }
  };

  const handleBatchProcess = async (pipelineType: string) => {
    try {
      setIsLoading(true);
      const template = await dataflowService.getPipelineConfigTemplate(pipelineType);
      
      const response = await dataflowService.batchProcessLibrary(libraryId, {
        pipeline_type: pipelineType,
        config: template
      });
      
      toast.success('批量处理任务已启动');
      setTimeout(loadTasks, 1000); // 延迟刷新任务列表
    } catch (error) {
      console.error('启动批量处理失败:', error);
      toast.error('启动批量处理失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTask = async () => {
    if (!configForm.pipeline_type || selectedFiles.length === 0) {
      toast.error('请选择流水线类型和文件');
      return;
    }

    try {
      setIsLoading(true);
      const task = await dataflowService.createTask({
        library_id: libraryId,
        file_ids: selectedFiles,
        pipeline_type: configForm.pipeline_type,
        config: configForm.config,
        task_name: configForm.task_name || undefined,
        description: configForm.description || undefined
      });

      // 立即启动任务
      await dataflowService.startTask(task.id);
      
      toast.success('任务创建并启动成功');
      setShowCreateDialog(false);
      setSelectedFiles([]);
      setConfigForm({
        pipeline_type: '',
        task_name: '',
        description: '',
        config: {}
      });
      
      setTimeout(loadTasks, 1000);
    } catch (error) {
      console.error('创建任务失败:', error);
      toast.error('创建任务失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfigChange = async (pipelineType: string) => {
    try {
      const template = await dataflowService.getPipelineConfigTemplate(pipelineType);
      setConfigForm(prev => ({
        ...prev,
        pipeline_type: pipelineType,
        config: template
      }));
    } catch (error) {
      console.error('加载配置模板失败:', error);
      toast.error('加载配置模板失败');
    }
  };

  const handleCancelTask = async (taskId: string) => {
    try {
      await dataflowService.cancelTask(taskId);
      toast.success('任务已取消');
      loadTasks();
    } catch (error) {
      console.error('取消任务失败:', error);
      toast.error('取消任务失败');
    }
  };

  const handleDownloadResults = async (taskId: string) => {
    try {
      // 显示当前使用的下载配置
      const downloadBaseUrl = config.downloadBaseUrl || config.apiBaseUrl;
      console.log('当前下载配置:', {
        downloadBaseUrl: config.downloadBaseUrl,
        apiBaseUrl: config.apiBaseUrl,
        actualUsed: downloadBaseUrl
      });
      
      const downloadInfo = await dataflowService.getTaskDownloadLinks(taskId);
      if (downloadInfo.download_links.length === 0) {
        toast.error('没有可下载的结果');
        return;
      }
      
      console.log('获取到下载链接:', downloadInfo.download_links); // 调试日志
      
      // 单独下载每个文件（但限制在3个以内，避免浏览器阻止）
      if (downloadInfo.download_links.length <= 3) {
        let downloadCount = 0;
        downloadInfo.download_links.forEach((link, index) => {
          setTimeout(async () => {
            try {
              // 使用专门的下载服务器地址
              const downloadBaseUrl = config.downloadBaseUrl || config.apiBaseUrl;
              
              // 确保正确拼接URL - API返回的download_url通常已经包含了/api/v1前缀
              let fullUrl;
              if (link.download_url.startsWith('/api/v1')) {
                // 如果download_url已经有完整的API路径，直接拼接
                fullUrl = `${downloadBaseUrl.replace(/\/+$/, '')}${link.download_url}`;
              } else {
                // 如果download_url只是相对路径，添加API前缀
                fullUrl = `${downloadBaseUrl.replace(/\/+$/, '')}/api/v1${link.download_url}`;
              }
              
              console.log(`下载第${index + 1}个文件:`, fullUrl, '文件名:', link.object_name);
              console.log('原始download_url:', link.download_url); // 调试日志
              
              // 使用fetch先检查文件是否存在
              const response = await fetch(fullUrl, { method: 'HEAD' });
              if (!response.ok) {
                console.error(`文件${link.object_name}下载失败:`, response.status);
                toast.error(`文件 ${link.object_name} 下载失败`);
                return;
              }
              
              // 创建下载链接
              const a = document.createElement('a');
              a.href = fullUrl;
              a.download = link.object_name;
              a.target = '_blank';
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              
              downloadCount++;
              if (downloadCount === 1) {
                toast.success(`开始下载 ${downloadInfo.download_links.length} 个文件`);
              }
            } catch (error) {
              console.error(`下载文件 ${link.object_name} 失败:`, error);
              toast.error(`下载文件 ${link.object_name} 失败`);
            }
          }, index * 500); // 延迟500ms避免浏览器阻止
        });
      } else {
        // 如果文件太多，提示用户使用打包下载
        toast.error(`文件数量较多 (${downloadInfo.download_links.length} 个)，建议使用打包下载`);
      }
    } catch (error) {
      console.error('获取下载链接失败:', error);
      toast.error('获取下载链接失败');
    }
  };

  const handleDownloadZip = async (taskId: string) => {
    try {
      console.log('开始打包下载，任务ID:', taskId); // 调试日志
      toast.success('正在准备下载包，请稍候...'); // 给用户反馈
      
      await dataflowService.downloadTaskResultsZip(taskId);
      
      console.log('打包下载完成'); // 调试日志
      toast.success('下载包已生成');
    } catch (error) {
      console.error('打包下载失败:', error);
      const errorMessage = error instanceof Error ? error.message : '打包下载失败';
      toast.error(errorMessage);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Clock className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // 计算可处理的文件数量 - 更宽松的条件
  const availableFiles = markdownFiles.filter(file => 
    file.converted_format === 'markdown' || 
    file.file_type === 'text' || 
    file.file_type === 'pdf' || 
    file.file_type === 'docx' ||
    file.original_filename.endsWith('.md') ||
    file.original_filename.endsWith('.txt')
  );

  // 如果没有可处理的文件，显示所有文件
  const processableFiles = availableFiles.length > 0 ? availableFiles : markdownFiles;

  return (
    <div className="space-y-6">
      {/* 调试信息显示区域 */}
      <div className="bg-gray-50 p-3 rounded-lg border text-sm">
        <div className="font-medium text-gray-700 mb-2">调试信息:</div>
        <div className="space-y-1 text-gray-600">
          <div>API Base URL: {config.apiBaseUrl}</div>
          <div>Download Base URL: {config.downloadBaseUrl}</div>
          <div>实际使用的下载地址: {config.downloadBaseUrl || config.apiBaseUrl}</div>
        </div>
      </div>
      
      {/* 状态卡片 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isHealthy ? 'bg-green-500' : 'bg-red-500'}`} />
            DataFlow 流水线
            <Badge variant="secondary">{libraryName}</Badge>
            {healthInfo && (
              <Badge variant="outline" className="ml-2">
                {healthInfo.dataflow_version === 'mock_mode' ? '模拟模式' : '正常模式'}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{processableFiles.length}</div>
              <div className="text-sm text-gray-600">可处理文件</div>
              {availableFiles.length === 0 && markdownFiles.length > 0 && (
                <div className="text-xs text-orange-600 mt-1">
                  建议先转换为Markdown格式
                </div>
              )}
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{tasks.filter(t => t.status === 'completed').length}</div>
              <div className="text-sm text-gray-600">已完成任务</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{tasks.filter(t => t.status === 'running').length}</div>
              <div className="text-sm text-gray-600">运行中任务</div>
            </div>
          </div>
          
          {/* 健康状态信息 */}
          {healthInfo && healthInfo.error_message && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2 text-yellow-800">
                <AlertTriangle className="w-4 h-4" />
                <span className="font-medium">注意：</span>
              </div>
              <div className="text-sm text-yellow-700 mt-1">
                {healthInfo.error_message}
              </div>
              <div className="text-xs text-yellow-600 mt-2">
                系统将使用模拟模式运行，功能可能受限
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 快速操作 */}
      <Card>
        <CardHeader>
          <CardTitle>快速操作</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              onClick={() => handleBatchProcess('PRETRAIN_FILTER')}
              disabled={!isHealthy || isLoading}
              className="w-full"
            >
              <Play className="w-4 h-4 mr-2" />
              预训练数据过滤
            </Button>
            <Button
              onClick={() => handleBatchProcess('PRETRAIN_SYNTHETIC')}
              disabled={!isHealthy || isLoading}
              className="w-full"
              variant="outline"
            >
              <Play className="w-4 h-4 mr-2" />
              预训练数据合成
            </Button>
          </div>
          
          {/* 文件状态提示 */}
          {processableFiles.length === 0 && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 text-blue-800">
                <FileText className="w-4 h-4" />
                <span className="font-medium">提示：</span>
              </div>
              <div className="text-sm text-blue-700 mt-1">
                当前没有可处理的文件。建议先上传一些文件并转换为Markdown格式。
              </div>
            </div>
          )}
          
          <div className="mt-4">
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={!isHealthy}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  自定义任务
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>创建自定义DataFlow任务</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="pipeline_type" className="block text-sm font-medium text-gray-700 mb-2">流水线类型</label>
                    <Select
                      value={configForm.pipeline_type}
                      onValueChange={handleConfigChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="选择流水线类型" />
                      </SelectTrigger>
                      <SelectContent>
                        {pipelineTypes.map(type => (
                          <SelectItem key={type.type} value={type.type}>
                            {type.name} - {type.description}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label htmlFor="task_name" className="block text-sm font-medium text-gray-700 mb-2">任务名称</label>
                    <Input
                      id="task_name"
                      value={configForm.task_name}
                      onChange={(e) => setConfigForm(prev => ({ ...prev, task_name: e.target.value }))}
                      placeholder="输入任务名称（可选）"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">任务描述</label>
                    <Textarea
                      id="description"
                      value={configForm.description}
                      onChange={(e) => setConfigForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="输入任务描述（可选）"
                      rows={3}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">选择文件</label>
                    <div className="max-h-40 overflow-y-auto border rounded p-2">
                      {processableFiles.map(file => (
                        <label key={file.id} className="flex items-center space-x-2 py-1">
                          <input
                            type="checkbox"
                            checked={selectedFiles.includes(file.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedFiles(prev => [...prev, file.id]);
                              } else {
                                setSelectedFiles(prev => prev.filter(id => id !== file.id));
                              }
                            }}
                          />
                          <span className="text-sm">{file.original_filename}</span>
                          <Badge variant="outline" className="text-xs">
                            {file.converted_format || file.file_type}
                          </Badge>
                        </label>
                      ))}
                    </div>
                    {processableFiles.length === 0 && (
                      <div className="text-sm text-gray-500 text-center py-4">
                        没有可选择的文件
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      onClick={handleCreateTask}
                      disabled={!configForm.pipeline_type || selectedFiles.length === 0 || isLoading}
                      className="flex-1"
                    >
                      创建并启动任务
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowCreateDialog(false)}
                      className="flex-1"
                    >
                      取消
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* 任务列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>任务列表</span>
            <Button
              variant="outline"
              size="sm"
              onClick={loadTasks}
              disabled={isLoading}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              刷新
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              暂无任务
            </div>
          ) : (
            <div className="space-y-4">
              {tasks.map(task => (
                <div key={task.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(task.status)}
                      <div>
                        <div className="font-medium">{task.name}</div>
                        <div className="text-sm text-gray-500">{task.description}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(task.status)}>
                        {task.status}
                      </Badge>
                      {task.status === 'running' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCancelTask(task.id)}
                        >
                          <X className="w-4 h-4 mr-1" />
                          取消
                        </Button>
                      )}
                      {task.status === 'completed' && (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadResults(task.id)}
                          >
                            <Download className="w-4 h-4 mr-1" />
                            下载
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadZip(task.id)}
                            title="打包下载所有结果文件"
                          >
                            <Download className="w-4 h-4 mr-1" />
                            打包下载
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {task.status === 'running' && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-gray-600">
                          进度: {task.processed_files}/{task.total_files}
                        </span>
                        <span className="text-sm text-gray-600">
                          {task.progress}%
                        </span>
                      </div>
                      <Progress value={task.progress} className="h-2" />
                      {task.current_file && (
                        <div className="text-xs text-gray-500 mt-1">
                          正在处理: {task.current_file}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {task.status === 'failed' && task.error_message && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                      错误: {task.error_message}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DataFlowPanel; 