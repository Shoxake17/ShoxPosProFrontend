// src/admin/components/settings/ChangePassword.tsx
import React, { useState } from "react";
import { Eye, EyeOff, Lock, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import axiosInstance from "../../../api/axiosInstance";

interface ChangePasswordProps {
  theme: "dark" | "light";
  tc: (dark: string, light: string) => string;
  onClose: () => void;
}

export default function ChangePassword({ theme, tc, onClose }: ChangePasswordProps) {
  const [loading,         setLoading]         = useState(false);
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass,     setShowNewPass]     = useState(false);
  const [form, setForm] = useState({
    currentPassword:  "",
    newPassword:      "",
    confirmPassword:  "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (form.newPassword.length < 8)
      return toast.error("Yangi parol kamida 8 ta belgidan iborat bo'lishi kerak");

    if (form.newPassword !== form.confirmPassword)
      return toast.error("Yangi parollar mos kelmadi");

    setLoading(true);
    try {
      const res = await axiosInstance.post("/change-password", {
        currentPassword: form.currentPassword,
        newPassword:     form.newPassword,
      });
      if (res.data.success) {
        toast.success("Parol muvaffaqiyatli o'zgartirildi");
        onClose();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  // ── Shared input style ────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    width:       "100%",
    padding:     "14px 48px 14px 16px",
    borderRadius:"14px",
    background:  tc("#05070a", "#f8fafc"),
    border:      `2px solid ${tc("#1f2937", "#e2e8f0")}`,
    color:       tc("#fff", "#1a1f2e"),
    fontSize:    "15px",
    outline:     "none",
    boxSizing:   "border-box",
    transition:  "border-color 0.2s",
  };

  const labelStyle: React.CSSProperties = {
    fontSize:   "14px",
    fontWeight: 700,
    color:      tc("#94a3b8", "#475569"),
    marginLeft: "4px",
  };

  return (
    /* Backdrop */
    <div
      onClick={onClose}
      style={{
        position:       "fixed",
        inset:          0,
        background:     "rgba(0,0,0,0.6)",
        backdropFilter: "blur(8px)",
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        zIndex:         1000,
        padding:        "20px",
      }}
    >
      {/* Modal */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background:   tc("#111827", "#fff"),
          width:        "100%",
          maxWidth:     "450px",
          borderRadius: "24px",
          padding:      "32px",
          boxShadow:    "0 25px 50px -12px rgba(0,0,0,0.5)",
          border:       `1px solid ${tc("#1f2937", "#e5e7eb")}`,
          position:     "relative",
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position:     "absolute",
            right:        "20px",
            top:          "20px",
            background:   "none",
            border:       "none",
            cursor:       "pointer",
            color:        "#64748b",
            padding:      "8px",
            borderRadius: "12px",
            display:      "flex",
            transition:   "all 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = tc("rgba(255,255,255,0.07)", "rgba(0,0,0,0.06)"))}
          onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{
            width:          "60px",
            height:         "60px",
            borderRadius:   "18px",
            background:     "rgba(99,102,241,0.1)",
            color:          "#6366f1",
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
            margin:         "0 auto 16px",
          }}>
            <Lock size={28} />
          </div>
          <h2 style={{ fontSize: "22px", fontWeight: 800, color: tc("#fff", "#1a1f2e"), margin: 0 }}>
            Parolni o'zgartirish
          </h2>
          <p style={{ color: "#64748b", fontSize: "14px", marginTop: "8px" }}>
            Xavfsizlik uchun kuchli paroldan foydalaning
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

          {/* Current password */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <label style={labelStyle}>Joriy parol</label>
            <div style={{ position: "relative" }}>
              <input
                type={showCurrentPass ? "text" : "password"}
                required
                placeholder="••••••••"
                value={form.currentPassword}
                onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
                style={inputStyle}
              />
              <button
                type="button"
                onClick={() => setShowCurrentPass((v) => !v)}
                style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#64748b", cursor: "pointer", display: "flex" }}
              >
                {showCurrentPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* New password */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <label style={labelStyle}>Yangi parol</label>
            <div style={{ position: "relative" }}>
              <input
                type={showNewPass ? "text" : "password"}
                required
                placeholder="Kamida 8 ta belgi"
                value={form.newPassword}
                onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                style={inputStyle}
              />
              <button
                type="button"
                onClick={() => setShowNewPass((v) => !v)}
                style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#64748b", cursor: "pointer", display: "flex" }}
              >
                {showNewPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Confirm password */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <label style={labelStyle}>Parolni tasdiqlang</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              style={{ ...inputStyle, padding: "14px 16px" }}
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop:      "12px",
              padding:        "16px",
              borderRadius:   "16px",
              background:     "linear-gradient(135deg, #6366f1, #8b5cf6)",
              color:          "#fff",
              border:         "none",
              fontSize:       "16px",
              fontWeight:     700,
              cursor:         loading ? "not-allowed" : "pointer",
              display:        "flex",
              alignItems:     "center",
              justifyContent: "center",
              gap:            "10px",
              boxShadow:      "0 10px 20px -5px rgba(99,102,241,0.4)",
              opacity:        loading ? 0.7 : 1,
              transition:     "all 0.3s",
            }}
            onMouseEnter={(e) => { if (!loading) e.currentTarget.style.transform = "translateY(-2px)"; }}
            onMouseLeave={(e) => { if (!loading) e.currentTarget.style.transform = "translateY(0)"; }}
          >
            {loading
              ? <><Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} /> Saqlanmoqda...</>
              : "Parolni yangilash"
            }
          </button>
        </form>

        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}
