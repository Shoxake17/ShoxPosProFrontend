import { create } from 'zustand';

// Obuna rejalari (free/basic/pro) OLIB TASHLANDI: OnDex Merchant'da sahifaga
// kirish faqat do'kon kategoriyasi bo'yicha (utils/storeAccess.ts), backend ham
// shu ro'yxatni majburlaydi. Narx/obuna — OnDex markaziy billing servisida.
interface User {
  id: string;
  login: string;
  role: string;
  name?: string;
  shopName?: string;
  shopType?: string;
  storeCategory?: string;
  shopCategories?: string[];
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  clearAuth: () => set({ user: null, isAuthenticated: false }),
}));
