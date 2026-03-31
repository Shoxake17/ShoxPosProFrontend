export type ChatAdminLanguageKeys = {
  messages: string;
  myId: string;
  searchById: string;
  userAvatarAlt: string;
  noMessage: string;
  selectedUserAvatarAlt: string;
  online: string;
  offline: string;
  senderUserAvatarAlt: string;
  edited: string;
  editing: string;
  cancel: string;
  writeAMessage: string;
  supportChatTitle: string;
  selectUserToStart: string;
  userNotFound: string;
  errorLoadingUsers: string;
  errorLoadingHistory: string;
  languageChanged: string;
};

export const translations: Record<string, ChatAdminLanguageKeys> = {
  uz: {
    messages: "Xabarlar",
    myId: "Mening ID:",
    searchById: "ID bo'yicha qidirish...",
    userAvatarAlt: "Foydalanuvchi rasmi",
    noMessage: "Xabarlar mavjud emas",
    selectedUserAvatarAlt: "Tanlangan foydalanuvchi",
    online: "onlayn",
    offline: "oflayn",
    senderUserAvatarAlt: "Yuboruvchi rasmi",
    edited: "tahrirlandi",
    editing: "Tahrirlanmoqda...",
    cancel: "Bekor qilish",
    writeAMessage: "Xabar yozing...",
    supportChatTitle: "Support Chat",
    selectUserToStart: "Muloqotni boshlash uchun foydalanuvchini tanlang",
    userNotFound: "Foydalanuvchi topilmadi",
    errorLoadingUsers: "Foydalanuvchilarni yuklashda xato",
    errorLoadingHistory: "Xabarlar tarixini yuklashda xato",
    languageChanged: "Til o'zgartirildi",
  },
  ru: {
    messages: "Сообщения",
    myId: "Мой ID:",
    searchById: "Поиск по ID...",
    userAvatarAlt: "Аватар пользователя",
    noMessage: "Нет сообщений",
    selectedUserAvatarAlt: "Выбранный пользователь",
    online: "онлайн",
    offline: "офлайн",
    senderUserAvatarAlt: "Аватар отправителя",
    edited: "изменено",
    editing: "Редактирование...",
    cancel: "Отмена",
    writeAMessage: "Введите сообщение...",
    supportChatTitle: "Чат поддержки",
    selectUserToStart: "Выберите пользователя, чтобы начать общение",
    userNotFound: "Пользователь не найден",
    errorLoadingUsers: "Ошибка при загрузке пользователей",
    errorLoadingHistory: "Ошибка при загрузке истории",
    languageChanged: "Язык изменен",
  },
  en: {
    messages: "Messages",
    myId: "My ID:",
    searchById: "Search by ID...",
    userAvatarAlt: "User avatar",
    noMessage: "No messages yet",
    selectedUserAvatarAlt: "Selected user",
    online: "online",
    offline: "offline",
    senderUserAvatarAlt: "Sender avatar",
    edited: "edited",
    editing: "Editing...",
    cancel: "Cancel",
    writeAMessage: "Type a message...",
    supportChatTitle: "Support Chat",
    selectUserToStart: "Select a user to start conversation",
    userNotFound: "User not found",
    errorLoadingUsers: "Error loading users",
    errorLoadingHistory: "Error loading history",
    languageChanged: "Language changed",
  }
};