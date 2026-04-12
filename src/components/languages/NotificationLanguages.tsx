// src/components/languages/NotificationLanguages.tsx

type Language = 'uz' | 'ru' | 'en';

export const translations = {
  uz: {
    // ── Mavjud kalitlar ───────────────────────────────────────────
    title:               "Bildirishnomalar",
    emptyState:          "Barcha mahsulotlar yetarli",
    outOfStockLabel:     "Tugagan mahsulotlar",
    outOfStockSub:       "Tugadi! Tezroq xarid qiling",
    criticalStockLabel:  "Kritik darajada kam (1–5 dona)",
    criticalStockSub:    "Tez orada tugaydi — xarid qiling",
    lowStockLabel:       "Oz qolgan",
    lowStockSub:         "Zaxira ozayib bormoqda",
    itemUnit:            "dona",
    footerTotalPrefix:   "Jami",
    footerTotalSuffix:   "ta mahsulotga e'tibor bering",

    // ── NotifCard ─────────────────────────────────────────────────
    outLabel:            "Tugadi!",
    outSublabel:         "Tezroq xarid qiling",
    warnLabel:           "Kritik!",
    warnSublabel:        "Zaxira juda kam",
    cautionLabel:        "Kam qoldi",
    cautionSublabel:     "E'tibor bering",

    // ── Panel Header ──────────────────────────────────────────────
    headerSubtitle:      "ta mahsulotga e'tibor bering",
    allGood:             "Hamma narsa yaxshi",

    // ── Filter pills ──────────────────────────────────────────────
    filterOut:           "Tugagan",
    filterCritical:      "Kritik",
    filterLow:           "Kam qoldi",

    // ── Empty state ───────────────────────────────────────────────
    allGoodTitle:        "Hammasi joyida!",
    noNotifications:     "Hozircha bildirishnomalar yo'q",
  },

  ru: {
    // ── Mavjud kalitlar ───────────────────────────────────────────
    title:               "Уведомления",
    emptyState:          "Все товары в достаточном количестве",
    outOfStockLabel:     "Закончившиеся товары",
    outOfStockSub:       "Закончилось! Срочно закупите",
    criticalStockLabel:  "Критически мало (1–5 шт.)",
    criticalStockSub:    "Скоро закончится — закупите",
    lowStockLabel:       "Мало в наличии",
    lowStockSub:         "Запасы уменьшаются",
    itemUnit:            "шт",
    footerTotalPrefix:   "Всего",
    footerTotalSuffix:   "товаров требуют внимания",

    // ── NotifCard ─────────────────────────────────────────────────
    outLabel:            "Закончился!",
    outSublabel:         "Срочно закупите",
    warnLabel:           "Критично!",
    warnSublabel:        "Запасов очень мало",
    cautionLabel:        "Мало осталось",
    cautionSublabel:     "Обратите внимание",

    // ── Panel Header ──────────────────────────────────────────────
    headerSubtitle:      "товаров требуют внимания",
    allGood:             "Всё хорошо",

    // ── Filter pills ──────────────────────────────────────────────
    filterOut:           "Закончился",
    filterCritical:      "Критично",
    filterLow:           "Мало",

    // ── Empty state ───────────────────────────────────────────────
    allGoodTitle:        "Всё в порядке!",
    noNotifications:     "Уведомлений пока нет",
  },

  en: {
    // ── Mavjud kalitlar ───────────────────────────────────────────
    title:               "Notifications",
    emptyState:          "All products are in stock",
    outOfStockLabel:     "Out of stock items",
    outOfStockSub:       "Out of stock! Purchase soon",
    criticalStockLabel:  "Critically low (1–5 pcs)",
    criticalStockSub:    "Ending soon — buy now",
    lowStockLabel:       "Low stock",
    lowStockSub:         "Stock is running low",
    itemUnit:            "pcs",
    footerTotalPrefix:   "Total",
    footerTotalSuffix:   "items need attention",

    // ── NotifCard ─────────────────────────────────────────────────
    outLabel:            "Out of stock!",
    outSublabel:         "Purchase immediately",
    warnLabel:           "Critical!",
    warnSublabel:        "Stock is very low",
    cautionLabel:        "Low stock",
    cautionSublabel:     "Pay attention",

    // ── Panel Header ──────────────────────────────────────────────
    headerSubtitle:      "items need attention",
    allGood:             "Everything is fine",

    // ── Filter pills ──────────────────────────────────────────────
    filterOut:           "Out of stock",
    filterCritical:      "Critical",
    filterLow:           "Low",

    // ── Empty state ───────────────────────────────────────────────
    allGoodTitle:        "All good!",
    noNotifications:     "No notifications yet",

    // ── Footer ────────────────────────────────────────────────────
  }
};

export type NotificationTranslationKey = keyof typeof translations['uz'];

export const getTranslation = (
  lang: Language,
  key: NotificationTranslationKey
): string => {
  return translations[lang]?.[key] || translations['uz'][key] || key;
};
