export interface DataGovernanceProject {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'draft' | 'completed' | 'archived';
  createdAt: string;
  updatedAt: string;
  owner: ProjectMember;
  team: ProjectMember[];
  metrics: ProjectMetrics;
  pipeline: PipelineStage[];
  dataSource: DataSourceConfig[];
}

export interface ProjectMember {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  avatar?: string;
  joinedAt: string;
}

export interface ProjectMetrics {
  totalDataSize: number;
  processedFiles: number;
  totalFiles: number;
  dataQualityScore: number;
  lastProcessedAt: string;
  processingProgress: number;
}

export interface PipelineStage {
  id: string;
  name: string;
  type: 'extract' | 'clean' | 'transform' | 'validate' | 'output';
  status: 'pending' | 'running' | 'completed' | 'error';
  config: Record<string, any>;
  inputCount: number;
  outputCount: number;
  processingTime?: number;
  error?: string;
}

export interface DataSourceConfig {
  id: string;
  name: string;
  type: 'upload' | 'database' | 'api' | 'storage';
  config: Record<string, any>;
  status: 'connected' | 'disconnected' | 'error';
  lastSyncAt?: string;
}

export interface ProjectRole {
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  permissions: string[];
  description: string;
}