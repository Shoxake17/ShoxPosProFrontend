// utils/api.js

let isRefreshing = false;
let refreshPromise = null;

export const api = async (url, options = {}, _isRetry = false) => {
  const response = await fetch(url, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  // 401 keldi va bu retry emas
  if (response.status === 401 && !_isRetry) {
    // Refresh loop oldini olish — bir vaqtda faqat 1 ta refresh
    if (!isRefreshing) {
      isRefreshing = true;
      refreshPromise = fetch('/api/refresh', {
        method: 'POST',
        credentials: 'include',
      }).finally(() => {
        isRefreshing = false;
        refreshPromise = null;
      });
    }

    try {
      const refreshRes = await refreshPromise;

      if (refreshRes && refreshRes.ok) {
        // Yangi token cookie'da — asl so'rovni qayta yubor
        return api(url, options, true); // _isRetry = true — cheksiz loop bo'lmaydi
      } else {
        // Refresh muvaffaqiyatsiz — loginga yo'nalt
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = '/login';
        throw new Error('Sessiya tugadi');
      }
    } catch (err) {
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/login';
      throw new Error('Sessiya tugadi');
    }
  }

  return response;
};