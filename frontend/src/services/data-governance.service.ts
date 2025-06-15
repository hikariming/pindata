import { apiClient } from '../lib/api-client';
import { DataGovernanceProject } from '../types/data-governance';

export interface ProjectsQuery {
  organization_id?: number;
  status?: string;
  search?: string;
  sort_by?: string;
  limit?: number;
  offset?: number;
}

export interface ProjectsResponse {
  projects: DataGovernanceProject[];
  total: number;
  limit: number;
  offset: number;
}

export interface CreateProjectRequest {
  name: string;
  description: string;
  organization_id: number;
  config?: Record<string, any>;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  status?: 'active' | 'draft' | 'completed' | 'archived';
  config?: Record<string, any>;
}

export interface ProjectStats {
  totalProjects: number;
  activeProjects: number;
  draftProjects: number;
  completedProjects: number;
  totalDataSize: number;
  totalFiles: number;
  processedFiles: number;
  teamMembersCount: number;
}

class DataGovernanceService {
  private baseUrl = '/api/v1/governance';

  async getProjects(params: ProjectsQuery = {}): Promise<ProjectsResponse> {
    const response = await apiClient.get(`${this.baseUrl}/projects`, { params });
    return (response as any).data.data;
  }

  async getProject(id: number): Promise<DataGovernanceProject> {
    const response = await apiClient.get(`${this.baseUrl}/projects/${id}`);
    return (response as any).data.data;
  }

  async createProject(data: CreateProjectRequest): Promise<DataGovernanceProject> {
    const response = await apiClient.post(`${this.baseUrl}/projects`, data);
    return (response as any).data.data;
  }

  async updateProject(id: number, data: UpdateProjectRequest): Promise<DataGovernanceProject> {
    const response = await apiClient.put(`${this.baseUrl}/projects/${id}`, data);
    return (response as any).data.data;
  }

  async deleteProject(id: number): Promise<void> {
    await apiClient.delete(`${this.baseUrl}/projects/${id}`);
  }

  async getStats(organizationId?: number): Promise<ProjectStats> {
    const params = organizationId ? { organization_id: organizationId } : {};
    const response = await apiClient.get(`${this.baseUrl}/stats`, { params });
    return (response as any).data.data;
  }
}

export const dataGovernanceService = new DataGovernanceService();