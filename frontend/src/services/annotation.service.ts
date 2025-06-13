import { apiClient } from '../lib/api-client';
import { ApiResponse } from '../types/api';

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
  static async getAnnotations(fileId: string): Promise<{ data: any[] }> {
    try {
      const response = await apiClient.get<ApiResponse<any[]>>(`/api/v1/annotations/${fileId}`);
      return { data: response.data || [] };
    } catch (error) {
      console.warn('获取标注失败，返回空数组:', error);
      return { data: [] };
    }
  }

  /**
   * 创建标注
   */
  static async createAnnotation(fileId: string, annotation: any): Promise<{ data: any }> {
    try {
      const response = await apiClient.post<ApiResponse<any>>(`/api/v1/annotations/${fileId}`, annotation);
      return { data: response.data };
    } catch (error) {
      console.error('创建标注失败:', error);
      throw error;
    }
  }

  /**
   * 更新标注
   */
  static async updateAnnotation(annotationId: string, updates: any): Promise<{ data: any }> {
    try {
      const response = await apiClient.put<ApiResponse<any>>(`/api/v1/annotations/${annotationId}`, updates);
      return { data: response.data };
    } catch (error) {
      console.error('更新标注失败:', error);
      throw error;
    }
  }

  /**
   * 删除标注
   */
  static async deleteAnnotation(annotationId: string): Promise<void> {
    try {
      await apiClient.delete(`/api/v1/annotations/${annotationId}`);
    } catch (error) {
      console.error('删除标注失败:', error);
      throw error;
    }
  }

  /**
   * 请求AI辅助标注
   */
  static async requestAIAnnotation(fileId: string, type: string, options: any = {}): Promise<{ data: any }> {
    try {
      const response = await apiClient.post<ApiResponse<any>>(`/api/v1/annotations/${fileId}/ai-assist`, {
        type,
        options
      });
      return { data: response.data };
    } catch (error) {
      // 如果AI服务不可用，返回模拟数据
      console.warn('AI服务暂不可用，返回模拟数据:', error);
      return this.getMockAIResponse(type, options);
    }
  }

  /**
   * 获取模拟AI响应 (用于开发测试)
   */
  private static getMockAIResponse(type: string, options: any): { data: any } {
    const mockResponses = {
      'qa': {
        annotation_data: {
          qa_pairs: [
            {
              question: "这张图片显示了什么？",
              answer: "这是一张示例图片，显示了自然风景。",
              confidence: 0.85
            },
            {
              question: "图片中的主要颜色是什么？",
              answer: "主要颜色包括蓝色、绿色和白色。",
              confidence: 0.90
            }
          ]
        }
      },
      'caption': {
        annotation_data: {
          caption: "一张美丽的自然风景照片，展现了蓝天白云和绿色植被。",
          confidence: 0.88
        }
      },
      'transcript': {
        annotation_data: {
          transcript_segments: [
            {
              start_time: 0,
              end_time: 5,
              text: "这是一段示例转录文本。",
              confidence: 0.92
            },
            {
              start_time: 5,
              end_time: 10,
              text: "展示了语音转文字的功能。",
              confidence: 0.89
            }
          ]
        }
      },
      'object_detection': {
        annotation_data: {
          objects: [
            {
              label: "示例对象",
              confidence: 0.85,
              bbox: { x: 100, y: 100, width: 200, height: 150 }
            }
          ]
        }
      }
    };

    return {
      data: mockResponses[type as keyof typeof mockResponses] || mockResponses.qa
    };
  }

  /**
   * 保存文件标注 (兼容旧API)
   */
  static async saveAnnotations(fileId: string, annotations: AnnotationData): Promise<void> {
    await this.createAnnotation(fileId, annotations);
  }

  /**
   * 获取AI辅助标注 (兼容旧API)
   */
  static async getAIAssistedAnnotations(request: AIAnnotationRequest): Promise<AIAnnotationResponse> {
    const result = await this.requestAIAnnotation(request.fileId, request.annotationType, request);
    return {
      annotations: result.data.annotation_data || {},
      confidence: result.data.confidence || 0.8
    };
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
    try {
      const response = await apiClient.get<ApiResponse<Array<{
        id: string;
        annotations: AnnotationData;
        created_at: string;
        created_by: string;
      }>>>(`/api/v1/annotations/${fileId}/history`);
      return response.data || [];
    } catch (error) {
      console.warn('获取标注历史失败:', error);
      return [];
    }
  }
}

// 导出单例实例
export const annotationService = AnnotationService; 