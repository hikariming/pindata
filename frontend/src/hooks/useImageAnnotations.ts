import { useState, useEffect, useCallback } from 'react';
import { imageAnnotationService } from '../services/image-annotation.service';
import { ImageAnnotation, ImageAnnotationType, AnnotationSource } from '../types/annotation';

interface UseImageAnnotationsOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export const useImageAnnotations = (
  fileId: string, 
  options: UseImageAnnotationsOptions = {}
) => {
  const [annotations, setAnnotations] = useState<ImageAnnotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);

  const fetchAnnotations = useCallback(async () => {
    if (!fileId) {
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const annotationList = await imageAnnotationService.getFileAnnotations(fileId);
      setAnnotations(annotationList);
      
      // 同时获取统计信息
      const annotationStats = await imageAnnotationService.getAnnotationStats(fileId);
      setStats(annotationStats);
    } catch (err: any) {
      console.error('获取图片标注失败:', err);
      setError(err.message || '获取图片标注失败');
    } finally {
      setLoading(false);
    }
  }, [fileId]);

  const createAnnotation = useCallback(async (
    annotation: Omit<ImageAnnotation, 'id' | 'created_at' | 'updated_at'>
  ): Promise<ImageAnnotation> => {
    try {
      const newAnnotation = await imageAnnotationService.createImageAnnotation(annotation);
      setAnnotations(prev => [...prev, newAnnotation]);
      
      // 更新统计信息
      const annotationStats = await imageAnnotationService.getAnnotationStats(fileId);
      setStats(annotationStats);
      
      return newAnnotation;
    } catch (err: any) {
      console.error('创建图片标注失败:', err);
      throw err;
    }
  }, [fileId]);

  const updateAnnotation = useCallback(async (
    annotationId: string, 
    updates: Partial<ImageAnnotation>
  ): Promise<ImageAnnotation> => {
    try {
      const updatedAnnotation = await imageAnnotationService.updateImageAnnotation(
        annotationId, 
        updates
      );
      
      setAnnotations(prev => 
        prev.map(annotation => 
          annotation.id === annotationId 
            ? { ...annotation, ...updatedAnnotation }
            : annotation
        )
      );
      
      return updatedAnnotation;
    } catch (err: any) {
      console.error('更新图片标注失败:', err);
      throw err;
    }
  }, []);

  const deleteAnnotation = useCallback(async (
    annotationId: string,
    deletedBy?: string
  ): Promise<void> => {
    try {
      await imageAnnotationService.deleteImageAnnotation(annotationId, deletedBy);
      setAnnotations(prev => prev.filter(annotation => annotation.id !== annotationId));
      
      // 更新统计信息
      const annotationStats = await imageAnnotationService.getAnnotationStats(fileId);
      setStats(annotationStats);
    } catch (err: any) {
      console.error('删除图片标注失败:', err);
      throw err;
    }
  }, [fileId]);

  const generateAIAnnotation = useCallback(async (
    type: 'qa' | 'caption' | 'object_detection',
    options: any = {}
  ): Promise<ImageAnnotation> => {
    try {
      let newAnnotation: ImageAnnotation;
      
      switch (type) {
        case 'qa':
          newAnnotation = await imageAnnotationService.generateQAAnnotation(fileId, options);
          break;
        case 'caption':
          newAnnotation = await imageAnnotationService.generateCaptionAnnotation(fileId, options);
          break;
        case 'object_detection':
          newAnnotation = await imageAnnotationService.generateObjectDetectionAnnotation(fileId);
          break;
        default:
          throw new Error(`不支持的AI标注类型: ${type}`);
      }
      
      setAnnotations(prev => [...prev, newAnnotation]);
      
      // 更新统计信息
      const annotationStats = await imageAnnotationService.getAnnotationStats(fileId);
      setStats(annotationStats);
      
      return newAnnotation;
    } catch (err: any) {
      console.error('AI标注生成失败:', err);
      throw err;
    }
  }, [fileId]);

  const reviewAnnotation = useCallback(async (
    annotationId: string,
    reviewStatus: 'approved' | 'rejected',
    reviewComments?: string,
    reviewerId?: string
  ): Promise<ImageAnnotation> => {
    try {
      const reviewedAnnotation = await imageAnnotationService.reviewAnnotation(annotationId, {
        review_status: reviewStatus,
        review_comments: reviewComments,
        reviewer_id: reviewerId || 'current_user' // 这里应该从用户上下文获取
      });
      
      setAnnotations(prev => 
        prev.map(annotation => 
          annotation.id === annotationId 
            ? reviewedAnnotation
            : annotation
        )
      );
      
      return reviewedAnnotation;
    } catch (err: any) {
      console.error('标注审核失败:', err);
      throw err;
    }
  }, []);

  const exportAnnotations = useCallback(async (
    format: 'json' | 'coco' | 'yolo' | 'pascal_voc' | 'labelme' | 'csv',
    filters?: {
      type?: string;
      source?: string;
      review_status?: string;
    }
  ) => {
    try {
      const exportResult = await imageAnnotationService.exportAnnotations({
        format,
        file_ids: [fileId],
        filter: filters
      });
      
      return exportResult;
    } catch (err: any) {
      console.error('导出标注失败:', err);
      throw err;
    }
  }, [fileId]);

  const createQuickAnnotation = useCallback(async (
    type: ImageAnnotationType,
    content: any,
    source: AnnotationSource = 'HUMAN'
  ): Promise<ImageAnnotation> => {
    try {
      const annotation = await imageAnnotationService.createQuickAnnotation(
        fileId, 
        type, 
        content, 
        source
      );
      
      setAnnotations(prev => [...prev, annotation]);
      return annotation;
    } catch (err: any) {
      console.error('快速标注失败:', err);
      throw err;
    }
  }, [fileId]);

  // 按类型分组的标注
  const groupedAnnotations = useCallback(() => {
    return {
      qa: annotations.filter(a => a.type === 'QA'),
      caption: annotations.filter(a => a.type === 'CAPTION'),
      classification: annotations.filter(a => a.type === 'CLASSIFICATION'),
      object_detection: annotations.filter(a => a.type === 'OBJECT_DETECTION'),
      segmentation: annotations.filter(a => a.type === 'SEGMENTATION'),
      keypoint: annotations.filter(a => a.type === 'KEYPOINT'),
      ocr: annotations.filter(a => a.type === 'OCR'),
      custom: annotations.filter(a => a.type === 'CUSTOM')
    };
  }, [annotations]);

  // 按来源分组的标注
  const annotationsBySource = useCallback(() => {
    return {
      human: annotations.filter(a => a.source === 'HUMAN'),
      ai: annotations.filter(a => a.source === 'AI'),
      detection: annotations.filter(a => a.source === 'DETECTION'),
      imported: annotations.filter(a => a.source === 'IMPORTED')
    };
  }, [annotations]);

  // 自动刷新
  useEffect(() => {
    if (options.autoRefresh && options.refreshInterval) {
      const interval = setInterval(fetchAnnotations, options.refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchAnnotations, options.autoRefresh, options.refreshInterval]);

  useEffect(() => {
    fetchAnnotations();
  }, [fetchAnnotations]);

  return {
    // 数据
    annotations,
    groupedAnnotations: groupedAnnotations(),
    annotationsBySource: annotationsBySource(),
    stats,
    loading,
    error,
    
    // 操作方法
    createAnnotation,
    updateAnnotation,
    deleteAnnotation,
    generateAIAnnotation,
    reviewAnnotation,
    exportAnnotations,
    createQuickAnnotation,
    refreshAnnotations: fetchAnnotations,
    
    // 工具方法
    getAnnotationById: (id: string) => annotations.find(a => a.id === id),
    getAnnotationsByType: (type: ImageAnnotationType) => annotations.filter(a => a.type === type),
    getAnnotationsBySource: (source: AnnotationSource) => annotations.filter(a => a.source === source),
  };
}; 