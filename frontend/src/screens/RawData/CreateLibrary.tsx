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
  SettingsIcon,
  InfoIcon,
  Loader2Icon
} from 'lucide-react';

// 导入API相关
import { useLibraryActions } from '../../hooks/useLibraries';
import { CreateLibraryRequest, DataType } from '../../types/library';

interface CreateLibraryProps {
  onBack: () => void;
  onSuccess?: () => void;
}

interface ConversionSettings {
  enableAutoConversion: boolean;
  supportedFormats: string[];
  outputFormat: 'markdown' | 'plain_text';
  preserveFormatting: boolean;
  extractImages: boolean;
  extractTables: boolean;
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
  const [conversionSettings, setConversionSettings] = useState<ConversionSettings>({
    enableAutoConversion: true,
    supportedFormats: ['pdf', 'docx', 'pptx', 'xlsx'],
    outputFormat: 'markdown',
    preserveFormatting: true,
    extractImages: true,
    extractTables: true,
  });

  const supportedFormats = [
    { id: 'pdf', name: 'PDF文档', description: '便携式文档格式' },
    { id: 'docx', name: 'Word文档', description: 'Microsoft Word文档' },
    { id: 'pptx', name: 'PowerPoint', description: 'Microsoft PowerPoint演示文稿' },
    { id: 'xlsx', name: 'Excel表格', description: 'Microsoft Excel工作表' },
    { id: 'txt', name: '文本文件', description: '纯文本文件' },
    { id: 'md', name: 'Markdown', description: 'Markdown标记语言' },
    { id: 'html', name: 'HTML', description: '超文本标记语言' },
    { id: 'rtf', name: 'RTF文档', description: '富文本格式' },
  ];

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

  const handleFormatToggle = (formatId: string, checked: boolean) => {
    if (checked) {
      setConversionSettings({
        ...conversionSettings,
        supportedFormats: [...conversionSettings.supportedFormats, formatId]
      });
    } else {
      setConversionSettings({
        ...conversionSettings,
        supportedFormats: conversionSettings.supportedFormats.filter(f => f !== formatId)
      });
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      alert('请输入数据库名称');
      return;
    }

    const createData: CreateLibraryRequest = {
      name: formData.name.trim(),
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
        返回列表
      </Button>

      <div className="mb-6">
        <h2 className="text-[26px] font-bold leading-8 text-[#0c141c] mb-2">
          创建新数据库
        </h2>
        <p className="text-[#4f7096]">配置数据库以管理和处理多源异构训练数据</p>
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
                  数据库名称 <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="请输入数据库名称"
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
                数据库描述
              </label>
              <Textarea
                placeholder="描述这个数据库的用途和包含的数据类型..."
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

        {/* 转换设置 */}
        <Card className="border-[#d1dbe8] bg-white p-6">
          <div className="flex items-center mb-4">
            <SettingsIcon className="w-5 h-5 text-[#1977e5] mr-2" />
            <h3 className="text-lg font-semibold text-[#0c141c]">转换设置</h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <input 
                type="checkbox"
                id="autoConversion"
                checked={conversionSettings.enableAutoConversion}
                onChange={(e) => 
                  setConversionSettings({ 
                    ...conversionSettings, 
                    enableAutoConversion: e.target.checked 
                  })
                }
                className="w-4 h-4 text-[#1977e5] border-[#d1dbe8] rounded focus:ring-[#1977e5]"
              />
              <label htmlFor="autoConversion" className="text-sm font-medium text-[#0c141c]">
                启用自动转换
              </label>
              <InfoIcon className="w-4 h-4 text-[#4f7096]" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[#0c141c]">
                输出格式
              </label>
              <select 
                value={conversionSettings.outputFormat} 
                onChange={(e) => 
                  setConversionSettings({ 
                    ...conversionSettings, 
                    outputFormat: e.target.value as 'markdown' | 'plain_text' 
                  })
                }
                className="w-full px-3 py-2 border border-[#d1dbe8] rounded-md focus:border-[#1977e5] focus:outline-none bg-white"
              >
                <option value="markdown">Markdown (.md)</option>
                <option value="plain_text">纯文本 (.txt)</option>
              </select>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium text-[#0c141c]">
                支持的文件格式
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {supportedFormats.map((format) => (
                  <div key={format.id} className="flex items-start space-x-2">
                    <input 
                      type="checkbox"
                      id={format.id}
                      checked={conversionSettings.supportedFormats.includes(format.id)}
                      onChange={(e) => handleFormatToggle(format.id, e.target.checked)}
                      className="w-4 h-4 text-[#1977e5] border-[#d1dbe8] rounded focus:ring-[#1977e5] mt-0.5"
                    />
                    <div>
                      <label htmlFor={format.id} className="text-sm font-medium text-[#0c141c]">
                        {format.name}
                      </label>
                      <p className="text-xs text-[#4f7096]">{format.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium text-[#0c141c]">
                转换选项
              </label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <input 
                    type="checkbox"
                    id="preserveFormatting"
                    checked={conversionSettings.preserveFormatting}
                    onChange={(e) => 
                      setConversionSettings({ 
                        ...conversionSettings, 
                        preserveFormatting: e.target.checked 
                      })
                    }
                    className="w-4 h-4 text-[#1977e5] border-[#d1dbe8] rounded focus:ring-[#1977e5]"
                  />
                  <label htmlFor="preserveFormatting" className="text-sm text-[#0c141c]">
                    保留原始格式
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <input 
                    type="checkbox"
                    id="extractImages"
                    checked={conversionSettings.extractImages}
                    onChange={(e) => 
                      setConversionSettings({ 
                        ...conversionSettings, 
                        extractImages: e.target.checked 
                      })
                    }
                    className="w-4 h-4 text-[#1977e5] border-[#d1dbe8] rounded focus:ring-[#1977e5]"
                  />
                  <label htmlFor="extractImages" className="text-sm text-[#0c141c]">
                    提取图片内容
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <input 
                    type="checkbox"
                    id="extractTables"
                    checked={conversionSettings.extractTables}
                    onChange={(e) => 
                      setConversionSettings({ 
                        ...conversionSettings, 
                        extractTables: e.target.checked 
                      })
                    }
                    className="w-4 h-4 text-[#1977e5] border-[#d1dbe8] rounded focus:ring-[#1977e5]"
                  />
                  <label htmlFor="extractTables" className="text-sm text-[#0c141c]">
                    提取表格数据
                  </label>
                </div>
              </div>
            </div>
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
            取消
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
                创建数据库
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