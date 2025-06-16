export interface DataGovernanceProjectMetrics {
  totalDataSize: number;
  processedFiles: number;
  totalFiles: number;
  dataQualityScore: number;
  lastProcessedAt: string | null;
  processingProgress: number;
}

export interface ProjectTeamMember {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  joinedAt: string;
}

export interface DataGovernanceProject {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'draft' | 'completed' | 'archived';
  createdAt: string;
  updatedAt: string;
  owner: ProjectTeamMember;
  team: ProjectTeamMember[];
  metrics: DataGovernanceProjectMetrics;
  pipeline: any[]; // TODO: Define pipeline type
  dataSource: any[]; // TODO: Define data source type
  config?: Record<string, any>;
}