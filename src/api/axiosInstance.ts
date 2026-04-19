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
      
      // MUHIM: Agar /refresh so'rovining o'zi 401 bersa yoki allaqachon login sahifasida bo'lsak
      if (originalRequest.url === '/refresh' || originalRequest.url === '/api/refresh') {
        processQueue(error);
        clearSessionAndRedirect();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => axiosInstance(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // ✅ YECHIM: axiosInstance emas, toza axios ishlating!
        // Bu interceptor cheksiz aylanishini (loop) to'xtatadi
        await axios.post('/api/refresh', {}, { withCredentials: true });

        // 2. Yangi CSRF token olish
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
        // Agar Refresh so'rovi Catch'ga tushsa, demak hammasi tugadi (Sessiya o'lgan)
        processQueue(refreshError as AxiosError);
        clearSessionAndRedirect();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // ── 403: Forbidden (CSRF Xatosi) qismi turaveradi... ────────────────────────
    if (error.response.status === 403 && !originalRequest._retry) {
        // ... (oldingi kodingiz)
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
