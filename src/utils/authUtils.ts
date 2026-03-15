// src/utils/authUtils.ts

import { io, Socket } from "socket.io-client";
import { toast } from "sonner";
import axiosInstance from "../api/axiosInstance";
import { NavigateFunction } from "react-router-dom";

let socket: Socket | null = null;
let authCheckInterval: NodeJS.Timeout | null = null;
let isCheckingAuth = false;
// isHandlingBlock o'rniga localStorage ishlatamiz — modul qayta yuklanganida ham ishlaydi

export function initSocket(): Socket {
  if (socket) {
    return socket;
  }

  // ✅ LOCALHOSTNI OLIB TASHLAYMIZ VA DINAMIK QILAMIZ
  // window.location.origin — bu brauzerdagi joriy manzilni oladi (https://shoxpospro.uz)
  const SOCKET_URL = import.meta.env.PROD 
    ? window.location.origin 
    : (import.meta.env.VITE_API_URL || "http://localhost:3001");

  socket = io(SOCKET_URL, {
    path: "/socket.io/", // ✅ Nginx dagi location bilan bir xil bo'lishi shart
    withCredentials: true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
    transports: ["websocket", "polling"], // ✅ Nginx qo'llab-quvvatlaydigan protokollar
  });

  socket.on("connect", () => {
    console.log("✅ [Socket] Ulandi:", socket?.id);
    const currentLogin = localStorage.getItem("currentLogin");
    if (currentLogin) {
      socket?.emit("registerUser", { login: currentLogin });
    }
  });

  socket.on("disconnect", (reason) => {
    console.log("⚠️ [Socket] Uzildi:", reason);
  });

  socket.on("connect_error", (err) => {
    console.error("❌ [Socket] Ulanish xatosi:", err.message);
  });

  return socket;
}

export function setupBlockListener(navigate: NavigateFunction) {
  const currentSocket = initSocket(); // initSocket ichida allaqachon tekshiriladi
  const currentLogin = localStorage.getItem("currentLogin");

  if (!currentLogin) {
    console.warn("⚠️ [Auth] currentLogin topilmadi");
    return;
  }

  currentSocket.off("user:blocked");
  currentSocket.on("user:blocked", (data: { login: string; userId: string; reason: string }) => {
    console.log("🔴 [Socket] Bloklash eventi:", data);

    // Faqat aniq o'sha login mos kelsa — boshqa userlar ta'sirlanmaydi
    if (data.login && data.login === currentLogin) {
      handleBlockedUser(navigate, data.reason || "Administrator tomonidan bloklandi");
    }
  });

  currentSocket.off("forceLogout");
  currentSocket.on("forceLogout", (data: { login?: string; reason?: string }) => {
    console.log("🔴 [Socket] Force logout eventi:", data);

    // ✅ BUG FIX: Eski kod: if (!data.login || data.login === currentLogin)
    // Bu noto'g'ri — data.login yo'q bo'lsa BARCHA userlarni chiqarardi!
    // To'g'ri: faqat login mavjud VA mos kelsa
    if (data.login && data.login === currentLogin) {
      handleBlockedUser(navigate, data.reason || "Admin tomonidan chiqarildi");
    }
  });

  console.log("✅ [Socket] Bloklash tinglovchilari o'rnatildi:", currentLogin);
}

function handleBlockedUser(navigate: NavigateFunction, reason: string) {
  // localStorage flag — modul qayta yuklanganida ham, ikki listener bo'lsa ham ishlaydi
  if (localStorage.getItem("__blockHandled__") === "1") return;

  // ✅ Avval login o'qiymiz
  const blockedLogin = localStorage.getItem("currentLogin");
  if (!blockedLogin) return; // Login yo'q = allaqachon chiqarilgan

  // Darhol flagni qo'yamiz — parallel chaqiruvlar to'xtasin
  localStorage.setItem("__blockHandled__", "1");

  localStorage.removeItem("currentLogin");
  localStorage.removeItem("activeUser");
  sessionStorage.removeItem("currentUser");

  if (socket?.connected) {
    socket.disconnect();
    socket = null;
  }

  if (authCheckInterval) {
    clearInterval(authCheckInterval);
    authCheckInterval = null;
  }

  toast.error("❌ Hisobingiz bloklandi", {
    description: `Login: ${blockedLogin} | Sabab: ${reason}`,
    duration: 6000,
  });

  setTimeout(() => {
    localStorage.removeItem("__blockHandled__"); // Keyingi sessiya uchun tozalaymiz
    navigate("/login", { replace: true });
  }, 3000);
}

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

    // ✅ Faqat blocked === true bo'lsagina (undefined, null, false — o'tib ketadi)
    if (user.blocked === true) {
      handleBlockedUser(navigate, "Administrator tomonidan bloklandi");
      return;
    }

    console.log("✅ [Auth] Faol:", login);

  } catch (err: any) {
    console.error("❌ [Auth] Tekshirish xatosi:", err);

    if (err?.response?.status === 401) {
      // 401 — token/session tugagan, chiqarish to'g'ri
      handleLogout(navigate, "Autentifikatsiya muddati tugagan");
    } else if (err?.response?.status === 403) {
      // ✅ BUG FIX: 403 = "ruxsat yo'q", bu BLOKLASH emas!
      // Eski kod bu holatda handleBlockedUser() chaqirardi — noto'g'ri!
      // Server konfiguratsiyasi, token muammosi, rol o'zgarishi bo'lishi mumkin
      // Hech narsa qilmaymiz — keyingi 30 sekundda qayta tekshiriladi
      console.warn("⚠️ [Auth] 403 xatosi — server ruxsat bermadi, bloklash emas. Kutiladi.");
    } else {
      // Tarmoq xatosi, server to'xtatilgan va h.k. — sabrsizlik bilan chiqarmaymiz
      console.warn("⚠️ [Auth] Tarmoq xatosi — keyingi tekshirishgacha kutamiz");
    }
  } finally {
    isCheckingAuth = false;
  }
}

export function handleLogout(navigate: NavigateFunction, reason?: string) {
  localStorage.removeItem("currentLogin");
  localStorage.removeItem("activeUser");
  sessionStorage.removeItem("currentUser");

  if (socket?.connected) {
    socket.disconnect();
    socket = null;
  }

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

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket() {
  if (socket?.connected) {
    socket.disconnect();
    socket = null;
  }
}

export function stopAuthCheck() {
  if (authCheckInterval) {
    clearInterval(authCheckInterval);
    authCheckInterval = null;
  }
}