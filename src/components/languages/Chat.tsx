import { useRef } from "react";

// ─── Til tizimi — Settings.tsx dagi kabi localStorage dan o'qiladi ───────
const getLanguage = (): string => {
  try {
    return localStorage.getItem("language") || "uz";
  } catch {
    return "uz";
  }
};

// ─── Tarjimalar ───────────────────────────────────────────────────────────
interface TranslationKeys {
  errorLoadingUsers: string;
  errorLoadingHistory: string;
  confirmDeleteChatHistory: string;
  errorDeletingHistory: string;
  secretToggleError: string;
  userNotFound: string;
  messages: string;
  myId: string;
  searchById: string;
  supportShoxPosPro: string;
  noMessage: string;
  online: string;
  offline: string;
  openProfile: string;
  secretProfile: string;
  edited: string;
  editing: string;
  cancel: string;
  writeAMessage: string;
  startAConversation: string;
  selectUserToWriteMessage: string;
  deleteHistory: string;
  confirmDelete: string;
  adminAvatarPlaceholder: string;
}

const translations: Record<string, TranslationKeys> = {
  uz: {
    errorLoadingUsers:        "Foydalanuvchilarni yuklashda xato:",
    errorLoadingHistory:      "Tarixni yuklashda xato:",
    confirmDeleteChatHistory: "Chat tarixini o'chirishni tasdiqlaysizmi?",
    errorDeletingHistory:     "Tarixni o'chirishda xato:",
    secretToggleError:        "Secret toggle xatosi:",
    userNotFound:             "Foydalanuvchi topilmadi",
    messages:                 "Xabarlar",
    myId:                     "Mening ID:",
    searchById:               "ID orqali qidirish...",
    supportShoxPosPro:        "Support ShoxPosPro",
    noMessage:                "Xabar yo'q",
    online:                   "onlayn",
    offline:                  "offlayn",
    openProfile:              "Profilni ochish",
    secretProfile:            "Maxfiy Profil",
    edited:                   "tahrirlandi",
    editing:                  "Tahrirlash...",
    cancel:                   "Bekor qilish",
    writeAMessage:            "Xabar yozing...",
    startAConversation:       "Muloqotni boshlang",
    selectUserToWriteMessage: "Xabar yozish uchun foydalanuvchini tanlang",
    deleteHistory:            "Tarixni o'chirish",
    confirmDelete:            "O'chirish",
    adminAvatarPlaceholder: "A",
  },
  ru: {
    errorLoadingUsers:        "Ошибка загрузки пользователей:",
    errorLoadingHistory:      "Ошибка загрузки истории:",
    confirmDeleteChatHistory: "Подтвердите удаление истории чата?",
    errorDeletingHistory:     "Ошибка при удалении истории:",
    secretToggleError:        "Ошибка переключения секрета:",
    userNotFound:             "Пользователь не найден",
    messages:                 "Сообщения",
    myId:                     "Мой ID:",
    searchById:               "Поиск по ID...",
    supportShoxPosPro:        "Поддержка ShoxPosPro",
    noMessage:                "Нет сообщений",
    online:                   "онлайн",
    offline:                  "оффлайн",
    openProfile:              "Открыть профиль",
    secretProfile:            "Секретный профиль",
    edited:                   "отредактировано",
    editing:                  "Редактирование...",
    cancel:                   "Отмена",
    writeAMessage:            "Напишите сообщение...",
    startAConversation:       "Начать разговор",
    selectUserToWriteMessage: "Выберите пользователя для написания сообщения",
    deleteHistory:            "Удалить историю",
    confirmDelete:            "Удалить",
    adminAvatarPlaceholder: "A",
  },
  en: {
    errorLoadingUsers:        "Error loading users:",
    errorLoadingHistory:      "Error loading history:",
    confirmDeleteChatHistory: "Confirm deleting chat history?",
    errorDeletingHistory:     "Error deleting history:",
    secretToggleError:        "Secret toggle error:",
    userNotFound:             "User not found",
    messages:                 "Messages",
    myId:                     "My ID:",
    searchById:               "Search by ID...",
    supportShoxPosPro:        "Support ShoxPosPro",
    noMessage:                "No message",
    online:                   "online",
    offline:                  "offline",
    openProfile:              "Open Profile",
    secretProfile:            "Secret Profile",
    edited:                   "edited",
    editing:                  "Editing...",
    cancel:                   "Cancel",
    writeAMessage:            "Write a message...",
    startAConversation:       "Start a conversation",
    selectUserToWriteMessage: "Select a user to write a message",
    deleteHistory:            "Delete history",
    confirmDelete:            "Delete",
    adminAvatarPlaceholder: "A",
  },
};

// ─── Hook ─────────────────────────────────────────────────────────────────
export const useTranslation = () => {
  const language   = getLanguage();
  const langData   = translations[language] || translations.uz;
  const tRef       = useRef(langData);

  // Til o'zgarganda ref ni yangilaymiz
  if (tRef.current !== langData) {
    tRef.current = langData;
  }

  const t = (key: keyof TranslationKeys): string => {
    return tRef.current[key] || key;
  };

  return { t, language };
};