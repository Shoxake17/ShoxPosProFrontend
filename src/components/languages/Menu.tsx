// component/languages/Menu.tsx

import React, { useState, useEffect } from 'react';

type Language = 'uz' | 'ru' | 'en';

// Translations
const translations: Record<Language, Record<string, string>> = {
  uz: {
    dashboard: "Boshqaruv Panel",
    productsDatabase: "Umumiy Mahsulotlar Bazasi",
    pieces: "ta",
    incomeDashboard: "Mahsulotlarim Bazasi",
    income: "Kirim",
    passwordRequired: "Parol kerak",
    weeklySales: "Haftalik Sotuvlar",
    qrScanner: "QR Skaner",
    sales: "Sotuvlar",
    report: "Hisobot",
    payment: "To'lov",
    // Hafta kunlari
    monday: "Dushanba",
    tuesday: "Seshanba",
    wednesday: "Chorshanba",
    thursday: "Payshanba",
    friday: "Juma",
    saturday: "Shanba",
    sunday: "Yakshanba",
    chat: "Chat"
  },
  ru: {
    dashboard: "Панель управления",
    productsDatabase: "Общая база продуктов",
    pieces: "шт",
    incomeDashboard: "База данных моих продуктов",
    income: "Доход",
    passwordRequired: "Требуется пароль",
    weeklySales: "Недельные продажи",
    qrScanner: "QR Сканер",
    sales: "Продажи",
    report: "Отчет",
    payment: "Оплата",
    monday: "Понедельник",
    tuesday: "Вторник",
    wednesday: "Среда",
    thursday: "Четверг",
    friday: "Пятница",
    saturday: "Суббота",
    sunday: "Воскресенье",
    chat: "Чат"
  },
  en: {
    dashboard: "Dashboard",
    productsDatabase: "General Products Database",
    pieces: "pcs",
    incomeDashboard: "My Products Database",
    income: "Income",
    passwordRequired: "Password required",
    weeklySales: "Weekly Sales",
    qrScanner: "QR Scanner",
    sales: "Sales",
    report: "Report",
    payment: "Payment",
    monday: "Monday",
    tuesday: "Tuesday",
    wednesday: "Wednesday",
    thursday: "Thursday",
    friday: "Friday",
    saturday: "Saturday",
    sunday: "Sunday",
    chat: "Chat"
  }
};

// Tarjima funksiyasi (localStorage bilan sinxronlashgan)
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

  const t = (key: string) => translations[language][key] || key;

  return { t, language };
}