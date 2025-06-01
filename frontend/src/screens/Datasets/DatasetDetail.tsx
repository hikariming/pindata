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
  DownloadIcon, 
  EyeIcon, 
  HeartIcon, 
  GitBranchIcon,
  FileTextIcon,
  TagIcon,
  CalendarIcon,
  UserIcon,
  HardDriveIcon,
  ChevronDownIcon,
  FolderIcon,
  FileIcon,
  ShareIcon,
  CodeIcon,
  HistoryIcon,
  PlayIcon
} from 'lucide-react';

interface DatasetFile {
  name: string;
  type: 'file' | 'folder';
  size?: string;
  lastModified: string;
}

interface DatasetVersion {
  id: string;
  version: string;
  commit: string;
  date: string;
  message: string;
  author: string;
}

interface DatasetSample {
  [key: string]: any;
}

export const DatasetDetail = (): JSX.Element => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState('preview');
  const [selectedVersion, setSelectedVersion] = useState('main');
  const [isLiked, setIsLiked] = useState(false);

  // Mock data
  const dataset = {
    id: id || '1',
    name: 'Mixture-of-Thoughts',
    owner: 'open-r1',
    description: 'A comprehensive dataset for training mixture of expert models with diverse reasoning capabilities.',
    lastUpdated: '5 days ago',
    created: '2024-01-15',
    size: '699MB',
    downloads: 11300,
    likes: 140,
    versions: 3,
    license: 'MIT',
    taskType: 'Natural Language Processing',
    tags: ['reasoning', 'mixture-of-experts', 'llm'],
    language: 'English',
    featured: true
  };

  const versions: DatasetVersion[] = [
    {
      id: '1',
      version: 'v1.2.0',
      commit: 'a1b2c3d',
      date: '2024-02-20',
      message: 'Add new reasoning examples and fix data quality issues',
      author: 'open-r1'
    },
    {
      id: '2',
      version: 'v1.1.0',
      commit: 'e4f5g6h',
      date: '2024-02-10',
      message: 'Improve data preprocessing and add metadata',
      author: 'open-r1'
    },
    {
      id: '3',
      version: 'v1.0.0',
      commit: 'i7j8k9l',
      date: '2024-01-15',
      message: 'Initial release',
      author: 'open-r1'
    }
  ];

  const files: DatasetFile[] = [
    { name: 'train.jsonl', type: 'file', size: '450MB', lastModified: '5 days ago' },
    { name: 'test.jsonl', type: 'file', size: '150MB', lastModified: '5 days ago' },
    { name: 'validation.jsonl', type: 'file', size: '99MB', lastModified: '5 days ago' },
    { name: 'README.md', type: 'file', size: '12KB', lastModified: '5 days ago' },
    { name: 'dataset_info.json', type: 'file', size: '2KB', lastModified: '5 days ago' },
    { name: 'scripts', type: 'folder', lastModified: '5 days ago' }
  ];

  const sampleData: DatasetSample[] = [
    {
      "instruction": "解释量子计算的基本原理",
      "input": "",
      "output": "量子计算是一种利用量子力学现象来处理信息的计算模式...",
      "reasoning_steps": ["理解量子比特的概念", "解释量子叠加态", "描述量子纠缠现象"],
      "difficulty": "medium"
    },
    {
      "instruction": "计算斐波那契数列的第10项",
      "input": "n=10",
      "output": "第10项的值是55",
      "reasoning_steps": ["理解斐波那契数列规律", "逐步计算到第10项", "验证结果"],
      "difficulty": "easy"
    },
    {
      "instruction": "分析人工智能的发展趋势",
      "input": "",
      "output": "人工智能的发展趋势包括更强的通用能力、更好的可解释性...",
      "reasoning_steps": ["回顾AI发展历史", "分析当前技术瓶颈", "预测未来发展方向"],
      "difficulty": "hard"
    }
  ];

  const readme = `# Mixture-of-Thoughts Dataset

## 概述

这是一个专门为训练混合专家模型设计的高质量推理数据集。数据集包含多种推理任务，每个样本都包含详细的推理步骤和思考过程。

## 数据格式

每个数据样本包含以下字段：

- \`instruction\`: 任务指令
- \`input\`: 输入内容（可选）
- \`output\`: 期望输出
- \`reasoning_steps\`: 推理步骤列表
- \`difficulty\`: 难度等级（easy/medium/hard）

## 数据统计

- 训练集：45,000 个样本
- 测试集：5,000 个样本
- 验证集：5,000 个样本
- 总计：55,000 个样本

## 使用方法

\`\`\`python
import json

# 加载数据
with open('train.jsonl', 'r', encoding='utf-8') as f:
    data = [json.loads(line) for line in f]

# 查看样本
print(data[0])
\`\`\`

## 许可证

本数据集使用 MIT 许可证。

## 引用

如果您使用了本数据集，请引用：

\`\`\`
@dataset{mixture_of_thoughts_2024,
  title={Mixture-of-Thoughts: A Comprehensive Reasoning Dataset},
  author={open-r1},
  year={2024},
  url={https://example.com/dataset}
}
\`\`\`
`;

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
  };

  const getTaskTypeColor = (taskType: string): string => {
    const colors: { [key: string]: string } = {
      'Natural Language Processing': 'bg-blue-100 text-blue-800',
      'Question Answering': 'bg-green-100 text-green-800',
      'Text Classification': 'bg-purple-100 text-purple-800',
      'Computer Vision': 'bg-orange-100 text-orange-800',
      'Audio': 'bg-pink-100 text-pink-800'
    };
    return colors[taskType] || 'bg-gray-100 text-gray-800';
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
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-4">
            <DatabaseIcon className="w-8 h-8 text-[#1977e5] mt-1" />
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-[#0c141c]">
                  {dataset.owner}/{dataset.name}
                </h1>
                {dataset.featured && (
                  <Badge className="bg-[#ff6b35] text-white">推荐</Badge>
                )}
              </div>
              <p className="text-[#4f7096] text-lg mb-4 max-w-3xl">
                {dataset.description}
              </p>
              
              {/* Tags */}
              <div className="flex items-center gap-2 mb-4">
                <Badge className={getTaskTypeColor(dataset.taskType)}>
                  {dataset.taskType}
                </Badge>
                {dataset.tags.map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>

              {/* Metadata */}
              <div className="flex items-center gap-6 text-sm text-[#4f7096]">
                <div className="flex items-center gap-1">
                  <CalendarIcon className="w-4 h-4" />
                  <span>更新于 {dataset.lastUpdated}</span>
                </div>
                <div className="flex items-center gap-1">
                  <HardDriveIcon className="w-4 h-4" />
                  <span>{dataset.size}</span>
                </div>
                <div className="flex items-center gap-1">
                  <DownloadIcon className="w-4 h-4" />
                  <span>{formatNumber(dataset.downloads)} 下载</span>
                </div>
                <div className="flex items-center gap-1">
                  <HeartIcon className="w-4 h-4" />
                  <span>{dataset.likes} 点赞</span>
                </div>
                <div className="flex items-center gap-1">
                  <TagIcon className="w-4 h-4" />
                  <span>{dataset.license}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="border-[#d1dbe8] flex items-center gap-2">
                  <GitBranchIcon className="w-4 h-4" />
                  <span>{selectedVersion}</span>
                  <ChevronDownIcon className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setSelectedVersion('main')}>
                  main
                </DropdownMenuItem>
                {versions.map((version) => (
                  <DropdownMenuItem 
                    key={version.id}
                    onClick={() => setSelectedVersion(version.version)}
                  >
                    {version.version}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button
              variant="outline"
              className={`border-[#d1dbe8] flex items-center gap-2 ${isLiked ? 'text-red-500' : ''}`}
              onClick={() => setIsLiked(!isLiked)}
            >
              <HeartIcon className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
              {isLiked ? '已收藏' : '收藏'}
            </Button>
            
            <Button variant="outline" className="border-[#d1dbe8] flex items-center gap-2">
              <ShareIcon className="w-4 h-4" />
              分享
            </Button>
            
            <Button className="bg-[#1977e5] hover:bg-[#1565c0] flex items-center gap-2">
              <DownloadIcon className="w-4 h-4" />
              下载数据集
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="preview">数据预览</TabsTrigger>
          <TabsTrigger value="files">文件浏览</TabsTrigger>
          <TabsTrigger value="readme">README</TabsTrigger>
          <TabsTrigger value="versions">版本历史</TabsTrigger>
          <TabsTrigger value="usage">使用示例</TabsTrigger>
        </TabsList>

        {/* Data Preview Tab */}
        <TabsContent value="preview" className="space-y-4">
          <Card className="border-[#d1dbe8]">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-[#0c141c]">数据样本预览</h3>
                <Badge variant="outline">显示前 3 个样本</Badge>
              </div>
              
              <div className="space-y-4">
                {sampleData.map((sample, index) => (
                  <Card key={index} className="border-[#e5e5e5]">
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-[#0c141c]">样本 #{index + 1}</h4>
                        <Badge variant="outline" className="text-xs">
                          {sample.difficulty}
                        </Badge>
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <span className="text-sm font-medium text-[#4f7096]">指令:</span>
                          <p className="text-sm text-[#0c141c] mt-1">{sample.instruction}</p>
                        </div>
                        
                        {sample.input && (
                          <div>
                            <span className="text-sm font-medium text-[#4f7096]">输入:</span>
                            <p className="text-sm text-[#0c141c] mt-1">{sample.input}</p>
                          </div>
                        )}
                        
                        <div>
                          <span className="text-sm font-medium text-[#4f7096]">输出:</span>
                          <p className="text-sm text-[#0c141c] mt-1">{sample.output}</p>
                        </div>
                        
                        <div>
                          <span className="text-sm font-medium text-[#4f7096]">推理步骤:</span>
                          <ul className="text-sm text-[#0c141c] mt-1 list-disc list-inside">
                            {sample.reasoning_steps.map((step: string, i: number) => (
                              <li key={i}>{step}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
              
              <div className="flex justify-center mt-6">
                <Button variant="outline" className="border-[#d1dbe8]">
                  <PlayIcon className="w-4 h-4 mr-2" />
                  在数据查看器中打开
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Files Tab */}
        <TabsContent value="files" className="space-y-4">
          <Card className="border-[#d1dbe8]">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-[#0c141c] mb-4">文件结构</h3>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>名称</TableHead>
                    <TableHead>大小</TableHead>
                    <TableHead>最后修改</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {files.map((file, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {file.type === 'folder' ? (
                            <FolderIcon className="w-4 h-4 text-[#4f7096]" />
                          ) : (
                            <FileIcon className="w-4 h-4 text-[#4f7096]" />
                          )}
                          <span className="font-medium">{file.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-[#4f7096]">
                        {file.size || '-'}
                      </TableCell>
                      <TableCell className="text-[#4f7096]">
                        {file.lastModified}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" className="h-7 px-2">
                            <EyeIcon className="w-3 h-3" />
                          </Button>
                          <Button variant="outline" size="sm" className="h-7 px-2">
                            <DownloadIcon className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* README Tab */}
        <TabsContent value="readme" className="space-y-4">
          <Card className="border-[#d1dbe8]">
            <div className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <FileTextIcon className="w-5 h-5 text-[#1977e5]" />
                <h3 className="text-lg font-semibold text-[#0c141c]">README.md</h3>
              </div>
              
              <div className="prose prose-sm max-w-none">
                <pre className="whitespace-pre-wrap text-sm text-[#0c141c] leading-relaxed">
                  {readme}
                </pre>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Versions Tab */}
        <TabsContent value="versions" className="space-y-4">
          <Card className="border-[#d1dbe8]">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-[#0c141c]">版本历史</h3>
                <Badge variant="secondary">{versions.length} 个版本</Badge>
              </div>
              
              <div className="space-y-4">
                {versions.map((version, index) => (
                  <div key={version.id} className="border-l-2 border-[#1977e5] pl-4 pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">{version.version}</Badge>
                        <span className="text-sm text-[#4f7096]">#{version.commit}</span>
                        <span className="text-sm text-[#4f7096]">{version.date}</span>
                        <span className="text-sm text-[#4f7096]">by {version.author}</span>
                      </div>
                      <Button variant="outline" size="sm" className="h-7">
                        <DownloadIcon className="w-3 h-3 mr-1" />
                        下载
                      </Button>
                    </div>
                    <p className="text-sm text-[#0c141c] mt-2">{version.message}</p>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Usage Tab */}
        <TabsContent value="usage" className="space-y-4">
          <Card className="border-[#d1dbe8]">
            <div className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <CodeIcon className="w-5 h-5 text-[#1977e5]" />
                <h3 className="text-lg font-semibold text-[#0c141c]">使用示例</h3>
              </div>
              
              <div className="space-y-6">
                <div>
                  <h4 className="font-medium text-[#0c141c] mb-2">Python 使用示例</h4>
                  <Card className="border-[#e5e5e5] bg-[#f8f9fa]">
                    <div className="p-4">
                      <pre className="text-sm text-[#0c141c] overflow-x-auto">
{`import json
from datasets import load_dataset

# 方法1: 从本地加载
with open('train.jsonl', 'r', encoding='utf-8') as f:
    data = [json.loads(line) for line in f]

# 方法2: 使用 datasets 库
dataset = load_dataset('json', data_files='train.jsonl')

# 查看数据结构
print(f"数据集大小: {len(data)}")
print(f"样本示例: {data[0]}")

# 数据预处理示例
def preprocess_sample(sample):
    # 拼接指令和输入
    if sample['input']:
        text = f"指令: {sample['instruction']}\\n输入: {sample['input']}"
    else:
        text = f"指令: {sample['instruction']}"
    
    return {
        'text': text,
        'output': sample['output'],
        'reasoning': sample['reasoning_steps']
    }

processed_data = [preprocess_sample(sample) for sample in data]`}
                      </pre>
                    </div>
                  </Card>
                </div>

                <div>
                  <h4 className="font-medium text-[#0c141c] mb-2">API 调用示例</h4>
                  <Card className="border-[#e5e5e5] bg-[#f8f9fa]">
                    <div className="p-4">
                      <pre className="text-sm text-[#0c141c] overflow-x-auto">
{`import requests

# 下载数据集
url = "https://api.example.com/datasets/mixture-of-thoughts/download"
headers = {"Authorization": "Bearer YOUR_API_KEY"}

response = requests.get(url, headers=headers)
if response.status_code == 200:
    with open("dataset.zip", "wb") as f:
        f.write(response.content)
    print("数据集下载完成")
else:
    print(f"下载失败: {response.status_code}")`}
                      </pre>
                    </div>
                  </Card>
                </div>

                <div>
                  <h4 className="font-medium text-[#0c141c] mb-2">训练示例</h4>
                  <Card className="border-[#e5e5e5] bg-[#f8f9fa]">
                    <div className="p-4">
                      <pre className="text-sm text-[#0c141c] overflow-x-auto">
{`from transformers import AutoTokenizer, AutoModelForCausalLM, Trainer, TrainingArguments

# 加载模型和分词器
model_name = "your-base-model"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForCausalLM.from_pretrained(model_name)

# 数据处理
def tokenize_function(examples):
    inputs = tokenizer(
        examples['text'],
        truncation=True,
        padding=True,
        max_length=512
    )
    inputs['labels'] = tokenizer(
        examples['output'],
        truncation=True,
        padding=True,
        max_length=512
    )['input_ids']
    return inputs

# 训练配置
training_args = TrainingArguments(
    output_dir="./results",
    num_train_epochs=3,
    per_device_train_batch_size=8,
    per_device_eval_batch_size=8,
    warmup_steps=500,
    weight_decay=0.01,
    logging_dir="./logs",
)

# 开始训练
trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=train_dataset,
    eval_dataset=eval_dataset,
)

trainer.train()`}
                      </pre>
                    </div>
                  </Card>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}; 