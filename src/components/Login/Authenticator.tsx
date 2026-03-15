// Authenticator.tsx - Google Authenticator va 2FA moduli

import { useState } from 'react';
import { getFullDeviceInfo } from '../../utils/deviceUtils';

interface AuthenticatorState {
  show2FAInput: boolean;
  showGoogleAuthInput: boolean;
  twoFactorCode: string;
  googleAuthCode: string;
}

interface AuthenticatorResponse {
  success: boolean;
  requiresGoogleAuth?: boolean;
  requires2FA?: boolean;
  requires2FAAfterConfirm?: boolean;
  message?: string;
  user?: any;
  activeDevice?: any;
}

/**
 * Authenticator hook - 2FA va Google Auth uchun
 */
export const useAuthenticator = () => {
  const [show2FAInput, setShow2FAInput] = useState(false);
  const [showGoogleAuthInput, setShowGoogleAuthInput] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [googleAuthCode, setGoogleAuthCode] = useState("");

  /**
   * 2FA kodini tozalash
   */
  const clear2FACode = () => {
    setTwoFactorCode("");
    setShow2FAInput(false);
  };

  /**
   * Google Auth kodini tozalash
   */
  const clearGoogleAuthCode = () => {
    setGoogleAuthCode("");
    setShowGoogleAuthInput(false);
  };

  /**
   * Barcha kodlarni tozalash
   */
  const clearAllCodes = () => {
    clear2FACode();
    clearGoogleAuthCode();
  };

  /**
   * 2FA kodini o'rnatish (faqat raqamlar, max 6 ta)
   */
  const handleSet2FACode = (value: string) => {
    const cleaned = value.replace(/\D/g, "").slice(0, 6);
    setTwoFactorCode(cleaned);
  };

  /**
   * Google Auth kodini o'rnatish (faqat raqamlar, max 6 ta)
   */
  const handleSetGoogleAuthCode = (value: string) => {
    const cleaned = value.replace(/\D/g, "").slice(0, 6);
    setGoogleAuthCode(cleaned);
  };

  /**
   * Login so'rovini yuborish (2FA/Google Auth bilan)
   */
  const submitLoginWithAuth = async (
    login: string,
    password: string,
    csrfToken?: string
  ): Promise<AuthenticatorResponse> => {
    try {
      const deviceId = localStorage.getItem("deviceId");
      if (!deviceId) {
        return { success: false, message: "DeviceId topilmadi" };
      }

      const info = await getFullDeviceInfo();
      const body: any = {
  login,
  password,
  deviceId,
  deviceType:  info.deviceType,
  deviceOS:    info.deviceOS,
  deviceModel: info.deviceModel,  // ← yangi: "Samsung Galaxy S21"
  location:    info.location,     // ← yangi: "Toshkent, O'zbekiston"
  ip:          info.ip,           // ← yangi: "91.185.x.x"
};
      const headers: Record<string, string> = {
        "Content-Type": "application/json"
      };

      if (csrfToken) {
        headers["CSRF-Token"] = csrfToken;
      }

      // 2FA kod qo'shish
      if (show2FAInput && twoFactorCode) {
        body.twoFactorCode = twoFactorCode;
      }

      // Google Auth kod qo'shish
      if (showGoogleAuthInput && googleAuthCode) {
        body.googleAuthCode = googleAuthCode;
      }

      const response = await fetch("/api/login", {
        method: "POST",
        credentials: 'include',
        headers,
        body: JSON.stringify(body),
      });

      const data = await response.json();

      // Response qaytarish
      return {
        success: response.ok && data.success,
        requiresGoogleAuth: data.requiresGoogleAuth,
        requires2FA: data.requires2FA,
        requires2FAAfterConfirm: data.requires2FAAfterConfirm,
        message: data.message,
        user: data.user,
        activeDevice: data.activeDevice
      };

    } catch (error) {
      console.error("❌ Login with auth error:", error);
      return {
        success: false,
        message: "Server bilan bog'lanib bo'lmadi"
      };
    }
  };

  /**
   * 2FA kodini tekshirish va yuborish
   */
  const verify2FACode = async (
    login: string,
    password: string,
    csrfToken?: string
  ): Promise<AuthenticatorResponse> => {
    if (twoFactorCode.length !== 6) {
      return {
        success: false,
        message: "2FA kod 6 ta raqamdan iborat bo'lishi kerak"
      };
    }

    return await submitLoginWithAuth(login, password, csrfToken);
  };

  /**
   * Google Auth kodini tekshirish va yuborish
   */
  const verifyGoogleAuthCode = async (
    login: string,
    password: string,
    csrfToken?: string
  ): Promise<AuthenticatorResponse> => {
    if (googleAuthCode.length !== 6) {
      return {
        success: false,
        message: "Google Auth kod 6 ta raqamdan iborat bo'lishi kerak"
      };
    }

    return await submitLoginWithAuth(login, password, csrfToken);
  };

  /**
   * 2FA sozlamalarini olish
   */
  const get2FASettings = async (login: string): Promise<{ enabled: boolean; method?: string }> => {
    try {
      const response = await fetch(`/api/2fa-settings?login=${login}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        return {
          enabled: data.enabled || false,
          method: data.method
        };
      }

      return { enabled: false };
    } catch (error) {
      console.error("❌ 2FA settings error:", error);
      return { enabled: false };
    }
  };

  /**
   * Google Auth QR kodni olish
   */
  const getGoogleAuthQR = async (login: string): Promise<{ qrCode?: string; secret?: string; error?: string }> => {
    try {
      const response = await fetch("/api/google-auth/generate", {
        method: "POST",
        credentials: 'include',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login })
      });

      if (response.ok) {
        const data = await response.json();
        return {
          qrCode: data.qrCode,
          secret: data.secret
        };
      }

      return { error: "QR kod olishda xatolik" };
    } catch (error) {
      console.error("❌ Google Auth QR error:", error);
      return { error: "Server bilan bog'lanib bo'lmadi" };
    }
  };

  /**
   * Google Auth ni faollashtirish
   */
  const enableGoogleAuth = async (
    login: string,
    verificationCode: string
  ): Promise<{ success: boolean; message: string }> => {
    try {
      if (verificationCode.length !== 6) {
        return {
          success: false,
          message: "Kod 6 ta raqamdan iborat bo'lishi kerak"
        };
      }

      const response = await fetch("/api/google-auth/enable", {
        method: "POST",
        credentials: 'include',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login, code: verificationCode })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        return {
          success: true,
          message: "Google Authenticator muvaffaqiyatli faollashtirildi"
        };
      }

      return {
        success: false,
        message: data.message || "Faollashtirish xatosi"
      };
    } catch (error) {
      console.error("❌ Enable Google Auth error:", error);
      return {
        success: false,
        message: "Server bilan bog'lanib bo'lmadi"
      };
    }
  };

  /**
   * Google Auth ni o'chirish
   */
  const disableGoogleAuth = async (login: string): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await fetch("/api/google-auth/disable", {
        method: "POST",
        credentials: 'include',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        return {
          success: true,
          message: "Google Authenticator o'chirildi"
        };
      }

      return {
        success: false,
        message: data.message || "O'chirish xatosi"
      };
    } catch (error) {
      console.error("❌ Disable Google Auth error:", error);
      return {
        success: false,
        message: "Server bilan bog'lanib bo'lmadi"
      };
    }
  };

  /**
   * Email orqali 2FA kodni yuborish
   */
  const sendEmail2FACode = async (login: string): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await fetch("/api/2fa/send-email", {
        method: "POST",
        credentials: 'include',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        return {
          success: true,
          message: "Kod emailga yuborildi"
        };
      }

      return {
        success: false,
        message: data.message || "Kod yuborishda xatolik"
      };
    } catch (error) {
      console.error("❌ Send email 2FA error:", error);
      return {
        success: false,
        message: "Server bilan bog'lanib bo'lmadi"
      };
    }
  };

  /**
   * SMS orqali 2FA kodni yuborish
   */
  const sendSMS2FACode = async (login: string): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await fetch("/api/2fa/send-sms", {
        method: "POST",
        credentials: 'include',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        return {
          success: true,
          message: "Kod SMS orqali yuborildi"
        };
      }

      return {
        success: false,
        message: data.message || "SMS yuborishda xatolik"
      };
    } catch (error) {
      console.error("❌ Send SMS 2FA error:", error);
      return {
        success: false,
        message: "Server bilan bog'lanib bo'lmadi"
      };
    }
  };

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

    // Clear functions
    clear2FACode,
    clearGoogleAuthCode,
    clearAllCodes,

    // Verification functions
    submitLoginWithAuth,
    verify2FACode,
    verifyGoogleAuthCode,

    // Settings functions
    get2FASettings,
    getGoogleAuthQR,
    enableGoogleAuth,
    disableGoogleAuth,

    // Send code functions
    sendEmail2FACode,
    sendSMS2FACode,
  };
};

export default useAuthenticator;