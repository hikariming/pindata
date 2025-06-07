import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { SmartDatasetCreatorState, SmartDatasetCreatorActions, SelectedFile, DatasetCollection } from '../types';
import { DATASET_TYPES } from '../constants';
import { FileService } from '../../../../services/file.service';

// 初始状态
const initialState: SmartDatasetCreatorState = {
  // 步骤状态
  currentStep: 1,
  
  // 数据状态
  selectedFiles: [],
  availableFiles: [],
  datasetCollections: [],
  datasetType: 'qa-pairs',
  outputFormat: 'Alpaca',
  datasetName: '',
  datasetDescription: '',
  processingConfig: {
    model: 'gpt-4',
    temperature: 0.7,
    maxTokens: 2000,
    batchSize: 10,
    customPrompt: ''
  },
  
  // UI状态
  isLoading: false,
  loadingFiles: false,
  loadingCollections: false,
  progress: 0,
  error: null,
  showFormatDetails: false,
  selectedFormat: null,
};

// 模拟API调用获取文件列表
const mockLoadAvailableFiles = async (): Promise<SelectedFile[]> => {
  await new Promise(resolve => setTimeout(resolve, 1000));
  return [
    { id: '1', name: '产品介绍.md', path: '/rawdata/docs/产品介绍.md', size: 1024, type: 'markdown', selected: false },
    { id: '2', name: '用户手册.md', path: '/rawdata/docs/用户手册.md', size: 2048, type: 'markdown', selected: false },
    { id: '3', name: 'FAQ.md', path: '/rawdata/docs/FAQ.md', size: 1536, type: 'markdown', selected: false },
    { id: '4', name: '技术文档.md', path: '/rawdata/technical/技术文档.md', size: 4096, type: 'markdown', selected: false },
    { id: '5', name: '更新日志.md', path: '/rawdata/changelog/更新日志.md', size: 512, type: 'markdown', selected: false }
  ];
};

// 模拟生成过程
const mockGenerateDataset = async (onProgress: (progress: number) => void): Promise<void> => {
  for (let i = 0; i <= 100; i += 10) {
    await new Promise(resolve => setTimeout(resolve, 500));
    onProgress(i);
  }
};

export const useSmartDatasetCreatorStore = create<SmartDatasetCreatorState & SmartDatasetCreatorActions>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // 步骤控制
      nextStep: () => {
        const { currentStep } = get();
        const totalSteps = 5;
        if (currentStep < totalSteps) {
          set({ currentStep: currentStep + 1 });
        }
      },

      prevStep: () => {
        const { currentStep } = get();
        if (currentStep > 1) {
          set({ currentStep: currentStep - 1 });
        }
      },

      setCurrentStep: (step: number) => {
        set({ currentStep: step });
      },

      // 文件管理
      setAvailableFiles: (files: SelectedFile[]) => {
        set({ availableFiles: files });
      },

      handleFileSelection: (fileId: string, selected: boolean) => {
        const { availableFiles, selectedFiles } = get();
        
        // 更新可用文件列表
        const updatedAvailableFiles = availableFiles.map(file => 
          file.id === fileId ? { ...file, selected } : file
        );
        
        // 更新已选择文件列表
        let updatedSelectedFiles: SelectedFile[];
        if (selected) {
          const file = availableFiles.find(f => f.id === fileId);
          if (file) {
            updatedSelectedFiles = [...selectedFiles, { ...file, selected: true }];
          } else {
            updatedSelectedFiles = selectedFiles;
          }
        } else {
          updatedSelectedFiles = selectedFiles.filter(f => f.id !== fileId);
        }

        set({ 
          availableFiles: updatedAvailableFiles,
          selectedFiles: updatedSelectedFiles 
        });
      },

      handleSelectAll: (selected: boolean) => {
        const { availableFiles } = get();
        
        const updatedAvailableFiles = availableFiles.map(file => ({ ...file, selected }));
        const updatedSelectedFiles = selected ? 
          availableFiles.map(f => ({ ...f, selected: true })) : 
          [];

        set({ 
          availableFiles: updatedAvailableFiles,
          selectedFiles: updatedSelectedFiles 
        });
      },

      loadAvailableFiles: async () => {
        set({ loadingFiles: true, error: null });
        try {
          const files = await mockLoadAvailableFiles();
          set({ availableFiles: files });
        } catch (error) {
          set({ error: '加载文件列表失败' });
        } finally {
          set({ loadingFiles: false });
        }
      },

      // 数据集合管理 - 新增方法
      loadDatasetCollections: async () => {
        set({ loadingCollections: true, error: null });
        try {
          const libraries = await FileService.getLibraries();
          const collections: DatasetCollection[] = [];
          
          // 为每个数据集合获取MD文件
          for (const library of libraries) {
            try {
              const markdownFiles = await FileService.getLibraryMarkdownFiles(library.id);
              collections.push({
                library,
                markdownFiles,
                expanded: false,
                selected: false
              });
            } catch (error) {
              console.error(`获取数据集合 ${library.name} 的MD文件失败:`, error);
              collections.push({
                library,
                markdownFiles: [],
                expanded: false,
                selected: false
              });
            }
          }
          
          set({ datasetCollections: collections });
        } catch (error) {
          set({ error: '加载数据集合失败' });
        } finally {
          set({ loadingCollections: false });
        }
      },

      toggleCollectionExpanded: (libraryId: string) => {
        const { datasetCollections } = get();
        const updatedCollections = datasetCollections.map(collection =>
          collection.library.id === libraryId
            ? { ...collection, expanded: !collection.expanded }
            : collection
        );
        set({ datasetCollections: updatedCollections });
      },

      handleCollectionSelection: (libraryId: string, selected: boolean) => {
        const { datasetCollections, selectedFiles } = get();
        const collection = datasetCollections.find(c => c.library.id === libraryId);
        if (!collection) return;

        // 更新集合选中状态
        const updatedCollections = datasetCollections.map(c =>
          c.library.id === libraryId ? { ...c, selected } : c
        );

        // 更新选中的文件列表
        let updatedSelectedFiles = [...selectedFiles];
        
        if (selected) {
          // 选中整个集合：添加所有MD文件到选中列表
          const newFiles: SelectedFile[] = collection.markdownFiles.map(file => ({
            id: file.id,
            name: file.filename,
            path: file.minio_object_name,
            size: file.file_size,
            type: 'markdown',
            selected: true,
            libraryId: libraryId,
            libraryName: collection.library.name,
            isMarkdown: true,
            originalFile: file
          }));
          
          // 移除同一library的现有文件，然后添加新文件
          updatedSelectedFiles = updatedSelectedFiles.filter(f => f.libraryId !== libraryId);
          updatedSelectedFiles.push(...newFiles);
        } else {
          // 取消选中整个集合：移除该集合的所有文件
          updatedSelectedFiles = updatedSelectedFiles.filter(f => f.libraryId !== libraryId);
        }

        set({ 
          datasetCollections: updatedCollections,
          selectedFiles: updatedSelectedFiles
        });
      },

      handleCollectionFileSelection: (libraryId: string, fileId: string, selected: boolean) => {
        const { datasetCollections, selectedFiles } = get();
        const collection = datasetCollections.find(c => c.library.id === libraryId);
        if (!collection) return;

        const file = collection.markdownFiles.find(f => f.id === fileId);
        if (!file) return;

        let updatedSelectedFiles = [...selectedFiles];
        
        if (selected) {
          // 检查是否已存在
          if (!updatedSelectedFiles.find(f => f.id === fileId)) {
            const newFile: SelectedFile = {
              id: file.id,
              name: file.filename,
              path: file.minio_object_name,
              size: file.file_size,
              type: 'markdown',
              selected: true,
              libraryId: libraryId,
              libraryName: collection.library.name,
              isMarkdown: true,
              originalFile: file
            };
            updatedSelectedFiles.push(newFile);
          }
        } else {
          updatedSelectedFiles = updatedSelectedFiles.filter(f => f.id !== fileId);
        }

        // 检查是否整个集合都被选中了
        const selectedFileIds = updatedSelectedFiles.filter(f => f.libraryId === libraryId).map(f => f.id);
        const allSelected = collection.markdownFiles.length > 0 && 
                          collection.markdownFiles.every(f => selectedFileIds.includes(f.id));

        // 更新集合状态
        const updatedCollections = datasetCollections.map(c =>
          c.library.id === libraryId ? { ...c, selected: allSelected } : c
        );

        set({ 
          datasetCollections: updatedCollections,
          selectedFiles: updatedSelectedFiles
        });
      },

      // 数据集配置
      setDatasetType: (type: string) => {
        const datasetType = DATASET_TYPES.find(t => t.id === type);
        const outputFormat = datasetType && datasetType.formats.length > 0 ? 
          datasetType.formats[0] : 'Alpaca';
        
        set({ 
          datasetType: type,
          outputFormat 
        });
      },

      setOutputFormat: (format: string) => {
        set({ outputFormat: format });
      },

      setDatasetName: (name: string) => {
        set({ datasetName: name });
      },

      setDatasetDescription: (description: string) => {
        set({ datasetDescription: description });
      },

      // 模型配置
      setProcessingConfig: (config) => {
        set(state => ({ 
          processingConfig: { ...state.processingConfig, ...config }
        }));
      },

      // UI控制
      setIsLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      setLoadingFiles: (loading: boolean) => {
        set({ loadingFiles: loading });
      },

      setLoadingCollections: (loading: boolean) => {
        set({ loadingCollections: loading });
      },

      setProgress: (progress: number) => {
        set({ progress });
      },

      setError: (error: string | null) => {
        set({ error });
      },

      setShowFormatDetails: (show: boolean) => {
        set({ showFormatDetails: show });
      },

      setSelectedFormat: (format: string | null) => {
        set({ selectedFormat: format });
      },

      // 业务逻辑
      startGeneration: async () => {
        const { setIsLoading, setCurrentStep, setProgress } = get();
        
        setIsLoading(true);
        setCurrentStep(5);
        setProgress(0);

        try {
          await mockGenerateDataset((progress) => {
            setProgress(progress);
          });
          
          // 生成完成后可以导航到数据集列表
          // 这里可以通过回调或事件来处理导航
          setTimeout(() => {
            // navigate('/datasets');
          }, 1000);
          
        } catch (error) {
          set({ error: '数据集生成失败' });
        } finally {
          setIsLoading(false);
        }
      },

      resetState: () => {
        set(initialState);
      },
    }),
    {
      name: 'smart-dataset-creator-store', // devtools中显示的名称
    }
  )
); 