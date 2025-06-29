import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { SmartDatasetCreatorState, SmartDatasetCreatorActions, SelectedFile, DatasetCollection } from '../types';
import { DATASET_TYPES, FORMAT_DETAILS } from '../constants';
import { FileService } from '../../../../services/file.service';
import { LLMService } from '../../../../services/llm.service';
import { LLMConfig } from '../../../../types/llm';
import { useTranslation } from 'react-i18next';

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
    splitByHeaders: true,
    // 思考过程配置默认值
    enableThinkingProcess: false,
    reasoningExtractionMethod: null,
    reasoningExtractionConfig: null,
    distillationPrompt: '请详细说明你的思考过程，包括分析步骤和推理逻辑：',
    includeThinkingInOutput: false
  },
  availableLLMConfigs: [],
  
  // 任务状态
  taskInfo: null,
  
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
            name: file.original_filename || file.filename,
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
              name: file.original_filename || file.filename,
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
        
        // Get current language from i18next
        const currentLanguage = localStorage.getItem('i18nextLng') || 'zh';
        const isEnglish = currentLanguage === 'en';
        const isJapanese = currentLanguage === 'ja';
        
        const currentDatasetType = DATASET_TYPES.find(t => t.id === datasetType);
        const formatDetails = FORMAT_DETAILS[outputFormat as keyof typeof FORMAT_DETAILS];
        
        if (!currentDatasetType) return '';

        const fileCount = selectedFiles.length;
        const fileNames = selectedFiles.map(f => f.name).join(', ');
        const totalEstimatedChunks = Math.ceil(selectedFiles.length * 2000 / processingConfig.chunkSize);
        
        // 构建个性化的项目背景
        let projectContext = '';
        if (datasetName || datasetDescription) {
          if (isEnglish) {
            projectContext = `\n## Project Background`;
            if (datasetName) {
              projectContext += `\nDataset Name: ${datasetName}`;
            }
            if (datasetDescription) {
              projectContext += `\nProject Description: ${datasetDescription}`;
            }
            projectContext += `\nPlease ensure the generated data is consistent with project objectives.`;
          } else if (isJapanese) {
            projectContext = `\n## プロジェクト背景`;
            if (datasetName) {
              projectContext += `\nデータセット名：${datasetName}`;
            }
            if (datasetDescription) {
              projectContext += `\nプロジェクト説明：${datasetDescription}`;
            }
            projectContext += `\n生成されたデータがプロジェクトの目標と一致することを確認してください。`;
          } else {
            projectContext = `\n## 项目背景`;
            if (datasetName) {
              projectContext += `\n数据集名称：${datasetName}`;
            }
            if (datasetDescription) {
              projectContext += `\n项目描述：${datasetDescription}`;
            }
            projectContext += `\n请确保生成的数据与项目目标保持一致。`;
          }
        }

        // 基础提示词 - 支持多语言
        let basePrompt;
        
        if (isEnglish) {
          basePrompt = `You are a professional AI data annotation expert, specializing in generating high-quality ${currentDatasetType.name} training data from documents.

## Task Overview${projectContext}

## Technical Specifications
- **Output Format**: ${formatDetails?.name || outputFormat} 
- **Data Type**: ${currentDatasetType.name}
- **Application Field**: ${currentDatasetType.useCase}
- **Document Sharding**: Each chunk ~${processingConfig.chunkSize} characters, overlap ${processingConfig.chunkOverlap} characters

## Format Requirements
${formatDetails ? `
**${formatDetails.name} Format Features**:
- Data Structure: ${formatDetails.structure}
- Best For: ${formatDetails.bestFor.join(', ')}
- Format Example:
\`\`\`json
${formatDetails.example}
\`\`\`
` : 'Please strictly follow the specified format for data output.'}

## Quality Standards
1. **Accuracy**: Ensure extracted information is accurate and error-free, do not add content that doesn't exist in the document
2. **Completeness**: Cover key information points in the document, avoid missing important content
3. **Diversity**: Generate training samples of different types and difficulty levels
4. **Consistency**: Maintain consistency and standardization of data formats
5. **Relevance**: Ensure generated data is highly relevant to ${currentDatasetType.useCase} scenarios
6. **Quantity**: Generate SUBSTANTIAL amounts of data - aim for maximum extraction from each document segment
7. **Depth**: Create comprehensive, detailed training examples that fully utilize source content

## Processing Strategy
- **Document Understanding**: Deep understanding of document content and structure
- **Intelligent Extraction**: Identify key information and concepts with maximum coverage
- **Format Conversion**: Convert content to ${outputFormat} format
- **Quality Validation**: Ensure each data item meets quality standards
- **Volume Optimization**: Maximize the number of high-quality samples from each document segment`;
        } else if (isJapanese) {
          basePrompt = `あなたは文書から高品質な${currentDatasetType.name}トレーニングデータを生成することを専門とするプロフェッショナルなAIデータアノテーションエキスパートです。

## タスク概要${projectContext}

## 技術仕様
- **出力形式**: ${formatDetails?.name || outputFormat} 
- **データタイプ**: ${currentDatasetType.name}
- **適用分野**: ${currentDatasetType.useCase}
- **文書シャーディング**: 各チャンク約${processingConfig.chunkSize}文字、オーバーラップ${processingConfig.chunkOverlap}文字

## 形式要件
${formatDetails ? `
**${formatDetails.name}形式特徴**：
- データ構造：${formatDetails.structure}
- 最適用途：${formatDetails.bestFor.join('、')}
- 形式例：
\`\`\`json
${formatDetails.example}
\`\`\`
` : '指定された形式でのデータ出力を厳密に遵守してください。'}

## 品質基準
1. **正確性**：抽出された情報が正確でエラーがないことを確認し、文書に存在しない内容を追加しない
2. **完全性**：文書の重要な情報ポイントをカバーし、重要な内容の漏れを避ける
3. **多様性**：異なるタイプ、異なる難易度のトレーニングサンプルを生成
4. **一貫性**：データ形式の統一性と標準化を維持
5. **関連性**：生成されたデータが${currentDatasetType.useCase}シナリオと高度に関連することを確認
6. **数量要求**：大量の高品質データを生成 - 各文書セグメントから最大抽出を目指す
7. **深度要求**：ソースコンテンツを完全に活用した包括的で詳細なトレーニング例を作成

## 処理戦略
- **文書理解**：文書内容と構造の深い理解
- **インテリジェント抽出**：キー情報と概念の特定、最大カバレッジの確保
- **形式変換**：内容を${outputFormat}形式に変換
- **品質検証**：各データ項目が品質基準を満たすことを確認
- **ボリューム最適化**：各文書セグメントから高品質サンプルの数を最大化`;
        } else {
          basePrompt = `你是一位专业的AI数据标注专家，专门负责从文档中生成高质量的${currentDatasetType.name}训练数据。

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
6. **数量要求**：生成大量高质量数据 - 力求从每个文档片段中最大化提取
7. **深度要求**：创建全面、详细的训练样例，充分利用源内容

## 处理策略
- **文档理解**：深度理解文档内容和结构
- **智能提取**：识别关键信息和概念，确保最大覆盖率
- **格式转换**：将内容转换为${outputFormat}格式
- **质量验证**：确保每条数据都符合质量标准
- **数量优化**：从每个文档片段中最大化生成高质量样本数量`;
        }

        // 添加文档分片处理说明
        if (processingConfig.preserveStructure || processingConfig.splitByHeaders) {
          if (isEnglish) {
            basePrompt += `\n\n## Document Processing Configuration`;
            if (processingConfig.preserveStructure) {
              basePrompt += `\n- **Structure Preservation**: Prioritize maintaining the original document structure (titles, paragraphs, lists, etc.)`;
            }
            if (processingConfig.splitByHeaders) {
              basePrompt += `\n- **Header Splitting**: Prioritize splitting documents at markdown headers`;
            }
            basePrompt += `\n- **Shard Processing**: Document will be divided into approximately ${totalEstimatedChunks} segments, please ensure each segment generates valuable training data at maximum volume`;
          } else if (isJapanese) {
            basePrompt += `\n\n## 文書処理設定`;
            if (processingConfig.preserveStructure) {
              basePrompt += `\n- **構造保持**：文書の元の構造（タイトル、段落、リスト等）の保持を優先`;
            }
            if (processingConfig.splitByHeaders) {
              basePrompt += `\n- **ヘッダー分割**：markdownヘッダーでの文書分割を優先`;
            }
            basePrompt += `\n- **シャード処理**：文書は約${totalEstimatedChunks}のセグメントに分割されます。各セグメントが最大量の価値あるトレーニングデータを生成できることを確認してください`;
          } else {
            basePrompt += `\n\n## 文档处理配置`;
            if (processingConfig.preserveStructure) {
              basePrompt += `\n- **结构保持**：优先保持文档的原有结构（标题、段落、列表等）`;
            }
            if (processingConfig.splitByHeaders) {
              basePrompt += `\n- **标题分割**：优先在markdown标题处进行文档分割`;
            }
            basePrompt += `\n- **分片处理**：文档将被分为约${totalEstimatedChunks}个片段，请确保每个片段都能最大化生成有价值的训练数据`;
          }
        }

        // 根据数据集类型添加具体指导 - 支持多语言且提高质量要求
        switch (datasetType) {
          case 'qa-pairs':
            if (isEnglish) {
              basePrompt += `\n\n## Q&A Pair Generation Guide
### Question Design Principles
- **Hierarchical Questions**: Include factual, comprehension, application, analytical, and creative questions covering multiple levels of Bloom's taxonomy
- **Natural Language**: Use natural, conversational question expressions that mimic real user questioning habits
- **Clear Direction**: Each question should have a clear answer direction, avoiding vague or overly open-ended questions
- **Practicality**: Questions should be those users might ask in real scenarios, with practical significance
- **Diversity & Depth**: Cover different difficulty levels, from basic cognition to deep analysis, ensuring data richness

### Answer Quality Requirements
- **Accurate & Complete**: Provide accurate, complete answers based on document content, do not fabricate information
- **Clear Structure**: Use appropriate paragraphs, bullet points, and logical structure to organize answers
- **Appropriate Depth**: Include necessary details while maintaining conciseness and clarity, avoiding redundancy
- **Context Relevant**: Answers should be closely related to questions and document context
- **Professional Tone**: Maintain professional, friendly tone that reflects professional knowledge level

### Generation Strategy - MAXIMUM OUTPUT
- Generate 8-12 high-quality Q&A pairs per document segment (increased from 3-5)
- Cover ALL main information points in segments, including core concepts, key details, and practical information
- Ensure appropriate diversity among Q&A pairs, avoiding repetition or excessive similarity
- Include questions of different difficulty gradients, from simple to complex in progression
- Combine with practical application scenarios to generate Q&A pairs with practical value
- Extract every possible valuable question from the content - leave no stone unturned`;
            } else if (isJapanese) {
              basePrompt += `\n\n## 質問応答ペア生成ガイド
### 質問設計原則
- **階層的質問**：事実的、理解的、応用的、分析的、創造的質問を含み、ブルームの分類法の複数レベルをカバー
- **自然言語**：自然で口語的な質問表現を使用し、実際のユーザーの質問習慣を模倣
- **明確な方向性**：各質問は明確な回答方向を持ち、曖昧または過度にオープンエンドな質問を避ける
- **実用性**：質問は実際のシナリオでユーザーが尋ねる可能性があるもので、現実的な意義を持つ
- **多様性と深度**：基礎認知から深度分析まで、異なる難易度レベルをカバーし、データの豊富性を確保

### 回答品質要件
- **正確で完全**：文書内容に基づいて正確で完全な回答を提供し、情報を捏造しない
- **明確な構造**：適切な段落、箇条書き、論理構造を使用して回答を整理
- **適切な深度**：必要な詳細を含みながら簡潔明瞭さを保持し、冗長性を避ける
- **文脈関連**：回答は質問と文書文脈に密接に関連すべき
- **プロフェッショナルなトーン**：専門的で親しみやすいトーンを維持し、専門知識レベルを反映

### 生成戦略 - 最大出力
- 文書セグメントあたり8-12個の高品質質問応答ペアを生成（3-5個から増加）
- セグメント内のすべての主要情報ポイントをカバー、コア概念、キー詳細、実用情報を含む
- 質問応答ペア間の適切な多様性を確保し、重複や過度の類似性を避ける
- 簡単から複雑への段階的進行で、異なる難易度グラデーションの質問を含む
- 実際の応用シナリオと組み合わせて、実用価値のある質問応答ペアを生成
- 内容からあらゆる価値ある質問を抽出 - 重要ポイントを見逃さない`;
            } else {
              basePrompt += `\n\n## 问答对生成指南
### 问题设计原则
- **层次化问题**：包含事实性、理解性、应用性、分析性和创造性问题，涵盖布鲁姆分类法的多个层次
- **自然语言**：使用自然、口语化的问题表达方式，模拟真实用户的提问习惯
- **明确指向**：每个问题都应该有明确的答案指向，避免模糊或开放性过大的问题
- **实用性**：问题应该是用户在实际场景中可能提出的，具有现实意义
- **多样性与深度**：涵盖不同难度层次，从基础认知到深度分析，确保数据的丰富性

### 答案质量要求
- **准确完整**：基于文档内容提供准确、完整的答案，不编造信息
- **结构清晰**：使用适当的段落、条目和逻辑结构组织答案
- **深度适中**：既要包含必要细节，又要保持简洁明了，避免冗余
- **上下文相关**：答案应该与问题和文档上下文紧密相关
- **专业语调**：保持专业、友好的语调，体现专业知识水平

### 生成策略 - 最大化输出
- 每个文档片段生成8-12个高质量问答对（从原来的3-5个提升）
- 覆盖片段中的所有主要信息点，包括核心概念、关键细节和实用信息
- 确保问答对之间有适当的多样性，避免重复或过于相似
- 包含不同难度梯度的问题，从简单到复杂循序渐进
- 结合实际应用场景，生成具有实用价值的问答对
- 从内容中提取每一个可能有价值的问题 - 不遗漏任何要点`;
            }
            break;

          case 'instruction-tuning':
            if (isEnglish) {
              basePrompt += `\n\n## Instruction Tuning Data Generation Guide
### Instruction Design Principles
- **Task Clarity**: Clearly describe the specific task to be executed, avoiding ambiguity
- **Actionability**: Instructions should be executable and specific with clear operational steps
- **Scenario-based**: Design instructions based on practical application scenarios, close to real usage needs
- **Diversified**: Include different types and complexity levels of task instructions, covering multiple application scenarios
- **Scalable**: Instruction format should support decomposition and combination of complex tasks

### Input-Output Design
- **Input Relevance**: Input content should be highly relevant to instructions, providing necessary contextual information
- **Output Quality**: Provide high-quality output examples that meet expectations and reflect professional standards
- **Logical Consistency**: Ensure instruction-input-output triplets are logically consistent, forming complete task loops
- **Practical Value**: Output should have practical application value and solve real problems

### Task Type Coverage - MAXIMUM EXTRACTION
- Information extraction and summarization tasks: Extract key information from complex documents
- Content conversion and formatting tasks: Convert content between different formats
- Analysis and judgment tasks: Professional analysis based on given information
- Creation and generation tasks: Generate new content based on requirements
- Q&A and guidance tasks: Provide professional answers and guidance suggestions
- Generate 6-10 instruction tuning examples per document segment (increased volume)`;
            } else if (isJapanese) {
              basePrompt += `\n\n## 指示チューニングデータ生成ガイド
### 指示設計原則
- **タスクの明確性**：実行すべき具体的タスクを明確に記述し、曖昧性を避ける
- **実行可能性**：指示は実行可能で具体的であり、明確な操作ステップを持つ
- **シナリオベース**：実際の応用シナリオに基づいて指示を設計し、実際の使用ニーズに近づける
- **多様化**：異なるタイプと複雑さレベルのタスク指示を含み、複数の応用シナリオをカバー
- **スケーラブル**：指示形式は複雑タスクの分解と組み合わせをサポートすべき

### 入力出力設計
- **入力関連性**：入力内容は指示と高度に関連し、必要な文脈情報を提供
- **出力品質**：期待に応える高品質な出力例を提供し、プロフェッショナル基準を反映
- **論理一貫性**：指示-入力-出力トリプレットが論理的に一貫し、完全なタスクループを形成することを確認
- **実用価値**：出力は実際の応用価値を持ち、実際の問題を解決すべき

### タスクタイプカバレッジ - 最大抽出
- 情報抽出と要約タスク：複雑な文書からキー情報を抽出
- 内容変換と形式化タスク：異なる形式間での内容変換
- 分析と判断タスク：与えられた情報に基づく専門分析
- 作成と生成タスク：要件に基づく新しい内容の生成
- 質問応答と指導タスク：専門的な回答と指導提案の提供
- 文書セグメントあたり6-10個の指示チューニング例を生成（量増加）`;
            } else {
              basePrompt += `\n\n## 指令微调数据生成指南
### 指令设计原则
- **任务明确**：清晰描述需要执行的具体任务，避免歧义
- **可操作性**：指令应该是可执行的、具体的，有明确的操作步骤
- **场景化**：结合实际应用场景设计指令，贴近真实使用需求
- **多样化**：包含不同类型和复杂度的任务指令，覆盖多种应用场景
- **可扩展性**：指令格式应支持复杂任务的分解和组合

### 输入输出设计
- **输入相关性**：输入内容应该与指令高度相关，提供必要的上下文信息
- **输出质量**：提供高质量、符合期望的输出示例，体现专业水准
- **逻辑一致**：确保指令-输入-输出三者逻辑一致，形成完整的任务闭环
- **实用价值**：输出应该具有实际应用价值，能解决真实问题

### 任务类型覆盖 - 最大化提取
- 信息提取和总结任务：从复杂文档中提取关键信息
- 内容转换和格式化任务：在不同格式间进行内容转换
- 分析和判断任务：基于给定信息进行专业分析
- 创作和生成任务：基于要求生成新的内容
- 问题解答和指导任务：提供专业的解答和指导建议
- 每个文档片段生成6-10个指令微调样例（提升数量）`;
            }
            break;

          case 'text-classification':
            if (isEnglish) {
              basePrompt += `\n\n## Text Classification Data Generation Guide
### Text Segment Selection
- **Representative**: Select typical text segments that represent different categories
- **Appropriate Length**: Text length suitable for classification tasks (recommended 100-300 characters)
- **Complete Information**: Ensure text segments contain sufficient classification feature information
- **Clear Boundaries**: Avoid vague or difficult-to-classify boundary cases

### Label Design Principles
- **Category Clarity**: Each label has clear definition and boundaries
- **Mutual Exclusivity**: Ensure categories are mutually exclusive, avoiding overlap
- **Balanced**: Try to maintain data balance among various categories
- **Practical**: Labels should meet actual application needs

### Quality Assurance - MAXIMUM EXTRACTION
- Extract 6-10 classification samples per document segment (increased from 2-4)
- Ensure accuracy and consistency of labels
- Include typical positive and negative examples
- Avoid biased and discriminatory content
- Cover all possible classification scenarios from the content`;
            } else if (isJapanese) {
              basePrompt += `\n\n## テキスト分類データ生成ガイド
### テキストセグメント選択
- **代表性**：異なるカテゴリを代表する典型的なテキストセグメントを選択
- **適切な長さ**：分類タスクに適したテキスト長（100-300文字推奨）
- **完全情報**：テキストセグメントが十分な分類特徴情報を含むことを確認
- **明確な境界**：曖昧または分類困難な境界ケースを避ける

### ラベル設計原則
- **カテゴリの明確性**：各ラベルは明確な定義と境界を持つ
- **相互排他性**：カテゴリ間の相互排他性を確保し、重複を避ける
- **バランス**：各カテゴリのデータバランスの維持を試みる
- **実用性**：ラベルは実際の応用ニーズに適合すべき

### 品質保証 - 最大抽出
- 文書セグメントあたり6-10個の分類サンプルを抽出（2-4個から増加）
- ラベルの正確性と一貫性を確保
- 典型的なポジティブとネガティブの例を含む
- 偏見と差別的内容を避ける
- 内容からすべての可能な分類シナリオをカバー`;
            } else {
              basePrompt += `\n\n## 文本分类数据生成指南
### 文本片段选择
- **代表性**：选择能代表不同类别的典型文本片段
- **长度适中**：文本长度适合分类任务（建议100-300字符）
- **信息完整**：确保文本片段包含足够的分类特征信息
- **边界清晰**：避免模糊或难以分类的边界案例

### 标签设计原则
- **类别明确**：每个标签都有清晰的定义和边界
- **互斥性**：确保类别之间相互排斥，避免重叠
- **平衡性**：尽量保持各类别的数据平衡
- **实用性**：标签应该符合实际应用需求

### 质量保证 - 最大化提取
- 每个文档片段提取6-10个分类样本（从原来的2-4个提升）
- 确保标签的准确性和一致性
- 包含正面和负面的典型示例
- 避免偏见和歧视性内容
- 覆盖内容中所有可能的分类场景`;
            }
            break;

          case 'dialogue':
            if (isEnglish) {
              basePrompt += `\n\n## Dialogue Data Generation Guide
### Dialogue Design Principles
- **Natural & Fluent**: Dialogues should conform to natural language communication habits
- **Context Coherent**: Multi-turn dialogues maintain logical coherence
- **Role Consistent**: Maintain consistent role characteristics for dialogue participants
- **Information Rich**: Convey valuable information through dialogue

### Multi-turn Dialogue Strategy
- **Progressive Disclosure**: Gradually deepen topic exploration
- **Intent Understanding**: Accurately understand and respond to user needs
- **Context Memory**: Maintain continuity of dialogue history
- **Natural Transition**: Topic transitions should be natural and reasonable

### Dialogue Quality Requirements - ENHANCED VOLUME
- Generate 4-6 dialogue sequences per document segment (increased from 2-3)
- Each dialogue contains 6-12 rounds of interaction (increased from 3-8)
- Cover different user inquiry scenarios
- Reflect professional knowledge and service attitude
- Create comprehensive dialogue coverage of all document content`;
            } else if (isJapanese) {
              basePrompt += `\n\n## 対話データ生成ガイド
### 対話設計原則
- **自然で流暢**：対話は自然言語コミュニケーション習慣に適合すべき
- **文脈の一貫性**：マルチターン対話は論理的一貫性を維持
- **役割の一貫性**：対話参加者の役割特性の一貫性を維持
- **情報豊富**：対話を通じて価値ある情報を伝達

### マルチターン対話戦略
- **段階的開示**：トピック探索を段階的に深める
- **意図理解**：ユーザーニーズを正確に理解し応答
- **文脈記憶**：対話履歴の連続性を維持
- **自然な遷移**：トピック遷移は自然で合理的であるべき

### 対話品質要件 - 強化ボリューム
- 文書セグメントあたり4-6個の対話シーケンスを生成（2-3個から増加）
- 各対話は6-12ラウンドのインタラクションを含む（3-8ラウンドから増加）
- 異なるユーザー問い合わせシナリオをカバー
- 専門知識とサービス態度を反映
- すべての文書内容の包括的対話カバレッジを作成`;
            } else {
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

### 对话质量要求 - 增强数量
- 每个文档片段生成4-6个对话序列（从原来的2-3个提升）
- 每个对话包含6-12轮交互（从原来的3-8轮提升）
- 覆盖不同的用户问询场景
- 体现专业知识和服务态度
- 对所有文档内容进行全面的对话覆盖`;
            }
            break;

          case 'domain-adaptation':
            if (isEnglish) {
              basePrompt += `\n\n## Domain Adaptation Data Generation Guide
### Domain Feature Representation
- **Professional Terms**: Accurately use domain-related professional terminology and concepts
- **Knowledge Depth**: Reflect domain-specific knowledge depth and breadth
- **Application Scenarios**: Combine with specific domain application scenarios and practical cases
- **Professional Standards**: Comply with industry norms and professional standards

### Knowledge Structuring
- **Concept Association**: Establish associative relationships between domain concepts
- **Hierarchical Organization**: Organize by knowledge difficulty and importance levels
- **Theory-Practice Integration**: Combine theoretical knowledge with practical applications
- **Rich Cases**: Provide typical domain application cases and best practices

### Adaptation Strategy - MAXIMUM SPECIALIZATION
- Generate 6-10 domain-specialized samples per document segment (increased from 3-5)
- Highlight domain-specific knowledge points and core skills
- Include learning materials for different proficiency levels
- Reflect latest trends and cutting-edge developments in the domain
- Create comprehensive domain coverage from all available content`;
            } else if (isJapanese) {
              basePrompt += `\n\n## ドメイン適応データ生成ガイド
### ドメイン特徴表現
- **専門用語**：ドメイン関連の専門用語と概念を正確に使用
- **知識深度**：ドメイン固有の知識深度と幅を反映
- **応用シナリオ**：具体的なドメイン応用シナリオと実践ケースと組み合わせ
- **専門基準**：業界規範と専門基準に適合

### 知識構造化
- **概念関連**：ドメイン概念間の関連関係を確立
- **階層組織**：知識の難易度と重要性レベルによる組織化
- **理論実践統合**：理論知識と実際応用の組み合わせ
- **豊富なケース**：典型的なドメイン応用ケースとベストプラクティスを提供

### 適応戦略 - 最大専門化
- 文書セグメントあたり6-10個のドメイン特化サンプルを生成（3-5個から増加）
- ドメイン固有の知識ポイントとコアスキルをハイライト
- 異なる熟練度レベルの学習材料を含む
- ドメイン発展の最新トレンドと最先端動向を反映
- 利用可能なすべての内容から包括的ドメインカバレッジを作成`;
            } else {
              basePrompt += `\n\n## 领域适配数据生成指南
### 领域特色体现
- **专业术语**：准确使用领域相关的专业术语和概念
- **知识深度**：体现领域特有的知识深度和广度
- **应用场景**：结合具体的领域应用场景和实践案例
- **专业标准**：符合行业规范和专业标准

### 知识结构化
- **概念关联**：建立领域概念之间的关联关系
- **层次组织**：按照知识的难度和重要性分层
- **实践结合**：理论知识与实际应用相结合
- **案例丰富**：提供典型的领域应用案例和最佳实践

### 适配策略 - 最大化专业化
- 每个文档片段生成6-10个领域特化样本（从原来的3-5个提升）
- 突出领域特有的知识点和核心技能
- 包含不同熟练程度的学习材料
- 体现领域发展的最新趋势和前沿动态
- 对所有可用内容进行全面的领域覆盖`;
            }
            break;

          case 'reasoning':
            if (isEnglish) {
              basePrompt += `\n\n## Reasoning Data Generation Guide
### Reasoning Chain Construction
- **Clear Steps**: Each reasoning step should be clear and specific, easy to follow
- **Logical Rigor**: Ensure logical consistency and rigor of the reasoning process
- **Verifiable**: Each step can be independently verified for correctness
- **Completeness**: Complete reasoning chain from premise to conclusion, without skipping steps

### Thinking Process Display
- **Explicit Reasoning**: Clearly display thinking process and decision basis
- **Key Assumptions**: Explain key assumptions and conditions in reasoning
- **Alternative Approaches**: Consider other possible reasoning paths and solutions
- **Uncertainty**: Appropriately express uncertainty and limitations in reasoning

### Reasoning Type Coverage - COMPREHENSIVE ANALYSIS
- **Deductive Reasoning**: Logical derivation from general to specific
- **Inductive Reasoning**: Pattern summarization from specific to general
- **Analogical Reasoning**: Reasoning and analogical analysis based on similarity
- **Causal Reasoning**: Analyze cause-and-effect relationship chains
- **Mathematical Reasoning**: Calculation and proof processes based on mathematical logic
- Generate 5-8 reasoning examples per document segment with detailed step-by-step analysis`;
            } else if (isJapanese) {
              basePrompt += `\n\n## 推論データ生成ガイド
### 推論チェーン構築
- **明確なステップ**：各推論ステップは明確で具体的であり、追跡しやすい
- **論理的厳密性**：推論プロセスの論理一貫性と厳密性を確保
- **検証可能性**：各ステップは独立して正確性を検証可能
- **完全性**：前提から結論への完全な推論チェーン、ステップをスキップしない

### 思考プロセス表示
- **明示的推論**：思考プロセスと決定根拠を明確に表示
- **重要な仮定**：推論における重要な仮定と条件を説明
- **代替アプローチ**：他の可能な推論パスと解決策を考慮
- **不確実性**：推論における不確実性と制限を適切に表現

### 推論タイプカバレッジ - 包括的分析
- **演繹推論**：一般から特定への論理的導出
- **帰納推論**：特定から一般への規則要約
- **類推推論**：類似性に基づく推論と類推分析
- **因果推論**：原因と結果の関係チェーンの分析
- **数学推論**：数学論理に基づく計算と証明プロセス
- 詳細なステップバイステップ分析で、文書セグメントあたり5-8個の推論例を生成`;
            } else {
              basePrompt += `\n\n## 推理数据生成指南
### 推理链构建
- **步骤清晰**：每个推理步骤都要明确和具体，便于跟踪思路
- **逻辑严密**：确保推理过程的逻辑一致性和严谨性
- **可验证性**：每个步骤都可以独立验证其正确性
- **完整性**：从前提到结论的完整推理链，不跳跃步骤

### 思维过程展示
- **显式推理**：明确展示思考过程和决策依据
- **关键假设**：说明推理中的关键假设和条件
- **替代方案**：考虑其他可能的推理路径和解决方案
- **不确定性**：适当表达推理中的不确定性和局限性

### 推理类型覆盖 - 全面分析
- **演绎推理**：从一般到特殊的逻辑推导
- **归纳推理**：从特殊到一般的规律总结
- **类比推理**：基于相似性的推理和类比分析
- **因果推理**：分析原因和结果的关系链条
- **数学推理**：基于数学逻辑的计算和证明过程
- 每个文档片段生成5-8个推理样例，包含详细的步骤分析`;
            }
            break;

          case 'knowledge-distillation':
            if (isEnglish) {
              basePrompt += `\n\n## Knowledge Distillation Data Generation Guide
### Knowledge Extraction Principles
- **Core Concepts**: Extract core knowledge points and key concepts from documents
- **Simplified Expression**: Express complex concepts in simpler ways while maintaining comprehensibility
- **Fidelity**: Ensure simplification does not lose original meaning, maintaining knowledge accuracy
- **Understandability**: Improve knowledge comprehensibility and memorability

### Hierarchical Organization
- **Knowledge Hierarchy**: Organize by importance and complexity levels
- **Dependencies**: Clarify dependency relationships and logical order between knowledge points
- **Learning Path**: Design reasonable learning sequence and progression routes
- **Difficulty Gradient**: Progressive arrangement from simple to complex

### Efficiency Optimization - MAXIMUM KNOWLEDGE EXTRACTION
- **Key Information**: Highlight the most important information and core points
- **Redundancy Elimination**: Remove unnecessary repetitive content and redundant information
- **Structured**: Organize knowledge in structured ways for easy understanding and memory
- **Easy Retrieval**: Convenient for quick search and application, improving usage efficiency
- Generate 6-9 knowledge distillation examples per document segment with comprehensive coverage`;
            } else if (isJapanese) {
              basePrompt += `\n\n## 知識蒸留データ生成ガイド
### 知識抽出原則
- **コア概念**：文書からコア知識ポイントと重要概念を抽出
- **簡略化表現**：理解しやすさを保ちながら、より簡潔な方法で複雑概念を表現
- **忠実度**：簡略化が元の意味を失わず、知識の正確性を維持することを確保
- **理解しやすさ**：知識の理解しやすさと記憶しやすさを改善

### 階層組織
- **知識階層**：重要性と複雑さレベルによる組織化
- **依存関係**：知識ポイント間の依存関係と論理順序を明確化
- **学習パス**：合理的な学習順序と進行ルートを設計
- **難易度グラデーション**：簡単から複雑への段階的配置

### 効率最適化 - 最大知識抽出
- **重要情報**：最も重要な情報とコアポイントをハイライト
- **冗長性除去**：不要な反復内容と冗長情報を除去
- **構造化**：理解と記憶を容易にする構造化方法で知識を組織化
- **検索容易性**：迅速な検索と応用を便利にし、使用効率を向上
- 包括的カバレッジで文書セグメントあたり6-9個の知識蒸留例を生成`;
            } else {
              basePrompt += `\n\n## 知识蒸馏数据生成指南
### 知识提炼原则
- **核心概念**：提取文档中的核心知识点和关键概念
- **简化表达**：用更简洁的方式表达复杂概念，保持易懂性
- **保真度**：确保简化后不失原意，保持知识的准确性
- **可理解性**：提高知识的可理解性和可记忆性

### 层次化组织
- **知识层级**：按重要性和复杂度分层组织
- **依赖关系**：明确知识点之间的依赖关系和逻辑顺序
- **学习路径**：设计合理的学习顺序和进阶路线
- **难度梯度**：从简单到复杂的渐进式安排

### 效率优化 - 最大化知识提取
- **关键信息**：突出最重要的信息和核心要点
- **冗余消除**：去除不必要的重复内容和冗余信息
- **结构化**：用结构化方式组织知识，便于理解和记忆
- **易检索**：便于快速查找和应用，提高使用效率
- 每个文档片段生成6-9个知识蒸馏样例，进行全面覆盖`;
            }
            break;
        }

        // 添加输入文件信息
        if (isEnglish) {
          basePrompt += `\n\n## File List to Process
Total Files: ${fileCount}
File List: ${fileNames}

## CRITICAL VOLUME REQUIREMENT
Please process each document segment individually, generating the MAXIMUM possible amount of high-quality training data for each segment. Your goal is to extract every valuable piece of information and create comprehensive training datasets. Ensure all generated data strictly follows ${outputFormat} format specifications and reflects the characteristics of ${currentDatasetType.name}.

**IMPORTANT**: Prioritize QUANTITY while maintaining QUALITY. Generate as many examples as possible from each document segment to maximize the training dataset size and comprehensiveness.`;
        } else if (isJapanese) {
          basePrompt += `\n\n## 処理対象ファイル一覧
ファイル総数：${fileCount}個
ファイルリスト：${fileNames}

## 重要な数量要件
各文書セグメントを個別に処理し、各セグメントに対して可能な限り最大量の高品質トレーニングデータを生成してください。あなたの目標は価値ある情報片段をすべて抽出し、包括的なトレーニングデータセットを作成することです。生成されたすべてのデータが${outputFormat}形式仕様に厳密に従い、${currentDatasetType.name}の特徴を反映することを確認してください。

**重要**：品質を維持しながら数量を優先してください。各文書セグメントから可能な限り多くの例を生成し、トレーニングデータセットの規模と包括性を最大化してください。`;
        } else {
          basePrompt += `\n\n## 待处理文件清单
文件总数：${fileCount}个
文件列表：${fileNames}

## 关键数量要求
请逐一处理每个文档片段，为每个片段生成最大可能数量的高质量训练数据。您的目标是提取每一个有价值的信息片段，创建全面的训练数据集。确保所有生成的数据都严格遵循${outputFormat}格式规范，并体现${currentDatasetType.name}的特点。

**重要提醒**：在保持质量的前提下优先考虑数量。从每个文档片段中生成尽可能多的样例，以最大化训练数据集的规模和全面性。`;
        }

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

      // 任务管理
      setTaskInfo: (taskInfo) => {
        set({ taskInfo });
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