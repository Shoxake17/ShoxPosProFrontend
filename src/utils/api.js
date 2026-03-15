// utils/api.js
export const api = async (url, options = {}) => {
  const response = await fetch(url, {
    credentials: 'include', // Cookie’larni avto yuboradi
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options  // method, body va boshqalarni o'tkazadi
  });

  // Agar 401 bo‘lsa — refresh urinib ko‘rish
  if (response.status === 401) {
    const refreshRes = await fetch('/api/refresh', { 
      method: 'POST', 
      credentials: 'include' 
    });

    if (refreshRes.ok) {
      // Yangi token cookie da – qayta urinish
      return api(url, options);
    } else {
      // Refresh muvaffaqiyatsiz
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/login';
      throw new Error('Sessiya tugadi');
    }
  }

  return response;
};