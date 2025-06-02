import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { Switch } from "../../../components/ui/switch";
import { Badge } from "../../../components/ui/badge";
import {
  PlusIcon,
  EditIcon,
  CheckIcon,
  XIcon,
  TrashIcon,
  PlayIcon,
  RefreshCwIcon,
  Loader2Icon,
  SettingsIcon,
  ShieldCheckIcon,
  InfoIcon,
  AlertCircleIcon
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../../components/ui/dialog";
import { useLLMConfigs } from '../../../hooks/useLLMConfigs';
import { type LLMConfig, ProviderType, CreateLLMConfigRequest, UpdateLLMConfigRequest, ModelProvider } from '../../../types/llm';

const MODEL_PROVIDERS: ModelProvider[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    type: 'openai',
    icon: '🤖',
    baseUrl: 'https://api.openai.com/v1',
    models: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo', 'gpt-3.5-turbo-16k', 'gpt-4-vision-preview']
  },
  {
    id: 'claude',
    name: 'Anthropic Claude',
    type: 'claude',
    icon: '🔮',
    baseUrl: 'https://api.anthropic.com/v1',
    models: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307']
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    type: 'gemini',
    icon: '✨',
    baseUrl: 'https://generativelanguage.googleapis.com/v1',
    models: ['gemini-pro', 'gemini-pro-vision', 'gemini-ultra']
  }
];

export const LLMConfigComponent = (): JSX.Element => {
  const { t } = useTranslation();
  const [isAddModelOpen, setIsAddModelOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<string | null>(null);
  const [deleteConfigId, setDeleteConfigId] = useState<string | null>(null);
  const [testingConfigId, setTestingConfigId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // 使用自定义Hook
  const {
    configs: llmConfigs,
    loading: configsLoading,
    error: configsError,
    createConfig,
    updateConfig,
    deleteConfig,
    setDefaultConfig,
    testConfig,
    refreshConfigs
  } = useLLMConfigs();

  const [newConfig, setNewConfig] = useState<Partial<CreateLLMConfigRequest>>({
    name: '',
    provider: 'openai',
    model_name: '',
    api_key: '',
    base_url: '',
    temperature: 0.7,
    max_tokens: 4096,
    is_active: true,
    supports_vision: false
  });

  const [editConfig, setEditConfig] = useState<Partial<UpdateLLMConfigRequest>>({});

  const resetNewConfig = () => {
    setNewConfig({
      name: '',
      provider: 'openai',
      model_name: '',
      api_key: '',
      base_url: '',
      temperature: 0.7,
      max_tokens: 4096,
      is_active: true,
      supports_vision: false
    });
  };

  const handleAddModel = async () => {
    if (newConfig.name && newConfig.model_name && newConfig.api_key) {
      try {
        await createConfig(newConfig as CreateLLMConfigRequest);
        resetNewConfig();
        setIsAddModelOpen(false);
      } catch (error) {
        console.error('Failed to create config:', error);
      }
    }
  };

  const handleEditModel = async () => {
    if (editingConfig && editConfig) {
      try {
        await updateConfig(editingConfig, editConfig);
        setEditingConfig(null);
        setEditConfig({});
      } catch (error) {
        console.error('Failed to update config:', error);
      }
    }
  };

  const handleSetDefault = async (configId: string) => {
    try {
      await setDefaultConfig(configId);
    } catch (error) {
      console.error('Failed to set default config:', error);
    }
  };

  const handleToggleActive = async (config: LLMConfig) => {
    try {
      await updateConfig(config.id, { is_active: !config.is_active });
    } catch (error) {
      console.error('Failed to toggle config status:', error);
    }
  };

  const handleDeleteConfig = async () => {
    if (deleteConfigId) {
      try {
        await deleteConfig(deleteConfigId);
        setDeleteConfigId(null);
        setShowDeleteDialog(false);
      } catch (error) {
        console.error('Failed to delete config:', error);
      }
    }
  };

  const handleTestConfig = async (configId: string) => {
    setTestingConfigId(configId);
    try {
      const result = await testConfig(configId);
      console.log('Test result:', result);
      // 这里可以显示测试结果的通知
    } catch (error) {
      console.error('Failed to test config:', error);
    } finally {
      setTestingConfigId(null);
    }
  };

  const startEditConfig = (config: LLMConfig) => {
    setEditingConfig(config.id);
    setEditConfig({
      name: config.name,
      model_name: config.model_name,
      api_key: config.api_key,
      base_url: config.base_url,
      temperature: config.temperature,
      max_tokens: config.max_tokens,
      is_active: config.is_active,
      supports_vision: config.supports_vision
    });
  };

  const openDeleteDialog = (configId: string) => {
    setDeleteConfigId(configId);
    setShowDeleteDialog(true);
  };

  const closeDeleteDialog = () => {
    setDeleteConfigId(null);
    setShowDeleteDialog(false);
  };

  return (
    <div className="space-y-6">
      {/* 错误提示 */}
      {configsError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <AlertCircleIcon className="w-5 h-5 text-red-600 mr-2" />
            <span className="text-red-800">{configsError}</span>
          </div>
        </div>
      )}

      {/* 添加模型按钮 */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-[#0c141c]">模型配置列表</h3>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={refreshConfigs}
            disabled={configsLoading}
          >
            {configsLoading ? (
              <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCwIcon className="w-4 h-4 mr-2" />
            )}
            刷新
          </Button>
          <Dialog open={isAddModelOpen} onOpenChange={setIsAddModelOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#1977e5] hover:bg-[#1462c4]">
                <PlusIcon className="w-4 h-4 mr-2" />
                添加模型
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>添加新的模型配置</DialogTitle>
                <DialogDescription>
                  配置新的大模型接口，支持OpenAI、Claude、Gemini以及自定义接口
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">配置名称</label>
                    <Input
                      placeholder="例如：GPT-4 生产环境"
                      value={newConfig.name || ''}
                      onChange={(e) => setNewConfig({...newConfig, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">模型提供商</label>
                    <Select
                      value={newConfig.provider || 'openai'}
                      onValueChange={(value: string) => {
                        const provider = MODEL_PROVIDERS.find(p => p.type === value as ProviderType) || MODEL_PROVIDERS[0];
                        setNewConfig({
                          ...newConfig,
                          provider: value as ProviderType,
                          model_name: '',
                          base_url: provider.baseUrl
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MODEL_PROVIDERS.map(provider => (
                          <SelectItem key={provider.id} value={provider.type}>
                            <div className="flex items-center gap-2">
                              <span>{provider.icon}</span>
                              <span>{provider.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                        <SelectItem value="custom">
                          <div className="flex items-center gap-2">
                            <SettingsIcon className="w-4 h-4" />
                            <span>自定义接口</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">模型名称</label>
                    <div className="space-y-2">
                      <Input
                        placeholder="例如：gpt-4-vision-preview"
                        value={newConfig.model_name || ''}
                        onChange={(e) => setNewConfig({...newConfig, model_name: e.target.value})}
                      />
                      <div className="text-xs text-[#4f7096]">
                        您可以输入任何模型名称，包括自定义模型
                      </div>
                      {(() => {
                        const provider = MODEL_PROVIDERS.find(p => p.type === newConfig.provider);
                        return provider?.models.length ? (
                          <details className="text-xs">
                            <summary className="cursor-pointer text-[#1977e5] hover:underline">
                              查看推荐模型
                            </summary>
                            <div className="mt-2 space-y-1">
                              {provider.models.map(model => (
                                <div 
                                  key={model} 
                                  className="px-2 py-1 bg-gray-50 rounded cursor-pointer hover:bg-gray-100"
                                  onClick={() => setNewConfig({...newConfig, model_name: model})}
                                >
                                  {model}
                                </div>
                              ))}
                            </div>
                          </details>
                        ) : null;
                      })()}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">API密钥</label>
                    <Input
                      type="password"
                      placeholder="sk-..."
                      value={newConfig.api_key || ''}
                      onChange={(e) => setNewConfig({...newConfig, api_key: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">API接口地址</label>
                  <Input
                    placeholder="https://api.example.com/v1"
                    value={newConfig.base_url || ''}
                    onChange={(e) => setNewConfig({...newConfig, base_url: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">温度参数</label>
                    <Input
                      type="number"
                      min="0"
                      max="2"
                      step="0.1"
                      value={newConfig.temperature || 0.7}
                      onChange={(e) => setNewConfig({...newConfig, temperature: parseFloat(e.target.value)})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">最大Token数</label>
                    <Input
                      type="number"
                      min="1"
                      value={newConfig.max_tokens || 4096}
                      onChange={(e) => setNewConfig({...newConfig, max_tokens: parseInt(e.target.value)})}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={newConfig.is_active || true}
                      onCheckedChange={(checked: boolean) => setNewConfig({...newConfig, is_active: checked})}
                    />
                    <label className="text-sm font-medium">启用此配置</label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={newConfig.supports_vision || false}
                      onCheckedChange={(checked: boolean) => setNewConfig({...newConfig, supports_vision: checked})}
                    />
                    <div className="flex items-center space-x-2">
                      <label className="text-sm font-medium">支持视觉识别</label>
                      <InfoIcon className="w-4 h-4 text-[#4f7096]" />
                    </div>
                  </div>
                  <div className="text-xs text-[#4f7096] ml-6">
                    启用后可以处理图像输入和视觉相关任务
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddModelOpen(false)}>
                  取消
                </Button>
                <Button onClick={handleAddModel}>
                  添加配置
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 编辑模型配置对话框 */}
      <Dialog open={!!editingConfig} onOpenChange={(open: boolean) => !open && setEditingConfig(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>编辑模型配置</DialogTitle>
            <DialogDescription>
              修改现有的模型配置参数
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">配置名称</label>
                <Input
                  placeholder="例如：GPT-4 生产环境"
                  value={editConfig.name || ''}
                  onChange={(e) => setEditConfig({...editConfig, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">模型名称</label>
                <Input
                  placeholder="例如：gpt-4-vision-preview"
                  value={editConfig.model_name || ''}
                  onChange={(e) => setEditConfig({...editConfig, model_name: e.target.value})}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">API密钥</label>
              <Input
                type="password"
                placeholder="sk-..."
                value={editConfig.api_key || ''}
                onChange={(e) => setEditConfig({...editConfig, api_key: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">API接口地址</label>
              <Input
                placeholder="https://api.example.com/v1"
                value={editConfig.base_url || ''}
                onChange={(e) => setEditConfig({...editConfig, base_url: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">温度参数</label>
                <Input
                  type="number"
                  min="0"
                  max="2"
                  step="0.1"
                  value={editConfig.temperature || 0.7}
                  onChange={(e) => setEditConfig({...editConfig, temperature: parseFloat(e.target.value)})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">最大Token数</label>
                <Input
                  type="number"
                  min="1"
                  value={editConfig.max_tokens || 4096}
                  onChange={(e) => setEditConfig({...editConfig, max_tokens: parseInt(e.target.value)})}
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={editConfig.is_active ?? true}
                  onCheckedChange={(checked: boolean) => setEditConfig({...editConfig, is_active: checked})}
                />
                <label className="text-sm font-medium">启用此配置</label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  checked={editConfig.supports_vision ?? false}
                  onCheckedChange={(checked: boolean) => setEditConfig({...editConfig, supports_vision: checked})}
                />
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium">支持视觉识别</label>
                  <InfoIcon className="w-4 h-4 text-[#4f7096]" />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingConfig(null)}>
              取消
            </Button>
            <Button onClick={handleEditModel}>
              保存修改
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog open={showDeleteDialog} onOpenChange={(open: boolean) => !open && closeDeleteDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              您确定要删除这个模型配置吗？此操作无法撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={closeDeleteDialog}>
              取消
            </Button>
            <Button onClick={handleDeleteConfig} className="bg-red-600 hover:bg-red-700 text-white">
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 模型配置列表 */}
      <div className="space-y-4">
        {configsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2Icon className="w-6 h-6 animate-spin mr-2" />
            <span>加载配置中...</span>
          </div>
        ) : llmConfigs.length === 0 ? (
          <div className="text-center py-8 text-[#4f7096]">
            暂无配置，请添加第一个模型配置
          </div>
        ) : (
          llmConfigs.map(config => (
            <Card key={config.id} className="border-[#d1dbe8] p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">
                    {MODEL_PROVIDERS.find(p => p.type === config.provider)?.icon || '⚙️'}
                  </div>
                  <div>
                    <h4 className="font-semibold text-[#0c141c] flex items-center gap-2">
                      {config.name}
                      {config.is_default && (
                        <Badge variant="default" className="bg-[#1977e5]">
                          默认
                        </Badge>
                      )}
                      {config.supports_vision && (
                        <Badge variant="outline" className="border-green-500 text-green-700 bg-green-50">
                          <InfoIcon className="w-3 h-3 mr-1" />
                          视觉支持
                        </Badge>
                      )}
                    </h4>
                    <p className="text-sm text-[#4f7096]">
                      {MODEL_PROVIDERS.find(p => p.type === config.provider)?.name || config.provider} · {config.model_name}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Switch
                    checked={config.is_active}
                    onCheckedChange={() => handleToggleActive(config)}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTestConfig(config.id)}
                    disabled={testingConfigId === config.id}
                  >
                    {testingConfigId === config.id ? (
                      <Loader2Icon className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <PlayIcon className="w-4 h-4 mr-1" />
                    )}
                    测试
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSetDefault(config.id)}
                    disabled={config.is_default}
                  >
                    <ShieldCheckIcon className="w-4 h-4 mr-1" />
                    {config.is_default ? '默认配置' : '设为默认'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => startEditConfig(config)}
                  >
                    <EditIcon className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openDeleteDialog(config.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 text-sm">
                <div>
                  <span className="text-[#4f7096]">API地址</span>
                  <div className="text-[#0c141c] font-medium truncate">
                    {config.base_url}
                  </div>
                </div>
                <div>
                  <span className="text-[#4f7096]">温度</span>
                  <div className="text-[#0c141c] font-medium">{config.temperature}</div>
                </div>
                <div>
                  <span className="text-[#4f7096]">最大Token</span>
                  <div className="text-[#0c141c] font-medium">{config.max_tokens}</div>
                </div>
                <div>
                  <span className="text-[#4f7096]">视觉支持</span>
                  <div className="flex items-center gap-1">
                    {config.supports_vision ? (
                      <>
                        <CheckIcon className="w-4 h-4 text-green-600" />
                        <span className="text-green-600 font-medium">支持</span>
                      </>
                    ) : (
                      <>
                        <XIcon className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-500 font-medium">不支持</span>
                      </>
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-[#4f7096]">状态</span>
                  <div className={`font-medium ${config.is_active ? 'text-green-600' : 'text-gray-500'}`}>
                    {config.is_active ? '已启用' : '已禁用'}
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}; 