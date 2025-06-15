import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import { Progress } from '../ui/progress';
import { 
  ImageIcon, 
  VideoIcon, 
  BrainIcon, 
  SettingsIcon, 
  PlayIcon, 
  CheckIcon, 
  AlertCircleIcon,
  FileIcon,
  PlusIcon,
  TrashIcon
} from 'lucide-react';
import { LLMService } from '../../services/llm.service';
import { LLMConfig } from '../../types/llm';

interface MultimodalFile {
  id: number;
  filename: string;
  file_category: 'image' | 'video';
  file_path: string;
  thumbnail?: string;
  metadata?: Record<string, any>;
}

interface GenerationConfig {
  qa_per_image: number;
  include_captions: boolean;
  include_object_detection: boolean;
  output_format: 'jsonl' | 'json' | 'csv';
  custom_questions: string[];
}

interface MultimodalDatasetCreatorProps {
  initialFiles?: MultimodalFile[];
  onClose?: () => void;
  onDatasetCreated?: (datasetId: string) => void;
}

export const MultimodalDatasetCreator: React.FC<MultimodalDatasetCreatorProps> = ({
  initialFiles = [],
  onClose,
  onDatasetCreated
}) => {
  // 基本信息
  const [datasetName, setDatasetName] = useState('');
  const [datasetDescription, setDatasetDescription] = useState('');
  
  // 文件选择
  const [selectedFiles, setSelectedFiles] = useState<MultimodalFile[]>(initialFiles);
  
  // 模型配置
  const [availableModels, setAvailableModels] = useState<LLMConfig[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [loadingModels, setLoadingModels] = useState(false);
  
  // 生成配置
  const [generationConfig, setGenerationConfig] = useState<GenerationConfig>({
    qa_per_image: 5,
    include_captions: true,
    include_object_detection: false,
    output_format: 'jsonl',
    custom_questions: []
  });
  
  // 自定义问题
  const [customQuestion, setCustomQuestion] = useState('');
  
  // 生成状态
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStatus, setGenerationStatus] = useState('');
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);

  // 加载支持视觉的模型
  useEffect(() => {
    loadVisionModels();
  }, []);

  const loadVisionModels = async () => {
    setLoadingModels(true);
    try {
      const { configs } = await LLMService.getConfigs({
        is_active: true,
        supports_vision: true
      });
      
      setAvailableModels(configs);
      
      // 自动选择默认模型
      if (configs.length > 0) {
        const defaultModel = configs.find(c => c.is_default) || configs[0];
        setSelectedModelId(defaultModel.id);
      }
    } catch (error) {
      console.error('加载视觉模型失败:', error);
    } finally {
      setLoadingModels(false);
    }
  };

  const handleAddCustomQuestion = () => {
    if (customQuestion.trim()) {
      setGenerationConfig(prev => ({
        ...prev,
        custom_questions: [...prev.custom_questions, customQuestion.trim()]
      }));
      setCustomQuestion('');
    }
  };

  const handleRemoveCustomQuestion = (index: number) => {
    setGenerationConfig(prev => ({
      ...prev,
      custom_questions: prev.custom_questions.filter((_, i) => i !== index)
    }));
  };

  const handleStartGeneration = async () => {
    if (!datasetName.trim()) {
      alert('请输入数据集名称');
      return;
    }
    
    if (selectedFiles.length === 0) {
      alert('请选择要处理的文件');
      return;
    }
    
    if (!selectedModelId) {
      alert('请选择AI模型');
      return;
    }

    const selectedModel = availableModels.find(m => m.id === selectedModelId);
    if (!selectedModel) {
      alert('选中的模型不存在');
      return;
    }

    setIsGenerating(true);
    setGenerationProgress(0);
    setGenerationStatus('启动生成任务...');
    setGenerationError(null);

    try {
      const response = await fetch('/api/v1/datasets/multimodal/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          dataset_name: datasetName,
          dataset_description: datasetDescription,
          selected_files: selectedFiles.map(f => ({
            id: f.id,
            filename: f.filename,
            file_category: f.file_category,
            file_path: f.file_path
          })),
          model_config: {
            id: selectedModel.id,
            name: selectedModel.name,
            provider: selectedModel.provider,
            model_name: selectedModel.model_name
          },
          generation_config: generationConfig
        })
      });

      const result = await response.json();
      
      if (response.ok) {
        setTaskId(result.task_id);
        setGenerationStatus('正在生成多模态数据集...');
        
        // 开始轮询任务状态
        pollTaskStatus(result.task_id);
      } else {
        throw new Error(result.error || '启动生成任务失败');
      }

    } catch (error) {
      setGenerationError(error instanceof Error ? error.message : '生成失败');
      setIsGenerating(false);
    }
  };

  const pollTaskStatus = async (taskId: string) => {
    try {
      const response = await fetch(`/api/v1/tasks/${taskId}/status`);
      const status = await response.json();
      
      if (status.state === 'PROGRESS') {
        const progress = Math.round((status.meta.current / status.meta.total) * 100);
        setGenerationProgress(progress);
        setGenerationStatus(status.meta.status || '处理中...');
        
        // 继续轮询
        setTimeout(() => pollTaskStatus(taskId), 2000);
        
      } else if (status.state === 'SUCCESS') {
        setGenerationProgress(100);
        setGenerationStatus('数据集生成完成！');
        setIsGenerating(false);
        
        if (onDatasetCreated && status.result.dataset_id) {
          onDatasetCreated(status.result.dataset_id);
        }
        
      } else if (status.state === 'FAILURE') {
        setGenerationError(status.meta?.error || '生成失败');
        setIsGenerating(false);
      }
      
    } catch (error) {
      console.error('轮询任务状态失败:', error);
      setTimeout(() => pollTaskStatus(taskId), 5000); // 错误时延长轮询间隔
    }
  };

  const getFileIcon = (category: string) => {
    switch (category) {
      case 'image': return <ImageIcon size={16} />;
      case 'video': return <VideoIcon size={16} />;
      default: return <FileIcon size={16} />;
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* 标题 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <BrainIcon size={24} className="text-blue-500" />
          <h1 className="text-2xl font-bold">AI多模态数据集生成器</h1>
        </div>
        {onClose && (
          <Button variant="outline" onClick={onClose}>
            关闭
          </Button>
        )}
      </div>

      {/* 基本信息 */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">数据集信息</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">数据集名称 *</label>
            <Input
              value={datasetName}
              onChange={(e) => setDatasetName(e.target.value)}
              placeholder="输入数据集名称..."
              disabled={isGenerating}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">输出格式</label>
            <Select 
              value={generationConfig.output_format} 
              onValueChange={(value: 'jsonl' | 'json' | 'csv') => 
                setGenerationConfig(prev => ({ ...prev, output_format: value }))
              }
              disabled={isGenerating}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="jsonl">JSONL (推荐)</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
                <SelectItem value="csv">CSV</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium mb-2">数据集描述</label>
          <Textarea
            value={datasetDescription}
            onChange={(e) => setDatasetDescription(e.target.value)}
            placeholder="描述数据集的用途和特点..."
            rows={3}
            disabled={isGenerating}
          />
        </div>
      </Card>

      {/* 文件选择 */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">
          选中的文件 ({selectedFiles.length})
        </h2>
        
        {selectedFiles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {selectedFiles.map((file) => (
              <div key={file.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                {getFileIcon(file.file_category)}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{file.filename}</div>
                  <div className="text-xs text-gray-500 capitalize">{file.file_category}</div>
                </div>
                <Badge variant="outline" className="text-xs">
                  {file.file_category}
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <FileIcon size={48} className="mx-auto mb-4 text-gray-300" />
            <p>暂无选中的文件</p>
            <p className="text-sm">请从文件管理器中选择图片或视频文件</p>
          </div>
        )}
      </Card>

      {/* 模型选择 */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center">
          <SettingsIcon size={20} className="mr-2" />
          AI模型配置
        </h2>
        
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">选择视觉模型</label>
              <Button
                size="sm"
                variant="outline"
                onClick={loadVisionModels}
                disabled={loadingModels || isGenerating}
                className="h-6 px-2 text-xs"
              >
                刷新
              </Button>
            </div>
            
            {availableModels.length > 0 ? (
              <Select 
                value={selectedModelId} 
                onValueChange={setSelectedModelId}
                disabled={isGenerating}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择支持视觉的AI模型" />
                </SelectTrigger>
                <SelectContent>
                  {availableModels.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      <div className="flex items-center space-x-2">
                        <Badge variant={model.is_default ? 'default' : 'outline'} className="text-xs">
                          {model.provider}
                        </Badge>
                        <span>{model.name}</span>
                        <span className="text-xs text-gray-500">({model.model_name})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded border">
                暂无可用的视觉模型，请在设置中配置支持视觉的AI模型
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* 生成配置 */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">生成配置</h2>
        
        <div className="space-y-6">
          {/* 基础配置 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                每张图片生成问答对数量
              </label>
              <Input
                type="number"
                min="1"
                max="20"
                value={generationConfig.qa_per_image}
                onChange={(e) => setGenerationConfig(prev => ({ 
                  ...prev, 
                  qa_per_image: parseInt(e.target.value) || 5 
                }))}
                disabled={isGenerating}
              />
            </div>
          </div>

          {/* 功能开关 */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="include_captions"
                checked={generationConfig.include_captions}
                onCheckedChange={(checked) => setGenerationConfig(prev => ({ 
                  ...prev, 
                  include_captions: checked as boolean 
                }))}
                disabled={isGenerating}
              />
              <label htmlFor="include_captions" className="text-sm font-medium">
                包含图片描述生成
              </label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="include_object_detection"
                checked={generationConfig.include_object_detection}
                onCheckedChange={(checked) => setGenerationConfig(prev => ({ 
                  ...prev, 
                  include_object_detection: checked as boolean 
                }))}
                disabled={isGenerating}
              />
              <label htmlFor="include_object_detection" className="text-sm font-medium">
                包含对象检测 (实验性功能)
              </label>
            </div>
          </div>

          {/* 自定义问题 */}
          <div>
            <label className="block text-sm font-medium mb-2">自定义问题模板</label>
            <div className="space-y-2">
              <div className="flex space-x-2">
                <Input
                  value={customQuestion}
                  onChange={(e) => setCustomQuestion(e.target.value)}
                  placeholder="输入自定义问题..."
                  disabled={isGenerating}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleAddCustomQuestion();
                    }
                  }}
                />
                <Button
                  onClick={handleAddCustomQuestion}
                  disabled={!customQuestion.trim() || isGenerating}
                  size="sm"
                >
                  <PlusIcon size={16} />
                </Button>
              </div>
              
              {generationConfig.custom_questions.length > 0 && (
                <div className="space-y-2">
                  {generationConfig.custom_questions.map((question, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm">{question}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveCustomQuestion(index)}
                        disabled={isGenerating}
                      >
                        <TrashIcon size={14} />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* 生成进度 */}
      {isGenerating && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">生成进度</h2>
          <div className="space-y-4">
            <Progress value={generationProgress} className="w-full" />
            <div className="flex items-center justify-between text-sm">
              <span>{generationStatus}</span>
              <span>{generationProgress}%</span>
            </div>
          </div>
        </Card>
      )}

      {/* 错误信息 */}
      {generationError && (
        <Card className="p-6 border-red-200 bg-red-50">
          <div className="flex items-center space-x-2 text-red-800">
            <AlertCircleIcon size={20} />
            <h3 className="font-semibold">生成失败</h3>
          </div>
          <p className="text-red-700 mt-2">{generationError}</p>
        </Card>
      )}

      {/* 操作按钮 */}
      <div className="flex justify-end space-x-4">
        <Button
          onClick={handleStartGeneration}
          disabled={
            !datasetName.trim() || 
            selectedFiles.length === 0 || 
            !selectedModelId || 
            isGenerating
          }
          className="bg-blue-500 hover:bg-blue-600"
        >
          {isGenerating ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              生成中...
            </>
          ) : (
            <>
              <PlayIcon size={16} className="mr-2" />
              开始生成数据集
            </>
          )}
        </Button>
      </div>
    </div>
  );
}; 