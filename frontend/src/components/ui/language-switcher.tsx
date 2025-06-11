import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from './button';

interface LanguageSwitcherProps {
  isCollapsed?: boolean;
}

export const LanguageSwitcher = ({ isCollapsed = false }: LanguageSwitcherProps): JSX.Element => {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    const languages = ['en', 'zh', 'ja'];
    const currentIndex = languages.indexOf(i18n.language);
    const nextIndex = (currentIndex + 1) % languages.length;
    i18n.changeLanguage(languages[nextIndex]);
  };

  return (
    <Button
      variant="ghost"
      onClick={toggleLanguage}
      className="text-sm font-medium"
    >
      {isCollapsed ? (
        <span className="w-6 h-6 flex items-center justify-center">
          {i18n.language === 'en' ? '中' : i18n.language === 'zh' ? '日' : 'En'}
        </span>
      ) : (
        <span>
          {i18n.language === 'en' ? '中文' : i18n.language === 'zh' ? '日本語' : 'English'}
        </span>
      )}
    </Button>
  );
};