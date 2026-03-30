import { clearAuthClientState } from "./clientSession";
import { getMemoryCsrfToken, setMemoryCsrfToken } from "../api/axiosInstance";

let isRefreshing = false;
let refreshPromise: Promise<Response> | null = null;

export const api = async (
  url: string,
  options: RequestInit = {},
  _isRetry = false
): Promise<Response> => {
  const method = (options.method || 'GET').toUpperCase();
  const csrfToken = getMemoryCsrfToken();
  
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  // Faqat o'zgartiruvchi so'rovlar uchun CSRF qo'shamiz
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    let token = getMemoryCsrfToken();
    
    // 🛡️ Proaktiv recovery: Agar token umuman bo'lmasa, bir marta olishga urinamiz
    if (!token && !_isRetry) {
      try {
        const csrfRes = await fetch("/api/csrf-token", { method: "GET", credentials: "include" });
        if (csrfRes.ok) {
          const csrfData = await csrfRes.json();
          if (csrfData.csrfToken) {
            token = csrfData.csrfToken;
            setMemoryCsrfToken(token);
          }
        }
      } catch (e) {
        console.warn("Proactive CSRF fetch failed", e);
      }
    }

    if (token) {
      headers["CSRF-Token"] = token;
      headers["X-CSRF-Token"] = token;
    }
  }

  const response = await fetch(url, {
    ...options,
    credentials: "include",
    headers,
  });

  // ── 403: Forbidden (CSRF Xatosi) ──────────────────────────────────────
  if (response.status === 403 && !_isRetry) {
    try {
      const data = await response.clone().json().catch(() => ({}));
      if (data?.message?.toLowerCase().includes('csrf')) {
        // 1. Yangi token olish
        const csrfRes = await fetch("/api/csrf-token", { method: "GET", credentials: "include" });
        if (csrfRes.ok) {
          const csrfData = await csrfRes.json();
          if (csrfData.csrfToken) {
            setMemoryCsrfToken(csrfData.csrfToken);
            // 2. Yangi token bilan qayta urinib ko'rish
            return api(url, options, true);
          }
        }
      }
    } catch (e) {
      console.warn("CSRF recovery failed in api.ts", e);
    }
  }

  if (response.status === 401 && !_isRetry) {
    if (!isRefreshing) {
      isRefreshing = true;
      refreshPromise = fetch("/api/refresh", {
        method: "POST",
        credentials: "include",
      }).finally(() => {
        isRefreshing = false;
        refreshPromise = null;
      });
    }

    try {
      const refreshRes = await refreshPromise!;

      if (refreshRes && refreshRes.ok) {
        return api(url, options, true);
      } else {
        clearAuthClientState();
        window.location.href = "/login";
        throw new Error("Sessiya tugadi");
      }
    } catch {
      clearAuthClientState();
      window.location.href = "/login";
      throw new Error("Sessiya tugadi");
    }
  }

  return response;
};
