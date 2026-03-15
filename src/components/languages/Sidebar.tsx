// components/languages/Sidebar.tsx
import { useState, useEffect } from 'react';

type Language = 'uz' | 'ru' | 'en';

const translations: Record<Language, Record<string, string>> = {
  uz: {
    dashboard: "Boshqaruv Paneli",
    addProduct: "Mahsulot Qo‘shish",
    products: "Mahsulotlar",
    scanner: "Savdo terminali",
    sales: "Sotuvlar",
    reports: "Savdo Statistikasi",
    kirimBazasi: "Kirim Bazasi",
    debts: "Qarzlar",
    ai: "AI Yordamchi",
    settings: "Sozlamalar",
  },
  ru: {
    dashboard: "Панель Управления",
    addProduct: "Добавить Продукт",
    products: "Продукты",
    scanner: "Терминал Продаж",
    sales: "Продажи",
    reports: "Статистика Продаж",
    kirimBazasi: "База Входа",
    debts: "Долги",
    ai: "AI Ассистент",
    settings: "Настройки",
  },
  en: {
    dashboard: "Dashboard",
    addProduct: "Add Product",
    products: "Products",
    scanner: "Sales Terminal",
    sales: "Sales",
    reports: "Sales Statistics",
    kirimBazasi: "Incoming Base",
    debts: "Debts",
    ai: "AI Assistant",
    settings: "Settings",
  }
};

// Tarjima hook
export function useTranslation() {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('language');
    return (saved as Language) || 'uz';
  });

  useEffect(() => {
    const handleStorageChange = () => {
      const newLang = localStorage.getItem('language') as Language;
      if (newLang && newLang !== language) {
        setLanguage(newLang);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('languageChange', handleStorageChange);

    const interval = setInterval(() => {
      const currentLang = localStorage.getItem('language') as Language;
      if (currentLang && currentLang !== language) {
        setLanguage(currentLang);
      }
    }, 500);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('languageChange', handleStorageChange);
      clearInterval(interval);
    };
  }, [language]);

  const t = (key: string, params?: Record<string, string>) => {
    let text = translations[language][key] || key;
    if (params) {
      Object.entries(params).forEach(([paramKey, value]) => {
        text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), value);
      });
    }
    return text;
  };

  return { t, language };
}

// TranslationProvider - agar kerak bo'lsa, lekin oldingi misollarda bo'lmagan, shuning uchun saqlab qo'yamiz
export const TranslationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>; // Agar kontekst kerak bo'lmasa, shunchaki o'rab turadi
};