import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { 
  ArrowLeft,
  FileText,
  Download,
  Edit,
  Trash,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock,
  Eye,
  Copy,
  File,
  FileSpreadsheet,
  Presentation,
  Image,
  Video,
  Zap,
  Brain,
  FileSearch,
  Loader2,
  FileEdit,
  MessageSquare as AnnotationIcon
} from 'lucide-react';
import { Input } from '../../components/ui/input';
import { fileService, libraryService } from '../../services';
import { LibraryFile } from '../../types/library';
import { useFileConversion } from '../../hooks/useFileConversion';
import { ConvertToMarkdownDialog, ConversionConfig } from '../RawData/LibraryDetails/components/ConvertToMarkdownDialog';
import { MediaFileDetailsContainer } from '../../components/MediaFileDetails';

export const FilePreview = (): JSX.Element => {
  const { t } = useTranslation();
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
  const [previewMethod, setPreviewMethod] = useState<'text' | 'image' | 'unsupported' | null>(null);
  // 新增转换相关状态
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  
  // 使用转换hook
  const { convertFiles, loading: convertLoading } = useFileConversion();

  // 显示通知的函数
  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  // 获取文件详情
  useEffect(() => {
    if (fileId && libraryId) {
      fetchFileDetails();
    } else {
      setLoading(false);
      setError(t('rawData.filePreview.missingFileId'));
    }
  }, [fileId, libraryId]);

  const fetchFileDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const fileData = await fileService.getFileDetail(libraryId!, fileId!);
      setFile(fileData);
      // 修复：优先使用original_filename显示中文名，filename作为备选
      setEditName(fileData.original_filename || fileData.filename);
      
      // 如果有转换后的文件，预加载markdown内容
      if (fileData.converted_object_name && fileData.process_status === 'completed') {
        loadMarkdownContent(fileData.converted_object_name);
      }
    } catch (err) {
      console.error('获取文件详情失败:', err);
      setError(t('rawData.filePreview.loadingFailed'));
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
      setMarkdownContent(t('rawData.filePreview.getMarkdownFailed'));
    } finally {
      setLoadingMarkdown(false);
    }
  };

  const loadOriginalContent = async (objectName: string) => {
    if (!file) return;
    try {
      setLoadingOriginal(true);
      setPreviewMethod(null);
      setOriginalContent('');

      const fileType = file.file_type.toLowerCase();
      // 常见纯文本类型，可根据需要扩展
      const knownTextTypes = ['txt', 'md', 'json', 'xml', 'csv', 'log', 'yaml', 'ini', 'rtf', 'html', 'css', 'js', 'ts', 'py', 'java', 'c', 'cpp', 'go', 'rb', 'php', 'sh', 'conf'];
      // 常见图片类型
      const knownImageTypes = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg'];

      if (knownTextTypes.includes(fileType)) {
        const content = await fileService.getFileContent(objectName);
        setOriginalContent(content);
        setPreviewMethod('text');
      } else if (knownImageTypes.includes(fileType)) {
        const rawContent = await fileService.getFileContent(objectName);
        if (rawContent.startsWith('data:image')) { // 已经是一个数据URI
          setOriginalContent(rawContent);
        } else if (fileType === 'svg') { // 对SVG特殊处理，可能是XML文本
           if (rawContent.startsWith('<svg') || rawContent.startsWith('<?xml')) { // Crude check for SVG XML
             setOriginalContent(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(rawContent)}`);
           } else { // Assume base64 for SVG if not XML
             setOriginalContent(`data:image/svg+xml;base64,${rawContent}`);
           }
        } else {
          // 假设是Base64编码的图像数据
          setOriginalContent(`data:image/${fileType};base64,${rawContent}`);
        }
        setPreviewMethod('image');
      } else if (fileType === 'pdf') {
        setOriginalContent(t('rawData.filePreview.content.pdfPreviewTip'));
        setPreviewMethod('unsupported');
      } else { // 其他如 docx, pptx, xlsx 等
        setOriginalContent(t('rawData.filePreview.content.unsupportedFormat', { fileType }));
        setPreviewMethod('unsupported');
      }
    } catch (err) {
      console.error('获取原始内容失败:', err);
      setOriginalContent(t('rawData.filePreview.getOriginalFailed'));
      setPreviewMethod('unsupported');
    } finally {
      setLoadingOriginal(false);
    }
  };

  const getFile = (type: string) => {
    switch (type.toLowerCase()) {
      case 'pdf':
        return <FileText className="w-8 h-8 text-red-500" />;
      case 'docx':
      case 'doc':
        return <FileText className="w-8 h-8 text-blue-500" />;
      case 'xlsx':
      case 'xls':
        return <FileSpreadsheet className="w-8 h-8 text-green-500" />;
      case 'pptx':
      case 'ppt':
        return <Presentation className="w-8 h-8 text-orange-500" />;
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'bmp':
      case 'webp':
      case 'svg':
        return <Image className="w-8 h-8 text-purple-500" />;
      case 'mp4':
      case 'avi':
      case 'mov':
      case 'wmv':
      case 'flv':
      case 'webm':
        return <Video className="w-8 h-8 text-indigo-500" />;
      default:
        return <File className="w-8 h-8 text-gray-500" />;
    }
  };

  // 检查是否为多媒体文件
  const isMediaFile = (type: string) => {
    const mediaTypes = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg', 'mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'];
    return mediaTypes.includes(type.toLowerCase());
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
        return t('rawData.filePreview.status.pending');
      case 'processing':
        return t('rawData.filePreview.status.processing');
      case 'completed':
        return t('rawData.filePreview.status.completed');
      case 'failed':
        return t('rawData.filePreview.status.failed');
      default:
        return t('rawData.filePreview.status.failed');
    }
  };



  const handleSaveName = async () => {
    const currentName = file?.original_filename || file?.filename || '';
    if (file && editName.trim() && editName.trim() !== currentName) {
      try {
        const updatedFile = await fileService.updateFileName(libraryId!, fileId!, editName.trim());
        setFile(updatedFile);
        setIsEditing(false);
      } catch (err) {
        console.error('更新文件名失败:', err);
        showNotification('error', t('rawData.filePreview.updateFileNameFailed'));
      }
    } else {
      setIsEditing(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm(t('rawData.filePreview.confirmDelete'))) {
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
        const filename = `${(file.original_filename || file.filename).replace(/\.[^/.]+$/, '')}.md`;
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

  // 处理转换为MD
  const handleConvertToMD = () => {
    setShowConvertDialog(true);
  };

  // 确认转换
  const handleConvertConfirm = async (config: ConversionConfig) => {
    if (!file || !libraryId) return;
    
    const job = await convertFiles(libraryId, [file.id], config);
    if (job) {
      showNotification('success', t('rawData.filePreview.conversionSubmitted'));
      setShowConvertDialog(false);
      // 刷新文件详情以获取最新状态
      setTimeout(() => {
        fetchFileDetails();
      }, 2000);
    } else {
      showNotification('error', t('rawData.filePreview.conversionFailed'));
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
          <Loader2 className="w-8 h-8 animate-spin text-[#1977e5]" />
        </div>
      </div>
    );
  }

  if (error || !file) {
    return (
      <div className="w-full max-w-[1400px] p-6">
        <div className="text-center">
          <div className="text-red-600 mb-4">{error || t('rawData.filePreview.fileNotExists')}</div>
          <Button onClick={() => navigate('/rawdata')} variant="outline">
            {t('rawData.filePreview.backToLibrary')}
          </Button>
        </div>
      </div>
    );
  }

  // 如果是多媒体文件，使用专门的多媒体详情组件
  if (isMediaFile(file.file_type)) {
    return (
      <div className="w-full h-screen flex flex-col">
        {/* 简化的顶部导航 */}
        <div className="flex items-center p-4 bg-white border-b">
          <Button
            variant="ghost"
            onClick={() => navigate(`/rawdata`)}
            className="text-[#4f7096] hover:text-[#0c141c] hover:bg-[#e8edf2]"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('rawData.filePreview.backToLibrary')}
          </Button>
          <div className="mx-2 text-[#4f7096]">/</div>
          <span className="text-[#0c141c] font-medium">{file.original_filename || file.filename}</span>
        </div>
        
        {/* 多媒体文件详情组件 */}
        <div className="flex-1 overflow-hidden">
          <MediaFileDetailsContainer 
            libraryId={libraryId} 
            fileId={fileId} 
          />
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
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('rawData.filePreview.backToLibrary')}
        </Button>
        <div className="mx-2 text-[#4f7096]">/</div>
        <span className="text-[#0c141c] font-medium">{t('rawData.filePreview.title')}</span>
      </div>

      {/* 文件基本信息 */}
      <Card className="border-[#d1dbe8] bg-white p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start">
            {getFile(file.file_type)}
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
                    <Button size="sm" onClick={handleSaveName}>{t('rawData.filePreview.save')}</Button>
                    <Button size="sm" variant="outline" onClick={() => {
                      setIsEditing(false);
                      setEditName(file.original_filename || file.filename);
                    }}>{t('rawData.filePreview.cancel')}</Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold text-[#0c141c]">{file.original_filename || file.filename}</h1>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditing(true)}
                      className="text-[#4f7096] hover:text-[#0c141c]"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
              
              <div className="flex flex-wrap gap-4 text-sm text-[#4f7096] mb-3">
                <span>{file.file_type.toUpperCase()} • {file.file_size_human}</span>
                {file.page_count && <span>{file.page_count} {t('rawData.filePreview.pages')}</span>}
                {file.word_count && <span>{file.word_count.toLocaleString()} {t('rawData.filePreview.words')}</span>}
                <span>{t('rawData.filePreview.uploadedAt')} {new Date(file.uploaded_at).toLocaleString('zh-CN')}</span>
              </div>

              <div className="flex flex-wrap gap-2 mb-3">
                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(file.process_status)}`}>
                  {getStatusLabel(file.process_status)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            {file.process_status === 'completed' && file.converted_object_name && (
              <Button 
                className="bg-[#1977e5] hover:bg-[#1977e5]/90"
                onClick={handleDownloadMarkdown}
              >
                <Download className="w-4 h-4 mr-2" />
                {t('rawData.filePreview.downloadMD')}
              </Button>
            )}
            {/* 转换为MD按钮 */}
            <Button 
              variant="outline" 
              className="border-[#1977e5] text-[#1977e5] hover:bg-[#1977e5] hover:text-white"
              onClick={handleConvertToMD}
              disabled={convertLoading}
            >
              <FileEdit className="w-4 h-4 mr-2" />
              {convertLoading ? t('rawData.filePreview.converting') : t('rawData.filePreview.convertToMD')}
            </Button>
            <Button variant="outline" className="border-[#d1dbe8]" onClick={handleDownloadOriginal}>
              <Download className="w-4 h-4 mr-2" />
              {t('rawData.filePreview.downloadOriginal')}
            </Button>
            <Button 
              variant="outline" 
              onClick={handleDelete}
              className="border-[#d1dbe8] text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash className="w-4 h-4 mr-2" />
              {t('rawData.filePreview.delete')}
            </Button>
          </div>
        </div>

        {file.process_status === 'failed' && file.conversion_error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center text-red-700">
              <AlertCircle className="w-5 h-5 mr-2" />
              <span className="font-medium">{t('rawData.filePreview.processingError.title')}</span>
            </div>
            <div className="text-sm text-red-600 mt-1">{file.conversion_error}</div>
          </div>
        )}
      </Card>

      {/* 详细信息标签页 */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="w-full justify-start mb-6">
          <TabsTrigger value="overview">{t('rawData.filePreview.tabs.overview')}</TabsTrigger>
          <TabsTrigger value="content">{t('rawData.filePreview.tabs.content')}</TabsTrigger>
          <TabsTrigger 
            value="markdown" 
            disabled={!file.converted_object_name || file.process_status !== 'completed'}
          >
            {t('rawData.filePreview.tabs.markdown')}
          </TabsTrigger>
          <TabsTrigger value="metadata">{t('rawData.filePreview.tabs.metadata')}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 文件统计 */}
            <Card className="border-[#d1dbe8] bg-white p-6">
              <h3 className="font-semibold text-[#0c141c] mb-4 flex items-center">
                <FileSearch className="w-5 h-5 mr-2" />
                {t('rawData.filePreview.overview.fileStats')}
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-[#4f7096]">{t('rawData.filePreview.overview.fileSize')}</span>
                  <span className="text-[#0c141c] font-medium">{file.file_size_human}</span>
                </div>
                {file.page_count && (
                  <div className="flex justify-between">
                    <span className="text-[#4f7096]">{t('rawData.filePreview.overview.pageCount')}</span>
                    <span className="text-[#0c141c] font-medium">{file.page_count}</span>
                  </div>
                )}
                {file.word_count && (
                  <div className="flex justify-between">
                    <span className="text-[#4f7096]">{t('rawData.filePreview.overview.wordCount')}</span>
                    <span className="text-[#0c141c] font-medium">{file.word_count.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-[#4f7096]">{t('rawData.filePreview.overview.fileType')}</span>
                  <span className="text-[#0c141c] font-medium">{file.file_type.toUpperCase()}</span>
                </div>
                {file.language && (
                  <div className="flex justify-between">
                    <span className="text-[#4f7096]">{t('rawData.filePreview.overview.language')}</span>
                    <span className="text-[#0c141c] font-medium">{file.language}</span>
                  </div>
                )}
              </div>
            </Card>

            {/* 处理信息 */}
            <Card className="border-[#d1dbe8] bg-white p-6">
              <h3 className="font-semibold text-[#0c141c] mb-4 flex items-center">
                <Zap className="w-5 h-5 mr-2" />
                {t('rawData.filePreview.overview.processingInfo')}
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-[#4f7096]">{t('rawData.filePreview.overview.processingStatus')}</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(file.process_status)}`}>
                    {getStatusLabel(file.process_status)}
                  </span>
                </div>
                {file.converted_format && (
                  <div className="flex justify-between">
                    <span className="text-[#4f7096]">{t('rawData.filePreview.overview.outputFormat')}</span>
                    <span className="text-[#0c141c] font-medium">
                      {file.converted_format === 'markdown' ? 'Markdown' : file.converted_format}
                    </span>
                  </div>
                )}
                {file.conversion_method && (
                  <div className="flex justify-between">
                    <span className="text-[#4f7096]">{t('rawData.filePreview.overview.conversionMethod')}</span>
                    <span className="text-[#0c141c] font-medium">{file.conversion_method}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-[#4f7096]">{t('rawData.filePreview.overview.uploadTime')}</span>
                  <span className="text-[#0c141c] font-medium">
                    {new Date(file.uploaded_at).toLocaleDateString('zh-CN')}
                  </span>
                </div>
                {file.processed_at && (
                  <div className="flex justify-between">
                    <span className="text-[#4f7096]">{t('rawData.filePreview.overview.processingTime')}</span>
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
                <Brain className="w-5 h-5 mr-2" />
                {t('rawData.filePreview.overview.trainingValue')}
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-[#4f7096]">{t('rawData.filePreview.overview.contentIntegrity')}</span>
                  <span className="text-green-600 font-medium">
                    {file.process_status === 'completed' ? t('rawData.filePreview.overview.excellent') : t('rawData.filePreview.overview.pending')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#4f7096]">{t('rawData.filePreview.overview.formatStandard')}</span>
                  <span className="text-green-600 font-medium">
                    {file.converted_format ? t('rawData.filePreview.overview.good') : t('rawData.filePreview.overview.toBeProcessed')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#4f7096]">{t('rawData.filePreview.overview.informationDensity')}</span>
                  <span className="text-yellow-600 font-medium">
                    {file.word_count && file.word_count > 1000 ? t('rawData.filePreview.overview.high') : t('rawData.filePreview.overview.medium')}
                  </span>
                </div>

              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="content">
          <Card className="border-[#d1dbe8] bg-white p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-[#0c141c]">{t('rawData.filePreview.content.originalPreview')}</h3>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => file.minio_object_name && loadOriginalContent(file.minio_object_name)}
                  disabled={loadingOriginal}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${loadingOriginal ? 'animate-spin' : ''}`} />
                  {t('rawData.filePreview.refresh')}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => copyToClipboard(originalContent)}
                  disabled={!originalContent || previewMethod !== 'text'}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  {t('rawData.filePreview.copyText')}
                </Button>
              </div>
            </div>
            <div className="bg-[#f7f9fc] border border-[#e8edf2] rounded-lg p-4 max-h-96 overflow-auto">
              {loadingOriginal ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="w-6 h-6 animate-spin text-[#1977e5]" />
                </div>
              ) : previewMethod === 'text' ? (
                <pre className="whitespace-pre-wrap text-sm text-[#0c141c] font-mono">
                  {originalContent}
                </pre>
              ) : previewMethod === 'image' ? (
                                  <img 
                  src={originalContent} 
                  alt={file.original_filename || file.filename} 
                  style={{ maxWidth: '100%', maxHeight: '80vh', display: 'block', margin: 'auto', border: '1px solid #e8edf2', objectFit: 'contain' }} 
                  onError={() => {
                      setPreviewMethod('unsupported');
                      setOriginalContent(t('rawData.filePreview.content.imageLoadError', { fileType: file.file_type }));
                  }}
                />
              ) : previewMethod === 'unsupported' ? (
                <div className="text-center py-10">
                  <File className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 px-4">{originalContent || t('rawData.filePreview.content.unsupportedFileType')}</p>
                  <Button 
                    variant="outline" 
                    className="mt-6"
                    onClick={handleDownloadOriginal}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    {t('rawData.filePreview.downloadOriginal')}
                  </Button>
                </div>
              ) : (
                <div className="text-center py-10">
                  <FileSearch className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">
                    {originalContent || (file?.minio_object_name ? t('rawData.filePreview.content.loadPreview') : t('rawData.filePreview.content.incompleteFileInfo'))}
                  </p>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="markdown">
          {file.process_status === 'completed' && file.converted_object_name ? (
            <Card className="border-[#d1dbe8] bg-white p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-[#0c141c]">{t('rawData.filePreview.markdown.title')}</h3>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => loadMarkdownContent(file.converted_object_name!)}
                    disabled={loadingMarkdown}
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${loadingMarkdown ? 'animate-spin' : ''}`} />
                    {t('rawData.filePreview.refresh')}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => copyToClipboard(markdownContent)}
                    disabled={!markdownContent}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    {t('rawData.filePreview.copy')}
                  </Button>
                  <Button 
                    size="sm" 
                    className="bg-[#1977e5] hover:bg-[#1977e5]/90"
                    onClick={handleDownloadMarkdown}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    {t('rawData.filePreview.download')}
                  </Button>
                </div>
              </div>
              <div className="bg-[#f7f9fc] border border-[#e8edf2] rounded-lg p-4 max-h-96 overflow-auto">
                {loadingMarkdown ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="w-6 h-6 animate-spin text-[#1977e5]" />
                  </div>
                ) : (
                  <pre className="whitespace-pre-wrap text-sm text-[#0c141c] font-mono">
                    {markdownContent || t('rawData.filePreview.markdown.loadContent')}
                  </pre>
                )}
              </div>
            </Card>
          ) : (
            <Card className="border-[#d1dbe8] bg-white p-6">
              <div className="text-center py-8">
                <Clock className="w-12 h-12 text-[#4f7096] mx-auto mb-4" />
                <h3 className="text-lg font-medium text-[#0c141c] mb-2">{t('rawData.filePreview.markdown.unavailable')}</h3>
                <p className="text-[#4f7096]">
                  {file.process_status === 'pending' && t('rawData.filePreview.markdown.notStarted')}
                  {file.process_status === 'processing' && t('rawData.filePreview.markdown.converting')}
                  {file.process_status === 'failed' && t('rawData.filePreview.markdown.conversionFailed')}
                </p>
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="metadata">
          <Card className="border-[#d1dbe8] bg-white p-6">
            <h3 className="font-semibold text-[#0c141c] mb-4">{t('rawData.filePreview.metadata.title')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-[#4f7096]">{t('rawData.filePreview.metadata.fileName')}</label>
                  <div className="text-[#0c141c]">{file.original_filename || file.filename}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-[#4f7096]">{t('rawData.filePreview.metadata.originalFileName')}</label>
                  <div className="text-[#0c141c]">{file.original_filename}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-[#4f7096]">{t('rawData.filePreview.metadata.fileType')}</label>
                  <div className="text-[#0c141c]">{file.file_type.toUpperCase()}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-[#4f7096]">{t('rawData.filePreview.metadata.fileSize')}</label>
                  <div className="text-[#0c141c]">{file.file_size_human}</div>
                </div>
                {file.language && (
                  <div>
                    <label className="text-sm font-medium text-[#4f7096]">{t('rawData.filePreview.metadata.language')}</label>
                    <div className="text-[#0c141c]">{file.language}</div>
                  </div>
                )}
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-[#4f7096]">{t('rawData.filePreview.metadata.uploadTime')}</label>
                  <div className="text-[#0c141c]">{new Date(file.uploaded_at).toLocaleString('zh-CN')}</div>
                </div>
                {file.processed_at && (
                  <div>
                    <label className="text-sm font-medium text-[#4f7096]">{t('rawData.filePreview.metadata.processingTime')}</label>
                    <div className="text-[#0c141c]">{new Date(file.processed_at).toLocaleString('zh-CN')}</div>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-[#4f7096]">{t('rawData.filePreview.metadata.lastUpdate')}</label>
                  <div className="text-[#0c141c]">{new Date(file.updated_at).toLocaleString('zh-CN')}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-[#4f7096]">{t('rawData.filePreview.metadata.storagePath')}</label>
                  <div className="text-[#0c141c] text-sm font-mono break-all">{file.minio_object_name}</div>
                </div>
                {file.converted_object_name && (
                  <div>
                    <label className="text-sm font-medium text-[#4f7096]">{t('rawData.filePreview.metadata.convertedPath')}</label>
                    <div className="text-[#0c141c] text-sm font-mono break-all">{file.converted_object_name}</div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 转换为MD弹窗 */}
      {showConvertDialog && file && (
        <ConvertToMarkdownDialog
          open={showConvertDialog}
          onClose={() => setShowConvertDialog(false)}
          files={[file]}
          onConfirm={handleConvertConfirm}
          loading={convertLoading}
        />
      )}

      {/* 通知组件 */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
          notification.type === 'success' 
            ? 'bg-green-50 border-green-200 text-green-800' 
            : 'bg-red-50 border-red-200 text-red-800'
        } border`}>
          <div className="flex items-center">
            {notification.type === 'success' ? (
              <CheckCircle className="w-5 h-5 mr-2" />
            ) : (
              <AlertCircle className="w-5 h-5 mr-2" />
            )}
            {notification.message}
          </div>
        </div>
      )}
    </div>
  );
}; 