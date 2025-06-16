import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../../components/ui/card';
import { Rocket } from 'lucide-react';

export const Plugins = (): JSX.Element => {
  const { t } = useTranslation();

  return (
    <div className="w-full max-w-[1200px] p-6">
      <div className="mb-6">
        <h2 className="text-[22px] font-bold leading-7 text-[#0c141c]">
          {t('navigation.plugins')}
        </h2>
      </div>
      <Card className="border-[#d1dbe8] p-8">
        <div className="flex flex-col items-center justify-center text-center">
          <Rocket className="w-12 h-12 text-[#1977e5] mb-4" />
          <h3 className="text-xl font-semibold text-[#0c141c] mb-2">{t('overview.comingSoon')}</h3>
          <p className="text-[#4f7096]">{t('overview.pluginsDevelopment')}</p>
        </div>
      </Card>
    </div>
  );
};