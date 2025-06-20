// 项目状态枚举
export type ProjectStatus = 'active' | 'draft' | 'completed' | 'archived';

// 数据源类型枚举
export type DataSourceType = 'upload' | 'database' | 'api' | 'storage' | 'url';

// 数据源状态枚举
export type DataSourceStatus = 'connected' | 'disconnected' | 'error' | 'syncing';

// 项目角色枚举
export type ProjectRoleType = 'owner' | 'admin' | 'editor' | 'viewer';

// 成员状态枚举
export type MemberStatus = 'active' | 'inactive' | 'invited' | 'removed';

// 治理状态枚举
export type GovernanceStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'validated';

// 数据类型枚举
export type DataType = 'structured' | 'semi_structured' | 'unstructured' | 'vector';

// 知识类型枚举
export type KnowledgeType = 'metadata' | 'structured' | 'semantic' | 'multimedia';

// 知识状态枚举
export type KnowledgeStatus = 'draft' | 'published' | 'archived' | 'deprecated';

// 质量维度枚举
export type QualityDimension = 'completeness' | 'accuracy' | 'consistency' | 'timeliness' | 'validity' | 'uniqueness';

// 评估方法枚举
export type AssessmentMethod = 'rule_based' | 'ai_powered' | 'statistical' | 'manual';

// 管道阶段类型枚举
export type StageType = 'extract' | 'clean' | 'transform' | 'validate' | 'enrich' | 'vectorize' | 'output';

// 阶段状态枚举
export type StageStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped' | 'paused';

// 项目成员接口
export interface ProjectMember {
  id: string;
  user_id: string;
  username: string;
  fullName: string;
  email: string;
  role: ProjectRoleType;
  status: MemberStatus;
  avatar?: string;
  joinedAt: string;
  invitedAt?: string;
  invitedBy?: string;
}

// 项目指标接口
export interface ProjectMetrics {
  totalDataSize: number;
  processedFiles: number;
  totalFiles: number;
  dataQualityScore: number;
  lastProcessedAt: string;
  processingProgress: number;
}

// 数据源配置接口
export interface DataSourceConfig {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  type: DataSourceType;
  status: DataSourceStatus;
  config: Record<string, any>;
  connection_string?: string;
  lastSyncAt?: string;
  sync_frequency?: string;
  auto_sync_enabled: boolean;
  file_count: number;
  total_size: number;
  created_at: string;
  updated_at: string;
}

// 管道阶段接口
export interface PipelineStage {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  type: StageType;
  stage_order: number;
  status: StageStatus;
  depends_on?: string[];
  parallel_execution: boolean;
  config: Record<string, any>;
  input_config?: Record<string, any>;
  output_config?: Record<string, any>;
  plugin_name?: string;
  plugin_version?: string;
  execution_params?: Record<string, any>;
  inputCount: number;
  outputCount: number;
  error_count: number;
  processingTime?: number;
  execution_log?: string;
  error?: string;
  metrics?: Record<string, any>;
  max_retries: number;
  retry_count: number;
  retry_delay: number;
  created_at: string;
  updated_at: string;
  started_at?: string;
  completed_at?: string;
}

// 治理后数据接口
export interface GovernedData {
  id: string;
  project_id: string;
  raw_data_id?: number;
  name: string;
  description?: string;
  data_type: DataType;
  governance_status: GovernanceStatus;
  storage_path?: string;
  file_size: number;
  checksum?: string;
  governance_pipeline?: Record<string, any>;
  governance_metadata?: Record<string, any>;
  quality_score: number;
  validation_results?: Record<string, any>;
  schema_definition?: Record<string, any>;
  sample_data?: Record<string, any>;
  statistics?: Record<string, any>;
  tags?: string[];
  category?: string;
  business_domain?: string;
  created_at: string;
  updated_at: string;
  processed_at?: string;
}

// 知识项接口
export interface KnowledgeItem {
  id: string;
  project_id: string;
  governed_data_id?: string;
  title: string;
  description?: string;
  content?: string;
  knowledge_type: KnowledgeType;
  status: KnowledgeStatus;
  category?: string;
  subcategory?: string;
  tags?: string[];
  keywords?: string[];
  vector_embedding?: number[];
  semantic_hash?: string;
  similarity_threshold: number;
  media_files?: Record<string, any>;
  preview_data?: Record<string, any>;
  related_items?: string[];
  parent_id?: string;
  version: string;
  version_history?: Record<string, any>;
  visibility: string;
  access_permissions?: Record<string, any>;
  view_count: number;
  like_count: number;
  share_count: number;
  created_at: string;
  updated_at: string;
  published_at?: string;
  created_by?: string;
  updated_by?: string;
}

// 数据质量评估接口
export interface DataQualityAssessment {
  id: string;
  project_id: string;
  governed_data_id?: string;
  assessment_name: string;
  description?: string;
  quality_dimension: QualityDimension;
  assessment_method: AssessmentMethod;
  status: 'pending' | 'running' | 'completed' | 'failed';
  assessment_config?: Record<string, any>;
  rule_definitions?: Record<string, any>;
  llm_prompts?: Record<string, any>;
  overall_score: number;
  dimension_scores?: Record<string, number>;
  detailed_results?: Record<string, any>;
  issues_found?: Record<string, any>;
  recommendations?: Record<string, any>;
  llm_model_used?: string;
  ai_reasoning?: string;
  confidence_score?: number;
  total_records: number;
  processed_records: number;
  error_records: number;
  processing_time?: number;
  memory_usage?: number;
  version: string;
  baseline_assessment_id?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  created_by?: string;
}

// 数据治理项目接口
export interface DataGovernanceProject {
  id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  owner_id: string;
  organization_id?: string;
  project_config?: Record<string, any>;
  pipeline_config?: Record<string, any>;
  quality_config?: Record<string, any>;
  
  // 统计指标
  metrics: ProjectMetrics;
  
  // 关联数据
  owner: ProjectMember;
  team: ProjectMember[];
  dataSource: DataSourceConfig[];
  pipeline: PipelineStage[];
  governedData?: GovernedData[];
  knowledgeItems?: KnowledgeItem[];
  qualityAssessments?: DataQualityAssessment[];
  
  // 时间戳
  createdAt: string;
  updatedAt: string;
  lastProcessedAt?: string;
}

// 项目角色权限配置
export interface ProjectRole {
  role: ProjectRoleType;
  permissions: string[];
  description: string;
}

// 数据流概览接口
export interface DataFlow {
  rawDataCount: number;
  governedDataCount: number;
  knowledgeItemCount: number;
  qualityScore: number;
  processingProgress: number;
}

// 质量趋势接口
export interface QualityTrend {
  date: string;
  overall_score: number;
  completeness: number;
  accuracy: number;
  consistency: number;
  timeliness: number;
}

// 数据处理状态接口
export interface ProcessingStatus {
  stage: string;
  progress: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  message?: string;
  startTime?: string;
  endTime?: string;
}

// 文件类型枚举
export enum FileType {
  // 文档类型
  DOCUMENT_MD = "document_md",
  DOCUMENT_PDF = "document_pdf", 
  DOCUMENT_DOCX = "document_docx",
  DOCUMENT_XLSX = "document_xlsx",
  DOCUMENT_PPTX = "document_pptx",
  DOCUMENT_TXT = "document_txt",
  
  // 图片类型
  IMAGE_JPG = "image_jpg",
  IMAGE_PNG = "image_png",
  IMAGE_GIF = "image_gif",
  IMAGE_BMP = "image_bmp",
  IMAGE_SVG = "image_svg",
  IMAGE_WEBP = "image_webp",
  
  // 视频类型
  VIDEO_MP4 = "video_mp4",
  VIDEO_AVI = "video_avi",
  VIDEO_MOV = "video_mov",
  VIDEO_WMV = "video_wmv",
  VIDEO_FLV = "video_flv",
  VIDEO_WEBM = "video_webm",
  
  // 数据源类型（预留）
  DATABASE_TABLE = "database_table",
  API_SOURCE = "api_source",
  
  // 其他类型
  OTHER = "other"
}

// 文件处理状态枚举
export enum FileProcessingStatus {
  PENDING = "pending",
  PROCESSING = "processing", 
  COMPLETED = "completed",
  FAILED = "failed",
  ANALYZING = "analyzing",
  EXTRACTING = "extracting"
}

// 文件分类
export type FileCategory = 'document' | 'image' | 'video' | 'database' | 'api' | 'other';

// 原始数据接口（增强版）
export interface RawData {
  id: number;
  filename: string;
  original_filename?: string;
  file_type: FileType;
  file_category: FileCategory;
  file_category_display: string;
  file_size: number;
  minio_object_name: string;
  dataset_id?: number;
  data_source_id?: string;
  
  // 文件基础信息
  checksum?: string;
  mime_type?: string;
  encoding?: string;
  
  // 处理状态
  processing_status: FileProcessingStatus;
  processing_error?: string;
  processing_progress: number;
  
  // 文件元数据
  file_metadata?: Record<string, any>;
  extraction_metadata?: Record<string, any>;
  
  // 预览和内容
  preview_content?: string;
  thumbnail_path?: string;
  sample_data?: any;
  extracted_text?: string;
  
  // 文档特定字段
  page_count?: number;
  word_count?: number;
  
  // 图片特定字段
  image_width?: number;
  image_height?: number;
  color_mode?: string;
  
  // 视频特定字段
  duration?: number;
  video_width?: number;
  video_height?: number;
  frame_rate?: string;
  video_codec?: string;
  audio_codec?: string;
  
  // 质量和置信度
  content_quality_score: number;
  extraction_confidence: number;
  
  // 预览支持
  is_supported_preview: boolean;
  preview_type: 'text' | 'pdf' | 'image' | 'video' | 'none';
  
  upload_at: string;
  processed_at?: string;
}

// 文件预览接口
export interface FilePreview {
  type: 'text' | 'image' | 'video' | 'none';
  content?: string;
  thumbnail_url?: string;
  extracted_text?: string;
  width?: number;
  height?: number;
  color_mode?: string;
  duration?: number;
  page_count?: number;
  word_count?: number;
}

// 文件元数据接口
export interface FileMetadata {
  basic_info: {
    filename: string;
    original_filename?: string;
    file_type: string;
    file_category: string;
    file_size: number;
    mime_type?: string;
    encoding?: string;
    checksum?: string;
    upload_at?: string;
    processed_at?: string;
  };
  processing_info: {
    status: string;
    progress: number;
    error?: string;
    quality_score: number;
    extraction_confidence: number;
  };
  type_specific: Record<string, any>;
  raw_metadata?: Record<string, any>;
  extraction_metadata?: Record<string, any>;
}

// 原始数据统计接口
export interface RawDataStats {
  total_files: number;
  total_data_sources: number;
  by_category: Record<FileCategory, number>;
  by_status: Record<string, number>;
  total_size: number;
}

// 数据源信息接口
export interface DataSourceInfo {
  id: string;
  name: string;
  description?: string;
  source_type: string;
  status: string;
  config: Record<string, any>;
  file_count: number;
  total_size: number;
  created_at: string;
  last_sync_at?: string;
  library_info?: LibraryInfo;
}

// Library信息接口
export interface LibraryInfo {
  id: string;
  name: string;
  description?: string;
  data_type: string;
  tags: string[];
  file_count: number;
  total_size: string;
  processed_count: number;
  processing_count: number;
  pending_count: number;
  md_count: number;
  created_at: string;
  last_updated?: string;
}

// 增强的原始数据接口
export interface EnhancedRawData extends RawData {
  data_source_info?: DataSourceInfo;
}

// 原始数据列表响应接口
export interface RawDataListResponse {
  raw_data: EnhancedRawData[];
  data_sources: DataSourceInfo[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
  stats: RawDataStats;
}