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
  DownloadIcon,
  SearchIcon,
  TrashIcon,
  FilterIcon,
  SaveIcon,
  KeyIcon,
  ServerIcon,
  ThermometerIcon,
  HashIcon,
  PlusIcon,
  MoreVerticalIcon,
  PencilIcon
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";

interface Log {
  timestamp: string;
  level: 'error' | 'warn' | 'info' | 'debug';
  message: string;
  source: string;
}

interface LLMConfig {
  id: string;
  name: string;
  modelType: string;
  modelPath: string;
  temperature: number;
  apiKey: string;
  apiEndpoint: string;
  isActive: boolean;
}

export const Settings = (): JSX.Element => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [selectedModelId, setSelectedModelId] = useState<string>('1');

  const [llmConfigs] = useState<LLMConfig[]>([
    {
      id: '1',
      name: 'LLaMA-2 7B',
      modelType: 'LLaMA-2',
      modelPath: '/models/llama-2-7b',
      temperature: 0.7,
      apiKey: 'sk-...',
      apiEndpoint: 'https://api.example.com/v1',
      isActive: true
    },
    {
      id: '2',
      name: 'LLaMA-2 13B',
      modelType: 'LLaMA-2',
      modelPath: '/models/llama-2-13b',
      temperature: 0.8,
      apiKey: 'sk-...',
      apiEndpoint: 'https://api.example.com/v1',
      isActive: false
    }
  ]);

  const [logs] = useState<Log[]>([
    {
      timestamp: '2024-03-15 10:30:00',
      level: 'info',
      message: 'System started successfully',
      source: 'System'
    },
    {
      timestamp: '2024-03-15 10:31:00',
      level: 'warn',
      message: 'High memory usage detected',
      source: 'Monitor'
    },
    {
      timestamp: '2024-03-15 10:32:00',
      level: 'error',
      message: 'Failed to connect to external API',
      source: 'API'
    },
    {
      timestamp: '2024-03-15 10:33:00',
      level: 'debug',
      message: 'Processing batch job #1234',
      source: 'TaskRunner'
    }
  ]);

  const selectedModel = llmConfigs.find(config => config.id === selectedModelId);

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'text-red-600 bg-red-50';
      case 'warn':
        return 'text-yellow-600 bg-yellow-50';
      case 'info':
        return 'text-blue-600 bg-blue-50';
      case 'debug':
        return 'text-gray-600 bg-gray-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         log.source.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLevel = selectedLevel === 'all' || log.level === selectedLevel;
    return matchesSearch && matchesLevel;
  });

  return (
    <div className="w-full max-w-[1200px] p-6">
      <div className="mb-6">
        <h2 className="text-[22px] font-bold leading-7 text-[#0c141c]">
          {t('navigation.settings')}
        </h2>
      </div>

      <Tabs defaultValue="llm" className="w-full">
        <TabsList className="border-b border-[#d1dbe8] w-full justify-start h-auto p-0 bg-transparent">
          <TabsTrigger
            value="llm"
            className="px-4 py-2 data-[state=active]:border-b-2 data-[state=active]:border-[#1977e5] rounded-none bg-transparent"
          >
            {t('settings.llmConfig')}
          </TabsTrigger>
          <TabsTrigger
            value="logs"
            className="px-4 py-2 data-[state=active]:border-b-2 data-[state=active]:border-[#1977e5] rounded-none bg-transparent"
          >
            {t('settings.logs')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="llm" className="mt-6">
          <Card className="border-[#d1dbe8] p-6">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-4">
                <select
                  className="border border-[#d1dbe8] rounded-md px-3 py-2"
                  value={selectedModelId}
                  onChange={(e) => setSelectedModelId(e.target.value)}
                >
                  {llmConfigs.map(config => (
                    <option key={config.id} value={config.id}>
                      {config.name} {config.isActive ? '(Active)' : ''}
                    </option>
                  ))}
                </select>
                <Button
                  variant="outline"
                  className="border-[#d1dbe8]"
                  onClick={() => {/* Handle new model */}}
                >
                  <PlusIcon className="w-4 h-4 mr-2" />
                  Add Model
                </Button>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <MoreVerticalIcon className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <PencilIcon className="mr-2 h-4 w-4" />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-red-600">
                    <TrashIcon className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {selectedModel && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">{t('settings.modelSettings')}</h3>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-4 bg-[#f7f9fc] rounded-lg">
                      <HashIcon className="w-5 h-5 text-[#4f7096]" />
                      <div className="flex-1">
                        <label className="block text-sm font-medium mb-1">{t('settings.modelType')}</label>
                        <Input className="border-[#d1dbe8]" defaultValue={selectedModel.modelType} />
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-4 bg-[#f7f9fc] rounded-lg">
                      <ServerIcon className="w-5 h-5 text-[#4f7096]" />
                      <div className="flex-1">
                        <label className="block text-sm font-medium mb-1">{t('settings.modelPath')}</label>
                        <Input className="border-[#d1dbe8]" defaultValue={selectedModel.modelPath} />
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-4 bg-[#f7f9fc] rounded-lg">
                      <ThermometerIcon className="w-5 h-5 text-[#4f7096]" />
                      <div className="flex-1">
                        <label className="block text-sm font-medium mb-1">{t('settings.temperature')}</label>
                        <Input type="number" className="border-[#d1dbe8]" defaultValue={selectedModel.temperature} />
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4">{t('settings.apiSettings')}</h3>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-4 bg-[#f7f9fc] rounded-lg">
                      <KeyIcon className="w-5 h-5 text-[#4f7096]" />
                      <div className="flex-1">
                        <label className="block text-sm font-medium mb-1">{t('settings.apiKey')}</label>
                        <Input type="password" className="border-[#d1dbe8]" defaultValue={selectedModel.apiKey} />
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-4 bg-[#f7f9fc] rounded-lg">
                      <ServerIcon className="w-5 h-5 text-[#4f7096]" />
                      <div className="flex-1">
                        <label className="block text-sm font-medium mb-1">{t('settings.apiEndpoint')}</label>
                        <Input className="border-[#d1dbe8]" defaultValue={selectedModel.apiEndpoint} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  {!selectedModel.isActive && (
                    <Button variant="outline\" className="border-[#d1dbe8]">
                      Set as Active
                    </Button>
                  )}
                  <Button className="bg-[#1977e5] hover:bg-[#1977e5]/90">
                    <SaveIcon className="w-4 h-4 mr-2" />
                    {t('settings.save')}
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="mt-6">
          <Card className="border-[#d1dbe8] p-6">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <SearchIcon className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-[#4f7096]" />
                  <Input
                    className="pl-9 border-[#d1dbe8]"
                    placeholder={t('settings.searchLogs')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <FilterIcon className="w-4 h-4 text-[#4f7096]" />
                  <select
                    className="border border-[#d1dbe8] rounded-md px-3 py-2"
                    value={selectedLevel}
                    onChange={(e) => setSelectedLevel(e.target.value)}
                  >
                    <option value="all">All Levels</option>
                    <option value="error">{t('settings.logLevels.error')}</option>
                    <option value="warn">{t('settings.logLevels.warn')}</option>
                    <option value="info">{t('settings.logLevels.info')}</option>
                    <option value="debug">{t('settings.logLevels.debug')}</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="border-[#d1dbe8]">
                  <DownloadIcon className="w-4 h-4 mr-2" />
                  {t('settings.downloadLogs')}
                </Button>
                <Button variant="outline" className="border-[#d1dbe8] text-red-600 hover:text-red-700 hover:bg-red-50">
                  <TrashIcon className="w-4 h-4 mr-2" />
                  {t('settings.clearLogs')}
                </Button>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow className="border-[#d1dbe8] hover:bg-transparent">
                  <TableHead className="text-[#4f7096] font-medium">{t('settings.timestamp')}</TableHead>
                  <TableHead className="text-[#4f7096] font-medium w-[100px]">{t('settings.level')}</TableHead>
                  <TableHead className="text-[#4f7096] font-medium">{t('settings.message')}</TableHead>
                  <TableHead className="text-[#4f7096] font-medium w-[120px]">{t('settings.source')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log, index) => (
                  <TableRow key={index} className="border-[#d1dbe8]">
                    <TableCell className="text-[#4f7096]">{log.timestamp}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getLevelColor(log.level)}`}>
                        {t(`settings.logLevels.${log.level}`)}
                      </span>
                    </TableCell>
                    <TableCell>{log.message}</TableCell>
                    <TableCell className="text-[#4f7096]">{log.source}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};