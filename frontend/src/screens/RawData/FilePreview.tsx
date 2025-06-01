import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { 
  ArrowLeftIcon,
  FileTextIcon,
  DownloadIcon,
  EditIcon,
  TrashIcon,
  RefreshCwIcon,
  PlayIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  ClockIcon,
  EyeIcon,
  SettingsIcon,
  CopyIcon,
  FileIcon,
  FileSpreadsheetIcon,
  PresentationIcon,
  ImageIcon,
  ZapIcon,
  BrainIcon,
  FileSearchIcon
} from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';

interface FileDetail {
  id: string;
  name: string;
  type: string;
  size: string;
  sizeBytes: number;
  uploadDate: string;
  lastModified: string;
  status: 'pending' | 'processing' | 'processed' | 'error';
  conversionProgress?: number;
  errorMessage?: string;
  quality: 'high' | 'medium' | 'low';
  pageCount?: number;
  wordCount?: number;
  characterCount?: number;
  mdPath?: string;
  originalPath: string;
  extractedText?: string;
  mdContent?: string;
  libraryId: string;
  libraryName: string;
  tags: string[];
  metadata: {
    author?: string;
    title?: string;
    subject?: string;
    creator?: string;
    creationDate?: string;
    language?: string;
  };
  conversionSettings: {
    outputFormat: 'markdown' | 'plain_text';
    preserveFormatting: boolean;
    extractImages: boolean;
    extractTables: boolean;
  };
}

export const FilePreview = (): JSX.Element => {
  const { fileId } = useParams();
  const navigate = useNavigate();
  const [file, setFile] = useState<FileDetail | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [editName, setEditName] = useState('');

  // 模拟数据
  useEffect(() => {
    // 模拟API调用
    const mockFile: FileDetail = {
      id: fileId || '1',
      name: 'AI研究论文合集.pdf',
      type: 'PDF',
      size: '2.5 MB',
      sizeBytes: 2621440,
      uploadDate: '2024-03-15 14:30:25',
      lastModified: '2024-03-15 14:30:25',
      status: 'processed',
      quality: 'high',
      pageCount: 45,
      wordCount: 12580,
      characterCount: 75490,
      mdPath: '/md/ai-research.md',
      originalPath: '/uploads/ai-research.pdf',
      libraryId: '1',
      libraryName: '研究论文库',
      tags: ['AI', '机器学习', '深度学习', '论文'],
      metadata: {
        author: 'Multiple Authors',
        title: 'AI Research Papers Collection',
        subject: 'Artificial Intelligence',
        creator: 'PDF Creator',
        creationDate: '2024-03-01',
        language: 'zh-CN'
      },
      conversionSettings: {
        outputFormat: 'markdown',
        preserveFormatting: true,
        extractImages: true,
        extractTables: true
      },
      extractedText: `# AI研究论文合集

## 摘要
本文档包含了人工智能领域的最新研究论文合集，涵盖了机器学习、深度学习、自然语言处理等多个方向的前沿研究成果。

## 主要内容
1. 深度学习算法优化
2. 自然语言处理新进展  
3. 计算机视觉应用
4. 强化学习理论
5. AI伦理与安全

这些论文为理解当前AI技术发展趋势提供了重要参考...`,
      mdContent: `# AI研究论文合集

## 摘要
本文档包含了人工智能领域的最新研究论文合集，涵盖了机器学习、深度学习、自然语言处理等多个方向的前沿研究成果。

## 主要内容

### 1. 深度学习算法优化
- **卷积神经网络改进**: 提出了新的卷积核设计方法
- **注意力机制**: 多头注意力机制在图像识别中的应用
- **优化算法**: Adam优化器的改进版本

### 2. 自然语言处理新进展
- **Transformer架构**: BERT和GPT模型的对比分析
- **多语言模型**: 跨语言理解能力的提升
- **文本生成**: 基于预训练模型的文本生成技术

### 3. 计算机视觉应用
- **目标检测**: YOLO算法的最新改进
- **图像分割**: 语义分割和实例分割技术
- **3D视觉**: 深度估计和3D重建

### 4. 强化学习理论
- **策略梯度方法**: PPO和SAC算法比较
- **价值函数估计**: Q-learning的改进
- **多智能体学习**: 合作与竞争环境下的学习策略

### 5. AI伦理与安全
- **算法公平性**: 减少AI系统中的偏见
- **隐私保护**: 联邦学习和差分隐私
- **对抗攻击**: 深度学习模型的鲁棒性

## 结论
这些研究成果展示了AI技术的快速发展，为未来的研究方向提供了重要指导。特别是在模型效率、泛化能力和安全性方面的进展，将推动AI技术在更多领域的应用。

## 参考文献
1. Attention Is All You Need (Transformer)
2. BERT: Pre-training of Deep Bidirectional Transformers
3. GPT-3: Language Models are Few-Shot Learners
4. ResNet: Deep Residual Learning for Image Recognition
5. YOLO: Real-Time Object Detection`
    };
    
    setFile(mockFile);
    setEditName(mockFile.name);
  }, [fileId]);

  const getFileIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'pdf':
        return <FileTextIcon className="w-8 h-8 text-red-500" />;
      case 'docx':
      case 'doc':
        return <FileTextIcon className="w-8 h-8 text-blue-500" />;
      case 'xlsx':
      case 'xls':
        return <FileSpreadsheetIcon className="w-8 h-8 text-green-500" />;
      case 'pptx':
      case 'ppt':
        return <PresentationIcon className="w-8 h-8 text-orange-500" />;
      case 'png':
      case 'jpg':
      case 'jpeg':
        return <ImageIcon className="w-8 h-8 text-purple-500" />;
      default:
        return <FileIcon className="w-8 h-8 text-gray-500" />;
    }
  };

  const getStatusColor = (status: FileDetail['status']) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'processing':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'processed':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200';
    }
  };

  const getStatusLabel = (status: FileDetail['status']) => {
    switch (status) {
      case 'pending':
        return '等待处理';
      case 'processing':
        return '处理中';
      case 'processed':
        return '已完成';
      case 'error':
        return '失败';
    }
  };

  const getQualityColor = (quality: FileDetail['quality']) => {
    switch (quality) {
      case 'high':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low':
        return 'text-red-600 bg-red-50 border-red-200';
    }
  };

  const getQualityLabel = (quality: FileDetail['quality']) => {
    switch (quality) {
      case 'high':
        return '高质量';
      case 'medium':
        return '中等质量';
      case 'low':
        return '低质量';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleReprocess = () => {
    setIsProcessing(true);
    console.log('重新处理文件:', file?.id);
    // 模拟处理过程
    setTimeout(() => {
      setIsProcessing(false);
    }, 3000);
  };

  const handleSaveName = () => {
    if (file && editName.trim()) {
      setFile({ ...file, name: editName.trim() });
      setIsEditing(false);
    }
  };

  const handleDelete = () => {
    if (window.confirm('确定要删除这个文件吗？此操作不可恢复。')) {
      console.log('删除文件:', file?.id);
      navigate(`/rawdata`);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // 这里可以添加一个toast提示
  };

  if (!file) {
    return (
      <div className="w-full max-w-[1400px] p-6">
        <div className="text-center">加载中...</div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1400px] p-6">
      {/* 顶部导航 */}
      <div className="flex items-center mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate(`/rawdata`)}
          className="text-[#4f7096] hover:text-[#0c141c] hover:bg-[#e8edf2]"
        >
          <ArrowLeftIcon className="w-4 h-4 mr-2" />
          返回数据库
        </Button>
        <div className="mx-2 text-[#4f7096]">/</div>
        <Button
          variant="ghost"
          onClick={() => navigate(`/rawdata`)}
          className="text-[#4f7096] hover:text-[#0c141c]"
        >
          {file.libraryName}
        </Button>
        <div className="mx-2 text-[#4f7096]">/</div>
        <span className="text-[#0c141c] font-medium">文件详情</span>
      </div>

      {/* 文件基本信息 */}
      <Card className="border-[#d1dbe8] bg-white p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start">
            {getFileIcon(file.type)}
            <div className="ml-4 flex-1">
              <div className="flex items-center mb-2">
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="text-xl font-bold border-[#d1dbe8] focus:border-[#1977e5]"
                    />
                    <Button size="sm" onClick={handleSaveName}>保存</Button>
                    <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>取消</Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold text-[#0c141c]">{file.name}</h1>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditing(true)}
                      className="text-[#4f7096] hover:text-[#0c141c]"
                    >
                      <EditIcon className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
              
              <div className="flex flex-wrap gap-4 text-sm text-[#4f7096] mb-3">
                <span>{file.type} • {file.size}</span>
                {file.pageCount && <span>{file.pageCount} 页</span>}
                {file.wordCount && <span>{file.wordCount.toLocaleString()} 词</span>}
                <span>上传于 {file.uploadDate}</span>
              </div>

              <div className="flex flex-wrap gap-2 mb-3">
                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(file.status)}`}>
                  {getStatusLabel(file.status)}
                </span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getQualityColor(file.quality)}`}>
                  {getQualityLabel(file.quality)}
                </span>
                {file.tags.map((tag, index) => (
                  <span 
                    key={index}
                    className="px-2 py-1 text-xs bg-[#e8edf2] text-[#4f7096] rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            {file.status === 'processed' && file.mdPath && (
              <Button className="bg-[#1977e5] hover:bg-[#1977e5]/90">
                <DownloadIcon className="w-4 h-4 mr-2" />
                下载MD
              </Button>
            )}
            {(file.status === 'error' || file.status === 'pending') && (
              <Button 
                variant="outline"
                onClick={handleReprocess}
                disabled={isProcessing}
                className="border-[#1977e5] text-[#1977e5]"
              >
                {isProcessing ? (
                  <RefreshCwIcon className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <PlayIcon className="w-4 h-4 mr-2" />
                )}
                {isProcessing ? '处理中...' : '重新处理'}
              </Button>
            )}
            <Button variant="outline" className="border-[#d1dbe8]">
              <DownloadIcon className="w-4 h-4 mr-2" />
              下载原文件
            </Button>
            <Button 
              variant="outline" 
              onClick={handleDelete}
              className="border-[#d1dbe8] text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <TrashIcon className="w-4 h-4 mr-2" />
              删除
            </Button>
          </div>
        </div>

        {file.status === 'processing' && file.conversionProgress && (
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-[#4f7096]">转换进度</span>
              <span className="text-[#0c141c] font-medium">{file.conversionProgress}%</span>
            </div>
            <div className="w-full bg-[#e8edf2] rounded-full h-2">
              <div 
                className="bg-[#1977e5] h-2 rounded-full transition-all duration-300" 
                style={{ width: `${file.conversionProgress}%` }}
              ></div>
            </div>
          </div>
        )}

        {file.status === 'error' && file.errorMessage && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center text-red-700">
              <AlertCircleIcon className="w-5 h-5 mr-2" />
              <span className="font-medium">处理失败</span>
            </div>
            <div className="text-sm text-red-600 mt-1">{file.errorMessage}</div>
          </div>
        )}
      </Card>

      {/* 详细信息标签页 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start mb-6">
          <TabsTrigger value="overview">概览</TabsTrigger>
          <TabsTrigger value="content">内容预览</TabsTrigger>
          <TabsTrigger value="markdown">Markdown</TabsTrigger>
          <TabsTrigger value="metadata">元数据</TabsTrigger>
          <TabsTrigger value="settings">转换设置</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 统计信息 */}
            <Card className="border-[#d1dbe8] bg-white p-6">
              <h3 className="font-semibold text-[#0c141c] mb-4 flex items-center">
                <FileSearchIcon className="w-5 h-5 mr-2" />
                文件统计
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-[#4f7096]">文件大小</span>
                  <span className="text-[#0c141c] font-medium">{file.size}</span>
                </div>
                {file.pageCount && (
                  <div className="flex justify-between">
                    <span className="text-[#4f7096]">页数</span>
                    <span className="text-[#0c141c] font-medium">{file.pageCount}</span>
                  </div>
                )}
                {file.wordCount && (
                  <div className="flex justify-between">
                    <span className="text-[#4f7096]">词数</span>
                    <span className="text-[#0c141c] font-medium">{file.wordCount.toLocaleString()}</span>
                  </div>
                )}
                {file.characterCount && (
                  <div className="flex justify-between">
                    <span className="text-[#4f7096]">字符数</span>
                    <span className="text-[#0c141c] font-medium">{file.characterCount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-[#4f7096]">文件类型</span>
                  <span className="text-[#0c141c] font-medium">{file.type}</span>
                </div>
              </div>
            </Card>

            {/* 处理信息 */}
            <Card className="border-[#d1dbe8] bg-white p-6">
              <h3 className="font-semibold text-[#0c141c] mb-4 flex items-center">
                <ZapIcon className="w-5 h-5 mr-2" />
                处理信息
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-[#4f7096]">处理状态</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(file.status)}`}>
                    {getStatusLabel(file.status)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#4f7096]">质量评估</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium border ${getQualityColor(file.quality)}`}>
                    {getQualityLabel(file.quality)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#4f7096]">输出格式</span>
                  <span className="text-[#0c141c] font-medium">
                    {file.conversionSettings.outputFormat === 'markdown' ? 'Markdown' : '纯文本'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#4f7096]">上传时间</span>
                  <span className="text-[#0c141c] font-medium">{file.uploadDate}</span>
                </div>
              </div>
            </Card>

            {/* 训练数据价值 */}
            <Card className="border-[#d1dbe8] bg-white p-6">
              <h3 className="font-semibold text-[#0c141c] mb-4 flex items-center">
                <BrainIcon className="w-5 h-5 mr-2" />
                训练价值评估
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-[#4f7096]">内容完整性</span>
                  <span className="text-green-600 font-medium">优秀</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#4f7096]">格式规范性</span>
                  <span className="text-green-600 font-medium">良好</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#4f7096]">语言质量</span>
                  <span className="text-green-600 font-medium">高</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#4f7096]">信息密度</span>
                  <span className="text-yellow-600 font-medium">中等</span>
                </div>
                <div className="pt-2 border-t border-[#e8edf2]">
                  <div className="flex justify-between">
                    <span className="text-[#4f7096] font-medium">综合评分</span>
                    <span className="text-[#1977e5] font-bold">8.5/10</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="content">
          <Card className="border-[#d1dbe8] bg-white p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-[#0c141c]">原文内容预览</h3>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => copyToClipboard(file.extractedText || '')}
              >
                <CopyIcon className="w-4 h-4 mr-2" />
                复制文本
              </Button>
            </div>
            <div className="bg-[#f7f9fc] border border-[#e8edf2] rounded-lg p-4 max-h-96 overflow-auto">
              <pre className="whitespace-pre-wrap text-sm text-[#0c141c] font-mono">
                {file.extractedText || '正在提取文本内容...'}
              </pre>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="markdown">
          {file.status === 'processed' && file.mdContent ? (
            <Card className="border-[#d1dbe8] bg-white p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-[#0c141c]">Markdown 内容</h3>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => copyToClipboard(file.mdContent || '')}
                  >
                    <CopyIcon className="w-4 h-4 mr-2" />
                    复制
                  </Button>
                  <Button size="sm" className="bg-[#1977e5] hover:bg-[#1977e5]/90">
                    <DownloadIcon className="w-4 h-4 mr-2" />
                    下载
                  </Button>
                </div>
              </div>
              <div className="bg-[#f7f9fc] border border-[#e8edf2] rounded-lg p-4 max-h-96 overflow-auto">
                <pre className="whitespace-pre-wrap text-sm text-[#0c141c] font-mono">
                  {file.mdContent}
                </pre>
              </div>
            </Card>
          ) : (
            <Card className="border-[#d1dbe8] bg-white p-6">
              <div className="text-center py-8">
                <ClockIcon className="w-12 h-12 text-[#4f7096] mx-auto mb-4" />
                <h3 className="text-lg font-medium text-[#0c141c] mb-2">Markdown 内容不可用</h3>
                <p className="text-[#4f7096]">
                  {file.status === 'pending' && '文件还未开始处理'}
                  {file.status === 'processing' && '正在转换为 Markdown 格式...'}
                  {file.status === 'error' && '转换失败，请重试'}
                </p>
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="metadata">
          <Card className="border-[#d1dbe8] bg-white p-6">
            <h3 className="font-semibold text-[#0c141c] mb-4">文件元数据</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-[#4f7096]">标题</label>
                  <div className="text-[#0c141c]">{file.metadata.title || '未知'}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-[#4f7096]">作者</label>
                  <div className="text-[#0c141c]">{file.metadata.author || '未知'}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-[#4f7096]">主题</label>
                  <div className="text-[#0c141c]">{file.metadata.subject || '未知'}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-[#4f7096]">创建者</label>
                  <div className="text-[#0c141c]">{file.metadata.creator || '未知'}</div>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-[#4f7096]">创建日期</label>
                  <div className="text-[#0c141c]">{file.metadata.creationDate || '未知'}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-[#4f7096]">语言</label>
                  <div className="text-[#0c141c]">{file.metadata.language || '未知'}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-[#4f7096]">最后修改</label>
                  <div className="text-[#0c141c]">{file.lastModified}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-[#4f7096]">文件路径</label>
                  <div className="text-[#0c141c] text-sm font-mono break-all">{file.originalPath}</div>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card className="border-[#d1dbe8] bg-white p-6">
            <h3 className="font-semibold text-[#0c141c] mb-4">转换设置</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-[#0c141c] mb-2 block">输出格式</label>
                <select 
                  value={file.conversionSettings.outputFormat}
                  className="w-full px-3 py-2 border border-[#d1dbe8] rounded-md focus:border-[#1977e5] focus:outline-none bg-white"
                  disabled
                >
                  <option value="markdown">Markdown (.md)</option>
                  <option value="plain_text">纯文本 (.txt)</option>
                </select>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <input 
                    type="checkbox"
                    checked={file.conversionSettings.preserveFormatting}
                    disabled
                    className="w-4 h-4 text-[#1977e5] border-[#d1dbe8] rounded focus:ring-[#1977e5]"
                  />
                  <label className="text-sm text-[#0c141c]">保留原始格式</label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <input 
                    type="checkbox"
                    checked={file.conversionSettings.extractImages}
                    disabled
                    className="w-4 h-4 text-[#1977e5] border-[#d1dbe8] rounded focus:ring-[#1977e5]"
                  />
                  <label className="text-sm text-[#0c141c]">提取图片内容</label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <input 
                    type="checkbox"
                    checked={file.conversionSettings.extractTables}
                    disabled
                    className="w-4 h-4 text-[#1977e5] border-[#d1dbe8] rounded focus:ring-[#1977e5]"
                  />
                  <label className="text-sm text-[#0c141c]">提取表格数据</label>
                </div>
              </div>
              
              <div className="pt-4 border-t border-[#e8edf2]">
                <Button 
                  variant="outline"
                  onClick={handleReprocess}
                  disabled={isProcessing}
                  className="border-[#1977e5] text-[#1977e5]"
                >
                  <SettingsIcon className="w-4 h-4 mr-2" />
                  使用新设置重新处理
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}; 