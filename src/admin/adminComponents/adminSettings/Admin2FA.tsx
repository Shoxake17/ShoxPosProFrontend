// src/admin/adminComponents/adminSettings/Admin2FA.tsx
import React, { useState, useEffect } from "react";
import { Shield, X, Loader2, CheckCircle2, AlertCircle, Smartphone } from "lucide-react";
import { toast } from "sonner";
import axiosInstance from "../../../api/axiosInstance";

interface Admin2FAProps {
  theme: "dark" | "light";
  tc: (dark: string, light: string) => string;
  onClose: () => void;
}

export default function Admin2FA({ theme, tc, onClose }: Admin2FAProps) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [step, setStep] = useState<"status" | "setup" | "verify">("status");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [verificationCode, setVerificationCode] = useState("");

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const res = await axiosInstance.get("/google-auth/status");
      setIsEnabled(res.data.enabled);
      setStep("status");
    } catch (error) {
      console.error("2FA status error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSetup = async () => {
    setActionLoading(true);
    try {
      const res = await axiosInstance.post("/google-auth/setup");
      setQrCodeUrl(res.data.qrCodeUrl);
      setStep("setup");
    } catch (error) {
      toast.error("QR kodni yuklashda xato yuz berdi");
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerify = async () => {
    if (verificationCode.length !== 6) return;
    setActionLoading(true);
    try {
      const res = await axiosInstance.post("/google-auth/verify", {
        token: verificationCode
      });
      if (res.data.success) {
        toast.success("2FA muvaffaqiyatli yoqildi");
        setIsEnabled(true);
        setStep("status");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Kod noto'g'ri");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisable = async () => {
    if (!confirm("Ikki faktorli autentifikatsiyani o'chirmoqchimisiz?")) return;
    setActionLoading(true);
    try {
      const res = await axiosInstance.post("/google-auth/disable");
      if (res.data.success) {
        toast.success("2FA o'chirildi");
        setIsEnabled(false);
        setStep("status");
      }
    } catch (error) {
      toast.error("Xatolik yuz berdi");
    } finally {
      setActionLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "16px",
    borderRadius: "16px",
    background: tc("#05070a", "#f8fafc"),
    border: `2px solid ${tc("#1f2937", "#e2e8f0")}`,
    color: tc("#fff", "#1a1f2e"),
    fontSize: "24px",
    fontWeight: 700,
    textAlign: "center",
    letterSpacing: "8px",
    outline: "none",
    boxSizing: "border-box",
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "20px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: tc("#111827", "#fff"),
          width: "100%",
          maxWidth: "480px",
          borderRadius: "28px",
          padding: "32px",
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
          border: `1px solid ${tc("#1f2937", "#e5e7eb")}`,
          position: "relative",
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            right: "20px",
            top: "20px",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#64748b",
            padding: "8px",
            borderRadius: "12px",
            display: "flex",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = tc("rgba(255,255,255,0.07)", "rgba(0,0,0,0.06)"))}
          onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
        >
          <X size={20} />
        </button>

        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{
            width: "64px",
            height: "64px",
            borderRadius: "20px",
            background: isEnabled ? "rgba(34, 197, 94, 0.1)" : "rgba(99, 102, 241, 0.1)",
            color: isEnabled ? "#22c55e" : "#6366f1",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
          }}>
            <Shield size={32} />
          </div>
          <h2 style={{ fontSize: "24px", fontWeight: 800, color: tc("#fff", "#1a1f2e"), margin: 0 }}>
            2FA Autentifikatsiya
          </h2>
          <p style={{ color: "#64748b", fontSize: "14px", marginTop: "8px", lineHeight: "1.5" }}>
            Hisobingizni himoya qilish uchun Google Authenticator-dan foydalaning
          </p>
        </div>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "40px" }}>
            <Loader2 size={32} className="animate-spin" color="#6366f1" />
          </div>
        ) : (
          <>
            {step === "status" && (
              <div style={{ textAlign: "center" }}>
                <div style={{
                  padding: "20px",
                  borderRadius: "20px",
                  background: isEnabled ? "rgba(34, 197, 94, 0.05)" : "rgba(239, 68, 68, 0.05)",
                  border: `1px solid ${isEnabled ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)"}`,
                  marginBottom: "32px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "12px"
                }}>
                  {isEnabled ? (
                    <>
                      <CheckCircle2 size={24} color="#22c55e" />
                      <span style={{ fontWeight: 700, color: "#22c55e" }}>Hozirda faol</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle size={24} color="#ef4444" />
                      <span style={{ fontWeight: 700, color: "#ef4444" }}>O'chirilgan</span>
                    </>
                  )}
                </div>

                <button
                  onClick={isEnabled ? handleDisable : handleSetup}
                  disabled={actionLoading}
                  style={{
                    width: "100%",
                    padding: "18px",
                    borderRadius: "18px",
                    background: isEnabled ? "rgba(239, 68, 68, 0.1)" : "linear-gradient(135deg, #6366f1, #8b5cf6)",
                    color: isEnabled ? "#ef4444" : "#fff",
                    border: isEnabled ? "1px solid rgba(239, 68, 68, 0.2)" : "none",
                    fontSize: "16px",
                    fontWeight: 700,
                    cursor: actionLoading ? "not-allowed" : "pointer",
                    transition: "all 0.3s",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "10px"
                  }}
                >
                  {actionLoading ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : (
                    isEnabled ? "2FA-ni o'chirish" : "2FA-ni yoqish"
                  )}
                </button>
              </div>
            )}

            {step === "setup" && (
              <div style={{ textAlign: "center" }}>
                <div style={{
                  background: "#fff",
                  padding: "16px",
                  borderRadius: "20px",
                  display: "inline-block",
                  marginBottom: "24px",
                  boxShadow: "0 10px 25px rgba(0,0,0,0.1)"
                }}>
                  <img src={qrCodeUrl} alt="QR Code" style={{ width: "200px", height: "200px", display: "block" }} />
                </div>
                <div style={{
                  textAlign: "left",
                  background: tc("rgba(255,255,255,0.03)", "#f8fafc"),
                  padding: "20px",
                  borderRadius: "16px",
                  marginBottom: "24px"
                }}>
                  <p style={{ margin: "0 0 8px 0", fontSize: "14px", fontWeight: 700, color: tc("#fff", "#1a1f2e") }}>Qanday yoqiladi?</p>
                  <p style={{ margin: 0, fontSize: "13px", color: "#64748b", lineHeight: "1.6" }}>
                    1. Google Authenticator ilovasini oching.<br />
                    2. QR kodni skanerlang.<br />
                    3. Ilovada paydo bo'lgan 6 xonali kodni kiriting.
                  </p>
                </div>
                <button
                  onClick={() => setStep("verify")}
                  style={{
                    width: "100%",
                    padding: "18px",
                    borderRadius: "18px",
                    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                    color: "#fff",
                    border: "none",
                    fontSize: "16px",
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: "0 10px 20px -5px rgba(99, 102, 241, 0.4)"
                  }}
                >
                  Keyingi qadam
                </button>
              </div>
            )}

            {step === "verify" && (
              <div style={{ textAlign: "center" }}>
                <div style={{ marginBottom: "24px" }}>
                  <Smartphone size={40} color="#6366f1" style={{ marginBottom: "16px" }} />
                  <p style={{ fontSize: "15px", color: tc("#e2e8f0", "#475569"), fontWeight: 500 }}>
                    Ilovadagi 6 xonali kodni kiriting
                  </p>
                </div>
                
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000 000"
                  style={inputStyle}
                  autoFocus
                />

                <div style={{ display: "flex", gap: "12px", marginTop: "32px" }}>
                  <button
                    onClick={() => setStep("setup")}
                    style={{
                      flex: 1,
                      padding: "16px",
                      borderRadius: "16px",
                      background: tc("rgba(255,255,255,0.05)", "#f1f5f9"),
                      color: tc("#e2e8f0", "#1e293b"),
                      border: `1px solid ${tc("#1f2937", "#e2e8f0")}`,
                      fontWeight: 700,
                      cursor: "pointer"
                    }}
                  >
                    Orqaga
                  </button>
                  <button
                    onClick={handleVerify}
                    disabled={actionLoading || verificationCode.length !== 6}
                    style={{
                      flex: 2,
                      padding: "16px",
                      borderRadius: "16px",
                      background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                      color: "#fff",
                      border: "none",
                      fontWeight: 700,
                      cursor: (actionLoading || verificationCode.length !== 6) ? "not-allowed" : "pointer",
                      opacity: (actionLoading || verificationCode.length !== 6) ? 0.6 : 1
                    }}
                  >
                    {actionLoading ? <Loader2 size={20} className="animate-spin" /> : "Tasdiqlash"}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        <style>{`
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          .animate-spin { animation: spin 1s linear infinite; }
        `}</style>
      </div>
    </div>
  );
}
