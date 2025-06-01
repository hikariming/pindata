import {
  DatabaseIcon,
  HardDriveIcon,
  LayoutDashboardIcon,
  ListTodoIcon,
  PuzzleIcon,
  SettingsIcon,
} from "lucide-react";
import React from "react";
import { useTranslation } from 'react-i18next';
import { Button } from "../../../../components/ui/button";

interface OverviewSectionProps {
  isCollapsed?: boolean;
}

export const OverviewSection = ({ isCollapsed = false }: OverviewSectionProps): JSX.Element => {
  const { t } = useTranslation();

  const navigationItems = [
    {
      icon: <LayoutDashboardIcon size={24} />,
      label: t('navigation.overview'),
      active: true,
    },
    { icon: <DatabaseIcon size={24} />, label: t('navigation.datasets'), active: false },
    { icon: <ListTodoIcon size={24} />, label: t('navigation.tasks'), active: false },
    { icon: <HardDriveIcon size={24} />, label: t('navigation.rawData'), active: false },
    { icon: <PuzzleIcon size={24} />, label: t('navigation.plugins'), active: false },
    { icon: <SettingsIcon size={24} />, label: t('navigation.settings'), active: false },
  ];

  return (
    <nav className="flex flex-col h-full bg-[#f7f9fc] p-4">
      <div className="flex flex-col gap-4 w-full">
        <div className="w-full">
          <h2 className={`font-medium text-base text-[#0c141c] leading-6 ${isCollapsed ? "hidden" : ""}`}>
            {t('appName')}
          </h2>
        </div>

        <div className="flex flex-col gap-2 w-full">
          {navigationItems.map((item, index) => (
            <Button
              key={index}
              variant={item.active ? "secondary" : "ghost"}
              className={`flex justify-start gap-3 px-3 py-2 h-auto w-full ${
                item.active ? "bg-[#e8edf2]" : ""
              }`}
            >
              <span className="w-6">{item.icon}</span>
              {!isCollapsed && (
                <span className="font-medium text-sm text-[#0c141c] leading-[21px]">
                  {item.label}
                </span>
              )}
            </Button>
          ))}
        </div>
      </div>
    </nav>
  );
};