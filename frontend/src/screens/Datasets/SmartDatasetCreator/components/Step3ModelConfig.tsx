import React from 'react';
import { Card } from '../../../../components/ui/card';
import { Input } from '../../../../components/ui/input';
import { Textarea } from '../../../../components/ui/textarea';
import { SettingsIcon } from 'lucide-react';
import { useSmartDatasetCreatorStore } from '../store/useSmartDatasetCreatorStore';
import { AI_MODELS } from '../constants';

export const Step3ModelConfig: React.FC = () => {
  const {
    processingConfig,
    setProcessingConfig
  } = useSmartDatasetCreatorStore();

  return (
    <Card className="border-[#d1dbe8]">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <SettingsIcon className="w-6 h-6 text-[#1977e5]" />
          <h3 className="text-lg font-semibold text-[#0c141c]">模型配置</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-[#0c141c] mb-2">选择AI模型</label>
            <div className="space-y-2">
              {AI_MODELS.map((model) => (
                <Card 
                  key={model.id}
                  className={`border cursor-pointer transition-all ${
                    processingConfig.model === model.id 
                      ? 'border-[#1977e5] bg-[#f0f4f8]' 
                      : 'border-[#d1dbe8] hover:border-[#1977e5]'
                  }`}
                  onClick={() => setProcessingConfig({ model: model.id })}
                >
                  <div className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h5 className="font-medium text-[#0c141c]">{model.name}</h5>
                        <p className="text-sm text-[#4f7096]">{model.provider}</p>
                      </div>
                      <div className="flex gap-1">
                        <span className={`px-2 py-1 text-xs rounded ${
                          model.quality === 'high' ? 'bg-green-100 text-green-700' :
                          model.quality === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {model.quality === 'high' ? '高质量' : 
                           model.quality === 'medium' ? '中等质量' : '自定义'}
                        </span>
                        <span className={`px-2 py-1 text-xs rounded ${
                          model.speed === 'fast' ? 'bg-blue-100 text-blue-700' :
                          model.speed === 'medium' ? 'bg-orange-100 text-orange-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {model.speed === 'fast' ? '快速' : 
                           model.speed === 'medium' ? '中等' : '可变'}
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          <div className="space-y-4">
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
                className="w-full"
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
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#0c141c] mb-2">批处理大小</label>
              <Input
                type="number"
                className="border-[#d1dbe8]"
                value={processingConfig.batchSize}
                onChange={(e) => setProcessingConfig({ batchSize: parseInt(e.target.value) || 10 })}
              />
              <p className="text-xs text-[#4f7096] mt-1">同时处理的文档数量，影响处理速度</p>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <label className="block text-sm font-medium text-[#0c141c] mb-2">自定义提示词 (可选)</label>
          <Textarea
            className="border-[#d1dbe8]"
            placeholder="输入自定义的处理指令..."
            value={processingConfig.customPrompt}
            onChange={(e) => setProcessingConfig({ customPrompt: e.target.value })}
            rows={4}
          />
          <p className="text-xs text-[#4f7096] mt-1">留空将使用默认的最佳实践提示词</p>
        </div>
      </div>
    </Card>
  );
}; 