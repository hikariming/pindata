import React from 'react';
import { RefreshCwIcon, CheckCircleIcon, FileTextIcon, PauseIcon } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { DataGovernanceProject, GovernedData } from '../types';

interface GovernedDataTabProps {
  project: DataGovernanceProject;
}

export const GovernedDataTab: React.FC<GovernedDataTabProps> = ({ project }) => {
  const formatDataSize = (bytes: number): string => {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; color: string }> = {
      active: { label: '进行中', color: 'bg-green-100 text-green-800' },
      draft: { label: '草稿', color: 'bg-gray-100 text-gray-800' },
      completed: { label: '已完成', color: 'bg-blue-100 text-blue-800' },
      archived: { label: '已归档', color: 'bg-purple-100 text-purple-800' },
      running: { label: '运行中', color: 'bg-blue-100 text-blue-800' },
      pending: { label: '待处理', color: 'bg-yellow-100 text-yellow-800' },
      failed: { label: '失败', color: 'bg-red-100 text-red-800' },
    };
    
    const config = statusConfig[status] || statusConfig.draft;
    
    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    );
  };

  // 模拟数据，实际应该从props或API获取
  const governedData: GovernedData[] = [
    {
      id: '1',
      project_id: project.id,
      name: '客户信息清洗数据',
      description: '经过数据清洗和标准化的客户基础信息',
      governance_status: 'completed',
      quality_score: 95,
      data_type: 'structured',
      file_size: 1048576,
      tags: ['客户', '标准化', '清洗'],
      processed_at: '2024-06-10T10:30:00Z',
      created_at: '2024-06-10T08:00:00Z',
      updated_at: '2024-06-10T10:30:00Z'
    },
    {
      id: '2',
      project_id: project.id,
      name: '产品销售分析数据',
      description: '整合的产品销售数据，包含销量、价格、渠道等信息',
      governance_status: 'processing',
      quality_score: 88,
      data_type: 'structured',
      file_size: 2097152,
      tags: ['销售', '产品', '分析'],
      processed_at: '2024-06-09T15:20:00Z',
      created_at: '2024-06-09T14:00:00Z',
      updated_at: '2024-06-09T15:20:00Z'
    }
  ];

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">治理后数据</h3>
          <Button variant="outline" size="sm">
            <RefreshCwIcon size={16} className="mr-2" />
            重新处理
          </Button>
        </div>
        <p className="text-gray-600 mb-4">
          经过数据清洗、质量检查和标准化处理的高质量数据。
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {governedData.map((data) => (
            <Card key={data.id} className="p-4 border border-gray-200 hover:border-blue-300 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900">{data.name}</h4>
                {getStatusBadge(data.governance_status)}
              </div>
              <p className="text-sm text-gray-600 mb-3">{data.description}</p>
              
              <div className="mb-3">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-500">数据质量</span>
                  <span className="font-medium">{data.quality_score}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      data.quality_score >= 90 ? 'bg-green-500' :
                      data.quality_score >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${data.quality_score}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                <div>
                  <span className="text-gray-500">数据类型:</span>
                  <Badge variant="outline" className="ml-2 text-xs">
                    {data.data_type}
                  </Badge>
                </div>
                <div>
                  <span className="text-gray-500">文件大小:</span>
                  <span className="ml-2 font-medium">{formatDataSize(data.file_size)}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-1 mb-3">
                {data.tags?.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>

              <div className="text-xs text-gray-500 mb-3">
                {data.processed_at && `处理完成: ${formatDate(data.processed_at)}`}
              </div>

              <div className="flex gap-2">
                <Button size="sm" variant="outline">
                  预览数据
                </Button>
                <Button size="sm" variant="outline">
                  下载
                </Button>
                <Button size="sm" variant="outline">
                  质量报告
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </Card>
    </div>
  );
}; 