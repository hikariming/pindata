import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ChevronRightIcon,
  ChevronLeftIcon,
  DatabaseIcon,
  BrainIcon,
  UsersIcon,
  SettingsIcon,
  CheckCircleIcon,
  XCircleIcon,
  FolderIcon,
  PlusIcon,
  AlertCircleIcon,
  ServerIcon,
  CloudIcon,
  HardDriveIcon
} from 'lucide-react';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Select } from '../../../components/ui/select';
import { Badge } from '../../../components/ui/badge';
import { DataGovernanceProject, DataSourceConfig } from '../types';

interface ProjectCreationWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (project: Partial<DataGovernanceProject>) => void;
}

interface WizardStep {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  isCompleted: boolean;
  isActive: boolean;
}

const dataSourceTypes = [
  {
    id: 'upload',
    name: '文件上传',
    description: '直接上传本地文件',
    icon: FolderIcon,
    supports: ['PDF', 'DOCX', 'XLSX', 'TXT', 'MD']
  },
  {
    id: 'database',
    name: '数据库连接',
    description: '连接到企业数据库',
    icon: ServerIcon,
    supports: ['MySQL', 'PostgreSQL', 'MongoDB', 'Oracle']
  },
  {
    id: 'storage',
    name: '云存储',
    description: '连接到云存储服务',
    icon: CloudIcon,
    supports: ['AWS S3', '阿里云OSS', '腾讯云COS', 'MinIO']
  },
  {
    id: 'api',
    name: 'API接口',
    description: '通过API获取数据',
    icon: HardDriveIcon,
    supports: ['REST API', 'GraphQL', 'WebSocket']
  }
];

const projectTemplates = [
  {
    id: 'document-extraction',
    name: '文档知识抽取',
    description: '将企业文档转换为结构化知识库',
    icon: '📚',
    dataTypes: ['PDF', 'DOCX', 'PPTX'],
    pipeline: ['extract', 'clean', 'transform', 'output'],
    useCase: '适用于企业知识管理、文档数字化转型'
  },
  {
    id: 'financial-analysis',
    name: '财务数据分析',
    description: '分析财务报表，提取关键指标',
    icon: '💰',
    dataTypes: ['XLSX', 'CSV', 'PDF'],
    pipeline: ['extract', 'validate', 'transform', 'output'],
    useCase: '适用于财务分析、风险评估、合规检查'
  },
  {
    id: 'customer-insights',
    name: '客户洞察分析',
    description: '分析客户数据，挖掘商业价值',
    icon: '👥',
    dataTypes: ['CSV', 'JSON', 'Database'],
    pipeline: ['extract', 'clean', 'transform', 'validate', 'output'],
    useCase: '适用于客户画像、市场分析、个性化推荐'
  },
  {
    id: 'custom',
    name: '自定义工程',
    description: '根据业务需求自定义数据处理流程',
    icon: '⚙️',
    dataTypes: ['All'],
    pipeline: ['custom'],
    useCase: '适用于特殊业务场景和定制化需求'
  }
];

export const ProjectCreationWizard: React.FC<ProjectCreationWizardProps> = ({
  isOpen,
  onClose,
  onSubmit
}) => {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(0);
  const [projectData, setProjectData] = useState<Partial<DataGovernanceProject>>({
    name: '',
    description: '',
    dataSource: [],
    pipeline: []
  });

  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [selectedDataSources, setSelectedDataSources] = useState<string[]>([]);
  const [dataSourceConfigs, setDataSourceConfigs] = useState<Record<string, any>>({});

  const steps: WizardStep[] = [
    {
      id: 'basic',
      title: '基本信息',
      description: '设置工程名称和描述',
      icon: SettingsIcon,
      isCompleted: !!projectData.name,
      isActive: currentStep === 0
    },
    {
      id: 'template',
      title: '选择模板',
      description: '选择工程模板或自定义',
      icon: DatabaseIcon,
      isCompleted: !!selectedTemplate,
      isActive: currentStep === 1
    },
    {
      id: 'datasource',
      title: '配置数据源',
      description: '设置数据输入源',
      icon: HardDriveIcon,
      isCompleted: selectedDataSources.length > 0,
      isActive: currentStep === 2
    },
    {
      id: 'team',
      title: '团队设置',
      description: '配置团队成员和权限',
      icon: UsersIcon,
      isCompleted: false,
      isActive: currentStep === 3
    },
    {
      id: 'review',
      title: '预览确认',
      description: '确认配置并创建工程',
      icon: CheckCircleIcon,
      isCompleted: false,
      isActive: currentStep === 4
    }
  ];

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = () => {
    const finalProject: Partial<DataGovernanceProject> = {
      ...projectData,
      dataSource: selectedDataSources.map(type => ({
        id: `${type}-${Date.now()}`,
        name: dataSourceTypes.find(ds => ds.id === type)?.name || type,
        type: type as 'upload' | 'database' | 'api' | 'storage',
        config: dataSourceConfigs[type] || {},
        status: 'disconnected' as const
      }))
    };
    onSubmit(finalProject);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden flex">
        {/* 步骤侧边栏 */}
        <div className="w-80 bg-gradient-to-b from-blue-50 to-indigo-100 p-6">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">创建新工程</h2>
            <p className="text-gray-600">企业数据治理工程向导</p>
          </div>

          <div className="space-y-4">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.id}
                  className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                    step.isActive
                      ? 'bg-blue-600 text-white'
                      : step.isCompleted
                      ? 'bg-green-100 text-green-800'
                      : 'bg-white text-gray-600'
                  }`}
                >
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    step.isActive
                      ? 'bg-blue-700'
                      : step.isCompleted
                      ? 'bg-green-600'
                      : 'bg-gray-200'
                  }`}>
                    {step.isCompleted ? (
                      <CheckCircleIcon size={16} className="text-white" />
                    ) : (
                      <Icon size={16} className={step.isActive ? 'text-white' : 'text-gray-600'} />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className={`font-medium ${step.isActive ? 'text-white' : ''}`}>
                      {step.title}
                    </h3>
                    <p className={`text-sm ${
                      step.isActive ? 'text-blue-100' : step.isCompleted ? 'text-green-600' : 'text-gray-500'
                    }`}>
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 主要内容区域 */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 p-8 overflow-y-auto">
            {/* 步骤1: 基本信息 */}
            {currentStep === 0 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">工程基本信息</h3>
                  <p className="text-gray-600">为您的数据治理工程设置基本信息</p>
                </div>

                <Card className="p-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        工程名称 *
                      </label>
                      <Input
                        placeholder="请输入工程名称"
                        value={projectData.name}
                        onChange={(e) => setProjectData({...projectData, name: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        工程描述
                      </label>
                      <textarea
                        className="w-full p-3 border border-gray-300 rounded-lg"
                        rows={4}
                        placeholder="请描述工程的目标和用途"
                        value={projectData.description}
                        onChange={(e) => setProjectData({...projectData, description: e.target.value})}
                      />
                    </div>
                  </div>
                </Card>

                <Card className="p-6 bg-blue-50">
                  <div className="flex items-start gap-3">
                    <AlertCircleIcon size={20} className="text-blue-600 mt-1" />
                    <div>
                      <h4 className="font-medium text-blue-900 mb-1">工程创建提示</h4>
                      <p className="text-sm text-blue-700">
                        工程名称将用于标识您的数据治理项目，建议使用清晰、有意义的名称。
                        描述信息可以帮助团队成员更好地理解工程的目标和范围。
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {/* 步骤2: 选择模板 */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">选择工程模板</h3>
                  <p className="text-gray-600">选择适合的模板快速开始，或创建自定义工程</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {projectTemplates.map((template) => (
                    <Card
                      key={template.id}
                      className={`p-6 cursor-pointer transition-all ${
                        selectedTemplate === template.id
                          ? 'border-blue-500 bg-blue-50 shadow-md'
                          : 'hover:shadow-md'
                      }`}
                      onClick={() => setSelectedTemplate(template.id)}
                    >
                      <div className="flex items-start gap-4">
                        <div className="text-3xl">{template.icon}</div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 mb-2">{template.name}</h4>
                          <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                          
                          <div className="space-y-2">
                            <div>
                              <span className="text-xs font-medium text-gray-500">支持数据类型：</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {template.dataTypes.map((type) => (
                                  <Badge key={type} variant="secondary" className="text-xs">
                                    {type}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            <p className="text-xs text-gray-500">{template.useCase}</p>
                          </div>
                        </div>
                        {selectedTemplate === template.id && (
                          <CheckCircleIcon size={20} className="text-blue-600" />
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* 步骤3: 配置数据源 */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">配置数据源</h3>
                  <p className="text-gray-600">选择和配置您的数据输入源</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {dataSourceTypes.map((source) => {
                    const Icon = source.icon;
                    const isSelected = selectedDataSources.includes(source.id);
                    
                    return (
                      <Card
                        key={source.id}
                        className={`p-4 cursor-pointer transition-all ${
                          isSelected ? 'border-blue-500 bg-blue-50' : 'hover:shadow-md'
                        }`}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedDataSources(prev => prev.filter(id => id !== source.id));
                          } else {
                            setSelectedDataSources(prev => [...prev, source.id]);
                          }
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${
                            isSelected ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
                          }`}>
                            <Icon size={20} />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{source.name}</h4>
                            <p className="text-sm text-gray-600 mb-2">{source.description}</p>
                            <div className="flex flex-wrap gap-1">
                              {source.supports.slice(0, 3).map((format) => (
                                <Badge key={format} variant="outline" className="text-xs">
                                  {format}
                                </Badge>
                              ))}
                              {source.supports.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{source.supports.length - 3}
                                </Badge>
                              )}
                            </div>
                          </div>
                          {isSelected && (
                            <CheckCircleIcon size={16} className="text-blue-600" />
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>

                {selectedDataSources.length > 0 && (
                  <Card className="p-6">
                    <h4 className="font-medium text-gray-900 mb-4">已选择的数据源配置</h4>
                    <div className="space-y-4">
                      {selectedDataSources.map((sourceId) => {
                        const source = dataSourceTypes.find(s => s.id === sourceId);
                        return (
                          <div key={sourceId} className="p-4 bg-gray-50 rounded-lg">
                            <h5 className="font-medium text-gray-900 mb-2">{source?.name}</h5>
                            <Input
                              placeholder={`配置 ${source?.name} 连接参数`}
                              value={dataSourceConfigs[sourceId] || ''}
                              onChange={(e) => setDataSourceConfigs({
                                ...dataSourceConfigs,
                                [sourceId]: e.target.value
                              })}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                )}
              </div>
            )}

            {/* 步骤4: 团队设置 */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">团队设置</h3>
                  <p className="text-gray-600">配置工程团队成员和权限</p>
                </div>

                <Card className="p-6">
                  <h4 className="font-medium text-gray-900 mb-4">初始团队成员</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    您将自动成为工程所有者，可以在工程创建后邀请更多成员。
                  </p>
                  
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium">
                        您
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">项目所有者</p>
                        <p className="text-sm text-gray-600">拥有工程的完全控制权</p>
                      </div>
                      <Badge className="bg-purple-100 text-purple-800">
                        所有者
                      </Badge>
                    </div>
                  </div>
                </Card>

                <Card className="p-6 bg-green-50">
                  <div className="flex items-start gap-3">
                    <CheckCircleIcon size={20} className="text-green-600 mt-1" />
                    <div>
                      <h4 className="font-medium text-green-900 mb-1">团队协作功能</h4>
                      <p className="text-sm text-green-700 mb-2">
                        工程创建后，您可以：
                      </p>
                      <ul className="text-sm text-green-700 space-y-1">
                        <li>• 邀请团队成员加入工程</li>
                        <li>• 分配不同的角色和权限</li>
                        <li>• 管理成员访问控制</li>
                        <li>• 跟踪团队活动和贡献</li>
                      </ul>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {/* 步骤5: 预览确认 */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">预览确认</h3>
                  <p className="text-gray-600">请确认工程配置信息</p>
                </div>

                <div className="grid gap-6">
                  {/* 基本信息 */}
                  <Card className="p-6">
                    <h4 className="font-medium text-gray-900 mb-4">基本信息</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">工程名称：</span>
                        <span className="font-medium">{projectData.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">工程描述：</span>
                        <span className="font-medium">{projectData.description || '无'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">选择模板：</span>
                        <span className="font-medium">
                          {projectTemplates.find(t => t.id === selectedTemplate)?.name || '未选择'}
                        </span>
                      </div>
                    </div>
                  </Card>

                  {/* 数据源配置 */}
                  <Card className="p-6">
                    <h4 className="font-medium text-gray-900 mb-4">数据源配置</h4>
                    {selectedDataSources.length > 0 ? (
                      <div className="space-y-2">
                        {selectedDataSources.map((sourceId) => {
                          const source = dataSourceTypes.find(s => s.id === sourceId);
                          return (
                            <div key={sourceId} className="flex items-center gap-3">
                              <div className="w-2 h-2 bg-blue-600 rounded-full" />
                              <span>{source?.name}</span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-gray-500">未配置数据源</p>
                    )}
                  </Card>

                  {/* 团队配置 */}
                  <Card className="p-6">
                    <h4 className="font-medium text-gray-900 mb-4">团队配置</h4>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                        您
                      </div>
                      <span>项目所有者</span>
                      <Badge className="bg-purple-100 text-purple-800">所有者</Badge>
                    </div>
                  </Card>
                </div>
              </div>
            )}
          </div>

          {/* 底部操作栏 */}
          <div className="border-t p-6 bg-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={onClose}
                className="flex items-center gap-2"
              >
                <XCircleIcon size={16} />
                取消
              </Button>
              {currentStep > 0 && (
                <Button
                  variant="outline"
                  onClick={prevStep}
                  className="flex items-center gap-2"
                >
                  <ChevronLeftIcon size={16} />
                  上一步
                </Button>
              )}
            </div>

            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500">
                {currentStep + 1} / {steps.length}
              </span>
              {currentStep < steps.length - 1 ? (
                <Button
                  onClick={nextStep}
                  disabled={!steps[currentStep].isCompleted && currentStep !== 3}
                  className="flex items-center gap-2"
                >
                  下一步
                  <ChevronRightIcon size={16} />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  <CheckCircleIcon size={16} />
                  创建工程
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 