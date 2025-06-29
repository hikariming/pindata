import { Library, LibraryFile } from '../../../../types/library';
import { LLMConfig } from '../../../../types/llm';

export interface SelectedFile {
  id: string;
  name: string;
  path: string;
  size: number;
  type: string;
  selected: boolean;
  libraryId?: string;
  libraryName?: string;
  isMarkdown?: boolean;
  originalFile?: LibraryFile;
}

export interface ProcessingConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  batchSize: number;
  customPrompt: string;
  // 文档分片配置
  chunkSize: number;        // 分片大小（字符数）
  chunkOverlap: number;     // 分片重叠大小
  preserveStructure: boolean; // 保持文档结构
  splitByHeaders: boolean;   // 按标题分割
  // 思考过程配置（根据模型能力动态调整）
  enableThinkingProcess: boolean; // 启用思考过程处理
  // 对于supports_reasoning=true的模型：提取配置
  reasoningExtractionMethod: 'tag_based' | 'json_field' | null; // 思考提取方法
  reasoningExtractionConfig: Record<string, any> | null; // 提取方法的具体配置
  // 对于supports_reasoning=false的模型：蒸馏配置
  distillationPrompt: string; // 蒸馏思考过程的提示词
  includeThinkingInOutput: boolean; // 在最终输出中包含思考过程
}

export interface DatasetType {
  id: string;
  name: string;
  description: string;
  icon: string;
  formats: string[];
  multimodal: boolean;
  category: 'supervised' | 'reasoning' | 'distillation';
  useCase: string;
  example: string;
}

export interface FormatDetail {
  name: string;
  description: string;
  structure: string;
  advantages: string[];
  disadvantages: string[];
  bestFor: string[];
  example: string;
}

export interface AIModel {
  id: string;
  name: string;
  provider: string;
  quality: 'high' | 'medium' | 'custom';
  speed: 'fast' | 'medium' | 'variable';
}

export interface TaskInfo {
  taskId: number;
  datasetId: number;
  datasetName: string;
}

export interface SmartDatasetCreatorState {
  // 步骤状态
  currentStep: number;
  
  // 数据状态
  selectedFiles: SelectedFile[];
  availableFiles: SelectedFile[];
  datasetCollections: DatasetCollection[];
  datasetType: string;
  outputFormat: string;
  datasetName: string;
  datasetDescription: string;
  processingConfig: ProcessingConfig;
  availableLLMConfigs: LLMConfig[];
  
  // 任务状态
  taskInfo: TaskInfo | null;
  
  // UI状态
  isLoading: boolean;
  loadingFiles: boolean;
  loadingCollections: boolean;
  loadingLLMConfigs: boolean;
  progress: number;
  error: string | null;
  showFormatDetails: boolean;
  selectedFormat: string | null;
}

export interface SmartDatasetCreatorActions {
  // 步骤控制
  nextStep: () => void;
  prevStep: () => void;
  setCurrentStep: (step: number) => void;
  
  // 文件管理
  setAvailableFiles: (files: SelectedFile[]) => void;
  handleFileSelection: (fileId: string, selected: boolean) => void;
  handleSelectAll: (selected: boolean) => void;
  loadAvailableFiles: () => Promise<void>;
  
  // 数据集合管理
  loadDatasetCollections: () => Promise<void>;
  toggleCollectionExpanded: (libraryId: string) => void;
  handleCollectionSelection: (libraryId: string, selected: boolean) => void;
  handleCollectionFileSelection: (libraryId: string, fileId: string, selected: boolean) => void;
  
  // 数据集配置
  setDatasetType: (type: string) => void;
  setOutputFormat: (format: string) => void;
  setDatasetName: (name: string) => void;
  setDatasetDescription: (description: string) => void;
  
  // 模型配置
  setProcessingConfig: (config: Partial<ProcessingConfig>) => void;
  loadLLMConfigs: () => Promise<void>;
  generatePrompt: () => string;
  
  // UI控制
  setIsLoading: (loading: boolean) => void;
  setLoadingFiles: (loading: boolean) => void;
  setLoadingCollections: (loading: boolean) => void;
  setLoadingLLMConfigs: (loading: boolean) => void;
  setProgress: (progress: number) => void;
  setError: (error: string | null) => void;
  setShowFormatDetails: (show: boolean) => void;
  setSelectedFormat: (format: string | null) => void;
  
  // 任务管理
  setTaskInfo: (taskInfo: TaskInfo | null) => void;
  
  // 业务逻辑
  resetState: () => void;
}

export interface DatasetCollection {
  library: Library;
  markdownFiles: LibraryFile[];
  expanded: boolean;
  selected: boolean;
} 