// src/api/axiosInstance.ts
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { invalidateAuthCache } from '../components/layout/ProtectedRoute';
import { clearAuthClientState } from '../utils/clientSession';
import { CATEGORY_FORBIDDEN, recoverFromCategoryForbidden } from '../utils/categoryGuard';

// 🔒 CSRF MEMORY STORAGE
let _csrfToken = '';

export const setMemoryCsrfToken = (token: string): void => {
  if (token && typeof token === 'string') {
    _csrfToken = token;
  }
};

export const getMemoryCsrfToken = (): string => _csrfToken;

// 📦 AXIOS INSTANCE CONFIGURATION
const axiosInstance = axios.create({
  baseURL: '/api',
  withCredentials: true, // HttpOnly sessiya cookie'si (OnDex BFF) uchun shart
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000, // 60 soniya (AI uchun)
});

// 🛠 SESSION MANAGEMENT HELPERS
const clearSessionAndRedirect = (): void => {
  invalidateAuthCache();
  clearAuthClientState();
  _csrfToken = '';

  // 4. Login sahifasiga yo'naltirish (replace bilan orqaga qaytolmaydi)
  if (window.location.pathname !== '/login') {
    window.location.replace('/login');
  }
};

// 🔄 REQUEST INTERCEPTOR (CSRF Injection)
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const method = config.method?.toLowerCase() ?? '';

    // GET, HEAD, OPTIONS so'rovlariga CSRF shart emas
    const mutationMethods = ['post', 'put', 'delete', 'patch'];
    
    if (mutationMethods.includes(method)) {
      const token = getMemoryCsrfToken();
      if (token) {
        config.headers['CSRF-Token'] = token;
        config.headers['X-CSRF-Token'] = token;
      }
    }

    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

// 🔄 RESPONSE INTERCEPTOR
// 401 — OnDex sessiyasi tugagan (chiqish, boshqa qurilmadan yopildi, muddat).
// Token yangilash YO'Q: uni server (BFF) o'zi qiladi (A4c.5). Qayta kirish kerak.
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (!originalRequest || !error.response) {
      return Promise.reject(error);
    }

    if (error.response.status === 401) {
      clearSessionAndRedirect();
      return Promise.reject(error);
    }

    // ── 403: Forbidden (CSRF Xatosi) qismi turaveradi... ────────────────────────
    if (error.response.status === 403 && (error.response.data as { code?: string } | undefined)?.code === CATEGORY_FORBIDDEN) {
      // Do'kon turi bu bo'limga ruxsat bermaydi: eski menyu/kesh — o'zi tuzatiladi.
      recoverFromCategoryForbidden();
      return Promise.reject(error);
    }
    if (error.response.status === 403 && !originalRequest._retry) {
        // ... (oldingi kodingiz)
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
