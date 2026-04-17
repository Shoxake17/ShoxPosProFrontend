// src/api/axiosInstance.ts
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { invalidateAuthCache } from '../components/layout/ProtectedRoute';
import { clearAuthClientState } from '../utils/clientSession';

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
  withCredentials: true, // HttpOnly cookie-lar (accessToken/refreshToken) uchun shart
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

// 🔄 RESPONSE INTERCEPTOR (Token Refresh & Error Handling)
let isRefreshing = false;
interface QueueItem {
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}
let failedQueue: QueueItem[] = [];
const MAX_QUEUE_SIZE = 10;

const processQueue = (error: AxiosError | null): void => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve();
  });
  failedQueue = [];
};

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (!originalRequest || !error.response) {
      return Promise.reject(error);
    }

    // ── 401: Unauthorized (Token muddati tugagan) ─────────────────────────
    if (error.response.status === 401 && !originalRequest._retry) {
      
      // Agar /refresh so'rovining o'zi 401 bersa - demak sessiya butunlay o'lgan
      if (originalRequest.url === '/refresh') {
        processQueue(error);
        clearSessionAndRedirect();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        if (failedQueue.length >= MAX_QUEUE_SIZE) {
          return Promise.reject(new Error('Refresh queue limit exceeded'));
        }
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => axiosInstance(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // 1. Yangi accessToken olish
        await axiosInstance.post('/refresh');

        // 2. Yangi CSRF token olish (Xavfsizlik uchun refreshdan keyin yangilash tavsiya etiladi)
        try {
          const csrfRes = await axios.get('/api/csrf-token', { withCredentials: true });
          if (csrfRes.data?.csrfToken) {
            setMemoryCsrfToken(csrfRes.data.csrfToken);
          }
        } catch (e) {
          console.warn('CSRF refresh failed after token rotation');
        }

        processQueue(null);
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError as AxiosError);
        clearSessionAndRedirect();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // ── 403: Forbidden (CSRF Xatosi) ──────────────────────────────────────
    if (error.response.status === 403 && !originalRequest._retry) {
      const data = error.response.data as { message?: string };
      const isCsrfError = data?.message?.toLowerCase().includes('csrf');

      if (isCsrfError) {
        originalRequest._retry = true;
        try {
          // 🛡️ Recovery uchun toza axios (interceptorlarsiz) ishlatamiz
          const csrfRes = await axios.get('/api/csrf-token', { withCredentials: true });
          if (csrfRes.data?.csrfToken) {
            const newToken = csrfRes.data.csrfToken;
            setMemoryCsrfToken(newToken);
            originalRequest.headers['CSRF-Token'] = newToken;
            originalRequest.headers['X-CSRF-Token'] = newToken;
            return axiosInstance(originalRequest);
          }
        } catch (csrfError) {
          console.error('Critical CSRF recovery failure');
        }
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
