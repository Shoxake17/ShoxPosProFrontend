import { create } from 'zustand';

interface Subscription {
  plan: 'free' | 'basic' | 'pro';
  trialEndDate?: string;
  isTrial: boolean;
  startDate?: string;
}

interface User {
  id: string;
  login: string;
  role: string;
  name?: string;
  shopName?: string;
  shopType?: string;
  storeCategory?: string;
  shopCategories?: string[];
  subscription?: Subscription;
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

export const PLAN_PERMISSIONS = {
  free: {
    pages: ['menu', 'add-product', 'products', 'scanner', 'sales', 'kirim-bazasi', 'settings'],
    settingsFeatures: ['languages', 'theme', 'logout']
  },
  basic: {
    pages: ['menu', 'add-product', 'products', 'scanner', 'sales', 'debts', 'kirim-bazasi', 'settings', 'chat'],
    settingsFeatures: ['all']
  },
  pro: {
    pages: ['all'],
    settingsFeatures: ['all', 'currency']
  }
};

export const hasPageAccess = (plan: 'free' | 'basic' | 'pro', pageId: string) => {
  const permissions = PLAN_PERMISSIONS[plan] || PLAN_PERMISSIONS.free;
  if (permissions.pages.includes('all')) return true;
  return permissions.pages.includes(pageId);
};
