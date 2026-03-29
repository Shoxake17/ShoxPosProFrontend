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

    // ── Ai.tsx barcha hardcode matnlari ────────────────────
    aiAnalyst: "AI Tahlilchi",
    clearBtn: "Tozalash",
    clearChatFull: "{modelName} suhbatini tozalashni xohlaysizmi?",
    storeDataOn: "Do'kon ma'lumotlari",
    normalAi: "Oddiy AI",
    tooltipStoreOff: "Oddiy rejimga o'tish",
    tooltipStoreOn: "Do'kon ma'lumotlarini ulash",
    greeting: "Assalomu alaykum,",
    askAnything: "Istalgan savol bering",
    storeMode: "Do'kon tahlil rejimi yoqilgan — {sales} sotuv, {products} mahsulot, {debts} qarzdor yuklandi",
    retryBtn: "Qayta urinish",
    typing: "javob yozmoqda...",
    storeModeBadge: "do'kon",
    messageBadge: "{count} xabar",
    modelDropLabel: "Model",

    // Quick questions
    q1: "Bugungi savdo?",
    q2: "Top mahsulotlar",
    q3: "Kam zaxira bor?",
    q4: "Oylik foyda",
    q5: "Qarzdorlar ro'yxati",
    q6: "Umumiy qarz summasi",

    // Placeholder (store vs normal)
    placeholderStore: "{modelName} ga do'kon, mahsulot yoki qarzlar haqida so'rang...",
    placeholderNormal: "{modelName} ga istalgan savol bering...",

    // Xato matnlari
    errNoInternet: "Internet yo'q",
    errNoInternetDesc: "Tarmoqni tekshiring.",
    errLimit: "Limit tugadi",
    errLimitDesc: "Bir oz kuting.",
    errServer: "Server xatosi",
    errServerDesc: "Vaqtincha ishlamayapti.",
    errBalance: "Balans tugagan",
    errBalanceDesc: "Hisobni to'ldiring.",
    errDefault: "Xatolik",
    errDefaultDesc: "Qayta urinib ko'ring.",
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

    // ── Ai.tsx barcha hardcode matnlari ────────────────────
    aiAnalyst: "AI Асистент",
    clearBtn: "Очистить",
    clearChatFull: "Очистить чат {modelName}?",
    storeDataOn: "Данные магазина",
    normalAi: "Обычный AI",
    tooltipStoreOff: "Перейти в обычный режим",
    tooltipStoreOn: "Подключить данные магазина",
    greeting: "Ассаламу алайкум,",
    askAnything: "Задайте любой вопрос",
    storeMode: "Режим анализа магазина включён — загружено {sales} продаж, {products} товаров, {debts} должников",
    retryBtn: "Повторить",
    typing: "печатает ответ...",
    storeModeBadge: "магазин",
    messageBadge: "{count} сообщ.",
    modelDropLabel: "Модель",

    // Quick questions
    q1: "Продажи сегодня?",
    q2: "Топ товары",
    q3: "Мало запасов?",
    q4: "Прибыль за месяц",
    q5: "Список должников",
    q6: "Общая сумма долга",

    // Placeholder
    placeholderStore: "Спросите {modelName} о магазине, товарах или долгах...",
    placeholderNormal: "Задайте любой вопрос {modelName}...",

    // Xato matnlari
    errNoInternet: "Нет интернета",
    errNoInternetDesc: "Проверьте сеть.",
    errLimit: "Лимит исчерпан",
    errLimitDesc: "Подождите немного.",
    errServer: "Ошибка сервера",
    errServerDesc: "Временно недоступно.",
    errBalance: "Баланс исчерпан",
    errBalanceDesc: "Пополните счёт.",
    errDefault: "Ошибка",
    errDefaultDesc: "Попробуйте ещё раз.",
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

    // ── Ai.tsx barcha hardcode matnlari ────────────────────
    aiAnalyst: "AI Analyst",
    clearBtn: "Clear",
    clearChatFull: "Clear {modelName} chat?",
    storeDataOn: "Store Data",
    normalAi: "Normal AI",
    tooltipStoreOff: "Switch to normal mode",
    tooltipStoreOn: "Connect store data",
    greeting: "Hello,",
    askAnything: "Ask anything",
    storeMode: "Store analysis mode on — {sales} sales, {products} products, {debts} debtors loaded",
    retryBtn: "Retry",
    typing: "is typing...",
    storeModeBadge: "store",
    messageBadge: "{count} msgs",
    modelDropLabel: "Model",

    // Quick questions
    q1: "Today's sales?",
    q2: "Top products",
    q3: "Low stock?",
    q4: "Monthly profit",
    q5: "Debtors list",
    q6: "Total debt amount",

    // Placeholder
    placeholderStore: "Ask {modelName} about store, products or debts...",
    placeholderNormal: "Ask {modelName} anything...",

    // Xato matnlari
    errNoInternet: "No internet",
    errNoInternetDesc: "Check your network.",
    errLimit: "Rate limit reached",
    errLimitDesc: "Please wait a moment.",
    errServer: "Server error",
    errServerDesc: "Temporarily unavailable.",
    errBalance: "Balance depleted",
    errBalanceDesc: "Top up your account.",
    errDefault: "Error",
    errDefaultDesc: "Please try again.",
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

export const TranslationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
};