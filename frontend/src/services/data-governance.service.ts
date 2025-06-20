import { apiClient } from '../lib/api-client';
import { DataGovernanceProject } from '../types/data-governance';

export interface ProjectsQuery {
  organization_id?: string;
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
  organization_id: string;
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
    // 处理新的API响应格式: { success: true, message: "操作成功", data: { projects: [], total: 0, limit: 50, offset: 0 } }
    const responseData = response as any;
    if (responseData.success && responseData.data) {
      return {
        projects: responseData.data.projects || [],
        total: responseData.data.total || 0,
        limit: responseData.data.limit || 50,
        offset: responseData.data.offset || 0
      };
    }
    // 兼容旧格式
    return responseData.data || { projects: [], total: 0, limit: 50, offset: 0 };
  }

  async getProject(id: string | number): Promise<DataGovernanceProject> {
    const response = await apiClient.get(`${this.baseUrl}/projects/${id}`);
    const responseData = response as any;
    // 新格式处理
    if (responseData.success && responseData.data) {
      return responseData.data;
    }
    // 兼容旧格式
    return responseData.data;
  }

  async createProject(data: CreateProjectRequest): Promise<DataGovernanceProject> {
    const response = await apiClient.post(`${this.baseUrl}/projects`, data);
    const responseData = response as any;
    // 新格式处理
    if (responseData.success && responseData.data) {
      return responseData.data;
    }
    // 兼容旧格式
    return responseData.data;
  }

  async updateProject(id: string | number, data: UpdateProjectRequest): Promise<DataGovernanceProject> {
    const response = await apiClient.put(`${this.baseUrl}/projects/${id}`, data);
    const responseData = response as any;
    // 新格式处理
    if (responseData.success && responseData.data) {
      return responseData.data;
    }
    // 兼容旧格式
    return responseData.data;
  }

  async deleteProject(id: string | number): Promise<void> {
    await apiClient.delete(`${this.baseUrl}/projects/${id}`);
  }

  async getStats(organizationId?: string): Promise<ProjectStats> {
    const params = organizationId ? { organization_id: organizationId } : {};
    const response = await apiClient.get(`${this.baseUrl}/stats`, { params });
    const responseData = response as any;
    // 新格式处理
    if (responseData.success && responseData.data) {
      return responseData.data;
    }
    // 兼容旧格式
    return responseData.data;
  }

  async getProjectById(id: string): Promise<DataGovernanceProject> {
    const response = await apiClient.get(`${this.baseUrl}/projects/${id}`) as any;
    return response.data;
  }

  // 获取项目原始数据
  async getProjectRawData(projectId: string, params?: {
    page?: number;
    per_page?: number;
    file_category?: string;
    search?: string;
  }): Promise<{
    raw_data: any[];
    total: number;
    page: number;
    per_page: number;
    pages: number;
    stats: any;
  }> {
    const response = await apiClient.get(`${this.baseUrl}/projects/${projectId}/raw-data`, { params }) as any;
    return response.data;
  }

  // 添加Library到项目
  async addLibrariesToProject(projectId: string, libraryIds: string[]): Promise<{
    added_count: number;
    errors: string[];
  }> {
    const response = await apiClient.post(`${this.baseUrl}/projects/${projectId}/libraries`, {
      library_ids: libraryIds
    }) as any;
    return response.data;
  }

  // 从项目移除原始数据
  async removeRawDataFromProject(projectId: string, rawDataId: number): Promise<void> {
    await apiClient.delete(`${this.baseUrl}/projects/${projectId}/raw-data/${rawDataId}`);
  }

  // 获取原始数据预览
  async getRawDataPreview(projectId: string, rawDataId: number): Promise<{
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
  }> {
    const response = await apiClient.get(`${this.baseUrl}/projects/${projectId}/raw-data/${rawDataId}/preview`) as any;
    return response.data;
  }
}

export const dataGovernanceService = new DataGovernanceService();