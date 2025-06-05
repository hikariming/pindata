import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
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

export const App = (): JSX.Element => {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
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
        
        {/* 404 页面 */}
        <Route path="*" element={<div className="p-6"><h1>页面未找到</h1></div>} />
      </Route>
    </Routes>
  );
}; 