// src/components/Login/Authenticator.tsx
import { useState } from 'react';
import { getDeviceInfo, getDeviceId } from '../../utils/deviceUtils';
import axiosInstance, { getMemoryCsrfToken } from '../../api/axiosInstance';
import { api } from '../../utils/api';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface AuthenticatorResponse {
  success:                  boolean;
  requiresGoogleAuth?:      boolean;
  requires2FA?:             boolean;
  requires2FAAfterConfirm?: boolean;
  message?:                 string;
  user?:                    any;
  activeDevice?:            any;
}

// ═══════════════════════════════════════════════════════════════
// HELPER — fetch wrapper (axiosInstance o'rniga native fetch,
// chunki login hali cookie siz ketadi)
// ═══════════════════════════════════════════════════════════════

/**
 * CSRF tokenni memory dan oladi.
 * axiosInstance.ts dan export qilingan getter.
 * Bu fayl axiosInstance import qiladi — circular emas,
 * chunki axiosInstance Authenticator ni import qilmaydi.
 */

// getMemoryCsrfToken — axiosInstance.ts dan import qilinadi
// (yuqorida import qilingan)

// ═══════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════

export const useAuthenticator = () => {
  const [show2FAInput,        setShow2FAInput]        = useState(false);
  const [showGoogleAuthInput, setShowGoogleAuthInput] = useState(false);
  const [twoFactorCode,       setTwoFactorCode]       = useState("");
  const [googleAuthCode,      setGoogleAuthCode]      = useState("");

  // ─── Tozalash ─────────────────────────────────────────────────────────────
  const clear2FACode = () => { setTwoFactorCode(""); setShow2FAInput(false); };
  const clearGoogleAuthCode = () => { setGoogleAuthCode(""); setShowGoogleAuthInput(false); };
  const clearAllCodes = () => { clear2FACode(); clearGoogleAuthCode(); };

  // ─── Setter — faqat raqamlar, max 6 ta ───────────────────────────────────
  const handleSet2FACode       = (v: string) => setTwoFactorCode(v.replace(/\D/g, "").slice(0, 6));
  const handleSetGoogleAuthCode = (v: string) => setGoogleAuthCode(v.replace(/\D/g, "").slice(0, 6));

  // ═══════════════════════════════════════════════════════════════
  // submitLoginWithAuth — asosiy login so'rovi
  // ═══════════════════════════════════════════════════════════════
  /**
   * ✅ csrfToken — endi optional EMAS.
   *    Agar argument berilmasa, memory dan olinadi.
   *    localStorage ga HECH QACHON murojaat qilinmaydi.
   *
   * ✅ ip va location — O'CHIRILDI.
   *    Server req.ip va ip-api/MaxMind orqali o'zi aniqlaydi.
   *    Clientdan kelgan ip ga server ishonmasligi kerak.
   *
   * ✅ deviceId — sessionStorage → localStorage ketma-ketligida olinadi.
   *    Login.tsx da yozilgan, bu yerda faqat o'qiladi.
   */
  const submitLoginWithAuth = async (
    login: string,
    password: string,
    // csrfToken argument sifatida ham qabul qilinadi (Login.tsx bilan moslik),
    // lekin berilmasa memory dan olinadi — ikkalasi ham ishlaydi.
    _csrfTokenArg?: string,
  ): Promise<AuthenticatorResponse> => {
    try {
      // FingerprintJS orqali deviceId olish (asinxron)
      const deviceId = await getDeviceId();

      if (!deviceId) {
        return { success: false, message: "Qurilma identifikatori topilmadi" };
      }

      const info = getDeviceInfo();

      const body: Record<string, unknown> = {
        login:       login.trim().toLowerCase(),
        password,
        deviceId,
        deviceType:  info.deviceType,
        deviceOS:    info.deviceOS,
        deviceModel: info.deviceModel,
        // ❌ ip: info.ip           — O'CHIRILDI (server req.ip ishlatadi)
        // ❌ location: info.location — O'CHIRILDI (server ip-api/MaxMind)
      };

      // 2FA kod
      if (show2FAInput && twoFactorCode.length === 6) {
        body.twoFactorCode = twoFactorCode;
      }

      // Google Auth kod
      if (showGoogleAuthInput && googleAuthCode.length === 6) {
        body.googleAuthCode = googleAuthCode;
      }

      // CSRF token — argument → memory — biri bo'lishi shart
      const csrfToken = _csrfTokenArg || getMemoryCsrfToken();

      const response = await api("/api/login", {
        method:      "POST",
        body:        JSON.stringify(body),
        headers: csrfToken ? { "CSRF-Token": csrfToken } : {},
      });

      // response.json() xatosi uchun himoya
      let data: Record<string, unknown> = {};
      try {
        data = await response.json();
      } catch {
        return { success: false, message: "Server javobini o'qib bo'lmadi" };
      }

      return {
        success:                 response.ok && !!data.success,
        requiresGoogleAuth:      data.requiresGoogleAuth      as boolean | undefined,
        requires2FA:             data.requires2FA             as boolean | undefined,
        requires2FAAfterConfirm: data.requires2FAAfterConfirm as boolean | undefined,
        message:                 data.message                 as string  | undefined,
        user:                    data.user,
        activeDevice:            data.activeDevice,
      };

    } catch {
      // ❌ console.error("❌ Login with auth error:", error) — O'CHIRILDI
      // Stack trace va error details tashqariga chiqmasin
      return { success: false, message: "Server bilan bog'lanib bo'lmadi" };
    }
  };

  // ─── verify2FACode ────────────────────────────────────────────────────────
  const verify2FACode = async (
    login: string,
    password: string,
    csrfToken?: string,
  ): Promise<AuthenticatorResponse> => {
    if (twoFactorCode.length !== 6) {
      return { success: false, message: "2FA kod 6 ta raqamdan iborat bo'lishi kerak" };
    }
    return submitLoginWithAuth(login, password, csrfToken);
  };

  // ─── verifyGoogleAuthCode ─────────────────────────────────────────────────
  const verifyGoogleAuthCode = async (
    login: string,
    password: string,
    csrfToken?: string,
  ): Promise<AuthenticatorResponse> => {
    if (googleAuthCode.length !== 6) {
      return { success: false, message: "Google Auth kod 6 ta raqamdan iborat bo'lishi kerak" };
    }
    return submitLoginWithAuth(login, password, csrfToken);
  };

  // ═══════════════════════════════════════════════════════════════
  // SETTINGS / QR / ENABLE / DISABLE — axiosInstance ishlatilmaydi
  // chunki bular login KEYIN chaqiriladi, cookie allaqachon bor.
  // Shuning uchun axiosInstance ishlatish to'g'riroq bo'lar edi,
  // lekin mavjud arxitektura saqlab qolindi (fetch + credentials).
  // ═══════════════════════════════════════════════════════════════

  /** 2FA sozlamalarini olish */
  const get2FASettings = async (
    login: string,
  ): Promise<{ enabled: boolean; method?: string }> => {
    try {
      const res = await axiosInstance.get("/2fa-settings", {
        params: { login: login.trim() }
      });
      return { enabled: !!res.data.enabled, method: res.data.method };
    } catch {
      return { enabled: false };
    }
  };

  /** Google Auth QR kodni olish */
  const getGoogleAuthQR = async (
    login: string,
  ): Promise<{ qrCode?: string; secret?: string; error?: string }> => {
    try {
      const res = await axiosInstance.post("/google-auth/generate", { 
        login: login.trim() 
      });
      
      return { qrCode: res.data.qrCode, secret: res.data.secret };
    } catch (err: any) {
      return { error: err.response?.data?.message || "Server bilan bog'lanib bo'lmadi" };
    }
  };

  /** Google Auth ni faollashtirish */
  const enableGoogleAuth = async (
    login: string,
    verificationCode: string,
  ): Promise<{ success: boolean; message: string }> => {
    if (verificationCode.length !== 6) {
      return { success: false, message: "Kod 6 ta raqamdan iborat bo'lishi kerak" };
    }
    try {
      const res = await axiosInstance.post("/google-auth/enable", { 
        login: login.trim(), 
        code: verificationCode 
      });
      
      if (res.data.success) {
        return { success: true, message: "Google Authenticator muvaffaqiyatli faollashtirildi" };
      }
      return { success: false, message: res.data.message ?? "Faollashtirish xatosi" };
    } catch (err: any) {
      return { 
        success: false, 
        message: err.response?.data?.message || "Server bilan bog'lanib bo'lmadi" 
      };
    }
  };

  /** Google Auth ni o'chirish */
  const disableGoogleAuth = async (
    login: string,
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await axiosInstance.post("/google-auth/disable", { 
        login: login.trim() 
      });
      
      if (res.data.success) {
        return { success: true, message: "Google Authenticator o'chirildi" };
      }
      return { success: false, message: res.data.message ?? "O'chirish xatosi" };
    } catch (err: any) {
      return { 
        success: false, 
        message: err.response?.data?.message || "Server bilan bog'lanib bo'lmadi" 
      };
    }
  };

  /** Email orqali 2FA kodni yuborish */
  const sendEmail2FACode = async (
    login: string,
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await axiosInstance.post("/2fa/send-email", { 
        login: login.trim() 
      });
      
      if (res.data.success) {
        return { success: true, message: "Kod emailga yuborildi" };
      }
      return { success: false, message: res.data.message ?? "Kod yuborishda xatolik" };
    } catch (err: any) {
      return { 
        success: false, 
        message: err.response?.data?.message || "Server bilan bog'lanib bo'lmadi" 
      };
    }
  };

  /** SMS orqali 2FA kodni yuborish */
  const sendSMS2FACode = async (
    login: string,
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await axiosInstance.post("/2fa/send-sms", { 
        login: login.trim() 
      });
      
      if (res.data.success) {
        return { success: true, message: "Kod SMS orqali yuborildi" };
      }
      return { success: false, message: res.data.message ?? "SMS yuborishda xatolik" };
    } catch (err: any) {
      return { 
        success: false, 
        message: err.response?.data?.message || "Server bilan bog'lanib bo'lmadi" 
      };
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // RETURN
  // ═══════════════════════════════════════════════════════════════
  return {
    // State
    show2FAInput,
    showGoogleAuthInput,
    twoFactorCode,
    googleAuthCode,

    // Setters
    setShow2FAInput,
    setShowGoogleAuthInput,
    handleSet2FACode,
    handleSetGoogleAuthCode,

    // Tozalash
    clear2FACode,
    clearGoogleAuthCode,
    clearAllCodes,

    // Login
    submitLoginWithAuth,
    verify2FACode,
    verifyGoogleAuthCode,

    // Settings
    get2FASettings,
    getGoogleAuthQR,
    enableGoogleAuth,
    disableGoogleAuth,

    // Send code
    sendEmail2FACode,
    sendSMS2FACode,
  };
};

export default useAuthenticator;