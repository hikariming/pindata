import React, { useState, useEffect } from 'react';
import { MediaAnnotation } from './MediaAnnotation';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Loader2, Sparkles } from 'lucide-react';
import { annotationService, AnnotationData, AIAnnotationRequest } from '../../services/annotation.service';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Textarea } from '../ui/textarea';

interface MediaAnnotationContainerProps {
  fileId: string;
  fileType: 'image' | 'video';
  fileUrl: string;
  onClose: () => void;
}

export const MediaAnnotationContainer: React.FC<MediaAnnotationContainerProps> = ({
  fileId,
  fileType,
  fileUrl,
  onClose
}) => {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  const [isAILoading, setIsAILoading] = useState(false);
  const [annotations, setAnnotations] = useState<AnnotationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAIDialog, setShowAIDialog] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [activeAnnotationType, setActiveAnnotationType] = useState<'qa' | 'caption' | 'transcript'>('qa');

  useEffect(() => {
    loadAnnotations();
  }, [fileId]);

  const loadAnnotations = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await annotationService.getAnnotations(fileId);
      setAnnotations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      toast.error(t('error.loadAnnotationsFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (newAnnotations: AnnotationData) => {
    try {
      await annotationService.saveAnnotations(fileId, newAnnotations);
      setAnnotations(newAnnotations);
      toast.success(t('success.annotationsSaved'));
      onClose();
    } catch (err) {
      toast.error(t('error.saveAnnotationsFailed'));
    }
  };

  const handleAIAssist = async () => {
    if (!aiPrompt.trim()) return;

    setIsAILoading(true);
    try {
      const request: AIAnnotationRequest = {
        fileId,
        fileType,
        annotationType: activeAnnotationType,
        prompt: aiPrompt.trim()
      };

      const response = await annotationService.getAIAssistedAnnotations(request);
      
      setAnnotations(prev => ({
        ...prev,
        ...response.annotations
      }));

      toast.success(t('success.aiAnnotationsGenerated', { confidence: response.confidence }));

      setShowAIDialog(false);
      setAiPrompt('');
    } catch (err) {
      toast.error(t('error.aiAnnotationsFailed'));
    } finally {
      setIsAILoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <span className="text-red-700">{error}</span>
          </div>
          <button
            onClick={loadAnnotations}
            className="text-red-600 hover:text-red-800 underline text-sm"
          >
            {t('common.retry')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button
          variant="outline"
          onClick={() => setShowAIDialog(true)}
          disabled={isAILoading}
        >
          {isAILoading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4 mr-2" />
          )}
          {t('annotation.aiAssist')}
        </Button>
      </div>

      <MediaAnnotation
        fileId={fileId}
        fileType={fileType}
        fileUrl={fileUrl}
        initialAnnotations={annotations}
        onSave={handleSave}
        onCancel={onClose}
        onAnnotationTypeChange={setActiveAnnotationType}
      />

      <Dialog open={showAIDialog} onOpenChange={setShowAIDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('annotation.aiAssistTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                {t('annotation.aiPrompt')}
              </label>
              <Textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder={t('annotation.aiPromptPlaceholder')}
                className="h-32"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowAIDialog(false)}
                disabled={isAILoading}
              >
                {t('common.cancel')}
              </Button>
              <Button
                onClick={handleAIAssist}
                disabled={!aiPrompt.trim() || isAILoading}
              >
                {isAILoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-2" />
                )}
                {t('annotation.generate')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}; 