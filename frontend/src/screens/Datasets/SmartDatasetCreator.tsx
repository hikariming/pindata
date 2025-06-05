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
  RefreshCwIcon,
  HelpCircleIcon,
  InfoIcon,
  BookOpenIcon,
  ZapIcon,
  GraduationCapIcon,
  MessageSquareIcon,
  DatabaseIcon,
  BarChart3Icon
} from 'lucide-react';

// 数据集类型定义
const DATASET_TYPES = [
  {
    id: 'qa-pairs',
    name: '问答对 (QA Pairs)',
    description: '从文档内容生成问题和答案对，适用于问答系统训练',
    icon: '💬',
    formats: ['Alpaca', 'ShareGPT', 'OpenAI'],
    multimodal: true,
    category: 'supervised',
    useCase: '智能客服、知识问答、教育辅导',
    example: '{"instruction": "什么是人工智能？", "input": "", "output": "人工智能是一门计算机科学..."}'
  },
  {
    id: 'instruction-tuning',
    name: '指令微调 (Instruction Tuning)',
    description: '生成指令-输入-输出三元组，用于指令遵循模型训练',
    icon: '📝',
    formats: ['Alpaca', 'ShareGPT'],
    multimodal: true,
    category: 'supervised',
    useCase: '智能办公、文档处理、个性化助手',
    example: '{"instruction": "将以下文本翻译成英文", "input": "你好世界", "output": "Hello World"}'
  },
  {
    id: 'text-classification',
    name: '文本分类',
    description: '提取文档片段并生成分类标签，用于情感分析、内容审核等',
    icon: '🏷️',
    formats: ['Alpaca', 'CSV'],
    multimodal: false,
    category: 'supervised',
    useCase: '情感分析、内容审核、新闻分类、意图识别',
    example: '{"text": "这个产品很棒！", "label": "positive"}'
  },
  {
    id: 'dialogue',
    name: '对话微调',
    description: '生成多轮对话数据，提升对话连贯性和上下文理解',
    icon: '💭',
    formats: ['ShareGPT', 'OpenAI'],
    multimodal: true,
    category: 'supervised',
    useCase: '智能客服、聊天机器人、语音助手',
    example: '{"conversations": [{"role": "user", "content": "你好"}, {"role": "assistant", "content": "您好！有什么可以帮助您的吗？"}]}'
  },
  {
    id: 'domain-adaptation',
    name: '领域适配',
    description: '特定领域的知识微调，提升模型在专业领域的表现',
    icon: '🎯',
    formats: ['Alpaca', 'ShareGPT'],
    multimodal: true,
    category: 'supervised',
    useCase: '医疗诊断、法律咨询、金融分析',
    example: '{"instruction": "分析患者症状", "input": "患者胸痛3小时", "output": "建议进行心电图检查...", "domain": "医疗"}'
  },
  {
    id: 'reasoning',
    name: '推理微调',
    description: '包含思维链的推理数据，训练模型逻辑推理能力',
    icon: '🧮',
    formats: ['Alpaca-COT', 'ShareGPT'],
    multimodal: false,
    category: 'reasoning',
    useCase: '数学解题、代码生成、逻辑推理、复杂分析',
    example: '{"instruction": "解数学题", "input": "3×5+2=?", "chain_of_thought": "先算乘法：3×5=15，再加2：15+2=17", "output": "17"}'
  },
  {
    id: 'knowledge-distillation',
    name: '知识蒸馏',
    description: '从大模型提取知识训练小模型，平衡性能与成本',
    icon: '⚗️',
    formats: ['Alpaca', 'ShareGPT'],
    multimodal: true,
    category: 'distillation',
    useCase: '模型压缩、边缘部署、成本优化',
    example: '基于GPT-4输出生成的训练数据，用于训练更小的模型'
  }
];

// 数据格式详细说明
const FORMAT_DETAILS = {
  'Alpaca': {
    name: 'Alpaca 格式',
    description: '斯坦福大学发布的经典指令微调格式，结构简洁，适合单轮任务',
    structure: 'instruction + input + output',
    advantages: ['结构简洁', '任务导向清晰', '社区支持广泛'],
    disadvantages: ['多轮对话需手动拼接', '缺乏工具调用支持'],
    bestFor: ['指令微调', '问答系统', '文本生成'],
    example: `{
  "instruction": "将下面的中文翻译成英文",
  "input": "你好，世界！",
  "output": "Hello, World!"
}`
  },
  'ShareGPT': {
    name: 'ShareGPT 格式', 
    description: '支持多轮对话和工具调用的格式，更接近真实交互场景',
    structure: 'conversations + tools + roles',
    advantages: ['支持多轮对话', '工具调用能力', '角色管理'],
    disadvantages: ['格式较复杂', '需遵循角色位置规则'],
    bestFor: ['对话系统', '工具调用', '多模态交互'],
    example: `{
  "conversations": [
    {"role": "user", "content": "今天天气怎么样？"},
    {"role": "assistant", "content": "我来帮您查询天气..."}
  ]
}`
  },
  'OpenAI': {
    name: 'OpenAI 格式',
    description: 'OpenAI API兼容格式，ShareGPT的简化版本',
    structure: 'messages + roles',
    advantages: ['API兼容', '简单易用', '广泛支持'],
    disadvantages: ['功能相对简单', '扩展性有限'],
    bestFor: ['API集成', '简单对话', '快速原型'],
    example: `{
  "messages": [
    {"role": "system", "content": "你是一个有用的助手"},
    {"role": "user", "content": "请介绍一下AI"},
    {"role": "assistant", "content": "AI是人工智能的缩写..."}
  ]
}`
  },
  'Alpaca-COT': {
    name: 'Alpaca-COT 格式',
    description: '带思维链的Alpaca格式，适用于推理任务训练',
    structure: 'instruction + input + chain_of_thought + output',
    advantages: ['支持推理过程', '逻辑清晰', '教学效果好'],
    disadvantages: ['数据构造复杂', '需要专业标注'],
    bestFor: ['数学推理', '逻辑分析', '步骤分解'],
    example: `{
  "instruction": "解这个数学题",
  "input": "如果一个正方形的边长是5cm，求面积",
  "chain_of_thought": "正方形面积公式是边长的平方，所以面积 = 5 × 5 = 25",
  "output": "25平方厘米"
}`
  },
  'CSV': {
    name: 'CSV 格式',
    description: '简单的表格格式，适合分类和标注任务',
    structure: 'text, label',
    advantages: ['简单直观', '易于编辑', '工具支持多'],
    disadvantages: ['功能有限', '不支持复杂结构'],
    bestFor: ['文本分类', '标签标注', '简单任务'],
    example: `text,label
"这个产品很好用",positive
"服务态度差",negative`
  }
};

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
  const [showFormatDetails, setShowFormatDetails] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<string | null>(null);

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

  const handleDatasetTypeChange = (typeId: string) => {
    setDatasetType(typeId);
    const type = DATASET_TYPES.find(t => t.id === typeId);
    if (type && type.formats.length > 0) {
      setOutputFormat(type.formats[0]);
    }
  };

  const handleFormatHelp = (formatName: string) => {
    setSelectedFormat(formatName);
    setShowFormatDetails(true);
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
      <div className="flex items-start justify-between max-w-4xl mx-auto">
        {steps.map((step, index) => (
          <div key={step.id} className="flex flex-col items-center flex-1">
            <div className="flex items-center w-full">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300 ${
                currentStep >= step.id 
                  ? 'bg-[#1977e5] border-[#1977e5] text-white shadow-lg' 
                  : 'border-[#d1dbe8] text-[#4f7096] hover:border-[#1977e5]'
              }`}>
                {currentStep > step.id ? (
                  <CheckCircleIcon className="w-6 h-6" />
                ) : (
                  <span className="text-sm font-bold">{step.id}</span>
                )}
              </div>
              {index < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-3 transition-all duration-300 ${
                  currentStep > step.id ? 'bg-[#1977e5]' : 'bg-[#d1dbe8]'
                }`} />
              )}
            </div>
            <div className="mt-3 text-center max-w-[140px]">
              <h3 className={`text-sm font-medium transition-colors duration-300 ${
                currentStep >= step.id ? 'text-[#1977e5]' : 'text-[#4f7096]'
              }`}>
                {step.name}
              </h3>
              <p className={`text-xs mt-1 transition-colors duration-300 ${
                currentStep === step.id ? 'text-[#4f7096]' : 'text-[#8fa3b8]'
              }`}>
                {step.description}
              </p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-8 text-center">
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 ${
          currentStep <= steps.length ? 'bg-[#f0f4f8] border border-[#1977e5]' : 'bg-green-50 border border-green-200'
        }`}>
          <div className={`w-2 h-2 rounded-full ${
            currentStep <= steps.length ? 'bg-[#1977e5]' : 'bg-green-500'
          }`} />
          <span className={`text-sm font-medium ${
            currentStep <= steps.length ? 'text-[#1977e5]' : 'text-green-700'
          }`}>
            {currentStep <= steps.length ? `步骤 ${currentStep} / ${steps.length}` : '完成'}
          </span>
        </div>
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
    <div className="space-y-6">
      {/* 教学指南 */}
      <Card className="border-[#e3f2fd] bg-[#f8fbff]">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <GraduationCapIcon className="w-6 h-6 text-[#1977e5]" />
            <h3 className="text-lg font-semibold text-[#0c141c]">微调数据集类型指南</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-start gap-2">
              <MessageSquareIcon className="w-4 h-4 text-[#1977e5] mt-0.5" />
              <div>
                <h4 className="font-medium text-[#0c141c] mb-1">监督微调</h4>
                <p className="text-[#4f7096]">通过标注数据直接教模型做事，适合有明确目标的任务</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <ZapIcon className="w-4 h-4 text-[#1977e5] mt-0.5" />
              <div>
                <h4 className="font-medium text-[#0c141c] mb-1">推理微调</h4>
                <p className="text-[#4f7096]">训练模型分步思考，适用于需要逻辑推理的复杂场景</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <BarChart3Icon className="w-4 h-4 text-[#1977e5] mt-0.5" />
              <div>
                <h4 className="font-medium text-[#0c141c] mb-1">知识蒸馏</h4>
                <p className="text-[#4f7096]">从大模型提取知识训练小模型，平衡性能与成本</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* 数据集类型选择 */}
      <Card className="border-[#d1dbe8]">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <BrainIcon className="w-6 h-6 text-[#1977e5]" />
            <h3 className="text-lg font-semibold text-[#0c141c]">选择数据集类型</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {DATASET_TYPES.map((type) => (
              <Card 
                key={type.id}
                className={`border-2 cursor-pointer transition-all hover:shadow-md ${
                  datasetType === type.id 
                    ? 'border-[#1977e5] bg-[#f0f4f8] shadow-lg' 
                    : 'border-[#d1dbe8] hover:border-[#1977e5]'
                }`}
                onClick={() => handleDatasetTypeChange(type.id)}
              >
                <div className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{type.icon}</span>
                    <h4 className="font-semibold text-[#0c141c]">{type.name}</h4>
                    <div className="flex gap-1">
                      {type.multimodal && (
                        <span className="px-2 py-1 bg-[#1977e5] text-white text-xs rounded-full">多模态</span>
                      )}
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        type.category === 'supervised' ? 'bg-green-100 text-green-700' :
                        type.category === 'reasoning' ? 'bg-purple-100 text-purple-700' :
                        'bg-orange-100 text-orange-700'
                      }`}>
                        {type.category === 'supervised' ? '监督' : 
                         type.category === 'reasoning' ? '推理' : '蒸馏'}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-[#4f7096] mb-3">{type.description}</p>
                  <div className="space-y-2">
                    <div>
                      <span className="text-xs font-medium text-[#4f7096]">应用场景：</span>
                      <p className="text-xs text-[#666] mt-1">{type.useCase}</p>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {type.formats.map((format) => (
                        <span key={format} className="px-2 py-1 bg-[#e8edf2] text-[#4f7096] text-xs rounded">
                          {format}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* 配置选项 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <label className="text-sm font-medium text-[#0c141c]">输出格式</label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-0 h-auto"
                  onClick={() => handleFormatHelp(outputFormat)}
                >
                  <HelpCircleIcon className="w-4 h-4 text-[#4f7096]" />
                </Button>
              </div>
              <div className="flex gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="flex-1 border-[#d1dbe8] justify-between">
                      {FORMAT_DETAILS[outputFormat as keyof typeof FORMAT_DETAILS]?.name || outputFormat}
                      <ChevronDownIcon className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-full">
                    {DATASET_TYPES.find(t => t.id === datasetType)?.formats.map((format) => (
                      <DropdownMenuItem key={format} onClick={() => setOutputFormat(format)}>
                        <div className="flex items-center justify-between w-full">
                          <span>{FORMAT_DETAILS[format as keyof typeof FORMAT_DETAILS]?.name || format}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-0 h-auto ml-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleFormatHelp(format);
                            }}
                          >
                            <InfoIcon className="w-3 h-3" />
                          </Button>
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {outputFormat && FORMAT_DETAILS[outputFormat as keyof typeof FORMAT_DETAILS] && (
                <p className="text-xs text-[#4f7096] mt-1">
                  {FORMAT_DETAILS[outputFormat as keyof typeof FORMAT_DETAILS].description}
                </p>
              )}
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
              rows={3}
            />
          </div>

          {/* 示例预览 */}
          {datasetType && (
            <div className="mt-6 p-4 bg-[#f8fbff] border border-[#e3f2fd] rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <BookOpenIcon className="w-4 h-4 text-[#1977e5]" />
                <span className="text-sm font-medium text-[#0c141c]">数据示例</span>
              </div>
              <pre className="text-xs text-[#4f7096] bg-white p-3 rounded border overflow-x-auto">
                {DATASET_TYPES.find(t => t.id === datasetType)?.example}
              </pre>
            </div>
          )}
        </div>
      </Card>

      {/* 格式详情Modal */}
      {showFormatDetails && selectedFormat && FORMAT_DETAILS[selectedFormat as keyof typeof FORMAT_DETAILS] && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto m-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-[#0c141c]">
                  {FORMAT_DETAILS[selectedFormat as keyof typeof FORMAT_DETAILS].name}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFormatDetails(false)}
                >
                  ✕
                </Button>
              </div>
              <div className="space-y-4">
                <p className="text-[#4f7096]">
                  {FORMAT_DETAILS[selectedFormat as keyof typeof FORMAT_DETAILS].description}
                </p>
                <div>
                  <h4 className="font-medium text-[#0c141c] mb-2">数据结构</h4>
                  <p className="text-sm text-[#4f7096]">
                    {FORMAT_DETAILS[selectedFormat as keyof typeof FORMAT_DETAILS].structure}
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-[#0c141c] mb-2">优势</h4>
                    <ul className="text-sm text-[#4f7096] space-y-1">
                      {FORMAT_DETAILS[selectedFormat as keyof typeof FORMAT_DETAILS].advantages.map((advantage, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <span className="w-1 h-1 bg-green-500 rounded-full" />
                          {advantage}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-[#0c141c] mb-2">局限性</h4>
                    <ul className="text-sm text-[#4f7096] space-y-1">
                      {FORMAT_DETAILS[selectedFormat as keyof typeof FORMAT_DETAILS].disadvantages.map((disadvantage, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <span className="w-1 h-1 bg-orange-500 rounded-full" />
                          {disadvantage}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-[#0c141c] mb-2">适用场景</h4>
                  <div className="flex flex-wrap gap-2">
                    {FORMAT_DETAILS[selectedFormat as keyof typeof FORMAT_DETAILS].bestFor.map((useCase, index) => (
                      <span key={index} className="px-2 py-1 bg-[#e8edf2] text-[#4f7096] text-xs rounded">
                        {useCase}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-[#0c141c] mb-2">格式示例</h4>
                  <pre className="text-xs text-[#4f7096] bg-[#f8fbff] p-3 rounded border overflow-x-auto">
                    {FORMAT_DETAILS[selectedFormat as keyof typeof FORMAT_DETAILS].example}
                  </pre>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
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
                  <span className="text-[#0c141c]">
                    {FORMAT_DETAILS[outputFormat as keyof typeof FORMAT_DETAILS]?.name || outputFormat}
                  </span>
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