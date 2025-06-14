import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  PlusIcon, 
  EditIcon, 
  TrashIcon, 
  BrainIcon,
  MessageSquareIcon,
  CaptionsIcon,
  SaveIcon,
  XIcon,
  CheckIcon,
  ClockIcon,
  UserIcon,
  BotIcon,
  MousePointerIcon,
  EyeIcon,
  ImageIcon,
  SearchIcon,
  DownloadIcon
} from 'lucide-react';
import { ImageAnnotation, ImageAnnotationType, AnnotationSource } from '../../types/annotation';

interface ImageAnnotationPanelProps {
  fileData: any;
  annotations: ImageAnnotation[];
  loading: boolean;
  stats: any;
  onCreateAnnotation: (annotation: Omit<ImageAnnotation, 'id' | 'created_at' | 'updated_at'>) => Promise<ImageAnnotation>;
  onUpdateAnnotation: (id: string, updates: Partial<ImageAnnotation>) => Promise<ImageAnnotation>;
  onDeleteAnnotation: (id: string, deletedBy?: string) => Promise<void>;
  onGenerateAI: (type: 'qa' | 'caption' | 'object_detection', options?: any) => Promise<ImageAnnotation>;
  onExportAnnotations: (format: string, filters?: any) => Promise<any>;
  onReviewAnnotation: (id: string, status: 'approved' | 'rejected', comments?: string) => Promise<ImageAnnotation>;
  isProcessing: boolean;
}

export const ImageAnnotationPanel: React.FC<ImageAnnotationPanelProps> = ({
  fileData,
  annotations,
  loading,
  stats,
  onCreateAnnotation,
  onUpdateAnnotation,
  onDeleteAnnotation,
  onGenerateAI,
  onExportAnnotations,
  onReviewAnnotation,
  isProcessing
}) => {
  const [activeTab, setActiveTab] = useState<ImageAnnotationType>('qa');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newAnnotation, setNewAnnotation] = useState({
    question: '',
    answer: '',
    caption: '',
    label: ''
  });

  const groupedAnnotations = {
    qa: annotations.filter(a => a.type === 'qa'),
    caption: annotations.filter(a => a.type === 'caption'),
    classification: annotations.filter(a => a.type === 'classification'),
    object_detection: annotations.filter(a => a.type === 'object_detection'),
    segmentation: annotations.filter(a => a.type === 'segmentation'),
    keypoint: annotations.filter(a => a.type === 'keypoint'),
    ocr: annotations.filter(a => a.type === 'ocr'),
    custom: annotations.filter(a => a.type === 'custom')
  };

  const handleCreateAnnotation = async () => {
    let content: any = {};

    switch (activeTab) {
      case 'qa':
        if (!newAnnotation.question.trim() || !newAnnotation.answer.trim()) return;
        content = {
          question: newAnnotation.question,
          answer: newAnnotation.answer
        };
        break;
      case 'caption':
        if (!newAnnotation.caption.trim()) return;
        content = {
          caption: newAnnotation.caption
        };
        break;
      case 'classification':
        if (!newAnnotation.label.trim()) return;
        content = {
          label: newAnnotation.label
        };
        break;
      default:
        return;
    }

    try {
      await onCreateAnnotation({
        file_id: fileData.id,
        type: activeTab,
        source: 'human',
        content,
        created_by: 'current_user' // 这里应该从用户上下文获取
      });

      // 清空表单
      setNewAnnotation({
        question: '',
        answer: '',
        caption: '',
        label: ''
      });
    } catch (error) {
      console.error('创建标注失败:', error);
    }
  };

  const handleAIGenerate = async (type: 'qa' | 'caption' | 'object_detection') => {
    try {
      await onGenerateAI(type);
    } catch (error) {
      console.error('AI生成失败:', error);
    }
  };

  const handleExport = async (format: string) => {
    try {
      const result = await onExportAnnotations(format, {
        type: activeTab,
        review_status: 'approved'
      });
      
      // 创建下载链接
      const blob = new Blob([JSON.stringify(result.data, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `annotations_${fileData.filename}_${format}.${format === 'json' ? 'json' : 'txt'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('导出失败:', error);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getSourceIcon = (source: AnnotationSource) => {
    switch (source) {
      case 'ai':
        return <BotIcon size={12} className="mr-1" />;
      case 'human':
        return <UserIcon size={12} className="mr-1" />;
      case 'detection':
        return <MousePointerIcon size={12} className="mr-1" />;
      case 'imported':
        return <DownloadIcon size={12} className="mr-1" />;
      default:
        return null;
    }
  };

  const getSourceBadgeClass = (source: AnnotationSource) => {
    switch (source) {
      case 'ai':
        return 'bg-blue-100 text-blue-800';
      case 'human':
        return 'bg-green-100 text-green-800';
      case 'detection':
        return 'bg-purple-100 text-purple-800';
      case 'imported':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const AnnotationCard: React.FC<{ annotation: ImageAnnotation }> = ({ annotation }) => (
    <Card key={annotation.id} className="p-4 mb-3">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Badge variant="outline">
            {annotation.type === 'qa' ? '问答' : 
             annotation.type === 'caption' ? '描述' : 
             annotation.type === 'classification' ? '分类' :
             annotation.type === 'object_detection' ? '检测' : annotation.type}
          </Badge>
          <Badge className={getSourceBadgeClass(annotation.source)}>
            {getSourceIcon(annotation.source)}
            {annotation.source === 'ai' ? 'AI' : 
             annotation.source === 'human' ? '人工' : 
             annotation.source === 'detection' ? '检测' : '导入'}
          </Badge>
          {annotation.confidence && annotation.confidence > 0 && (
            <Badge variant="secondary" className="text-xs">
              {Math.round((annotation.confidence || 0) * 100)}%
            </Badge>
          )}
          {annotation.review_status && (
            <Badge 
              variant={annotation.review_status === 'approved' ? 'default' : 'secondary'}
              className={
                annotation.review_status === 'approved' ? 'bg-green-100 text-green-800' :
                annotation.review_status === 'rejected' ? 'bg-red-100 text-red-800' :
                'bg-yellow-100 text-yellow-800'
              }
            >
              {annotation.review_status === 'approved' ? '已审核' :
               annotation.review_status === 'rejected' ? '已拒绝' : '待审核'}
            </Badge>
          )}
        </div>
        
        <div className="flex items-center space-x-1">
          {annotation.review_status === 'pending' && (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onReviewAnnotation(annotation.id, 'approved')}
                className="text-green-600 hover:text-green-700"
              >
                <CheckIcon size={14} />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onReviewAnnotation(annotation.id, 'rejected')}
                className="text-red-600 hover:text-red-700"
              >
                <XIcon size={14} />
              </Button>
            </>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setEditingId(editingId === annotation.id ? null : annotation.id)}
          >
            <EditIcon size={14} />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDeleteAnnotation(annotation.id, 'current_user')}
            className="text-red-600 hover:text-red-700"
          >
            <TrashIcon size={14} />
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {annotation.type === 'qa' && (
          <>
            <div>
              <label className="text-sm font-medium text-gray-700">问题:</label>
              <p className="text-sm mt-1">{annotation.content.question}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">答案:</label>
              <p className="text-sm mt-1">{annotation.content.answer}</p>
            </div>
          </>
        )}
        
        {annotation.type === 'caption' && (
          <div>
            <label className="text-sm font-medium text-gray-700">描述:</label>
            <p className="text-sm mt-1">{annotation.content.caption}</p>
          </div>
        )}
        
        {annotation.type === 'classification' && (
          <div>
            <label className="text-sm font-medium text-gray-700">分类:</label>
            <p className="text-sm mt-1 font-medium">{annotation.content.label}</p>
          </div>
        )}
        
        {annotation.type === 'object_detection' && annotation.content.objects && (
          <div>
            <label className="text-sm font-medium text-gray-700">检测对象:</label>
            <div className="mt-1 space-y-1">
              {annotation.content.objects.map((obj: any, index: number) => (
                <div key={index} className="text-sm bg-gray-50 p-2 rounded">
                  <span className="font-medium">{obj.label}</span>
                  {obj.confidence && (
                    <span className="text-gray-500 ml-2">
                      ({Math.round(obj.confidence * 100)}%)
                    </span>
                  )}
                  {obj.bbox && (
                    <div className="text-xs text-gray-500 mt-1">
                      位置: x={Math.round(obj.bbox.x * 100)}%, y={Math.round(obj.bbox.y * 100)}%, 
                      w={Math.round(obj.bbox.width * 100)}%, h={Math.round(obj.bbox.height * 100)}%
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-gray-200">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>创建时间: {formatTimestamp(annotation.created_at)}</span>
          {annotation.created_by && (
            <span>创建者: {annotation.created_by}</span>
          )}
        </div>
      </div>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">正在加载标注...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="p-4">
        <h3 className="text-lg font-medium">图片标注面板</h3>
        <p className="text-sm text-gray-600">文件: {fileData?.filename}</p>
      </div>

      {/* 统计信息栏 */}
      {stats && (
        <div className="bg-white border-b p-4">
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">{stats.total_annotations}</div>
              <div className="text-sm text-gray-500">总标注数</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {Math.round(stats.avg_confidence * 100)}%
              </div>
              <div className="text-sm text-gray-500">平均置信度</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {Math.round(stats.completion_rate)}%
              </div>
              <div className="text-sm text-gray-500">完成率</div>
            </div>
            <div className="flex space-x-2">
              <Button
                size="sm"
                onClick={() => handleExport('json')}
                className="bg-blue-500 hover:bg-blue-600"
              >
                <DownloadIcon size={14} className="mr-1" />
                导出
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ImageAnnotationType)} className="h-full flex flex-col">
          <TabsList className="px-6 py-2 bg-white border-b">
            <TabsTrigger value="qa" className="flex items-center space-x-2">
              <MessageSquareIcon size={16} />
              <span>问答 ({groupedAnnotations.qa.length})</span>
            </TabsTrigger>
            <TabsTrigger value="caption" className="flex items-center space-x-2">
              <CaptionsIcon size={16} />
              <span>描述 ({groupedAnnotations.caption.length})</span>
            </TabsTrigger>
            <TabsTrigger value="classification" className="flex items-center space-x-2">
              <ImageIcon size={16} />
              <span>分类 ({groupedAnnotations.classification.length})</span>
            </TabsTrigger>
            <TabsTrigger value="object_detection" className="flex items-center space-x-2">
              <SearchIcon size={16} />
              <span>检测 ({groupedAnnotations.object_detection.length})</span>
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-auto">
            <TabsContent value="qa" className="h-full m-0 p-6">
              <div className="space-y-4">
                {/* AI辅助按钮 */}
                <div className="flex space-x-2 mb-4">
                  <Button
                    onClick={() => handleAIGenerate('qa')}
                    disabled={isProcessing}
                    className="bg-blue-500 hover:bg-blue-600"
                  >
                    <BrainIcon size={16} className="mr-2" />
                    {isProcessing ? 'AI处理中...' : 'AI问答'}
                  </Button>
                </div>

                {/* 创建新标注 */}
                <Card className="p-4">
                  <h4 className="font-medium mb-3">创建问答标注</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        问题
                      </label>
                      <Input
                        value={newAnnotation.question}
                        onChange={(e) => setNewAnnotation(prev => ({...prev, question: e.target.value}))}
                        placeholder="输入问题..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        答案
                      </label>
                      <Textarea
                        value={newAnnotation.answer}
                        onChange={(e) => setNewAnnotation(prev => ({...prev, answer: e.target.value}))}
                        placeholder="输入答案..."
                        rows={3}
                      />
                    </div>
                    <Button
                      onClick={handleCreateAnnotation}
                      disabled={!newAnnotation.question.trim() || !newAnnotation.answer.trim()}
                      className="w-full"
                    >
                      <PlusIcon size={16} className="mr-2" />
                      创建标注
                    </Button>
                  </div>
                </Card>

                {/* 标注列表 */}
                {groupedAnnotations.qa.map(annotation => (
                  <AnnotationCard key={annotation.id} annotation={annotation} />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="caption" className="h-full m-0 p-6">
              <div className="space-y-4">
                {/* AI辅助按钮 */}
                <div className="flex space-x-2 mb-4">
                  <Button
                    onClick={() => handleAIGenerate('caption')}
                    disabled={isProcessing}
                    className="bg-blue-500 hover:bg-blue-600"
                  >
                    <BrainIcon size={16} className="mr-2" />
                    {isProcessing ? 'AI处理中...' : 'AI描述'}
                  </Button>
                </div>

                {/* 创建新标注 */}
                <Card className="p-4">
                  <h4 className="font-medium mb-3">创建描述标注</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        图片描述
                      </label>
                      <Textarea
                        value={newAnnotation.caption}
                        onChange={(e) => setNewAnnotation(prev => ({...prev, caption: e.target.value}))}
                        placeholder="输入图片描述..."
                        rows={3}
                      />
                    </div>
                    <Button
                      onClick={handleCreateAnnotation}
                      disabled={!newAnnotation.caption.trim()}
                      className="w-full"
                    >
                      <PlusIcon size={16} className="mr-2" />
                      创建标注
                    </Button>
                  </div>
                </Card>

                {/* 标注列表 */}
                {groupedAnnotations.caption.map(annotation => (
                  <AnnotationCard key={annotation.id} annotation={annotation} />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="classification" className="h-full m-0 p-6">
              <div className="space-y-4">
                {/* 创建新标注 */}
                <Card className="p-4">
                  <h4 className="font-medium mb-3">创建分类标注</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        分类标签
                      </label>
                      <Input
                        value={newAnnotation.label}
                        onChange={(e) => setNewAnnotation(prev => ({...prev, label: e.target.value}))}
                        placeholder="输入分类标签..."
                      />
                    </div>
                    <Button
                      onClick={handleCreateAnnotation}
                      disabled={!newAnnotation.label.trim()}
                      className="w-full"
                    >
                      <PlusIcon size={16} className="mr-2" />
                      创建标注
                    </Button>
                  </div>
                </Card>

                {/* 标注列表 */}
                {groupedAnnotations.classification.map(annotation => (
                  <AnnotationCard key={annotation.id} annotation={annotation} />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="object_detection" className="h-full m-0 p-6">
              <div className="space-y-4">
                {/* AI辅助按钮 */}
                <div className="flex space-x-2 mb-4">
                  <Button
                    onClick={() => handleAIGenerate('object_detection')}
                    disabled={isProcessing}
                    className="bg-blue-500 hover:bg-blue-600"
                  >
                    <BrainIcon size={16} className="mr-2" />
                    {isProcessing ? 'AI处理中...' : 'AI检测'}
                  </Button>
                </div>

                {/* 标注列表 */}
                {groupedAnnotations.object_detection.map(annotation => (
                  <AnnotationCard key={annotation.id} annotation={annotation} />
                ))}
                
                {groupedAnnotations.object_detection.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <SearchIcon size={48} className="mx-auto mb-4 text-gray-300" />
                    <p>暂无目标检测标注</p>
                    <p className="text-sm">点击上方"AI检测"按钮开始自动检测</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}; 