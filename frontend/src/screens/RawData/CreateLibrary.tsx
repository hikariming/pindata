import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { 
  ArrowLeftIcon, 
  TagIcon, 
  PlusIcon, 
  XIcon,
  BrainIcon,
  DatabaseIcon,
  Loader2Icon
} from 'lucide-react';

// 导入API相关
import { useLibraryActions } from '../../hooks/useLibraries';
import { CreateLibraryRequest, DataType } from '../../types/library';

interface CreateLibraryProps {
  onBack: () => void;
  onSuccess?: () => void;
}



export const CreateLibrary = ({ onBack, onSuccess }: CreateLibraryProps): JSX.Element => {
  const { t } = useTranslation();
  const { createLibrary, loading, error } = useLibraryActions();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    data_type: 'training' as DataType,
    tags: [] as string[],
    purpose: '',
  });
  
  const [newTag, setNewTag] = useState('');

  const commonTags = ['论文', '文档', '技术', '法律', '财报', '研究', '培训', '知识库'];

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, newTag.trim()]
      });
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(tag => tag !== tagToRemove)
    });
  };



  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      alert('请输入数据库名称');
      return;
    }

    // 验证库名称格式
    const name = formData.name.trim();
    if (name.length < 3) {
      alert('数据库名称长度不能少于3个字符');
      return;
    }
    
    if (name.length > 63) {
      alert('数据库名称长度不能超过63个字符');
      return;
    }
    
    // 检查是否包含非法字符
    const validNameRegex = /^[a-zA-Z0-9\u4e00-\u9fa5][a-zA-Z0-9\u4e00-\u9fa5_-]*[a-zA-Z0-9\u4e00-\u9fa5]$/;
    if (!validNameRegex.test(name)) {
      alert('数据库名称只能包含中文、英文、数字、下划线和连字符，且不能以连字符开头或结尾');
      return;
    }

    const createData: CreateLibraryRequest = {
      name: name,
      description: formData.description.trim() || undefined,
      data_type: formData.data_type,
      tags: formData.tags,
    };

    const result = await createLibrary(createData);
    if (result) {
      onSuccess?.();
      onBack();
    }
  };

  return (
    <div className="w-full max-w-[1000px] p-6">
      <Button
        variant="ghost"
        className="mb-6 text-[#4f7096] hover:text-[#0c141c] hover:bg-[#e8edf2]"
        onClick={onBack}
      >
        <ArrowLeftIcon className="w-4 h-4 mr-2" />
        {t('rawData.backToList')}
      </Button>

      <div className="mb-6">
        <h2 className="text-[26px] font-bold leading-8 text-[#0c141c] mb-2">
          {t('rawData.createNewLibrary')}
        </h2>
        <p className="text-[#4f7096]">{t('rawData.createLibraryDescription')}</p>
      </div>

      <div className="space-y-6">
        {/* 基本信息 */}
        <Card className="border-[#d1dbe8] bg-white p-6">
          <div className="flex items-center mb-4">
            <DatabaseIcon className="w-5 h-5 text-[#1977e5] mr-2" />
            <h3 className="text-lg font-semibold text-[#0c141c]">基本信息</h3>
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#0c141c]">
                  {t('rawData.libraryName')} <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder={t('rawData.libraryNamePlaceholder')}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="border-[#d1dbe8] focus:border-[#1977e5]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-[#0c141c]">
                  数据类型 <span className="text-red-500">*</span>
                </label>
                <select 
                  value={formData.data_type} 
                  onChange={(e) => setFormData({ ...formData, data_type: e.target.value as DataType })}
                  className="w-full px-3 py-2 border border-[#d1dbe8] rounded-md focus:border-[#1977e5] focus:outline-none bg-white"
                >
                  <option value="training">训练数据</option>
                  <option value="evaluation">评估数据</option>
                  <option value="mixed">混合数据</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[#0c141c]">
                {t('rawData.libraryDescription')}
              </label>
              <Textarea
                placeholder={t('rawData.libraryDescriptionPlaceholder')}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="border-[#d1dbe8] focus:border-[#1977e5] min-h-[80px]"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[#0c141c]">
                预期用途
              </label>
              <Input
                placeholder="如：科研论文理解模型训练、法律文档分析等"
                value={formData.purpose}
                onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                className="border-[#d1dbe8] focus:border-[#1977e5]"
              />
            </div>
          </div>
        </Card>

        {/* 标签管理 */}
        <Card className="border-[#d1dbe8] bg-white p-6">
          <div className="flex items-center mb-4">
            <TagIcon className="w-5 h-5 text-[#1977e5] mr-2" />
            <h3 className="text-lg font-semibold text-[#0c141c]">标签管理</h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="添加标签"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                className="border-[#d1dbe8] focus:border-[#1977e5]"
              />
              <Button 
                onClick={handleAddTag}
                className="bg-[#1977e5] hover:bg-[#1977e5]/90"
              >
                <PlusIcon className="w-4 h-4" />
              </Button>
            </div>

            <div>
              <p className="text-sm text-[#4f7096] mb-2">常用标签：</p>
              <div className="flex flex-wrap gap-2 mb-3">
                {commonTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="cursor-pointer hover:bg-[#e8edf2] border-[#d1dbe8]"
                    onClick={() => !formData.tags.includes(tag) && setFormData({
                      ...formData,
                      tags: [...formData.tags, tag]
                    })}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>

            {formData.tags.length > 0 && (
              <div>
                <p className="text-sm text-[#4f7096] mb-2">已添加的标签：</p>
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag) => (
                    <Badge key={tag} className="bg-[#1977e5] text-white">
                      {tag}
                      <XIcon 
                        className="w-3 h-3 ml-1 cursor-pointer" 
                        onClick={() => handleRemoveTag(tag)}
                      />
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>



        {/* 操作按钮 */}
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={onBack}
            disabled={loading}
            className="border-[#d1dbe8] text-[#4f7096] hover:bg-[#e8edf2] hover:text-[#0c141c]"
          >
            {t('common.cancel')}
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={loading || !formData.name.trim()}
            className="bg-[#1977e5] hover:bg-[#1977e5]/90"
          >
            {loading ? (
              <>
                <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />
                创建中...
              </>
            ) : (
              <>
                <BrainIcon className="w-4 h-4 mr-2" />
                {t('rawData.createLibrary')}
              </>
            )}
          </Button>
        </div>

        {/* 错误提示 */}
        {error && (
          <Card className="border-red-200 bg-red-50 p-4 mt-4">
            <div className="text-red-600 text-sm">
              {error}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};