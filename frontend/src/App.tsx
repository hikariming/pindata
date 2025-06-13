import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { Toaster } from 'react-hot-toast';
import { Layout } from "./components/Layout";
import { ActivitySection } from "./screens/StitchDesign/sections/ActivitySection";
import { RawData } from "./screens/RawData";
import { FilePreview } from "./screens/RawData/FilePreview";
import { Settings } from "./screens/Settings/Settings";
import { Plugins } from "./screens/Plugins/Plugins";
import { Tasks } from "./screens/Tasks/Tasks";
import { Datasets } from "./screens/Datasets/Datasets";
import { DatasetDetailScreen } from "./screens/Datasets/DatasetDetail";
import { CreateDataset } from "./screens/Datasets/CreateDataset";
import { SmartDatasetCreator } from "./screens/Datasets/SmartDatasetCreator";
import { DatasetTasks } from "./screens/Datasets/DatasetTasks";
import { DataGovernanceProjects, ProjectDetail } from "./screens/DataGovernance";
import { Login, Register } from "./screens/Auth";
import { AuthProvider, ProtectedRoute } from "./components/auth";

export const App = (): JSX.Element => {
  const { t } = useTranslation();
  
  return (
    <AuthProvider>
      <Toaster position="top-right" />
      <Routes>
        {/* 认证相关路由 */}
        <Route path="/auth/login" element={
          <ProtectedRoute requireAuth={false}>
            <Login />
          </ProtectedRoute>
        } />
        <Route path="/auth/register" element={
          <ProtectedRoute requireAuth={false}>
            <Register />
          </ProtectedRoute>
        } />
        
        {/* 受保护的主应用路由 */}
        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          {/* 默认重定向到overview */}
          <Route index element={<Navigate to="/overview" replace />} />
          
          {/* 主要页面路由 */}
          <Route path="overview" element={<ActivitySection />} />
          <Route path="rawdata" element={<RawData />} />
          <Route path="rawdata/library/:libraryId/file/:fileId" element={<FilePreview />} />
          <Route path="settings" element={<Settings />} />
          <Route path="plugins" element={<Plugins />} />
          <Route path="tasks" element={<Tasks />} />
          
          {/* 数据集相关路由 */}
          <Route path="datasets" element={<Datasets />} />
          <Route path="datasets/create" element={<CreateDataset />} />
          <Route path="datasets/create-smart" element={<SmartDatasetCreator />} />
          <Route path="datasets/:id" element={<DatasetDetailScreen />} />
          <Route path="datasets/:id/tasks" element={<DatasetTasks />} />
          
          {/* 数据治理工程路由 */}
          <Route path="governance">
            <Route index element={<DataGovernanceProjects />} />
            <Route path="projects" element={<DataGovernanceProjects />} />
            <Route path="projects/:id" element={<ProjectDetail />} />
            <Route path=":id" element={<ProjectDetail />} />
          </Route>
          
          {/* 404 页面 */}
          <Route path="*" element={<div className="p-6"><h1>{t('common.pageNotFound')}</h1></div>} />
        </Route>
        
        {/* 未授权页面 */}
        <Route path="/unauthorized" element={
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">403</h1>
              <p className="text-lg text-gray-600 mb-8">{t('auth.errors.unauthorized', '您没有权限访问此页面')}</p>
              <Navigate to="/" />
            </div>
          </div>
        } />
      </Routes>
    </AuthProvider>
  );
}; 