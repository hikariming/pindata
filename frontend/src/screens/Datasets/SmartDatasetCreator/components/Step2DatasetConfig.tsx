import React from 'react';
import { Card } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Textarea } from '../../../../components/ui/textarea';
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
  BarChart3Icon
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
    showFormatDetails,
    selectedFormat,
    setDatasetType,
    setOutputFormat,
    setDatasetName,
    setDatasetDescription,
    setShowFormatDetails,
    setSelectedFormat
  } = useSmartDatasetCreatorStore();

  const handleFormatHelp = (formatName: string) => {
    setSelectedFormat(formatName);
    setShowFormatDetails(true);
  };

  const currentDatasetType = DATASET_TYPES.find(t => t.id === datasetType);

  // 获取当前格式对应的示例数据
  const getCurrentExample = () => {
    if (outputFormat && FORMAT_DETAILS[outputFormat as keyof typeof FORMAT_DETAILS]) {
      return FORMAT_DETAILS[outputFormat as keyof typeof FORMAT_DETAILS].example;
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