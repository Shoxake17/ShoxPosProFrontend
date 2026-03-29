// src/components/languages/NotificationLanguager.tsx

type Language = 'uz' | 'ru' | 'en';

export const translations = {
  uz: {
    title: "Bildirishnomalar",
    emptyState: "Barcha mahsulotlar yetarli",
    outOfStockLabel: "Tugagan mahsulotlar",
    outOfStockSub: "Tugadi! Tezroq xarid qiling",
    criticalStockLabel: "Kritik darajada kam (1–5 dona)",
    criticalStockSub: "Tez orada tugaydi — xarid qiling",
    lowStockLabel: "Oz qolgan",
    lowStockSub: "Zaxira ozayib bormoqda",
    itemUnit: "dona",
    footerTotalPrefix: "Jami",
    footerTotalSuffix: "ta mahsulotga e'tibor bering",
  },
  ru: {
    title: "Уведомления",
    emptyState: "Все товары в достаточном количестве",
    outOfStockLabel: "Закончившиеся товары",
    outOfStockSub: "Закончилось! Срочно закупите",
    criticalStockLabel: "Критически мало (1–5 шт.)",
    criticalStockSub: "Скоро закончится — закупите",
    lowStockLabel: "Мало в наличии",
    lowStockSub: "Запасы уменьшаются",
    itemUnit: "шт",
    footerTotalPrefix: "Всего",
    footerTotalSuffix: "товаров требуют внимания",
  },
  en: {
    title: "Notifications",
    emptyState: "All products are in stock",
    outOfStockLabel: "Out of stock items",
    outOfStockSub: "Out of stock! Purchase soon",
    criticalStockLabel: "Critically low (1–5 pcs)",
    criticalStockSub: "Ending soon — buy now",
    lowStockLabel: "Low stock",
    lowStockSub: "Stock is running low",
    itemUnit: "pcs",
    footerTotalPrefix: "Total",
    footerTotalSuffix: "items need attention",
  }
};

export const getTranslation = (lang: Language, key: keyof typeof translations['uz']) => {
  return translations[lang][key] || translations['uz'][key];
};