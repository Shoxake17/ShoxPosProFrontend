// src/api/axiosInstance.ts
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

let _csrfToken = '';


export const setMemoryCsrfToken = (token: string): void => {
  if (token && typeof token === 'string') {
    _csrfToken = token;
  }
};

/**
 * CSRF tokenni olish — faqat memory dan.
 * localStorage ga hech qachon yozilmaydi.
 */
export const getMemoryCsrfToken = (): string => _csrfToken;

// ═══════════════════════════════════════════════════════════════
// 📦 AXIOS INSTANCE
// ═══════════════════════════════════════════════════════════════
const axiosInstance = axios.create({
  baseURL: '/api',
  withCredentials: true, // HttpOnly cookie avtomatik yuboriladi
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000, // 15 soniya — sonsiz kutishni oldini olish
});

// ═══════════════════════════════════════════════════════════════
// 🔄 REQUEST INTERCEPTOR
// ═══════════════════════════════════════════════════════════════
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const method = config.method?.toLowerCase() ?? '';

    // Faqat mutatsion so'rovlarga CSRF token — GET/HEAD/OPTIONS ga kerak emas
    if (method !== 'get' && method !== 'head' && method !== 'options') {
      const token = getMemoryCsrfToken();
      if (token) {
        // Serverda faqat bitta nom tekshirilsin — 'CSRF-Token'
        // server.js da: app.use(csrf({ cookie: { ... } }))
        // csurf: req.headers['csrf-token'] tekshiradi
        config.headers['CSRF-Token'] = token;
      }
      // ❌ X-CSRF-Token o'chirildi — ikki xil nom chalkashlik yaratadi
      // Serverda faqat 'CSRF-Token' qabul qilinadi
    }

    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

// ═══════════════════════════════════════════════════════════════
// 🔄 RESPONSE INTERCEPTOR — Token refresh + sessiya tozalash
// ═══════════════════════════════════════════════════════════════
let isRefreshing = false;

interface QueueItem {
  resolve: (value?: unknown) => void;
  reject:  (reason?: unknown) => void;
}

let failedQueue: QueueItem[] = [];

// DoS oldini olish: navbat chegarasi
const MAX_QUEUE_SIZE = 10;

const processQueue = (error: AxiosError | null): void => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else       prom.resolve();
  });
  failedQueue = [];
};


const clearSessionAndRedirect = (): void => {

  localStorage.removeItem('currentLogin');
  localStorage.removeItem('activeUser');
  localStorage.removeItem('csrfToken'); 


  sessionStorage.removeItem('currentUser');


  _csrfToken = '';

  // Redirect — replace() bilan (orqaga borishni oldini oladi)
  window.location.replace('/login');
};

axiosInstance.interceptors.response.use(
  (response) => response,

  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?:      boolean;
      _retryCount?: number;
    };

    // originalRequest yo'q — throw qilamiz
    if (!originalRequest) throw error;

    // ── 401: Token muddati tugagan yoki yaroqsiz ─────────────────────────
    if (error.response?.status === 401 && !originalRequest._retry) {

      // /refresh o'zi 401 berdi — sessiya butunlay tugagan
      if (originalRequest.url === '/refresh') {
        processQueue(error);
        clearSessionAndRedirect();
        throw error;
      }

      // Refresh allaqachon boshlangan — navbatga qo'shamiz
      if (isRefreshing) {
        // DoS oldini olish: navbat to'lib ketsa yangi so'rov rad etiladi
        if (failedQueue.length >= MAX_QUEUE_SIZE) {
          throw new Error('Too many pending requests during token refresh');
        }

        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => axiosInstance(originalRequest))
          .catch((err) => { throw err; });
      }

      // Birinchi refresh urinishi
      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Cookie da refreshToken bor — credentials: true bilan avtomatik ketadi
        await axiosInstance.post('/refresh');

        // Yangi CSRF token olish — server yangi accessToken bilan
        // yangi CSRF token ham berishi mumkin (ixtiyoriy)
        try {
          const csrfRes = await axiosInstance.get('/csrf-token');
          if (csrfRes.data?.csrfToken) {
            setMemoryCsrfToken(csrfRes.data.csrfToken);
          }
        } catch {
          // CSRF yangilash muvaffaqiyatsiz bo'lsa — davom etamiz
          // keyingi mutatsion so'rov 403 bersa foydalanuvchi qayta kiradi
        }

        processQueue(null);
        return axiosInstance(originalRequest);

      } catch (refreshError) {
        processQueue(refreshError as AxiosError);
        clearSessionAndRedirect();
        throw refreshError;
      } finally {
        isRefreshing = false;
      }
    }

    // ── 403: CSRF xatosi — tokenni yangilab qayta urinish ────────────────
    if (
      error.response?.status === 403 &&
      !originalRequest._retry
    ) {
      const data = error.response?.data as Record<string, unknown> | undefined;
      const isCsrfError =
        typeof data?.message === 'string' &&
        data.message.toLowerCase().includes('csrf');

      if (isCsrfError) {
        originalRequest._retry = true;

        try {
          const csrfRes = await axiosInstance.get('/csrf-token');
          if (csrfRes.data?.csrfToken) {
            setMemoryCsrfToken(csrfRes.data.csrfToken);
            // Yangilangan token bilan qayta urinish
            originalRequest.headers['CSRF-Token'] = csrfRes.data.csrfToken;
            return axiosInstance(originalRequest);
          }
        } catch {
          // CSRF yangilash muvaffaqiyatsiz — foydalanuvchiga xabar
        }
      }
    }

    // Barcha boshqa xatolar — yuqoriga uzatish
    throw error;
  }
);

export default axiosInstance;