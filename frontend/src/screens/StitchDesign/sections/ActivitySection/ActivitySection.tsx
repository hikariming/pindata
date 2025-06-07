import {
  CheckSquareIcon,
  DatabaseIcon,
  HardDriveIcon,
  PieChartIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react";
import React, { useState, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { Button } from "../../../../components/ui/button";
import { Card, CardContent } from "../../../../components/ui/card";
import { useOverview } from "../../../../hooks/useOverview";

export const ActivitySection = (): JSX.Element => {
  const { t } = useTranslation();
  const { stats, activities, notifications: systemNotifications, isLoading, error } = useOverview();
  const [currentSlide, setCurrentSlide] = useState(0);

  // 轮播功能的特性数据
  const features = [
    {
      icon: <DatabaseIcon className="w-12 h-12 text-[#1977e5]" />,
      title: "数据导入与处理",
      description: "支持多种格式的原始数据导入，包括 CSV、JSON、Excel 等。智能数据预处理，自动识别数据类型，生成高质量的训练数据集。"
    },
    {
      icon: <PieChartIcon className="w-12 h-12 text-[#1977e5]" />,
      title: "多平台数据集管理",
      description: "无缝集成 Hugging Face Hub 和魔搭社区等主流平台。一键导入热门开源数据集，支持版本管理和更新同步。"
    },
    {
      icon: <CheckSquareIcon className="w-12 h-12 text-[#1977e5]" />,
      title: "智能任务调度",
      description: "自动化数据处理流水线，支持批量操作和定时任务。实时监控任务状态，提供详细的执行日志和性能指标。"
    },
    {
      icon: <HardDriveIcon className="w-12 h-12 text-[#1977e5]" />,
      title: "存储与分享",
      description: "云端存储，支持大规模数据集的安全存储和备份。团队协作功能，支持数据集共享和权限管理。"
    }
  ];

  // 自动轮播
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % features.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [features.length]);

  const overviewData = [
    {
      title: t('navigation.datasets'),
      value: stats?.datasets.total?.toString() || "0",
      icon: <DatabaseIcon className="w-6 h-6" />,
    },
    {
      title: t('navigation.tasks'),
      value: stats?.tasks.total?.toString() || "0",
      icon: <CheckSquareIcon className="w-6 h-6" />,
    },
    {
      title: t('navigation.storage'),
      value: stats ? `${stats.storage.used_gb} GB / ${stats.storage.total_gb} GB` : "0 GB / 0 GB",
      icon: <HardDriveIcon className="w-6 h-6" />,
    },
    {
      title: t('navigation.plugins'),
      value: stats?.plugins.status === 'coming_soon' ? t('overview.comingSoon') : stats?.plugins.total?.toString() || "0",
      icon: <PieChartIcon className="w-6 h-6" />,
    },
  ];

  // 获取图标组件
  const getIconForActivity = (iconType: string) => {
    switch (iconType) {
      case 'database':
        return <DatabaseIcon className="w-6 h-6" />;
      case 'task':
        return <CheckSquareIcon className="w-6 h-6" />;
      case 'plugin':
        return <PieChartIcon className="w-6 h-6" />;
      case 'storage':
        return <HardDriveIcon className="w-6 h-6" />;
      default:
        return <DatabaseIcon className="w-6 h-6" />;
    }
  };

  const recentActivities = isLoading || !activities.length ? [
    {
      title: "Dataset 'Project Alpha' updated",
      time: t('time.hoursAgo', { count: 2 }),
      icon: <DatabaseIcon className="w-6 h-6" />,
    },
    {
      title: "Task 'Data Cleaning' completed",
      time: t('time.hoursAgo', { count: 4 }),
      icon: <CheckSquareIcon className="w-6 h-6" />,
    },
    {
      title: "New plugin 'Data Visualization' installed",
      time: t('time.daysAgo', { count: 1 }),  
      icon: <PieChartIcon className="w-6 h-6" />,
    },
    {
      title: "Storage usage increased by 10 GB",
      time: t('time.daysAgo', { count: 2 }),
      icon: <HardDriveIcon className="w-6 h-6" />,
    },
    {
      title: "Dataset 'Project Beta' created",
      time: t('time.daysAgo', { count: 3 }),
      icon: <DatabaseIcon className="w-6 h-6" />,
    },
  ] : activities.map(activity => ({
    title: activity.title,
    time: activity.time,
    icon: getIconForActivity(activity.icon)
  }));

  const notifications = isLoading || !systemNotifications.length ? [
    {
      title: "Dataset 'Project Alpha' updated successfully",
      time: t('time.hoursAgo', { count: 2 }),
      icon: <DatabaseIcon className="w-6 h-6" />,
    },
    {
      title: "Task 'Data Cleaning' completed successfully",
      time: t('time.hoursAgo', { count: 4 }),
      icon: <CheckSquareIcon className="w-6 h-6" />,
    },
  ] : systemNotifications.map(notification => ({
    title: notification.title,
    time: notification.time,
    icon: getIconForActivity(notification.icon)
  }));

  // 错误状态显示
  if (error) {
    return (
      <section className="w-full max-w-[960px] flex-1 flex flex-col items-start">
        <div className="w-full p-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600">加载概览数据时出错: {error}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="w-full max-w-[960px] flex-1 flex flex-col items-start">
      <div className="w-full p-4">
        <h1 className="font-bold text-[32px] leading-10 text-[#0c141c]">
          {t('navigation.overview')}
        </h1>
      </div>

      <div className="w-full p-4">
        <div className="w-full h-[246px] rounded-lg overflow-hidden relative [background:linear-gradient(0deg,rgba(0,0,0,0.4)_0%,rgba(0,0,0,0)_100%),url(..//depth-5--frame-0.png)_50%_50%_/_cover]">
          <div className="absolute bottom-4 left-4 max-w-[440px]">
            <h2 className="font-bold text-2xl text-white leading-[30px]">
              欢迎使用拼好数
            </h2>
            <p className="font-medium text-base text-white leading-6">
              开始探索您的数据集、管理任务和监控存储使用情况。
            </p>
          </div>
        </div>

        {/* 功能轮播 */}
        <div className="w-full mt-6 bg-white rounded-lg border border-[#d1dbe8] overflow-hidden">
          <div className="relative">
            <div className="flex transition-transform duration-500 ease-in-out" style={{ transform: `translateX(-${currentSlide * 100}%)` }}>
              {features.map((feature, index) => (
                <div key={index} className="w-full flex-shrink-0 p-8">
                  <div className="flex items-center gap-6 max-w-4xl mx-auto">
                    <div className="flex-shrink-0">
                      {feature.icon}
                    </div>
                    <div>
                      <h3 className="font-bold text-xl text-[#0c141c] mb-2">{feature.title}</h3>
                      <p className="text-[#4f7096] leading-relaxed">{feature.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* 轮播控制按钮 */}
            <button
              onClick={() => setCurrentSlide((prev) => (prev - 1 + features.length) % features.length)}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
            >
              <ChevronLeftIcon className="w-5 h-5 text-[#4f7096]" />
            </button>
            <button
              onClick={() => setCurrentSlide((prev) => (prev + 1) % features.length)}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
            >
              <ChevronRightIcon className="w-5 h-5 text-[#4f7096]" />
            </button>
          </div>
          
          {/* 轮播指示器 */}
          <div className="flex justify-center pb-4">
            {features.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`w-2 h-2 rounded-full mx-1 transition-colors ${
                  index === currentSlide ? 'bg-[#1977e5]' : 'bg-[#d1dbe8]'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* 快速开始指南 - 紧凑版 */}
      <div className="w-full pt-5 pb-3 px-4">
        <h2 className="font-bold text-[22px] leading-7 text-[#0c141c]">
          快速开始指南
        </h2>
      </div>

      <div className="w-full px-4 pb-4">
        <Card className="border-[#d1dbe8]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1">
                <div className="w-8 h-8 bg-[#1977e5] text-white rounded-full flex items-center justify-center text-sm font-bold">
                  1
                </div>
                <div>
                  <p className="font-medium text-sm text-[#0c141c]">导入数据</p>
                  <p className="text-xs text-[#4f7096]">本地文件或HF、魔搭平台</p>
                </div>
              </div>
              <div className="w-0.5 h-8 bg-[#d1dbe8]"></div>
              <div className="flex items-center gap-3 flex-1">
                <div className="w-8 h-8 bg-[#1977e5] text-white rounded-full flex items-center justify-center text-sm font-bold">
                  2
                </div>
                <div>
                  <p className="font-medium text-sm text-[#0c141c]">处理数据</p>
                  <p className="text-xs text-[#4f7096]">清洗、转换和质量检查</p>
                </div>
              </div>
              <div className="w-0.5 h-8 bg-[#d1dbe8]"></div>
              <div className="flex items-center gap-3 flex-1">
                <div className="w-8 h-8 bg-[#1977e5] text-white rounded-full flex items-center justify-center text-sm font-bold">
                  3
                </div>
                <div>
                  <p className="font-medium text-sm text-[#0c141c]">生成数据集</p>
                  <p className="text-xs text-[#4f7096]">训练数据集并导出</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="w-full pt-5 pb-3 px-4">
        <h2 className="font-bold text-[22px] leading-7 text-[#0c141c]">
          {t('overview.systemOverview')}
        </h2>
      </div>

      <div className="w-full p-4 flex flex-wrap gap-4">
        {overviewData.map((item, index) => (
          <Card key={index} className="flex-1 min-w-[158px] border-[#d1dbe8]">
            <CardContent className="p-6 flex flex-col gap-2">
              <p className="font-medium text-base text-[#0c141c] leading-6">
                {item.title}
              </p>
              <p className="font-bold text-2xl text-[#0c141c] leading-[30px]">
                {isLoading ? (
                  <span className="inline-block w-16 h-6 bg-gray-200 rounded animate-pulse"></span>
                ) : (
                  item.value
                )}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="w-full pt-5 pb-3 px-4">
        <h2 className="font-bold text-[22px] leading-7 text-[#0c141c]">
          {t('overview.recentActivity')}
        </h2>
      </div>

      <div className="w-full px-4 flex flex-col gap-2">
        {recentActivities.map((activity, index) => (
          <div key={index} className="flex items-start gap-2 w-full">
            <div className="w-10 flex flex-col items-center">
              <div className="flex items-center justify-center">
                {activity.icon}
              </div>
              {index < recentActivities.length - 1 && (
                <div className="h-8 w-0.5 bg-[#d1dbe8]" />
              )}
            </div>
            <div className="flex flex-col py-3 flex-1">
              <p className="font-medium text-base text-[#0c141c] leading-6">
                {activity.title}
              </p>
              <p className="font-normal text-base text-[#4f7096] leading-6">
                {activity.time}
              </p>
            </div>
          </div>
        ))}
      </div>
{/* 
      <div className="w-full pt-5 pb-3 px-4">
        <h2 className="font-bold text-[22px] leading-7 text-[#0c141c]">
          {t('overview.quickActions')}
        </h2>
      </div>

      <div className="w-full px-4 py-3 flex flex-wrap gap-3">
        <Button className="h-10 px-4 bg-[#1977e5] text-[#f7f9fc] font-bold text-sm rounded-lg">
          {t('actions.createDataset')}
        </Button>
        <Button
          variant="secondary"
          className="h-10 px-4 bg-[#e8edf2] text-[#0c141c] font-bold text-sm rounded-lg"
        >
          {t('actions.startNewTask')}
        </Button>
      </div> */}

      <div className="w-full pt-5 pb-3 px-4">
        <h2 className="font-bold text-[22px] leading-7 text-[#0c141c]">
          {t('overview.systemNotifications')}
        </h2>
      </div>

      {notifications.map((notification, index) => (
        <div
          key={index}
          className="w-full h-[72px] flex items-center gap-4 px-4 py-2 bg-[#f7f9fc]"
        >
          <div className="w-12 h-12 flex items-center justify-center bg-[#e8edf2] rounded-lg">
            {notification.icon}
          </div>
          <div className="flex flex-col justify-center">
            <p className="font-medium text-base text-[#0c141c] leading-6">
              {notification.title}
            </p>
            <p className="font-normal text-sm text-[#4f7096] leading-[21px]">
              {notification.time}
            </p>
          </div>
        </div>
      ))}
    </section>
  );
};