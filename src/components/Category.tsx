import { categoryTranslations } from './languages/Category';

export interface CategoryOption {
  value: string;
  label: string;
}

// Hozirgi tilga qarab kategoriyalarni olish funksiyasi
export const getCategories = (lang: string = 'uz'): CategoryOption[] => {
  const t = (categoryTranslations as any)[lang] || categoryTranslations.uz;
  
  return [
    { value: '', label: t.allCategories }, // Bu yerda emoji yo'q, faqat matn
    { value: 'Don va un', label: `🌾 ${t.grainFlour}` },
    { value: "Go'sht", label: `🥩 ${t.meat}` },
    { value: 'Sabzavot', label: `🥬 ${t.vegetables}` },
    { value: 'Mevalar', label: `🍎 ${t.fruits}` },
    { value: 'Ichimliklar', label: `🧃 ${t.drinks}` },
    { value: 'Yog\'', label: `🧈 ${t.oil}` },
    { value: 'Sut mahsulotlari', label: `🥛 ${t.dairy}` },
    { value: 'Qandolat mahsulotlari', label: `🍫 ${t.sweets}` },
    { value: 'Kiyim', label: `🧥 ${t.clothing}` },
    { value: 'Texnika', label: `🛠️ ${t.electronics}` },
    { value: 'Avtotransport vositalari', label: `🚗 ${t.vehicles}` },
    { value: 'Gigiyena vositalari', label: `🧼 ${t.hygiene}` },
    { value: 'Oshxona jihozlari', label: `🍽️ ${t.kitchenware}` },
    { value: 'Bolalar mahsulotlari', label: `🧸 ${t.babyProducts}` },
    { value: 'Kantselyariya mahsulotlari', label: `✏️ ${t.stationery}` },
    { value: 'Uy hayvonlari uchun tovarlar', label: `🐶 ${t.petProducts}` },
    { value: 'Dorilar', label: `💊 ${t.medicine}` },
  ];
};

// Bazadagi qiymatni tilga qarab tarjima qilish
export const translateCategory = (value: string, lang: string = 'uz'): string => {
  const t = (categoryTranslations as any)[lang] || categoryTranslations.uz;
  
  // Agar qiymat bo'sh bo'lsa "Barcha kategoriyalar" matnini qaytaradi
  if (!value || value === '') return t.allCategories;

  const map: any = {
    'Don va un': t.grainFlour,
    "Go'sht": t.meat,
    'Sabzavot': t.vegetables,
    'Mevalar': t.fruits,
    'Ichimliklar': t.drinks,
    'Yog\'': t.oil,
    'Sut mahsulotlari': t.dairy,
    'Qandolat mahsulotlari': t.sweets,
    'Kiyim': t.clothing,
    'Texnika': t.electronics,
    'Avtotransport vositalari': t.vehicles,
    'Gigiyena vositalari': t.hygiene,
    'Oshxona jihozlari': t.kitchenware,
    'Bolalar mahsulotlari': t.babyProducts,
    'Kantselyariya mahsulotlari': t.stationery,
    'Uy hayvonlari uchun tovarlar': t.petProducts,
    'Dorilar': t.medicine
  };
  return map[value] || value;
};

// Faqat emojini olish uchun (Agar qiymat bo'sh bo'lsa, emoji qaytarmaydi)
export const getCategoryEmoji = (value: string): string => {
  if (!value || value === '') return ''; // Bo'sh bo'lsa emoji ko'rsatmaymiz

  const emojis: any = {
    'Don va un': '🌾', 
    "Go'sht": '🥩', 
    'Sabzavot': '🥬', 
    'Mevalar': '🍎',
    'Ichimliklar': '🧃', 
    'Yog\'': '🧈', 
    'Sut mahsulotlari': '🥛',
    'Qandolat mahsulotlari': '🍫', 
    'Kiyim': '🧥', 
    'Texnika': '🛠️', 
    'Avtotransport vositalari': '🚗', 
    'Gigiyena vositalari': '🧼',
     'Oshxona jihozlari': '🍽️',
    'Bolalar mahsulotlari': '🧸', 
    'Kantselyariya mahsulotlari': '✏️',
    'Uy hayvonlari uchun tovarlar': '🐶', 
    'Dorilar': '💊'
  };
  return emojis[value] ? emojis[value] + ' ' : '';
};