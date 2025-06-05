import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Checkbox } from '../../components/ui/checkbox';
import { Progress } from '../../components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { 
  ArrowLeftIcon,
  WandIcon, 
  ChevronDownIcon,
  FileTextIcon,
  BrainIcon,
  SettingsIcon,
  PlayIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  Loader2Icon,
  FolderIcon,
  ImageIcon,
  VideoIcon,
  MicIcon,
  FileIcon,
  EyeIcon,
  DownloadIcon,
  RefreshCwIcon
} from 'lucide-react';

// 数据集类型定义
const DATASET_TYPES = [
  {
    id: 'qa-pairs',
    name: '问答对 (QA Pairs)',
    description: '从文档内容生成问题和答案对，适用于问答系统训练',
    icon: '💬',
    formats: ['JSON', 'JSONL', 'CSV'],
    multimodal: true
  },
  {
    id: 'instruction-tuning',
    name: '指令微调 (Instruction Tuning)',
    description: '生成指令-输入-输出三元组，用于指令遵循模型训练',
    icon: '📝',
    formats: ['JSON', 'JSONL'],
    multimodal: true
  },
  {
    id: 'text-classification',
    name: '文本分类',
    description: '提取文档片段并生成分类标签',
    icon: '🏷️',
    formats: ['CSV', 'JSON'],
    multimodal: false
  },
  {
    id: 'summarization',
    name: '文档摘要',
    description: '生成文档摘要对，原文-摘要格式',
    icon: '📋',
    formats: ['JSON', 'CSV'],
    multimodal: false
  },
  {
    id: 'knowledge-base',
    name: '知识库',
    description: '结构化知识提取，生成实体-关系-属性三元组',
    icon: '🧠',
    formats: ['JSON', 'RDF', 'TTL'],
    multimodal: true
  },
  {
    id: 'dialogue',
    name: '对话数据',
    description: '生成多轮对话数据，支持角色扮演和情境对话',
    icon: '💭',
    formats: ['JSON', 'JSONL'],
    multimodal: true
  }
];

// 模型配置选项
const AI_MODELS = [
  { id: 'gpt-4', name: 'GPT-4', provider: 'OpenAI', quality: 'high', speed: 'medium' },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'OpenAI', quality: 'medium', speed: 'fast' },
  { id: 'claude-3', name: 'Claude-3', provider: 'Anthropic', quality: 'high', speed: 'medium' },
  { id: 'gemini-pro', name: 'Gemini Pro', provider: 'Google', quality: 'medium', speed: 'fast' },
  { id: 'local-llm', name: '本地模型', provider: 'Local', quality: 'custom', speed: 'variable' }
];

interface SelectedFile {
  id: string;
  name: string;
  path: string;
  size: number;
  type: string;
  selected: boolean;
}

interface ProcessingConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  batchSize: number;
  customPrompt: string;
}

export const SmartDatasetCreator = (): JSX.Element => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  // 步骤状态
  const [currentStep, setCurrentStep] = useState(1);
  const steps = [
    { id: 1, name: t('smartDatasetCreator.steps.selectData'), description: '从原始数据中选择文件' },
    { id: 2, name: t('smartDatasetCreator.steps.configureDataset'), description: '选择数据集类型和格式' },
    { id: 3, name: t('smartDatasetCreator.steps.configureModel'), description: '配置AI模型和处理参数' },
    { id: 4, name: t('smartDatasetCreator.steps.preview'), description: '预览生成设置并确认' },
    { id: 5, name: t('smartDatasetCreator.steps.generate'), description: 'AI处理并生成数据集' }
  ];

  // 数据状态
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [datasetType, setDatasetType] = useState('qa-pairs');
  const [outputFormat, setOutputFormat] = useState('JSON');
  const [datasetName, setDatasetName] = useState('');
  const [datasetDescription, setDatasetDescription] = useState('');
  const [processingConfig, setProcessingConfig] = useState<ProcessingConfig>({
    model: 'gpt-4',
    temperature: 0.7,
    maxTokens: 2000,
    batchSize: 10,
    customPrompt: ''
  });

  // UI状态
  const [isLoading, setIsLoading] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // 模拟文件列表数据
  const [availableFiles, setAvailableFiles] = useState<SelectedFile[]>([]);

  useEffect(() => {
    loadAvailableFiles();
  }, []);

  const loadAvailableFiles = async () => {
    setLoadingFiles(true);
    try {
      // 模拟API调用获取MD文件
      await new Promise(resolve => setTimeout(resolve, 1000));
      const mockFiles: SelectedFile[] = [
        { id: '1', name: '产品介绍.md', path: '/rawdata/docs/产品介绍.md', size: 1024, type: 'markdown', selected: false },
        { id: '2', name: '用户手册.md', path: '/rawdata/docs/用户手册.md', size: 2048, type: 'markdown', selected: false },
        { id: '3', name: 'FAQ.md', path: '/rawdata/docs/FAQ.md', size: 1536, type: 'markdown', selected: false },
        { id: '4', name: '技术文档.md', path: '/rawdata/technical/技术文档.md', size: 4096, type: 'markdown', selected: false },
        { id: '5', name: '更新日志.md', path: '/rawdata/changelog/更新日志.md', size: 512, type: 'markdown', selected: false }
      ];
      setAvailableFiles(mockFiles);
    } catch (err) {
      setError('加载文件列表失败');
    } finally {
      setLoadingFiles(false);
    }
  };

  const handleFileSelection = (fileId: string, selected: boolean) => {
    setAvailableFiles(prev => 
      prev.map(file => 
        file.id === fileId ? { ...file, selected } : file
      )
    );
    
    if (selected) {
      const file = availableFiles.find(f => f.id === fileId);
      if (file) {
        setSelectedFiles(prev => [...prev, { ...file, selected: true }]);
      }
    } else {
      setSelectedFiles(prev => prev.filter(f => f.id !== fileId));
    }
  };

  const handleSelectAll = (selected: boolean) => {
    setAvailableFiles(prev => prev.map(file => ({ ...file, selected })));
    setSelectedFiles(selected ? availableFiles.map(f => ({ ...f, selected: true })) : []);
  };

  const handleNextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStartGeneration = async () => {
    setIsLoading(true);
    setCurrentStep(5);
    setProgress(0);

    try {
      // 模拟生成过程
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 500));
        setProgress(i);
      }
      
      // 生成完成后跳转到数据集列表
      setTimeout(() => {
        navigate('/datasets');
      }, 1000);
      
    } catch (err) {
      setError('数据集生成失败');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
              currentStep >= step.id 
                ? 'bg-[#1977e5] border-[#1977e5] text-white' 
                : 'border-[#d1dbe8] text-[#4f7096]'
            }`}>
              {currentStep > step.id ? (
                <CheckCircleIcon className="w-5 h-5" />
              ) : (
                <span className="text-sm font-medium">{step.id}</span>
              )}
            </div>
            {index < steps.length - 1 && (
              <div className={`w-20 h-0.5 mx-2 ${
                currentStep > step.id ? 'bg-[#1977e5]' : 'bg-[#d1dbe8]'
              }`} />
            )}
          </div>
        ))}
      </div>
      <div className="mt-4 text-center">
        <h2 className="text-xl font-bold text-[#0c141c]">{steps[currentStep - 1]?.name}</h2>
        <p className="text-[#4f7096] text-sm">{steps[currentStep - 1]?.description}</p>
      </div>
    </div>
  );

  const renderStep1 = () => (
    <Card className="border-[#d1dbe8]">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <FileTextIcon className="w-6 h-6 text-[#1977e5]" />
          <h3 className="text-lg font-semibold text-[#0c141c]">选择原始数据文件</h3>
        </div>

        {loadingFiles ? (
          <div className="flex items-center justify-center py-8">
            <Loader2Icon className="w-6 h-6 animate-spin mr-2" />
            <span>加载文件列表...</span>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <Checkbox 
                  checked={selectedFiles.length === availableFiles.length && availableFiles.length > 0}
                  onCheckedChange={handleSelectAll}
                />
                <span className="text-sm text-[#4f7096]">
                  已选择 {selectedFiles.length} / {availableFiles.length} 个文件
                </span>
              </div>
              <Button variant="outline" onClick={loadAvailableFiles} className="flex items-center gap-2">
                <RefreshCwIcon className="w-4 h-4" />
                刷新
              </Button>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {availableFiles.map((file) => (
                <div key={file.id} className="flex items-center gap-3 p-3 border border-[#d1dbe8] rounded-lg hover:bg-[#f0f4f8]">
                  <Checkbox 
                    checked={file.selected}
                    onCheckedChange={(checked) => handleFileSelection(file.id, checked as boolean)}
                  />
                  <FileIcon className="w-5 h-5 text-[#4f7096]" />
                  <div className="flex-1">
                    <div className="font-medium text-[#0c141c]">{file.name}</div>
                    <div className="text-sm text-[#4f7096]">{file.path} • {Math.round(file.size / 1024)} KB</div>
                  </div>
                  <Button variant="ghost" size="sm" className="flex items-center gap-1">
                    <EyeIcon className="w-4 h-4" />
                    预览
                  </Button>
                </div>
              ))}
            </div>

            {/* 多模态支持提示 */}
            <div className="mt-6 p-4 bg-[#f0f4f8] border border-[#d1dbe8] rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <ImageIcon className="w-5 h-5 text-[#1977e5]" />
                <span className="font-medium text-[#0c141c]">多模态支持</span>
              </div>
              <p className="text-sm text-[#4f7096] mb-3">
                除了Markdown文件，我们还支持处理图片、视频和音频文件，用于创建多模态数据集。
              </p>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 text-sm text-[#4f7096]">
                  <ImageIcon className="w-4 h-4" />
                  图片 (JPG, PNG, WebP)
                </div>
                <div className="flex items-center gap-1 text-sm text-[#4f7096]">
                  <VideoIcon className="w-4 h-4" />
                  视频 (MP4, AVI, MOV)
                </div>
                <div className="flex items-center gap-1 text-sm text-[#4f7096]">
                  <MicIcon className="w-4 h-4" />
                  音频 (MP3, WAV, M4A)
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </Card>
  );

  const renderStep2 = () => (
    <Card className="border-[#d1dbe8]">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <BrainIcon className="w-6 h-6 text-[#1977e5]" />
          <h3 className="text-lg font-semibold text-[#0c141c]">配置数据集类型</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {DATASET_TYPES.map((type) => (
            <Card 
              key={type.id}
              className={`border-2 cursor-pointer transition-all ${
                datasetType === type.id 
                  ? 'border-[#1977e5] bg-[#f0f4f8]' 
                  : 'border-[#d1dbe8] hover:border-[#1977e5]'
              }`}
              onClick={() => setDatasetType(type.id)}
            >
              <div className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{type.icon}</span>
                  <h4 className="font-semibold text-[#0c141c]">{type.name}</h4>
                  {type.multimodal && (
                    <span className="px-2 py-1 bg-[#1977e5] text-white text-xs rounded-full">多模态</span>
                  )}
                </div>
                <p className="text-sm text-[#4f7096] mb-3">{type.description}</p>
                <div className="flex flex-wrap gap-1">
                  {type.formats.map((format) => (
                    <span key={format} className="px-2 py-1 bg-[#e8edf2] text-[#4f7096] text-xs rounded">
                      {format}
                    </span>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[#0c141c] mb-2">输出格式</label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full border-[#d1dbe8] justify-between">
                  {outputFormat}
                  <ChevronDownIcon className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-full">
                {DATASET_TYPES.find(t => t.id === datasetType)?.formats.map((format) => (
                  <DropdownMenuItem key={format} onClick={() => setOutputFormat(format)}>
                    {format}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#0c141c] mb-2">数据集名称</label>
            <Input
              className="border-[#d1dbe8]"
              placeholder="输入数据集名称..."
              value={datasetName}
              onChange={(e) => setDatasetName(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-[#0c141c] mb-2">数据集描述</label>
          <Textarea
            className="border-[#d1dbe8]"
            placeholder="描述数据集的内容和用途..."
            value={datasetDescription}
            onChange={(e) => setDatasetDescription(e.target.value)}
          />
        </div>
      </div>
    </Card>
  );

  const renderStep3 = () => (
    <Card className="border-[#d1dbe8]">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <SettingsIcon className="w-6 h-6 text-[#1977e5]" />
          <h3 className="text-lg font-semibold text-[#0c141c]">模型配置</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-[#0c141c] mb-2">选择AI模型</label>
            <div className="space-y-2">
              {AI_MODELS.map((model) => (
                <Card 
                  key={model.id}
                  className={`border cursor-pointer transition-all ${
                    processingConfig.model === model.id 
                      ? 'border-[#1977e5] bg-[#f0f4f8]' 
                      : 'border-[#d1dbe8] hover:border-[#1977e5]'
                  }`}
                  onClick={() => setProcessingConfig(prev => ({ ...prev, model: model.id }))}
                >
                  <div className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h5 className="font-medium text-[#0c141c]">{model.name}</h5>
                        <p className="text-sm text-[#4f7096]">{model.provider}</p>
                      </div>
                      <div className="flex gap-1">
                        <span className={`px-2 py-1 text-xs rounded ${
                          model.quality === 'high' ? 'bg-green-100 text-green-700' :
                          model.quality === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {model.quality === 'high' ? '高质量' : 
                           model.quality === 'medium' ? '中等质量' : '自定义'}
                        </span>
                        <span className={`px-2 py-1 text-xs rounded ${
                          model.speed === 'fast' ? 'bg-blue-100 text-blue-700' :
                          model.speed === 'medium' ? 'bg-orange-100 text-orange-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {model.speed === 'fast' ? '快速' : 
                           model.speed === 'medium' ? '中等' : '可变'}
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#0c141c] mb-2">
                温度 (Temperature): {processingConfig.temperature}
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={processingConfig.temperature}
                onChange={(e) => setProcessingConfig(prev => ({ 
                  ...prev, 
                  temperature: parseFloat(e.target.value) 
                }))}
                className="w-full"
              />
              <p className="text-xs text-[#4f7096] mt-1">控制生成内容的创造性，值越高越有创意</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#0c141c] mb-2">最大Token数</label>
              <Input
                type="number"
                className="border-[#d1dbe8]"
                value={processingConfig.maxTokens}
                onChange={(e) => setProcessingConfig(prev => ({ 
                  ...prev, 
                  maxTokens: parseInt(e.target.value) || 2000 
                }))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#0c141c] mb-2">批处理大小</label>
              <Input
                type="number"
                className="border-[#d1dbe8]"
                value={processingConfig.batchSize}
                onChange={(e) => setProcessingConfig(prev => ({ 
                  ...prev, 
                  batchSize: parseInt(e.target.value) || 10 
                }))}
              />
              <p className="text-xs text-[#4f7096] mt-1">同时处理的文档数量，影响处理速度</p>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <label className="block text-sm font-medium text-[#0c141c] mb-2">自定义提示词 (可选)</label>
          <Textarea
            className="border-[#d1dbe8]"
            placeholder="输入自定义的处理指令..."
            value={processingConfig.customPrompt}
            onChange={(e) => setProcessingConfig(prev => ({ ...prev, customPrompt: e.target.value }))}
            rows={4}
          />
          <p className="text-xs text-[#4f7096] mt-1">留空将使用默认的最佳实践提示词</p>
        </div>
      </div>
    </Card>
  );

  const renderStep4 = () => (
    <Card className="border-[#d1dbe8]">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <EyeIcon className="w-6 h-6 text-[#1977e5]" />
          <h3 className="text-lg font-semibold text-[#0c141c]">预览确认</h3>
        </div>

        <div className="space-y-6">
          <div>
            <h4 className="font-medium text-[#0c141c] mb-3">数据源</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {selectedFiles.slice(0, 4).map((file) => (
                <div key={file.id} className="flex items-center gap-2 p-2 bg-[#f0f4f8] rounded">
                  <FileIcon className="w-4 h-4 text-[#4f7096]" />
                  <span className="text-sm text-[#0c141c] truncate">{file.name}</span>
                </div>
              ))}
              {selectedFiles.length > 4 && (
                <div className="p-2 bg-[#f0f4f8] rounded text-center text-sm text-[#4f7096]">
                  +{selectedFiles.length - 4} 个文件
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-[#0c141c] mb-3">数据集配置</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#4f7096]">类型:</span>
                  <span className="text-[#0c141c]">
                    {DATASET_TYPES.find(t => t.id === datasetType)?.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#4f7096]">格式:</span>
                  <span className="text-[#0c141c]">{outputFormat}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#4f7096]">名称:</span>
                  <span className="text-[#0c141c]">{datasetName || '未设置'}</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-[#0c141c] mb-3">模型配置</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#4f7096]">模型:</span>
                  <span className="text-[#0c141c]">
                    {AI_MODELS.find(m => m.id === processingConfig.model)?.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#4f7096]">温度:</span>
                  <span className="text-[#0c141c]">{processingConfig.temperature}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#4f7096]">批处理:</span>
                  <span className="text-[#0c141c]">{processingConfig.batchSize} 文档/批次</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-[#f0f4f8] border border-[#d1dbe8] rounded-lg">
            <h5 className="font-medium text-[#0c141c] mb-2">预估处理信息</h5>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-[#4f7096]">文件数量:</span>
                <div className="font-medium text-[#0c141c]">{selectedFiles.length}</div>
              </div>
              <div>
                <span className="text-[#4f7096]">预估时间:</span>
                <div className="font-medium text-[#0c141c]">
                  {Math.ceil(selectedFiles.length / processingConfig.batchSize * 2)} 分钟
                </div>
              </div>
              <div>
                <span className="text-[#4f7096]">预估条目:</span>
                <div className="font-medium text-[#0c141c]">
                  {selectedFiles.length * 10}-{selectedFiles.length * 50}
                </div>
              </div>
              <div>
                <span className="text-[#4f7096]">预估大小:</span>
                <div className="font-medium text-[#0c141c]">
                  {Math.round(selectedFiles.reduce((sum, f) => sum + f.size, 0) / 1024)} KB
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );

  const renderStep5 = () => (
    <Card className="border-[#d1dbe8]">
      <div className="p-6">
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <WandIcon className="w-8 h-8 text-[#1977e5]" />
            <h3 className="text-xl font-semibold text-[#0c141c]">AI正在生成数据集</h3>
          </div>

          <div className="max-w-md mx-auto mb-8">
            <Progress value={progress} className="h-3" />
            <p className="text-sm text-[#4f7096] mt-2">{progress}% 完成</p>
          </div>

          <div className="space-y-4 text-left max-w-lg mx-auto">
            <div className="flex items-center gap-3 p-3 bg-[#f0f4f8] rounded">
              <div className={`w-3 h-3 rounded-full ${progress >= 20 ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span className={`text-sm ${progress >= 20 ? 'text-[#0c141c]' : 'text-[#4f7096]'}`}>
                解析文档内容
              </span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-[#f0f4f8] rounded">
              <div className={`w-3 h-3 rounded-full ${progress >= 40 ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span className={`text-sm ${progress >= 40 ? 'text-[#0c141c]' : 'text-[#4f7096]'}`}>
                提取关键信息
              </span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-[#f0f4f8] rounded">
              <div className={`w-3 h-3 rounded-full ${progress >= 60 ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span className={`text-sm ${progress >= 60 ? 'text-[#0c141c]' : 'text-[#4f7096]'}`}>
                AI模型处理
              </span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-[#f0f4f8] rounded">
              <div className={`w-3 h-3 rounded-full ${progress >= 80 ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span className={`text-sm ${progress >= 80 ? 'text-[#0c141c]' : 'text-[#4f7096]'}`}>
                格式化数据
              </span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-[#f0f4f8] rounded">
              <div className={`w-3 h-3 rounded-full ${progress >= 100 ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span className={`text-sm ${progress >= 100 ? 'text-[#0c141c]' : 'text-[#4f7096]'}`}>
                保存数据集
              </span>
            </div>
          </div>

          {progress === 100 && (
            <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircleIcon className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <h4 className="font-medium text-green-700 mb-2">数据集生成完成！</h4>
              <p className="text-sm text-green-600">正在跳转到数据集管理页面...</p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );

  return (
    <div className="w-full max-w-[1000px] p-6">
      {/* Back Button */}
      <div className="mb-6">
        <Link to="/datasets">
          <Button variant="outline" className="border-[#d1dbe8] flex items-center gap-2">
            <ArrowLeftIcon className="w-4 h-4" />
            返回数据集列表
          </Button>
        </Link>
      </div>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <WandIcon className="w-8 h-8 text-[#1977e5]" />
          <h1 className="text-2xl font-bold text-[#0c141c]">智能数据集创建器</h1>
        </div>
        <p className="text-[#4f7096] text-lg max-w-3xl">
          使用AI技术从原始数据自动生成高质量的训练数据集，支持多种数据集类型和格式。
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <Card className="border-red-200 bg-red-50 mb-6">
          <div className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircleIcon className="w-5 h-5 text-red-500" />
              <span className="text-red-700 font-medium">错误</span>
            </div>
            <p className="text-red-600 mt-1">{error}</p>
          </div>
        </Card>
      )}

      {/* Step Indicator */}
      {renderStepIndicator()}

      {/* Step Content */}
      <div className="mb-8">
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}
        {currentStep === 5 && renderStep5()}
      </div>

      {/* Navigation Buttons */}
      {currentStep < 5 && (
        <div className="flex items-center justify-between">
          <Button 
            variant="outline" 
            onClick={handlePrevStep}
            disabled={currentStep === 1}
            className="border-[#d1dbe8]"
          >
            上一步
          </Button>
          
          <div className="flex gap-3">
            {currentStep === 4 ? (
              <Button 
                className="bg-[#1977e5] hover:bg-[#1565c0] flex items-center gap-2"
                onClick={handleStartGeneration}
                disabled={!datasetName.trim() || selectedFiles.length === 0}
              >
                <PlayIcon className="w-4 h-4" />
                开始生成
              </Button>
            ) : (
              <Button 
                className="bg-[#1977e5] hover:bg-[#1565c0]"
                onClick={handleNextStep}
                disabled={
                  (currentStep === 1 && selectedFiles.length === 0) ||
                  (currentStep === 2 && !datasetName.trim())
                }
              >
                下一步
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}; 