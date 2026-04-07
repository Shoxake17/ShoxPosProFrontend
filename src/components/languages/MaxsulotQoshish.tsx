// Yangi fayl: components/languages/MaxsulotQoshish.tsx
import { useState, useEffect } from 'react';

type Language = 'uz' | 'ru' | 'en';

const translations: Record<Language, Record<string, string>> = {
  uz: {
    newProduct: "Mahsulot Qo'shish",
    dbLoading: "Lokal baza yuklanmoqda...",
    productName: "Mahsulot nomi",
    productNamePlaceholder: "Masalan: Coca-Cola 1.5L",
    wholesalePrice: "Ulgurji narxi",
    salePrice: "Sotuv narxi",
    barcode: "Barcode",
    quantity: "Miqdori",
    category: "Kategoriya",
    selectCategory: "Kategoriya tanlang",
    grainFlour: "Don va un",
    meat: "Go'sht va baliq mahsulotlari",
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
    saveProduct: "Mahsulotni Saqlash",
    saving: "Saqlanmoqda...",
    successMessage: "Mahsulot muvaffaqiyatli qo'shildi!",
    errorRequired: "Majburiy maydonlarni to'ldiring!",
    errorServer: "Serverda xatolik",
    required: "*"
  },
  ru: {
    newProduct: "Добавить продукт",
    dbLoading: "Загрузка локальной базы...",
    productName: "Название продукта",
    productNamePlaceholder: "Например: Coca-Cola 1.5L",
    wholesalePrice: "Оптовая цена",
    salePrice: "Розничная цена",
    barcode: "Штрих-код",
    quantity: "Количество",
    category: "Категория",
    selectCategory: "Выберите категорию",
    grainFlour: "Зерно и мука",
    meat: "Мясо и рыба",
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
    saveProduct: "Сохранить продукт",
    saving: "Сохранение...",
    successMessage: "Продукт успешно добавлен!",
    errorRequired: "Заполните обязательные поля!",
    errorServer: "Ошибка на сервере",
    required: "*"
  },
  en: {
    newProduct: "Add Product",
    dbLoading: "Loading local database...",
    productName: "Product name",
    productNamePlaceholder: "For example: Coca-Cola 1.5L",
    wholesalePrice: "Wholesale price",
    salePrice: "Sale price",
    barcode: "Barcode",
    quantity: "Quantity",
    category: "Category",
    selectCategory: "Select category",
    grainFlour: "Grain and flour",
    meat: "Meat and fish",
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
    saveProduct: "Save Product",
    saving: "Saving...",
    successMessage: "Product added successfully!",
    errorRequired: "Fill in required fields!",
    errorServer: "Server error",
    required: "*"
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
