import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { 
  ArrowLeftIcon,
  DatabaseIcon, 
  ChevronDownIcon,
  FolderPlusIcon,
  InfoIcon,
  Loader2Icon,
  AlertCircleIcon,
  CheckCircleIcon
} from 'lucide-react';
import { datasetService } from '../../services/dataset.service';
import { CreateDatasetRequest } from '../../types/dataset';

export const CreateDataset = (): JSX.Element => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  // 表单状态
  const [datasetName, setDatasetName] = useState('');
  const [owner, setOwner] = useState('');
  const [description, setDescription] = useState('');
  const [license, setLicense] = useState('MIT');
  const [taskType, setTaskType] = useState('Natural Language Processing');
  const [tags, setTags] = useState('');
  
  // UI状态
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleCreateDataset = async () => {
    if (!datasetName.trim() || !description.trim() || !owner.trim()) {
      setError('数据集名称、拥有者和描述为必填项');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const createRequest: CreateDatasetRequest = {
        name: datasetName.trim(),
        owner: owner.trim(),
        description: description.trim(),
        license,
        task_type: taskType,
        language: 'Chinese', // 默认中文，后续可以添加语言选择
        featured: false,
        tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
      };

      const newDataset = await datasetService.createDataset(createRequest);
      
      setSuccess(true);
      
      // 显示成功消息后跳转到数据集详情页
      setTimeout(() => {
        navigate(`/datasets/${newDataset.id}`);
      }, 1500);
      
    } catch (err: any) {
      console.error('创建数据集失败:', err);
      setError(err.message || '创建数据集时发生错误，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  // 如果创建成功，显示成功页面
  if (success) {
    return (
      <div className="w-full max-w-[800px] p-6">
        <Card className="border-[#d1dbe8]">
          <div className="p-8 text-center">
            <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-[#0c141c] mb-2">数据集创建成功！</h2>
            <p className="text-[#4f7096] mb-4">正在跳转到数据集详情页...</p>
            <div className="flex items-center justify-center gap-2">
              <Loader2Icon className="w-4 h-4 animate-spin" />
              <span className="text-sm text-[#4f7096]">加载中...</span>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[800px] p-6">
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
          创建一个新的空数据集目录，您可以稍后上传和管理数据文件。
        </p>
      </div>

      {/* 错误提示 */}
      {error && (
        <Card className="border-red-200 bg-red-50 mb-6">
          <div className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircleIcon className="w-5 h-5 text-red-500" />
              <span className="text-red-700 font-medium">创建失败</span>
            </div>
            <p className="text-red-600 mt-1">{error}</p>
          </div>
        </Card>
      )}

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
                disabled={isLoading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#0c141c] mb-2">
                拥有者 *
              </label>
              <Input
                className="border-[#d1dbe8]"
                placeholder="输入拥有者用户名或组织名..."
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                disabled={isLoading}
              />
              <p className="text-xs text-[#4f7096] mt-1">拥有者和数据集名称的组合必须唯一</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#0c141c] mb-2">
                许可证
              </label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-full border-[#d1dbe8] justify-between"
                    disabled={isLoading}
                  >
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
                  <Button 
                    variant="outline" 
                    className="w-full border-[#d1dbe8] justify-between"
                    disabled={isLoading}
                  >
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
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-[#0c141c] mb-2">
              标签
            </label>
            <Input
              className="border-[#d1dbe8]"
              placeholder="用逗号分隔标签，如：nlp, 中文, 问答..."
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              disabled={isLoading}
            />
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
              disabled={isLoading}
            />
          </div>
        </div>
      </Card>

      {/* 创建说明 */}
      <Card className="border-[#d1dbe8] mb-6">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <FolderPlusIcon className="w-5 h-5 text-[#1977e5]" />
            <h3 className="text-lg font-semibold text-[#0c141c]">创建空数据集</h3>
          </div>
          
          <div className="bg-[#f0f4f8] border border-[#d1dbe8] rounded-lg p-4">
            <div className="flex items-start gap-2">
              <InfoIcon className="w-5 h-5 text-[#1977e5] mt-0.5" />
              <div>
                <h5 className="font-medium text-[#0c141c] mb-1">创建说明</h5>
                <ul className="text-sm text-[#4f7096] space-y-1">
                  <li>• 系统将为您创建一个新的空数据集目录</li>
                  <li>• 拥有者可以是个人用户名或组织名称，将作为数据集的命名空间</li>
                  <li>• 您可以稍后通过文件管理界面上传数据文件</li>
                  <li>• 支持多种格式：JSON、CSV、Parquet、TXT等</li>
                  <li>• 创建后可以随时编辑数据集的基本信息</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* 操作按钮 */}
      <div className="flex items-center justify-between mt-8">
        <div className="text-sm text-[#4f7096]">
          * 必填字段
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            className="border-[#d1dbe8]"
            disabled={isLoading}
          >
            保存草稿
          </Button>
          <Button 
            className="bg-[#1977e5] hover:bg-[#1565c0] flex items-center gap-2"
            onClick={handleCreateDataset}
            disabled={!datasetName.trim() || !description.trim() || !owner.trim() || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2Icon className="w-4 h-4 animate-spin" />
                创建中...
              </>
            ) : (
              <>
                <FolderPlusIcon className="w-4 h-4" />
                创建数据集
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}; 