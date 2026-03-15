// components/languages/Ai.tsx
import { useState, useEffect } from 'react';

type Language = 'uz' | 'ru' | 'en';

const translations: Record<Language, Record<string, string>> = {
  uz: {
    title: "AI Yordamchi",
    placeholder: "{modelName} ga savol yo'llang...",
    helpNeeded: "Yordam kerakmi?",
    selectModel: "Xohlagan modelingizni tanlang va suhbatni boshlang.",
    clearChatConfirm: "Chatni tozalashni xohlaysizmi?",
    error: "❌ Xatolik: {message}",
    noResponse: "Javob olinmadi",
    modelLabel: "MODEL",
  },
  ru: {
    title: "AI Ассистент",
    placeholder: "Задайте вопрос {modelName}...",
    helpNeeded: "Нужна помощь?",
    selectModel: "Выберите желаемую модель и начните разговор.",
    clearChatConfirm: "Вы хотите очистить чат?",
    error: "❌ Ошибка: {message}",
    noResponse: "Ответ не получен",
    modelLabel: "МОДЕЛЬ",
  },
  en: {
    title: "AI Assistant",
    placeholder: "Ask {modelName}...",
    helpNeeded: "Need help?",
    selectModel: "Select your desired model and start the conversation.",
    clearChatConfirm: "Do you want to clear the chat?",
    error: "❌ Error: {message}",
    noResponse: "No response received",
    modelLabel: "MODEL",
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