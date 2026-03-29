// src/components/languages/ProtectRouterLanguages.tsx

type Language = 'uz' | 'ru' | 'en';

export const translations = {
  uz: {
    securityTitle: "ShoxPosPro Xavfsizlik",
    accessDenied: "RUXSAT BERILMADI",
    checkingAuth: "Tizimga kirish tekshirilmoqda...",
    sessionInvalid: "Sessiya tasdiqlanmadi. Qayta kirish talab etiladi.",
    redirecting: "Login sahifasiga yo'naltirilmoqda...",
    noUserError: "Foydalanuvchi ma'lumotlari topilmadi.",
  },
  ru: {
    securityTitle: "ShoxPosPro Безопасность",
    accessDenied: "ДОСТУП ЗАПРЕЩЕН",
    checkingAuth: "Проверка авторизации...",
    sessionInvalid: "Сессия не подтверждена. Требуется повторный вход.",
    redirecting: "Перенаправление на страницу входа...",
    noUserError: "Данные пользователя не найдены.",
  },
  en: {
    securityTitle: "ShoxPosPro Security",
    accessDenied: "ACCESS DENIED",
    checkingAuth: "Checking authorization...",
    sessionInvalid: "Session not verified. Re-login required.",
    redirecting: "Redirecting to login page...",
    noUserError: "User data not found.",
  }
};

export const getTranslation = (lang: Language, key: keyof typeof translations['uz']) => {
  return translations[lang][key] || translations['uz'][key];
};