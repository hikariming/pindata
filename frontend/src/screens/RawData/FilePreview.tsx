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
  CheckCircleIcon,
  AlertCircleIcon,
  ClockIcon,
  EyeIcon,
  CopyIcon,
  FileIcon,
  FileSpreadsheetIcon,
  PresentationIcon,
  ImageIcon,
  ZapIcon,
  BrainIcon,
  FileSearchIcon,
  Loader2Icon
} from 'lucide-react';
import { Input } from '../../components/ui/input';
import { fileService, libraryService } from '../../services';
import { LibraryFile } from '../../types/library';

export const FilePreview = (): JSX.Element => {
  const { libraryId, fileId } = useParams();
  const navigate = useNavigate();
  const [file, setFile] = useState<LibraryFile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [editName, setEditName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markdownContent, setMarkdownContent] = useState<string>('');
  const [loadingMarkdown, setLoadingMarkdown] = useState(false);
  const [originalContent, setOriginalContent] = useState<string>('');
  const [loadingOriginal, setLoadingOriginal] = useState(false);

  // 获取文件详情
  useEffect(() => {
    if (fileId && libraryId) {
      fetchFileDetails();
    } else {
      setLoading(false);
      setError('文件ID或库ID缺失，无法加载文件详情。');
    }
  }, [fileId, libraryId]);

  const fetchFileDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const fileData = await fileService.getFileDetail(libraryId!, fileId!);
      setFile(fileData);
      setEditName(fileData.filename);
      
      // 如果有转换后的文件，预加载markdown内容
      if (fileData.converted_object_name && fileData.process_status === 'completed') {
        loadMarkdownContent(fileData.converted_object_name);
      }
    } catch (err) {
      console.error('获取文件详情失败:', err);
      setError('获取文件详情失败');
    } finally {
      setLoading(false);
    }
  };

  const loadMarkdownContent = async (objectName: string) => {
    try {
      setLoadingMarkdown(true);
      const content = await fileService.getMarkdownContent(objectName);
      setMarkdownContent(content);
    } catch (err) {
      console.error('获取Markdown内容失败:', err);
      setMarkdownContent('获取Markdown内容失败');
    } finally {
      setLoadingMarkdown(false);
    }
  };

  const loadOriginalContent = async (objectName: string) => {
    try {
      setLoadingOriginal(true);
      const content = await fileService.getFileContent(objectName);
      setOriginalContent(content);
    } catch (err) {
      console.error('获取原始内容失败:', err);
      setOriginalContent('无法预览此文件类型的内容');
    } finally {
      setLoadingOriginal(false);
    }
  };

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'processing':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'completed':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'failed':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return '等待处理';
      case 'processing':
        return '处理中';
      case 'completed':
        return '已完成';
      case 'failed':
        return '失败';
      default:
        return '未知';
    }
  };

  const getQualityScore = (file: LibraryFile) => {
    // 基于文件大小、字数等计算质量评分
    let score = 5; // 基础分
    
    if (file.word_count && file.word_count > 1000) score += 2;
    if (file.word_count && file.word_count > 5000) score += 1;
    if (file.page_count && file.page_count > 10) score += 1;
    if (file.process_status === 'completed') score += 1;
    
    return Math.min(score, 10);
  };

  const handleSaveName = async () => {
    if (file && editName.trim() && editName.trim() !== file.filename) {
      try {
        const updatedFile = await fileService.updateFileName(libraryId!, fileId!, editName.trim());
        setFile(updatedFile);
        setIsEditing(false);
      } catch (err) {
        console.error('更新文件名失败:', err);
      }
    } else {
      setIsEditing(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('确定要删除这个文件吗？此操作不可恢复。')) {
      try {
        await fileService.deleteFile(libraryId!, fileId!);
        navigate(`/rawdata`);
      } catch (err) {
        console.error('删除文件失败:', err);
      }
    }
  };

  const handleDownloadMarkdown = async () => {
    if (file?.converted_object_name) {
      try {
        const filename = `${file.filename.replace(/\.[^/.]+$/, '')}.md`;
        await fileService.downloadMarkdownFile(file.converted_object_name, filename);
      } catch (err) {
        console.error('下载Markdown文件失败:', err);
      }
    }
  };

  const handleDownloadOriginal = async () => {
    if (file?.minio_object_name) {
      try {
        await libraryService.downloadFile(file.minio_object_name, file.original_filename);
      } catch (err) {
        console.error('下载原始文件失败:', err);
      }
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // 可以添加toast提示
  };

  // 处理标签页切换
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    
    // 懒加载内容
    if (tab === 'content' && !originalContent && file?.minio_object_name) {
      loadOriginalContent(file.minio_object_name);
    } else if (tab === 'markdown' && !markdownContent && file?.converted_object_name) {
      loadMarkdownContent(file.converted_object_name);
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-[1400px] p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2Icon className="w-8 h-8 animate-spin text-[#1977e5]" />
        </div>
      </div>
    );
  }

  if (error || !file) {
    return (
      <div className="w-full max-w-[1400px] p-6">
        <div className="text-center">
          <div className="text-red-600 mb-4">{error || '文件不存在'}</div>
          <Button onClick={() => navigate('/rawdata')} variant="outline">
            返回数据库
          </Button>
        </div>
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
        <span className="text-[#0c141c] font-medium">文件详情</span>
      </div>

      {/* 文件基本信息 */}
      <Card className="border-[#d1dbe8] bg-white p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start">
            {getFileIcon(file.file_type)}
            <div className="ml-4 flex-1">
              <div className="flex items-center mb-2">
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="text-xl font-bold border-[#d1dbe8] focus:border-[#1977e5]"
                      onKeyPress={(e) => e.key === 'Enter' && handleSaveName()}
                    />
                    <Button size="sm" onClick={handleSaveName}>保存</Button>
                    <Button size="sm" variant="outline" onClick={() => {
                      setIsEditing(false);
                      setEditName(file.filename);
                    }}>取消</Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold text-[#0c141c]">{file.filename}</h1>
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
                <span>{file.file_type.toUpperCase()} • {file.file_size_human}</span>
                {file.page_count && <span>{file.page_count} 页</span>}
                {file.word_count && <span>{file.word_count.toLocaleString()} 词</span>}
                <span>上传于 {new Date(file.uploaded_at).toLocaleString('zh-CN')}</span>
              </div>

              <div className="flex flex-wrap gap-2 mb-3">
                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(file.process_status)}`}>
                  {getStatusLabel(file.process_status)}
                </span>
                {file.process_status === 'completed' && (
                  <span className="px-3 py-1 rounded-full text-sm font-medium border text-green-600 bg-green-50 border-green-200">
                    质量评分: {getQualityScore(file)}/10
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            {file.process_status === 'completed' && file.converted_object_name && (
              <Button 
                className="bg-[#1977e5] hover:bg-[#1977e5]/90"
                onClick={handleDownloadMarkdown}
              >
                <DownloadIcon className="w-4 h-4 mr-2" />
                下载MD
              </Button>
            )}
            <Button variant="outline" className="border-[#d1dbe8]" onClick={handleDownloadOriginal}>
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

        {file.process_status === 'failed' && file.conversion_error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center text-red-700">
              <AlertCircleIcon className="w-5 h-5 mr-2" />
              <span className="font-medium">处理失败</span>
            </div>
            <div className="text-sm text-red-600 mt-1">{file.conversion_error}</div>
          </div>
        )}
      </Card>

      {/* 详细信息标签页 */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="w-full justify-start mb-6">
          <TabsTrigger value="overview">概览</TabsTrigger>
          <TabsTrigger value="content">内容预览</TabsTrigger>
          <TabsTrigger 
            value="markdown" 
            disabled={!file.converted_object_name || file.process_status !== 'completed'}
          >
            Markdown
          </TabsTrigger>
          <TabsTrigger value="metadata">元数据</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 文件统计 */}
            <Card className="border-[#d1dbe8] bg-white p-6">
              <h3 className="font-semibold text-[#0c141c] mb-4 flex items-center">
                <FileSearchIcon className="w-5 h-5 mr-2" />
                文件统计
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-[#4f7096]">文件大小</span>
                  <span className="text-[#0c141c] font-medium">{file.file_size_human}</span>
                </div>
                {file.page_count && (
                  <div className="flex justify-between">
                    <span className="text-[#4f7096]">页数</span>
                    <span className="text-[#0c141c] font-medium">{file.page_count}</span>
                  </div>
                )}
                {file.word_count && (
                  <div className="flex justify-between">
                    <span className="text-[#4f7096]">词数</span>
                    <span className="text-[#0c141c] font-medium">{file.word_count.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-[#4f7096]">文件类型</span>
                  <span className="text-[#0c141c] font-medium">{file.file_type.toUpperCase()}</span>
                </div>
                {file.language && (
                  <div className="flex justify-between">
                    <span className="text-[#4f7096]">语言</span>
                    <span className="text-[#0c141c] font-medium">{file.language}</span>
                  </div>
                )}
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
                  <span className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(file.process_status)}`}>
                    {getStatusLabel(file.process_status)}
                  </span>
                </div>
                {file.converted_format && (
                  <div className="flex justify-between">
                    <span className="text-[#4f7096]">输出格式</span>
                    <span className="text-[#0c141c] font-medium">
                      {file.converted_format === 'markdown' ? 'Markdown' : file.converted_format}
                    </span>
                  </div>
                )}
                {file.conversion_method && (
                  <div className="flex justify-between">
                    <span className="text-[#4f7096]">转换方法</span>
                    <span className="text-[#0c141c] font-medium">{file.conversion_method}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-[#4f7096]">上传时间</span>
                  <span className="text-[#0c141c] font-medium">
                    {new Date(file.uploaded_at).toLocaleDateString('zh-CN')}
                  </span>
                </div>
                {file.processed_at && (
                  <div className="flex justify-between">
                    <span className="text-[#4f7096]">处理时间</span>
                    <span className="text-[#0c141c] font-medium">
                      {new Date(file.processed_at).toLocaleDateString('zh-CN')}
                    </span>
                  </div>
                )}
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
                  <span className="text-green-600 font-medium">
                    {file.process_status === 'completed' ? '优秀' : '待评估'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#4f7096]">格式规范性</span>
                  <span className="text-green-600 font-medium">
                    {file.converted_format ? '良好' : '待处理'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#4f7096]">信息密度</span>
                  <span className="text-yellow-600 font-medium">
                    {file.word_count && file.word_count > 1000 ? '高' : '中等'}
                  </span>
                </div>
                <div className="pt-2 border-t border-[#e8edf2]">
                  <div className="flex justify-between">
                    <span className="text-[#4f7096] font-medium">综合评分</span>
                    <span className="text-[#1977e5] font-bold">{getQualityScore(file)}/10</span>
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
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => file.minio_object_name && loadOriginalContent(file.minio_object_name)}
                  disabled={loadingOriginal}
                >
                  <RefreshCwIcon className={`w-4 h-4 mr-2 ${loadingOriginal ? 'animate-spin' : ''}`} />
                  刷新
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => copyToClipboard(originalContent)}
                  disabled={!originalContent}
                >
                  <CopyIcon className="w-4 h-4 mr-2" />
                  复制文本
                </Button>
              </div>
            </div>
            <div className="bg-[#f7f9fc] border border-[#e8edf2] rounded-lg p-4 max-h-96 overflow-auto">
              {loadingOriginal ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2Icon className="w-6 h-6 animate-spin text-[#1977e5]" />
                </div>
              ) : (
                <pre className="whitespace-pre-wrap text-sm text-[#0c141c] font-mono">
                  {originalContent || '点击刷新加载内容...'}
                </pre>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="markdown">
          {file.process_status === 'completed' && file.converted_object_name ? (
            <Card className="border-[#d1dbe8] bg-white p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-[#0c141c]">Markdown 内容</h3>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => loadMarkdownContent(file.converted_object_name!)}
                    disabled={loadingMarkdown}
                  >
                    <RefreshCwIcon className={`w-4 h-4 mr-2 ${loadingMarkdown ? 'animate-spin' : ''}`} />
                    刷新
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => copyToClipboard(markdownContent)}
                    disabled={!markdownContent}
                  >
                    <CopyIcon className="w-4 h-4 mr-2" />
                    复制
                  </Button>
                  <Button 
                    size="sm" 
                    className="bg-[#1977e5] hover:bg-[#1977e5]/90"
                    onClick={handleDownloadMarkdown}
                  >
                    <DownloadIcon className="w-4 h-4 mr-2" />
                    下载
                  </Button>
                </div>
              </div>
              <div className="bg-[#f7f9fc] border border-[#e8edf2] rounded-lg p-4 max-h-96 overflow-auto">
                {loadingMarkdown ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2Icon className="w-6 h-6 animate-spin text-[#1977e5]" />
                  </div>
                ) : (
                  <pre className="whitespace-pre-wrap text-sm text-[#0c141c] font-mono">
                    {markdownContent || '点击刷新加载内容...'}
                  </pre>
                )}
              </div>
            </Card>
          ) : (
            <Card className="border-[#d1dbe8] bg-white p-6">
              <div className="text-center py-8">
                <ClockIcon className="w-12 h-12 text-[#4f7096] mx-auto mb-4" />
                <h3 className="text-lg font-medium text-[#0c141c] mb-2">Markdown 内容不可用</h3>
                <p className="text-[#4f7096]">
                  {file.process_status === 'pending' && '文件还未开始处理'}
                  {file.process_status === 'processing' && '正在转换为 Markdown 格式...'}
                  {file.process_status === 'failed' && '转换失败，请重试'}
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
                  <label className="text-sm font-medium text-[#4f7096]">文件名</label>
                  <div className="text-[#0c141c]">{file.filename}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-[#4f7096]">原始文件名</label>
                  <div className="text-[#0c141c]">{file.original_filename}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-[#4f7096]">文件类型</label>
                  <div className="text-[#0c141c]">{file.file_type.toUpperCase()}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-[#4f7096]">文件大小</label>
                  <div className="text-[#0c141c]">{file.file_size_human}</div>
                </div>
                {file.language && (
                  <div>
                    <label className="text-sm font-medium text-[#4f7096]">语言</label>
                    <div className="text-[#0c141c]">{file.language}</div>
                  </div>
                )}
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-[#4f7096]">上传时间</label>
                  <div className="text-[#0c141c]">{new Date(file.uploaded_at).toLocaleString('zh-CN')}</div>
                </div>
                {file.processed_at && (
                  <div>
                    <label className="text-sm font-medium text-[#4f7096]">处理时间</label>
                    <div className="text-[#0c141c]">{new Date(file.processed_at).toLocaleString('zh-CN')}</div>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-[#4f7096]">最后更新</label>
                  <div className="text-[#0c141c]">{new Date(file.updated_at).toLocaleString('zh-CN')}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-[#4f7096]">存储路径</label>
                  <div className="text-[#0c141c] text-sm font-mono break-all">{file.minio_object_name}</div>
                </div>
                {file.converted_object_name && (
                  <div>
                    <label className="text-sm font-medium text-[#4f7096]">转换文件路径</label>
                    <div className="text-[#0c141c] text-sm font-mono break-all">{file.converted_object_name}</div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}; 