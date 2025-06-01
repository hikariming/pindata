import React from 'react';
import { useTranslation } from 'react-i18next';

export const Tasks = (): JSX.Element => {
  const { t } = useTranslation();

  return (
    <div className="w-full max-w-[1200px] p-6">
      <div className="mb-6">
        <h2 className="text-[22px] font-bold leading-7 text-[#0c141c]">
          {t('navigation.tasks')}
        </h2>
      </div>
    </div>
  );
};