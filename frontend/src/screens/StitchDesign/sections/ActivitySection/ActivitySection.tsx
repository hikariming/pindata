import {
  CheckSquareIcon,
  DatabaseIcon,
  HardDriveIcon,
  PieChartIcon,
} from "lucide-react";
import React from "react";
import { useTranslation } from 'react-i18next';
import { Button } from "../../../../components/ui/button";
import { Card, CardContent } from "../../../../components/ui/card";

export const ActivitySection = (): JSX.Element => {
  const { t } = useTranslation();

  const overviewData = [
    {
      title: t('navigation.datasets'),
      value: "12",
      icon: <DatabaseIcon className="w-6 h-6" />,
    },
    {
      title: t('navigation.tasks'),
      value: "4",
      icon: <CheckSquareIcon className="w-6 h-6" />,
    },
    {
      title: t('navigation.storage'),
      value: "256 GB / 1 TB",
      icon: <HardDriveIcon className="w-6 h-6" />,
    },
    {
      title: t('navigation.plugins'),
      value: t('overview.comingSoon'),
      icon: <PieChartIcon className="w-6 h-6" />,
    },
  ];

  const recentActivities = [
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
  ];

  const notifications = [
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
  ];

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
              {t('overview.welcome')}
            </h2>
            <p className="font-medium text-base text-white leading-6">
              {t('overview.welcomeDescription')}
            </p>
          </div>
        </div>
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
                {item.value}
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
      </div>

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