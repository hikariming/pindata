import { useState, useEffect, useCallback } from 'react';
import { 
  dataGovernanceService, 
  ProjectsQuery, 
  CreateProjectRequest, 
  UpdateProjectRequest,
  ProjectStats
} from '../services/data-governance.service';
import { DataGovernanceProject } from '../types/data-governance';

export interface UseProjectsOptions extends ProjectsQuery {
  enabled?: boolean;
}

export function useProjects(options: UseProjectsOptions = {}) {
  const [projects, setProjects] = useState<DataGovernanceProject[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { enabled = true, ...queryParams } = options;

  const fetchProjects = useCallback(async () => {
    if (!enabled) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await dataGovernanceService.getProjects(queryParams);
      setProjects(response.projects);
      setTotal(response.total);
    } catch (err: any) {
      setError(err.message || '获取项目列表失败');
      setProjects([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [enabled, JSON.stringify(queryParams)]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const refetch = useCallback(() => {
    fetchProjects();
  }, [fetchProjects]);

  return {
    projects,
    total,
    loading,
    error,
    refetch
  };
}

export function useProject(id: number | string, enabled = true) {
  const [project, setProject] = useState<DataGovernanceProject | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProject = useCallback(async () => {
    if (!enabled || !id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const projectData = await dataGovernanceService.getProject(Number(id));
      setProject(projectData);
    } catch (err: any) {
      setError(err.message || '获取项目详情失败');
      setProject(null);
    } finally {
      setLoading(false);
    }
  }, [id, enabled]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  const refetch = useCallback(() => {
    fetchProject();
  }, [fetchProject]);

  return {
    project,
    loading,
    error,
    refetch
  };
}

export function useCreateProject() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createProject = useCallback(async (data: CreateProjectRequest): Promise<DataGovernanceProject | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const project = await dataGovernanceService.createProject(data);
      return project;
    } catch (err: any) {
      setError(err.message || '创建项目失败');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    createProject,
    loading,
    error
  };
}

export function useUpdateProject() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateProject = useCallback(async (id: number, data: UpdateProjectRequest): Promise<DataGovernanceProject | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const project = await dataGovernanceService.updateProject(id, data);
      return project;
    } catch (err: any) {
      setError(err.message || '更新项目失败');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    updateProject,
    loading,
    error
  };
}

export function useDeleteProject() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteProject = useCallback(async (id: number): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      await dataGovernanceService.deleteProject(id);
      return true;
    } catch (err: any) {
      setError(err.message || '删除项目失败');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    deleteProject,
    loading,
    error
  };
}

export function useProjectStats(organizationId?: number, enabled = true) {
  const [stats, setStats] = useState<ProjectStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    if (!enabled) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const statsData = await dataGovernanceService.getStats(organizationId);
      setStats(statsData);
    } catch (err: any) {
      setError(err.message || '获取统计信息失败');
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [organizationId, enabled]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const refetch = useCallback(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    refetch
  };
}