import { categoryTranslations } from './languages/Category';
import { getCategoriesFromIDB, saveCategoriesToIDB } from '../hooks/useProductSync';

export interface CategoryOption {
  value: string;
  label: string;
}

// ─── Statik kategoriyalar meta-ma'lumotlari ───────────────────────────────────
// Har bir kategoriya uchun emoji va tarjima kaliti
const CATEGORY_META: Record<string, { emoji: string; key: string }> = {
  'Don va un':                    { emoji: '🌾', key: 'grainFlour' },
  "Go'sht":                       { emoji: '🥩', key: 'meat' },
  'Sabzavot':                     { emoji: '🥬', key: 'vegetables' },
  'Mevalar':                      { emoji: '🍎', key: 'fruits' },
  'Ichimliklar':                  { emoji: '🧃', key: 'drinks' },
  "Yog'":                         { emoji: '🧈', key: 'oil' },
  'Sut mahsulotlari':             { emoji: '🥛', key: 'dairy' },
  'Qandolat mahsulotlari':        { emoji: '🍫', key: 'sweets' },
  'Kiyim':                        { emoji: '🧥', key: 'clothing' },
  'Texnika':                      { emoji: '🛠️', key: 'electronics' },
  'Avtotransport vositalari':     { emoji: '🚗', key: 'vehicles' },
  'Gigiyena vositalari':          { emoji: '🧼', key: 'hygiene' },
  'Oshxona jihozlari':            { emoji: '🍽️', key: 'kitchenware' },
  'Bolalar mahsulotlari':         { emoji: '🧸', key: 'babyProducts' },
  'Kantselyariya mahsulotlari':   { emoji: '✏️', key: 'stationery' },
  'Uy hayvonlari uchun tovarlar': { emoji: '🐶', key: 'petProducts' },
  'Dorilar':                      { emoji: '💊', key: 'medicine' },
};

// ─── ShopType → default kategoriyalar xaritasi ───────────────────────────────
// Hardcoded kategoriyalar endi kerak emas, hammasi DB dan keladi
export const SHOP_TYPE_DEFAULT_CATEGORIES: Record<string, string[]> = {};

// ─── Kategoriya label (emoji + tarjima) ──────────────────────────────────────
function buildLabel(value: string, t: any): string {
  const meta = CATEGORY_META[value];
  if (meta) {
    const translated = t[meta.key] || value;
    return `${meta.emoji} ${translated}`;
  }
  // Noma'lum / yangi qo'shilgan kategoriya — emoji yo'q
  return value;
}

/**
 * 🛡️ XAVFSIZ: Kategoriyalarni IndexedDB ga saqlash.
 * Bir marta login yoki refresh paytida chaqiriladi.
 */
export async function syncUserCategoriesToIDB(login: string, categories: string[]): Promise<void> {
  if (!login || !categories) return;
  try {
    await saveCategoriesToIDB(login, categories);
  } catch (err) {
    console.error("Failed to sync categories to IDB:", err);
  }
}

/**
 * 🛡️ XAVFSIZ: IndexedDB'dan foydalanuvchi kategoriyalarini olish.
 */
export async function getUserShopCategoriesAsync(login: string): Promise<string[]> {
  if (!login) return [];
  try {
    return await getCategoriesFromIDB(login);
  } catch (err) {
    console.error("IDB categories error:", err);
    return [];
  }
}

// ─── Asosiy eksport: getCategories ───────────────────────────────────────────
/**
 * Foydalanuvchiga ruxsat etilgan kategoriyalar ro'yxatini qaytaradi.
 * UI uchun ishlatiladi.
 */
export const getCategories = (
  lang: string = 'uz',
  userCategories: string[] = []
): CategoryOption[] => {
  const t = (categoryTranslations as any)[lang] || categoryTranslations.uz;

  // Faqat berilgan (IDB dan kelgan) ruxsat etilganlarni ko'rsatamiz.
  const list = userCategories;

  return [
    { value: '', label: t.allCategories || 'Barcha kategoriyalar' },
    ...list.map((value) => ({ value, label: buildLabel(value, t) })),
  ];
};

// ─── Tarjima ─────────────────────────────────────────────────────────────────
export const translateCategory = (value: string, lang: string = 'uz'): string => {
  const t = (categoryTranslations as any)[lang] || categoryTranslations.uz;
  if (!value) return t.allCategories || 'Barcha kategoriyalar';
  const meta = CATEGORY_META[value];
  return meta ? (t[meta.key] || value) : value;
};

// ─── Emoji ───────────────────────────────────────────────────────────────────
export const getCategoryEmoji = (value: string): string => {
  if (!value) return '';
  const meta = CATEGORY_META[value];
  return meta ? `${meta.emoji} ` : '';
};
