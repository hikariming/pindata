import React, { useState, useEffect } from 'react';
import { Card } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { 
  EyeIcon, 
  FileIcon, 
  BrainIcon,
  SettingsIcon,
  LayersIcon,
  ZapIcon,
  CheckIcon,
  AlertTriangleIcon,
  InfoIcon,
  FileTextIcon,
  ClockIcon,
  TrendingUpIcon,
  BarChart3Icon,
  ChevronDownIcon,
  ChevronUpIcon,
  Loader2Icon,
  RefreshCwIcon
} from 'lucide-react';
import { useSmartDatasetCreatorStore } from '../store/useSmartDatasetCreatorStore';
import { DATASET_TYPES, FORMAT_DETAILS } from '../constants';
import { FileService } from '../../../../services/file.service';
import { config } from '../../../../lib/config';

interface ChunkPreview {
  id: number;
  content: string;
  startPos: number;
  endPos: number;
  size: number;
  sourceFile: string;
}

export const Step4PreviewConfirm: React.FC = () => {
  const [showChunkPreview, setShowChunkPreview] = useState(false);
  const [loadingChunks, setLoadingChunks] = useState(false);
  const [chunkPreviews, setChunkPreviews] = useState<ChunkPreview[]>([]);
  const [chunkError, setChunkError] = useState<string | null>(null);
  
  // 数据集生成相关状态
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  
  const {
    selectedFiles,
    datasetType,
    outputFormat,
    datasetName,
    datasetDescription,
    processingConfig,
    availableLLMConfigs
  } = useSmartDatasetCreatorStore();

  const currentDatasetType = DATASET_TYPES.find(t => t.id === datasetType);
  const currentFormat = FORMAT_DETAILS[outputFormat as keyof typeof FORMAT_DETAILS];
  const selectedModel = availableLLMConfigs.find(config => config.id === processingConfig.model);

  // 计算总文件大小和预估分片数
  const totalFileSize = selectedFiles.reduce((sum, file) => sum + file.size, 0);
  const estimatedChunks = Math.ceil(selectedFiles.length * 2000 / processingConfig.chunkSize);
  const estimatedProcessingTime = Math.ceil(estimatedChunks / processingConfig.batchSize * 1.5);

  // 检查配置完整性
  const configurationIssues = [];
  if (!datasetName) configurationIssues.push('数据集名称未设置');
  if (!processingConfig.model) configurationIssues.push('未选择AI模型');
  if (!processingConfig.customPrompt) configurationIssues.push('处理提示词为空');
  if (selectedFiles.length === 0) configurationIssues.push('未选择任何文件');

  const isConfigurationComplete = configurationIssues.length === 0;

  // 生成真实文档的分片预览
  const generateRealChunkPreview = async () => {
    if (selectedFiles.length === 0) {
      setChunkError('没有选中的文件');
      return;
    }

    setLoadingChunks(true);
    setChunkError(null);
    
    try {
      const chunks: ChunkPreview[] = [];
      
      // 最多预览前3个文件，每个文件最多2个分片
      const filesToPreview = selectedFiles.slice(0, 3);
      
      for (const file of filesToPreview) {
        try {
          // 获取文件内容
          let content = '';
          console.log(`正在处理文件: ${file.name}`, file);
          
          if (file.originalFile?.converted_object_name) {
            // 优先使用转换后的MD文件
            console.log(`使用转换后的MD文件: ${file.originalFile.converted_object_name}`);
            content = await FileService.getMarkdownContent(file.originalFile.converted_object_name);
          } else if (file.originalFile?.minio_object_name) {
            // 使用原始文件的minio路径
            console.log(`使用原始文件: ${file.originalFile.minio_object_name}`);
            content = await FileService.getFileContent(file.originalFile.minio_object_name);
          } else if (file.path) {
            // 备选方案：使用path
            console.log(`使用文件路径: ${file.path}`);
            content = await FileService.getFileContent(file.path);
          } else {
            console.warn(`文件 ${file.name} 无法获取内容: 缺少路径信息`, file);
            continue;
          }

          if (!content || content.trim().length === 0) {
            console.warn(`文件 ${file.name} 内容为空`);
            continue;
          }

          console.log(`文件 ${file.name} 原始内容长度: ${content.length} 字符`);
          console.log(`文件 ${file.name} 内容前200字符:`, content.substring(0, 200));

          // 应用分片逻辑
          const fileChunks = generateFileChunks(content, file.name);
          console.log(`文件 ${file.name} 生成 ${fileChunks.length} 个分片`, fileChunks.map(c => ({ id: c.id, size: c.size, preview: c.content.substring(0, 50) + '...' })));
          chunks.push(...fileChunks.slice(0, 2)); // 每个文件最多2个分片

          // 限制总分片数
          if (chunks.length >= 6) break;
        } catch (error) {
          console.error(`获取文件 ${file.name} 内容失败:`, error);
        }
      }

      if (chunks.length === 0) {
        setChunkError('无法获取文件内容或所有文件都为空');
      } else {
        console.log('最终生成的分片:', chunks.map(c => ({ id: c.id, sourceFile: c.sourceFile, size: c.size })));
        setChunkPreviews(chunks);
      }
    } catch (error) {
      console.error('生成分片预览失败:', error);
      setChunkError('生成分片预览失败');
    } finally {
      setLoadingChunks(false);
    }
  };

  // 根据配置参数生成文件分片
  const generateFileChunks = (content: string, fileName: string): ChunkPreview[] => {
    const chunks: ChunkPreview[] = [];
    const chunkSize = processingConfig.chunkSize;
    const overlap = processingConfig.chunkOverlap;
    
    console.log(`分片配置 - 文件: ${fileName}, 分片大小: ${chunkSize}, 重叠: ${overlap}`);
    
    // 清理内容，但保留基本结构
    const cleanContent = content.replace(/\r\n/g, '\n').replace(/\n{4,}/g, '\n\n\n').trim();
    console.log(`清理后内容长度: ${cleanContent.length} 字符`);
    
    // 如果内容太短，直接返回整个内容作为一个分片
    if (cleanContent.length <= chunkSize) {
      console.log(`内容长度 ${cleanContent.length} 小于分片大小 ${chunkSize}，作为单个分片`);
      return [{
        id: 1,
        content: cleanContent,
        startPos: 0,
        endPos: cleanContent.length,
        size: cleanContent.length,
        sourceFile: fileName
      }];
    }
    
    // 如果启用按标题分割且包含标题
    if (processingConfig.splitByHeaders && cleanContent.includes('#')) {
      console.log('使用按标题分割');
      // 按标题分割逻辑
      const sections = cleanContent.split(/(?=^#{1,6}\s)/m).filter(s => s.trim().length > 0);
      console.log(`按标题分割得到 ${sections.length} 个段落`);
      
      let currentPos = 0;
      let accumulatedContent = '';
      
      for (let i = 0; i < sections.length && chunks.length < 3; i++) {
        const section = sections[i].trim();
        
        // 累积内容直到接近分片大小
        if (accumulatedContent.length + section.length <= chunkSize) {
          accumulatedContent += (accumulatedContent ? '\n\n' : '') + section;
        } else {
          // 如果有累积的内容，先创建一个分片
          if (accumulatedContent.length > 0) {
            chunks.push({
              id: chunks.length + 1,
              content: accumulatedContent,
              startPos: currentPos,
              endPos: currentPos + accumulatedContent.length,
              size: accumulatedContent.length,
              sourceFile: fileName
            });
            currentPos += accumulatedContent.length;
            accumulatedContent = '';
          }
          
          // 如果当前段落超过分片大小，需要进一步分片
          if (section.length > chunkSize) {
            const subChunks = splitBySize(section, chunkSize, overlap, currentPos, fileName);
            chunks.push(...subChunks.slice(0, 2));
            currentPos += section.length;
          } else {
            accumulatedContent = section;
          }
        }
      }
      
      // 处理最后累积的内容
      if (accumulatedContent.length > 0 && chunks.length < 3) {
        chunks.push({
          id: chunks.length + 1,
          content: accumulatedContent,
          startPos: currentPos,
          endPos: currentPos + accumulatedContent.length,
          size: accumulatedContent.length,
          sourceFile: fileName
        });
      }
    } else {
      console.log('使用固定大小分割');
      // 按固定大小分片
      const regularChunks = splitBySize(cleanContent, chunkSize, overlap, 0, fileName);
      chunks.push(...regularChunks.slice(0, 3));
    }
    
    console.log(`文件 ${fileName} 最终生成 ${chunks.length} 个分片:`, chunks.map(c => ({ size: c.size, startPos: c.startPos, endPos: c.endPos })));
    return chunks;
  };

  // 按固定大小分割文本
  const splitBySize = (text: string, chunkSize: number, overlap: number, startOffset: number, fileName: string): ChunkPreview[] => {
    const chunks: ChunkPreview[] = [];
    console.log(`按固定大小分割 - 文本长度: ${text.length}, 分片大小: ${chunkSize}, 重叠: ${overlap}`);
    
    for (let i = 0; i < text.length && chunks.length < 3; i += chunkSize - overlap) {
      const end = Math.min(i + chunkSize, text.length);
      const chunk = text.substring(i, end);
      
      console.log(`创建分片: 位置 ${i}-${end}, 长度 ${chunk.length}`);
      
      // 只要有内容就创建分片
      if (chunk.length > 0) {
        chunks.push({
          id: chunks.length + 1,
          content: chunk,
          startPos: startOffset + i,
          endPos: startOffset + end,
          size: chunk.length,
          sourceFile: fileName
        });
      }
    }
    
    console.log(`分割完成，生成 ${chunks.length} 个分片`);
    return chunks;
  };

  // 当显示预览时生成分片
  useEffect(() => {
    if (showChunkPreview && chunkPreviews.length === 0 && !loadingChunks) {
      generateRealChunkPreview();
    }
  }, [showChunkPreview]);

  const handleTogglePreview = () => {
    setShowChunkPreview(!showChunkPreview);
    if (!showChunkPreview && chunkPreviews.length === 0) {
      generateRealChunkPreview();
    }
  };

  const handleRefreshPreview = () => {
    setChunkPreviews([]);
    generateRealChunkPreview();
  };

  // 数据集生成相关函数
  const handleGenerateDataset = async () => {
    if (!isConfigurationComplete) return;

    try {
      setIsGenerating(true);
      setGenerationError(null);

      // 首先创建数据集
      const datasetResponse = await fetch(`${config.apiBaseUrl}/datasets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: datasetName,
          description: datasetDescription,
          task_type: datasetType,
          language: 'zh-CN',
          owner: 'user'
        }),
      });

      if (!datasetResponse.ok) {
        throw new Error('创建数据集失败');
      }

      const dataset = await datasetResponse.json();

      // 启动数据集生成任务
      const generateResponse = await fetch(`${config.apiBaseUrl}/datasets/${dataset.id}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          selected_files: selectedFiles,
          dataset_config: {
            type: datasetType,
            format: outputFormat,
            name: datasetName,
            description: datasetDescription
          },
          model_config: {
            id: processingConfig.model,
            name: selectedModel?.name,
            provider: selectedModel?.provider
          },
          processing_config: {
            dataset_type: datasetType,
            chunk_size: processingConfig.chunkSize,
            qa_pairs_per_chunk: 3,
            summary_length: 'medium',
            instructions_per_chunk: 2,
            categories: ['positive', 'negative', 'neutral']
          }
        }),
      });

      if (!generateResponse.ok) {
        throw new Error('启动数据集生成任务失败');
      }

      const generateResult = await generateResponse.json();
      
      // 保存任务信息到store
      useSmartDatasetCreatorStore.getState().setTaskInfo({
        taskId: generateResult.task_id,
        datasetId: dataset.id,
        datasetName: datasetName
      });

      // 直接跳转到Step5
      useSmartDatasetCreatorStore.getState().setCurrentStep(5);

    } catch (error: any) {
      console.error('生成数据集失败:', error);
      setGenerationError(error.message || '生成数据集失败');
      setIsGenerating(false);
    }
  };

  const handleRetryGeneration = () => {
    setGenerationError(null);
    handleGenerateDataset();
  };

  return (
    <div className="space-y-4">
      {/* 配置状态检查 */}
      <Card className={`border-2 ${isConfigurationComplete ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50'}`}>
        <div className="p-3">
          <div className="flex items-center gap-3 mb-2">
            {isConfigurationComplete ? (
              <CheckIcon className="w-5 h-5 text-green-600" />
            ) : (
              <AlertTriangleIcon className="w-5 h-5 text-orange-600" />
            )}
            <h3 className="text-base font-semibold text-[#0c141c]">
              {isConfigurationComplete ? '配置检查完成' : '配置检查'}
            </h3>
          </div>
          
          {isConfigurationComplete ? (
            <p className="text-sm text-green-700">
              ✅ 所有必需配置已完成，可以开始处理数据集
            </p>
          ) : (
            <div>
              <p className="text-sm text-orange-700 mb-1">以下配置项需要完善：</p>
              <ul className="text-sm text-orange-600 space-y-0.5">
                {configurationIssues.map((issue, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <span className="w-1 h-1 bg-orange-400 rounded-full"></span>
                    {issue}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Card>

      {/* 数据源概览 */}
      <Card className="border-[#d1dbe8]">
        <div className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <FileIcon className="w-5 h-5 text-[#1977e5]" />
            <h3 className="text-base font-semibold text-[#0c141c]">数据源概览</h3>
            <span className="px-2 py-1 bg-[#1977e5] text-white text-xs rounded-full">
              {selectedFiles.length} 个文件
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="p-2 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg">
              <div className="text-sm">
                <span className="text-[#4f7096] text-xs">文件总数</span>
                <p className="font-semibold text-[#0c141c]">{selectedFiles.length}</p>
              </div>
            </div>
            <div className="p-2 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg">
              <div className="text-sm">
                <span className="text-[#4f7096] text-xs">总大小</span>
                <p className="font-semibold text-[#0c141c]">
                  {totalFileSize > 1024 * 1024 
                    ? `${(totalFileSize / (1024 * 1024)).toFixed(1)} MB`
                    : `${Math.round(totalFileSize / 1024)} KB`
                  }
                </p>
              </div>
            </div>
            <div className="p-2 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg">
              <div className="text-sm">
                <span className="text-[#4f7096] text-xs">文件类型</span>
                <p className="font-semibold text-[#0c141c] truncate">
                  {[...new Set(selectedFiles.map(f => f.name.split('.').pop()?.toUpperCase()))].join(', ')}
                </p>
              </div>
            </div>
            <div className="p-2 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg">
              <div className="text-sm">
                <span className="text-[#4f7096] text-xs">平均大小</span>
                <p className="font-semibold text-[#0c141c]">
                  {Math.round(totalFileSize / selectedFiles.length / 1024)} KB
                </p>
              </div>
            </div>
          </div>

          {/* 文件列表预览 */}
          <div className="space-y-2">
            <h4 className="font-medium text-[#0c141c] text-sm mb-2">选中的文件 ({selectedFiles.length}个)</h4>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {selectedFiles.map((file) => (
                <div key={file.id} className="flex items-center justify-between p-2 bg-[#f0f4f8] rounded">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <FileTextIcon className="w-4 h-4 text-[#4f7096] flex-shrink-0" />
                    <span className="text-sm text-[#0c141c] truncate">{file.name}</span>
                    {file.libraryName && (
                      <span className="text-xs bg-[#e0f2fe] text-[#0277bd] px-1 rounded">{file.libraryName}</span>
                    )}
                  </div>
                  <span className="text-xs text-[#4f7096] ml-2">
                    {file.size > 1024 ? `${Math.round(file.size / 1024)} KB` : `${file.size} B`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* 数据集配置概览 */}
      <Card className="border-[#d1dbe8]">
        <div className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <BarChart3Icon className="w-5 h-5 text-[#1977e5]" />
            <h3 className="text-base font-semibold text-[#0c141c]">数据集配置</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-[#4f7096]">数据集类型</label>
                <div className="mt-1 p-2 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{currentDatasetType?.icon}</span>
                    <div>
                      <p className="font-medium text-[#0c141c] text-sm">{currentDatasetType?.name}</p>
                      <p className="text-xs text-[#4f7096]">{currentDatasetType?.description}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-[#4f7096]">输出格式</label>
                <div className="mt-1 p-2 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg">
                  <p className="font-medium text-[#0c141c] text-sm">{currentFormat?.name || outputFormat}</p>
                  <p className="text-xs text-[#4f7096] mt-1">{currentFormat?.description}</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-[#4f7096]">数据集名称</label>
                <div className="mt-1 p-2 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg">
                  <p className="font-medium text-[#0c141c] text-sm">{datasetName || '未设置'}</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-[#4f7096]">数据集描述</label>
                <div className="mt-1 p-2 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg min-h-[60px]">
                  <p className="text-sm text-[#0c141c]">{datasetDescription || '暂无描述'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* 模型配置概览 */}
      <Card className="border-[#d1dbe8]">
        <div className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <BrainIcon className="w-5 h-5 text-[#1977e5]" />
            <h3 className="text-base font-semibold text-[#0c141c]">AI模型配置</h3>
          </div>

          {selectedModel ? (
            <div className="space-y-3">
              <div className="p-3 bg-[#f0f4f8] border border-[#d1dbe8] rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="font-semibold text-[#0c141c] text-sm">{selectedModel.name}</h4>
                    <p className="text-xs text-[#4f7096]">{selectedModel.provider.toUpperCase()} • {selectedModel.model_name}</p>
                  </div>
                  <div className="flex gap-1">
                    {selectedModel.is_default && (
                      <span className="px-2 py-1 bg-[#1977e5] text-white text-xs rounded-full">默认</span>
                    )}
                    {selectedModel.supports_vision && (
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">视觉</span>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-xs text-[#6b7280]">
                  <span>使用: {selectedModel.usage_count}次</span>
                  <span>Token: {selectedModel.total_tokens_used.toLocaleString()}</span>
                  <span>状态: {selectedModel.is_active ? '激活' : '禁用'}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-2 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg">
                  <div className="text-sm">
                    <span className="text-[#4f7096] text-xs">温度</span>
                    <p className="font-semibold text-[#0c141c]">{processingConfig.temperature}</p>
                  </div>
                </div>
                <div className="p-2 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg">
                  <div className="text-sm">
                    <span className="text-[#4f7096] text-xs">最大Token</span>
                    <p className="font-semibold text-[#0c141c]">{processingConfig.maxTokens}</p>
                  </div>
                </div>
                <div className="p-2 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg">
                  <div className="text-sm">
                    <span className="text-[#4f7096] text-xs">批处理大小</span>
                    <p className="font-semibold text-[#0c141c]">{processingConfig.batchSize}</p>
                  </div>
                </div>
                <div className="p-2 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg">
                  <div className="text-sm">
                    <span className="text-[#4f7096] text-xs">创造性</span>
                    <p className="font-semibold text-[#0c141c]">
                      {processingConfig.temperature < 0.3 ? '保守' : 
                       processingConfig.temperature < 0.7 ? '平衡' : '创新'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">⚠️ 未选择AI模型，请返回Step3进行配置</p>
            </div>
          )}
        </div>
      </Card>

      {/* 文档分片设置概览 */}
      <Card className="border-[#d1dbe8]">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <LayersIcon className="w-5 h-5 text-[#1977e5]" />
              <h3 className="text-base font-semibold text-[#0c141c]">文档分片设置</h3>
            </div>
            <div className="flex items-center gap-2">
              {showChunkPreview && chunkPreviews.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefreshPreview}
                  disabled={loadingChunks}
                  className="text-xs"
                >
                  <RefreshCwIcon className="w-3 h-3 mr-1" />
                  刷新
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleTogglePreview}
                disabled={selectedFiles.length === 0}
                className="text-xs"
              >
                {showChunkPreview ? (
                  <>
                    <ChevronUpIcon className="w-3 h-3 mr-1" />
                    隐藏预览
                  </>
                ) : (
                  <>
                    <EyeIcon className="w-3 h-3 mr-1" />
                    预览分片
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="p-2 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg">
              <div className="text-sm">
                <span className="text-[#4f7096] text-xs">分片大小</span>
                <p className="font-semibold text-[#0c141c]">{processingConfig.chunkSize} 字符</p>
              </div>
            </div>
            <div className="p-2 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg">
              <div className="text-sm">
                <span className="text-[#4f7096] text-xs">重叠大小</span>
                <p className="font-semibold text-[#0c141c]">{processingConfig.chunkOverlap} 字符</p>
              </div>
            </div>
            <div className="p-2 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg">
              <div className="text-sm">
                <span className="text-[#4f7096] text-xs">预估分片</span>
                <p className="font-semibold text-[#0c141c]">{estimatedChunks} 个</p>
              </div>
            </div>
            <div className="p-2 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg">
              <div className="text-sm">
                <span className="text-[#4f7096] text-xs">分片效率</span>
                <p className="font-semibold text-[#0c141c]">
                  {processingConfig.chunkOverlap / processingConfig.chunkSize < 0.1 ? '高' :
                   processingConfig.chunkOverlap / processingConfig.chunkSize < 0.2 ? '中' : '低'}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <div className="flex items-center justify-between p-2 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg">
              <span className="text-sm font-medium text-[#0c141c]">保持文档结构</span>
              <span className={`px-2 py-1 text-xs rounded ${
                processingConfig.preserveStructure 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-gray-100 text-gray-700'
              }`}>
                {processingConfig.preserveStructure ? '开启' : '关闭'}
              </span>
            </div>
            <div className="flex items-center justify-between p-2 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg">
              <span className="text-sm font-medium text-[#0c141c]">按标题分割</span>
              <span className={`px-2 py-1 text-xs rounded ${
                processingConfig.splitByHeaders 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-gray-100 text-gray-700'
              }`}>
                {processingConfig.splitByHeaders ? '开启' : '关闭'}
              </span>
            </div>
          </div>

          {/* 分片预览 */}
          {showChunkPreview && (
            <div className="p-3 bg-[#f8fbff] border border-[#e3f2fd] rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <LayersIcon className="w-4 h-4 text-[#1977e5]" />
                <span className="text-sm font-medium text-[#0c141c]">真实文档分片预览</span>
                <span className="text-xs text-[#4f7096]">基于选中文件实际内容</span>
              </div>
              
              {loadingChunks ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2Icon className="w-5 h-5 animate-spin mr-2" />
                  <span className="text-sm text-[#4f7096]">正在加载文档内容...</span>
                </div>
              ) : chunkError ? (
                <div className="text-center py-6">
                  <AlertTriangleIcon className="w-8 h-8 mx-auto mb-2 text-orange-500" />
                  <p className="text-sm text-orange-600">{chunkError}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefreshPreview}
                    className="mt-2"
                  >
                    重试
                  </Button>
                </div>
              ) : chunkPreviews.length > 0 ? (
                                  <div className="space-y-3">
                    {chunkPreviews.map((chunk, index) => (
                      <div key={chunk.id} className="border border-[#e2e8f0] rounded-lg p-3 bg-white">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-[#1977e5]">分片 #{chunk.id}</span>
                          <div className="flex gap-3 text-xs text-[#6b7280]">
                            <span>来源: {chunk.sourceFile}</span>
                            <span>位置: {chunk.startPos}-{chunk.endPos}</span>
                            <span>大小: {chunk.size} 字符</span>
                            {index > 0 && chunkPreviews[index-1].sourceFile === chunk.sourceFile && (
                              <span className="text-orange-600">
                                重叠: {processingConfig.chunkOverlap} 字符
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-xs text-[#4f7096] bg-[#fafafa] p-3 rounded border max-h-40 overflow-y-auto whitespace-pre-wrap">
                          {chunk.content}
                        </div>
                        <div className="text-xs text-[#6b7280] mt-2 flex justify-between">
                          <span>预览长度: {Math.min(chunk.content.length, 500)} / {chunk.content.length} 字符</span>
                          {chunk.content.length > 500 && (
                            <span className="text-orange-600">* 内容已截断显示</span>
                          )}
                        </div>
                      </div>
                    ))}
                  
                  <div className="text-center py-2">
                    <span className="text-xs text-[#6b7280]">
                      * 显示前{chunkPreviews.length}个分片，来自选中文件的实际内容
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <FileIcon className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-[#6b7280]">暂无可预览的分片</p>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* 提示词配置概览 */}
      <Card className="border-[#d1dbe8]">
        <div className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <ZapIcon className="w-5 h-5 text-[#1977e5]" />
            <h3 className="text-base font-semibold text-[#0c141c]">提示词配置</h3>
          </div>

          {processingConfig.customPrompt ? (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-2 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg">
                  <div className="text-sm">
                    <span className="text-[#4f7096] text-xs">提示词长度</span>
                    <p className="font-semibold text-[#0c141c]">{processingConfig.customPrompt.length} 字符</p>
                  </div>
                </div>
                <div className="p-2 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg">
                  <div className="text-sm">
                    <span className="text-[#4f7096] text-xs">预估Token</span>
                    <p className="font-semibold text-[#0c141c]">~{Math.ceil(processingConfig.customPrompt.length / 3)}</p>
                  </div>
                </div>
                <div className="p-2 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg">
                  <div className="text-sm">
                    <span className="text-[#4f7096] text-xs">复杂度</span>
                    <p className="font-semibold text-[#0c141c]">
                      {processingConfig.customPrompt.length < 500 ? '简单' :
                       processingConfig.customPrompt.length < 1500 ? '中等' : '复杂'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-[#f8fbff] border border-[#e3f2fd] rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <InfoIcon className="w-4 h-4 text-[#1977e5]" />
                  <span className="text-sm font-medium text-[#0c141c]">提示词预览</span>
                </div>
                <div className="text-xs text-[#4f7096] bg-white p-2 rounded border max-h-24 overflow-y-auto">
                  {processingConfig.customPrompt.length > 200 
                    ? `${processingConfig.customPrompt.substring(0, 200)}...` 
                    : processingConfig.customPrompt
                  }
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <p className="text-orange-600 text-sm">⚠️ 提示词未配置，请返回Step3进行设置</p>
            </div>
          )}
        </div>
      </Card>

      {/* 处理预估信息 */}
      <Card className="border-[#d1dbe8]">
        <div className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUpIcon className="w-5 h-5 text-[#1977e5]" />
            <h3 className="text-base font-semibold text-[#0c141c]">处理预估</h3>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="p-3 bg-[#f0f9ff] border border-[#bae6fd] rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <ClockIcon className="w-3 h-3 text-[#0369a1]" />
                <span className="text-xs font-medium text-[#0369a1]">预估时间</span>
              </div>
              <p className="font-semibold text-[#0c141c]">{estimatedProcessingTime} 分钟</p>
            </div>
            <div className="p-3 bg-[#f0fdf4] border border-[#bbf7d0] rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <BarChart3Icon className="w-3 h-3 text-[#15803d]" />
                <span className="text-xs font-medium text-[#15803d]">预估条目</span>
              </div>
              <p className="font-semibold text-[#0c141c]">{estimatedChunks * 2}-{estimatedChunks * 5}</p>
            </div>
            <div className="p-3 bg-[#fef7ff] border border-[#e9d5ff] rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <ZapIcon className="w-3 h-3 text-[#7c3aed]" />
                <span className="text-xs font-medium text-[#7c3aed]">Token消耗</span>
              </div>
              <p className="font-semibold text-[#0c141c]">
                ~{Math.ceil(estimatedChunks * processingConfig.maxTokens / 1000)}K
              </p>
            </div>
            <div className="p-3 bg-[#fff7ed] border border-[#fed7aa] rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <FileIcon className="w-3 h-3 text-[#ea580c]" />
                <span className="text-xs font-medium text-[#ea580c]">输出大小</span>
              </div>
              <p className="font-semibold text-[#0c141c]">
                ~{Math.round(totalFileSize * 1.5 / 1024)} KB
              </p>
            </div>
          </div>

          <div className="p-3 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg">
            <h4 className="font-medium text-[#0c141c] mb-2 text-sm">处理流程概览</h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-[#1977e5] text-white rounded-full flex items-center justify-center text-xs">1</div>
                <span className="text-xs">文档解析与分片</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-[#1977e5] text-white rounded-full flex items-center justify-center text-xs">2</div>
                <span className="text-xs">AI模型处理</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-[#1977e5] text-white rounded-full flex items-center justify-center text-xs">3</div>
                <span className="text-xs">格式化输出</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-[#1977e5] text-white rounded-full flex items-center justify-center text-xs">4</div>
                <span className="text-xs">数据集生成</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* 生成数据集按钮 */}
      <Card className="border-[#d1dbe8]">
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-[#0c141c] mb-1">开始生成数据集</h3>
              <p className="text-sm text-[#4f7096]">
                确认所有配置无误后，点击开始生成您的智能数据集
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => window.history.back()}
                className="border-[#d1dbe8] text-[#4f7096] hover:bg-[#f8fafc]"
              >
                返回修改
              </Button>
              <Button
                onClick={handleGenerateDataset}
                disabled={!isConfigurationComplete || isGenerating}
                className="bg-[#1977e5] hover:bg-[#1565c0] text-white px-6"
              >
                {isGenerating ? (
                  <>
                    <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />
                    生成中...
                  </>
                ) : (
                  <>
                    <ZapIcon className="w-4 h-4 mr-2" />
                    开始生成数据集
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* 配置问题提示 */}
          {!isConfigurationComplete && (
            <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangleIcon className="w-4 h-4 text-orange-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-orange-800 mb-1">配置不完整</p>
                  <ul className="text-sm text-orange-700 space-y-1">
                    {configurationIssues.map((issue, index) => (
                      <li key={index}>• {issue}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}



          {/* 生成失败 */}
          {generationError && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangleIcon className="w-4 h-4 text-red-600" />
                <span className="text-sm font-medium text-red-800">数据集生成失败</span>
              </div>
              <p className="text-sm text-red-700 mb-3">{generationError}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetryGeneration}
                className="border-red-300 text-red-700 hover:bg-red-100"
              >
                重试生成
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}; 