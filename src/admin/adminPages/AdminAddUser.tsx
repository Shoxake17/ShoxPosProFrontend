// src/adminPages/AdminAddUser.tsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import axiosInstance from "../../api/axiosInstance";
import AdminLayout from "../adminComponents/AdminLayout";
import {
  UserPlus, User, Lock, Save, Loader2, AlertCircle, Eye, EyeOff
} from "lucide-react";

const AdminAddUser: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading]           = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({ login: "", password: "" });
  const [errors, setErrors]     = useState({ login: "", password: "" });

  const validate = () => {
    let valid = true;
    const newErrors = { login: "", password: "" };

    if (!formData.login.trim()) {
      newErrors.login = "Login kiritish majburiy";
      valid = false;
    } else if (formData.login.length < 3) {
      newErrors.login = "Login kamida 3 ta belgidan iborat bo'lishi kerak";
      valid = false;
    }

    if (!formData.password) {
      newErrors.password = "Parol kiritish majburiy";
      valid = false;
    } else if (formData.password.length < 8) {
      newErrors.password = "Parol kamida 8 ta belgidan iborat bo'lishi kerak";
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const res = await axiosInstance.post("/register", { ...formData, role: "cashier" });
      if (res.data.success) {
        toast.success("Foydalanuvchi muvaffaqiyatli qo'shildi!");
        setFormData({ login: "", password: "" });
        setTimeout(() => navigate("/admin-panel"), 1500);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || "Xatolik yuz berdi";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout
      title="Yangi foydalanuvchi"
    >
      {({ theme, tc }) => (
        <div
          style={{
            display:        "flex",
            flexDirection:  "column",
            alignItems:     "center",
            justifyContent: "center",
            flex:           1,
            minHeight:      0,
          }}
        >
          <div style={{ width: "100%", maxWidth: "550px" }}>
            <div
              style={{
                background:   tc("#111827", "#ffffff"),
                borderRadius: "28px",
                padding:      "48px",
                boxShadow:    tc("0 25px 50px -12px rgba(0,0,0,0.5)", "0 20px 25px -5px rgba(0,0,0,0.1)"),
                border:       `1px solid ${tc("#1f2937", "#e5e7eb")}`,
                transition:   "all 0.3s ease",
              }}
            >
              {/* Header */}
              <div style={{ marginBottom: "40px", textAlign: "center" }}>
                <div
                  style={{
                    width:          "72px",
                    height:         "72px",
                    borderRadius:   "22px",
                    background:     "linear-gradient(135deg, #6366f1, #8b5cf6)",
                    display:        "flex",
                    alignItems:     "center",
                    justifyContent: "center",
                    margin:         "0 auto 20px",
                    color:          "#fff",
                    boxShadow:      "0 12px 24px -6px rgba(99,102,241,0.5)",
                  }}
                >
                  <UserPlus size={36} />
                </div>
                <h1 style={{ fontSize: "26px", fontWeight: 800, marginBottom: "10px", color: tc("#fff", "#1a1f2e") }}>
                  Foydalanuvchi qo'shish
                </h1>
                <p style={{ color: "#64748b", fontSize: "15px", fontWeight: 500 }}>
                  Kassir uchun yangi login va parol yarating
                </p>
              </div>

              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
                {/* Login */}
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <label style={{ fontSize: "14px", fontWeight: 700, color: tc("#94a3b8", "#475569"), display: "flex", alignItems: "center", gap: "8px", marginLeft: "4px" }}>
                    <User size={16} /> Login
                  </label>
                  <input
                    type="text"
                    placeholder="Masalan: shox_cashier1"
                    value={formData.login}
                    onChange={(e) => setFormData({ ...formData, login: e.target.value })}
                    style={{
                      padding:         "16px 20px",
                      borderRadius:    "16px",
                      backgroundColor: tc("#05070a", "#f8fafc"),
                      border:          `2px solid ${errors.login ? "#ef4444" : tc("#1f2937", "#e2e8f0")}`,
                      color:           tc("#f1f5f9", "#0f172a"),
                      fontSize:        "15px",
                      fontWeight:      500,
                      outline:         "none",
                      transition:      "all 0.2s ease",
                      width:           "100%",
                      boxSizing:       "border-box",
                    }}
                  />
                  {errors.login && (
                    <span style={{ color: "#ef4444", fontSize: "12px", display: "flex", alignItems: "center", gap: "6px", marginLeft: "4px" }}>
                      <AlertCircle size={14} /> {errors.login}
                    </span>
                  )}
                </div>

                {/* Password */}
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <label style={{ fontSize: "14px", fontWeight: 700, color: tc("#94a3b8", "#475569"), display: "flex", alignItems: "center", gap: "8px", marginLeft: "4px" }}>
                    <Lock size={16} /> Parol
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Kamida 8 ta belgi"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      style={{
                        width:           "100%",
                        boxSizing:       "border-box",
                        padding:         "16px 56px 16px 20px",
                        borderRadius:    "16px",
                        backgroundColor: tc("#05070a", "#f8fafc"),
                        border:          `2px solid ${errors.password ? "#ef4444" : tc("#1f2937", "#e2e8f0")}`,
                        color:           tc("#f1f5f9", "#0f172a"),
                        fontSize:        "15px",
                        fontWeight:      500,
                        outline:         "none",
                        transition:      "all 0.2s ease",
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((p) => !p)}
                      style={{
                        position:  "absolute",
                        right:     "16px",
                        top:       "50%",
                        transform: "translateY(-50%)",
                        background:"none",
                        border:    "none",
                        cursor:    "pointer",
                        padding:   "8px",
                        display:   "flex",
                        alignItems:"center",
                        color:     "#64748b",
                      }}
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  {errors.password && (
                    <span style={{ color: "#ef4444", fontSize: "12px", display: "flex", alignItems: "center", gap: "6px", marginLeft: "4px" }}>
                      <AlertCircle size={14} /> {errors.password}
                    </span>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    marginTop:      "12px",
                    padding:        "18px",
                    borderRadius:   "18px",
                    background:     "linear-gradient(135deg, #6366f1, #8b5cf6)",
                    color:          "#fff",
                    border:         "none",
                    fontSize:       "16px",
                    fontWeight:     700,
                    cursor:         loading ? "not-allowed" : "pointer",
                    display:        "flex",
                    alignItems:     "center",
                    justifyContent: "center",
                    gap:            "12px",
                    boxShadow:      "0 10px 25px -5px rgba(99,102,241,0.5)",
                    transition:     "all 0.3s cubic-bezier(0.4,0,0.2,1)",
                    opacity:        loading ? 0.7 : 1,
                  }}
                  onMouseEnter={(e) => { if (!loading) { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 15px 30px -5px rgba(99,102,241,0.6)"; } }}
                  onMouseLeave={(e) => { if (!loading) { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 10px 25px -5px rgba(99,102,241,0.5)"; } }}
                >
                  {loading ? (
                    <><Loader2 size={22} style={{ animation: "spin 1s linear infinite" }} /> Yaratilmoqda...</>
                  ) : (
                    <><Save size={22} /> Foydalanuvchini qo'shish</>
                  )}
                </button>
              </form>
            </div>
          </div>

          <style>{`
            @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            input:focus {
              border-color: #6366f1 !important;
              background-color: ${theme === "dark" ? "#0a0e1a" : "#fff"} !important;
              box-shadow: 0 0 0 4px rgba(99,102,241,0.15) !important;
            }
          `}</style>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminAddUser;