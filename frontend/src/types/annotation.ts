// 图片标注相关类型定义
export interface ImageAnnotation {
  id: string;
  file_id: string;
  type: ImageAnnotationType;
  content: AnnotationContent;
  source: AnnotationSource;
  confidence?: number;
  region?: BoundingBox;
  category?: string;
  tags?: string[];
  metadata?: Record<string, any>;
  review_status?: 'pending' | 'approved' | 'rejected';
  reviewer_id?: string;
  review_comments?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

// 图片标注类型
export type ImageAnnotationType = 
  | 'qa'                    // 问答
  | 'caption'               // 描述
  | 'classification'        // 分类
  | 'object_detection'      // 目标检测
  | 'segmentation'          // 图像分割
  | 'keypoint'              // 关键点检测
  | 'ocr'                   // 文字识别
  | 'custom';               // 自定义

// 标注来源
export type AnnotationSource = 
  | 'human'                 // 人工标注
  | 'ai'                    // AI生成
  | 'detection'             // 自动检测
  | 'imported';             // 导入的标注

// 边界框定义
export interface BoundingBox {
  x: number;                // 左上角x坐标 (0-1 相对坐标)
  y: number;                // 左上角y坐标 (0-1 相对坐标)
  width: number;            // 宽度 (0-1 相对坐标)
  height: number;           // 高度 (0-1 相对坐标)
}

// 多边形区域 (用于分割标注)
export interface Polygon {
  points: Array<{ x: number; y: number }>;
}

// 关键点定义
export interface KeyPoint {
  x: number;
  y: number;
  visible: boolean;         // 是否可见
  confidence?: number;
}

// 标注内容
export interface AnnotationContent {
  // 问答标注
  question?: string;
  answer?: string;
  
  // 描述标注
  caption?: string;
  
  // 分类标注
  label?: string;
  
  // 目标检测
  objects?: Array<{
    label: string;
    confidence: number;
    bbox: BoundingBox;
  }>;
  
  // 图像分割
  segments?: Array<{
    label: string;
    polygon: Polygon;
    confidence?: number;
  }>;
  
  // 关键点检测
  keypoints?: Array<{
    name: string;
    points: KeyPoint[];
    confidence?: number;
  }>;
  
  // OCR结果
  text_blocks?: Array<{
    text: string;
    bbox: BoundingBox;
    confidence: number;
    language?: string;
  }>;
  
  // 自定义内容
  custom_data?: any;
}

// 标注历史记录
export interface AnnotationHistory {
  id: string;
  annotation_id: string;
  action: 'create' | 'update' | 'delete';
  changes: Record<string, any>;
  created_by: string;
  created_at: string;
}

// 批量标注请求
export interface BatchAnnotationRequest {
  file_ids: string[];
  annotation_type: ImageAnnotationType;
  template?: Partial<ImageAnnotation>;
  ai_config?: {
    model_provider: 'openai' | 'anthropic' | 'google';
    model_name?: string;
    temperature?: number;
    max_tokens?: number;
  };
}

// 标注导出格式
export type AnnotationExportFormat = 
  | 'coco'                  // COCO格式
  | 'yolo'                  // YOLO格式
  | 'pascal_voc'            // Pascal VOC格式
  | 'labelme'               // LabelMe格式
  | 'json'                  // 原始JSON格式
  | 'csv';                  // CSV格式

// 标注统计信息
export interface AnnotationStats {
  total_annotations: number;
  by_type: Record<ImageAnnotationType, number>;
  by_source: Record<AnnotationSource, number>;
  avg_confidence: number;
  completion_rate: number;
} 