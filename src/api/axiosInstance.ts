// src/api/axiosInstance.ts
import axios from 'axios';

// 🛡️ CSRF tokenni brauzerdan olish yordamchi funksiyasi
// Eslatma: backend `/csrf-token` endpointida `req.csrfToken()` ni qaytaradi.
// Shu tokenni biz localStorage.da `csrfToken` nomi bilan saqlaymiz va har bir
// mutatsion (GET bo'lmagan) so'rovda headerga qo'shamiz.
const getClientCsrfToken = () => {
  try {
    // 1) /csrf-token endpointidan olingan qiymat (to'g'ri CSRF token)
    const stored = localStorage.getItem('csrfToken');
    if (stored) return stored;

    // 2) (Opsional) <meta name="csrf-token"> bo'lsa
    const meta = document
      .querySelector('meta[name="csrf-token"]')
      ?.getAttribute('content');
    if (meta) return meta;

    // 3) Cookie `_csrf` BU YERDA ishlatilmaydi, chunki u odatda sir (secret),
    // token emas. Uni header sifatida yuborish csurf bilan mos kelmaydi.
    return '';
  } catch {
    return '';
  }
};

const axiosInstance = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    // 🛡️ Kesh muammolarini (304 status) oldini olish uchun
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Expires': '0',
  }
});

// 🔄 REQUEST INTERCEPTOR: Har bir so'rovga CSRF token va timestamp qo'shish
// 🔄 REQUEST INTERCEPTOR: Har bir so'rovga CSRF token va timestamp qo'shish
axiosInstance.interceptors.request.use(
  (config) => {
    const csrfToken = getClientCsrfToken();
    
    // config.method mavjudligini va GET emasligini tekshiramiz
    if (csrfToken && config.method && config.method.toLowerCase() !== 'get') {
      // Xatolikni oldini olish uchun "as any" yoki aniq o'zlashtirishdan foydalanamiz
      if (config.headers) {
        config.headers['CSRF-Token'] = csrfToken;
      }
    }

    // 🛡️ Keshdan qochish uchun har bir GET so'roviga noyob ID qo'shish
    if (config.method === 'get') {
      config.params = { ...config.params, _t: Date.now() };
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// 🔄 RESPONSE INTERCEPTOR: 401 xatosini tutish va Refresh qilish
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // ⚠️ Agar xatolik 401 bo'lsa va bu so'rov hali qayta urinilmagan bo'lsa
    if (error.response?.status === 401 && !originalRequest._retry) {
      
      // 🛡️ Agar REFRESH so'rovining o'zi 401 bersa - demak sessiya butunlay tugagan
      if (originalRequest.url === '/refresh') {
        localStorage.clear();
        sessionStorage.clear();
        window.location.replace('/login');
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => axiosInstance(originalRequest))
          .catch(err => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // 🔄 Refresh so'rovini yuborish — umumiy axiosInstance orqali,
        // shunda CSRF-Token headeri ham avtomatik qo'shiladi
        await axiosInstance.post('/refresh');

        processQueue(null);
        // Yangi token bilan asl so'rovni qayta yuborish
        return axiosInstance(originalRequest);

      } catch (refreshError: any) {
        processQueue(refreshError);
        
        // 🧹 Refresh muvaffaqiyatsiz bo'lsa barcha ma'lumotlarni tozalash
        localStorage.removeItem("currentLogin");
        localStorage.removeItem("activeUser");
        sessionStorage.removeItem("currentUser");
        localStorage.removeItem("deviceId"); // Xohishingizga ko'ra

        window.location.replace('/login');
        return Promise.reject(refreshError);

      } finally {
        isRefreshing = false;
      }
    }

    // Boshqa barcha xatoliklar uchun
    return Promise.reject(error);
  }
);

export default axiosInstance;