import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import { Input } from '../ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  ImageIcon,
  VideoIcon,
  MessageSquareIcon,
  CheckCircleIcon,
  XCircleIcon,
  Loader2Icon
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface MediaAnnotationProps {
  fileId: string;
  fileType: 'image' | 'video';
  fileUrl: string;
  initialAnnotations?: {
    qa?: Array<{
      question: string;
      answer: string;
      confidence?: number;
    }>;
    caption?: string;
    transcript?: string;
  };
  onSave: (annotations: any) => Promise<void>;
  onCancel: () => void;
  onAnnotationTypeChange?: (type: 'qa' | 'caption' | 'transcript') => void;
}

export const MediaAnnotation: React.FC<MediaAnnotationProps> = ({
  fileId,
  fileType,
  fileUrl,
  initialAnnotations = {},
  onSave,
  onCancel,
  onAnnotationTypeChange
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'qa' | 'caption' | 'transcript'>('qa');
  const [isSaving, setIsSaving] = useState(false);
  const [annotations, setAnnotations] = useState(initialAnnotations);
  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState('');

  useEffect(() => {
    onAnnotationTypeChange?.(activeTab);
  }, [activeTab, onAnnotationTypeChange]);

  const handleAddQA = () => {
    if (!newQuestion.trim() || !newAnswer.trim()) return;
    
    setAnnotations(prev => ({
      ...prev,
      qa: [
        ...(prev.qa || []),
        {
          question: newQuestion.trim(),
          answer: newAnswer.trim()
        }
      ]
    }));
    
    setNewQuestion('');
    setNewAnswer('');
  };

  const handleRemoveQA = (index: number) => {
    setAnnotations(prev => ({
      ...prev,
      qa: prev.qa?.filter((_, i) => i !== index)
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(annotations);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">
          {fileType === 'image' ? t('annotation.imageAnnotation') : t('annotation.videoAnnotation')}
        </h3>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isSaving}
          >
            <XCircleIcon className="w-4 h-4 mr-2" />
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <CheckCircleIcon className="w-4 h-4 mr-2" />
            )}
            {t('common.save')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 媒体预览 */}
        <div className="space-y-4">
          <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
            {fileType === 'image' ? (
              <img
                src={fileUrl}
                alt="Preview"
                className="w-full h-full object-contain"
              />
            ) : (
              <video
                src={fileUrl}
                controls
                className="w-full h-full"
              />
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            {fileType === 'image' ? (
              <ImageIcon className="w-4 h-4" />
            ) : (
              <VideoIcon className="w-4 h-4" />
            )}
            <span>{fileId}</span>
          </div>
        </div>

        {/* 标注内容 */}
        <div>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="qa">
                <MessageSquareIcon className="w-4 h-4 mr-2" />
                {t('annotation.qa')}
              </TabsTrigger>
              <TabsTrigger value="caption">
                <ImageIcon className="w-4 h-4 mr-2" />
                {t('annotation.caption')}
              </TabsTrigger>
              {fileType === 'video' && (
                <TabsTrigger value="transcript">
                  <VideoIcon className="w-4 h-4 mr-2" />
                  {t('annotation.transcript')}
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="qa" className="space-y-4">
              {/* 问答列表 */}
              <div className="space-y-4">
                {annotations.qa?.map((qa, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <Badge variant="secondary">{t('annotation.question')}</Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveQA(index)}
                      >
                        <XCircleIcon className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-sm mb-2">{qa.question}</p>
                    <Badge variant="outline" className="mb-2">{t('annotation.answer')}</Badge>
                    <p className="text-sm">{qa.answer}</p>
                    {qa.confidence !== undefined && (
                      <div className="mt-2 text-xs text-gray-500">
                        {t('annotation.confidence')}: {qa.confidence.toFixed(2)}
                      </div>
                    )}
                  </Card>
                ))}
              </div>

              {/* 添加新问答 */}
              <Card className="p-4">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      {t('annotation.newQuestion')}
                    </label>
                    <Input
                      value={newQuestion}
                      onChange={(e) => setNewQuestion(e.target.value)}
                      placeholder={t('annotation.questionPlaceholder')}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      {t('annotation.newAnswer')}
                    </label>
                    <Textarea
                      value={newAnswer}
                      onChange={(e) => setNewAnswer(e.target.value)}
                      placeholder={t('annotation.answerPlaceholder')}
                    />
                  </div>
                  <Button
                    onClick={handleAddQA}
                    disabled={!newQuestion.trim() || !newAnswer.trim()}
                  >
                    {t('annotation.addQA')}
                  </Button>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="caption">
              <Card className="p-4">
                <label className="text-sm font-medium mb-2 block">
                  {t('annotation.caption')}
                </label>
                <Textarea
                  value={annotations.caption || ''}
                  onChange={(e) => setAnnotations(prev => ({
                    ...prev,
                    caption: e.target.value
                  }))}
                  placeholder={t('annotation.captionPlaceholder')}
                  className="h-32"
                />
              </Card>
            </TabsContent>

            {fileType === 'video' && (
              <TabsContent value="transcript">
                <Card className="p-4">
                  <label className="text-sm font-medium mb-2 block">
                    {t('annotation.transcript')}
                  </label>
                  <Textarea
                    value={annotations.transcript || ''}
                    onChange={(e) => setAnnotations(prev => ({
                      ...prev,
                      transcript: e.target.value
                    }))}
                    placeholder={t('annotation.transcriptPlaceholder')}
                    className="h-64"
                  />
                </Card>
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>
    </Card>
  );
}; 