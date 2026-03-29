// Yangi fayl: components/languages/Hisobotlar.tsx
import { useState, useEffect } from 'react';

type Language = 'uz' | 'ru' | 'en';

const translations: Record<Language, Record<string, string>> = {
  uz: {
    reports: "Hisobotlar",
    loading: "Yuklanmoqda...",
    totalIncome: "Umumiy daromad",
    totalSalesAmount: "Umumiy sotuv miqdori",
    salesCount: "Sotilgan mahsulot turi",
    soldQuantity: "Sotilgan mahsulot miqdori",
    all: "Barchasi",
    today: "Bugun",
    week: "Hafta",
    month: "Oy",
    export: "Export",
    last7DaysSales: "Oxirgi 7 kunlik sotuvlar",
    salesByCategory: "Kategoriyalar bo'yicha sotuvlar",
    noData: "Ma'lumot yo'q",
    top10ProductsByQuantity: "Top 10 mahsulot (dona)",
    top10ProductsByAmount: "Top 10 mahsulot (summa)",
    sales: "Sotuvlar",
    mongoLoadError: "MongoDB dan yuklanmadi",
    unknown: "Noma'lum",
    daily: "Kunlik",
    currencyUnit: "so'm",
    grainFlour: "Don va un",
    meat: "Go'sht",
    vegetables: "Sabzavot",
    fruits: "Mevalar",
    drinks: "Ichimliklar",
    oil: "Yog'",
    dairy: "Sut mahsulotlari",
    sweets: "Qandolat mahsulotlari",
    clothing: "Kiyim",
    electronics: "Texnika",
    vehicles: "Avtotransport vositalari",
    hygiene: "Gigiyena vositalari",
    kitchenware: "Oshxona jihozlari",
    babyProducts: "Bolalar mahsulotlari",
    stationery: "Kantselyariya mahsulotlari",
    petProducts: "Uy hayvonlari uchun tovarlar",
    medicine: "Dorilar",
    allCategories: "Barcha",

    // ── Hisobotlar sahifasi qo'shimcha matnlari ────────────
    allSalesHistory: "Barcha Sotuvlar Tarixi",
  },
  ru: {
    reports: "Отчеты",
    loading: "Загрузка...",
    totalIncome: "Общий доход",
    salesCount: "Количество продаж",
    soldQuantity: "Проданное количество",
    totalSalesAmount: "Общая сумма продаж",
    all: "Все",
    today: "Сегодня",
    week: "Неделя",
    month: "Месяц",
    export: "Экспорт",
    last7DaysSales: "Продажи за последние 7 дней",
    salesByCategory: "Продажи по категориям",
    noData: "Нет данных",
    top10ProductsByQuantity: "Топ 10 продуктов (количество)",
    top10ProductsByAmount: "Топ 10 продуктов (сумма)",
    sales: "Продажи",
    mongoLoadError: "Не загружено из MongoDB",
    unknown: "Неизвестно",
    daily: "Ежедневно",
    currencyUnit: "сум",
    grainFlour: "Зерно и мука",
    meat: "Мясо",
    vegetables: "Овощи",
    fruits: "Фрукты",
    drinks: "Напитки",
    oil: "Масло",
    dairy: "Молочные продукты",
    sweets: "Сладости",
    clothing: "Одежда",
    electronics: "Техника",
    hygiene: "Средства гигиены",
    kitchenware: "Кухонная утварь",
    babyProducts: "Детские товары",
    stationery: "Канцелярия",
    petProducts: "Товары для животных",
    medicine: "Лекарства",
    allCategories: "Все",

    // ── Hisobotlar sahifasi qo'shimcha matnlari ────────────
    allSalesHistory: "История всех продаж",
  },
  en: {
    reports: "Reports",
    loading: "Loading...",
    totalIncome: "Total Income",
    salesCount: "Type of product sold",
    soldQuantity: "Sold Quantity",
    all: "All",
    today: "Today",
    week: "Week",
    month: "Month",
    export: "Export",
    totalSalesAmount: "Total Sales Amount",
    last7DaysSales: "Last 7 Days Sales",
    salesByCategory: "Sales by Category",
    noData: "No Data",
    top10ProductsByQuantity: "Top 10 Products (Quantity)",
    top10ProductsByAmount: "Top 10 Products (Amount)",
    sales: "Sales",
    mongoLoadError: "Not loaded from MongoDB",
    unknown: "Unknown",
    daily: "Daily",
    currencyUnit: "UZS",
    grainFlour: "Grain and flour",
    meat: "Meat",
    vegetables: "Vegetables",
    fruits: "Fruits",
    drinks: "Drinks",
    oil: "Oil",
    dairy: "Dairy products",
    sweets: "Sweets",
    clothing: "Clothing",
    electronics: "Electronics",
    hygiene: "Hygiene products",
    kitchenware: "Kitchenware",
    babyProducts: "Baby products",
    stationery: "Stationery",
    petProducts: "Pet products",
    medicine: "Medicine",
    allCategories: "All",

    // ── Hisobotlar sahifasi qo'shimcha matnlari ────────────
    allSalesHistory: "All Sales History",
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

  const t = (key: string) => translations[language][key] || key;

  return { t, language };
}

// TranslationProvider - agar kerak bo'lsa
export const TranslationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
};