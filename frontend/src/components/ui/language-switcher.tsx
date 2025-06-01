import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from './button';

interface LanguageSwitcherProps {
  isCollapsed?: boolean;
}

export const LanguageSwitcher = ({ isCollapsed = false }: LanguageSwitcherProps): JSX.Element => {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'zh' : 'en';
    i18n.changeLanguage(newLang);
  };

  return (
    <Button
      variant="ghost"
      onClick={toggleLanguage}
      className="text-sm font-medium"
    >
      {isCollapsed ? (
        <span className="w-6 h-6 flex items-center justify-center">
          {i18n.language === 'en' ? '中' : 'En'}
        </span>
      ) : (
        <span>
          {i18n.language === 'en' ? '中文' : 'English'}
        </span>
      )}
    </Button>
  );
};