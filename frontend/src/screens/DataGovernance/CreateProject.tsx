import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  Loader2Icon,
} from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { useCreateProject } from '../../hooks/useDataGovernance';

export const CreateProject: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const { createProject, loading, error } = useCreateProject();

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      errors.name = '项目名称不能为空';
    } else if (formData.name.length > 200) {
      errors.name = '项目名称长度不能超过200个字符';
    }
    
    if (!formData.description.trim()) {
      errors.description = '项目描述不能为空';
    } else if (formData.description.length > 1000) {
      errors.description = '项目描述长度不能超过1000个字符';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      const result = await createProject({
        name: formData.name.trim(),
        description: formData.description.trim(),
      });
      
      if (result) {
        // Navigate to the project detail page
        navigate(`/governance/projects/${result.id}`);
      }
    } catch (err) {
      console.error('Failed to create project:', err);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-2xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/governance')}
            className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeftIcon size={16} />
            返回项目列表
          </Button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            创建新项目
          </h1>
          <p className="text-gray-600">
            创建一个新的数据治理项目，开始您的数据管理之旅
          </p>
        </div>

        {/* Form */}
        <Card className="p-8 bg-white/80 backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Project Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                项目名称 <span className="text-red-500">*</span>
              </label>
              <Input
                id="name"
                type="text"
                placeholder="请输入项目名称"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={`${formErrors.name ? 'border-red-500 focus:border-red-500' : ''}`}
                disabled={loading}
              />
              {formErrors.name && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircleIcon size={14} />
                  {formErrors.name}
                </p>
              )}
            </div>

            {/* Project Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                项目描述 <span className="text-red-500">*</span>
              </label>
              <textarea
                id="description"
                rows={4}
                placeholder="请描述项目的目标、范围和用途"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
                  formErrors.description ? 'border-red-500 focus:border-red-500' : 'border-gray-300'
                }`}
                disabled={loading}
              />
              {formErrors.description && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircleIcon size={14} />
                  {formErrors.description}
                </p>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertCircleIcon size={16} className="text-red-500" />
                  <span className="text-red-700">{error}</span>
                </div>
              </div>
            )}

            {/* Success Message */}
            {!loading && !error && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircleIcon size={16} className="text-green-500" />
                  <span className="text-green-700">
                    填写完成后点击"创建项目"按钮，系统将为您创建一个新的数据治理项目
                  </span>
                </div>
              </div>
            )}

            {/* Form Actions */}
            <div className="flex items-center justify-between pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/governance')}
                disabled={loading}
              >
                取消
              </Button>
              <Button
                type="submit"
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
                disabled={loading || !formData.name.trim() || !formData.description.trim()}
              >
                {loading ? (
                  <>
                    <Loader2Icon size={16} className="mr-2 animate-spin" />
                    创建中...
                  </>
                ) : (
                  <>
                    <CheckCircleIcon size={16} className="mr-2" />
                    创建项目
                  </>
                )}
              </Button>
            </div>
          </form>
        </Card>

        {/* Help Text */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-medium text-blue-900 mb-2">项目创建说明</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• 项目名称应简洁明了，能够清楚地表达项目的目标</li>
            <li>• 项目描述可以详细说明项目的背景、目标和预期成果</li>
            <li>• 项目创建后，您可以在项目详情页面中添加数据源和配置处理流程</li>
            <li>• 您将自动成为项目的所有者，可以邀请其他成员加入项目</li>
          </ul>
        </div>
      </div>
    </div>
  );
};