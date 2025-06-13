import { apiClient } from '../lib/api-client';

export interface AnnotationData {
  qa?: Array<{
    question: string;
    answer: string;
    confidence?: number;
  }>;
  caption?: string;
  transcript?: string;
}

export interface AIAnnotationRequest {
  fileId: string;
  fileType: 'image' | 'video';
  annotationType: 'qa' | 'caption' | 'transcript';
  prompt?: string;
}

export interface AIAnnotationResponse {
  annotations: AnnotationData;
  confidence: number;
}

export class AnnotationService {
  /**
   * 获取文件标注
   */
  static async getAnnotations(fileId: string): Promise<AnnotationData> {
    const response = await apiClient.get<AnnotationData>(`/api/v1/annotations/${fileId}`);
    return response;
  }

  /**
   * 保存文件标注
   */
  static async saveAnnotations(fileId: string, annotations: AnnotationData): Promise<void> {
    await apiClient.post(`/api/v1/annotations/${fileId}`, annotations);
  }

  /**
   * 获取AI辅助标注
   */
  static async getAIAssistedAnnotations(request: AIAnnotationRequest): Promise<AIAnnotationResponse> {
    const response = await apiClient.post<AIAnnotationResponse>('/api/v1/annotations/ai-assist', request);
    return response;
  }

  /**
   * 获取标注历史
   */
  static async getAnnotationHistory(fileId: string): Promise<Array<{
    id: string;
    annotations: AnnotationData;
    created_at: string;
    created_by: string;
  }>> {
    const response = await apiClient.get<Array<{
      id: string;
      annotations: AnnotationData;
      created_at: string;
      created_by: string;
    }>>(`/api/v1/annotations/${fileId}/history`);
    return response;
  }
}

// 导出单例实例
export const annotationService = AnnotationService; 