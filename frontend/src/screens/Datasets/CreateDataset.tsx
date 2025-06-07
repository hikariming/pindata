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
  CheckCircleIcon,
  CloudDownloadIcon,
  ExternalLinkIcon,
  ArrowRightIcon
} from 'lucide-react';
import { datasetService } from '../../services/dataset.service';
import { CreateDatasetRequest } from '../../types/dataset';

type CreateMethod = 'empty' | 'huggingface' | 'modelscope' | null;

// 数据集创建成功组件
interface DatasetCreationSuccessProps {
  createMethod: CreateMethod;
}

const DatasetCreationSuccess: React.FC<DatasetCreationSuccessProps> = ({ createMethod }) => {
  const navigate = useNavigate();

  if (createMethod === 'empty') {
    // 空数据集创建成功，直接跳转
    setTimeout(() => {
      navigate('/datasets');
    }, 1500);

    return (
      <div className="w-full max-w-[800px] p-6">
        <Card className="border-[#d1dbe8]">
          <div className="p-8 text-center">
            <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-[#0c141c] mb-2">数据集创建成功！</h2>
            <p className="text-[#4f7096] mb-4">正在跳转到数据集列表...</p>
            <div className="flex items-center justify-center gap-2">
              <Loader2Icon className="w-4 h-4 animate-spin" />
              <span className="text-sm text-[#4f7096]">加载中...</span>
            </div>
          </div>
        </Card>
      </div>
    );
  } else {
    // 导入数据集，显示导入进度提示
    return (
      <div className="w-full max-w-[800px] p-6">
        <Card className="border-[#d1dbe8]">
          <div className="p-8 text-center">
            <CloudDownloadIcon className="w-16 h-16 text-blue-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-[#0c141c] mb-2">导入任务已启动！</h2>
            <p className="text-[#4f7096] mb-4">
              数据集正在从{createMethod === 'huggingface' ? 'Hugging Face' : '魔搭社区'}导入，
              您可以在任务管理页面查看进度。
            </p>
            <div className="flex items-center justify-center gap-3 mt-6">
              <Button 
                variant="outline" 
                className="border-[#d1dbe8]"
                onClick={() => navigate('/tasks')}
              >
                查看任务进度
              </Button>
              <Button 
                className="bg-[#1977e5] hover:bg-[#1565c0]"
                onClick={() => navigate('/datasets')}
              >
                返回数据集列表
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }
};

export const CreateDataset = (): JSX.Element => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  // 创建方式状态
  const [createMethod, setCreateMethod] = useState<CreateMethod>(null);
  
  // 表单状态
  const [datasetName, setDatasetName] = useState('');
  const [owner, setOwner] = useState('');
  const [description, setDescription] = useState('');
  const [license, setLicense] = useState('MIT');
  const [taskType, setTaskType] = useState('Natural Language Processing');
  const [tags, setTags] = useState('');
  
  // 导入相关状态
  const [importUrl, setImportUrl] = useState('');
  
  // UI状态
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleCreateDataset = async () => {
    // 空数据集需要填写基本信息
    if (createMethod === 'empty') {
      if (!datasetName.trim() || !description.trim() || !owner.trim()) {
        setError('数据集名称、拥有者和描述为必填项');
        return;
      }
    }

    // 导入数据集需要URL
    if ((createMethod === 'huggingface' || createMethod === 'modelscope') && !importUrl.trim()) {
      setError('请提供有效的导入URL或路径');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const createRequest: CreateDatasetRequest = {
        name: createMethod === 'empty' ? datasetName.trim() : '', // 导入时从源获取
        owner: createMethod === 'empty' ? owner.trim() : '',
        description: createMethod === 'empty' ? description.trim() : '',
        license: createMethod === 'empty' ? license : '',
        task_type: createMethod === 'empty' ? taskType : '',
        language: 'Chinese',
        featured: false,
        tags: createMethod === 'empty' ? tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0) : [],
        // 添加导入相关字段
        ...(createMethod !== 'empty' && createMethod && {
          import_method: createMethod as 'huggingface' | 'modelscope',
          import_url: importUrl.trim()
        })
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
    return <DatasetCreationSuccess createMethod={createMethod} />;
  }

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
          <DatabaseIcon className="w-8 h-8 text-[#1977e5]" />
          <h1 className="text-2xl font-bold text-[#0c141c]">创建数据集</h1>
        </div>
        <p className="text-[#4f7096] text-lg max-w-3xl">
          选择您想要的数据集创建方式，然后填写相关信息。
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

      {/* 创建方式选择 */}
      <Card className="border-[#d1dbe8] mb-6">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-[#0c141c] mb-4">选择创建方式</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 方式1: 创建空数据集 */}
            <div 
              className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                createMethod === 'empty' 
                  ? 'border-[#1977e5] bg-[#f0f7ff]' 
                  : 'border-[#d1dbe8] hover:border-[#1977e5]'
              }`}
              onClick={() => setCreateMethod('empty')}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  createMethod === 'empty' ? 'bg-[#1977e5]' : 'bg-[#e3f2fd]'
                }`}>
                  <FolderPlusIcon className={`w-5 h-5 ${
                    createMethod === 'empty' ? 'text-white' : 'text-[#1977e5]'
                  }`} />
                </div>
                {createMethod === 'empty' && (
                  <div className="w-2 h-2 bg-[#1977e5] rounded-full"></div>
                )}
              </div>
              <h3 className="font-semibold text-[#0c141c] mb-2">创建空数据集</h3>
              <p className="text-[#4f7096] text-sm">
                创建一个新的空数据集目录，您可以稍后上传和管理数据文件。
              </p>
            </div>

            {/* 方式2: 从Hugging Face导入 */}
            <div 
              className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                createMethod === 'huggingface' 
                  ? 'border-[#ff6b35] bg-[#fff9f7]' 
                  : 'border-[#d1dbe8] hover:border-[#ff6b35]'
              }`}
              onClick={() => setCreateMethod('huggingface')}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  createMethod === 'huggingface' ? 'bg-[#ff6b35]' : 'bg-[#fff3f0]'
                }`}>
                  <CloudDownloadIcon className={`w-5 h-5 ${
                    createMethod === 'huggingface' ? 'text-white' : 'text-[#ff6b35]'
                  }`} />
                </div>
                {createMethod === 'huggingface' && (
                  <div className="w-2 h-2 bg-[#ff6b35] rounded-full"></div>
                )}
              </div>
              <h3 className="font-semibold text-[#0c141c] mb-2">Hugging Face 导入</h3>
              <p className="text-[#4f7096] text-sm">
                从 Hugging Face Hub 导入现有数据集，支持URL或数据集路径。
              </p>
            </div>

            {/* 方式3: 从魔搭社区导入 */}
            <div 
              className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                createMethod === 'modelscope' 
                  ? 'border-[#7c3aed] bg-[#faf9ff]' 
                  : 'border-[#d1dbe8] hover:border-[#7c3aed]'
              }`}
              onClick={() => setCreateMethod('modelscope')}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  createMethod === 'modelscope' ? 'bg-[#7c3aed]' : 'bg-[#f3f0ff]'
                }`}>
                  <CloudDownloadIcon className={`w-5 h-5 ${
                    createMethod === 'modelscope' ? 'text-white' : 'text-[#7c3aed]'
                  }`} />
                </div>
                {createMethod === 'modelscope' && (
                  <div className="w-2 h-2 bg-[#7c3aed] rounded-full"></div>
                )}
              </div>
              <h3 className="font-semibold text-[#0c141c] mb-2">魔搭社区导入</h3>
              <p className="text-[#4f7096] text-sm">
                从魔搭社区导入中文优化的数据集，专注于中文AI应用场景。
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* 根据选择的方式显示对应的表单 */}
      {createMethod && (
        <>
          {/* 导入URL输入（仅导入方式显示） */}
          {(createMethod === 'huggingface' || createMethod === 'modelscope') && (
            <Card className="border-[#d1dbe8] mb-6">
              <div className="p-6">
                <h2 className="text-lg font-semibold text-[#0c141c] mb-4">
                  {createMethod === 'huggingface' ? 'Hugging Face' : '魔搭社区'} 数据集导入
                </h2>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-[#0c141c]">
                      数据集URL或路径 *
                    </label>
                    <a
                      href={createMethod === 'huggingface' ? 'https://huggingface.co/datasets/' : 'https://www.modelscope.cn/datasets'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-sm text-[#1977e5] hover:text-[#1565c0] hover:underline transition-colors"
                    >
                      <span>访问 {createMethod === 'huggingface' ? 'Hugging Face' : '魔搭社区'}</span>
                      <ExternalLinkIcon className="w-3 h-3" />
                    </a>
                  </div>
                  <Input
                    className="border-[#d1dbe8]"
                    placeholder={
                      createMethod === 'huggingface' 
                        ? "例如: squad 或 https://huggingface.co/datasets/squad" 
                        : "例如: open-r1/Mixture-of-Thoughts 或完整URL"
                    }
                    value={importUrl}
                    onChange={(e) => setImportUrl(e.target.value)}
                    disabled={isLoading}
                  />
                  <p className="text-xs text-[#4f7096] mt-1">
                    {createMethod === 'huggingface' 
                      ? "支持数据集名称（如 open-r1/Mixture-of-Thoughts"
                      : "支持路径格式（如 open-r1/Mixture-of-Thoughts）或完整URL，系统将自动获取数据集信息"
                    }
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* 基本信息（仅创建空数据集时显示） */}
          {createMethod === 'empty' && (
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
          )}

          {/* 创建说明 */}
          <Card className="border-[#d1dbe8] mb-6">
            <div className="p-6">
              <div className="flex items-center gap-2 mb-4">
                {createMethod === 'empty' && <FolderPlusIcon className="w-5 h-5 text-[#1977e5]" />}
                {createMethod === 'huggingface' && <CloudDownloadIcon className="w-5 h-5 text-[#ff6b35]" />}
                {createMethod === 'modelscope' && <CloudDownloadIcon className="w-5 h-5 text-[#7c3aed]" />}
                <h3 className="text-lg font-semibold text-[#0c141c]">
                  {createMethod === 'empty' && '创建空数据集'}
                  {createMethod === 'huggingface' && 'Hugging Face 导入'}
                  {createMethod === 'modelscope' && '魔搭社区导入'}
                </h3>
              </div>
              
              <div className="bg-[#f0f4f8] border border-[#d1dbe8] rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <InfoIcon className="w-5 h-5 text-[#1977e5] mt-0.5" />
                  <div>
                    <h5 className="font-medium text-[#0c141c] mb-1">
                      {createMethod === 'empty' && '创建说明'}
                      {createMethod === 'huggingface' && '导入说明'}
                      {createMethod === 'modelscope' && '导入说明'}
                    </h5>
                    <ul className="text-sm text-[#4f7096] space-y-1">
                      {createMethod === 'empty' && (
                        <>
                          <li>• 系统将为您创建一个新的空数据集目录</li>
                          <li>• 您可以稍后通过文件管理界面上传数据文件</li>
                          <li>• 支持多种格式：JSON、CSV、Parquet、TXT等</li>
                        </>
                      )}
                      {createMethod === 'huggingface' && (
                        <>
                          <li>• 系统将从Hugging Face Hub下载指定数据集</li>
                          <li>• 数据集信息（名称、描述等）将自动从源获取</li>
                          <li>• 导入过程可能需要几分钟，取决于数据集大小</li>
                        </>
                      )}
                      {createMethod === 'modelscope' && (
                        <>
                          <li>• 系统将从魔搭社区下载指定数据集</li>
                          <li>• 数据集信息（名称、描述等）将自动从源获取</li>
                          <li>• 导入过程可能需要几分钟，取决于数据集大小</li>
                        </>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* 操作按钮 */}
          <div className="flex items-center justify-end gap-3">
            <Button 
              variant="outline" 
              className="border-[#d1dbe8]"
              onClick={() => setCreateMethod(null)}
              disabled={isLoading}
            >
              重新选择
            </Button>
            <Button 
              className="bg-[#1977e5] hover:bg-[#1565c0] flex items-center gap-2"
              onClick={handleCreateDataset}
              disabled={
                !createMethod ||
                (createMethod === 'empty' && (!datasetName.trim() || !description.trim() || !owner.trim())) ||
                ((createMethod === 'huggingface' || createMethod === 'modelscope') && !importUrl.trim()) ||
                isLoading
              }
            >
              {isLoading ? (
                <>
                  <Loader2Icon className="w-4 h-4 animate-spin" />
                  {createMethod === 'empty' ? '创建中...' : '导入中...'}
                </>
              ) : (
                <>
                  {createMethod === 'empty' && <FolderPlusIcon className="w-4 h-4" />}
                  {(createMethod === 'huggingface' || createMethod === 'modelscope') && <CloudDownloadIcon className="w-4 h-4" />}
                  {createMethod === 'empty' ? '创建数据集' : '导入数据集'}
                </>
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}; 