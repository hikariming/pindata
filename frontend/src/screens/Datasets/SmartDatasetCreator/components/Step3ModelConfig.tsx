import React, { useEffect } from 'react';
import { Card } from '../../../../components/ui/card';
import { Input } from '../../../../components/ui/input';
import { Textarea } from '../../../../components/ui/textarea';
import { Button } from '../../../../components/ui/button';
import { Switch } from '../../../../components/ui/switch';
import { 
  SettingsIcon, 
  BrainIcon, 
  FileTextIcon, 
  RefreshCwIcon,
  Loader2Icon,
  SparklesIcon,
  CpuIcon,
  LayersIcon,
  ZapIcon
} from 'lucide-react';
import { useSmartDatasetCreatorStore } from '../store/useSmartDatasetCreatorStore';
import { DATASET_TYPES, FORMAT_DETAILS } from '../constants';

export const Step3ModelConfig: React.FC = () => {
  const {
    processingConfig,
    availableLLMConfigs,
    loadingLLMConfigs,
    selectedFiles,
    datasetType,
    outputFormat,
    datasetName,
    datasetDescription,
    setProcessingConfig,
    loadLLMConfigs,
    generatePrompt
  } = useSmartDatasetCreatorStore();

  useEffect(() => {
    if (availableLLMConfigs.length === 0) {
      loadLLMConfigs();
    }
  }, [availableLLMConfigs.length, loadLLMConfigs]);

  // 自动生成提示词的逻辑
  useEffect(() => {
    const canGenerate = datasetType && outputFormat && selectedFiles.length > 0;
    
    if (canGenerate) {
      // 如果配置完整且还没有提示词，或者关键配置发生了变化，则自动生成
      const generatedPrompt = generatePrompt();
      
      // 只有在生成的提示词与当前不同时才更新（避免无限循环）
      if (generatedPrompt && generatedPrompt !== processingConfig.customPrompt) {
        setProcessingConfig({ customPrompt: generatedPrompt });
      }
    }
  }, [datasetType, outputFormat, selectedFiles, datasetName, datasetDescription, processingConfig.chunkSize, processingConfig.chunkOverlap, processingConfig.preserveStructure, processingConfig.splitByHeaders, generatePrompt, setProcessingConfig]);

  const handleManualRegenerate = () => {
    const generatedPrompt = generatePrompt();
    setProcessingConfig({ customPrompt: generatedPrompt });
  };

  // 检查是否可以自动生成提示词
  const canGeneratePrompt = datasetType && outputFormat && selectedFiles.length > 0;

  const selectedModel = availableLLMConfigs.find(config => config.id === processingConfig.model);

  return (
    <div className="space-y-6">
      {/* 模型选择 */}
      <Card className="border-[#d1dbe8]">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <BrainIcon className="w-6 h-6 text-[#1977e5]" />
              <h3 className="text-lg font-semibold text-[#0c141c]">选择AI模型</h3>
            </div>
            <Button 
              variant="outline" 
              onClick={loadLLMConfigs} 
              disabled={loadingLLMConfigs}
              className="flex items-center gap-2"
            >
              {loadingLLMConfigs ? (
                <Loader2Icon className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCwIcon className="w-4 h-4" />
              )}
              刷新
            </Button>
          </div>

          {loadingLLMConfigs ? (
            <div className="flex items-center justify-center py-8">
              <Loader2Icon className="w-6 h-6 animate-spin mr-2" />
              <span>加载模型配置...</span>
            </div>
          ) : availableLLMConfigs.length === 0 ? (
            <div className="text-center py-8 text-[#6b7280]">
              <CpuIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>暂无可用的模型配置</p>
              <p className="text-sm mt-1">请先在系统设置中配置LLM模型</p>
            </div>
          ) : (
            <div className="space-y-3">
              {availableLLMConfigs.map((config) => (
                <Card 
                  key={config.id}
                  className={`border cursor-pointer transition-all hover:shadow-md ${
                    processingConfig.model === config.id 
                      ? 'border-[#1977e5] bg-[#f0f4f8] shadow-lg' 
                      : 'border-[#d1dbe8] hover:border-[#1977e5]'
                  }`}
                  onClick={() => setProcessingConfig({ model: config.id })}
                >
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h5 className="font-semibold text-[#0c141c]">{config.name}</h5>
                          {config.is_default && (
                            <span className="px-2 py-1 bg-[#1977e5] text-white text-xs rounded-full">默认</span>
                          )}
                          {config.supports_vision && (
                            <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">视觉</span>
                          )}
                        </div>
                        <p className="text-sm text-[#4f7096] mb-1">
                          {config.provider.toUpperCase()} • {config.model_name}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-[#6b7280]">
                          <span>使用次数: {config.usage_count}</span>
                          <span>Token总数: {config.total_tokens_used.toLocaleString()}</span>
                          {config.last_used_at && (
                            <span>最后使用: {new Date(config.last_used_at).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`px-2 py-1 text-xs rounded ${
                          config.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {config.is_active ? '激活' : '禁用'}
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* 模型参数配置 */}
      <Card className="border-[#d1dbe8]">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <SettingsIcon className="w-6 h-6 text-[#1977e5]" />
            <h3 className="text-lg font-semibold text-[#0c141c]">模型参数</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-[#0c141c] mb-2">
                温度 (Temperature): {processingConfig.temperature}
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={processingConfig.temperature}
                onChange={(e) => setProcessingConfig({ temperature: parseFloat(e.target.value) })}
                className="w-full accent-[#1977e5]"
              />
              <p className="text-xs text-[#4f7096] mt-1">控制生成内容的创造性，值越高越有创意</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#0c141c] mb-2">最大Token数</label>
              <Input
                type="number"
                className="border-[#d1dbe8]"
                value={processingConfig.maxTokens}
                onChange={(e) => setProcessingConfig({ maxTokens: parseInt(e.target.value) || 2000 })}
                min="100"
                max="8000"
              />
              <p className="text-xs text-[#4f7096] mt-1">单次处理的最大token数量</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#0c141c] mb-2">批处理大小</label>
              <Input
                type="number"
                className="border-[#d1dbe8]"
                value={processingConfig.batchSize}
                onChange={(e) => setProcessingConfig({ batchSize: parseInt(e.target.value) || 10 })}
                min="1"
                max="50"
              />
              <p className="text-xs text-[#4f7096] mt-1">同时处理的文档数量，影响处理速度</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#0c141c] mb-2">当前模型</label>
              <div className="p-3 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg">
                {selectedModel ? (
                  <div>
                    <p className="font-medium text-[#0c141c]">{selectedModel.name}</p>
                    <p className="text-sm text-[#4f7096]">{selectedModel.model_name}</p>
                  </div>
                ) : (
                  <p className="text-[#6b7280]">请选择模型</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* 文档分片配置 */}
      <Card className="border-[#d1dbe8]">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <LayersIcon className="w-6 h-6 text-[#1977e5]" />
            <h3 className="text-lg font-semibold text-[#0c141c]">文档分片设置</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-[#0c141c] mb-2">分片大小（字符数）</label>
              <Input
                type="number"
                className="border-[#d1dbe8]"
                value={processingConfig.chunkSize}
                onChange={(e) => setProcessingConfig({ chunkSize: parseInt(e.target.value) || 1000 })}
                min="100"
                max="4000"
              />
              <p className="text-xs text-[#4f7096] mt-1">每个文档分片的字符数量</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#0c141c] mb-2">重叠大小（字符数）</label>
              <Input
                type="number"
                className="border-[#d1dbe8]"
                value={processingConfig.chunkOverlap}
                onChange={(e) => setProcessingConfig({ chunkOverlap: parseInt(e.target.value) || 200 })}
                min="0"
                max="500"
              />
              <p className="text-xs text-[#4f7096] mt-1">相邻分片之间的重叠字符数</p>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-[#0c141c]">保持文档结构</label>
                <p className="text-xs text-[#4f7096] mt-1">尽量保持标题、段落等结构完整</p>
              </div>
              <Switch
                checked={processingConfig.preserveStructure}
                onCheckedChange={(checked) => setProcessingConfig({ preserveStructure: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-[#0c141c]">按标题分割</label>
                <p className="text-xs text-[#4f7096] mt-1">优先在markdown标题处分割文档</p>
              </div>
              <Switch
                checked={processingConfig.splitByHeaders}
                onCheckedChange={(checked) => setProcessingConfig({ splitByHeaders: checked })}
              />
            </div>
          </div>

          {/* 分片预览 */}
          {selectedFiles.length > 0 && (
            <div className="mt-6 p-4 bg-[#f8fbff] border border-[#e3f2fd] rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <FileTextIcon className="w-4 h-4 text-[#1977e5]" />
                <span className="text-sm font-medium text-[#0c141c]">分片预估</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-[#4f7096]">文件数量: </span>
                  <span className="font-medium">{selectedFiles.length}</span>
                </div>
                <div>
                  <span className="text-[#4f7096]">分片大小: </span>
                  <span className="font-medium">{processingConfig.chunkSize}</span>
                </div>
                <div>
                  <span className="text-[#4f7096]">重叠大小: </span>
                  <span className="font-medium">{processingConfig.chunkOverlap}</span>
                </div>
                <div>
                  <span className="text-[#4f7096]">预估分片: </span>
                  <span className="font-medium">~{Math.ceil(selectedFiles.length * 2000 / processingConfig.chunkSize)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* 提示词配置 */}
      <Card className="border-[#d1dbe8]">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <ZapIcon className="w-6 h-6 text-[#1977e5]" />
              <h3 className="text-lg font-semibold text-[#0c141c]">处理提示词配置</h3>
              {processingConfig.customPrompt && canGeneratePrompt && (
                <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                  已自动生成
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {!canGeneratePrompt && (
                <span className="text-xs text-[#f97316] bg-orange-50 px-2 py-1 rounded">
                  需要先完成Step2配置
                </span>
              )}
              {canGeneratePrompt && (
                <Button 
                  variant="outline" 
                  onClick={handleManualRegenerate}
                  className="flex items-center gap-2"
                  size="sm"
                >
                  <SparklesIcon className="w-4 h-4" />
                  重新生成
                </Button>
              )}
            </div>
          </div>

          {/* 配置状态提示 */}
          {canGeneratePrompt && (
            <div className="mb-4 p-3 bg-[#f0f9ff] border border-[#bae6fd] rounded-lg">
              <div className="text-sm text-[#0369a1]">
                <p className="font-medium mb-1">当前配置概览 (提示词会根据以下配置自动更新):</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  <span>数据集: {DATASET_TYPES.find(t => t.id === datasetType)?.name}</span>
                  <span>格式: {FORMAT_DETAILS[outputFormat as keyof typeof FORMAT_DETAILS]?.name || outputFormat}</span>
                  <span>文件: {selectedFiles.length}个</span>
                  <span>分片: ~{Math.ceil(selectedFiles.length * 2000 / processingConfig.chunkSize)}个</span>
                </div>
              </div>
            </div>
          )}

          <Textarea
            className="border-[#d1dbe8] min-h-[250px] font-mono text-sm"
            placeholder={canGeneratePrompt ? 
              "提示词将基于您的配置自动生成。您可以在此基础上进行个性化修改..." :
              "请先在Step2中完成数据集类型、输出格式和文件选择的配置，系统将自动生成专业提示词..."
            }
            value={processingConfig.customPrompt}
            onChange={(e) => setProcessingConfig({ customPrompt: e.target.value })}
            rows={10}
          />
          
          <div className="mt-3 flex items-start justify-between">
            <div className="text-xs text-[#4f7096] max-w-3xl">
              💡 <strong>智能提示词生成:</strong> 
              系统已根据您在Step2中的配置（数据集类型、输出格式、文件选择）以及当前的模型参数和分片设置自动生成了专业的提示词。当您修改相关配置时，提示词会自动更新。您可以在生成的基础上进行个性化调整。
            </div>
          </div>

          {/* 提示词统计和预览信息 */}
          {processingConfig.customPrompt && (
            <div className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-3 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg">
                  <div className="text-sm">
                    <span className="text-[#4f7096]">提示词长度</span>
                    <p className="font-semibold text-[#0c141c]">{processingConfig.customPrompt.length} 字符</p>
                  </div>
                </div>
                <div className="p-3 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg">
                  <div className="text-sm">
                    <span className="text-[#4f7096]">预估Token</span>
                    <p className="font-semibold text-[#0c141c]">~{Math.ceil(processingConfig.customPrompt.length / 3)}</p>
                  </div>
                </div>
                <div className="p-3 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg">
                  <div className="text-sm">
                    <span className="text-[#4f7096]">复杂度评估</span>
                    <p className="font-semibold text-[#0c141c]">
                      {processingConfig.customPrompt.length < 500 ? '简单' :
                       processingConfig.customPrompt.length < 1500 ? '中等' : '复杂'}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* 提示词内容预览 */}
              <div className="mt-4 p-3 bg-[#fafafa] border border-[#e5e7eb] rounded-lg">
                <details className="group">
                  <summary className="text-sm font-medium text-[#4f7096] cursor-pointer hover:text-[#1977e5] flex items-center gap-2">
                    <span>提示词结构预览</span>
                    <span className="transform group-open:rotate-180 transition-transform">▼</span>
                  </summary>
                  <div className="mt-3 text-xs text-[#6b7280] space-y-2">
                    {processingConfig.customPrompt.split('\n## ').map((section, index) => {
                      const title = section.split('\n')[0];
                      const lineCount = section.split('\n').length;
                      return (
                        <div key={index} className="flex justify-between items-center py-1 border-b border-[#f3f4f6] last:border-b-0">
                          <span className="font-medium">{index === 0 ? title : `## ${title}`}</span>
                          <span className="text-[#9ca3af]">{lineCount} 行</span>
                        </div>
                      );
                    })}
                  </div>
                </details>
              </div>
            </div>
          )}

          {/* 提示词功能说明 */}
          {processingConfig.customPrompt && (
            <div className="mt-4 p-4 bg-[#f8fbff] border border-[#e3f2fd] rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <SparklesIcon className="w-4 h-4 text-[#1977e5]" />
                <span className="text-sm font-medium text-[#0c141c]">自动生成的提示词包含</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-[#1977e5] rounded-full"></span>
                  <span>项目背景与目标</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-[#1977e5] rounded-full"></span>
                  <span>技术规格要求</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-[#1977e5] rounded-full"></span>
                  <span>格式规范说明</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-[#1977e5] rounded-full"></span>
                  <span>质量标准定义</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-[#1977e5] rounded-full"></span>
                  <span>处理策略指导</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-[#1977e5] rounded-full"></span>
                  <span>类型特定指令</span>
                </div>
              </div>
            </div>
          )}
          
          {/* 配置等待提示 */}
          {!canGeneratePrompt && (
            <div className="mt-4 p-4 bg-[#fef3cd] border border-[#f6e05e] rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[#d97706]">⚠️</span>
                <span className="text-sm font-medium text-[#92400e]">等待配置完成</span>
              </div>
              <p className="text-xs text-[#92400e]">
                请先在Step2中完成以下配置，系统将自动生成专业的处理提示词：
              </p>
              <ul className="mt-2 text-xs text-[#92400e] space-y-1 ml-4">
                <li>• 选择数据集类型</li>
                <li>• 设置输出格式</li>
                <li>• 选择要处理的文件</li>
              </ul>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}; 