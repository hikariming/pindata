import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidenav } from "./ui/sidenav";
import { MainContentLayout } from "./ui/main-content-layout";

export const Layout = (): JSX.Element => {
  const [isSidenavCollapsed, setIsSidenavCollapsed] = useState(false);

  const handleSidenavCollapsedChange = (isCollapsed: boolean) => {
    setIsSidenavCollapsed(isCollapsed);
  };

  return (
    <main className="flex w-full h-screen bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
      {/* 侧边导航栏 */}
      <div className="fixed left-0 top-0 h-screen z-20">
        <Sidenav 
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
          <MainContentLayout>
            <Outlet />
          </MainContentLayout>
        </div>
      </div>
    </main>
  );
}; 