// Login.tsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getFullDeviceInfo, getDeviceId as getStoredDeviceId } from '../utils/deviceUtils';
import FingerprintJS from '@fingerprintjs/fingerprintjs';
import axiosInstance                   from '../api/axiosInstance';
import { reconnectSocket, getSocket }  from '../utils/socket';
import { getLayoutStyles }             from "../components/MainLayout";
import { invalidateAuthCache }         from "../components/ProtectedRoute";
import { setupAuthCheck }              from "../utils/authUtils";
import { subscribeToPushNotifications } from '../utils/pushNotification';
import {
  User, Lock, Eye, EyeOff, ArrowRight, CheckCircle,
  AlertTriangle, XCircle, Shield, ScanFace, Fingerprint, Smartphone
} from "lucide-react";

import { useBiometric }      from '../components/Login/Biometric';
import { useAuthenticator }  from '../components/Login/Authenticator';
import { syncUserCategoriesToIDB } from '../components/Category';

export default function Login() {
  const navigate = useNavigate();

  const {
    biometricAvailable, biometricEnabled, biometricType,
    handleBiometricLogin: biometricLoginHandler
  } = useBiometric();

  const {
    show2FAInput, showGoogleAuthInput,
    twoFactorCode, googleAuthCode,
    setShow2FAInput, setShowGoogleAuthInput,
    handleSet2FACode, handleSetGoogleAuthCode,
    submitLoginWithAuth,
  } = useAuthenticator();

  const [theme, setTheme]                         = useState<"dark" | "light">("dark");
  const [loading, setLoading]                     = useState(false);
  const [message, setMessage]                     = useState("");
  const [login, setLogin]                         = useState("");
  const [password, setPassword]                   = useState("");
  const [showPassword, setShowPassword]           = useState(false);
  const [showDeviceConfirm, setShowDeviceConfirm] = useState(false);
  const [pendingDeviceInfo, setPendingDeviceInfo] = useState<any>(null);
  const [newDeviceInfo, setNewDeviceInfo]         = useState<any>(null);
  const [csrfToken, setCsrfToken]                 = useState("");
  const [hasAttemptedAutoBiometric, setHasAttemptedAutoBiometric] = useState(false);
  const isBiometricPending = useRef(false);

  // ─── Theme ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const saved = (localStorage.getItem("theme") as "dark" | "light") || "dark";
    setTheme(saved);
    document.documentElement.setAttribute("data-theme", saved);
  }, []);

  // ─── DeviceId ─────────────────────────────────────────────────────────────
  // Fingerprinting orqali aniqlanadi, localStorage ga saqlanmaydi
  // useEffect(() => {
  //   if (!localStorage.getItem("deviceId")) {
  //     const id = crypto.randomUUID?.() ||
  //       "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
  //         const r = (Math.random() * 16) | 0;
  //         return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  //       });
  //     localStorage.setItem("deviceId", id);
  //   }
  // }, []);

  // ─── CSRF token ───────────────────────────────────────────────────────────
  useEffect(() => {
    axiosInstance.get("/csrf-token")
      .then(res => setCsrfToken(res.data.csrfToken))
      .catch(err => console.error("❌ CSRF token xatosi:", err));
  }, []);

  // ─── Login sahifasi ochilganda cache ni tozalash ──────────────────────────
  useEffect(() => {
    invalidateAuthCache();
  }, []);

  // ─── Auto biometric ───────────────────────────────────────────────────────
  useEffect(() => {
    if (
      biometricEnabled && biometricAvailable &&
      !hasAttemptedAutoBiometric && !loading &&
      !isBiometricPending.current
    ) {
      const attempt = async () => {
        isBiometricPending.current = true;
        setHasAttemptedAutoBiometric(true);
        try {
          await biometricLoginHandler(navigate, setLoading, setMessage);
        } catch (err) {
          console.error("Auto biometric xatosi:", err);
        } finally {
          isBiometricPending.current = false;
        }
      };
      attempt();
    }
  }, [biometricEnabled, biometricAvailable, hasAttemptedAutoBiometric, loading, biometricLoginHandler, navigate]);

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const validateStaffRole = (user: any): boolean => {
    const role = user?.role?.toLowerCase()?.trim() || "";
    if (role === "admin" || role === "cashier") return true;
    
    // Boshqa barcha rollar rad etiladi
    setMessage("error:Login yoki parol noto'g'ri");
    return false;
  };

  const initSocketAfterLogin = (
    loginName: string,
    deviceId: string,
    deviceType: string,
    deviceOS: string
  ) => {
    reconnectSocket(loginName, deviceId);
    setTimeout(() => {
      const socket = getSocket();
      socket.emit("userLogged", {
        login: loginName,
        deviceId,
        deviceType,
        deviceOS,
        active: true,
      });
    }, 500);
  };

  const onLoginSuccess = (
    user: any,
    loginName: string,
    deviceId: string,
    deviceType: string,
    deviceOS: string
  ) => {
    if (user) {
      sessionStorage.setItem("currentUser", JSON.stringify(user));
      // 🛡️ Kategoriyalarni IndexedDB ga saqlash
      if (user.shopCategories) {
        syncUserCategoriesToIDB(user.login, user.shopCategories);
      }
    }

    invalidateAuthCache();
    initSocketAfterLogin(loginName, deviceId, deviceType, deviceOS);
    setupAuthCheck(navigate);

    subscribeToPushNotifications();

    setMessage(`success:Xush kelibsiz, ${loginName}!`);
    const role = user?.role?.toLowerCase() || "cashier";
    setTimeout(
      () => navigate(role === "admin" ? "/admin-panel" : "/menu", { replace: true }),
      1500
    );
  };

  // ─── Asosiy login ─────────────────────────────────────────────────────────
  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (loading) return;
    if (!login || !password) {
      setMessage("warning:Login va parolni kiriting");
      return;
    }

    setLoading(true);

    // ─── Fingerprint orqali deviceId olish (deviceUtils dan asinxron) ─────────
    const currentDeviceId = await getStoredDeviceId();

    if (!currentDeviceId) {
      setMessage("error:Qurilma identifikatori aniqlanmadi. Brauzer sozlamalarini tekshiring.");
      setLoading(false);
      return;
    }

    const info = await getFullDeviceInfo();
    const deviceData = {
      deviceId:    currentDeviceId,
      deviceType:  info.deviceType,
      deviceOS:    info.deviceOS,
      deviceModel: info.deviceModel,
      location:    info.location,
      ip:          info.ip,
    };
    setNewDeviceInfo(deviceData);

    try {
      const authResult = await submitLoginWithAuth(login, password, csrfToken);

      if (authResult.user?.blocked) {
        setMessage(`error:${authResult.message || "Hisob bloklangan."}`);
        return;
      }

      if (authResult.requiresGoogleAuth) {
        setShowGoogleAuthInput(true);
        setMessage("info:Google Authenticator kodini kiriting");
        return;
      }

      if (authResult.requires2FA) {
        setShow2FAInput(true);
        setMessage("info:2FA kodini kiriting");
        return;
      }

      if (authResult.message === "CONFIRM_DEVICE" || authResult.requires2FAAfterConfirm) {
        setPendingDeviceInfo(authResult.activeDevice || null);
        setShowDeviceConfirm(true);
        setMessage("");
        return;
      }

      if (authResult.success) {
        if (!validateStaffRole(authResult.user)) {
          sessionStorage.removeItem("currentUser");
          return;
        }

        try {
          const cookieCheck = await axiosInstance.get("/verify-session");
          if (cookieCheck.status !== 200) {
            setMessage("error:Cookie o'rnatilmadi, qayta urinib ko'ring");
            return;
          }
        } catch {
          setMessage("error:Sessiya tekshirishda xato. Qayta urinib ko'ring.");
          return;
        }

        onLoginSuccess(authResult.user, login, currentDeviceId, info.deviceType, info.deviceOS);
      } else {
        setMessage(`error:${authResult.message || "Login yoki parol xato"}`);
      }
    } catch (err) {
      console.error("❌ Login xatosi:", err);
      setMessage("error:Server bilan bog'lanib bo'lmadi");
    } finally {
      setLoading(false);
    }
  };

  // ─── Yangi qurilmani tasdiqlash ───────────────────────────────────────────
  const handleConfirmDevice = async () => {
    if (loading) return;
    setLoading(true);

    try {
      const res = await axiosInstance.post("/confirm-login", {
        login,
        deviceId:   newDeviceInfo.deviceId,
        deviceType: newDeviceInfo.deviceType,
        deviceOS:   newDeviceInfo.deviceOS,
        confirm:    true,
      });

      if (res.status === 200) {
        const data = res.data;
        setShowDeviceConfirm(false);

        if (!validateStaffRole(data.user)) {
          sessionStorage.removeItem("currentUser");
          return;
        }

        if (data.requires2FAAfterConfirm) {
          setShow2FAInput(true);
          setMessage("info:Qurilma tasdiqlandi. 2FA kodini kiriting");
          return;
        }

        try {
          const cookieCheck = await axiosInstance.get("/verify-session");
          if (cookieCheck.status !== 200) {
            setMessage("error:Cookie o'rnatilmadi");
            return;
          }
        } catch {
          setMessage("error:Sessiya tekshirishda xato");
          return;
        }

        onLoginSuccess(
          data.user, login,
          newDeviceInfo.deviceId,
          newDeviceInfo.deviceType,
          newDeviceInfo.deviceOS
        );
      } else {
        setMessage(`error:${res.data.message || "Tasdiqlashda xato"}`);
      }
    } catch (err: any) {
      setMessage(`error:${err.response?.data?.message || "Tasdiqlashda server xatosi"}`);
    } finally {
      setLoading(false);
    }
  };

  // ─── Biometric ────────────────────────────────────────────────────────────
  const triggerBiometric = async () => {
    if (loading || isBiometricPending.current) return;
    isBiometricPending.current = true;
    try {
      await biometricLoginHandler(navigate, setLoading, setMessage);
    } catch {
      setMessage("error:Biometrik kirishda xato");
    } finally {
      isBiometricPending.current = false;
    }
  };

  // ─── Message helpers ──────────────────────────────────────────────────────
  const getMessageType = () => {
    if (message.startsWith("success:")) return "success";
    if (message.startsWith("warning:")) return "warning";
    if (message.startsWith("error:"))   return "error";
    if (message.startsWith("info:"))    return "info";
    return null;
  };
  const getMessageText = () => message.split(":").slice(1).join(":") || message;
  const getMessageIcon = () => {
    const t = getMessageType();
    if (t === "success") return <CheckCircle  size={16} />;
    if (t === "warning") return <AlertTriangle size={16} />;
    if (t === "error")   return <XCircle      size={16} />;
    return null;
  };

  // ─── Styles ───────────────────────────────────────────────────────────────
  const isDark       = theme === "dark";
  const layoutStyles = getLayoutStyles(theme);

  const inputBase: React.CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    padding: "14px 16px 14px 48px",
    background:   isDark ? "#0f1420" : "#f8f9ff",
    border:       `1px solid ${isDark ? "#2a3144" : "#e2e8f0"}`,
    borderRadius: "12px",
    color:        isDark ? "#fff" : "#1a1f2e",
    fontSize:     "15px",
    outline:      "none",
  };

  const msgColors: Record<string, string> = {
    success: "#10b981", warning: "#fbbf24", info: "#3b82f6", error: "#ef4444"
  };
  const msgBg: Record<string, string> = {
    success: "rgba(16,185,129,0.1)", warning: "rgba(251,191,36,0.1)",
    info:    "rgba(59,130,246,0.1)", error:   "rgba(239,68,68,0.1)"
  };
  const msgBorder: Record<string, string> = {
    success: "rgba(16,185,129,0.3)", warning: "rgba(251,191,36,0.3)",
    info:    "rgba(59,130,246,0.3)", error:   "rgba(239,68,68,0.3)"
  };
  const msgType = getMessageType() || "info";

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        html, body { margin: 0; padding: 0; height: 100%; width: 100%; }
        .login-wrapper {
          background: ${layoutStyles.background};
          color: ${layoutStyles.color};
          transition: ${layoutStyles.transition};
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          display: flex; align-items: center; justify-content: center;
          padding: 16px; overflow-y: auto;
        }
        .login-inner { width: 100%; max-width: 480px; z-index: 10; }
        .login-card {
          background: ${isDark
            ? "linear-gradient(135deg,#1a1f2e 0%,#252b3d 100%)"
            : "linear-gradient(135deg,#fff 0%,#f8f9ff 100%)"};
          border-radius: 20px;
          padding: clamp(20px,5vw,36px) clamp(16px,5vw,32px);
          border: 1px solid ${isDark ? "#2a3144" : "#e2e8f0"};
          transition: all 0.3s ease;
          box-shadow: 0 8px 24px rgba(0,0,0,0.1);
        }
        .login-card:hover {
          border-color: #667eea;
          transform: translateY(-4px);
          box-shadow: 0 12px 32px rgba(102,126,234,0.25);
        }
        .input-wrap { position: relative; width: 100%; }
        .input-icon {
          position: absolute; left: 14px; top: 50%;
          transform: translateY(-50%);
          color: #667eea; pointer-events: none;
          display: flex; align-items: center;
        }
        .eye-btn {
          position: absolute; right: 14px; top: 50%;
          transform: translateY(-50%);
          background: none; border: none; cursor: pointer;
          padding: 0; display: flex; align-items: center;
        }
        .submit-btn {
          width: 100%; padding: 15px 16px; border: none;
          border-radius: 12px; font-size: 16px; font-weight: 600;
          cursor: pointer; display: flex; align-items: center;
          justify-content: center; gap: 10px; transition: opacity 0.2s;
        }
        .submit-btn:disabled { opacity: 0.7; cursor: not-allowed; }
        @media (max-width: 360px) { .login-card { border-radius: 16px; } }
      `}</style>

      <div className="login-wrapper">
        <div className="login-inner">
          <div className="login-card">

            {/* HEADER */}
            <div style={{ textAlign: "center", marginBottom: "28px" }}>
              <div
                style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  width: "64px", height: "64px", borderRadius: "16px",
                  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  marginBottom: "16px",
                  cursor: biometricEnabled && !loading ? "pointer" : "default",
                  transition: "transform 0.2s ease",
                  opacity: loading ? 0.6 : 1,
                }}
                onClick={biometricEnabled ? triggerBiometric : undefined}
              >
                {biometricEnabled
                  ? <Fingerprint size={32} color="#fff" />
                  : <ScanFace    size={32} color="#fff" />
                }
              </div>
              <h2 style={{ fontSize: "clamp(20px,5vw,24px)", fontWeight: 600, marginBottom: "8px" }}>
                Xush kelibsizmi!
              </h2>
              <p style={{ color: isDark ? "#8b92a7" : "#64748b", fontSize: "14px" }}>
                {biometricEnabled
                  ? `${biometricType} bilan kirish mumkin`
                  : "Davom etish uchun hisobingizga kiring"}
              </p>
            </div>

            <form onSubmit={handleLogin} style={{ display: "grid", gap: "16px" }}>

              {/* LOGIN INPUT */}
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", color: isDark ? "#8b92a7" : "#64748b" }}>
                  Login
                </label>
                <div className="input-wrap">
                  <span className="input-icon"><User size={18} /></span>
                  <input
                    type="text" value={login}
                    onChange={e => setLogin(e.target.value)}
                    placeholder="Login" required
                    disabled={show2FAInput || showDeviceConfirm || showGoogleAuthInput || loading}
                    style={inputBase}
                  />
                </div>
              </div>

              {/* PAROL INPUT */}
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", color: isDark ? "#8b92a7" : "#64748b" }}>
                  Parol
                </label>
                <div className="input-wrap">
                  <span className="input-icon"><Lock size={18} /></span>
                  <input
                    type={showPassword ? "text" : "password"} value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••" required
                    disabled={show2FAInput || showDeviceConfirm || showGoogleAuthInput || loading}
                    style={{ ...inputBase, paddingRight: "48px" }}
                  />
                  <button
                    type="button" className="eye-btn"
                    onClick={() => setShowPassword(p => !p)} disabled={loading}
                  >
                    {showPassword
                      ? <EyeOff size={18} color="#8b92a7" />
                      : <Eye    size={18} color="#8b92a7" />
                    }
                  </button>
                </div>
              </div>

              {/* 2FA INPUT */}
              {show2FAInput && !showGoogleAuthInput && (
                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", color: isDark ? "#8b92a7" : "#64748b" }}>
                    Ikki bosqichli kod
                  </label>
                  <div className="input-wrap">
                    <span className="input-icon"><Shield size={18} /></span>
                    <input
                      type="text" value={twoFactorCode}
                      onChange={e => handleSet2FACode(e.target.value)}
                      placeholder="123456" maxLength={6} autoFocus disabled={loading}
                      style={{ ...inputBase, textAlign: "center", fontSize: "22px", letterSpacing: "6px", border: "2px solid #667eea" }}
                    />
                  </div>
                </div>
              )}

              {/* GOOGLE AUTH INPUT */}
              {showGoogleAuthInput && (
                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", color: isDark ? "#8b92a7" : "#64748b" }}>
                    Google Authenticator kod
                  </label>
                  <div className="input-wrap">
                    <span className="input-icon" style={{ color: "#10b981" }}><Smartphone size={18} /></span>
                    <input
                      type="text" value={googleAuthCode}
                      onChange={e => handleSetGoogleAuthCode(e.target.value)}
                      placeholder="000000" maxLength={6} autoFocus disabled={loading}
                      style={{ ...inputBase, textAlign: "center", fontSize: "22px", letterSpacing: "6px", border: "2px solid #10b981" }}
                    />
                  </div>
                </div>
              )}

              {/* BIOMETRIC TUGMA */}
              {biometricEnabled && (
                <button
                  type="button" onClick={triggerBiometric} disabled={loading}
                  className="submit-btn"
                  style={{ background: "linear-gradient(135deg,#10b981 0%,#059669 100%)", color: "#fff", marginTop: "4px" }}
                >
                  <Fingerprint size={18} />
                  {biometricType} bilan kirish
                </button>
              )}

              {/* XABAR */}
              {message && (
                <div style={{
                  padding: "12px 14px",
                  background:   msgBg[msgType],
                  border:       `1px solid ${msgBorder[msgType]}`,
                  borderRadius: "12px",
                  color:        msgColors[msgType],
                  fontSize:     "14px",
                  display: "flex", alignItems: "flex-start", gap: "8px",
                }}>
                  <span style={{ flexShrink: 0, marginTop: "1px" }}>{getMessageIcon()}</span>
                  <span style={{ wordBreak: "break-word" }}>{getMessageText()}</span>
                </div>
              )}

              {/* ASOSIY LOGIN TUGMA */}
              {!show2FAInput && !showDeviceConfirm && !showGoogleAuthInput && (
                <button
                  type="submit" disabled={loading}
                  className="submit-btn"
                  style={{ background: "linear-gradient(135deg,#667eea 0%,#764ba2 100%)", color: "#fff" }}
                >
                  {loading ? "Kirilmoqda..." : "Tasdiqlash"}
                  {!loading && <ArrowRight size={18} />}
                </button>
              )}

              {/* 2FA / GOOGLE AUTH TASDIQLASH TUGMA */}
              {(show2FAInput || showGoogleAuthInput) && !showDeviceConfirm && (
                <button
                  type="button" onClick={handleLogin}
                  disabled={
                    loading ||
                    (show2FAInput       && twoFactorCode.length   !== 6) ||
                    (showGoogleAuthInput && googleAuthCode.length  !== 6)
                  }
                  className="submit-btn"
                  style={{ background: "linear-gradient(135deg,#28a745,#218838)", color: "#fff" }}
                >
                  {loading ? "Tekshirilmoqda..." : "Kirish"}
                </button>
              )}
            </form>
          </div>
        </div>

        {/* QURILMA TASDIQLASH MODAL */}
        {showDeviceConfirm && (
          <div style={{
            position: "fixed", inset: 0,
            background: "rgba(0,0,0,0.7)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1000, padding: "16px",
          }}>
            <div style={{
              background:   isDark ? "#1a1f2e" : "#ffffff",
              padding:      "clamp(20px,5vw,32px)",
              borderRadius: "16px",
              width: "100%", maxWidth: "420px",
              textAlign: "center",
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
            }}>
              <h3 style={{ fontSize: "clamp(16px,4vw,20px)", marginBottom: "16px" }}>
                ⚠️ Boshqa qurilma faol
              </h3>
              <p style={{ marginBottom: "20px", color: isDark ? "#8b92a7" : "#64748b", fontSize: "14px" }}>
                Bu hisob hozirda boshqa qurilmada faol:<br />
                <strong>{pendingDeviceInfo?.deviceOS || "Nomaʼlum"}, {pendingDeviceInfo?.deviceType || "nomaʼlum"}</strong>
              </p>
              <p style={{ marginBottom: "24px", fontSize: "14px" }}>
                Eski qurilmadan chiqarib, yangi qurilmadan ({newDeviceInfo?.deviceOS}, {newDeviceInfo?.deviceType}) kirishni xohlaysizmi?
              </p>
              <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
                <button
                  onClick={handleConfirmDevice} disabled={loading}
                  className="submit-btn"
                  style={{
                    background: "linear-gradient(135deg,#667eea,#764ba2)",
                    color: "#fff", flex: "1", minWidth: "140px", maxWidth: "200px",
                  }}
                >
                  {loading ? "Kutilmoqda..." : "Ha, o'taman"}
                </button>
                <button
                  onClick={() => {
                    setShowDeviceConfirm(false);
                    setMessage("warning:Kirish rad etildi");
                  }}
                  disabled={loading}
                  style={{
                    flex: "1", minWidth: "120px", maxWidth: "160px",
                    padding: "15px 16px", border: "none", borderRadius: "12px",
                    background: isDark ? "#252b3d" : "#f1f5f9",
                    color:      isDark ? "#e2e8f0" : "#1e293b",
                    fontSize: "15px", fontWeight: 500,
                    cursor: loading ? "not-allowed" : "pointer",
                  }}
                >
                  Bekor
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}