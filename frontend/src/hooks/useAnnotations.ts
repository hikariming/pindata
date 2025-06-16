import { useState, useEffect } from 'react';
import { annotationService, UnifiedAnnotation } from '../services/annotation.service';

export const useAnnotations = (fileId: string, fileType?: string) => {
  const [annotations, setAnnotations] = useState<UnifiedAnnotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnnotations = async () => {
    if (!fileId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await annotationService.getAnnotations(fileId);
      setAnnotations(response.data || []);
    } catch (err: any) {
      console.error('获取标注失败:', err);
      setError(err.message || '获取标注失败');
    } finally {
      setLoading(false);
    }
  };

  const createAnnotation = async (annotation: Omit<UnifiedAnnotation, 'id' | 'timestamp'>) => {
    try {
      const response = await annotationService.createAnnotation(fileId, annotation);
      setAnnotations(prev => [...prev, response.data]);
      return response.data;
    } catch (err: any) {
      console.error('创建标注失败:', err);
      throw err;
    }
  };

  const updateAnnotation = async (annotationId: string, updates: Partial<UnifiedAnnotation>) => {
    try {
      const response = await annotationService.updateAnnotation(annotationId, updates);
      setAnnotations(prev => 
        prev.map(annotation => 
          annotation.id === annotationId 
            ? { ...annotation, ...updates }
            : annotation
        )
      );
      return response.data;
    } catch (err: any) {
      console.error('更新标注失败:', err);
      throw err;
    }
  };

  const deleteAnnotation = async (annotationId: string) => {
    try {
      await annotationService.deleteAnnotation(annotationId);
      setAnnotations(prev => prev.filter(annotation => annotation.id !== annotationId));
    } catch (err: any) {
      console.error('删除标注失败:', err);
      throw err;
    }
  };

  const requestAIAnnotation = async (type: string, options?: any) => {
    try {
      const response = await annotationService.requestAIAnnotation(fileId, type, options);
      
      // 如果AI返回了标注数据，添加到列表中
      if (response.data?.annotation_data) {
        const aiAnnotations = response.data.annotation_data;
        
        // 根据不同类型处理AI返回的数据
        if (type === 'qa' && aiAnnotations.qa_pairs) {
          const newAnnotations = aiAnnotations.qa_pairs.map((qa: any, index: number) => ({
            id: `ai_${Date.now()}_${index}`,
            type: 'qa' as const,
            content: {
              question: qa.question,
              answer: qa.answer
            },
            source: 'ai' as const,
            confidence: qa.confidence,
            timestamp: new Date().toISOString()
          }));
          setAnnotations(prev => [...prev, ...newAnnotations]);
        } else if (type === 'caption' && aiAnnotations.caption) {
          const newAnnotation = {
            id: `ai_${Date.now()}`,
            type: 'caption' as const,
            content: {
              caption: aiAnnotations.caption
            },
            source: 'ai' as const,
            confidence: aiAnnotations.confidence,
            timestamp: new Date().toISOString()
          };
          setAnnotations(prev => [...prev, newAnnotation]);
        } else if (type === 'transcript' && aiAnnotations.transcript_segments) {
          const newAnnotations = aiAnnotations.transcript_segments.map((segment: any, index: number) => ({
            id: `ai_transcript_${Date.now()}_${index}`,
            type: 'transcript' as const,
            content: {
              text: segment.text
            },
            source: 'ai' as const,
            confidence: segment.confidence,
            timeRange: {
              start: segment.start_time,
              end: segment.end_time
            },
            timestamp: new Date().toISOString()
          }));
          setAnnotations(prev => [...prev, ...newAnnotations]);
        }
      }
      
      return response.data;
    } catch (err: any) {
      console.error('AI标注请求失败:', err);
      throw err;
    }
  };

  useEffect(() => {
    fetchAnnotations();
  }, [fileId]);

  return {
    annotations,
    loading,
    error,
    createAnnotation,
    updateAnnotation,
    deleteAnnotation,
    requestAIAnnotation,
    refreshAnnotations: fetchAnnotations
  };
};