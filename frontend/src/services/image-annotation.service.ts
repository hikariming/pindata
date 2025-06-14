import { apiClient } from '../lib/api-client';
import { ApiResponse } from '../types/api';
import { 
  ImageAnnotation, 
  ImageAnnotationType, 
  AnnotationSource, 
  BatchAnnotationRequest,
  AnnotationExportFormat,
  AnnotationStats 
} from '../types/annotation';

export class ImageAnnotationService {
  /**
   * 获取图片标注列表
   */
  static async getImageAnnotations(params: {
    file_id?: string;
    type?: ImageAnnotationType;
    source?: AnnotationSource;
    category?: string;
    review_status?: string;
    page?: number;
    per_page?: number;
  } = {}): Promise<{
    annotations: ImageAnnotation[];
    pagination: {
      page: number;
      per_page: number;
      total: number;
      pages: number;
      has_next: boolean;
      has_prev: boolean;
    };
  }> {
    try {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });

      const response = await apiClient.get<{
        annotations: ImageAnnotation[];
        pagination: {
          page: number;
          per_page: number;
          total: number;
          pages: number;
          has_next: boolean;
          has_prev: boolean;
        };
      }>(`/api/v1/image-annotations?${queryParams.toString()}`);

      return response || { 
        annotations: [], 
        pagination: {
          page: 1,
          per_page: 20,
          total: 0,
          pages: 0,
          has_next: false,
          has_prev: false
        }
      };
    } catch (error) {
      console.error('获取图片标注失败:', error);
      return { 
        annotations: [], 
        pagination: {
          page: 1,
          per_page: 20,
          total: 0,
          pages: 0,
          has_next: false,
          has_prev: false
        }
      };
    }
  }

  /**
   * 获取特定文件的标注
   */
  static async getFileAnnotations(fileId: string): Promise<ImageAnnotation[]> {
    const result = await this.getImageAnnotations({ file_id: fileId });
    return result.annotations;
  }

  /**
   * 创建图片标注
   */
  static async createImageAnnotation(annotation: Omit<ImageAnnotation, 'id' | 'created_at' | 'updated_at'>): Promise<ImageAnnotation> {
    try {
      const response = await apiClient.post<any>(
        '/api/v1/image-annotations',
        annotation
      );
      // 后端直接返回 { annotation: {...}, message: "..." } 格式
      const annotationResponse = response.annotation;
      if (!annotationResponse) {
        console.error('响应数据:', response);
        throw new Error('创建标注响应格式错误');
      }
      return annotationResponse;
    } catch (error) {
      console.error('创建图片标注失败:', error);
      throw error;
    }
  }

  /**
   * 更新图片标注
   */
  static async updateImageAnnotation(
    annotationId: string, 
    updates: Partial<ImageAnnotation>
  ): Promise<ImageAnnotation> {
    try {
      const response = await apiClient.put<ApiResponse<{ annotation: ImageAnnotation }>>(
        `/api/v1/image-annotations/${annotationId}`,
        updates
      );
      if (!response.data?.annotation) {
        throw new Error('更新标注响应格式错误');
      }
      return response.data.annotation;
    } catch (error) {
      console.error('更新图片标注失败:', error);
      throw error;
    }
  }

  /**
   * 删除图片标注
   */
  static async deleteImageAnnotation(annotationId: string, deletedBy?: string): Promise<void> {
    try {
      // 发送DELETE请求，包含删除人信息
      await apiClient.delete(`/api/v1/image-annotations/${annotationId}`, {
        deleted_by: deletedBy || 'user'
      });
    } catch (error) {
      console.error('删除图片标注失败:', error);
      throw error;
    }
  }

  /**
   * 获取标注详情
   */
  static async getAnnotationDetail(annotationId: string): Promise<ImageAnnotation> {
    try {
      const response = await apiClient.get<ApiResponse<ImageAnnotation>>(
        `/api/v1/image-annotations/${annotationId}`
      );
      if (!response.data) {
        throw new Error('标注不存在');
      }
      return response.data;
    } catch (error) {
      console.error('获取标注详情失败:', error);
      throw error;
    }
  }

  /**
   * 批量创建标注
   */
  static async createBatchAnnotations(request: BatchAnnotationRequest): Promise<{
    created: ImageAnnotation[];
    failed: Array<{ index: number; error: string; data: any }>;
  }> {
    try {
      const response = await apiClient.post<ApiResponse<{
        created: ImageAnnotation[];
        failed: Array<{ index: number; error: string; data: any }>;
      }>>('/api/v1/image-annotations/batch', request);
      
      return response.data || { created: [], failed: [] };
    } catch (error) {
      console.error('批量创建标注失败:', error);
      throw error;
    }
  }

  /**
   * 审核标注
   */
  static async reviewAnnotation(
    annotationId: string,
    reviewData: {
      review_status: 'approved' | 'rejected';
      review_comments?: string;
      reviewer_id: string;
    }
  ): Promise<ImageAnnotation> {
    try {
      const response = await apiClient.post<ApiResponse<{ annotation: ImageAnnotation }>>(
        `/api/v1/image-annotations/${annotationId}/review`,
        reviewData
      );
      if (!response.data?.annotation) {
        throw new Error('审核标注响应格式错误');
      }
      return response.data.annotation;
    } catch (error) {
      console.error('审核标注失败:', error);
      throw error;
    }
  }

  /**
   * 获取标注统计
   */
  static async getAnnotationStats(fileId: string): Promise<AnnotationStats> {
    try {
      const response = await apiClient.get<AnnotationStats>(
        `/api/v1/files/${fileId}/annotations/stats`
      );
      return response || {
        total_annotations: 0,
        by_type: {} as Record<ImageAnnotationType, number>,
        by_source: {} as Record<AnnotationSource, number>,
        avg_confidence: 0,
        completion_rate: 0
      };
    } catch (error) {
      console.error('获取标注统计失败:', error);
      return {
        total_annotations: 0,
        by_type: {} as Record<ImageAnnotationType, number>,
        by_source: {} as Record<AnnotationSource, number>,
        avg_confidence: 0,
        completion_rate: 0
      };
    }
  }

  /**
   * 导出标注数据
   */
  static async exportAnnotations(exportRequest: {
    format: AnnotationExportFormat;
    file_ids?: string[];
    filter?: {
      type?: string;
      source?: string;
      review_status?: string;
    };
  }): Promise<{
    format: string;
    count: number;
    data: any;
  }> {
    try {
      const response = await apiClient.post<ApiResponse<{
        format: string;
        count: number;
        data: any;
      }>>('/api/v1/image-annotations/export', exportRequest);
      
      return response.data || { format: exportRequest.format, count: 0, data: null };
    } catch (error) {
      console.error('导出标注失败:', error);
      throw error;
    }
  }

  /**
   * AI辅助标注 - 问答
   */
  static async generateQAAnnotation(
    fileId: string,
    options: {
      questions?: string[];
      model_provider?: 'openai' | 'anthropic' | 'google';
    } = {}
  ): Promise<ImageAnnotation> {
    try {
      // 调用AI生成问答标注
      const aiResponse = await apiClient.post<ApiResponse<{
        qa_pairs: Array<{
          question: string;
          answer: string;
          confidence: number;
        }>;
        metadata: any;
      }>>('/api/v1/annotations/ai-assist/image-qa', {
        raw_data_id: fileId,
        questions: options.questions,
        model_provider: options.model_provider || 'openai'
      });

      if (!aiResponse.data?.qa_pairs?.[0]) {
        throw new Error('AI问答生成失败');
      }

      // 将AI生成的结果转换为标注格式并保存
      const annotation = await this.createImageAnnotation({
        file_id: fileId,
        type: 'QA',
        source: 'AI',
        content: {
          question: aiResponse.data.qa_pairs[0].question,
          answer: aiResponse.data.qa_pairs[0].answer
        },
        confidence: aiResponse.data.qa_pairs[0].confidence,
        metadata: aiResponse.data.metadata,
        created_by: 'ai_system'
      });

      return annotation;
    } catch (error) {
      console.error('AI问答标注失败:', error);
      throw error;
    }
  }

  /**
   * AI辅助标注 - 图片描述
   */
  static async generateCaptionAnnotation(
    fileId: string,
    options: {
      model_provider?: 'openai' | 'anthropic' | 'google';
    } = {}
  ): Promise<ImageAnnotation> {
    try {
      // 调用AI生成图片描述
      const aiResponse = await apiClient.post<ApiResponse<{
        caption: string;
        confidence: number;
        metadata: any;
      }>>('/api/v1/annotations/ai-assist/image-caption', {
        raw_data_id: fileId,
        model_provider: options.model_provider || 'openai'
      });

      if (!aiResponse.data?.caption) {
        throw new Error('AI描述生成失败');
      }

      // 将AI生成的结果转换为标注格式并保存
      const annotation = await this.createImageAnnotation({
        file_id: fileId,
        type: 'CAPTION',
        source: 'AI',
        content: {
          caption: aiResponse.data.caption
        },
        confidence: aiResponse.data.confidence || 0,
        metadata: aiResponse.data.metadata,
        created_by: 'ai_system'
      });

      return annotation;
    } catch (error) {
      console.error('AI描述标注失败:', error);
      throw error;
    }
  }

  /**
   * AI辅助标注 - 目标检测
   */
  static async generateObjectDetectionAnnotation(
    fileId: string
  ): Promise<ImageAnnotation> {
    try {
      // 调用AI进行目标检测
      const aiResponse = await apiClient.post<ApiResponse<{
        objects: Array<{
          label: string;
          confidence: number;
          bbox: { x: number; y: number; width: number; height: number };
        }>;
        metadata: any;
      }>>('/api/v1/annotations/ai-assist/object-detection', {
        raw_data_id: fileId
      });

      if (!aiResponse.data?.objects?.[0]) {
        throw new Error('AI目标检测失败');
      }

      // 将检测结果转换为标注格式并保存
      const annotation = await this.createImageAnnotation({
        file_id: fileId,
        type: 'OBJECT_DETECTION',
        source: 'AI',
        content: {
          objects: aiResponse.data.objects
        },
        region: aiResponse.data.objects[0].bbox,
        confidence: aiResponse.data.objects[0].confidence,
        metadata: aiResponse.data.metadata,
        created_by: 'detection_service'
      });

      return annotation;
    } catch (error) {
      console.error('AI目标检测失败:', error);
      throw error;
    }
  }

  /**
   * 创建快速标注（基于模板）
   */
  static async createQuickAnnotation(
    fileId: string,
    type: ImageAnnotationType,
    content: any,
    source: AnnotationSource = 'HUMAN'
  ): Promise<ImageAnnotation> {
    return this.createImageAnnotation({
      file_id: fileId,
      type,
      source,
      content,
      created_by: 'user', // 这里应该从用户上下文获取
      metadata: {
        created_via: 'quick_annotation',
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * 获取标注模板（如果后端实现了模板功能）
   */
  static async getAnnotationTemplates(type?: ImageAnnotationType): Promise<any[]> {
    try {
      const queryParams = type ? `?type=${type}` : '';
      const response = await apiClient.get<ApiResponse<any[]>>(
        `/api/v1/annotation-templates${queryParams}`
      );
      return response.data || [];
    } catch (error) {
      console.warn('获取标注模板失败:', error);
      return [];
    }
  }
}

// 导出单例实例
export const imageAnnotationService = ImageAnnotationService; 