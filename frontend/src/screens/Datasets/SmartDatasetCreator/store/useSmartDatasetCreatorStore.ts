import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { SmartDatasetCreatorState, SmartDatasetCreatorActions, SelectedFile, DatasetCollection } from '../types';
import { DATASET_TYPES, FORMAT_DETAILS } from '../constants';
import { FileService } from '../../../../services/file.service';
import { LLMService } from '../../../../services/llm.service';
import { LLMConfig } from '../../../../types/llm';

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
    model: '',
    temperature: 0.7,
    maxTokens: 2000,
    batchSize: 10,
    customPrompt: '',
    chunkSize: 1000,
    chunkOverlap: 200,
    preserveStructure: true,
    splitByHeaders: true
  },
  availableLLMConfigs: [],
  
  // UI状态
  isLoading: false,
  loadingFiles: false,
  loadingCollections: false,
  loadingLLMConfigs: false,
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

      loadLLMConfigs: async () => {
        set({ loadingLLMConfigs: true, error: null });
        try {
          const { configs } = await LLMService.getConfigs({ is_active: true });
          set({ 
            availableLLMConfigs: configs,
            // 如果还没有选择模型且有可用配置，选择默认配置或第一个
            processingConfig: get().processingConfig.model === '' && configs.length > 0 ? {
              ...get().processingConfig,
              model: configs.find(c => c.is_default)?.id || configs[0].id
            } : get().processingConfig
          });
        } catch (error) {
          set({ error: '加载模型配置失败' });
        } finally {
          set({ loadingLLMConfigs: false });
        }
      },

      generatePrompt: () => {
        const { 
          datasetType, 
          outputFormat, 
          selectedFiles, 
          datasetName, 
          datasetDescription,
          processingConfig 
        } = get();
        
        const currentDatasetType = DATASET_TYPES.find(t => t.id === datasetType);
        const formatDetails = FORMAT_DETAILS[outputFormat as keyof typeof FORMAT_DETAILS];
        
        if (!currentDatasetType) return '';

        const fileCount = selectedFiles.length;
        const fileNames = selectedFiles.map(f => f.name).join(', ');
        const totalEstimatedChunks = Math.ceil(selectedFiles.length * 2000 / processingConfig.chunkSize);
        
        // 构建个性化的项目背景
        let projectContext = '';
        if (datasetName || datasetDescription) {
          projectContext = `\n## 项目背景`;
          if (datasetName) {
            projectContext += `\n数据集名称：${datasetName}`;
          }
          if (datasetDescription) {
            projectContext += `\n项目描述：${datasetDescription}`;
          }
          projectContext += `\n请确保生成的数据与项目目标保持一致。`;
        }

        // 基础提示词
        let basePrompt = `你是一位专业的AI数据标注专家，专门负责从文档中生成高质量的${currentDatasetType.name}训练数据。

## 任务概述${projectContext}

## 技术规格
- **输出格式**：${formatDetails?.name || outputFormat} 
- **数据类型**：${currentDatasetType.name}
- **应用领域**：${currentDatasetType.useCase}
- **文档分片**：每片约${processingConfig.chunkSize}字符，重叠${processingConfig.chunkOverlap}字符

## 格式要求
${formatDetails ? `
**${formatDetails.name}格式特点**：
- 数据结构：${formatDetails.structure}
- 适用场景：${formatDetails.bestFor.join('、')}
- 格式示例：
\`\`\`json
${formatDetails.example}
\`\`\`
` : '请严格按照指定格式输出数据。'}

## 质量标准
1. **准确性**：确保提取的信息准确无误，不添加文档中不存在的内容
2. **完整性**：涵盖文档的关键信息点，避免遗漏重要内容  
3. **多样性**：生成不同类型、不同难度的训练样本
4. **一致性**：保持数据格式的统一性和规范性
5. **相关性**：确保生成的数据与${currentDatasetType.useCase}场景高度相关

## 处理策略
- **文档理解**：深度理解文档内容和结构
- **智能提取**：识别关键信息和概念
- **格式转换**：将内容转换为${outputFormat}格式
- **质量验证**：确保每条数据都符合质量标准`;

        // 添加文档分片处理说明
        if (processingConfig.preserveStructure || processingConfig.splitByHeaders) {
          basePrompt += `\n\n## 文档处理配置`;
          if (processingConfig.preserveStructure) {
            basePrompt += `\n- **结构保持**：优先保持文档的原有结构（标题、段落、列表等）`;
          }
          if (processingConfig.splitByHeaders) {
            basePrompt += `\n- **标题分割**：优先在markdown标题处进行文档分割`;
          }
          basePrompt += `\n- **分片处理**：文档将被分为约${totalEstimatedChunks}个片段，请确保每个片段都能生成有价值的训练数据`;
        }

        // 根据数据集类型添加具体指导
        switch (datasetType) {
          case 'qa-pairs':
            basePrompt += `\n\n## 问答对生成指南
### 问题设计原则
- **层次化问题**：包含事实性、理解性、应用性和分析性问题
- **自然语言**：使用自然、口语化的问题表达方式
- **明确指向**：每个问题都应该有明确的答案指向
- **实用性**：问题应该是用户在实际场景中可能提出的

### 答案质量要求
- **准确完整**：基于文档内容提供准确、完整的答案
- **结构清晰**：使用适当的段落和条目组织答案
- **深度适中**：既要包含必要细节，又要保持简洁明了
- **上下文相关**：答案应该与问题和文档上下文紧密相关

### 生成策略
- 每个文档片段生成3-5个高质量问答对
- 覆盖片段中的主要信息点
- 确保问答对之间有适当的多样性
- 避免重复或过于相似的问题`;
            break;

          case 'instruction-tuning':
            basePrompt += `\n\n## 指令微调数据生成指南
### 指令设计原则
- **任务明确**：清晰描述需要执行的具体任务
- **可操作性**：指令应该是可执行的、具体的
- **场景化**：结合实际应用场景设计指令
- **多样化**：包含不同类型和复杂度的任务指令

### 输入输出设计
- **输入相关性**：输入内容应该与指令高度相关
- **输出质量**：提供高质量、符合期望的输出示例
- **逻辑一致**：确保指令-输入-输出三者逻辑一致
- **实用价值**：输出应该具有实际应用价值

### 任务类型覆盖
- 信息提取和总结任务
- 内容转换和格式化任务
- 分析和判断任务
- 创作和生成任务
- 问题解答和指导任务`;
            break;

          case 'text-classification':
            basePrompt += `\n\n## 文本分类数据生成指南
### 文本片段选择
- **代表性**：选择能代表不同类别的典型文本片段
- **长度适中**：文本长度适合分类任务（建议50-200字符）
- **信息完整**：确保文本片段包含足够的分类特征
- **边界清晰**：避免模糊或难以分类的边界案例

### 标签设计原则
- **类别明确**：每个标签都有清晰的定义和边界
- **互斥性**：确保类别之间相互排斥
- **平衡性**：尽量保持各类别的数据平衡
- **实用性**：标签应该符合实际应用需求

### 质量保证
- 每个文档片段提取2-4个分类样本
- 确保标签的准确性和一致性
- 包含正面和负面的典型示例
- 避免偏见和歧视性内容`;
            break;

          case 'dialogue':
            basePrompt += `\n\n## 对话数据生成指南
### 对话设计原则
- **自然流畅**：对话应该符合自然语言交流习惯
- **上下文连贯**：多轮对话保持逻辑连贯性
- **角色一致**：保持对话双方的角色特征一致
- **信息丰富**：通过对话传达有价值的信息

### 多轮对话策略
- **渐进式信息披露**：逐步深入探讨话题
- **用户意图理解**：准确理解和回应用户需求
- **上下文记忆**：保持对话历史的连续性
- **自然转换**：话题转换要自然合理

### 对话质量要求
- 每个文档片段生成2-3个对话序列
- 每个对话包含3-8轮交互
- 覆盖不同的用户问询场景
- 体现专业知识和服务态度`;
            break;

          case 'domain-adaptation':
            basePrompt += `\n\n## 领域适配数据生成指南
### 领域特色体现
- **专业术语**：准确使用领域相关的专业术语
- **知识深度**：体现领域特有的知识深度和广度
- **应用场景**：结合具体的领域应用场景
- **专业标准**：符合行业规范和专业标准

### 知识结构化
- **概念关联**：建立领域概念之间的关联关系
- **层次组织**：按照知识的难度和重要性分层
- **实践结合**：理论知识与实际应用相结合
- **案例丰富**：提供典型的领域应用案例

### 适配策略
- 每个文档片段生成3-5个领域特化样本
- 突出领域特有的知识点和技能
- 包含不同熟练程度的学习材料
- 体现领域发展的最新趋势`;
            break;

          case 'reasoning':
            basePrompt += `\n\n## 推理数据生成指南
### 推理链构建
- **步骤清晰**：每个推理步骤都要明确和具体
- **逻辑严密**：确保推理过程的逻辑一致性
- **可验证性**：每个步骤都可以独立验证
- **完整性**：从前提到结论的完整推理链

### 思维过程展示
- **显式推理**：明确展示思考过程
- **关键假设**：说明推理中的关键假设
- **替代方案**：考虑其他可能的推理路径
- **不确定性**：适当表达推理中的不确定性

### 推理类型覆盖
- **演绎推理**：从一般到特殊的逻辑推导
- **归纳推理**：从特殊到一般的规律总结
- **类比推理**：基于相似性的推理
- **因果推理**：分析原因和结果的关系
- **数学推理**：基于数学逻辑的计算和证明`;
            break;

          case 'knowledge-distillation':
            basePrompt += `\n\n## 知识蒸馏数据生成指南
### 知识提炼原则
- **核心概念**：提取文档中的核心知识点
- **简化表达**：用更简洁的方式表达复杂概念
- **保真度**：确保简化后不失原意
- **可理解性**：提高知识的可理解性和可记忆性

### 层次化组织
- **知识层级**：按重要性和复杂度分层
- **依赖关系**：明确知识点之间的依赖关系
- **学习路径**：设计合理的学习顺序
- **难度梯度**：从简单到复杂的渐进式安排

### 效率优化
- **关键信息**：突出最重要的信息
- **冗余消除**：去除不必要的重复内容
- **结构化**：用结构化方式组织知识
- **易检索**：便于快速查找和应用`;
            break;
        }

        // 添加输入文件信息
        basePrompt += `\n\n## 待处理文件清单
文件总数：${fileCount}个
文件列表：${fileNames}

请逐一处理每个文档片段，为每个片段生成相应数量的高质量训练数据。确保所有生成的数据都严格遵循${outputFormat}格式规范，并体现${currentDatasetType.name}的特点。`;

        return basePrompt;
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

      setLoadingLLMConfigs: (loading: boolean) => {
        set({ loadingLLMConfigs: loading });
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
      // startGeneration功能已迁移到Step4PreviewConfirm组件内部处理

      resetState: () => {
        set(initialState);
      },
    }),
    {
      name: 'smart-dataset-creator-store', // devtools中显示的名称
    }
  )
); 