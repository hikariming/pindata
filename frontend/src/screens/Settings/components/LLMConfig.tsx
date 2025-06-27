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
  AlertCircleIcon,
  CheckCircleIcon,
  ClockIcon,
  WifiIcon,
  WifiOffIcon,
  BrainCircuitIcon
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
import { type LLMConfig, ProviderType, CreateLLMConfigRequest, UpdateLLMConfigRequest, ModelProvider, TestConfigResponse, ReasoningExtractionMethod } from '../../../types/llm';

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
  const [testResult, setTestResult] = useState<{
    configId: string;
    result: TestConfigResponse;
    success: boolean;
  } | null>(null);
  const [showTestResult, setShowTestResult] = useState(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

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
    supports_vision: false,
    supports_reasoning: false,
    reasoning_extraction_method: 'tag_based',
    reasoning_extraction_config: { "tag": "think" }
  });

  const [editConfig, setEditConfig] = useState<Partial<UpdateLLMConfigRequest>>({});

  // 自动清除通知
  React.useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

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
      supports_vision: false,
      supports_reasoning: false,
      reasoning_extraction_method: 'tag_based',
      reasoning_extraction_config: { "tag": "think" }
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
    setTestResult(null);
    try {
      const result = await testConfig(configId);
      setTestResult({
        configId,
        result,
        success: true
      });
      setShowTestResult(true);
      
      // 显示成功通知
      setNotification({
        type: 'success',
        message: t('settings.llm.testSuccessMessage', { 
          configName: llmConfigs.find(c => c.id === configId)?.name,
          latency: result.latency 
        })
      });
    } catch (error: any) {
      const errorMessage = error.message || t('settings.llm.testFailedMessage');
      setTestResult({
        configId,
        result: {
          latency: 0,
          status: 'failed',
          error_detail: errorMessage
        },
        success: false
      });
      setShowTestResult(true);
      
      // 显示错误通知
      setNotification({
        type: 'error',
        message: `${llmConfigs.find(c => c.id === configId)?.name} ${t('settings.llm.testFailedMessage')}`
      });
    } finally {
      setTestingConfigId(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircleIcon className="w-5 h-5 text-green-600" />;
      case 'auth_failed':
        return <AlertCircleIcon className="w-5 h-5 text-red-600" />;
      case 'connection_failed':
        return <WifiOffIcon className="w-5 h-5 text-red-600" />;
      case 'model_not_found':
        return <XIcon className="w-5 h-5 text-red-600" />;
      case 'rate_limited':
        return <ClockIcon className="w-5 h-5 text-orange-600" />;
      default:
        return <AlertCircleIcon className="w-5 h-5 text-red-600" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'connected':
        return t('settings.llm.connectionSuccess');
      case 'auth_failed':
        return t('settings.llm.authFailed');
      case 'connection_failed':
        return t('settings.llm.connectionFailed');
      case 'model_not_found':
        return t('settings.llm.modelNotFound');
      case 'rate_limited':
        return t('settings.llm.rateLimited');
      case 'failed':
        return t('settings.llm.testFailed');
      default:
        return t('settings.llm.unknownError');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'auth_failed':
      case 'connection_failed':
      case 'model_not_found':
      case 'failed':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'rate_limited':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
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
      supports_vision: config.supports_vision,
      supports_reasoning: config.supports_reasoning,
      reasoning_extraction_method: config.reasoning_extraction_method,
      reasoning_extraction_config: config.reasoning_extraction_config
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

  const renderReasoningConfig = (
    config: Partial<CreateLLMConfigRequest> | Partial<UpdateLLMConfigRequest>,
    setter: React.Dispatch<React.SetStateAction<any>>
  ) => {
    if (!config.supports_reasoning) return null;

    return (
      <div className="p-4 border rounded-md bg-gray-50 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">{t('settings.llm.reasoningExtractionMethod')}</label>
            <Select
              value={config.reasoning_extraction_method}
              onValueChange={(value: ReasoningExtractionMethod) => {
                const newExtractionConfig = value === 'tag_based' 
                  ? { tag: 'think' } 
                  : { field: 'reasoning_content' };
                setter({ ...config, reasoning_extraction_method: value, reasoning_extraction_config: newExtractionConfig });
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tag_based">{t('settings.llm.tagBased')}</SelectItem>
                <SelectItem value="json_field">{t('settings.llm.jsonField')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">{t('settings.llm.extractionConfig')}</label>
            {config.reasoning_extraction_method === 'tag_based' ? (
              <Input
                placeholder={t('settings.llm.tagNamePlaceholder')}
                value={config.reasoning_extraction_config?.tag || ''}
                onChange={(e) => setter({ ...config, reasoning_extraction_config: { tag: e.target.value } })}
              />
            ) : (
              <Input
                placeholder={t('settings.llm.fieldNamePlaceholder')}
                value={config.reasoning_extraction_config?.field || ''}
                onChange={(e) => setter({ ...config, reasoning_extraction_config: { field: e.target.value } })}
              />
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Toast通知 */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transition-all duration-300 border ${
          notification.type === 'success' 
            ? 'bg-green-50 border-green-200 text-green-800' 
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircleIcon className="w-5 h-5" />
            ) : (
              <AlertCircleIcon className="w-5 h-5" />
            )}
            <span className="font-medium">{notification.message}</span>
            <button
              onClick={() => setNotification(null)}
              className="ml-2 text-gray-500 hover:text-gray-700"
            >
              <XIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

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
        <div>
          <h3 className="text-lg font-semibold text-[#0c141c]">{t('settings.llm.modelConfigList')}</h3>
          <p className="text-sm text-[#4f7096] mt-1">
            {t('settings.llm.modelConfigDescription')}
          </p>
        </div>
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
            {t('settings.llm.refresh')}
          </Button>
          <Dialog open={isAddModelOpen} onOpenChange={setIsAddModelOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#1977e5] hover:bg-[#1462c4]">
                <PlusIcon className="w-4 h-4 mr-2" />
                {t('settings.llm.addModel')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{t('settings.llm.addNewModel')}</DialogTitle>
                <DialogDescription>
                  {t('settings.llm.addModelDescription')}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">{t('settings.llm.configName')}</label>
                    <Input
                      placeholder={t('settings.llm.configNamePlaceholder')}
                      value={newConfig.name || ''}
                      onChange={(e) => setNewConfig({...newConfig, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">{t('settings.llm.provider')}</label>
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
                            <span>{t('settings.llm.customInterface')}</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">{t('settings.llm.modelName')}</label>
                    <div className="space-y-2">
                      <Input
                        placeholder={t('settings.llm.modelNamePlaceholder')}
                        value={newConfig.model_name || ''}
                        onChange={(e) => setNewConfig({...newConfig, model_name: e.target.value})}
                      />
                      <div className="text-xs text-[#4f7096]">
                        {t('settings.llm.modelNameTip')}
                      </div>
                      {(() => {
                        const provider = MODEL_PROVIDERS.find(p => p.type === newConfig.provider);
                        return provider?.models.length ? (
                          <details className="text-xs">
                            <summary className="cursor-pointer text-[#1977e5] hover:underline">
                              {t('settings.llm.viewSupportedModels')}
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
                    <label className="block text-sm font-medium mb-2">{t('settings.llm.apiKeyLabel')}</label>
                    <Input
                      type="password"
                      placeholder="sk-..."
                      value={newConfig.api_key || ''}
                      onChange={(e) => setNewConfig({...newConfig, api_key: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">{t('settings.llm.apiUrlLabel')}</label>
                  <Input
                    placeholder="https://api.example.com/v1"
                    value={newConfig.base_url || ''}
                    onChange={(e) => setNewConfig({...newConfig, base_url: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">{t('settings.llm.temperatureParam')}</label>
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
                    <label className="block text-sm font-medium mb-2">{t('settings.llm.maxTokensParam')}</label>
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
                    <label className="text-sm font-medium">{t('settings.llm.enableConfig')}</label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={newConfig.supports_vision || false}
                      onCheckedChange={(checked: boolean) => setNewConfig({...newConfig, supports_vision: checked})}
                    />
                    <div className="flex items-center space-x-2">
                      <label className="text-sm font-medium">{t('settings.llm.visionSupport')}</label>
                      <InfoIcon className="w-4 h-4 text-[#4f7096]" />
                    </div>
                  </div>
                  <div className="text-xs text-[#4f7096] ml-6">
                    {t('settings.llm.visionSupportTip')}
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={newConfig.supports_reasoning || false}
                      onCheckedChange={(checked: boolean) => setNewConfig({...newConfig, supports_reasoning: checked})}
                    />
                    <div className="flex items-center space-x-2">
                      <label className="text-sm font-medium">{t('settings.llm.reasoningSupport')}</label>
                      <BrainCircuitIcon className="w-4 h-4 text-[#4f7096]" />
                    </div>
                  </div>
                  <div className="text-xs text-[#4f7096] ml-6">
                    {t('settings.llm.reasoningSupportTip')}
                  </div>
                  {renderReasoningConfig(newConfig, setNewConfig)}
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddModelOpen(false)}>
                  {t('settings.llm.cancel')}
                </Button>
                <Button onClick={handleAddModel}>
                  {t('settings.llm.confirm')}
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
            <DialogTitle>{t('settings.llm.editModel')}</DialogTitle>
            <DialogDescription>
              {t('settings.llm.editModelDescription')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">{t('settings.llm.configName')}</label>
                <Input
                  placeholder={t('settings.llm.configNamePlaceholder')}
                  value={editConfig.name || ''}
                  onChange={(e) => setEditConfig({...editConfig, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">{t('settings.llm.modelName')}</label>
                <Input
                  placeholder={t('settings.llm.modelNamePlaceholder')}
                  value={editConfig.model_name || ''}
                  onChange={(e) => setEditConfig({...editConfig, model_name: e.target.value})}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">{t('settings.llm.apiKeyLabel')}</label>
              <Input
                type="password"
                placeholder="sk-..."
                value={editConfig.api_key || ''}
                onChange={(e) => setEditConfig({...editConfig, api_key: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">{t('settings.llm.apiUrlLabel')}</label>
              <Input
                placeholder="https://api.example.com/v1"
                value={editConfig.base_url || ''}
                onChange={(e) => setEditConfig({...editConfig, base_url: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">{t('settings.llm.temperatureParam')}</label>
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
                <label className="block text-sm font-medium mb-2">{t('settings.llm.maxTokensParam')}</label>
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
                <label className="text-sm font-medium">{t('settings.llm.enableConfig')}</label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  checked={editConfig.supports_vision ?? false}
                  onCheckedChange={(checked: boolean) => setEditConfig({...editConfig, supports_vision: checked})}
                />
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium">{t('settings.llm.visionSupport')}</label>
                  <InfoIcon className="w-4 h-4 text-[#4f7096]" />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={editConfig.supports_reasoning ?? false}
                  onCheckedChange={(checked: boolean) => setEditConfig({...editConfig, supports_reasoning: checked})}
                />
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium">{t('settings.llm.reasoningSupport')}</label>
                  <BrainCircuitIcon className="w-4 h-4 text-[#4f7096]" />
                </div>
              </div>
              {renderReasoningConfig(editConfig, setEditConfig)}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingConfig(null)}>
              {t('settings.llm.cancel')}
            </Button>
            <Button onClick={handleEditModel}>
              {t('settings.llm.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog open={showDeleteDialog} onOpenChange={(open: boolean) => !open && closeDeleteDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('settings.llm.confirmDelete')}</DialogTitle>
            <DialogDescription>
              {t('settings.llm.deleteDescription')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={closeDeleteDialog}>
              {t('settings.llm.cancel')}
            </Button>
            <Button onClick={handleDeleteConfig} className="bg-red-600 hover:bg-red-700 text-white">
              {t('settings.llm.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 测试结果对话框 */}
      <Dialog open={showTestResult} onOpenChange={setShowTestResult}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {testResult && getStatusIcon(testResult.result.status)}
              {t('settings.llm.testResult')}
            </DialogTitle>
            <DialogDescription>
              {testResult && t('settings.llm.testResult')}
            </DialogDescription>
          </DialogHeader>
          
          {testResult && (
            <div className="space-y-4 py-4">
              {/* 状态概览 */}
              <div className={`p-4 rounded-lg border ${getStatusColor(testResult.result.status)}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(testResult.result.status)}
                    <span className="font-medium">{getStatusText(testResult.result.status)}</span>
                  </div>
                  {testResult.success && (
                    <div className="flex items-center gap-2 text-sm">
                      <WifiIcon className="w-4 h-4" />
                      <span>{testResult.result.latency}ms</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 详细信息 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">{t('settings.llm.responseLatency')}</label>
                  <div className="text-lg font-mono">
                    {testResult.result.latency}ms
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('settings.llm.testTime')}</label>
                  <div className="text-sm text-gray-600">
                    {testResult.result.test_time ? 
                      new Date(testResult.result.test_time).toLocaleString('zh-CN') : 
                      t('common.justNow')
                    }
                  </div>
                </div>
              </div>

              {/* 模型信息 */}
              {testResult.result.model_info && (
                <div>
                  <label className="block text-sm font-medium mb-2">{t('settings.llm.modelInfo')}</label>
                  <div className="bg-gray-50 p-3 rounded border space-y-2">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">{t('settings.llm.provider')}:</span>
                        <span className="ml-2 font-medium">{testResult.result.model_info.provider}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">{t('settings.llm.model')}:</span>
                        <span className="ml-2 font-medium">{testResult.result.model_info.model}</span>
                      </div>
                    </div>
                    {testResult.result.model_info.response_preview && (
                      <div>
                        <span className="text-gray-600 text-sm">{t('settings.llm.responsePreview')}:</span>
                        <div className="mt-1 p-2 bg-white border rounded text-sm italic">
                          "{testResult.result.model_info.response_preview}"
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 错误详情 */}
              {!testResult.success && testResult.result.error_detail && (
                <div>
                  <label className="block text-sm font-medium mb-2">{t('settings.llm.errorDetails')}</label>
                  <div className="bg-red-50 p-3 rounded border border-red-200">
                    <code className="text-sm text-red-800">
                      {testResult.result.error_detail}
                    </code>
                  </div>
                </div>
              )}

              {/* 建议 */}
              {!testResult.success && (
                <div className="bg-blue-50 p-4 rounded border border-blue-200">
                  <div className="flex items-start gap-2">
                    <InfoIcon className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-900 mb-1">{t('settings.llm.suggestedSolutions')}</h4>
                      <ul className="text-sm text-blue-800 space-y-1">
                        {testResult.result.status === 'auth_failed' && 
                          t('settings.llm.authFailedTips', { returnObjects: true }).map((tip: string, index: number) => (
                            <li key={index}>• {tip}</li>
                          ))
                        }
                        {testResult.result.status === 'connection_failed' && 
                          t('settings.llm.connectionFailedTips', { returnObjects: true }).map((tip: string, index: number) => (
                            <li key={index}>• {tip}</li>
                          ))
                        }
                        {testResult.result.status === 'model_not_found' && 
                          t('settings.llm.modelNotFoundTips', { returnObjects: true }).map((tip: string, index: number) => (
                            <li key={index}>• {tip}</li>
                          ))
                        }
                        {testResult.result.status === 'rate_limited' && 
                          t('settings.llm.rateLimitedTips', { returnObjects: true }).map((tip: string, index: number) => (
                            <li key={index}>• {tip}</li>
                          ))
                        }
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTestResult(false)}>
              {t('settings.llm.close')}
            </Button>
            {testResult && (
              <Button onClick={() => handleTestConfig(testResult.configId)} disabled={testingConfigId === testResult.configId}>
                {testingConfigId === testResult.configId ? (
                  <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <PlayIcon className="w-4 h-4 mr-2" />
                )}
                {t('settings.llm.retestConnection')}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 模型配置列表 */}
      <div className="space-y-4">
        {configsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2Icon className="w-6 h-6 animate-spin mr-2" />
            <span>{t('settings.llm.loading')}</span>
          </div>
        ) : llmConfigs.length === 0 ? (
          <div className="text-center py-8 text-[#4f7096]">
            {t('settings.llm.noConfigs')}
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
                          {t('settings.llm.defaultLabel')}
                        </Badge>
                      )}
                      {config.supports_vision && (
                        <Badge variant="outline" className="border-green-500 text-green-700 bg-green-50">
                          <InfoIcon className="w-3 h-3 mr-1" />
                          {t('settings.llm.visionSupportLabel')}
                        </Badge>
                      )}
                      {config.supports_reasoning && (
                        <Badge variant="outline" className="border-purple-500 text-purple-700 bg-purple-50">
                          <BrainCircuitIcon className="w-3 h-3 mr-1" />
                          {t('settings.llm.reasoningSupportLabel')}
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
                    title="测试LLM连接并验证配置是否正确"
                  >
                    {testingConfigId === config.id ? (
                      <Loader2Icon className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <PlayIcon className="w-4 h-4 mr-1" />
                    )}
                    {t('settings.llm.test')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSetDefault(config.id)}
                    disabled={config.is_default}
                  >
                    <ShieldCheckIcon className="w-4 h-4 mr-1" />
                    {config.is_default ? t('settings.llm.defaultConfig') : t('settings.llm.setDefault')}
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
                  <span className="text-[#4f7096]">{t('settings.llm.apiUrl')}</span>
                  <div className="text-[#0c141c] font-medium truncate">
                    {config.base_url}
                  </div>
                </div>
                <div>
                  <span className="text-[#4f7096]">{t('settings.llm.temperature')}</span>
                  <div className="text-[#0c141c] font-medium">{config.temperature}</div>
                </div>
                <div>
                  <span className="text-[#4f7096]">{t('settings.llm.maxTokens')}</span>
                  <div className="text-[#0c141c] font-medium">{config.max_tokens}</div>
                </div>
                <div>
                  <span className="text-[#4f7096]">{t('settings.llm.visionSupportStatus')}</span>
                  <div className="flex items-center gap-1">
                    {config.supports_vision ? (
                      <>
                        <CheckIcon className="w-4 h-4 text-green-600" />
                        <span className="text-green-600 font-medium">{t('settings.llm.support')}</span>
                      </>
                    ) : (
                      <>
                        <XIcon className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-500 font-medium">{t('settings.llm.notSupport')}</span>
                      </>
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-[#4f7096]">{t('settings.llm.status')}</span>
                  <div className={`font-medium ${config.is_active ? 'text-green-600' : 'text-gray-500'}`}>
                    {config.is_active ? t('settings.llm.enabled') : t('settings.llm.disabled')}
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