import React from 'react';
import { DatabaseIcon } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { DataGovernanceProject } from '../types';

interface DatasetsTabProps {
  project: DataGovernanceProject;
}

export const DatasetsTab: React.FC<DatasetsTabProps> = ({ project }) => {
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">数据集管理</h3>
          <Button variant="outline" size="sm">
            <DatabaseIcon size={16} className="mr-2" />
            创建数据集
          </Button>
        </div>
        <p className="text-gray-600 mb-4">
          管理项目中创建的各类数据集，用于分析和建模。
        </p>
        <div className="space-y-4">
          <Card className="p-4 border border-gray-200 hover:border-blue-300 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-4">
                <DatabaseIcon size={20} className="text-blue-600" />
                <div>
                  <h4 className="font-medium text-gray-900">客户360度画像数据集</h4>
                  <p className="text-sm text-gray-600">综合客户基础信息、行为数据和偏好分析</p>
                </div>
              </div>
              <Badge variant="default" className="bg-green-100 text-green-800">
                已发布
              </Badge>
            </div>
            
            <div className="grid grid-cols-4 gap-4 text-sm mb-3">
              <div>
                <span className="text-gray-500">记录数:</span>
                <span className="ml-2 font-medium">1,234,567</span>
              </div>
              <div>
                <span className="text-gray-500">字段数:</span>
                <span className="ml-2 font-medium">45</span>
              </div>
              <div>
                <span className="text-gray-500">大小:</span>
                <span className="ml-2 font-medium">1.2 GB</span>
              </div>
              <div>
                <span className="text-gray-500">格式:</span>
                <span className="ml-2 font-medium">Parquet</span>
              </div>
            </div>

            <div className="text-xs text-gray-500 mb-3">
              更新时间: 2024-06-10 10:30
            </div>

            <div className="flex gap-2">
              <Button size="sm" variant="outline">
                预览
              </Button>
              <Button size="sm" variant="outline">
                下载
              </Button>
              <Button size="sm" variant="outline">
                API访问
              </Button>
            </div>
          </Card>

          <Card className="p-4 border border-gray-200 hover:border-blue-300 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-4">
                <DatabaseIcon size={20} className="text-green-600" />
                <div>
                  <h4 className="font-medium text-gray-900">营销效果分析数据集</h4>
                  <p className="text-sm text-gray-600">包含营销活动数据和效果指标</p>
                </div>
              </div>
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                处理中
              </Badge>
            </div>
            
            <div className="grid grid-cols-4 gap-4 text-sm mb-3">
              <div>
                <span className="text-gray-500">记录数:</span>
                <span className="ml-2 font-medium">856,342</span>
              </div>
              <div>
                <span className="text-gray-500">字段数:</span>
                <span className="ml-2 font-medium">32</span>
              </div>
              <div>
                <span className="text-gray-500">大小:</span>
                <span className="ml-2 font-medium">0.8 GB</span>
              </div>
              <div>
                <span className="text-gray-500">格式:</span>
                <span className="ml-2 font-medium">CSV</span>
              </div>
            </div>

            <div className="text-xs text-gray-500 mb-3">
              更新时间: 2024-06-09 15:20
            </div>

            <div className="flex gap-2">
              <Button size="sm" variant="outline">
                预览
              </Button>
              <Button size="sm" variant="outline">
                下载
              </Button>
              <Button size="sm" variant="outline" disabled>
                API访问
              </Button>
            </div>
          </Card>
        </div>
      </Card>
    </div>
  );
}; 