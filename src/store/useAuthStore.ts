import { create } from 'zustand';

// Obuna rejalari va rollar OLIB TASHLANDI (2026-11-12): sahifaga kirish faqat
// do'kon kategoriyasi bo'yicha (utils/storeAccess.ts), ma'lumot esa faqat o'z
// login'i bo'yicha (backend majburlaydi).
interface User {
  id: string;
  login: string;
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
