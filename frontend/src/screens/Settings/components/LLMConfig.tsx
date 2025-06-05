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
  WifiOffIcon
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
import { type LLMConfig, ProviderType, CreateLLMConfigRequest, UpdateLLMConfigRequest, ModelProvider, TestConfigResponse } from '../../../types/llm';

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
    supports_vision: false
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
        message: `${llmConfigs.find(c => c.id === configId)?.name} 连接测试成功！延迟: ${result.latency}ms`
      });
    } catch (error: any) {
      const errorMessage = error.message || '测试连接失败';
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
        message: `${llmConfigs.find(c => c.id === configId)?.name} 连接测试失败`
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
        return '连接成功';
      case 'auth_failed':
        return 'API密钥认证失败';
      case 'connection_failed':
        return '连接失败';
      case 'model_not_found':
        return '模型不存在';
      case 'rate_limited':
        return '请求频率超限';
      case 'failed':
        return '测试失败';
      default:
        return '未知错误';
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
          <h3 className="text-lg font-semibold text-[#0c141c]">模型配置列表</h3>
          <p className="text-sm text-[#4f7096] mt-1">
            管理您的大语言模型配置。点击"测试"按钮可以验证配置是否正确，系统会发送测试请求并显示详细结果。
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

      {/* 测试结果对话框 */}
      <Dialog open={showTestResult} onOpenChange={setShowTestResult}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {testResult && getStatusIcon(testResult.result.status)}
              连接测试结果
            </DialogTitle>
            <DialogDescription>
              {testResult && `配置 "${llmConfigs.find(c => c.id === testResult.configId)?.name}" 的测试结果`}
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
                  <label className="block text-sm font-medium mb-1">响应延迟</label>
                  <div className="text-lg font-mono">
                    {testResult.result.latency}ms
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">测试时间</label>
                  <div className="text-sm text-gray-600">
                    {testResult.result.test_time ? 
                      new Date(testResult.result.test_time).toLocaleString('zh-CN') : 
                      '刚刚'
                    }
                  </div>
                </div>
              </div>

              {/* 模型信息 */}
              {testResult.result.model_info && (
                <div>
                  <label className="block text-sm font-medium mb-2">模型信息</label>
                  <div className="bg-gray-50 p-3 rounded border space-y-2">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">提供商:</span>
                        <span className="ml-2 font-medium">{testResult.result.model_info.provider}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">模型:</span>
                        <span className="ml-2 font-medium">{testResult.result.model_info.model}</span>
                      </div>
                    </div>
                    {testResult.result.model_info.response_preview && (
                      <div>
                        <span className="text-gray-600 text-sm">响应预览:</span>
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
                  <label className="block text-sm font-medium mb-2">错误详情</label>
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
                      <h4 className="font-medium text-blue-900 mb-1">解决建议</h4>
                      <ul className="text-sm text-blue-800 space-y-1">
                        {testResult.result.status === 'auth_failed' && (
                          <>
                            <li>• 检查API密钥是否正确且有效</li>
                            <li>• 确认API密钥具有所需权限</li>
                          </>
                        )}
                        {testResult.result.status === 'connection_failed' && (
                          <>
                            <li>• 检查网络连接是否正常</li>
                            <li>• 确认API接口地址是否正确</li>
                            <li>• 检查防火墙设置</li>
                          </>
                        )}
                        {testResult.result.status === 'model_not_found' && (
                          <>
                            <li>• 确认模型名称是否正确</li>
                            <li>• 检查是否有该模型的访问权限</li>
                          </>
                        )}
                        {testResult.result.status === 'rate_limited' && (
                          <>
                            <li>• 稍后重试</li>
                            <li>• 检查API调用频率限制</li>
                          </>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTestResult(false)}>
              关闭
            </Button>
            {testResult && (
              <Button onClick={() => handleTestConfig(testResult.configId)} disabled={testingConfigId === testResult.configId}>
                {testingConfigId === testResult.configId ? (
                  <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <PlayIcon className="w-4 h-4 mr-2" />
                )}
                重新测试
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
                    title="测试LLM连接并验证配置是否正确"
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