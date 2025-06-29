import React from 'react';
import { Card } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Textarea } from '../../../../components/ui/textarea';
import { Switch } from '../../../../components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../../../components/ui/dropdown-menu";
import { 
  BrainIcon,
  ChevronDownIcon,
  HelpCircleIcon,
  InfoIcon,
  BookOpenIcon,
  GraduationCapIcon,
  MessageSquareIcon,
  ZapIcon,
  BarChart3Icon,
  LightbulbIcon,
  SettingsIcon
} from 'lucide-react';
import { useSmartDatasetCreatorStore } from '../store/useSmartDatasetCreatorStore';
import { DATASET_TYPES, FORMAT_DETAILS } from '../constants';
import { FormatDetailsModal } from './FormatDetailsModal';

export const Step2DatasetConfig: React.FC = () => {
  const {
    datasetType,
    outputFormat,
    datasetName,
    datasetDescription,
    processingConfig,
    availableLLMConfigs,
    showFormatDetails,
    selectedFormat,
    setDatasetType,
    setOutputFormat,
    setDatasetName,
    setDatasetDescription,
    setProcessingConfig,
    setShowFormatDetails,
    setSelectedFormat
  } = useSmartDatasetCreatorStore();

  const handleFormatHelp = (formatName: string) => {
    setSelectedFormat(formatName);
    setShowFormatDetails(true);
  };

  const currentDatasetType = DATASET_TYPES.find(t => t.id === datasetType);
  
  // 获取当前选择的LLM配置
  const currentLLMConfig = availableLLMConfigs.find(config => config.id === processingConfig.model);
  
  // 判断是否为支持推理的模型
  const isReasoningModel = currentLLMConfig?.supports_reasoning || false;

  // 获取当前格式对应的示例数据
  const getCurrentExample = () => {
    if (outputFormat && FORMAT_DETAILS[outputFormat as keyof typeof FORMAT_DETAILS]) {
      const formatDetail = FORMAT_DETAILS[outputFormat as keyof typeof FORMAT_DETAILS];
      
      // 如果启用了思考过程且包含在输出中，返回带思考过程的示例
      if (processingConfig.enableThinkingProcess && processingConfig.includeThinkingInOutput) {
        if (outputFormat === 'Alpaca') {
          return `{
  "instruction": "解释什么是机器学习？",
  "input": "",
  "thinking": "用户询问机器学习的概念，我需要提供一个清晰、全面的解释。我应该从定义开始，然后解释其工作原理，最后提及一些应用场景。这样可以帮助用户建立对机器学习的基本理解。",
  "output": "机器学习是人工智能的一个分支，它使计算机系统能够通过数据自动学习和改进，而无需明确编程。其核心思想是让算法从大量数据中识别模式，并利用这些模式对新数据进行预测或决策。常见应用包括图像识别、自然语言处理、推荐系统等。"
}`;
        } else if (outputFormat === 'ShareGPT') {
          return `{
  "conversations": [
    {
      "role": "human",
      "content": "解释什么是机器学习？"
    },
    {
      "role": "thinking",
      "content": "用户询问机器学习的概念，我需要提供一个清晰、全面的解释。我应该从定义开始，然后解释其工作原理，最后提及一些应用场景。这样可以帮助用户建立对机器学习的基本理解。"
    },
    {
      "role": "assistant",
      "content": "机器学习是人工智能的一个分支，它使计算机系统能够通过数据自动学习和改进，而无需明确编程。其核心思想是让算法从大量数据中识别模式，并利用这些模式对新数据进行预测或决策。常见应用包括图像识别、自然语言处理、推荐系统等。"
    }
  ]
}`;
        }
      }
      
      return formatDetail.example;
    }
    
    // 如果没有格式特定示例，返回数据集类型的默认示例
    return currentDatasetType?.example || '暂无示例数据';
  };

  return (
    <div className="space-y-6">
      {/* 教学指南 */}
      <Card className="border-[#e3f2fd] bg-[#f8fbff]">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <GraduationCapIcon className="w-6 h-6 text-[#1977e5]" />
            <h3 className="text-lg font-semibold text-[#0c141c]">微调数据集类型指南</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-start gap-2">
              <MessageSquareIcon className="w-4 h-4 text-[#1977e5] mt-0.5" />
              <div>
                <h4 className="font-medium text-[#0c141c] mb-1">监督微调</h4>
                <p className="text-[#4f7096]">通过标注数据直接教模型做事，适合有明确目标的任务</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <ZapIcon className="w-4 h-4 text-[#1977e5] mt-0.5" />
              <div>
                <h4 className="font-medium text-[#0c141c] mb-1">推理微调</h4>
                <p className="text-[#4f7096]">训练模型分步思考，适用于需要逻辑推理的复杂场景</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <BarChart3Icon className="w-4 h-4 text-[#1977e5] mt-0.5" />
              <div>
                <h4 className="font-medium text-[#0c141c] mb-1">知识蒸馏</h4>
                <p className="text-[#4f7096]">从大模型提取知识训练小模型，平衡性能与成本</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* 数据集类型选择 */}
      <Card className="border-[#d1dbe8]">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <BrainIcon className="w-6 h-6 text-[#1977e5]" />
            <h3 className="text-lg font-semibold text-[#0c141c]">选择数据集类型</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {DATASET_TYPES.map((type) => (
              <Card 
                key={type.id}
                className={`border-2 cursor-pointer transition-all hover:shadow-md ${
                  datasetType === type.id 
                    ? 'border-[#1977e5] bg-[#f0f4f8] shadow-lg' 
                    : 'border-[#d1dbe8] hover:border-[#1977e5]'
                }`}
                onClick={() => setDatasetType(type.id)}
              >
                <div className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{type.icon}</span>
                    <h4 className="font-semibold text-[#0c141c]">{type.name}</h4>
                    <div className="flex gap-1">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        type.category === 'supervised' ? 'bg-green-100 text-green-700' :
                        type.category === 'reasoning' ? 'bg-purple-100 text-purple-700' :
                        'bg-orange-100 text-orange-700'
                      }`}>
                        {type.category === 'supervised' ? '监督' : 
                         type.category === 'reasoning' ? '推理' : '蒸馏'}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-[#4f7096] mb-3">{type.description}</p>
                  <div className="space-y-2">
                    <div>
                      <span className="text-xs font-medium text-[#4f7096]">应用场景：</span>
                      <p className="text-xs text-[#666] mt-1">{type.useCase}</p>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {type.formats.map((format) => (
                        <span key={format} className="px-2 py-1 bg-[#e8edf2] text-[#4f7096] text-xs rounded">
                          {format}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* 配置选项 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <label className="text-sm font-medium text-[#0c141c]">输出格式</label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-0 h-auto"
                  onClick={() => handleFormatHelp(outputFormat)}
                >
                  <HelpCircleIcon className="w-4 h-4 text-[#4f7096]" />
                </Button>
              </div>
              <div className="flex gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="flex-1 border-[#d1dbe8] justify-between">
                      {FORMAT_DETAILS[outputFormat as keyof typeof FORMAT_DETAILS]?.name || outputFormat}
                      <ChevronDownIcon className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-full">
                    {currentDatasetType?.formats.map((format) => (
                      <DropdownMenuItem key={format} onClick={() => setOutputFormat(format)}>
                        <div className="flex items-center justify-between w-full">
                          <span>{FORMAT_DETAILS[format as keyof typeof FORMAT_DETAILS]?.name || format}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-0 h-auto ml-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleFormatHelp(format);
                            }}
                          >
                            <InfoIcon className="w-3 h-3" />
                          </Button>
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {outputFormat && FORMAT_DETAILS[outputFormat as keyof typeof FORMAT_DETAILS] && (
                <p className="text-xs text-[#4f7096] mt-1">
                  {FORMAT_DETAILS[outputFormat as keyof typeof FORMAT_DETAILS].description}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-[#0c141c] mb-2">数据集名称</label>
              <Input
                className="border-[#d1dbe8]"
                placeholder="输入数据集名称..."
                value={datasetName}
                onChange={(e) => setDatasetName(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-[#0c141c] mb-2">数据集描述</label>
            <Textarea
              className="border-[#d1dbe8]"
              placeholder="描述数据集的内容和用途..."
              value={datasetDescription}
              onChange={(e) => setDatasetDescription(e.target.value)}
              rows={3}
            />
          </div>

          {/* 思考过程配置 - 根据模型能力动态调整 */}
          <Card className="mt-6 border-[#d1dbe8]">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <LightbulbIcon className="w-6 h-6 text-[#1977e5]" />
                <h3 className="text-lg font-semibold text-[#0c141c]">
                  {currentLLMConfig ? 
                    (isReasoningModel ? '思考过程提取' : '蒸馏思考配置') : 
                    '思考过程配置'
                  }
                </h3>
                <div className="ml-auto">
                  <Switch
                    checked={processingConfig.enableThinkingProcess}
                    onCheckedChange={(checked) => 
                      setProcessingConfig({ enableThinkingProcess: checked })
                    }
                  />
                </div>
              </div>

              {!processingConfig.model && (
                <div className="mb-4 p-3 bg-[#fef3cd] border border-[#fbbf24] rounded-lg">
                  <div className="flex items-center gap-2">
                    <InfoIcon className="w-4 h-4 text-[#f59e0b]" />
                    <span className="text-sm text-[#92400e]">
                      请先在Step3中选择AI模型，系统将根据模型能力自动调整配置选项
                    </span>
                  </div>
                </div>
              )}

              {processingConfig.enableThinkingProcess && (
                <div className="space-y-4">
                  <div className="p-4 bg-[#f0f4f8] border border-[#e3f2fd] rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <SettingsIcon className="w-4 h-4 text-[#1977e5]" />
                      <span className="text-sm font-medium text-[#0c141c]">
                        {currentLLMConfig ? 
                          (isReasoningModel ? '思考过程提取配置' : '蒸馏思考配置') :
                          '思考过程配置'
                        }
                      </span>
                    </div>
                    <p className="text-xs text-[#4f7096] mb-3">
                      {currentLLMConfig ? (
                        isReasoningModel 
                          ? `当前模型（${currentLLMConfig?.name}）原生支持思考过程，系统将从模型输出中提取推理内容。` 
                          : `当前模型（${currentLLMConfig?.name}）不支持原生思考过程，将通过蒸馏方式引导模型生成推理步骤。`
                      ) : (
                        '思考过程功能可以帮助生成包含推理步骤的高质量训练数据。选择模型后将显示相应的配置选项。'
                      )}
                    </p>
                      
                    {currentLLMConfig && isReasoningModel && (
                      // 支持推理的模型：显示提取配置
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-[#0c141c] mb-2">提取方法</label>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" className="w-full border-[#d1dbe8] justify-between">
                                {processingConfig.reasoningExtractionMethod === 'tag_based' ? '标签模式' :
                                 processingConfig.reasoningExtractionMethod === 'json_field' ? 'JSON字段模式' :
                                 '请选择提取方法'}
                                <ChevronDownIcon className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-full">
                              <DropdownMenuItem 
                                onClick={() => setProcessingConfig({ 
                                  reasoningExtractionMethod: 'tag_based',
                                  reasoningExtractionConfig: { tag: 'thinking' }
                                })}
                              >
                                <div>
                                  <div className="font-medium">标签模式</div>
                                  <div className="text-xs text-[#4f7096]">使用&lt;thinking&gt;标签提取思考过程</div>
                                </div>
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => setProcessingConfig({ 
                                  reasoningExtractionMethod: 'json_field',
                                  reasoningExtractionConfig: { field: 'reasoning' }
                                })}
                              >
                                <div>
                                  <div className="font-medium">JSON字段模式</div>
                                  <div className="text-xs text-[#4f7096]">通过JSON字段结构化思考内容</div>
                                </div>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <label className="block text-sm font-medium text-[#0c141c] mb-2">包含思考过程</label>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={processingConfig.includeThinkingInOutput}
                                onCheckedChange={(checked) => 
                                  setProcessingConfig({ includeThinkingInOutput: checked })
                                }
                              />
                              <span className="text-sm text-[#4f7096]">
                                {processingConfig.includeThinkingInOutput ? '在输出中包含思考过程' : '仅提取最终答案'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {currentLLMConfig && !isReasoningModel && (
                      // 不支持推理的模型：显示蒸馏配置
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <label className="block text-sm font-medium text-[#0c141c] mb-2">包含思考过程</label>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={processingConfig.includeThinkingInOutput}
                                onCheckedChange={(checked) => 
                                  setProcessingConfig({ includeThinkingInOutput: checked })
                                }
                              />
                              <span className="text-sm text-[#4f7096]">
                                {processingConfig.includeThinkingInOutput ? '在输出中包含思考过程' : '仅输出最终答案'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {processingConfig.includeThinkingInOutput && (
                          <div>
                            <label className="block text-sm font-medium text-[#0c141c] mb-2">蒸馏思考提示词</label>
                            <Textarea
                              className="border-[#d1dbe8]"
                              placeholder="输入用于引导模型生成思考过程的提示词..."
                              value={processingConfig.distillationPrompt}
                              onChange={(e) => setProcessingConfig({ distillationPrompt: e.target.value })}
                              rows={3}
                            />
                            <p className="text-xs text-[#4f7096] mt-1">
                              此提示词将用于指导模型生成详细的思考过程，实现知识蒸馏
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  </div>
                )}
              </div>
            </Card>

          {/* 示例预览 - 根据选中的格式动态显示 */}
          <div className="mt-6 p-4 bg-[#f8fbff] border border-[#e3f2fd] rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BookOpenIcon className="w-4 h-4 text-[#1977e5]" />
                <span className="text-sm font-medium text-[#0c141c]">数据示例</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-[#4f7096]">
                <span>格式：{FORMAT_DETAILS[outputFormat as keyof typeof FORMAT_DETAILS]?.name || outputFormat}</span>
                <span>•</span>
                <span>类型：{currentDatasetType?.name}</span>
                {processingConfig.enableThinkingProcess && (
                  <>
                    <span>•</span>
                    <span className="text-[#1977e5] font-medium">
                      {isReasoningModel ? '思考提取' : '蒸馏思考'}：{processingConfig.includeThinkingInOutput ? '包含思考过程' : '仅提取答案'}
                    </span>
                  </>
                )}
              </div>
            </div>
            <pre className="text-xs text-[#4f7096] bg-white p-3 rounded border overflow-x-auto whitespace-pre-wrap">
              {getCurrentExample()}
            </pre>
          </div>
        </div>
      </Card>

      {/* 格式详情Modal */}
      <FormatDetailsModal />
    </div>
  );
}; 