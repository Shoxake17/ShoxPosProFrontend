// src/utils/authUtils.ts
// ✅ To'liq tuzatilgan — loop yo'q, 401 spam yo'q, race condition yo'q

import { toast } from "sonner";
import axiosInstance from "../api/axiosInstance";
import { NavigateFunction } from "react-router-dom";
import { getSocket as getMainSocket, disconnectSocket as mainDisconnect } from "./socket";
import { invalidateAuthCache } from "../components/layout/ProtectedRoute";
import { clearAuthClientState, getSessionLogin } from "./clientSession";

// ─── State ────────────────────────────────────────────────────────────────────
let authCheckInterval: ReturnType<typeof setInterval> | null = null;
let isCheckingAuth   = false;
let isInitialized    = false;
let setupAuthInFlight = false;
let navigateRef: NavigateFunction | null = null;

const AUTH_INTERVAL_MS    = 5 * 60 * 1000; // 5 daqiqa
const AUTH_CACHE_TTL_MS   = 60 * 1000;     // 1 daqiqa kesh
const AUTH_CACHE_KEY      = "authCache";
const CURRENT_USER_KEY    = "currentUser";
const BLOCK_HANDLED_KEY   = "__blockHandled__";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Sessiya bor-yo'qligini tez tekshirish (server so'rovsiz) */
function hasActiveSession(): boolean {
  return !!sessionStorage.getItem(CURRENT_USER_KEY);
}

/** Auth kesh yangiligini tekshirish */
function isAuthCacheFresh(): boolean {
  try {
    const cached = sessionStorage.getItem(AUTH_CACHE_KEY);
    if (!cached) return false;
    const { timestamp } = JSON.parse(cached);
    return Date.now() - timestamp < AUTH_CACHE_TTL_MS;
  } catch {
    return false;
  }
}

/** Auth keshni yangilash */
function refreshAuthCache(): void {
  sessionStorage.setItem(AUTH_CACHE_KEY, JSON.stringify({ timestamp: Date.now() }));
}

/** Auth keshni tozalash */
function clearAuthCache(): void {
  sessionStorage.removeItem(AUTH_CACHE_KEY);
}

// ─── Interval ────────────────────────────────────────────────────────────────

function startInterval(): void {
  if (authCheckInterval) clearInterval(authCheckInterval);
  authCheckInterval = setInterval(() => {
    // Login yo'q bo'lsa intervalni to'xtat
    if (!getSessionLogin()) {
      stopAuthCheck();
      return;
    }
    checkAuthStatus();
  }, AUTH_INTERVAL_MS);
}

// ─── prepareAuthCheckForNewSession ───────────────────────────────────────────

export function prepareAuthCheckForNewSession(): void {
  if (authCheckInterval) {
    clearInterval(authCheckInterval);
    authCheckInterval = null;
  }
  isInitialized    = false;
  setupAuthInFlight = false;
  clearAuthCache();
}

// ─── checkAuthStatus ──────────────────────────────────────────────────────────
/**
 * Fon tekshiruvi — interval orqali har 5 daqiqada chaqiriladi.
 * ✅ Agar kesh yangi bo'lsa — server so'rovi YO'Q (401 spam oldini olish)
 * ✅ Login yo'q bo'lsa — hech narsa qilmaydi
 */
async function checkAuthStatus(): Promise<void> {
  // Login mavjudligini avval tekshir — yo'q bo'lsa chiqib ket
  if (!getSessionLogin()) return;
  if (!navigateRef)       return;
  if (isCheckingAuth)     return;

  // Kesh yangi bo'lsa server so'rovi yuborma
  if (isAuthCacheFresh()) return;

  isCheckingAuth = true;

  try {
    const sessionRes = await axiosInstance.get("/verify-session");

    if (sessionRes.status !== 200 || !sessionRes.data?.valid) {
      handleLogout("Sessiya muddati tugagan");
      return;
    }

    // Keshni yangilaymiz — keyingi 1 daqiqada server so'rovi bo'lmaydi
    refreshAuthCache();

    const login = getSessionLogin();
    if (!login) {
      handleLogout("Login topilmadi");
      return;
    }

    // Blocked holati — faqat kerak bo'lganda
    try {
      const userRes = await axiosInstance.get("/user-status", { params: { login } });
      if (userRes.data?.blocked === true) {
        handleBlockedUser("Administrator tomonidan bloklandi");
      }
    } catch {
      // user-status xatosi kritik emas — o'tkazib yuboramiz
    }

  } catch (err: any) {
    if (err?.response?.status === 401) {
      handleLogout("Autentifikatsiya muddati tugagan");
    }
    // 403, network xatosi — o'tkazib yuboramiz, logout qilmaymiz
  } finally {
    isCheckingAuth = false;
  }
}

// ─── setupAuthCheck ───────────────────────────────────────────────────────────
/**
 * FAQAT main.tsx dan bir marta chaqiriladi.
 *
 * Muammo sabablari (tuzatildi):
 * 1. Login qilinmagan foydalanuvchida 401 spam →
 *    currentUser yo'q bo'lsa fetch CHAQIRILMAYDI
 * 2. Race condition (isInitialized + setupAuthInFlight) →
 *    setupAuthInFlight yagona guard sifatida ishlatiladi
 * 3. Ikki marta so'rov (setupAuthCheck + checkAuthStatus) →
 *    setupAuthCheck muvaffaqiyatli bo'lsa checkAuthStatus chaqirilmaydi
 */
export function setupAuthCheck(navigate: NavigateFunction): () => void {
  navigateRef = navigate;

  // Guard: bir marta bajarilsin
  if (isInitialized)     return () => {};
  if (setupAuthInFlight) return () => {};

  // ✅ currentUser bor → sessiya allaqachon mavjud, server so'rovi kerak emas
  if (hasActiveSession()) {
    isInitialized = true;
    refreshAuthCache(); // Keshni yangilaymiz
    startInterval();
    return () => {};
  }

  // ✅ currentUser yo'q → login qilinmagan foydalanuvchi
  // Serverga so'rov YO'Q — 401 spam oldini olamiz
  // Faqat agar sahifada token cookie bo'lishi mumkin bo'lsa tekshiramiz
  setupAuthInFlight = true;

  void (async () => {
    try {
      // fetch ishlatamiz — axios 401 → refresh loop ni ishga tushirmasligi uchun
      const sessionRes = await fetch("/api/verify-session", {
        credentials: "include",
        // Cache: no-store — brauzer keshini ishlatmasin
        headers: { "Cache-Control": "no-store" },
      });

      // ✅ 401 — login qilinmagan, normal holat, hech narsa qilmaymiz
      if (!sessionRes.ok) return;

      const body = await sessionRes.json() as {
        valid?: boolean;
        user?: { login?: string; id?: string };
      };

      if (body?.valid !== true) return;

      const user  = body.user;
      const login = user?.login;
      if (!login) return;

      // currentUser ni saqlash
      if (!sessionStorage.getItem(CURRENT_USER_KEY)) {
        sessionStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
      }

      isInitialized = true;
      refreshAuthCache();
      startInterval();
      // ✅ Bu yerda checkAuthStatus CHAQIRILMAYDI — ikki marta so'rov bo'lmasin

    } catch {
      // Tarmoq xatosi — login sahifasiga o'tkazmaymiz, shunchaki o'tkazib yuboramiz
    } finally {
      setupAuthInFlight = false;
    }
  })();

  return () => {};
}

// ─── handleBlockedUser ────────────────────────────────────────────────────────

function handleBlockedUser(reason: string): void {
  if (!navigateRef) return;
  if (sessionStorage.getItem(BLOCK_HANDLED_KEY) === "1") return;

  const blockedLogin = getSessionLogin();
  if (!blockedLogin) return;

  sessionStorage.setItem(BLOCK_HANDLED_KEY, "1");
  clearAuthClientState();
  invalidateAuthCache();
  mainDisconnect();
  prepareAuthCheckForNewSession();

  toast.error("❌ Hisobingiz bloklandi", {
    description: `Login: ${blockedLogin} | Sabab: ${reason}`,
    duration: 6000,
  });

  setTimeout(() => {
    sessionStorage.removeItem(BLOCK_HANDLED_KEY);
    navigateRef?.("/login", { replace: true });
  }, 3000);
}

// ─── handleLogout ─────────────────────────────────────────────────────────────

export function handleLogout(reason?: string): void {
  if (!navigateRef) return;

  clearAuthClientState();
  invalidateAuthCache();
  mainDisconnect();
  prepareAuthCheckForNewSession();

  toast.error("Sessiya tugadi", {
    description: reason || "Iltimos, qayta kiring",
    duration: 5000,
  });

  setTimeout(() => navigateRef?.("/login", { replace: true }), 2000);
}

// ─── stopAuthCheck ────────────────────────────────────────────────────────────

export function stopAuthCheck(): void {
  prepareAuthCheckForNewSession();
  isCheckingAuth = false;
  navigateRef    = null;
}

// ─── Re-exports ───────────────────────────────────────────────────────────────

export function getSocket()        { return getMainSocket(); }
export function disconnectSocket() { mainDisconnect(); }