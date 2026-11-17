import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { en } from './en';
import { uk } from './uk';

// Мову остаточно виставляє сховище налаштувань (initSettings), тут лише стартове значення.
void i18n.use(initReactI18next).init({
  resources: { uk: { translation: uk }, en: { translation: en } },
  lng: 'uk',
  fallbackLng: 'uk',
  // React сам екранує текст під час рендера, подвійне екранування зіпсувало б апострофи.
  interpolation: { escapeValue: false },
  returnNull: false,
});

export default i18n;
