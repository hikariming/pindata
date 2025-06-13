import { useState, useEffect, useCallback } from 'react';
import { LibraryService } from '../services/library.service';
import { 
  Library, 
  LibraryDetail, 
  LibraryStatistics, 
  LibraryQueryParams,
  CreateLibraryRequest,
  UpdateLibraryRequest,
  LibraryFile,
  LibraryFileQueryParams
} from '../types/library';
import { ApiError } from '../types/api';

// 加载状态类型
export interface LoadingState {
  loading: boolean;
  error: string | null;
}

// 获取文件库列表的Hook
export function useLibraries(initialParams?: LibraryQueryParams) {
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const [state, setState] = useState<LoadingState>({ loading: false, error: null });

  const fetchLibraries = useCallback(async (params?: LibraryQueryParams) => {
    setState({ loading: true, error: null });
    console.log('useLibraries - fetchLibraries called with params:', { initialParams, params });
    try {
      const result = await LibraryService.getLibraries({ ...initialParams, ...params });
      console.log('useLibraries - API result:', result);
      setLibraries(result.libraries);
      setPagination(result.pagination);
    } catch (error) {
      console.error('useLibraries - API error:', error);
      const errorMessage = error instanceof ApiError ? error.message : '获取文件库列表失败';
      setState({ loading: false, error: errorMessage });
      return;
    }
    setState({ loading: false, error: null });
    console.log('useLibraries - fetchLibraries completed successfully');
  }, [initialParams]);

  const refresh = useCallback(async () => {
    await fetchLibraries(initialParams);
  }, [fetchLibraries, initialParams]);

  useEffect(() => {
    fetchLibraries();
  }, [fetchLibraries]);

  return {
    libraries,
    pagination,
    ...state,
    fetchLibraries,
    refresh,
  };
}

// 获取文件库详情的Hook
export function useLibraryDetail(libraryId?: string) {
  const [library, setLibrary] = useState<LibraryDetail | null>(null);
  const [state, setState] = useState<LoadingState>({ loading: false, error: null });

  const fetchLibrary = useCallback(async (id?: string) => {
    const targetId = id || libraryId;
    if (!targetId) return;

    setState({ loading: true, error: null });
    try {
      const result = await LibraryService.getLibraryById(targetId);
      setLibrary(result);
    } catch (error) {
      const errorMessage = error instanceof ApiError ? error.message : '获取文件库详情失败';
      setState({ loading: false, error: errorMessage });
      return;
    }
    setState({ loading: false, error: null });
  }, [libraryId]);

  useEffect(() => {
    if (libraryId) {
      fetchLibrary();
    }
  }, [fetchLibrary, libraryId]);

  return {
    library,
    ...state,
    fetchLibrary,
    refresh: () => fetchLibrary(libraryId),
  };
}

// 获取统计信息的Hook
export function useLibraryStatistics() {
  const [statistics, setStatistics] = useState<LibraryStatistics | null>(null);
  const [state, setState] = useState<LoadingState>({ loading: false, error: null });

  const fetchStatistics = useCallback(async () => {
    setState({ loading: true, error: null });
    try {
      const result = await LibraryService.getStatistics();
      setStatistics(result);
    } catch (error) {
      const errorMessage = error instanceof ApiError ? error.message : '获取统计信息失败';
      setState({ loading: false, error: errorMessage });
      return;
    }
    setState({ loading: false, error: null });
  }, []);

  useEffect(() => {
    fetchStatistics();
  }, [fetchStatistics]);

  return {
    statistics,
    ...state,
    refresh: fetchStatistics,
  };
}

// 文件库操作的Hook
export function useLibraryActions() {
  const [state, setState] = useState<LoadingState>({ loading: false, error: null });

  const createLibrary = useCallback(async (data: CreateLibraryRequest): Promise<Library | null> => {
    setState({ loading: true, error: null });
    try {
      const result = await LibraryService.createLibrary(data);
      setState({ loading: false, error: null });
      return result;
    } catch (error) {
      const errorMessage = error instanceof ApiError ? error.message : '创建文件库失败';
      setState({ loading: false, error: errorMessage });
      return null;
    }
  }, []);

  const updateLibrary = useCallback(async (id: string, data: UpdateLibraryRequest): Promise<Library | null> => {
    setState({ loading: true, error: null });
    try {
      const result = await LibraryService.updateLibrary(id, data);
      setState({ loading: false, error: null });
      return result;
    } catch (error) {
      const errorMessage = error instanceof ApiError ? error.message : '更新文件库失败';
      setState({ loading: false, error: errorMessage });
      return null;
    }
  }, []);

  const deleteLibrary = useCallback(async (id: string): Promise<boolean> => {
    setState({ loading: true, error: null });
    try {
      await LibraryService.deleteLibrary(id);
      setState({ loading: false, error: null });
      return true;
    } catch (error) {
      const errorMessage = error instanceof ApiError ? error.message : '删除文件库失败';
      setState({ loading: false, error: errorMessage });
      return false;
    }
  }, []);

  return {
    ...state,
    createLibrary,
    updateLibrary,
    deleteLibrary,
  };
}

// 文件上传的Hook
export function useFileUpload() {
  const [state, setState] = useState<LoadingState>({ loading: false, error: null });

  const uploadFiles = useCallback(async (libraryId: string, files: File[]): Promise<LibraryFile[]> => {
    setState({ loading: true, error: null });
    try {
      const result = await LibraryService.uploadFiles(libraryId, files);
      setState({ loading: false, error: null });
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '文件上传失败';
      setState({ loading: false, error: errorMessage });
      throw error;
    }
  }, []);

  return {
    ...state,
    uploadFiles,
  };
}

// 获取文件库文件列表的Hook
export function useLibraryFiles(libraryId: string, initialParams?: LibraryFileQueryParams) {
  const [files, setFiles] = useState<LibraryFile[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const [state, setState] = useState<LoadingState>({ loading: false, error: null });

  const fetchFiles = useCallback(async (params?: LibraryFileQueryParams) => {
    if (!libraryId) return;
    
    setState({ loading: true, error: null });
    try {
      const result = await LibraryService.getLibraryFiles(libraryId, { ...initialParams, ...params });
      setFiles(result.files);
      setPagination(result.pagination);
    } catch (error) {
      const errorMessage = error instanceof ApiError ? error.message : '获取文件列表失败';
      setState({ loading: false, error: errorMessage });
      return;
    }
    setState({ loading: false, error: null });
  }, [libraryId, initialParams]);

  const refresh = useCallback(() => {
    fetchFiles(initialParams);
  }, [fetchFiles, initialParams]);

  useEffect(() => {
    if (libraryId) {
      fetchFiles();
    }
  }, [fetchFiles, libraryId]);

  return {
    files,
    pagination,
    ...state,
    fetchFiles,
    refresh,
  };
}

// 文件操作的Hook
export function useFileActions() {
  const [state, setState] = useState<LoadingState>({ loading: false, error: null });

  const deleteFile = useCallback(async (libraryId: string, fileId: string): Promise<boolean> => {
    setState({ loading: true, error: null });
    try {
      await LibraryService.deleteFile(libraryId, fileId);
      setState({ loading: false, error: null });
      return true;
    } catch (error) {
      const errorMessage = error instanceof ApiError ? error.message : '删除文件失败';
      setState({ loading: false, error: errorMessage });
      return false;
    }
  }, []);

  const downloadFile = useCallback(async (objectName: string, filename: string): Promise<boolean> => {
    setState({ loading: true, error: null });
    try {
      await LibraryService.downloadFile(objectName, filename);
      setState({ loading: false, error: null });
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '下载文件失败';
      setState({ loading: false, error: errorMessage });
      return false;
    }
  }, []);

  return {
    ...state,
    deleteFile,
    downloadFile,
  };
} 