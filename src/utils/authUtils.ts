// src/utils/authUtils.ts

import { toast } from "sonner";
import axiosInstance from "../api/axiosInstance";
import { NavigateFunction } from "react-router-dom";

// ✅ Endi authUtils o'z socketini yaratmaydi
// utils/socket.ts singleton ishlatiladi
import {
  getSocket as getMainSocket,
  disconnectSocket as mainDisconnect,
} from "./socket";

let authCheckInterval: NodeJS.Timeout | null = null;
let isCheckingAuth = false;

// ─────────────────────────────────────────────────────────────
// initSocket — endi yangi socket yaratmaydi, mavjudini qaytaradi
// ─────────────────────────────────────────────────────────────
export function initSocket() {
  const socket = getMainSocket();
  const login = localStorage.getItem("currentLogin") || "";
  const deviceId = localStorage.getItem("deviceId") || "";

  // Ulanmagan bo'lsa ulan
  if (!socket.connected) socket.connect();

  // registerUser — agar login va deviceId mavjud bo'lsa
  if (login && deviceId) {
    socket.emit("registerUser", { login, deviceId });
  }

  return socket;
}

// ─────────────────────────────────────────────────────────────
// setupBlockListener — bloklash va forceLogout tinglovchilari
// ─────────────────────────────────────────────────────────────
export function setupBlockListener(navigate: NavigateFunction) {
  const currentSocket = getMainSocket();
  const currentLogin = localStorage.getItem("currentLogin");

  if (!currentLogin) {
    console.warn("⚠️ [Auth] currentLogin topilmadi");
    return;
  }

  // Avvalgi listenerlarni tozalash — ikki marta qo'shilmasin
  currentSocket.off("user:blocked");
  currentSocket.off("forceLogout");

  currentSocket.on("user:blocked", (data: { login: string; userId: string; reason: string }) => {
    console.log("🔴 [Socket] Bloklash eventi:", data);
    if (data.login && data.login === currentLogin) {
      handleBlockedUser(navigate, data.reason || "Administrator tomonidan bloklandi");
    }
  });

  currentSocket.on("forceLogout", (data: { login?: string; reason?: string }) => {
    console.log("🔴 [Socket] Force logout eventi:", data);
    // ✅ Faqat login mavjud VA mos kelsa — boshqa userlar ta'sirlanmaydi
    if (data.login && data.login === currentLogin) {
      handleBlockedUser(navigate, data.reason || "Admin tomonidan chiqarildi");
    }
  });

  console.log("✅ [Socket] Bloklash tinglovchilari o'rnatildi:", currentLogin);
}

// ─────────────────────────────────────────────────────────────
// handleBlockedUser — foydalanuvchi bloklanganda
// ─────────────────────────────────────────────────────────────
function handleBlockedUser(navigate: NavigateFunction, reason: string) {
  // localStorage flag — parallel chaqiruvlar to'xtasin
  if (localStorage.getItem("__blockHandled__") === "1") return;

  const blockedLogin = localStorage.getItem("currentLogin");
  if (!blockedLogin) return; // allaqachon chiqarilgan

  localStorage.setItem("__blockHandled__", "1");

  localStorage.removeItem("currentLogin");
  localStorage.removeItem("activeUser");
  sessionStorage.removeItem("currentUser");

  // ✅ authUtils o'z socketini emas — shared socketni uzadi
  mainDisconnect();

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
    navigate("/login", { replace: true });
  }, 3000);
}

// ─────────────────────────────────────────────────────────────
// setupAuthCheck — sahifa yuklanganda chaqiriladi
// ─────────────────────────────────────────────────────────────
export function setupAuthCheck(navigate: NavigateFunction): () => void {
  const currentLogin = localStorage.getItem("currentLogin");

  if (!currentLogin) {
    navigate("/login", { replace: true });
    return () => {};
  }

  initSocket();
  setupBlockListener(navigate);
  checkAuthStatus(currentLogin, navigate);

  authCheckInterval = setInterval(() => {
    checkAuthStatus(currentLogin, navigate);
  }, 30000);

  return () => {
    if (authCheckInterval) {
      clearInterval(authCheckInterval);
      authCheckInterval = null;
    }
  };
}

// ─────────────────────────────────────────────────────────────
// checkAuthStatus — sessiya va user holati tekshiruvi
// ─────────────────────────────────────────────────────────────
async function checkAuthStatus(login: string, navigate: NavigateFunction) {
  if (isCheckingAuth) return;
  isCheckingAuth = true;

  try {
    const sessionRes = await axiosInstance.get("/verify-session");

    if (sessionRes.status !== 200 || !sessionRes.data.valid) {
      handleLogout(navigate, "Session muddati tugagan");
      return;
    }

    const userRes = await axiosInstance.get("/user-status", { params: { login } });
    const user = userRes.data;

    if (!user) {
      handleLogout(navigate, "Foydalanuvchi topilmadi");
      return;
    }

    // ✅ Faqat blocked === true bo'lsagina
    if (user.blocked === true) {
      handleBlockedUser(navigate, "Administrator tomonidan bloklandi");
      return;
    }

    console.log("✅ [Auth] Faol:", login);

  } catch (err: any) {
    console.error("❌ [Auth] Tekshirish xatosi:", err);

    if (err?.response?.status === 401) {
      handleLogout(navigate, "Autentifikatsiya muddati tugagan");
    } else if (err?.response?.status === 403) {
      // 403 = bloklash emas, server ruxsat bermadi — kutamiz
      console.warn("⚠️ [Auth] 403 xatosi — kutiladi.");
    } else {
      // Tarmoq xatosi — chiqarmaymiz
      console.warn("⚠️ [Auth] Tarmoq xatosi — keyingi tekshirishgacha kutamiz");
    }
  } finally {
    isCheckingAuth = false;
  }
}

// ─────────────────────────────────────────────────────────────
// handleLogout — oddiy logout
// ─────────────────────────────────────────────────────────────
export function handleLogout(navigate: NavigateFunction, reason?: string) {
  localStorage.removeItem("currentLogin");
  localStorage.removeItem("activeUser");
  sessionStorage.removeItem("currentUser");

  // ✅ Shared socketni uzamiz
  mainDisconnect();

  if (authCheckInterval) {
    clearInterval(authCheckInterval);
    authCheckInterval = null;
  }

  toast.error("Sessiya tugadi", {
    description: reason || "Iltimos, qayta kiring",
    duration: 5000,
  });

  setTimeout(() => {
    navigate("/login", { replace: true });
  }, 2000);
}

// ─────────────────────────────────────────────────────────────
// Export — boshqa fayllar uchun
// ─────────────────────────────────────────────────────────────

// ✅ utils/socket.ts singleton qaytaradi
export function getSocket() {
  return getMainSocket();
}

// ✅ Shared socketni uzadi
export function disconnectSocket() {
  mainDisconnect();
}

export function stopAuthCheck() {
  if (authCheckInterval) {
    clearInterval(authCheckInterval);
    authCheckInterval = null;
  }
}