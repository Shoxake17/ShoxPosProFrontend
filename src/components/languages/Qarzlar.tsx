// Yangi fayl: components/languages/Qarzlar.tsx
import { useState, useEffect } from 'react';

type Language = 'uz' | 'ru' | 'en';

const translations: Record<Language, Record<string, string>> = {
  uz: {
    debts: "Qarzlar",
    totalDebt: "Umumiy qarz",
    debtorsCount: "Qarzdorlar soni",
    averageDebt: "O'rtacha qarz",
    addNewDebt: "Yangi qarz qo'shish",
    name: "Ism",
    phone: "Telefon raqam",
    debtAmount: "Qarzdorlik summa",
    add: "Qo'shish",
    debtorsList: "Qarzdorlar ro'yhati",
    number: "№",
    nameHeader: "Ism",
    phoneHeader: "Telefon",
    amountHeader: "Summa",
    date: "Sana",
    action: "Amal",
    pay: "To'lov",
    noDebtsYet: "Hozircha qarzlar yo'q",
    loading: "Yuklanmoqda...",
    fillAllFieldsCorrectly: "Ma'lumotlarni to'g'ri kiriting",
    invalidAmountEntered: "Noto'g'ri suma kiritildi",
    sessionExpired: "Sessiya tugagan. Qayta kirish kerak.",
    paymentError: "To'lovda xato yuz berdi",
    serverConnectionError: "Server bilan aloqa xatosi",
    debtsNotLoaded: "Qarzlar yuklanmadi",
    fetchError: "Fetch xatosi",
    serverDisconnected: "Server bilan aloqa uzildi",
    debtsLoadError: "Qarzlar yuklashda xato yuz berdi",
    addDebtError: "Qarz qo'shishda xato",
    currencyUnit: "so'm",
    paymentPrompt: "{name} uchun to'lov summasini kiriting (qolgan: {amount} so'm)",
    debtFullyPaid: "Qarz to'liq to'landi",
    partialPayment: "Qisman to'lov qilindi. Qoldiq: {remainder} so'm",
    enterDebtorName: "Qarzdor ismini kiriting",
    success: "Muvaffaqiyatli",
    enterAmount: "Summani kiriting",
    cancel: "Bekor qilish",
    confirm: "Tasdiqlash"
  },
  ru: {
    debts: "Долги",
    totalDebt: "Общий долг",
    debtorsCount: "Количество должников",
    averageDebt: "Средний долг",
    addNewDebt: "Добавить новый долг",
    name: "Имя",
    phone: "Номер телефона",
    debtAmount: "Сумма долга",
    add: "Добавить",
    debtorsList: "Список должников",
    number: "№",
    nameHeader: "Имя",
    phoneHeader: "Телефон",
    amountHeader: "Сумма",
    date: "Дата",
    action: "Действие",
    pay: "Оплата",
    noDebtsYet: "Пока нет долгов",
    loading: "Загрузка...",
    fillAllFieldsCorrectly: "Заполните все поля правильно",
    invalidAmountEntered: "Неверная сумма введена",
    sessionExpired: "Сессия истекла. Требуется повторный вход.",
    paymentError: "Ошибка в оплате",
    serverConnectionError: "Ошибка связи с сервером",
    debtsNotLoaded: "Долги не загружены",
    fetchError: "Ошибка fetch",
    serverDisconnected: "Связь с сервером прервана",
    debtsLoadError: "Ошибка загрузки долгов",
    addDebtError: "Ошибка добавления долга",
    currencyUnit: "сум",
    paymentPrompt: "Введите сумму оплаты для {name} (осталось: {amount} сум)",
    debtFullyPaid: "Долг полностью оплачен",
    partialPayment: "Частичная оплата. Остаток: {remainder} сум",
    enterDebtorName: "Введите имя должника",
    success: "Успешно",
    enterAmount: "Введите сумму",
    cancel: "Отмена",
    confirm: "Подтвердить"
  },
  en: {
    debts: "Debts",
    totalDebt: "Total Debt",
    debtorsCount: "Debtors Count",
    averageDebt: "Average Debt",
    addNewDebt: "Add New Debt",
    name: "Name",
    phone: "Phone Number",
    debtAmount: "Debt Amount",
    add: "Add",
    debtorsList: "Debtors List",
    number: "№",
    nameHeader: "Name",
    phoneHeader: "Phone",
    amountHeader: "Amount",
    date: "Date",
    action: "Action",
    pay: "Pay",
    noDebtsYet: "No debts yet",
    loading: "Loading...",
    fillAllFieldsCorrectly: "Fill all fields correctly",
    invalidAmountEntered: "Invalid amount entered",
    sessionExpired: "Session expired. Re-login required.",
    paymentError: "Payment error occurred",
    serverConnectionError: "Server connection error",
    debtsNotLoaded: "Debts not loaded",
    fetchError: "Fetch error",
    serverDisconnected: "Server connection lost",
    debtsLoadError: "Error loading debts",
    addDebtError: "Error adding debt",
    currencyUnit: "UZS",
    paymentPrompt: "Enter payment amount for {name} (remaining: {amount} UZS)",
    debtFullyPaid: "Debt fully paid",
    partialPayment: "Partial payment. Remainder: {remainder} UZS",
    enterDebtorName: "Enter debtor name",
    success: "Success",
    enterAmount: "Enter amount",
    cancel: "Cancel",
    confirm: "Confirm"
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