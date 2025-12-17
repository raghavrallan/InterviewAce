import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import en from './locales/en.json';
import es from './locales/es.json';

// Language resources
const resources = {
  en: { translation: en },
  es: { translation: es }
};

// Supported languages with their speech recognition codes
export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', speechCode: 'en-US', flag: '🇺🇸' },
  { code: 'es', name: 'Español', speechCode: 'es-ES', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', speechCode: 'fr-FR', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', speechCode: 'de-DE', flag: '🇩🇪' },
  { code: 'zh', name: '中文', speechCode: 'zh-CN', flag: '🇨🇳' },
  { code: 'ja', name: '日本語', speechCode: 'ja-JP', flag: '🇯🇵' },
  { code: 'ko', name: '한국어', speechCode: 'ko-KR', flag: '🇰🇷' },
  { code: 'hi', name: 'हिन्दी', speechCode: 'hi-IN', flag: '🇮🇳' },
  { code: 'pt', name: 'Português', speechCode: 'pt-BR', flag: '🇧🇷' },
  { code: 'ar', name: 'العربية', speechCode: 'ar-SA', flag: '🇸🇦' },
  { code: 'ru', name: 'Русский', speechCode: 'ru-RU', flag: '🇷🇺' }
];

// Initialize i18next
i18n
  .use(LanguageDetector) // Detect user language
  .use(initReactI18next) // Pass i18n instance to react-i18next
  .init({
    resources,
    fallbackLng: 'en', // Fallback language
    debug: false, // Set to true for debugging

    // Language detection options
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    },

    interpolation: {
      escapeValue: false // React already escapes values
    },

    // Return objects instead of keys for missing translations
    returnObjects: true,
    returnEmptyString: false,
    returnNull: false
  });

export default i18n;

/**
 * Get speech recognition language code for current language
 */
export const getSpeechLanguageCode = (languageCode) => {
  const lang = SUPPORTED_LANGUAGES.find(l => l.code === languageCode);
  return lang ? lang.speechCode : 'en-US';
};

/**
 * Get language name from code
 */
export const getLanguageName = (languageCode) => {
  const lang = SUPPORTED_LANGUAGES.find(l => l.code === languageCode);
  return lang ? lang.name : 'English';
};

/**
 * Check if language is RTL (Right-to-Left)
 */
export const isRTL = (languageCode) => {
  return ['ar', 'he', 'fa', 'ur'].includes(languageCode);
};
