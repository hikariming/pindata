import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import enTranslations from './locales/en.json';
import zhTranslations from './locales/zh.json';
import jaTranslations from './locales/ja.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: enTranslations
      },
      zh: {
        translation: zhTranslations
      },
      ja: {
        translation: jaTranslations
      }
    },
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;