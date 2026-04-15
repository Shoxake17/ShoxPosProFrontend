import { clearAuthClientState } from "./clientSession";
import { getMemoryCsrfToken, setMemoryCsrfToken } from "../api/axiosInstance";

let isRefreshing = false;
let refreshPromise: Promise<Response> | null = null;

// 🚀 Senior Level Professional Request Deduplication & Caching
interface PendingRequest {
  promise: Promise<Response>;
  resolvers: Array<(response: Response) => void>;
  rejecters: Array<(error: any) => void>;
}

const pendingRequests = new Map<string, PendingRequest>();
const responseCache = new Map<string, { data: Response; timestamp: number }>();
const CACHE_TTL = 10000;

// Generate unique cache key
const getCacheKey = (url: string, options: RequestInit = {}) => {
  const method = (options.method || 'GET').toUpperCase();
  const body = options.body ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body)) : '';
  return `${method}:${url}:${body}`;
};

export const api = async (
  url: string,
  options: RequestInit = {},
  _isRetry = false
): Promise<Response> => {
  const method = (options.method || 'GET').toUpperCase();
  const cacheKey = getCacheKey(url, options);
  
  // 🚀 1. FAJRINF: Response Cache (GET requests)
  if (method === 'GET') {
    const cached = responseCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data.clone();
    }
  }

  // 🚀 2. FAJRINF: Request Deduplication
  if (pendingRequests.has(cacheKey)) {
    const pending = pendingRequests.get(cacheKey)!;
    return new Promise((resolve, reject) => {
      pending.resolvers.push(resolve);
      pending.rejecters.push(reject);
    });
  }

  // Create pending request entry
  const pendingRequest: PendingRequest = {
    promise: null!,
    resolvers: [],
    rejecters: [],
  };
  pendingRequests.set(cacheKey, pendingRequest);

  const csrfToken = getMemoryCsrfToken();
  
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  // FormData yuborilayotgan bo'lsa Content-Type ni brauzer o'zi belgilashi kerak
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

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

  try {
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
        clearApiCache();
        window.location.href = "/login";
        throw new Error("Sessiya tugadi");
      }
    } catch {
      clearAuthClientState();
      clearApiCache();
      window.location.href = "/login";
      throw new Error("Sessiya tugadi");
    }
  }

    // 🚀 3. FAJRINF: Cache successful GET responses
    if (response.ok && method === 'GET') {
      responseCache.set(cacheKey, {
        data: response.clone(),
        timestamp: Date.now(),
      });
    }

    // 🚀 4. FAJRINF: Resolve all pending requests
    const pending = pendingRequests.get(cacheKey);
    if (pending) {
      pending.resolvers.forEach(resolve => resolve(response.clone()));
      pendingRequests.delete(cacheKey);
    }

    return response;
  } catch (error) {
    // 🚀 5. FAJRINF: Reject all pending requests on error
    const pending = pendingRequests.get(cacheKey);
    if (pending) {
      pending.rejecters.forEach(reject => reject(error));
      pendingRequests.delete(cacheKey);
    }
    throw error;
  }
};

// Helper to clear cache manually (e.g., after mutations)
export const clearApiCache = (pattern?: string) => {
  if (pattern) {
    for (const key of responseCache.keys()) {
      if (key.includes(pattern)) {
        responseCache.delete(key);
      }
    }
  } else {
    responseCache.clear();
  }
};
