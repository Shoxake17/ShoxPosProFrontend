// src/api/axiosInstance.ts
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

// ─────────────────────────────────────────────
// 🛡️ CSRF tokenni brauzerdan olish
// Backend `/csrf-token` endpointida `req.csrfToken()` qaytaradi.
// Shu token localStorage'da `csrfToken` nomi bilan saqlanadi va
// har bir mutatsion (GET bo'lmagan) so'rovda headerga qo'shiladi.
// ─────────────────────────────────────────────
const getClientCsrfToken = (): string => {
  try {
    // 1) /csrf-token dan olingan token (asosiy usul)
    const stored = localStorage.getItem('csrfToken');
    if (stored) return stored;

    // 2) (Opsional) <meta name="csrf-token"> tegi bo'lsa
    const meta = document
      .querySelector('meta[name="csrf-token"]')
      ?.getAttribute('content');
    if (meta) return meta;

    // 3) Cookie `_csrf` bu yerda ishlatilmaydi —
    //    u odatda "secret" bo'lib, csurf bilan mos kelmaydi.
    return '';
  } catch {
    return '';
  }
};

// ─────────────────────────────────────────────
// 📦 Axios instance yaratish
// ─────────────────────────────────────────────
const axiosInstance = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    // 🛡️ Kesh muammolarini (304 status) oldini olish
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Expires': '0',
  },
});

// ─────────────────────────────────────────────
// 🔄 REQUEST INTERCEPTOR
// Har bir so'rovga CSRF token va cache-busting timestamp qo'shish
// ─────────────────────────────────────────────
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const csrfToken = getClientCsrfToken();

    // Faqat mutatsion so'rovlarga (POST, PUT, PATCH, DELETE) CSRF token qo'shish
    if (csrfToken && config.method && config.method.toLowerCase() !== 'get') {
      config.headers['CSRF-Token'] = csrfToken;
    }

    // GET so'rovlarda keshdan qochish uchun noyob timestamp qo'shish
    if (config.method?.toLowerCase() === 'get') {
      config.params = { ...config.params, _t: Date.now() };
    }

    return config;
  },
  (error: AxiosError) => {
    // ✅ SonarQube fix: Promise.reject → throw
    throw error;
  }
);

// ─────────────────────────────────────────────
// 🔄 RESPONSE INTERCEPTOR
// 401 xatosini tutish, token yangilash (refresh) va navbatni boshqarish
// ─────────────────────────────────────────────
let isRefreshing = false;

interface QueueItem {
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}

let failedQueue: QueueItem[] = [];

/**
 * Navbatdagi barcha kutayotgan so'rovlarni hal qilish yoki rad etish
 */
const processQueue = (error: AxiosError | null): void => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
};

/**
 * Sessiyani to'liq tozalash va login sahifasiga yo'naltirish
 */
const clearSessionAndRedirect = (): void => {
  localStorage.removeItem('currentLogin');
  localStorage.removeItem('activeUser');
  localStorage.removeItem('deviceId');
  localStorage.removeItem('csrfToken');
  sessionStorage.removeItem('currentUser');
  window.location.replace('/login');
};

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // ─────────────────────────────────────────
    // ⚠️ 401 xatosi va hali qayta urinilmagan so'rov
    // ─────────────────────────────────────────
    if (error.response?.status === 401 && !originalRequest._retry) {

      // 🛡️ Refresh so'rovining o'zi 401 bersa — sessiya butunlay tugagan
      if (originalRequest.url === '/refresh') {
        clearSessionAndRedirect();
        // ✅ SonarQube fix: Promise.reject → throw
        throw error;
      }

      // ⏳ Refresh jarayoni allaqachon boshlangan bo'lsa — navbatga qo'shish
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => axiosInstance(originalRequest))
          .catch((err) => {
            // ✅ SonarQube fix: Promise.reject → throw
            throw err;
          });
      }

      // 🔄 Refresh jarayonini boshlash
      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Refresh so'rovini yuborish — CSRF-Token headeri avtomatik qo'shiladi
        await axiosInstance.post('/refresh');

        // Navbatdagi so'rovlarni muvaffaqiyatli hal qilish
        processQueue(null);

        // Asl so'rovni qayta yuborish
        return axiosInstance(originalRequest);

      } catch (refreshError) {
        // ❌ Refresh muvaffaqiyatsiz — navbatni rad etish va sessiyani tozalash
        processQueue(refreshError as AxiosError);
        clearSessionAndRedirect();
        // ✅ SonarQube fix: Promise.reject → throw
        throw refreshError;

      } finally {
        isRefreshing = false;
      }
    }

    // ─────────────────────────────────────────
    // Boshqa barcha xatoliklar (401 dan tashqari)
    // ✅ SonarQube fix: Promise.reject → throw
    // ─────────────────────────────────────────
    throw error;
  }
);

export default axiosInstance;