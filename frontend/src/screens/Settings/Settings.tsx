import React from 'react';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Badge } from "../../components/ui/badge";
import {
  Brain,
  Server,
  AlertCircle,
  User,
  Shield,
  Users
} from 'lucide-react';
import { LLMConfigComponent } from './components/LLMConfig';
import { SystemLogs } from './components/SystemLogs';
import { UserProfile, SessionManagement, UserAdministration } from './components';
import { useSystemLogs } from '../../hooks/useSystemLogs';
import { useAuthStore } from '../../store/authStore';

export const Settings = (): JSX.Element => {
  const { t } = useTranslation();
  
  // 获取系统日志统计，用于显示错误数量标记
  const { stats } = useSystemLogs();
  
  // 获取用户信息和权限
  const { isAuthenticated, hasPermission } = useAuthStore();
  
  // 检查是否有管理员权限
  const isAdmin = hasPermission('user.manage') || hasPermission('system.manage');

  return (
    <div className="w-full max-w-[1200px] p-6">
      <div className="mb-6">
        <h2 className="text-[22px] font-bold leading-7 text-[#0c141c]">
          {t('settings.title')}
        </h2>
        <p className="text-[#4f7096] mt-1">{t('settings.description')}</p>
      </div>



      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="border-b border-[#d1dbe8] w-full justify-start h-auto p-0 bg-transparent">
          {isAuthenticated && (
            <TabsTrigger
              value="profile"
              className="px-4 py-3 data-[state=active]:border-b-2 data-[state=active]:border-[#1977e5] rounded-none bg-transparent"
            >
              <User className="w-4 h-4 mr-2" />
              {t('settings.userProfile')}
            </TabsTrigger>
          )}
          {isAuthenticated && (
            <TabsTrigger
              value="sessions"
              className="px-4 py-3 data-[state=active]:border-b-2 data-[state=active]:border-[#1977e5] rounded-none bg-transparent"
            >
              <Shield className="w-4 h-4 mr-2" />
              {t('settings.sessionManagement')}
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger
              value="admin"
              className="px-4 py-3 data-[state=active]:border-b-2 data-[state=active]:border-[#1977e5] rounded-none bg-transparent"
            >
              <Users className="w-4 h-4 mr-2" />
              {t('settings.userAdmin')}
            </TabsTrigger>
          )}
          <TabsTrigger
            value="llm"
            className="px-4 py-3 data-[state=active]:border-b-2 data-[state=active]:border-[#1977e5] rounded-none bg-transparent"
          >
            <Brain className="w-4 h-4 mr-2" />
            {t('settings.llmConfig')}
          </TabsTrigger>
          <TabsTrigger
            value="logs"
            className="px-4 py-3 data-[state=active]:border-b-2 data-[state=active]:border-[#1977e5] rounded-none bg-transparent"
          >
            <Server className="w-4 h-4 mr-2" />
            {t('settings.logs')}
            {stats && stats.recent_errors > 0 && (
              <Badge variant="destructive" className="ml-2 text-xs">
                {stats.recent_errors}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {isAuthenticated && (
          <TabsContent value="profile" className="mt-6">
            <UserProfile />
          </TabsContent>
        )}

        {isAuthenticated && (
          <TabsContent value="sessions" className="mt-6">
            <SessionManagement />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="admin" className="mt-6">
            <UserAdministration />
          </TabsContent>
        )}

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