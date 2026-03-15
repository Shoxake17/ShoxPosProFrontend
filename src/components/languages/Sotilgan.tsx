// Yangi fayl: components/languages/Sotilgan.tsx
import { useState, useEffect } from 'react';

type Language = 'uz' | 'ru' | 'en';

const translations: Record<Language, Record<string, string>> = {
  uz: {
    sales: "Sotuvlar",
    totalAmount: "Umumiy summa",
    uniqueProductsCount: "Turli mahsulotlar soni",
    soldProducts: "Sotilgan mahsulotlar",
    searchPlaceholder: "Barcode va Nomi orqali qidiring",
    all: "Barchasi",
    today: "Kunlik",
    week: "Haftalik",
    month: "Oylik",
    export: "Eksport",
    noSales: "Sotuvlar hali yo'q",
    changeFilters: "Filtrlarni o'zgartiring",
    products: "Mahsulotlar",
    barcode: "Barkod",
    quantity: "Soni",
    price: "Narxi",
    total: "Jammi",
    time: "Vaqti",
    currencyUnit: "so'm"
  },
  ru: {
    sales: "Продажи",
    totalAmount: "Общая сумма",
    uniqueProductsCount: "Количество уникальных продуктов",
    soldProducts: "Проданные продукты",
    searchPlaceholder: "Поиск по штрих-коду и имени",
    all: "Все",
    today: "Дневной",
    week: "Недельный",
    month: "Месячный",
    export: "Экспорт",
    noSales: "Продаж пока нет",
    changeFilters: "Измените фильтры",
    products: "Продукты",
    barcode: "Штрих-код",
    quantity: "Количество",
    price: "Цена",
    total: "Итого",
    time: "Время",
    currencyUnit: "сум"
  },
  en: {
    sales: "Sales",
    totalAmount: "Total Amount",
    uniqueProductsCount: "Unique Products Count",
    soldProducts: "Sold Products",
    searchPlaceholder: "Search by Barcode and Name",
    all: "All",
    today: "Daily",
    week: "Weekly",
    month: "Monthly",
    export: "Export",
    noSales: "No sales yet",
    changeFilters: "Change filters",
    products: "Products",
    barcode: "Barcode",
    quantity: "Quantity",
    price: "Price",
    total: "Total",
    time: "Time",
    currencyUnit: "UZS"
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