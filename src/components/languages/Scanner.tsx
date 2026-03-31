// Yangi fayl: components/languages/Scanner.tsx
import { useState, useEffect } from 'react';

type Language = 'uz' | 'ru' | 'en';

const translations: Record<Language, Record<string, string>> = {
  uz: {
    searching: "Qidirilmoqda...",
    productNotFound: "Mahsulot topilmadi",
    loginNotFound: "Login topilmadi",
    canceled: "Bekor qilindi",
    addToUserDBError: "Foydalanuvchi bazasiga qo'shishda xato",
    sold: "Sotildi",
    saleFailed: "Sotuv amalga oshmadi",
    qrBarcode: "QR/Barcode",
    sellViaQrCode: "QR/kod orqali sotish",
    camera: "Kamera",
    barcodeRead: "Barcode o'qildi",
    cartEmpty: "Sotuv bo'sh",
    total: "Jammi",
    sell: "Sotish",
    currencyUnit: "so'm",
    enterPrice: "Narx kiriting",
    manualInput: "Qo'l bilan kiritish",
    sellViaBarcodeOrName: "Barcode yoki nom orqali sotish",
    finalizeSale: "Sotuvni yakunlash",
    telegramCheck: "Telegram chek",
    sendCheckToTelegram: "Chekni telegramga yuborish",
    productsInList: "Ro'yxatdagi mahsulotlar",
    productName: "Mahsulot nomi",
    quantity: "Soni",
    price: "Narxi",
    subtotal: "Umumiy",
    enterBarcode: "Barkod raqamini kiriting",
    enterProductName: "Mahsulot nomini kiriting",
    sales: "Sotuvlar",
    salesLog: "Sotuvlar blogi",
    salesTerminal: "Sotuv terminali",
    sendToTelegram: "Telegramga yuborish",
    userSearchError: "Foydalanuvchi bazasidan qidirishda xato",
    generalSearchError: "Umumiy bazadan qidirishda xato",
    saleSaveError: "Sotuv saqlashda xato",
    finalizeSaleError: "Sotuvni yakunlashda xato",
    added: "dona qo'shildi",
    checkPrintedSuccessfully: "Chek muvaffaqiyatli chiqarildi",
    checkingPrinter: "Printer tekshirilmoqda...",
    printerConnected: "Printer ulangan",
    printerNotConnected: "Printer ulanmagan",
    noPrinterConnection: "Printer bilan aloqa yo'q",
    clickPaymentSoon: "Click orqali to'lov tez orada",
    paymePaymentSoon: "Payme orqali to'lov tez orada",
    uzumPaymentSoon: "Uzum Bank orqali to'lov tez orada",
    printerCheck: "Printer",
    printReceipt: "Printerdan chek chop etish",

    // ── PrinterButton matnlari ──────────────────────────────
    printerConnecting: "Printerga ulanmoqda...",
    receiptPreparing: "Chek tayyorlanmoqda...",
    receiptPrinted: "Chek chop etildi ✓",
    printing: "Chop etilmoqda...",
    ready: "Tayyor",
    printReceiptTitle: "Chek Chop Etish",
    pleaseWait: "Iltimos kuting",
    qrCashbackReceipt: "QR cashback bilan chek",
    connectionFailed: "Ulanib bo'lmadi",
    errorPrefix: "Xato",
    noPrinterSelected: "Printer tanlanmadi. Iltimos, USB printeringizni ulang va qaytadan bosing.",

    // ── ✅ Yangi qo'shildi ──────────────────────────────────
    outOfStock: "Mahsulot qolmagan",
  },
  ru: {
    searching: "Поиск...",
    productNotFound: "Продукт не найден",
    loginNotFound: "Логин не найден",
    canceled: "Отменено",
    addToUserDBError: "Ошибка добавления в базу пользователя",
    sold: "Продано",
    saleFailed: "Продажа не удалась",
    qrBarcode: "QR/Штрих-код",
    sellViaQrCode: "Продажа через QR/код",
    camera: "Камера",
    barcodeRead: "Штрих-код прочитан",
    cartEmpty: "Корзина пуста",
    total: "Итого",
    sell: "Продать",
    finalizeSale: "Завершить продажу",
    telegramCheck: "Чек в Telegram",
    sendCheckToTelegram: "Отправить чек в Telegram",
    productsInList: "Продукты в списке",
    productName: "Название продукта",
    quantity: "Количество",
    price: "Цена",
    subtotal: "Подытог",
    enterBarcode: "Введите штрих-код",
    enterProductName: "Введите название продукта",
    sales: "Продажи",
    currencyUnit: "сум",
    manualInput: "Ручной ввод",
    enterPrice: "Введите цену",
    sellViaBarcodeOrName: "Продажа через штрих-код или название",
    salesLog: "Журнал продаж",
    salesTerminal: "Терминал продаж",
    sendToTelegram: "Отправить в Telegram",
    userSearchError: "Ошибка поиска в базе пользователя",
    generalSearchError: "Ошибка поиска в общей базе",
    saleSaveError: "Ошибка сохранения продажи",
    finalizeSaleError: "Ошибка завершения продажи",
    added: "добавлено",
    checkPrintedSuccessfully: "Чек успешно напечатан",
    checkingPrinter: "Проверка принтера...",
    printerConnected: "Принтер подключен",
    printerNotConnected: "Принтер не подключен",
    noPrinterConnection: "Нет связи с принтером",
    clickPaymentSoon: "Оплата через Click скоро",
    paymePaymentSoon: "Оплата через Payme скоро",
    uzumPaymentSoon: "Оплата через Uzum Bank скоро",
    printerCheck: "Выбить чек на принтере",
    printReceipt: "Распечатать чек",

    // ── PrinterButton matnlari ──────────────────────────────
    printerConnecting: "Подключение к принтеру...",
    receiptPreparing: "Подготовка чека...",
    receiptPrinted: "Чек напечатан ✓",
    printing: "Печать...",
    ready: "Готово",
    printReceiptTitle: "Печать чека",
    pleaseWait: "Пожалуйста, подождите",
    qrCashbackReceipt: "Чек с QR кэшбэком",
    connectionFailed: "Не удалось подключиться",
    errorPrefix: "Ошибка",
    noPrinterSelected: "Принтер не выбран. Подключите USB-принтер и нажмите снова.",

    // ── ✅ Yangi qo'shildi ──────────────────────────────────
    outOfStock: "Товар закончился",
  },
  en: {
    searching: "Searching...",
    productNotFound: "Product not found",
    loginNotFound: "Login not found",
    canceled: "Canceled",
    addToUserDBError: "Error adding to user DB",
    sold: "Sold",
    saleFailed: "Sale failed",
    qrBarcode: "QR/Barcode",
    sellViaQrCode: "Sell via QR/code",
    camera: "Camera",
    barcodeRead: "Barcode read",
    cartEmpty: "Cart is empty",
    total: "Total",
    sell: "Sell",
    currencyUnit: "UZS",
    manualInput: "Manual input",
    sellViaBarcodeOrName: "Sell via barcode or name",
    finalizeSale: "Finalize sale",
    telegramCheck: "Telegram check",
    enterPrice: "Enter price",
    sendCheckToTelegram: "Send check to Telegram",
    productsInList: "Products in list",
    productName: "Product name",
    quantity: "Quantity",
    price: "Price",
    subtotal: "Subtotal",
    enterBarcode: "Enter barcode",
    enterProductName: "Enter product name",
    sales: "Sales",
    salesLog: "Sales log",
    salesTerminal: "Sales terminal",
    sendToTelegram: "Send to Telegram",
    userSearchError: "User search error",
    generalSearchError: "General search error",
    saleSaveError: "Sale save error",
    finalizeSaleError: "Finalize sale error",
    added: "added",
    checkPrintedSuccessfully: "Check printed successfully",
    checkingPrinter: "Checking printer...",
    printerConnected: "Printer connected",
    printerNotConnected: "Printer not connected",
    noPrinterConnection: "No printer connection",
    clickPaymentSoon: "Payment via Click soon",
    paymePaymentSoon: "Payment via Payme soon",
    uzumPaymentSoon: "Payment via Uzum Bank soon",
    printerCheck: "PrinterCheck",
    printReceipt: "Print a receipt",

    // ── PrinterButton matnlari ──────────────────────────────
    printerConnecting: "Connecting to printer...",
    receiptPreparing: "Preparing receipt...",
    receiptPrinted: "Receipt printed ✓",
    printing: "Printing...",
    ready: "Ready",
    printReceiptTitle: "Print Receipt",
    pleaseWait: "Please wait",
    qrCashbackReceipt: "Receipt with QR cashback",
    connectionFailed: "Could not connect",
    errorPrefix: "Error",
    noPrinterSelected: "No printer selected. Please connect your USB printer and try again.",

    // ── ✅ Yangi qo'shildi ──────────────────────────────────
    outOfStock: "Product out of stock",
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

export const TranslationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
};