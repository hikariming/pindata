import React from 'react';
import { Card } from '../../../../components/ui/card';
import { WandIcon, CheckCircleIcon } from 'lucide-react';
import { useSmartDatasetCreatorStore } from '../store/useSmartDatasetCreatorStore';

// 自定义Progress组件
const Progress: React.FC<{ value: number; className?: string }> = ({ value, className }) => {
  return (
    <div className={`w-full bg-gray-200 rounded-full ${className}`}>
      <div 
        className="bg-[#1977e5] h-full rounded-full transition-all duration-300 ease-in-out"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
};

export const Step5Generation: React.FC = () => {
  const progress = useSmartDatasetCreatorStore(state => state.progress);

  return (
    <Card className="border-[#d1dbe8]">
      <div className="p-6">
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <WandIcon className="w-8 h-8 text-[#1977e5]" />
            <h3 className="text-xl font-semibold text-[#0c141c]">AI正在生成数据集</h3>
          </div>

          <div className="max-w-md mx-auto mb-8">
            <Progress value={progress} className="h-3" />
            <p className="text-sm text-[#4f7096] mt-2">{progress}% 完成</p>
          </div>

          <div className="space-y-4 text-left max-w-lg mx-auto">
            <div className="flex items-center gap-3 p-3 bg-[#f0f4f8] rounded">
              <div className={`w-3 h-3 rounded-full ${progress >= 20 ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span className={`text-sm ${progress >= 20 ? 'text-[#0c141c]' : 'text-[#4f7096]'}`}>
                解析文档内容
              </span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-[#f0f4f8] rounded">
              <div className={`w-3 h-3 rounded-full ${progress >= 40 ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span className={`text-sm ${progress >= 40 ? 'text-[#0c141c]' : 'text-[#4f7096]'}`}>
                提取关键信息
              </span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-[#f0f4f8] rounded">
              <div className={`w-3 h-3 rounded-full ${progress >= 60 ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span className={`text-sm ${progress >= 60 ? 'text-[#0c141c]' : 'text-[#4f7096]'}`}>
                AI模型处理
              </span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-[#f0f4f8] rounded">
              <div className={`w-3 h-3 rounded-full ${progress >= 80 ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span className={`text-sm ${progress >= 80 ? 'text-[#0c141c]' : 'text-[#4f7096]'}`}>
                格式化数据
              </span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-[#f0f4f8] rounded">
              <div className={`w-3 h-3 rounded-full ${progress >= 100 ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span className={`text-sm ${progress >= 100 ? 'text-[#0c141c]' : 'text-[#4f7096]'}`}>
                保存数据集
              </span>
            </div>
          </div>

          {progress === 100 && (
            <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircleIcon className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <h4 className="font-medium text-green-700 mb-2">数据集生成完成！</h4>
              <p className="text-sm text-green-600">正在跳转到数据集管理页面...</p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}; 