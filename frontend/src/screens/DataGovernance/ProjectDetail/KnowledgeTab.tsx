import React from 'react';
import { 
  FileTextIcon, 
  ActivityIcon, 
  GitBranchIcon, 
  BarChart3Icon,
  CheckCircleIcon,
  ShareIcon
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { DataGovernanceProject, KnowledgeItem } from '../types';

interface KnowledgeTabProps {
  project: DataGovernanceProject;
}

export const KnowledgeTab: React.FC<KnowledgeTabProps> = ({ project }) => {
  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; color: string }> = {
      draft: { label: '草稿', color: 'bg-gray-100 text-gray-800' },
      published: { label: '已发布', color: 'bg-green-100 text-green-800' },
      archived: { label: '已归档', color: 'bg-purple-100 text-purple-800' },
      deprecated: { label: '已废弃', color: 'bg-red-100 text-red-800' },
    };
    
    const config = statusConfig[status] || statusConfig.draft;
    
    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    );
  };

  // 模拟数据，实际应该从props或API获取
  const knowledgeItems: KnowledgeItem[] = [
    {
      id: '1',
      project_id: project.id,
      title: '客户数据字典',
      description: '客户相关数据字段的详细说明和业务定义',
      knowledge_type: 'metadata',
      status: 'published',
      category: '数据字典',
      tags: ['客户', '数据字典', '标准化'],
      view_count: 156,
      like_count: 23,
      share_count: 8,
      version: '1.2.0',
      visibility: 'team',
      similarity_threshold: 0.8,
      created_at: '2024-06-01T09:00:00Z',
      updated_at: '2024-06-08T14:30:00Z',
      published_at: '2024-06-02T10:00:00Z'
    },
    {
      id: '2',
      project_id: project.id,
      title: '数据质量检查规则',
      description: '客户数据质量验证的业务规则和检查逻辑',
      knowledge_type: 'structured',
      status: 'published',
      category: '业务规则',
      tags: ['质量', '验证', '规则'],
      view_count: 89,
      like_count: 15,
      share_count: 5,
      version: '2.0.1',
      visibility: 'team',
      similarity_threshold: 0.8,
      created_at: '2024-05-28T11:00:00Z',
      updated_at: '2024-06-05T16:20:00Z',
      published_at: '2024-05-30T09:00:00Z'
    },
    {
      id: '3',
      project_id: project.id,
      title: '数据治理最佳实践',
      description: '基于项目经验总结的数据治理最佳实践和模板',
      knowledge_type: 'semantic',
      status: 'draft',
      category: '最佳实践',
      tags: ['治理', '模板', '经验'],
      view_count: 45,
      like_count: 8,
      share_count: 2,
      version: '0.9.0',
      visibility: 'private',
      similarity_threshold: 0.8,
      created_at: '2024-06-07T13:00:00Z',
      updated_at: '2024-06-09T10:15:00Z'
    }
  ];

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">知识管理</h3>
          <Button variant="outline" size="sm">
            <FileTextIcon size={16} className="mr-2" />
            创建知识项
          </Button>
        </div>
        <p className="text-gray-600 mb-4">
          项目相关的知识库，包括数据字典、业务规则、最佳实践等。
        </p>
        
        {/* 知识统计 */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
            <FileTextIcon size={24} className="text-purple-600 mb-2" />
            <h4 className="font-medium text-purple-800 mb-1">数据字典</h4>
            <p className="text-sm text-purple-600">125 个数据元素定义</p>
          </div>
          <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
            <ActivityIcon size={24} className="text-orange-600 mb-2" />
            <h4 className="font-medium text-orange-800 mb-1">业务规则</h4>
            <p className="text-sm text-orange-600">78 条数据治理规则</p>
          </div>
          <div className="p-4 bg-teal-50 rounded-lg border border-teal-200">
            <GitBranchIcon size={24} className="text-teal-600 mb-2" />
            <h4 className="font-medium text-teal-800 mb-1">最佳实践</h4>
            <p className="text-sm text-teal-600">12 个治理模板</p>
          </div>
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <BarChart3Icon size={24} className="text-blue-600 mb-2" />
            <h4 className="font-medium text-blue-800 mb-1">RAG向量</h4>
            <p className="text-sm text-blue-600">1,024 个语义索引</p>
          </div>
        </div>

        {/* 知识项列表 */}
        <div className="space-y-4">
          {knowledgeItems.map((item) => (
            <Card key={item.id} className="p-4 border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-medium text-gray-900">{item.title}</h4>
                    <Badge variant="outline" className="text-xs">
                      {item.knowledge_type}
                    </Badge>
                    {getStatusBadge(item.status)}
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{item.description}</p>
                  
                  <div className="flex flex-wrap gap-1 mb-3">
                    {item.tags?.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <ActivityIcon size={12} />
                      <span>{item.view_count} 次查看</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <CheckCircleIcon size={12} />
                      <span>{item.like_count} 个赞</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <ShareIcon size={12} />
                      <span>{item.share_count} 次分享</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">
                    查看
                  </Button>
                  <Button size="sm" variant="outline">
                    编辑
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Card>
    </div>
  );
}; 