import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Switch } from "../../components/ui/switch";
import { Badge } from "../../components/ui/badge";
import {
  DownloadIcon,
  SearchIcon,
  TrashIcon,
  FilterIcon,
  SaveIcon,
  KeyIcon,
  ServerIcon,
  ThermometerIcon,
  PlusIcon,
  EditIcon,
  CheckIcon,
  XIcon,
  BrainIcon,
  SettingsIcon,
  ShieldCheckIcon,
  AlertCircleIcon,
  InfoIcon,
  PlayIcon,
  PauseIcon,
  RefreshCwIcon
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/dialog";
import { Textarea } from "../../components/ui/textarea";

interface Log {
  id: string;
  timestamp: string;
  level: 'error' | 'warn' | 'info' | 'debug';
  message: string;
  source: string;
  details?: string;
}

interface ModelProvider {
  id: string;
  name: string;
  type: 'openai' | 'claude' | 'gemini' | 'custom';
  icon: string;
  baseUrl?: string;
  models: string[];
}

interface LLMConfig {
  id: string;
  name: string;
  provider: ModelProvider;
  model: string;
  apiKey: string;
  baseUrl?: string;
  temperature: number;
  maxTokens: number;
  isActive: boolean;
  isDefault: boolean;
  customHeaders?: Record<string, string>;
}

const MODEL_PROVIDERS: ModelProvider[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    type: 'openai',
    icon: '🤖',
    baseUrl: 'https://api.openai.com/v1',
    models: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo', 'gpt-3.5-turbo-16k']
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

export const Settings = (): JSX.Element => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [isAddModelOpen, setIsAddModelOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<string | null>(null);
  const [isLogPaused, setIsLogPaused] = useState(false);

  const [llmConfigs, setLlmConfigs] = useState<LLMConfig[]>([
    {
      id: '1',
      name: 'GPT-4 主配置',
      provider: MODEL_PROVIDERS[0],
      model: 'gpt-4',
      apiKey: 'sk-***',
      temperature: 0.7,
      maxTokens: 4096,
      isActive: true,
      isDefault: true
    },
    {
      id: '2',
      name: 'Claude-3 辅助配置',
      provider: MODEL_PROVIDERS[1],
      model: 'claude-3-sonnet-20240229',
      apiKey: 'sk-ant-***',
      temperature: 0.8,
      maxTokens: 4096,
      isActive: true,
      isDefault: false
    }
  ]);

  const [newConfig, setNewConfig] = useState<Partial<LLMConfig>>({
    name: '',
    provider: MODEL_PROVIDERS[0],
    model: '',
    apiKey: '',
    baseUrl: '',
    temperature: 0.7,
    maxTokens: 4096,
    isActive: true,
    isDefault: false
  });

  const [logs] = useState<Log[]>([
    {
      id: '1',
      timestamp: '2024-03-15 10:30:00',
      level: 'info',
      message: '系统启动成功',
      source: 'System',
      details: '所有核心模块已加载完成'
    },
    {
      id: '2',
      timestamp: '2024-03-15 10:31:00',
      level: 'warn',
      message: '检测到高内存使用',
      source: 'Monitor',
      details: '当前内存使用率: 87%'
    },
    {
      id: '3',
      timestamp: '2024-03-15 10:32:00',
      level: 'error',
      message: '连接外部API失败',
      source: 'API',
      details: 'Connection timeout after 30 seconds'
    },
    {
      id: '4',
      timestamp: '2024-03-15 10:33:00',
      level: 'debug',
      message: '正在处理批量任务 #1234',
      source: 'TaskRunner',
      details: 'Processing 150 items in queue'
    },
    {
      id: '5',
      timestamp: '2024-03-15 10:34:00',
      level: 'info',
      message: 'GPT-4 模型调用成功',
      source: 'LLM',
      details: 'Response time: 2.3s, Tokens: 1024'
    }
  ]);

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'warn':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'info':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'debug':
        return 'text-gray-600 bg-gray-50 border-gray-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error':
        return <AlertCircleIcon className="w-4 h-4" />;
      case 'warn':
        return <AlertCircleIcon className="w-4 h-4" />;
      case 'info':
        return <InfoIcon className="w-4 h-4" />;
      case 'debug':
        return <InfoIcon className="w-4 h-4" />;
      default:
        return <InfoIcon className="w-4 h-4" />;
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         log.source.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLevel = selectedLevel === 'all' || log.level === selectedLevel;
    return matchesSearch && matchesLevel;
  });

  const handleAddModel = () => {
    if (newConfig.name && newConfig.model && newConfig.apiKey) {
      const config: LLMConfig = {
        id: Date.now().toString(),
        name: newConfig.name!,
        provider: newConfig.provider!,
        model: newConfig.model!,
        apiKey: newConfig.apiKey!,
        baseUrl: newConfig.baseUrl || newConfig.provider!.baseUrl,
        temperature: newConfig.temperature!,
        maxTokens: newConfig.maxTokens!,
        isActive: newConfig.isActive!,
        isDefault: false
      };
      setLlmConfigs([...llmConfigs, config]);
      setNewConfig({
        name: '',
        provider: MODEL_PROVIDERS[0],
        model: '',
        apiKey: '',
        baseUrl: '',
        temperature: 0.7,
        maxTokens: 4096,
        isActive: true,
        isDefault: false
      });
      setIsAddModelOpen(false);
    }
  };

  const handleSetDefault = (configId: string) => {
    setLlmConfigs(configs => 
      configs.map(config => ({
        ...config,
        isDefault: config.id === configId
      }))
    );
  };

  const handleToggleActive = (configId: string) => {
    setLlmConfigs(configs => 
      configs.map(config => 
        config.id === configId 
          ? { ...config, isActive: !config.isActive }
          : config
      )
    );
  };

  const handleDeleteConfig = (configId: string) => {
    setLlmConfigs(configs => configs.filter(config => config.id !== configId));
  };

  return (
    <div className="w-full max-w-[1200px] p-6">
      <div className="mb-6">
        <h2 className="text-[22px] font-bold leading-7 text-[#0c141c]">
          系统设置
        </h2>
        <p className="text-[#4f7096] mt-1">管理大模型配置和查看系统日志</p>
      </div>

      <Tabs defaultValue="llm" className="w-full">
        <TabsList className="border-b border-[#d1dbe8] w-full justify-start h-auto p-0 bg-transparent">
          <TabsTrigger
            value="llm"
            className="px-4 py-3 data-[state=active]:border-b-2 data-[state=active]:border-[#1977e5] rounded-none bg-transparent"
          >
            <BrainIcon className="w-4 h-4 mr-2" />
            大模型配置
          </TabsTrigger>
          <TabsTrigger
            value="logs"
            className="px-4 py-3 data-[state=active]:border-b-2 data-[state=active]:border-[#1977e5] rounded-none bg-transparent"
          >
            <ServerIcon className="w-4 h-4 mr-2" />
            系统日志
          </TabsTrigger>
        </TabsList>

        <TabsContent value="llm" className="mt-6">
          <div className="space-y-6">
            {/* 添加模型按钮 */}
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-[#0c141c]">模型配置列表</h3>
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
                          value={newConfig.provider?.id || MODEL_PROVIDERS[0].id}
                          onValueChange={(value: string) => {
                            const provider = MODEL_PROVIDERS.find(p => p.id === value) || MODEL_PROVIDERS[0];
                            setNewConfig({
                              ...newConfig,
                              provider,
                              model: '',
                              baseUrl: provider.baseUrl
                            });
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {MODEL_PROVIDERS.map(provider => (
                              <SelectItem key={provider.id} value={provider.id}>
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
                        <Select
                          value={newConfig.model || ''}
                          onValueChange={(value: string) => setNewConfig({...newConfig, model: value})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="选择模型" />
                          </SelectTrigger>
                          <SelectContent>
                            {(newConfig.provider?.models || []).map(model => (
                              <SelectItem key={model} value={model}>
                                {model}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">API密钥</label>
                        <Input
                          type="password"
                          placeholder="sk-..."
                          value={newConfig.apiKey || ''}
                          onChange={(e) => setNewConfig({...newConfig, apiKey: e.target.value})}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">API接口地址</label>
                      <Input
                        placeholder="https://api.example.com/v1"
                        value={newConfig.baseUrl || ''}
                        onChange={(e) => setNewConfig({...newConfig, baseUrl: e.target.value})}
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
                          max="32768"
                          value={newConfig.maxTokens || 4096}
                          onChange={(e) => setNewConfig({...newConfig, maxTokens: parseInt(e.target.value)})}
                        />
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={newConfig.isActive || true}
                        onCheckedChange={(checked: boolean) => setNewConfig({...newConfig, isActive: checked})}
                      />
                      <label className="text-sm font-medium">启用此配置</label>
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

            {/* 模型配置列表 */}
            <div className="space-y-4">
              {llmConfigs.map(config => (
                <Card key={config.id} className="border-[#d1dbe8] p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">{config.provider.icon}</div>
                      <div>
                        <h4 className="font-semibold text-[#0c141c] flex items-center gap-2">
                          {config.name}
                          {config.isDefault && (
                            <Badge variant="default" className="bg-[#1977e5]">
                              默认
                            </Badge>
                          )}
                        </h4>
                        <p className="text-sm text-[#4f7096]">
                          {config.provider.name} · {config.model}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={config.isActive}
                        onCheckedChange={() => handleToggleActive(config.id)}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetDefault(config.id)}
                        disabled={config.isDefault}
                      >
                        <ShieldCheckIcon className="w-4 h-4 mr-1" />
                        {config.isDefault ? '默认配置' : '设为默认'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingConfig(config.id)}
                      >
                        <EditIcon className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteConfig(config.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-[#4f7096]">API地址</span>
                      <div className="text-[#0c141c] font-medium truncate">
                        {config.baseUrl || config.provider.baseUrl}
                      </div>
                    </div>
                    <div>
                      <span className="text-[#4f7096]">温度</span>
                      <div className="text-[#0c141c] font-medium">{config.temperature}</div>
                    </div>
                    <div>
                      <span className="text-[#4f7096]">最大Token</span>
                      <div className="text-[#0c141c] font-medium">{config.maxTokens}</div>
                    </div>
                    <div>
                      <span className="text-[#4f7096]">状态</span>
                      <div className={`font-medium ${config.isActive ? 'text-green-600' : 'text-gray-500'}`}>
                        {config.isActive ? '已启用' : '已禁用'}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="logs" className="mt-6">
          <Card className="border-[#d1dbe8]">
            <div className="p-6 border-b border-[#d1dbe8]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-[#0c141c]">系统日志</h3>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsLogPaused(!isLogPaused)}
                    className="border-[#d1dbe8]"
                  >
                    {isLogPaused ? (
                      <>
                        <PlayIcon className="w-4 h-4 mr-2" />
                        恢复
                      </>
                    ) : (
                      <>
                        <PauseIcon className="w-4 h-4 mr-2" />
                        暂停
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-[#d1dbe8]"
                  >
                    <RefreshCwIcon className="w-4 h-4 mr-2" />
                    刷新
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-[#d1dbe8]"
                  >
                    <DownloadIcon className="w-4 h-4 mr-2" />
                    导出
                  </Button>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#4f7096] w-4 h-4" />
                    <Input
                      placeholder="搜索日志..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 border-[#d1dbe8]"
                    />
                  </div>
                </div>
                
                <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部级别</SelectItem>
                    <SelectItem value="error">错误</SelectItem>
                    <SelectItem value="warn">警告</SelectItem>
                    <SelectItem value="info">信息</SelectItem>
                    <SelectItem value="debug">调试</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="p-6">
              <div className="space-y-3">
                {filteredLogs.map(log => (
                  <div key={log.id} className={`p-4 rounded-lg border ${getLevelColor(log.level)}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="flex items-center gap-2 mt-0.5">
                          {getLevelIcon(log.level)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{log.message}</span>
                            <Badge variant="outline" className="text-xs">
                              {log.source}
                            </Badge>
                          </div>
                          {log.details && (
                            <p className="text-sm opacity-80 mb-2">{log.details}</p>
                          )}
                          <p className="text-xs opacity-60">{log.timestamp}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {filteredLogs.length === 0 && (
                <div className="text-center py-8 text-[#4f7096]">
                  没有找到匹配的日志记录
                </div>
              )}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};