// src/utils/authUtils.ts

import { toast } from "sonner";
import axiosInstance from "../api/axiosInstance";
import { NavigateFunction } from "react-router-dom";
import { getSocket as getMainSocket, disconnectSocket as mainDisconnect } from "./socket";
import { invalidateAuthCache } from "../components/ProtectedRoute";

let authCheckInterval: ReturnType<typeof setInterval> | null = null;
let isCheckingAuth = false;
let isInitialized  = false;
let navigateRef: NavigateFunction | null = null; // ✅ Global saqlaymiz

const AUTH_INTERVAL_MS = 5 * 60 * 1000; // 5 daqiqa

// ─────────────────────────────────────────────
// checkAuthStatus
// ─────────────────────────────────────────────
async function checkAuthStatus() {
  if (isCheckingAuth || !navigateRef) return;
  isCheckingAuth = true;

  try {
    // ✅ Faqat bitta endpoint — verify-session ichida user ham bor
    const sessionRes = await axiosInstance.get("/verify-session");

    if (sessionRes.status !== 200 || !sessionRes.data.valid) {
      handleLogout("Session muddati tugagan");
      return;
    }

    // ✅ user-status ni faqat blocked tekshirish uchun — va kamroq tez-tez
    // Bu alohida interval bilan yoki verify-session response ichiga qo'shilsin
    const login = localStorage.getItem("currentLogin");
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
export function setupAuthCheck(navigate: NavigateFunction): () => void {
  navigateRef = navigate; // ✅ Har safar yangilaydi (navigate o'zgarganda)

  // ✅ Allaqachon ishga tushgan — faqat navigate ni yangiladik, qaytamiz
  if (isInitialized) return () => {};

  const currentLogin = localStorage.getItem("currentLogin");
  if (!currentLogin) {
    navigate("/login", { replace: true });
    return () => {};
  }

  isInitialized = true;

  // Darhol bir marta tekshir
  checkAuthStatus();

  // 5 daqiqada bir marta
  authCheckInterval = setInterval(() => {
    if (!localStorage.getItem("currentLogin")) {
      stopAuthCheck();
      return;
    }
    checkAuthStatus();
  }, AUTH_INTERVAL_MS);

  // ✅ Cleanup: app yopilganda tozalash (navigate o'zgarganda EMAS!)
  return () => {};
}

// ─────────────────────────────────────────────
// handleBlockedUser
// ─────────────────────────────────────────────
function handleBlockedUser(reason: string) {
  if (!navigateRef) return;
  if (localStorage.getItem("__blockHandled__") === "1") return;

  const blockedLogin = localStorage.getItem("currentLogin");
  if (!blockedLogin) return;

  localStorage.setItem("__blockHandled__", "1");
  localStorage.removeItem("currentLogin");
  localStorage.removeItem("activeUser");
  sessionStorage.removeItem("currentUser");

  invalidateAuthCache();
  mainDisconnect();

  // ✅ stopAuthCheck CHAQIRMAYMIZ — isInitialized = false bo'lmasin!
  if (authCheckInterval) {
    clearInterval(authCheckInterval);
    authCheckInterval = null;
  }

  toast.error("❌ Hisobingiz bloklandi", {
    description: `Login: ${blockedLogin} | Sabab: ${reason}`,
    duration: 6000,
  });

  setTimeout(() => {
    localStorage.removeItem("__blockHandled__");
    navigateRef?.("/login", { replace: true });
  }, 3000);
}

// ─────────────────────────────────────────────
// handleLogout — export qilingan
// ─────────────────────────────────────────────
export function handleLogout(reason?: string) {
  if (!navigateRef) return;

  localStorage.removeItem("currentLogin");
  localStorage.removeItem("activeUser");
  sessionStorage.removeItem("currentUser");

  invalidateAuthCache();
  mainDisconnect();

  // ✅ isInitialized ni SAQLAYMIZ — faqat intervalni tozalaymiz
  if (authCheckInterval) {
    clearInterval(authCheckInterval);
    authCheckInterval = null;
  }
  // isInitialized = false EMAS! ← Eng muhim fix

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
  if (authCheckInterval) {
    clearInterval(authCheckInterval);
    authCheckInterval = null;
  }
  isInitialized  = false; // ← Faqat shu funksiya reset qiladi
  isCheckingAuth = false;
  navigateRef    = null;
}

export function getSocket()        { return getMainSocket(); }
export function disconnectSocket() { mainDisconnect(); }