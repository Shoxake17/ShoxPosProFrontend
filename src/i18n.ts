import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// ─── O'zbek tili ───
import uzSidebar from './locales/uz/sidebar.json';
import uzCommon from './locales/uz/common.json';
import uzMenu from './locales/uz/menu.json';
import uzProducts from './locales/uz/addProducts.json';
import uzDatabase from './locales/uz/dataBase.json';
import uzScanner from './locales/uz/scanner.json';
import uzSotilgan from './locales/uz/sotilgan.json';
import uzHisobot from './locales/uz/hisobotlar.json';
import uzKirim from './locales/uz/kirimBazasi.json'; 
import uzQarzlar from './locales/uz/qarzlar.json';
import uzAi from './locales/uz/ai.json';
import uzChat from './locales/uz/chat.json';
import uzSettings from './locales/uz/settings.json';

// ─── Rus tili ───
import ruSidebar from './locales/ru/sidebar.json';
import ruCommon from './locales/ru/common.json';
import ruMenu from './locales/ru/menu.json';
import ruProducts from './locales/ru/addProducts.json';
import ruDatabase from './locales/ru/dataBase.json';
import ruScanner from './locales/ru/scanner.json';
import ruSotilgan from './locales/ru/sotilgan.json';
import ruHisobot from './locales/ru/hisobotlar.json';
import ruKirim from './locales/ru/kirimBazasi.json';
import ruQarzlar from './locales/ru/qarzlar.json';
import ruAi from './locales/ru/ai.json';
import ruChat from './locales/ru/chat.json';
import ruSettings from './locales/ru/settings.json';

// ─── Ingliz tili ───
import enSidebar from './locales/eng/sidebar.json';
import enCommon from './locales/eng/common.json';
import enMenu from './locales/eng/menu.json';
import enProducts from './locales/eng/addProducts.json';
import enDatabase from './locales/eng/dataBase.json';
import enScanner from './locales/eng/scanner.json';
import enSotilgan from './locales/eng/sotilgan.json';
import enHisobot from './locales/eng/hisobotlar.json';
import enKirim from './locales/eng/kirimBazasi.json';
import enQarzlar from './locales/eng/qarzlar.json';
import enAi from './locales/eng/ai.json';
import enChat from './locales/eng/chat.json';
import enSettings from './locales/eng/settings.json';

// Default tilni localStorage da 'uz' ga o'rnatish
const savedLang = localStorage.getItem('i18nextLng');
if (!savedLang || !['uz', 'ru', 'en'].includes(savedLang)) {
  localStorage.setItem('i18nextLng', 'uz');
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      uz: {
        sidebar: uzSidebar,
        common: uzCommon,
        menu: uzMenu,
        products: uzProducts,
        database: uzDatabase,
        scanner: uzScanner,
        sotilgan: uzSotilgan,
        hisobotlar: uzHisobot,
        kirim: uzKirim,
        qarzlar: uzQarzlar,
        ai: uzAi,
        chat: uzChat,
        settings: uzSettings,
      },
      ru: {
        sidebar: ruSidebar,
        common: ruCommon,
        menu: ruMenu,
        products: ruProducts,
        database: ruDatabase,
        scanner: ruScanner,
        sotilgan: ruSotilgan,
        hisobotlar: ruHisobot,
        kirim: ruKirim,
        qarzlar: ruQarzlar,
        ai: ruAi,
        chat: ruChat,
        settings: ruSettings,
      },
      en: { 
        sidebar: enSidebar,
        common: enCommon,
        menu: enMenu,
        products: enProducts,
        database: enDatabase,
        scanner: enScanner,
        sotilgan: enSotilgan,
        hisobotlar: enHisobot,
        kirim: enKirim,
        qarzlar: enQarzlar,
        ai: enAi,
        chat: enChat,
        settings: enSettings,
      }
    },
    
    lng: 'uz',
    fallbackLng: 'uz',
    
    // ✅ NAMESPACE LARNI TO'G'IRLASH
    ns: ['sidebar', 'common', 'menu', 'products', 'database', 'scanner', 'sotilgan', 'hisobotlar', 'kirim', 'qarzlar', 'ai', 'chat', 'settings'], 
    defaultNS: 'common',
    
    debug: true, // Xatolar console da chiqishi uchun

    interpolation: {
      escapeValue: false
    },

    detection: {
      order: ['localStorage', 'cookie', 'navigator', 'htmlTag'],
      lookupLocalStorage: 'i18nextLng',
      caches: ['localStorage']
    }
  });

export default i18n;