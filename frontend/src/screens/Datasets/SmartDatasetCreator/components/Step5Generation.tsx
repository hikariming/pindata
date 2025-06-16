import React from 'react';
import { Card } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { Wand2, CheckCircle, ExternalLink, FileText, Info } from 'lucide-react';
import { useSmartDatasetCreatorStore } from '../store/useSmartDatasetCreatorStore';



export const Step5Generation: React.FC = () => {
  const { taskInfo, resetState } = useSmartDatasetCreatorStore();

  const handleCreateNew = () => {
    resetState();
  };

  const handleViewDataset = () => {
    if (taskInfo?.datasetId) {
      window.location.href = `/datasets/${taskInfo.datasetId}`;
    }
  };

  const handleViewTasks = () => {
    window.location.href = '/tasks';
  };

  return (
    <Card className="border-[#d1dbe8]">
      <div className="p-6">
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <CheckCircle className="w-8 h-8 text-green-500" />
            <h3 className="text-xl font-semibold text-[#0c141c]">数据集生成任务已提交</h3>
          </div>

          <div className="max-w-lg mx-auto mb-8">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-6">
              <p className="text-sm text-green-700 mb-3">
                ✅ 您的数据集生成任务已成功提交到后台处理队列
              </p>
              {taskInfo && (
                <div className="text-left space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-green-600">任务ID:</span>
                    <span className="font-mono text-green-800">{taskInfo.taskId}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-green-600">数据集:</span>
                    <span className="text-green-800">{taskInfo.datasetName}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-green-600">数据集ID:</span>
                    <span className="font-mono text-green-800">{taskInfo.datasetId}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-6">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                <div className="text-left">
                  <h4 className="font-medium text-blue-800 mb-2">后台处理说明</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• AI模型正在后台处理您的文档，生成智能数据集</li>
                    <li>• 处理时间取决于文档数量和复杂度，通常需要几分钟到几十分钟</li>
                    <li>• 您可以关闭此页面，任务会继续在后台运行</li>
                    <li>• 可以在任务管理页面查看详细的处理进度和日志</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="space-y-4 text-left">
              <div className="flex items-center gap-3 p-3 bg-[#f0f4f8] rounded">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-sm text-[#0c141c]">任务已提交</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-[#f0f4f8] rounded">
                <div className="w-3 h-3 rounded-full bg-blue-400 animate-pulse" />
                <span className="text-sm text-[#4f7096]">后台处理中...</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-[#f0f4f8] rounded">
                <div className="w-3 h-3 rounded-full bg-gray-300" />
                <span className="text-sm text-[#4f7096]">等待完成</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={handleViewTasks}
              className="bg-[#1977e5] hover:bg-[#1565c0] text-white"
            >
              <FileText className="w-4 h-4 mr-2" />
              查看任务进度
            </Button>
            
            {taskInfo?.datasetId && (
              <Button
                variant="outline"
                onClick={handleViewDataset}
                className="border-[#1977e5] text-[#1977e5] hover:bg-[#f0f7ff]"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                查看数据集
              </Button>
            )}
            
            <Button
              variant="outline"
              onClick={handleCreateNew}
              className="border-[#4f7096] text-[#4f7096] hover:bg-[#f8fafc]"
            >
              创建新数据集
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}; 