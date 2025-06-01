import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { 
  ArrowLeftIcon,
  DatabaseIcon, 
  UploadIcon, 
  GlobeIcon, 
  BrainIcon,
  ChevronDownIcon,
  FileIcon,
  FolderIcon,
  PlayIcon,
  SettingsIcon,
  CheckIcon,
  AlertCircleIcon,
  InfoIcon
} from 'lucide-react';

interface FileItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  size?: string;
  selected: boolean;
}

interface ExtractionTask {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  sourceFiles: string[];
  outputFormat: string;
}

export const CreateDataset = (): JSX.Element => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('extract');
  const [datasetName, setDatasetName] = useState('');
  const [description, setDescription] = useState('');
  const [license, setLicense] = useState('MIT');
  const [taskType, setTaskType] = useState('Natural Language Processing');
  const [tags, setTags] = useState('');
  
  // 文件提取相关状态
  const [selectedFiles, setSelectedFiles] = useState<FileItem[]>([]);
  const [extractionPrompt, setExtractionPrompt] = useState('');
  const [outputFormat, setOutputFormat] = useState('jsonl');
  const [modelName, setModelName] = useState('gpt-4');
  
  // 网络下载相关状态
  const [downloadUrl, setDownloadUrl] = useState('');
  const [downloadStatus, setDownloadStatus] = useState<'idle' | 'downloading' | 'completed' | 'failed'>('idle');
  
  // 模型蒸馏相关状态
  const [sourceModel, setSourceModel] = useState('');
  const [distillationPrompts, setDistillationPrompts] = useState('');
  const [sampleCount, setSampleCount] = useState(1000);

  // Mock数据 - 可用的原始文件
  const availableFiles: FileItem[] = [
    { id: '1', name: 'documents', type: 'folder', selected: false },
    { id: '2', name: 'research_papers.pdf', type: 'file', size: '150MB', selected: false },
    { id: '3', name: 'interview_transcripts.txt', type: 'file', size: '25MB', selected: false },
    { id: '4', name: 'product_reviews.csv', type: 'file', size: '80MB', selected: false },
    { id: '5', name: 'knowledge_base', type: 'folder', selected: false },
    { id: '6', name: 'training_logs.json', type: 'file', size: '120MB', selected: false }
  ];

  const [files, setFiles] = useState<FileItem[]>(availableFiles);

  const toggleFileSelection = (fileId: string) => {
    setFiles(files.map(file => 
      file.id === fileId ? { ...file, selected: !file.selected } : file
    ));
  };

  const handleCreateDataset = () => {
    console.log('Creating dataset:', {
      name: datasetName,
      description,
      license,
      taskType,
      tags: tags.split(',').map(tag => tag.trim()),
      method: activeTab,
      config: {
        selectedFiles: files.filter(f => f.selected),
        extractionPrompt,
        outputFormat,
        modelName,
        downloadUrl,
        sourceModel,
        distillationPrompts,
        sampleCount
      }
    });
  };

  return (
    <div className="w-full max-w-[1200px] p-6">
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
          <DatabaseIcon className="w-8 h-8 text-[#1977e5]" />
          <h1 className="text-2xl font-bold text-[#0c141c]">创建数据集</h1>
        </div>
        <p className="text-[#4f7096] text-lg max-w-3xl">
          通过多种方式创建高质量的数据集：从原始文件中提取、下载互联网数据集或通过大模型蒸馏生成。
        </p>
      </div>

      {/* 基本信息 */}
      <Card className="border-[#d1dbe8] mb-6">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-[#0c141c] mb-4">基本信息</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#0c141c] mb-2">
                数据集名称 *
              </label>
              <Input
                className="border-[#d1dbe8]"
                placeholder="输入数据集名称..."
                value={datasetName}
                onChange={(e) => setDatasetName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#0c141c] mb-2">
                许可证
              </label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full border-[#d1dbe8] justify-between">
                    {license}
                    <ChevronDownIcon className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-full">
                  <DropdownMenuItem onClick={() => setLicense('MIT')}>MIT</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLicense('Apache 2.0')}>Apache 2.0</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLicense('CC BY 4.0')}>CC BY 4.0</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLicense('CC BY-SA 4.0')}>CC BY-SA 4.0</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#0c141c] mb-2">
                任务类型
              </label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full border-[#d1dbe8] justify-between">
                    {taskType}
                    <ChevronDownIcon className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-full">
                  <DropdownMenuItem onClick={() => setTaskType('Natural Language Processing')}>
                    自然语言处理
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTaskType('Question Answering')}>
                    问答系统
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTaskType('Text Classification')}>
                    文本分类
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTaskType('Computer Vision')}>
                    计算机视觉
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#0c141c] mb-2">
                标签
              </label>
              <Input
                className="border-[#d1dbe8]"
                placeholder="用逗号分隔标签..."
                value={tags}
                onChange={(e) => setTags(e.target.value)}
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-[#0c141c] mb-2">
              描述 *
            </label>
            <Textarea
              className="border-[#d1dbe8] min-h-[100px]"
              placeholder="描述您的数据集内容、用途和特点..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* 数据来源选择 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="extract" className="flex items-center gap-2">
            <FileIcon className="w-4 h-4" />
            文件提取
          </TabsTrigger>
          <TabsTrigger value="download" className="flex items-center gap-2">
            <GlobeIcon className="w-4 h-4" />
            网络下载
          </TabsTrigger>
          <TabsTrigger value="distill" className="flex items-center gap-2">
            <BrainIcon className="w-4 h-4" />
            模型蒸馏
          </TabsTrigger>
        </TabsList>

        {/* 文件提取 */}
        <TabsContent value="extract" className="space-y-6">
          <Card className="border-[#d1dbe8]">
            <div className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <FileIcon className="w-5 h-5 text-[#1977e5]" />
                <h3 className="text-lg font-semibold text-[#0c141c]">从原始文件提取</h3>
              </div>
              
              <div className="space-y-6">
                <div>
                  <h4 className="font-medium text-[#0c141c] mb-3">选择源文件</h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto border border-[#d1dbe8] rounded-lg p-3">
                    {files.map((file) => (
                      <div 
                        key={file.id}
                        className={`flex items-center justify-between p-2 rounded cursor-pointer hover:bg-[#f0f4f8] ${
                          file.selected ? 'bg-[#e3f2fd]' : ''
                        }`}
                        onClick={() => toggleFileSelection(file.id)}
                      >
                        <div className="flex items-center gap-2">
                          {file.selected && <CheckIcon className="w-4 h-4 text-[#1977e5]" />}
                          {file.type === 'folder' ? (
                            <FolderIcon className="w-4 h-4 text-[#4f7096]" />
                          ) : (
                            <FileIcon className="w-4 h-4 text-[#4f7096]" />
                          )}
                          <span className="font-medium">{file.name}</span>
                        </div>
                        {file.size && (
                          <span className="text-sm text-[#4f7096]">{file.size}</span>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-[#4f7096] mt-2">
                    已选择 {files.filter(f => f.selected).length} 个文件/文件夹
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#0c141c] mb-2">
                      提取模型
                    </label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full border-[#d1dbe8] justify-between">
                          {modelName}
                          <ChevronDownIcon className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-full">
                        <DropdownMenuItem onClick={() => setModelName('gpt-4')}>GPT-4</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setModelName('gpt-3.5-turbo')}>GPT-3.5 Turbo</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setModelName('claude-3')}>Claude-3</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setModelName('gemini-pro')}>Gemini Pro</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#0c141c] mb-2">
                      输出格式
                    </label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full border-[#d1dbe8] justify-between">
                          {outputFormat.toUpperCase()}
                          <ChevronDownIcon className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-full">
                        <DropdownMenuItem onClick={() => setOutputFormat('jsonl')}>JSONL</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setOutputFormat('csv')}>CSV</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setOutputFormat('parquet')}>Parquet</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#0c141c] mb-2">
                    提取指令
                  </label>
                  <Textarea
                    className="border-[#d1dbe8] min-h-[120px]"
                    placeholder="描述您希望如何从文件中提取数据，例如：
从文档中提取问答对，问题应该基于文档内容，答案要准确详细。
格式要求：{'question': '问题', 'answer': '答案', 'context': '相关上下文'}

或者：
提取文档中的关键信息，包括实体、关系和事件。
输出格式：{'entity': '实体名', 'type': '实体类型', 'relation': '关系', 'confidence': 0.95}"
                    value={extractionPrompt}
                    onChange={(e) => setExtractionPrompt(e.target.value)}
                  />
                </div>

                <div className="bg-[#f0f4f8] border border-[#d1dbe8] rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <InfoIcon className="w-5 h-5 text-[#1977e5] mt-0.5" />
                    <div>
                      <h5 className="font-medium text-[#0c141c] mb-1">提取流程说明</h5>
                      <ul className="text-sm text-[#4f7096] space-y-1">
                        <li>• 系统将使用所选模型分析您的文件内容</li>
                        <li>• 根据提取指令生成结构化数据</li>
                        <li>• 自动进行质量检查和数据清洗</li>
                        <li>• 生成数据统计报告和样本预览</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* 网络下载 */}
        <TabsContent value="download" className="space-y-6">
          <Card className="border-[#d1dbe8]">
            <div className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <GlobeIcon className="w-5 h-5 text-[#1977e5]" />
                <h3 className="text-lg font-semibold text-[#0c141c]">从网络下载数据集</h3>
              </div>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-[#0c141c] mb-2">
                    数据集URL
                  </label>
                  <Input
                    className="border-[#d1dbe8]"
                    placeholder="输入数据集下载链接 (支持 Hugging Face, GitHub, Kaggle 等)"
                    value={downloadUrl}
                    onChange={(e) => setDownloadUrl(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Card className="border-[#e5e5e5] p-4">
                    <h4 className="font-medium text-[#0c141c] mb-2">支持的平台</h4>
                    <ul className="text-sm text-[#4f7096] space-y-1">
                      <li>• Hugging Face Datasets</li>
                      <li>• GitHub 仓库</li>
                      <li>• Kaggle 数据集</li>
                      <li>• 直接文件下载链接</li>
                    </ul>
                  </Card>
                  <Card className="border-[#e5e5e5] p-4">
                    <h4 className="font-medium text-[#0c141c] mb-2">示例链接</h4>
                    <ul className="text-sm text-[#4f7096] space-y-1">
                      <li>• https://huggingface.co/datasets/squad</li>
                      <li>• https://github.com/user/dataset</li>
                      <li>• https://kaggle.com/datasets/...</li>
                      <li>• https://example.com/data.zip</li>
                    </ul>
                  </Card>
                </div>

                {downloadUrl && (
                  <div className="bg-[#f0f4f8] border border-[#d1dbe8] rounded-lg p-4">
                    <h5 className="font-medium text-[#0c141c] mb-2">预检查结果</h5>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <CheckIcon className="w-4 h-4 text-green-600" />
                        <span>链接可访问</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckIcon className="w-4 h-4 text-green-600" />
                        <span>文件格式支持</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <AlertCircleIcon className="w-4 h-4 text-orange-500" />
                        <span>预估大小：~150MB</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* 模型蒸馏 */}
        <TabsContent value="distill" className="space-y-6">
          <Card className="border-[#d1dbe8]">
            <div className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <BrainIcon className="w-5 h-5 text-[#1977e5]" />
                <h3 className="text-lg font-semibold text-[#0c141c]">通过模型蒸馏生成</h3>
              </div>
              
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#0c141c] mb-2">
                      源模型
                    </label>
                    <Input
                      className="border-[#d1dbe8]"
                      placeholder="输入模型名称或API端点"
                      value={sourceModel}
                      onChange={(e) => setSourceModel(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#0c141c] mb-2">
                      样本数量
                    </label>
                    <Input
                      type="number"
                      className="border-[#d1dbe8]"
                      placeholder="1000"
                      value={sampleCount}
                      onChange={(e) => setSampleCount(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#0c141c] mb-2">
                    蒸馏提示词
                  </label>
                  <Textarea
                    className="border-[#d1dbe8] min-h-[150px]"
                    placeholder="描述您希望生成的数据类型和格式，例如：

生成高质量的数学问题解答数据集，包含：
1. 从简单算术到高等数学的各种题目
2. 详细的解题步骤和推理过程
3. 多种解法和验证方法

输出格式：
{
  'problem': '数学问题描述',
  'solution': '详细解答过程',
  'difficulty': '难度等级(1-10)',
  'topics': ['相关数学概念']
}"
                    value={distillationPrompts}
                    onChange={(e) => setDistillationPrompts(e.target.value)}
                  />
                </div>

                <div className="bg-[#f0f4f8] border border-[#d1dbe8] rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <InfoIcon className="w-5 h-5 text-[#1977e5] mt-0.5" />
                    <div>
                      <h5 className="font-medium text-[#0c141c] mb-1">蒸馏流程说明</h5>
                      <ul className="text-sm text-[#4f7096] space-y-1">
                        <li>• 使用指定的源模型生成多样化的数据样本</li>
                        <li>• 自动进行质量过滤和去重</li>
                        <li>• 确保生成数据的多样性和一致性</li>
                        <li>• 提供详细的生成统计和质量报告</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 操作按钮 */}
      <div className="flex items-center justify-between mt-8">
        <div className="text-sm text-[#4f7096]">
          * 必填字段
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="border-[#d1dbe8]">
            保存草稿
          </Button>
          <Button 
            className="bg-[#1977e5] hover:bg-[#1565c0] flex items-center gap-2"
            onClick={handleCreateDataset}
            disabled={!datasetName || !description}
          >
            <PlayIcon className="w-4 h-4" />
            开始创建
          </Button>
        </div>
      </div>
    </div>
  );
}; 