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
  MicIcon,
  SaveIcon,
  XIcon,
  CheckIcon,
  ClockIcon,
  UserIcon,
  BotIcon,
  MousePointerIcon,
  RectangleHorizontalIcon as RectangleIcon
} from 'lucide-react';
import { UnifiedAnnotation } from '../../services/annotation.service';

interface MediaAnnotationPanelProps {
  fileData: any;
  annotations: UnifiedAnnotation[];
  loading: boolean;
  onCreateAnnotation: (annotation: Omit<UnifiedAnnotation, 'id' | 'timestamp'>) => Promise<void>;
  onUpdateAnnotation: (id: string, updates: Partial<UnifiedAnnotation>) => Promise<void>;
  onDeleteAnnotation: (id: string) => Promise<void>;
  onAIAnnotation: (type: string, options?: any) => Promise<void>;
  isProcessing: boolean;
}

export const MediaAnnotationPanel: React.FC<MediaAnnotationPanelProps> = ({
  fileData,
  annotations,
  loading,
  onCreateAnnotation,
  onUpdateAnnotation,
  onDeleteAnnotation,
  onAIAnnotation,
  isProcessing
}) => {
  // 添加调试信息
  React.useEffect(() => {
    console.log('MediaAnnotationPanel 接收到的数据:', {
      fileData: fileData?.filename,
      annotationsCount: annotations?.length || 0,
      loading,
      isProcessing,
      annotations: annotations
    });
    
    // 如果没有数据，添加一些测试数据来验证组件是否工作
    if (!loading && annotations?.length === 0) {
      console.log('没有标注数据，组件应该显示空状态');
    }
  }, [annotations, loading, isProcessing, fileData]);

  const [activeTab, setActiveTab] = useState('qa'); // 改为默认显示问答标签页
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detectionFilter, setDetectionFilter] = useState<'all' | 'human' | 'ai'>('all');
  const [newAnnotation, setNewAnnotation] = useState({
    type: 'qa' as const,
    question: '',
    answer: '',
    caption: '',
    transcript: ''
  });

  // 编辑状态管理
  const [editForm, setEditForm] = useState({
    question: '',
    answer: '',
    caption: '',
    transcript: ''
  });

  const groupedAnnotations = React.useMemo(() => {
    console.log('处理标注分组:', annotations);
    
    const qa = annotations.filter(a => a.type === 'qa');
    const caption = annotations.filter(a => a.type === 'caption');
    const transcript = annotations.filter(a => a.type === 'transcript');
    const detection = annotations.filter(a => 
      a.type === 'detection' || 
      a.type === 'OBJECT_DETECTION' || 
      a.type?.toLowerCase() === 'object_detection'
    );
    
    console.log('分组结果:', { qa: qa.length, caption: caption.length, transcript: transcript.length, detection: detection.length });
    
    return {
      qa,
      caption,
      transcript,
      detection
    };
  }, [annotations]);

  // 根据过滤器筛选检测标注
  const filteredDetectionAnnotations = groupedAnnotations.detection.filter(annotation => {
    if (detectionFilter === 'all') return true;
    if (detectionFilter === 'human') return annotation.source === 'human' || annotation.source === 'HUMAN_ANNOTATED';
    if (detectionFilter === 'ai') return annotation.source === 'ai' || annotation.source === 'AI_GENERATED';
    return true;
  });

  // 开始编辑标注
  const handleStartEdit = (annotation: UnifiedAnnotation) => {
    setEditingId(annotation.id);
    if (annotation.type === 'qa') {
      setEditForm({
        question: annotation.content.question || '',
        answer: annotation.content.answer || '',
        caption: '',
        transcript: ''
      });
    } else if (annotation.type === 'caption') {
      setEditForm({
        question: '',
        answer: '',
        caption: annotation.content.caption || '',
        transcript: ''
      });
    } else if (annotation.type === 'transcript') {
      setEditForm({
        question: '',
        answer: '',
        caption: '',
        transcript: annotation.content.text || ''
      });
    }
  };

  // 保存编辑
  const handleSaveEdit = async (annotation: UnifiedAnnotation) => {
    try {
      let updatedContent = { ...annotation.content };
      
      if (annotation.type === 'qa') {
        updatedContent = {
          question: editForm.question,
          answer: editForm.answer
        };
      } else if (annotation.type === 'caption') {
        updatedContent = {
          caption: editForm.caption
        };
      } else if (annotation.type === 'transcript') {
        updatedContent = {
          text: editForm.transcript
        };
      }

      await onUpdateAnnotation(annotation.id, {
        content: updatedContent
      });

      setEditingId(null);
      setEditForm({
        question: '',
        answer: '',
        caption: '',
        transcript: ''
      });
    } catch (error) {
      console.error('更新标注失败:', error);
    }
  };

  // 取消编辑
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({
      question: '',
      answer: '',
      caption: '',
      transcript: ''
    });
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
      case 'transcript':
        if (!newAnnotation.transcript.trim()) return;
        content = {
          text: newAnnotation.transcript
        };
        break;
      case 'detection':
        // 检测标注通常由AI生成，这里暂时不支持手动创建
        return;
    }

    try {
      await onCreateAnnotation({
        type: activeTab as 'qa' | 'caption' | 'transcript' | 'detection',
        content,
        source: 'human'
      });

      // 清空表单
      setNewAnnotation({
        type: 'qa',
        question: '',
        answer: '',
        caption: '',
        transcript: ''
      });
    } catch (error) {
      console.error('创建标注失败:', error);
    }
  };

  const handleAIAssist = async (type: string) => {
    try {
      await onAIAnnotation(type);
    } catch (error) {
      console.error('AI辅助失败:', error);
    }
  };

  const handleDeleteAnnotation = async (id: string) => {
    if (confirm('确定要删除这个标注吗？')) {
      try {
        await onDeleteAnnotation(id);
      } catch (error) {
        console.error('删除标注失败:', error);
      }
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatTimeRange = (timeRange?: { start: number; end: number }) => {
    if (!timeRange) return '';
    const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };
    return `${formatTime(timeRange.start)} - ${formatTime(timeRange.end)}`;
  };

  const AnnotationCard: React.FC<{ annotation: UnifiedAnnotation; showType?: boolean }> = ({ 
    annotation, 
    showType = false 
  }) => {
    const isEditing = editingId === annotation.id;
    
    return (
      <Card key={annotation.id} className="p-4 mb-3">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2">
            {showType && (
              <Badge variant="outline">
                {annotation.type === 'qa' ? '问答' : 
                 annotation.type === 'caption' ? '描述' : '转录'}
              </Badge>
            )}
            <Badge 
              variant={annotation.source === 'ai' || annotation.source === 'AI_GENERATED' ? 'default' : 'outline'}
              className={
                annotation.source === 'ai' || annotation.source === 'AI_GENERATED' ? 'bg-blue-100 text-blue-800' : 
                'bg-green-100 text-green-800'
              }
            >
              {annotation.source === 'ai' || annotation.source === 'AI_GENERATED' ? (
                <><BotIcon size={12} className="mr-1" />AI</>
              ) : (
                <><UserIcon size={12} className="mr-1" />人工</>
              )}
            </Badge>
            {(annotation.type === 'detection' || annotation.type === 'OBJECT_DETECTION') && (
              <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                <MousePointerIcon size={12} className="mr-1" />检测
              </Badge>
            )}
            {annotation.confidence && (
              <Badge variant="secondary" className="text-xs">
                {Math.round(annotation.confidence * 100)}%
              </Badge>
            )}
          </div>
          
          <div className="flex items-center space-x-1">
            {isEditing ? (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleSaveEdit(annotation)}
                  className="text-green-600 hover:text-green-700"
                >
                  <CheckIcon size={14} />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCancelEdit}
                  className="text-gray-600 hover:text-gray-700"
                >
                  <XIcon size={14} />
                </Button>
              </>
            ) : (
              <>
                {/* 只允许编辑人工标注和非检测类型的标注 */}
                {(annotation.source === 'human' || annotation.source === 'HUMAN_ANNOTATED') && 
                 annotation.type !== 'detection' && annotation.type !== 'OBJECT_DETECTION' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleStartEdit(annotation)}
                  >
                    <EditIcon size={14} />
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDeleteAnnotation(annotation.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <TrashIcon size={14} />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* 标注内容 */}
        <div className="space-y-2">
          {annotation.type === 'qa' && (
            <>
              {isEditing ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">问题:</label>
                    <Input
                      value={editForm.question}
                      onChange={(e) => setEditForm(prev => ({ ...prev, question: e.target.value }))}
                      placeholder="输入问题..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">答案:</label>
                    <Textarea
                      value={editForm.answer}
                      onChange={(e) => setEditForm(prev => ({ ...prev, answer: e.target.value }))}
                      placeholder="输入答案..."
                      rows={3}
                    />
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <label className="text-sm font-medium text-gray-700">问题:</label>
                    <p className="text-sm mt-1">{annotation.content.question}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">答案:</label>
                    <p className="text-sm mt-1 text-gray-600">{annotation.content.answer}</p>
                  </div>
                </>
              )}
            </>
          )}
          
          {annotation.type === 'caption' && (
            <>
              {isEditing ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">描述:</label>
                  <Textarea
                    value={editForm.caption}
                    onChange={(e) => setEditForm(prev => ({ ...prev, caption: e.target.value }))}
                    placeholder="输入描述内容..."
                    rows={4}
                  />
                </div>
              ) : (
                <div>
                  <label className="text-sm font-medium text-gray-700">描述:</label>
                  <p className="text-sm mt-1">{annotation.content.caption}</p>
                </div>
              )}
            </>
          )}
          
          {annotation.type === 'transcript' && (
            <>
              {isEditing ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">转录文本:</label>
                  <Textarea
                    value={editForm.transcript}
                    onChange={(e) => setEditForm(prev => ({ ...prev, transcript: e.target.value }))}
                    placeholder="输入转录文本..."
                    rows={4}
                  />
                </div>
              ) : (
                <div>
                  <label className="text-sm font-medium text-gray-700">转录文本:</label>
                  <p className="text-sm mt-1">{annotation.content.text}</p>
                  {annotation.timeRange && (
                    <p className="text-xs text-gray-500 mt-1">
                      时间: {formatTimeRange(annotation.timeRange)}
                    </p>
                  )}
                </div>
              )}
            </>
          )}
          
          {(annotation.type === 'detection' || annotation.type === 'OBJECT_DETECTION') && (
            <div>
              <label className="text-sm font-medium text-gray-700">检测对象:</label>
              <p className="text-sm mt-1 font-medium">{annotation.content?.label || annotation.category || '未知对象'}</p>
              {annotation.category && (
                <p className="text-xs text-gray-500 mt-1">
                  类别: {annotation.category}
                </p>
              )}
              {annotation.content?.description && (
                <p className="text-xs text-gray-500 mt-1">
                  描述: {annotation.content.description}
                </p>
              )}
              {annotation.region && (
                <>
                  <p className="text-xs text-gray-500 mt-1">
                    位置: {Math.round(annotation.region.x)}, {Math.round(annotation.region.y)} 
                    (尺寸: {Math.round(annotation.region.width)}×{Math.round(annotation.region.height)})
                  </p>
                  
                  {/* 可视化边界框 */}
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg border">
                    <div className="text-xs text-gray-600 mb-2 flex items-center">
                      <RectangleIcon size={12} className="mr-1" />
                      标注框预览
                    </div>
                    <div 
                      className="relative bg-white border-2 rounded mx-auto"
                      style={{
                        width: '120px',
                        height: '80px',
                        borderColor: annotation.source === 'ai' || annotation.source === 'AI_GENERATED' ? '#10b981' : '#f59e0b'
                      }}
                    >
                      <div 
                        className="absolute border-2 rounded"
                        style={{
                          borderColor: annotation.source === 'ai' || annotation.source === 'AI_GENERATED' ? '#10b981' : '#f59e0b',
                          backgroundColor: annotation.source === 'ai' || annotation.source === 'AI_GENERATED' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                          left: `${Math.min(80, Math.max(5, (annotation.region.x / Math.max(annotation.region.x + annotation.region.width, 1000)) * 100))}%`,
                          top: `${Math.min(60, Math.max(5, (annotation.region.y / Math.max(annotation.region.y + annotation.region.height, 1000)) * 70))}%`,
                          width: `${Math.min(35, Math.max(10, (annotation.region.width / Math.max(annotation.region.x + annotation.region.width, 1000)) * 100))}%`,
                          height: `${Math.min(25, Math.max(8, (annotation.region.height / Math.max(annotation.region.y + annotation.region.height, 1000)) * 70))}%`
                        }}
                      >
                        <div 
                          className="absolute -top-4 left-0 text-xs px-1 py-0 rounded text-white text-[10px] leading-3"
                          style={{
                            backgroundColor: annotation.source === 'ai' || annotation.source === 'AI_GENERATED' ? '#10b981' : '#f59e0b'
                          }}
                        >
                          {annotation.content?.label || annotation.category || '对象'}
                        </div>
                      </div>
                      <div className="absolute bottom-1 right-1 text-[10px] text-gray-400">
                        {annotation.source === 'ai' || annotation.source === 'AI_GENERATED' ? 'AI' : '人工'}
                      </div>
                    </div>
                    <div className="text-[10px] text-gray-500 mt-1 text-center">
                      {annotation.source === 'ai' || annotation.source === 'AI_GENERATED' ? 
                        '绿色框 = AI检测' : '橙色框 = 人工标注'}
                    </div>
                  </div>
                  
                  <div className="mt-2 p-2 bg-gray-100 rounded text-xs font-mono">
                    <div className="text-gray-600 mb-1">大模型训练格式:</div>
                    <div className="space-y-1">
                      <div className="break-all">
                        <strong>YOLO:</strong> {annotation.content?.label || annotation.category || 'object'} {((annotation.region.x + annotation.region.width/2)/1000).toFixed(6)} {((annotation.region.y + annotation.region.height/2)/1000).toFixed(6)} {(annotation.region.width/1000).toFixed(6)} {(annotation.region.height/1000).toFixed(6)}
                      </div>
                      <div className="break-all">
                        <strong>COCO:</strong> {JSON.stringify({
                          id: annotation.id,
                          category_id: 1, 
                          bbox: [annotation.region.x, annotation.region.y, annotation.region.width, annotation.region.height], 
                          area: annotation.region.width * annotation.region.height,
                          iscrowd: 0
                        })}
                      </div>
                      <div className="break-all">
                        <strong>Pascal VOC:</strong> &lt;bndbox&gt;&lt;xmin&gt;{Math.round(annotation.region.x)}&lt;/xmin&gt;&lt;ymin&gt;{Math.round(annotation.region.y)}&lt;/ymin&gt;&lt;xmax&gt;{Math.round(annotation.region.x + annotation.region.width)}&lt;/xmax&gt;&lt;ymax&gt;{Math.round(annotation.region.y + annotation.region.height)}&lt;/ymax&gt;&lt;/bndbox&gt;
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* 元数据 */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t text-xs text-gray-500">
          <div className="flex items-center space-x-1">
            <ClockIcon size={12} />
            <span>{formatTimestamp(annotation.timestamp)}</span>
          </div>
          {annotation.region && (
            <span>
              区域: {Math.round(annotation.region.x)}, {Math.round(annotation.region.y)}
            </span>
          )}
        </div>
      </Card>
    );
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="p-6 bg-white border-b">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            媒体标注 ({annotations.length})
          </h3>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="bg-green-50 text-green-700">
              人工: {annotations.filter(a => a.source === 'human' || a.source === 'HUMAN_ANNOTATED').length}
            </Badge>
            <Badge variant="outline" className="bg-blue-50 text-blue-700">
              AI: {annotations.filter(a => a.source === 'ai' || a.source === 'AI_GENERATED').length}
            </Badge>
            {/* 临时显示调试信息 */}
            <Badge variant="outline" className="bg-gray-50 text-gray-700">
              调试: 总计{annotations.length}条
            </Badge>
          </div>
        </div>

        {/* AI快速标注按钮 */}
        <div className="flex items-center space-x-2 mb-4">
          <Button
            disabled={true}
            className="bg-gray-400 hover:bg-gray-400 cursor-not-allowed"
            size="sm"
          >
            <BrainIcon size={16} className="mr-2" />
            AI问答（开发中）
          </Button>
          
          {fileData.file_category === 'image' && (
            <Button
              onClick={() => handleAIAssist('caption')}
              disabled={isProcessing}
              className="bg-green-500 hover:bg-green-600"
              size="sm"
            >
              <CaptionsIcon size={16} className="mr-2" />
              AI描述
            </Button>
          )}
          
          {fileData.file_category === 'video' && (
            <Button
              onClick={() => handleAIAssist('transcript')}
              disabled={isProcessing}
              className="bg-purple-500 hover:bg-purple-600"
              size="sm"
            >
              <MicIcon size={16} className="mr-2" />
              AI转录
            </Button>
          )}
          
          {/* 手工标注提示 */}
          <div className="flex-1 text-right">
            <span className="text-sm text-gray-600">
              💡 提示：可以在下方各标签页中手动添加和编辑标注
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="px-6 py-2 bg-white border-b">
            <TabsTrigger value="qa" className="flex items-center space-x-2">
              <MessageSquareIcon size={16} />
              <span>问答 ({groupedAnnotations.qa.length})</span>
            </TabsTrigger>
            <TabsTrigger value="caption" className="flex items-center space-x-2">
              <CaptionsIcon size={16} />
              <span>描述 ({groupedAnnotations.caption.length})</span>
            </TabsTrigger>
            <TabsTrigger value="transcript" className="flex items-center space-x-2">
              <MicIcon size={16} />
              <span>转录 ({groupedAnnotations.transcript.length})</span>
            </TabsTrigger>
            <TabsTrigger value="detection" className="flex items-center space-x-2">
              <MousePointerIcon size={16} />
              <span>检测 ({groupedAnnotations.detection.length})</span>
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto p-6">
            {/* 问答标注 */}
            <TabsContent value="qa" className="m-0 space-y-4">
              {/* 新增问答 */}
              <Card className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-blue-800">手工添加问答标注</h4>
                  <Badge variant="outline" className="bg-blue-100 text-blue-700">
                    <UserIcon size={12} className="mr-1" />
                    人工标注
                  </Badge>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">
                      问题 <span className="text-red-500">*</span>
                    </label>
                    <Input
                      value={newAnnotation.question}
                      onChange={(e) => setNewAnnotation(prev => ({
                        ...prev,
                        question: e.target.value
                      }))}
                      placeholder="例如：这张图片的主要内容是什么？"
                      className="focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      提示：尽量提出具体、明确的问题
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">
                      答案 <span className="text-red-500">*</span>
                    </label>
                    <Textarea
                      value={newAnnotation.answer}
                      onChange={(e) => setNewAnnotation(prev => ({
                        ...prev,
                        answer: e.target.value
                      }))}
                      placeholder="例如：这是一张展示城市夜景的照片，包含了高楼大厦和灯光效果..."
                      rows={4}
                      className="focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      提示：提供详细、准确的答案，这将用于训练和评估
                    </p>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <div className="text-xs text-gray-600">
                      字符统计: 问题 {newAnnotation.question.length} / 答案 {newAnnotation.answer.length}
                    </div>
                    <Button
                      onClick={handleCreateAnnotation}
                      disabled={!newAnnotation.question.trim() || !newAnnotation.answer.trim()}
                      className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300"
                    >
                      <PlusIcon size={16} className="mr-2" />
                      添加问答标注
                    </Button>
                  </div>
                </div>
              </Card>

              {/* 问答列表 */}
              <div className="space-y-3">
                {/* 操作提示 */}
                {groupedAnnotations.qa.length > 0 && (
                  <Card className="p-3 bg-gray-50 border-gray-200">
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">操作提示：</span>
                        <span>点击编辑按钮修改问答内容，点击删除按钮移除标注</span>
                      </div>
                      <div className="flex items-center space-x-4">
                        <Badge variant="outline" className="bg-green-50 text-green-700">
                          <UserIcon size={12} className="mr-1" />
                          人工: {groupedAnnotations.qa.filter(a => a.source === 'human' || a.source === 'HUMAN_ANNOTATED').length}
                        </Badge>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700">
                          <BotIcon size={12} className="mr-1" />
                          AI: {groupedAnnotations.qa.filter(a => a.source === 'ai' || a.source === 'AI_GENERATED').length}
                        </Badge>
                      </div>
                    </div>
                  </Card>
                )}

                {loading && (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-600">正在加载标注...</p>
                  </div>
                )}
                
                {!loading && groupedAnnotations.qa.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <MessageSquareIcon size={64} className="mx-auto mb-4 text-gray-300" />
                    <h4 className="text-lg font-medium mb-2">开始创建问答标注</h4>
                    <p className="mb-4 max-w-md mx-auto">
                      问答标注是训练多模态大模型的重要数据。您可以：
                    </p>
                    <div className="space-y-2 text-sm max-w-sm mx-auto">
                      <div className="flex items-center justify-start space-x-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span>手动添加具体、明确的问题和详细答案</span>
                      </div>
                      <div className="flex items-center justify-start space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>创建高质量的训练数据对</span>
                      </div>
                      <div className="flex items-center justify-start space-x-2">
                        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                        <span>支持编辑和完善现有标注</span>
                      </div>
                    </div>
                  </div>
                )}
                
                {groupedAnnotations.qa.map(annotation => (
                  <AnnotationCard key={annotation.id} annotation={annotation} />
                ))}
              </div>
            </TabsContent>

            {/* 描述标注 */}
            <TabsContent value="caption" className="m-0 space-y-4">
              {/* 新增描述 */}
              <Card className="p-4">
                <h4 className="font-medium mb-3">添加描述标注</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">描述内容</label>
                    <Textarea
                      value={newAnnotation.caption}
                      onChange={(e) => setNewAnnotation(prev => ({
                        ...prev,
                        caption: e.target.value
                      }))}
                      placeholder="输入描述内容..."
                      rows={4}
                    />
                  </div>
                  <Button
                    onClick={handleCreateAnnotation}
                    disabled={!newAnnotation.caption.trim()}
                    className="w-full"
                  >
                    <PlusIcon size={16} className="mr-2" />
                    添加描述
                  </Button>
                </div>
              </Card>

              {/* 描述列表 */}
              <div className="space-y-3">
                {!loading && groupedAnnotations.caption.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <CaptionsIcon size={48} className="mx-auto mb-4 text-gray-300" />
                    <p>暂无描述标注</p>
                    <p className="text-sm">开始添加描述或使用AI辅助生成</p>
                  </div>
                )}
                
                {groupedAnnotations.caption.map(annotation => (
                  <AnnotationCard key={annotation.id} annotation={annotation} />
                ))}
              </div>
            </TabsContent>

            {/* 转录标注 */}
            <TabsContent value="transcript" className="m-0 space-y-4">
              {/* 新增转录 */}
              <Card className="p-4">
                <h4 className="font-medium mb-3">添加转录标注</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">转录文本</label>
                    <Textarea
                      value={newAnnotation.transcript}
                      onChange={(e) => setNewAnnotation(prev => ({
                        ...prev,
                        transcript: e.target.value
                      }))}
                      placeholder="输入转录文本..."
                      rows={4}
                    />
                  </div>
                  <Button
                    onClick={handleCreateAnnotation}
                    disabled={!newAnnotation.transcript.trim()}
                    className="w-full"
                  >
                    <PlusIcon size={16} className="mr-2" />
                    添加转录
                  </Button>
                </div>
              </Card>

              {/* 转录列表 */}
              <div className="space-y-3">
                {!loading && groupedAnnotations.transcript.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <MicIcon size={48} className="mx-auto mb-4 text-gray-300" />
                    <p>暂无转录标注</p>
                    <p className="text-sm">开始添加转录或使用AI辅助生成</p>
                  </div>
                )}
                
                {groupedAnnotations.transcript.map(annotation => (
                  <AnnotationCard key={annotation.id} annotation={annotation} />
                ))}
              </div>
            </TabsContent>

            {/* 检测标注 */}
            <TabsContent value="detection" className="m-0 space-y-4">
              <Card className="p-4 bg-purple-50">
                <div className="text-center space-y-3">
                  <MousePointerIcon size={48} className="mx-auto text-purple-500" />
                  <h4 className="font-medium text-purple-800">AI对象检测</h4>
                  <p className="text-sm text-purple-600">
                    检测标注显示图片中识别到的对象及其位置信息，支持多种大模型训练格式导出。
                    可在预览页面手动选择区域或使用"对象检测"功能自动检测。
                  </p>
                </div>
              </Card>

              {/* 过滤器 */}
              {groupedAnnotations.detection.length > 0 && (
                <Card className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-800">标注过滤</h4>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <span>总计: {groupedAnnotations.detection.length}</span>
                      <span>•</span>
                      <span>显示: {filteredDetectionAnnotations.length}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant={detectionFilter === 'all' ? 'default' : 'outline'}
                      onClick={() => setDetectionFilter('all')}
                      className="text-xs"
                    >
                      全部 ({groupedAnnotations.detection.length})
                    </Button>
                    <Button
                      size="sm"
                      variant={detectionFilter === 'human' ? 'default' : 'outline'}
                      onClick={() => setDetectionFilter('human')}
                      className={`text-xs ${detectionFilter === 'human' ? 'bg-orange-500 hover:bg-orange-600' : 'border-orange-300 text-orange-600 hover:bg-orange-50'}`}
                    >
                      <UserIcon size={12} className="mr-1" />
                      人工 ({groupedAnnotations.detection.filter(a => a.source === 'human' || a.source === 'HUMAN_ANNOTATED').length})
                    </Button>
                    <Button
                      size="sm"
                      variant={detectionFilter === 'ai' ? 'default' : 'outline'}
                      onClick={() => setDetectionFilter('ai')}
                      className={`text-xs ${detectionFilter === 'ai' ? 'bg-green-500 hover:bg-green-600' : 'border-green-300 text-green-600 hover:bg-green-50'}`}
                    >
                      <BotIcon size={12} className="mr-1" />
                      AI ({groupedAnnotations.detection.filter(a => a.source === 'ai' || a.source === 'AI_GENERATED').length})
                    </Button>
                  </div>
                </Card>
              )}

              {/* 检测标注列表 */}
              <div className="space-y-3">
                {!loading && groupedAnnotations.detection.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <MousePointerIcon size={48} className="mx-auto mb-4 text-gray-300" />
                    <p>暂无检测标注</p>
                    <p className="text-sm">在预览页面使用AI对象检测功能</p>
                  </div>
                )}
                
                {!loading && filteredDetectionAnnotations.length === 0 && groupedAnnotations.detection.length > 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <MousePointerIcon size={48} className="mx-auto mb-4 text-gray-300" />
                    <p>当前过滤条件下无标注</p>
                    <p className="text-sm">尝试更改过滤条件</p>
                  </div>
                )}
                
                {filteredDetectionAnnotations.map(annotation => (
                  <AnnotationCard key={annotation.id} annotation={annotation} />
                ))}
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
};