import React from 'react';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Badge } from "../../components/ui/badge";
import {
  BrainIcon,
  ServerIcon,
  AlertCircleIcon
} from 'lucide-react';
import { LLMConfigComponent } from './components/LLMConfig';
import { SystemLogs } from './components/SystemLogs';
import { useSystemLogs } from '../../hooks/useSystemLogs';

export const Settings = (): JSX.Element => {
  const { t } = useTranslation();
  
  // 获取系统日志统计，用于显示错误数量标记
  const { stats } = useSystemLogs();

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
            {stats && stats.recent_errors > 0 && (
              <Badge variant="destructive" className="ml-2 text-xs">
                {stats.recent_errors}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="llm" className="mt-6">
          <LLMConfigComponent />
        </TabsContent>

        <TabsContent value="logs" className="mt-6">
          <SystemLogs />
        </TabsContent>
      </Tabs>
    </div>
  );
};