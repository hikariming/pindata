import React, { useState, useEffect } from 'react';
import { Button } from '../../../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../../components/ui/select";
import { Card } from '../../../../components/ui/card';
import { Badge } from '../../../../components/ui/badge';
import { Switch } from '../../../../components/ui/switch';
import {
  FileEditIcon,
  EyeIcon,
  SettingsIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  Loader2Icon,
  InfoIcon,
  FileTextIcon,
  BrainIcon,
  ZapIcon,
} from 'lucide-react';
import { useLLMConfigs } from '../../../../hooks/useLLMConfigs';
import { LLMConfig } from '../../../../types/llm';

interface ConvertToMarkdownDialogProps {
  open: boolean;
  onClose: () => void;
  files: Array<{
    id: string;
    original_filename: string;
    file_type: string;
    file_size_human: string;
  }>;
  onConfirm: (conversionConfig: ConversionConfig) => void;
  loading?: boolean;
}

export interface ConversionConfig {
  method: 'markitdown' | 'vision_llm';
  llmConfigId?: string;
  customPrompt?: string;
  enableOCR?: boolean;
  preserveFormatting?: boolean;
  extractTables?: boolean;
  extractImages?: boolean;
  pageProcessing?: {
    mode: 'all' | 'batch';
    batchSize?: number;
  };
}

export const ConvertToMarkdownDialog = ({
  open,
  onClose,
  files,
  onConfirm,
  loading = false
}: ConvertToMarkdownDialogProps): JSX.Element => {
  const [conversionMethod, setConversionMethod] = useState<'markitdown' | 'vision_llm'>('markitdown');
  const [selectedLLMConfig, setSelectedLLMConfig] = useState<string>('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [enableOCR, setEnableOCR] = useState(true);
  const [preserveFormatting, setPreserveFormatting] = useState(true);
  const [extractTables, setExtractTables] = useState(true);
  const [extractImages, setExtractImages] = useState(false);
  
  // 新增：页面处理相关状态
  const [pageMode, setPageMode] = useState<'all' | 'batch'>('all');
  const [batchSize, setBatchSize] = useState<number>(1);

  // 默认提示词
  const defaultPrompts = {
    markitdown: '请将文档内容转换为 Markdown 格式，保持原有的结构和格式。',
    vision_llm: '请仔细分析这个文档的内容，将其转换为结构化的 Markdown 格式。注意保持原文的层次结构，准确提取表格、列表等元素，并确保格式美观易读。'
  };

  // 获取LLM配置 - 不再过滤 supports_vision
  const { configs: llmConfigs, loading: llmLoading } = useLLMConfigs({
    is_active: true
  });

  // 根据转换方法过滤可用的 LLM 配置
  const availableLLMConfigs = conversionMethod === 'vision_llm' 
    ? llmConfigs.filter(config => config.supports_vision)
    : llmConfigs;

  // 当转换方法改变时，重置相关状态
  useEffect(() => {
    if (conversionMethod === 'vision_llm') {
      const defaultConfig = availableLLMConfigs.find(config => config.is_default);
      if (defaultConfig) {
        setSelectedLLMConfig(defaultConfig.id);
      } else if (availableLLMConfigs.length > 0) {
        setSelectedLLMConfig(availableLLMConfigs[0].id);
      }
      // 设置默认提示词
      if (!customPrompt) {
        setCustomPrompt(defaultPrompts.vision_llm);
      }
    } else {
      setCustomPrompt('');
    }
  }, [conversionMethod, availableLLMConfigs]);

  const handleConfirm = () => {
    const config: ConversionConfig = {
      method: conversionMethod,
      enableOCR,
      preserveFormatting,
      extractTables,
      extractImages,
    };

    if (conversionMethod === 'vision_llm') {
      config.llmConfigId = selectedLLMConfig;
      config.customPrompt = customPrompt.trim() || undefined;
      config.pageProcessing = {
        mode: pageMode,
        batchSize: pageMode === 'batch' ? batchSize : undefined
      };
    }

    onConfirm(config);
  };

  const selectedLLMConfigData = availableLLMConfigs.find(config => config.id === selectedLLMConfig);

  const getFileTypeIcon = (fileType: string) => {
    switch (fileType.toLowerCase()) {
      case 'pdf':
        return '📄';
      case 'docx':
      case 'doc':
        return '📝';
      case 'pptx':
      case 'ppt':
        return '📊';
      case 'txt':
        return '📃';
      default:
        return '📄';
    }
  };

  const isFormValid = () => {
    if (conversionMethod === 'markitdown') {
      return true;
    }
    if (conversionMethod === 'vision_llm') {
      return selectedLLMConfig !== '';
    }
    return false;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileEditIcon className="w-5 h-5 text-[#1977e5]" />
            转换为 Markdown
          </DialogTitle>
          <DialogDescription>
            将选中的文件转换为 Markdown 格式，支持多种转换方式
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* 文件列表 */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-[#0c141c]">
              待转换文件 ({files.length} 个)
            </h4>
            <div className="max-h-32 overflow-y-auto space-y-2">
              {files.map((file) => (
                <div 
                  key={file.id} 
                  className="flex items-center justify-between p-2 bg-[#f8fafc] rounded-lg border border-[#e2e8f0]"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getFileTypeIcon(file.file_type)}</span>
                    <div>
                      <p className="text-sm font-medium text-[#0c141c]">{file.original_filename}</p>
                      <p className="text-xs text-[#4f7096]">
                        {file.file_type.toUpperCase()} • {file.file_size_human}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {file.file_type.toUpperCase()}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          {/* 转换方法选择 */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-[#0c141c]">转换方法</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Card 
                className={`p-4 cursor-pointer transition-all border-2 ${
                  conversionMethod === 'markitdown' 
                    ? 'border-[#1977e5] bg-[#f0f7ff]' 
                    : 'border-[#e2e8f0] hover:border-[#cbd5e1]'
                }`}
                onClick={() => setConversionMethod('markitdown')}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${
                    conversionMethod === 'markitdown' ? 'bg-[#1977e5] text-white' : 'bg-[#f1f5f9] text-[#64748b]'
                  }`}>
                    <ZapIcon className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-[#0c141c] mb-1">快速转换</h4>
                    <p className="text-xs text-[#4f7096] mb-2">
                      使用 markitdown 进行快速转换，适合常见文档格式
                    </p>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="secondary" className="text-xs">快速</Badge>
                      <Badge variant="secondary" className="text-xs">稳定</Badge>
                      <Badge variant="secondary" className="text-xs">基础功能</Badge>
                    </div>
                  </div>
                </div>
              </Card>

              <Card 
                className={`p-4 cursor-pointer transition-all border-2 ${
                  conversionMethod === 'vision_llm' 
                    ? 'border-[#1977e5] bg-[#f0f7ff]' 
                    : 'border-[#e2e8f0] hover:border-[#cbd5e1]'
                }`}
                onClick={() => setConversionMethod('vision_llm')}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${
                    conversionMethod === 'vision_llm' ? 'bg-[#1977e5] text-white' : 'bg-[#f1f5f9] text-[#64748b]'
                  }`}>
                    <BrainIcon className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-[#0c141c] mb-1">AI 智能转换</h4>
                    <p className="text-xs text-[#4f7096] mb-2">
                      使用视觉大模型进行智能转换，支持复杂布局和图表
                    </p>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="secondary" className="text-xs">智能</Badge>
                      <Badge variant="secondary" className="text-xs">精准</Badge>
                      <Badge variant="secondary" className="text-xs">可定制</Badge>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* AI 智能转换配置 */}
          {conversionMethod === 'vision_llm' && (
            <div className="space-y-4 p-4 bg-[#f8fafc] rounded-lg border">
              <div className="flex items-center gap-2">
                <BrainIcon className="w-4 h-4 text-[#1977e5]" />
                <label className="text-sm font-medium text-[#0c141c]">AI 模型配置</label>
              </div>
              
              {/* LLM配置选择 */}
              <div className="space-y-2">
                <label className="text-xs text-[#4f7096]">选择视觉模型</label>
                <Select value={selectedLLMConfig} onValueChange={setSelectedLLMConfig}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={llmLoading ? "加载中..." : "选择模型配置"} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableLLMConfigs.map((config) => (
                      <SelectItem key={config.id} value={config.id}>
                        <div className="flex items-center gap-2">
                          <span>{config.name}</span>
                          {config.is_default && (
                            <Badge variant="secondary" className="text-xs">默认</Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {selectedLLMConfigData && (
                  <div className="flex items-center gap-2 text-xs text-[#4f7096]">
                    <InfoIcon className="w-3 h-3" />
                    <span>
                      {selectedLLMConfigData.provider} • {selectedLLMConfigData.model_name}
                    </span>
                  </div>
                )}
              </div>

              {/* AI转换选项 */}
              <div className="space-y-3">
                <label className="text-xs text-[#4f7096]">AI转换选项</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-center justify-between p-3 border rounded-lg bg-white">
                    <div>
                      <label className="text-sm text-[#0c141c]">启用 OCR</label>
                      <p className="text-xs text-[#4f7096]">将PDF页面作为图片进行识别</p>
                    </div>
                    <Switch
                      checked={enableOCR}
                      onCheckedChange={setEnableOCR}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg bg-white">
                    <div>
                      <label className="text-sm text-[#0c141c]">提取图片信息</label>
                      <p className="text-xs text-[#4f7096]">分析文档中的图片内容</p>
                    </div>
                    <Switch
                      checked={extractImages}
                      onCheckedChange={setExtractImages}
                    />
                  </div>
                </div>
              </div>

              {/* 页面处理选项 - AI 转换专用 */}
              <div className="space-y-2">
                <label className="text-xs text-[#4f7096]">页面处理方式</label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="pageMode"
                      value="all"
                      checked={pageMode === 'all'}
                      onChange={(e) => setPageMode(e.target.value as 'all' | 'batch')}
                      className="w-4 h-4 text-[#1977e5] focus:ring-[#1977e5]"
                    />
                    <span className="text-sm">一次处理全部页面</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="pageMode"
                      value="batch"
                      checked={pageMode === 'batch'}
                      onChange={(e) => setPageMode(e.target.value as 'all' | 'batch')}
                      className="w-4 h-4 text-[#1977e5] focus:ring-[#1977e5]"
                    />
                    <span className="text-sm">分批处理</span>
                  </label>
                  {pageMode === 'batch' && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-[#4f7096]">每批</span>
                      <Select value={batchSize.toString()} onValueChange={(value) => setBatchSize(Number(value))}>
                        <SelectTrigger className="w-20 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1页</SelectItem>
                          <SelectItem value="2">2页</SelectItem>
                          <SelectItem value="4">4页</SelectItem>
                          <SelectItem value="8">8页</SelectItem>
                          <SelectItem value="10">10页</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                <p className="text-xs text-[#64748b]">
                  {pageMode === 'batch' 
                    ? `将文档分成每 ${batchSize} 页一批进行处理，适合处理大文档`
                    : '一次性处理整个文档，适合小文档'}
                </p>
              </div>

              {/* 自定义提示词 */}
              <div className="space-y-2">
                <label className="text-xs text-[#4f7096]">转换提示词</label>
                <textarea
                  placeholder="输入特殊的转换要求或提示词..."
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  className="w-full min-h-[100px] px-3 py-2 text-sm border border-[#e2e8f0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#1977e5] focus:border-transparent resize-y"
                />
                <p className="text-xs text-[#64748b]">
                  提示：您可以添加特殊要求，如"重点提取表格数据"、"保留原始格式"等
                </p>
              </div>
            </div>
          )}

          {/* 转换选项 - 根据方法显示不同选项 */}
          <div className="space-y-4">
            <label className="text-sm font-medium text-[#0c141c]">通用转换选项</label>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* markitdown 和 vision_llm 共同的选项 */}
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <label className="text-sm text-[#0c141c]">保持格式</label>
                  <p className="text-xs text-[#4f7096]">尽量保持原文档格式</p>
                </div>
                <Switch
                  checked={preserveFormatting}
                  onCheckedChange={setPreserveFormatting}
                />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <label className="text-sm text-[#0c141c]">提取表格</label>
                  <p className="text-xs text-[#4f7096]">将表格转换为 Markdown 表格</p>
                </div>
                <Switch
                  checked={extractTables}
                  onCheckedChange={setExtractTables}
                />
              </div>

              {/* markitdown 特有的选项 */}
              {conversionMethod === 'markitdown' && (
                <>
                  <div className="flex items-center justify-between p-3 border rounded-lg opacity-50 cursor-not-allowed">
                    <div>
                      <label className="text-sm text-[#0c141c]">图片提取</label>
                      <p className="text-xs text-[#4f7096]">需要 AI 模型支持</p>
                    </div>
                    <Switch
                      checked={false}
                      disabled
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg opacity-50 cursor-not-allowed">
                    <div>
                      <label className="text-sm text-[#0c141c]">智能 OCR</label>
                      <p className="text-xs text-[#4f7096]">需要 AI 模型支持</p>
                    </div>
                    <Switch
                      checked={false}
                      disabled
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* 警告信息 */}
          {conversionMethod === 'vision_llm' && (
            <div className="flex items-start gap-2 p-3 bg-[#fef3c7] border border-[#f59e0b] rounded-lg">
              <AlertCircleIcon className="w-4 h-4 text-[#f59e0b] mt-0.5" />
              <div className="text-sm">
                <p className="text-[#92400e] font-medium">注意事项</p>
                <p className="text-[#92400e] text-xs mt-1">
                  AI 智能转换将消耗 API 调用次数，转换时间可能较长，但转换质量更高
                </p>
              </div>
            </div>
          )}

          {conversionMethod === 'markitdown' && (
            <div className="flex items-start gap-2 p-3 bg-[#dbeafe] border border-[#3b82f6] rounded-lg">
              <InfoIcon className="w-4 h-4 text-[#3b82f6] mt-0.5" />
              <div className="text-sm">
                <p className="text-[#1e40af] font-medium">快速转换说明</p>
                <p className="text-[#1e40af] text-xs mt-1">
                  使用本地 markitdown 库进行转换，速度快但功能有限。如需识别图片内容或复杂布局，请使用 AI 智能转换。
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            取消
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading || !isFormValid()}
            className="bg-[#1977e5] hover:bg-[#1565c0]"
          >
            {loading ? (
              <>
                <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />
                转换中...
              </>
            ) : (
              <>
                <FileEditIcon className="w-4 h-4 mr-2" />
                开始转换 ({files.length})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 