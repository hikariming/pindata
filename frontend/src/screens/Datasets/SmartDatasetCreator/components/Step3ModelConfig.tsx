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
import { useTranslation } from 'react-i18next';
import { useSmartDatasetCreatorStore } from '../store/useSmartDatasetCreatorStore';
import { DATASET_TYPES, FORMAT_DETAILS } from '../constants';

export const Step3ModelConfig: React.FC = () => {
  const { t } = useTranslation();
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
              <h3 className="text-lg font-semibold text-[#0c141c]">{t('smartDatasetCreator.step3.modelSelection.title')}</h3>
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
              {t('smartDatasetCreator.step3.modelSelection.refresh')}
            </Button>
          </div>

          {loadingLLMConfigs ? (
            <div className="flex items-center justify-center py-8">
              <Loader2Icon className="w-6 h-6 animate-spin mr-2" />
              <span>{t('smartDatasetCreator.step3.modelSelection.loading')}</span>
            </div>
          ) : availableLLMConfigs.length === 0 ? (
            <div className="text-center py-8 text-[#6b7280]">
              <CpuIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>{t('smartDatasetCreator.step3.modelSelection.noModels')}</p>
              <p className="text-sm mt-1">{t('smartDatasetCreator.step3.modelSelection.noModelsHint')}</p>
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
                            <span className="px-2 py-1 bg-[#1977e5] text-white text-xs rounded-full">{t('smartDatasetCreator.step3.modelSelection.default')}</span>
                          )}
                          {config.supports_vision && (
                            <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">{t('smartDatasetCreator.step3.modelSelection.vision')}</span>
                          )}
                        </div>
                        <p className="text-sm text-[#4f7096] mb-1">
                          {config.provider.toUpperCase()} • {config.model_name}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-[#6b7280]">
                          <span>{t('smartDatasetCreator.step3.modelSelection.usage')}: {config.usage_count}</span>
                          <span>{t('smartDatasetCreator.step3.modelSelection.tokens')}: {config.total_tokens_used.toLocaleString()}</span>
                          {config.last_used_at && (
                            <span>{t('smartDatasetCreator.step3.modelSelection.lastUsed')}: {new Date(config.last_used_at).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`px-2 py-1 text-xs rounded ${
                          config.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {config.is_active ? t('smartDatasetCreator.step3.modelSelection.active') : t('smartDatasetCreator.step3.modelSelection.disabled')}
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
            <h3 className="text-lg font-semibold text-[#0c141c]">{t('smartDatasetCreator.step3.modelParams.title')}</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-[#0c141c] mb-2">
                {t('smartDatasetCreator.step3.modelParams.temperature')}: {processingConfig.temperature}
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
              <p className="text-xs text-[#4f7096] mt-1">{t('smartDatasetCreator.step3.modelParams.temperatureDesc')}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#0c141c] mb-2">{t('smartDatasetCreator.step3.modelParams.maxTokens')}</label>
              <Input
                type="number"
                className="border-[#d1dbe8]"
                value={processingConfig.maxTokens}
                onChange={(e) => setProcessingConfig({ maxTokens: parseInt(e.target.value) || 2000 })}
                min="100"
                max="8000"
              />
              <p className="text-xs text-[#4f7096] mt-1">{t('smartDatasetCreator.step3.modelParams.maxTokensDesc')}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#0c141c] mb-2">{t('smartDatasetCreator.step3.modelParams.batchSize')}</label>
              <Input
                type="number"
                className="border-[#d1dbe8]"
                value={processingConfig.batchSize}
                onChange={(e) => setProcessingConfig({ batchSize: parseInt(e.target.value) || 10 })}
                min="1"
                max="50"
              />
              <p className="text-xs text-[#4f7096] mt-1">{t('smartDatasetCreator.step3.modelParams.batchSizeDesc')}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#0c141c] mb-2">{t('smartDatasetCreator.step3.modelParams.currentModel')}</label>
              <div className="p-3 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg">
                {selectedModel ? (
                  <div>
                    <p className="font-medium text-[#0c141c]">{selectedModel.name}</p>
                    <p className="text-sm text-[#4f7096]">{selectedModel.model_name}</p>
                  </div>
                ) : (
                  <p className="text-[#6b7280]">{t('smartDatasetCreator.step3.modelParams.selectModel')}</p>
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
            <h3 className="text-lg font-semibold text-[#0c141c]">{t('smartDatasetCreator.step3.chunkSettings.title')}</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-[#0c141c] mb-2">{t('smartDatasetCreator.step3.chunkSettings.chunkSize')}</label>
              <Input
                type="number"
                className="border-[#d1dbe8]"
                value={processingConfig.chunkSize}
                onChange={(e) => setProcessingConfig({ chunkSize: parseInt(e.target.value) || 1000 })}
                min="100"
                max="4000"
              />
              <p className="text-xs text-[#4f7096] mt-1">{t('smartDatasetCreator.step3.chunkSettings.chunkSizeDesc')}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#0c141c] mb-2">{t('smartDatasetCreator.step3.chunkSettings.chunkOverlap')}</label>
              <Input
                type="number"
                className="border-[#d1dbe8]"
                value={processingConfig.chunkOverlap}
                onChange={(e) => setProcessingConfig({ chunkOverlap: parseInt(e.target.value) || 200 })}
                min="0"
                max="500"
              />
              <p className="text-xs text-[#4f7096] mt-1">{t('smartDatasetCreator.step3.chunkSettings.chunkOverlapDesc')}</p>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-[#0c141c]">{t('smartDatasetCreator.step3.chunkSettings.preserveStructure')}</label>
                <p className="text-xs text-[#4f7096] mt-1">{t('smartDatasetCreator.step3.chunkSettings.preserveStructureDesc')}</p>
              </div>
              <Switch
                checked={processingConfig.preserveStructure}
                onCheckedChange={(checked) => setProcessingConfig({ preserveStructure: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-[#0c141c]">{t('smartDatasetCreator.step3.chunkSettings.splitByHeaders')}</label>
                <p className="text-xs text-[#4f7096] mt-1">{t('smartDatasetCreator.step3.chunkSettings.splitByHeadersDesc')}</p>
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
                <span className="text-sm font-medium text-[#0c141c]">{t('smartDatasetCreator.step3.chunkSettings.chunkPreview')}</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-[#4f7096]">{t('smartDatasetCreator.step3.chunkSettings.fileCount')}: </span>
                  <span className="font-medium">{selectedFiles.length}</span>
                </div>
                <div>
                  <span className="text-[#4f7096]">{t('smartDatasetCreator.step3.chunkSettings.chunkSizeLabel')}: </span>
                  <span className="font-medium">{processingConfig.chunkSize}</span>
                </div>
                <div>
                  <span className="text-[#4f7096]">{t('smartDatasetCreator.step3.chunkSettings.overlapSize')}: </span>
                  <span className="font-medium">{processingConfig.chunkOverlap}</span>
                </div>
                <div>
                  <span className="text-[#4f7096]">{t('smartDatasetCreator.step3.chunkSettings.estimatedChunks')}: </span>
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
              <h3 className="text-lg font-semibold text-[#0c141c]">{t('smartDatasetCreator.step3.promptConfig.title')}</h3>
              {processingConfig.customPrompt && canGeneratePrompt && (
                <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                  {t('smartDatasetCreator.step3.promptConfig.autoGenerated')}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {!canGeneratePrompt && (
                <span className="text-xs text-[#f97316] bg-orange-50 px-2 py-1 rounded">
                  {t('smartDatasetCreator.step3.promptConfig.needStep2Config')}
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
                  {t('smartDatasetCreator.step3.promptConfig.regenerate')}
                </Button>
              )}
            </div>
          </div>

          {/* 配置状态提示 */}
          {canGeneratePrompt && (
            <div className="mb-4 p-3 bg-[#f0f9ff] border border-[#bae6fd] rounded-lg">
              <div className="text-sm text-[#0369a1]">
                <p className="font-medium mb-1">{t('smartDatasetCreator.step3.promptConfig.configOverview')}</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  <span>{t('smartDatasetCreator.step3.promptConfig.dataset')}: {DATASET_TYPES.find(t => t.id === datasetType)?.name}</span>
                  <span>{t('smartDatasetCreator.step3.promptConfig.format')}: {FORMAT_DETAILS[outputFormat as keyof typeof FORMAT_DETAILS]?.name || outputFormat}</span>
                  <span>{t('smartDatasetCreator.step3.promptConfig.files')}: {selectedFiles.length}个</span>
                  <span>{t('smartDatasetCreator.step3.promptConfig.chunks')}: ~{Math.ceil(selectedFiles.length * 2000 / processingConfig.chunkSize)}个</span>
                </div>
              </div>
            </div>
          )}

          <Textarea
            className="border-[#d1dbe8] min-h-[250px] font-mono text-sm"
            placeholder={canGeneratePrompt ? 
              t('smartDatasetCreator.step3.promptConfig.placeholder') :
              t('smartDatasetCreator.step3.promptConfig.placeholderWaiting')
            }
            value={processingConfig.customPrompt}
            onChange={(e) => setProcessingConfig({ customPrompt: e.target.value })}
            rows={10}
          />
          
          <div className="mt-3 flex items-start justify-between">
            <div className="text-xs text-[#4f7096] max-w-3xl">
              💡 <strong>{t('smartDatasetCreator.step3.promptConfig.smartGenHint')}</strong>
            </div>
          </div>

          {/* 提示词统计和预览信息 */}
          {processingConfig.customPrompt && (
            <div className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-3 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg">
                  <div className="text-sm">
                    <span className="text-[#4f7096]">{t('smartDatasetCreator.step3.promptConfig.promptLength')}</span>
                    <p className="font-semibold text-[#0c141c]">{processingConfig.customPrompt.length} {t('smartDatasetCreator.step3.chunkSettings.characters')}</p>
                  </div>
                </div>
                <div className="p-3 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg">
                  <div className="text-sm">
                    <span className="text-[#4f7096]">{t('smartDatasetCreator.step3.promptConfig.estimatedTokens')}</span>
                    <p className="font-semibold text-[#0c141c]">~{Math.ceil(processingConfig.customPrompt.length / 3)}</p>
                  </div>
                </div>
                <div className="p-3 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg">
                  <div className="text-sm">
                    <span className="text-[#4f7096]">{t('smartDatasetCreator.step3.promptConfig.complexity')}</span>
                    <p className="font-semibold text-[#0c141c]">
                      {processingConfig.customPrompt.length < 500 ? t('smartDatasetCreator.step3.promptConfig.simple') :
                       processingConfig.customPrompt.length < 1500 ? t('smartDatasetCreator.step3.promptConfig.medium') : t('smartDatasetCreator.step3.promptConfig.complex')}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* 提示词内容预览 */}
              <div className="mt-4 p-3 bg-[#fafafa] border border-[#e5e7eb] rounded-lg">
                <details className="group">
                  <summary className="text-sm font-medium text-[#4f7096] cursor-pointer hover:text-[#1977e5] flex items-center gap-2">
                    <span>{t('smartDatasetCreator.step3.promptConfig.structurePreview')}</span>
                    <span className="transform group-open:rotate-180 transition-transform">▼</span>
                  </summary>
                  <div className="mt-3 text-xs text-[#6b7280] space-y-2">
                    {processingConfig.customPrompt.split('\n## ').map((section, index) => {
                      const title = section.split('\n')[0];
                      const lineCount = section.split('\n').length;
                      return (
                        <div key={index} className="flex justify-between items-center py-1 border-b border-[#f3f4f6] last:border-b-0">
                          <span className="font-medium">{index === 0 ? title : `## ${title}`}</span>
                          <span className="text-[#9ca3af]">{lineCount} {t('smartDatasetCreator.step3.promptConfig.lines')}</span>
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
                <span className="text-sm font-medium text-[#0c141c]">{t('smartDatasetCreator.step3.promptConfig.autoInclude')}</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-[#1977e5] rounded-full"></span>
                  <span>{t('smartDatasetCreator.step3.promptConfig.projectBackground')}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-[#1977e5] rounded-full"></span>
                  <span>{t('smartDatasetCreator.step3.promptConfig.techSpecs')}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-[#1977e5] rounded-full"></span>
                  <span>{t('smartDatasetCreator.step3.promptConfig.formatSpecs')}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-[#1977e5] rounded-full"></span>
                  <span>{t('smartDatasetCreator.step3.promptConfig.qualityStandards')}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-[#1977e5] rounded-full"></span>
                  <span>{t('smartDatasetCreator.step3.promptConfig.processingStrategy')}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-[#1977e5] rounded-full"></span>
                  <span>{t('smartDatasetCreator.step3.promptConfig.typeSpecific')}</span>
                </div>
              </div>
            </div>
          )}
          
          {/* 配置等待提示 */}
          {!canGeneratePrompt && (
            <div className="mt-4 p-4 bg-[#fef3cd] border border-[#f6e05e] rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[#d97706]">⚠️</span>
                <span className="text-sm font-medium text-[#92400e]">{t('smartDatasetCreator.step3.promptConfig.waitingConfig')}</span>
              </div>
              <p className="text-xs text-[#92400e]">
                {t('smartDatasetCreator.step3.promptConfig.configIncomplete')}
              </p>
              <ul className="mt-2 text-xs text-[#92400e] space-y-1 ml-4">
                <li>• {t('smartDatasetCreator.step3.promptConfig.selectDatasetType')}</li>
                <li>• {t('smartDatasetCreator.step3.promptConfig.setOutputFormat')}</li>
                <li>• {t('smartDatasetCreator.step3.promptConfig.selectFiles')}</li>
              </ul>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}; 