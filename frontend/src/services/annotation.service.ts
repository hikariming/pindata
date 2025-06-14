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

// 统一的标注接口
export interface UnifiedAnnotation {
  id: string;
  type: 'qa' | 'caption' | 'transcript' | 'detection' | 'OBJECT_DETECTION';
  content: any;
  source: 'human' | 'ai' | 'detection' | 'HUMAN_ANNOTATED' | 'AI_GENERATED';
  confidence?: number;
  timestamp: string;
  region?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  timeRange?: { start: number; end: number };
  category?: string;
  created_at?: string;
  updated_at?: string;
  review_status?: string;
  tags?: string[];
}

export class AnnotationService {
  /**
   * 数据适配器：将后端返回的标注数据转换为统一格式
   */
  static adaptAnnotationData(rawAnnotation: any): UnifiedAnnotation {
    return {
      id: rawAnnotation.id,
      type: rawAnnotation.type?.toLowerCase() || 'qa',
      content: rawAnnotation.content || rawAnnotation.annotation_data || {},
      source: this.normalizeSource(rawAnnotation.source),
      confidence: rawAnnotation.confidence || 0,
      timestamp: rawAnnotation.created_at || rawAnnotation.updated_at || rawAnnotation.timestamp || new Date().toISOString(),
      region: rawAnnotation.region || rawAnnotation.coordinates,
      timeRange: rawAnnotation.timeRange,
      category: rawAnnotation.category,
      created_at: rawAnnotation.created_at,
      updated_at: rawAnnotation.updated_at,
      review_status: rawAnnotation.review_status,
      tags: rawAnnotation.tags || []
    };
  }

  /**
   * 规范化source字段
   */
  static normalizeSource(source: string): 'human' | 'ai' | 'detection' | 'HUMAN_ANNOTATED' | 'AI_GENERATED' {
    const normalizedSource = source?.toLowerCase();
    const sourceMapping: { [key: string]: 'human' | 'ai' | 'detection' | 'HUMAN_ANNOTATED' | 'AI_GENERATED' } = {
      'human': 'human',
      'human_annotated': 'HUMAN_ANNOTATED',
      'ai': 'ai',
      'ai_generated': 'AI_GENERATED',
      'detection': 'detection',
      'ai_assisted': 'AI_GENERATED',
      'imported': 'AI_GENERATED'
    };
    return sourceMapping[normalizedSource] || 'human';
  }

  /**
   * 获取文件标注
   */
  static async getAnnotations(fileId: string): Promise<{ data: UnifiedAnnotation[] }> {
    try {
      // 修正：使用image-annotations接口并传递file_id作为查询参数
      const response = await apiClient.get<ApiResponse<{
        annotations: any[];
        pagination: any;
      }>>(`/api/v1/image-annotations?file_id=${fileId}`);
      
      // 使用数据适配器转换数据
      const adaptedAnnotations = (response.data?.annotations || []).map(ann => 
        this.adaptAnnotationData(ann)
      );
      
      return { data: adaptedAnnotations };
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
      // 修正：使用image-annotations接口，并将fileId作为请求体的一部分
      const annotationData = {
        file_id: fileId,
        ...annotation
      };
      const response = await apiClient.post<ApiResponse<any>>(`/api/v1/image-annotations`, annotationData);
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
      // 修正：使用image-annotations接口
      const response = await apiClient.put<ApiResponse<any>>(`/api/v1/image-annotations/${annotationId}`, updates);
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
      // 修正：使用image-annotations接口
      await apiClient.delete(`/api/v1/image-annotations/${annotationId}`);
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
      // 修正：根据类型使用正确的AI辅助接口
      let endpoint = '';
      let requestData: any = { raw_data_id: fileId };
      
      switch (type) {
        case 'qa':
          endpoint = '/api/v1/annotations/ai-assist/image-qa';
          requestData.questions = options.questions;
          requestData.model_provider = options.model_provider || 'openai';
          break;
        case 'caption':
          endpoint = '/api/v1/annotations/ai-assist/image-caption';
          requestData.model_provider = options.model_provider || 'openai';
          break;
        case 'object_detection':
          endpoint = '/api/v1/annotations/ai-assist/object-detection';
          break;
        default:
          throw new Error(`不支持的AI标注类型: ${type}`);
      }
      
      const response = await apiClient.post<ApiResponse<any>>(endpoint, requestData);
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
      // 修正：使用image-annotations接口获取历史
      const response = await apiClient.get<ApiResponse<{
        annotations: Array<{
          id: string;
          content: any;
          created_at: string;
          created_by: string;
        }>;
        pagination: any;
      }>>(`/api/v1/image-annotations?file_id=${fileId}`);
      
      // 将标注数据转换为历史格式
      const annotations = response.data?.annotations || [];
      return annotations.map((annotation: any) => ({
        id: annotation.id,
        annotations: annotation.content || {},
        created_at: annotation.created_at,
        created_by: annotation.created_by || 'unknown'
      }));
    } catch (error) {
      console.warn('获取标注历史失败:', error);
      return [];
    }
  }
}

// 导出单例实例
export const annotationService = AnnotationService; 