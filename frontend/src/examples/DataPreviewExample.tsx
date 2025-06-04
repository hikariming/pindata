import React from 'react';
import { DataPreviewContainer } from '../components/DataPreview';

/**
 * DataPreview 使用示例
 * 
 * 这个示例展示了如何使用 DataPreviewContainer 组件来预览数据集
 * 并实现版本切换功能
 */

const DataPreviewExample: React.FC = () => {
  // 示例数据集ID - 在实际使用中这应该从props或路由参数获取
  const datasetId = 1;

  const handleError = (error: Error) => {
    // 在实际应用中，你可能会显示一个toast通知或者错误对话框
    console.error('数据预览错误:', error);
    // 例如：showErrorToast(error.message);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="border-b pb-4">
        <h1 className="text-2xl font-bold">数据集预览示例</h1>
        <p className="text-gray-600 mt-2">
          展示数据集预览组件的版本切换和文件管理功能
        </p>
      </div>

      {/* 使用容器组件 - 最简单的方式 */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">方式一：使用容器组件（推荐）</h2>
        <DataPreviewContainer
          datasetId={datasetId}
          onError={handleError}
        />
      </div>

      {/* 说明文档 */}
      <div className="bg-gray-50 p-6 rounded-lg">
        <h3 className="text-lg font-semibold mb-3">功能说明</h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-start gap-2">
            <span className="text-blue-600">🔄</span>
            <div>
              <strong>版本切换:</strong> 点击版本按钮可以查看和切换不同版本，支持显示版本状态和详细信息
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-green-600">📁</span>
            <div>
              <strong>文件管理:</strong> 支持文件预览、批量选择、上传和删除操作
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-purple-600">🔍</span>
            <div>
              <strong>过滤筛选:</strong> 可以按文件类型过滤，支持全选/取消全选
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-orange-600">📊</span>
            <div>
              <strong>数据预览:</strong> 支持表格、JSON、文本、图像等多种文件类型的预览
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataPreviewExample; 