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
  BotIcon
} from 'lucide-react';

interface Annotation {
  id: string;
  type: 'qa' | 'caption' | 'transcript';
  content: any;
  source: 'human' | 'ai';
  confidence?: number;
  timestamp: string;
  region?: any;
  timeRange?: { start: number; end: number };
}

interface MediaAnnotationPanelProps {
  fileData: any;
  annotations: Annotation[];
  loading: boolean;
  onCreateAnnotation: (annotation: Omit<Annotation, 'id' | 'timestamp'>) => Promise<void>;
  onUpdateAnnotation: (id: string, updates: Partial<Annotation>) => Promise<void>;
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
  const [activeTab, setActiveTab] = useState('qa');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newAnnotation, setNewAnnotation] = useState({
    type: 'qa' as const,
    question: '',
    answer: '',
    caption: '',
    transcript: ''
  });

  const groupedAnnotations = {
    qa: annotations.filter(a => a.type === 'qa'),
    caption: annotations.filter(a => a.type === 'caption'),
    transcript: annotations.filter(a => a.type === 'transcript')
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
    }

    try {
      await onCreateAnnotation({
        type: activeTab as 'qa' | 'caption' | 'transcript',
        content,
        source: 'human'
      });

      // 清空表单
      setNewAnnotation({
        type: activeTab as const,
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

  const AnnotationCard: React.FC<{ annotation: Annotation; showType?: boolean }> = ({ 
    annotation, 
    showType = false 
  }) => (
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
            variant={annotation.source === 'ai' ? 'default' : 'outline'}
            className={annotation.source === 'ai' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}
          >
            {annotation.source === 'ai' ? (
              <><BotIcon size={12} className="mr-1" />AI</>
            ) : (
              <><UserIcon size={12} className="mr-1" />人工</>
            )}
          </Badge>
          {annotation.confidence && (
            <Badge variant="secondary" className="text-xs">
              {Math.round(annotation.confidence * 100)}%
            </Badge>
          )}
        </div>
        
        <div className="flex items-center space-x-1">
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
            onClick={() => onDeleteAnnotation(annotation.id)}
            className="text-red-600 hover:text-red-700"
          >
            <TrashIcon size={14} />
          </Button>
        </div>
      </div>

      {/* 标注内容 */}
      <div className="space-y-2">
        {annotation.type === 'qa' && (
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
        
        {annotation.type === 'caption' && (
          <div>
            <label className="text-sm font-medium text-gray-700">描述:</label>
            <p className="text-sm mt-1">{annotation.content.caption}</p>
          </div>
        )}
        
        {annotation.type === 'transcript' && (
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

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="p-6 bg-white border-b">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            媒体标注 ({annotations.length})
          </h3>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="bg-green-50 text-green-700">
              人工: {annotations.filter(a => a.source === 'human').length}
            </Badge>
            <Badge variant="outline" className="bg-blue-50 text-blue-700">
              AI: {annotations.filter(a => a.source === 'ai').length}
            </Badge>
          </div>
        </div>

        {/* AI快速标注按钮 */}
        <div className="flex items-center space-x-2 mb-4">
          <Button
            onClick={() => handleAIAssist('qa')}
            disabled={isProcessing}
            className="bg-blue-500 hover:bg-blue-600"
            size="sm"
          >
            <BrainIcon size={16} className="mr-2" />
            {isProcessing ? 'AI处理中...' : 'AI问答'}
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
          </TabsList>

          <div className="flex-1 overflow-y-auto p-6">
            {/* 问答标注 */}
            <TabsContent value="qa" className="m-0 space-y-4">
              {/* 新增问答 */}
              <Card className="p-4">
                <h4 className="font-medium mb-3">添加问答标注</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">问题</label>
                    <Input
                      value={newAnnotation.question}
                      onChange={(e) => setNewAnnotation(prev => ({
                        ...prev,
                        question: e.target.value
                      }))}
                      placeholder="输入问题..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">答案</label>
                    <Textarea
                      value={newAnnotation.answer}
                      onChange={(e) => setNewAnnotation(prev => ({
                        ...prev,
                        answer: e.target.value
                      }))}
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
                    添加问答
                  </Button>
                </div>
              </Card>

              {/* 问答列表 */}
              <div className="space-y-3">
                {loading && (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-600">正在加载标注...</p>
                  </div>
                )}
                
                {!loading && groupedAnnotations.qa.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <MessageSquareIcon size={48} className="mx-auto mb-4 text-gray-300" />
                    <p>暂无问答标注</p>
                    <p className="text-sm">开始添加问答或使用AI辅助生成</p>
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
          </div>
        </Tabs>
      </div>
    </div>
  );
};