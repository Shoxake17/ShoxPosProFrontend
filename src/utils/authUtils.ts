// src/utils/authUtils.ts

import { toast } from "sonner";
import axiosInstance from "../api/axiosInstance";
import { NavigateFunction } from "react-router-dom";
import { getSocket as getMainSocket, disconnectSocket as mainDisconnect } from "./socket";
import { invalidateAuthCache } from "../components/layout/ProtectedRoute";
import { clearAuthClientState, getSessionLogin } from "./clientSession";

let authCheckInterval: ReturnType<typeof setInterval> | null = null;
let isCheckingAuth = false;
let isInitialized  = false;
let setupAuthInFlight = false;
let navigateRef: NavigateFunction | null = null;

const AUTH_INTERVAL_MS = 5 * 60 * 1000; // 5 daqiqa

/** Keyingi muvaffaqiyatli kirishdan oldin yoki logout dan keyin interval qayta yig'ilishi uchun */
export function prepareAuthCheckForNewSession(): void {
  if (authCheckInterval) {
    clearInterval(authCheckInterval);
    authCheckInterval = null;
  }
  isInitialized = false;
  setupAuthInFlight = false;
}

// ─────────────────────────────────────────────
// checkAuthStatus
// ─────────────────────────────────────────────
async function checkAuthStatus() {
  if (isCheckingAuth || !navigateRef) return;
  isCheckingAuth = true;

  try {
    // 🛡️ A09: Auth statusni keshdan tekshiramiz (ProtectedRoute keshidan farqli o'laroq bu fon tekshiruvi)
    const cached = sessionStorage.getItem("authCache");
    if (cached) {
      const { timestamp } = JSON.parse(cached);
      const age = Date.now() - timestamp;
      // Agar kesh hali juda yangi bo'lsa (1 min), serverga so'rov yubormaymiz
      if (age < 60000) return;
    }

    const sessionRes = await axiosInstance.get("/verify-session");

    if (sessionRes.status !== 200 || !sessionRes.data.valid) {
      handleLogout("Session muddati tugagan");
      return;
    }

    // ✅ user-status ni faqat blocked tekshirish uchun — va kamroq tez-tez
    // Bu alohida interval bilan yoki verify-session response ichiga qo'shilsin
    const login = getSessionLogin();
    if (!login) {
      handleLogout("Login topilmadi");
      return;
    }

    // ✅ user-status ni verify-session dan KEYIN, faqat kerak bo'lsa
    const userRes = await axiosInstance.get("/user-status", { params: { login } });
    if (userRes.data?.blocked === true) {
      handleBlockedUser("Administrator tomonidan bloklandi");
    }

  } catch (err: any) {
    if (err?.response?.status === 401) {
      handleLogout("Autentifikatsiya muddati tugagan");
    }
    // 403, tarmoq xatosi — o'tkazib yuboramiz
  } finally {
    isCheckingAuth = false;
  }
}

// ─────────────────────────────────────────────
// setupAuthCheck — FAQAT bir marta, main.tsx dan
// ─────────────────────────────────────────────
function startInterval() {
  if (authCheckInterval) clearInterval(authCheckInterval);
  authCheckInterval = setInterval(() => {
    if (!getSessionLogin()) {
      stopAuthCheck();
      return;
    }
    checkAuthStatus();
  }, AUTH_INTERVAL_MS);
}

export function setupAuthCheck(navigate: NavigateFunction): () => void {
  navigateRef = navigate;

  if (isInitialized) return () => {};
  if (setupAuthInFlight) return () => {};

  // 🛡️ Agar sessiya allaqachon mavjud bo'lsa (main.tsx bootstrap dan), qayta so'ramaymiz
  if (sessionStorage.getItem("currentUser")) {
    isInitialized = true;
    startInterval();
    return () => {};
  }

  setupAuthInFlight = true;

  void (async () => {
    try {
      // fetch: mehmon foydalanuvchida axios 401 → refresh zanjirini ishga tushirmaslik uchun
      const sessionRes = await fetch("/api/verify-session", { credentials: "include" });
      if (!sessionRes.ok) return;
      const body = (await sessionRes.json()) as {
        valid?: boolean;
        user?: { login?: string; id?: string; role?: string };
      };
      if (body?.valid !== true) return;
      const user = body.user;
      const login = user?.login;
      if (!login) return;

      if (!sessionStorage.getItem("currentUser")) {
        sessionStorage.setItem("currentUser", JSON.stringify(user));
      }

      isInitialized = true;
      checkAuthStatus();
      startInterval();
    } catch {
      /* tarmoq / JSON */
    } finally {
      setupAuthInFlight = false;
    }
  })();

  return () => {};
}

// ─────────────────────────────────────────────
// handleBlockedUser
// ─────────────────────────────────────────────
function handleBlockedUser(reason: string) {
  if (!navigateRef) return;
  if (sessionStorage.getItem("__blockHandled__") === "1") return;

  const blockedLogin = getSessionLogin();
  if (!blockedLogin) return;

  sessionStorage.setItem("__blockHandled__", "1");
  clearAuthClientState();

  invalidateAuthCache();
  mainDisconnect();

  prepareAuthCheckForNewSession();

  toast.error("❌ Hisobingiz bloklandi", {
    description: `Login: ${blockedLogin} | Sabab: ${reason}`,
    duration: 6000,
  });

  setTimeout(() => {
    sessionStorage.removeItem("__blockHandled__");
    navigateRef?.("/login", { replace: true });
  }, 3000);
}

// ─────────────────────────────────────────────
// handleLogout — export qilingan
// ─────────────────────────────────────────────
export function handleLogout(reason?: string) {
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

// ─────────────────────────────────────────────
// stopAuthCheck — faqat app completely yopilganda
// ─────────────────────────────────────────────
export function stopAuthCheck() {
  prepareAuthCheckForNewSession();
  isCheckingAuth = false;
  navigateRef = null;
}

export function getSocket()        { return getMainSocket(); }
export function disconnectSocket() { mainDisconnect(); }
