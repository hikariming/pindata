import React, { useState } from "react";
import { Sidenav } from "../../components/ui/sidenav";
import { MainContentLayout } from "../../components/ui/main-content-layout";
import { ActivitySection } from "./sections/ActivitySection";
import { RawData } from "../RawData";
import { FileDetails } from "../RawData/FileDetails";
import { Settings } from "../Settings/Settings";
import { Plugins } from "../Plugins/Plugins";
import { Tasks } from "../Tasks/Tasks";
import { Datasets } from "../Datasets/Datasets";

export const StitchDesign = (): JSX.Element => {
  const [currentPage, setCurrentPage] = useState('overview');
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [isSidenavCollapsed, setIsSidenavCollapsed] = useState(false);

  const handleFileSelect = (file: any) => {
    setSelectedFile(file);
    setCurrentPage('fileDetails');
  };

  const handleBackToLibrary = () => {
    setSelectedFile(null);
    setCurrentPage('rawData');
  };

  const handleSidenavCollapsedChange = (isCollapsed: boolean) => {
    setIsSidenavCollapsed(isCollapsed);
  };

  const renderContent = () => {
    const contentMap = {
      'fileDetails': selectedFile ? (
        <FileDetails onBack={handleBackToLibrary} file={selectedFile} />
      ) : null,
      'rawData': <RawData onFileSelect={handleFileSelect} />,
      'overview': <ActivitySection />,
      'settings': <Settings />,
      'plugins': <Plugins />,
      'tasks': <Tasks />,
      'datasets': <Datasets />,
    };

    const content = contentMap[currentPage as keyof typeof contentMap] || <ActivitySection />;
    
    // 判断是否需要全宽布局（如文件详情页面）
    const isFullWidth = currentPage === 'fileDetails' || currentPage === 'rawData';
    
    return (
      <MainContentLayout isFullWidth={isFullWidth}>
        {content}
      </MainContentLayout>
    );
  };

  return (
    <main className="flex w-full h-screen bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
      {/* 侧边导航栏 */}
      <div className="fixed left-0 top-0 h-screen z-20">
        <Sidenav 
          onNavigate={setCurrentPage} 
          currentPage={currentPage}
          onCollapsedChange={handleSidenavCollapsedChange}
        />
      </div>
      
      {/* 主内容区域 */}
      <div 
        className={`flex-1 min-h-screen overflow-y-auto transition-all duration-300 ease-in-out ${
          isSidenavCollapsed ? 'ml-16' : 'ml-[300px]'
        }`}
      >
        <div className="p-6 w-full">
          {renderContent()}
        </div>
      </div>
    </main>
  );
};