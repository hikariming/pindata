import React from 'react';
import { Card } from '../../../../components/ui/card';
import { EyeIcon, FileIcon } from 'lucide-react';
import { useSmartDatasetCreatorStore } from '../store/useSmartDatasetCreatorStore';
import { DATASET_TYPES, FORMAT_DETAILS, AI_MODELS } from '../constants';

export const Step4PreviewConfirm: React.FC = () => {
  const {
    selectedFiles,
    datasetType,
    outputFormat,
    datasetName,
    processingConfig
  } = useSmartDatasetCreatorStore();

  const currentDatasetType = DATASET_TYPES.find(t => t.id === datasetType);
  const currentFormat = FORMAT_DETAILS[outputFormat as keyof typeof FORMAT_DETAILS];
  const currentModel = AI_MODELS.find(m => m.id === processingConfig.model);

  return (
    <Card className="border-[#d1dbe8]">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <EyeIcon className="w-6 h-6 text-[#1977e5]" />
          <h3 className="text-lg font-semibold text-[#0c141c]">预览确认</h3>
        </div>

        <div className="space-y-6">
          <div>
            <h4 className="font-medium text-[#0c141c] mb-3">数据源</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {selectedFiles.slice(0, 4).map((file) => (
                <div key={file.id} className="flex items-center gap-2 p-2 bg-[#f0f4f8] rounded">
                  <FileIcon className="w-4 h-4 text-[#4f7096]" />
                  <span className="text-sm text-[#0c141c] truncate">{file.name}</span>
                </div>
              ))}
              {selectedFiles.length > 4 && (
                <div className="p-2 bg-[#f0f4f8] rounded text-center text-sm text-[#4f7096]">
                  +{selectedFiles.length - 4} 个文件
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-[#0c141c] mb-3">数据集配置</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#4f7096]">类型:</span>
                  <span className="text-[#0c141c]">
                    {currentDatasetType?.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#4f7096]">格式:</span>
                  <span className="text-[#0c141c]">
                    {currentFormat?.name || outputFormat}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#4f7096]">名称:</span>
                  <span className="text-[#0c141c]">{datasetName || '未设置'}</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-[#0c141c] mb-3">模型配置</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#4f7096]">模型:</span>
                  <span className="text-[#0c141c]">
                    {currentModel?.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#4f7096]">温度:</span>
                  <span className="text-[#0c141c]">{processingConfig.temperature}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#4f7096]">批处理:</span>
                  <span className="text-[#0c141c]">{processingConfig.batchSize} 文档/批次</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-[#f0f4f8] border border-[#d1dbe8] rounded-lg">
            <h5 className="font-medium text-[#0c141c] mb-2">预估处理信息</h5>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-[#4f7096]">文件数量:</span>
                <div className="font-medium text-[#0c141c]">{selectedFiles.length}</div>
              </div>
              <div>
                <span className="text-[#4f7096]">预估时间:</span>
                <div className="font-medium text-[#0c141c]">
                  {Math.ceil(selectedFiles.length / processingConfig.batchSize * 2)} 分钟
                </div>
              </div>
              <div>
                <span className="text-[#4f7096]">预估条目:</span>
                <div className="font-medium text-[#0c141c]">
                  {selectedFiles.length * 10}-{selectedFiles.length * 50}
                </div>
              </div>
              <div>
                <span className="text-[#4f7096]">预估大小:</span>
                <div className="font-medium text-[#0c141c]">
                  {Math.round(selectedFiles.reduce((sum, f) => sum + f.size, 0) / 1024)} KB
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}; 