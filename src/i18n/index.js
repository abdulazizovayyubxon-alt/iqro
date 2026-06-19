/**
 * i18n — ko'p tillilik (react-i18next).
 * Standart til: uz (o'zbek-lotin). Qo'shimcha: ru (rus).
 * Til localStorage `iqro-lang` da saqlanadi; yo'q bo'lsa brauzer tilidan aniqlanadi.
 *
 * Matnlarni bosqichma-bosqich ko'chiramiz — hozircha tarjima qilingan yuzalar
 * (BottomNav, Settings) tilga moslashadi; qolgani uz-lotin'da qoladi (fallback).
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import uz from './locales/uz.json';
import ru from './locales/ru.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      uz: { translation: uz },
      ru: { translation: ru },
    },
    fallbackLng: 'uz',
    supportedLngs: ['uz', 'ru'],
    nonExplicitSupportedLngs: true, // 'ru-RU' → 'ru'
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'iqro-lang',
      caches: ['localStorage'],
    },
    interpolation: { escapeValue: false }, // React XSS'dan o'zi himoyalaydi
  });

export default i18n;
