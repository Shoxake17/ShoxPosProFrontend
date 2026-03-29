// components/languages/KirimBazasi.tsx
import { useState, useEffect } from 'react';

type Language = 'uz' | 'ru' | 'en';

const translations: Record<Language, Record<string, string>> = {
  uz: {
    KirimBazasi: "Kirim Bazasi",
    chiqimNarxKiriting: "Chiqim narxni kiriting (so'm):",
    narxNotogri: "Narx noto'g'ri",
    miqdorKiriting: "Miqdorni kiriting:",
    miqdorNotogri: "Miqdor noto'g'ri",
    kirimQoshilmadi: "Kirim qo'shilmadi",
    xatoYuzBerdi: "Xato yuz berdi",
    loadError: "Yuklanmadi",
    BarcodeOrNom: "Barcode yoki nom...",
    MaxsulotQoshish: "Mahsulot qo'shish",
    UmumiyKirim: "Umumiy kirim",
    UmumiyChiqim: "Umumiy chiqim",
    MaxsulotTurlariSoni: "Mahsulot turlari soni",
    UmumiyChiqimMiqdori: "Umumiy chiqim miqdori",
    som: "so'm",
    noData: "Hozircha ulgurji kirim yo'q",
    N: "№",
    Barcode: "Barcode",
    MahsulotNomi: "Mahsulot nomi",
    ChiqimNarx: "Chiqim narx",
    Miqdori: "Miqdori",
    Kategoriya: "Kategoriya",
    MaxsulotTanlash: "Mahsulot tanlash (Umumiy bazadan)",
    BarcodeOrNomBoyichaQidirish: "Barcode yoki nom bo'yicha qidirish...",
    yuklanmoqda: "Yuklanmoqda...",
    HechNarsaTopilmadi: "Hech narsa topilmadi",
    noProductsLeft: "Qo'shish uchun mahsulot qolmadi",
    KirimQoshish: "Kirim qo'shish",
    Narxi: "Narxi",
    Amal: "Amal",
    barchaKategoriyalar: "Barcha kategoriyalar",
    donVaUn: "🌾 Don va un",
    gosht: "🥩 Go'sht",
    sabzavot: "🥬 Sabzavot",
    mevalar: "🍎 Mevalar",
    ichimliklar: "🧃 Ichimliklar",
    yog: "🧈 Yog'",
    sutMahsulotlari: "🥛 Sut mahsulotlari",
    qandolatMahsulotlari: "🍫 Qandolat mahsulotlari",
    kiyim: "🧥 Kiyim",
    texnika: "🛠️ Texnika",
    vehicles: "🚗 Avtotransport vositalari",
    gigiyenaVositalari: "🧼 Gigiyena vositalari",
    oshxonaJihozlari: "🍽️ Oshxona jihozlari",
    bolalarMahsulotlari: "🧸 Bolalar mahsulotlari",
    kantselyariyaMahsulotlari: "✏️ Kantselyariya mahsulotlari",
    uyHayvonlariUchunTovarlar: "🐶 Uy hayvonlari uchun tovarlar",
    dorilar: "💊 Dorilar",
    Daromad: "Daromad",

    // ── KirimBazasi sahifasi qo'shimcha matnlari ───────────
    sotilganMiqdor: "Sotilgan miqdor",
    jadvalYuklanmoqda: "⏳ Yuklanmoqda...",
    narxYangilandi: "Narx yangilandi",
    miqdorYangilandi: "Miqdor yangilandi",
    offlineSaqlandi: "📴 Offline saqlandi — keyinchalik sync bo'ladi",
    internetYoq: "Internet yo'q",
    barchiMalumotYuklandi: "Barcha ma'lumot yuklandi",
    ozgarishSyncBoldi: "{count} ta o'zgarish sync bo'ldi",
  },
  ru: {
    KirimBazasi: "База Входа",
    chiqimNarxKiriting: "Введите цену выхода (сум):",
    narxNotogri: "Цена неверна",
    miqdorKiriting: "Введите количество:",
    miqdorNotogri: "Количество неверно",
    kirimQoshilmadi: "Вход не добавлен",
    xatoYuzBerdi: "Произошла ошибка",
    loadError: "Не загружено",
    BarcodeOrNom: "Barcode или имя...",
    MaxsulotQoshish: "Добавить продукт",
    UmumiyKirim: "Общий вход",
    UmumiyChiqim: "Общий выход",
    MaxsulotTurlariSoni: "Количество типов продуктов",
    UmumiyChiqimMiqdori: "Общее количество выхода",
    som: "сум",
    noData: "Пока нет оптовых входов",
    N: "№",
    Barcode: "Barcode",
    MahsulotNomi: "Название продукта",
    ChiqimNarx: "Цена выхода",
    Miqdori: "Количество",
    Kategoriya: "Категория",
    MaxsulotTanlash: "Выбор продукта (Из общей базы)",
    BarcodeOrNomBoyichaQidirish: "Поиск по barcode или имени...",
    yuklanmoqda: "Загрузка...",
    HechNarsaTopilmadi: "Ничего не найдено",
    noProductsLeft: "Нет продуктов для добавления",
    KirimQoshish: "Добавить вход",
    Narxi: "Цена",
    Amal: "Действие",
    barchaKategoriyalar: "Все категории",
    donVaUn: "🌾 Зерно и мука",
    gosht: "🥩 Мясо",
    sabzavot: "🥬 Овощи",
    mevalar: "🍎 Фрукты",
    ichimliklar: "🧃 Напитки",
    yog: "🧈 Масло",
    sutMahsulotlari: "🥛 Молочные продукты",
    qandolatMahsulotlari: "🍫 Кондитерские изделия",
    kiyim: "🧥 Одежда",
    texnika: "🛠️ Техника",
    vehicles: "🚗 Автотранспортные средства",
    gigiyenaVositalari: "🧼 Средства гигиены",
    oshxonaJihozlari: "🍽️ Кухонные принадлежности",
    bolalarMahsulotlari: "🧸 Детские товары",
    kantselyariyaMahsulotlari: "✏️ Канцелярские товары",
    uyHayvonlariUchunTovarlar: "🐶 Товары для домашних животных",
    dorilar: "💊 Лекарства",
    Daromad: "Доход",

    // ── KirimBazasi sahifasi qo'shimcha matnlari ───────────
    sotilganMiqdor: "Проданное количество",
    jadvalYuklanmoqda: "⏳ Загрузка...",
    narxYangilandi: "Цена обновлена",
    miqdorYangilandi: "Количество обновлено",
    offlineSaqlandi: "📴 Сохранено офлайн — синхронизируется позже",
    internetYoq: "Нет интернета",
    barchiMalumotYuklandi: "Все данные загружены",
    ozgarishSyncBoldi: "{count} изменений синхронизировано",
  },
  en: {
    KirimBazasi: "Incoming Base",
    chiqimNarxKiriting: "Enter exit price (UZS):",
    narxNotogri: "Price is invalid",
    miqdorKiriting: "Enter quantity:",
    miqdorNotogri: "Quantity is invalid",
    kirimQoshilmadi: "Incoming not added",
    xatoYuzBerdi: "An error occurred",
    loadError: "Not loaded",
    BarcodeOrNom: "Barcode or name...",
    MaxsulotQoshish: "Add product",
    UmumiyKirim: "Total incoming",
    UmumiyChiqim: "Total outgoing",
    MaxsulotTurlariSoni: "Number of product types",
    UmumiyChiqimMiqdori: "Total outgoing quantity",
    som: "UZS",
    noData: "No wholesale incomings yet",
    N: "№",
    Barcode: "Barcode",
    MahsulotNomi: "Product name",
    ChiqimNarx: "Exit price",
    Miqdori: "Quantity",
    Kategoriya: "Category",
    MaxsulotTanlash: "Select product (From general base)",
    BarcodeOrNomBoyichaQidirish: "Search by barcode or name...",
    yuklanmoqda: "Loading...",
    HechNarsaTopilmadi: "Nothing found",
    noProductsLeft: "No products left to add",
    KirimQoshish: "Add incoming",
    Narxi: "Price",
    Amal: "Action",
    barchaKategoriyalar: "All categories",
    donVaUn: "🌾 Grain and flour",
    gosht: "🥩 Meat",
    sabzavot: "🥬 Vegetables",
    mevalar: "🍎 Fruits",
    ichimliklar: "🧃 Beverages",
    yog: "🧈 Oil",
    sutMahsulotlari: "🥛 Dairy products",
    qandolatMahsulotlari: "🍫 Confectionery",
    kiyim: "🧥 Clothing",
    texnika: "🛠️ Equipment",
    vehicles: "🚗 Vehicles",
    gigiyenaVositalari: "🧼 Hygiene products",
    oshxonaJihozlari: "🍽️ Kitchen utensils",
    bolalarMahsulotlari: "🧸 Children's products",
    kantselyariyaMahsulotlari: "✏️ Stationery",
    uyHayvonlariUchunTovarlar: "🐶 Pet products",
    dorilar: "💊 Medicines",
    Daromad: "Income",

    // ── KirimBazasi sahifasi qo'shimcha matnlari ───────────
    sotilganMiqdor: "Sold quantity",
    jadvalYuklanmoqda: "⏳ Loading...",
    narxYangilandi: "Price updated",
    miqdorYangilandi: "Quantity updated",
    offlineSaqlandi: "📴 Saved offline — will sync later",
    internetYoq: "No internet",
    barchiMalumotYuklandi: "All data loaded",
    ozgarishSyncBoldi: "{count} changes synced",
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

// TranslationProvider
export const TranslationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
};