// Yangi fayl: components/languages/MaxsulotBazasi.tsx
import { useState, useEffect } from 'react';

type Language = 'uz' | 'ru' | 'en';

const translations: Record<Language, Record<string, string>> = {
  uz: {
    productsDatabase: "Mahsulotlar Bazasi",
    searchPlaceholder: "Barcode yoki nom...",
    allCategories: "Barcha kategoriyalar",
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
    number: "№",
    barcode: "Barcode",
    productName: "Mahsulot Nomi",
    price: "Narxi (so'm)",
    quantity: "Miqdori",
    category: "Kategoriya",
    actions: "Amallar",
    noData: "Ma'lumot topilmadi",
    deleteConfirm: "O'chirilsinmi?",
    searchError: "Qidiruv xatosi",
    loadError: "Yuklanmadi"
  },
  ru: {
    productsDatabase: "База продуктов",
    searchPlaceholder: "Штрих-код или название...",
    allCategories: "Все категории",
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
    vehicles: "Транспортные средства",
    hygiene: "Средства гигиены",
    kitchenware: "Кухонная утварь",
    babyProducts: "Детские товары",
    stationery: "Канцелярия",
    petProducts: "Товары для животных",
    medicine: "Лекарства",
    number: "№",
    barcode: "Штрих-код",
    productName: "Название продукта",
    price: "Цена (сум)",
    quantity: "Количество",
    category: "Категория",
    actions: "Действия",
    noData: "Данные не найдены",
    deleteConfirm: "Удалить?",
    searchError: "Ошибка поиска",
    loadError: "Не загружено"
  },
  en: {
    productsDatabase: "Products Database",
    searchPlaceholder: "Barcode or name...",
    allCategories: "All categories",
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
    vehicles: "Vehicles",
    hygiene: "Hygiene products",
    kitchenware: "Kitchenware",
    babyProducts: "Baby products",
    stationery: "Stationery",
    petProducts: "Pet products",
    medicine: "Medicine",
    number: "№",
    barcode: "Barcode",
    productName: "Product Name",
    price: "Price (sum)",
    quantity: "Quantity",
    category: "Category",
    actions: "Actions",
    noData: "No data found",
    deleteConfirm: "Delete?",
    searchError: "Search error",
    loadError: "Not loaded"
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