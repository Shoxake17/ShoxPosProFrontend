// src/adminPages/AdminAddUser.tsx
import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import axiosInstance from "../../api/axiosInstance";
import AdminLayout from "../adminComponents/AdminLayout";
import {
  UserPlus, User, Lock, Save, Loader2, AlertCircle,
  Eye, EyeOff, Store, Tag, ChevronDown, Plus, Check, X
} from "lucide-react";

// ─── Turlar va kategoriyalar (To'liq Ro'yxat) ─────────────────────────────────

export type ShopType = {
  value:      string;
  label:      string;
  icon:       string;
  categories: string[];
};

const DEFAULT_SHOP_TYPES: ShopType[] = [];

// ─── Komponent ───────────────────────────────────────────────────────────────

const AdminAddUser: React.FC = () => {
  const navigate = useNavigate();

  const [loading, setLoading]           = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [shopTypes, setShopTypes]       = useState<ShopType[]>(DEFAULT_SHOP_TYPES);

  const [formData, setFormData] = useState({
    login:          "",
    password:       "",
    shopName:       "",
    shopType:       "",
    shopCategories: [] as string[],
  });

  const [errors, setErrors] = useState({
    login: "", password: "", shopName: "", shopType: "",
  });

  const [dropdownOpen, setDropdownOpen]     = useState(false);
  const [expandedType, setExpandedType]     = useState<string | null>(null);
  const [addingFor, setAddingFor]           = useState<string | null>(null);
  const [newCatInputs, setNewCatInputs]     = useState<Record<string, string>>({});
  const dropdownRef                         = useRef<HTMLDivElement>(null);

  // 1. Backenddan mavjud shop turlari va kategoriyalarni yuklash
  useEffect(() => {
    const fetchShopData = async () => {
      try {
        const res = await axiosInstance.get("/shop-types");
        if (res.data && res.data.length > 0) {
          setShopTypes(res.data);
        }
      } catch (err) {
        console.log("Backenddan ma'lumot olishda xato, defaultlar ishlatilmoqda.");
      }
    };
    fetchShopData();
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
        setAddingFor(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectedType = shopTypes.find((s) => s.value === formData.shopType);

  const toggleCategory = (cat: string) => {
    setFormData((prev) => ({
      ...prev,
      shopCategories: prev.shopCategories.includes(cat)
        ? prev.shopCategories.filter((c) => c !== cat)
        : [...prev.shopCategories, cat],
    }));
  };

  const selectShopType = (type: ShopType) => {
    setFormData((prev) => ({ ...prev, shopType: type.value }));
    setExpandedType(type.value);
  };

  const handleAddCategory = async (typeValue: string) => {
    const text = (newCatInputs[typeValue] || "").trim();
    if (!text) return;
    
    try {
      const targetType = shopTypes.find(s => s.value === typeValue);
      // Backendga saqlash
      await axiosInstance.post("/add-shop-category", {
        shopType: typeValue,
        category: text,
        label: targetType?.label,
        icon: targetType?.icon
      });

      // UI ni yangilash
      setShopTypes((prev) =>
        prev.map((s) => s.value === typeValue ? { ...s, categories: [...s.categories, text] } : s)
      );
      
      // Yangi qo'shilgan kategoriyani avtomatik tanlash (doim tanlangan bo'lishi kerak)
      setFormData(prev => ({ 
        ...prev, 
        shopCategories: prev.shopCategories.includes(text) ? prev.shopCategories : [...prev.shopCategories, text] 
      }));

      setNewCatInputs((prev) => ({ ...prev, [typeValue]: "" }));
      setAddingFor(null);
      toast.success("Kategoriya qo'shildi");
    } catch (err) {
      toast.error("Kategoriya saqlashda xato");
    }
  };

  const validate = () => {
    let valid = true;
    const e = { login: "", password: "", shopName: "", shopType: "" };
    if (!formData.login.trim()) { e.login = "Login kiritish majburiy"; valid = false; }
    if (!formData.password || formData.password.length < 8) { e.password = "Parol kamida 8 ta belgi"; valid = false; }
    if (!formData.shopName.trim()) { e.shopName = "Do'kon nomi majburiy"; valid = false; }
    if (!formData.shopType) { e.shopType = "Do'kon turini tanlang"; valid = false; }
    setErrors(e);
    return valid;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);

    try {
      // Backendga barcha ma'lumotlarni yuborish
      const res = await axiosInstance.post("/register", {
        login: formData.login,
        password: formData.password,
        role: "cashier",
        shopName: formData.shopName,
        shopType: formData.shopType,
        shopCategories: formData.shopCategories, // Tanlangan va yangi qo'shilgan kategoriyalar
      });

      if (res.data.success) {
        toast.success("Foydalanuvchi muvaffaqiyatli qo'shildi!");
        setTimeout(() => navigate("/admin-panel"), 1500);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout title="Yangi foydalanuvchi">
      {({ theme, tc }) => {
        const panelBg  = tc("#111827", "#ffffff");
        const inputBg  = tc("#05070a", "#f8fafc");
        const border   = tc("#1f2937", "#e2e8f0");
        const txtMain  = tc("#f1f5f9", "#0f172a");
        const txtMuted = tc("#94a3b8", "#475569");
        const dropBg   = tc("#0f172a", "#ffffff");
        const rowHov   = tc("#1e293b", "#f1f5f9");
        const catBg    = tc("#1e293b", "#f0f4ff");
        const subBg    = tc("rgba(0,0,0,0.18)", "rgba(99,102,241,0.04)");

        return (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "24px 0" }}>
            <div style={{ width: "100%", maxWidth: "580px" }}>
              <div style={{ background: panelBg, borderRadius: "28px", padding: "40px", border: `1px solid ${border}`, boxShadow: "0 10px 25px rgba(0,0,0,0.1)" }}>

                {/* Header */}
                <div style={{ marginBottom: "32px", textAlign: "center" }}>
                  <div style={{ width: "64px", height: "64px", borderRadius: "18px", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", color: "#fff" }}>
                    <UserPlus size={32} />
                  </div>
                  <h1 style={{ fontSize: "24px", fontWeight: 800, color: txtMain }}>Kassir qo'shish</h1>
                </div>

                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

                  {/* Do'kon nomi */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <label style={{ fontSize: "13px", fontWeight: 700, color: txtMuted }}><Store size={14} /> Do'kon nomi</label>
                    <input
                      type="text" placeholder="Masalan: SHOX Supermarket"
                      value={formData.shopName}
                      onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
                      style={{ padding: "14px", borderRadius: "12px", backgroundColor: inputBg, border: `2px solid ${errors.shopName ? "#ef4444" : border}`, color: txtMain, outline: "none" }}
                    />
                  </div>

                  {/* Do'kon turi */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <label style={{ fontSize: "13px", fontWeight: 700, color: txtMuted }}><Tag size={14} /> Do'kon turi va Kategoriyalar</label>
                    <div ref={dropdownRef} style={{ position: "relative" }}>
                      <button
                        type="button" onClick={() => setDropdownOpen(!dropdownOpen)}
                        style={{ width: "100%", padding: "14px", borderRadius: "12px", backgroundColor: inputBg, border: `2px solid ${errors.shopType ? "#ef4444" : border}`, color: selectedType ? txtMain : txtMuted, display: "flex", justifyContent: "space-between", cursor: "pointer" }}
                      >
                        <span>{selectedType ? `${selectedType.icon || '🛒'} ${selectedType.label || selectedType.value || 'Noma\'lum'}` : "Do'kon turini tanlang"}</span>
                        <ChevronDown size={18} style={{ transform: dropdownOpen ? "rotate(180deg)" : "none", transition: "0.2s" }} />
                      </button>

                      {dropdownOpen && (
                        <div style={{ position: "absolute", top: "110%", left: 0, right: 0, background: dropBg, border: `1px solid ${border}`, borderRadius: "16px", zIndex: 100, maxHeight: "350px", overflowY: "auto", boxShadow: "0 10px 20px rgba(0,0,0,0.2)" }}>
                          {shopTypes.map((type) => (
                            <div key={type.value} style={{ borderBottom: `1px solid ${border}` }}>
                              <div onClick={() => selectShopType(type)} style={{ padding: "12px 16px", cursor: "pointer", display: "flex", justifyContent: "space-between", background: formData.shopType === type.value ? rowHov : "transparent" }}>
                                <span style={{ color: txtMain }}>{type.icon || '🛒'} {type.label || type.value}</span>
                                <ChevronDown size={14} style={{ transform: expandedType === type.value ? "rotate(180deg)" : "none" }} />
                              </div>
                              {expandedType === type.value && (
                                <div style={{ padding: "12px", background: subBg, display: "flex", flexWrap: "wrap", gap: "6px" }}>
                                  {type.categories.map(cat => (
                                    <button
                                      key={cat} type="button" onClick={() => toggleCategory(cat)}
                                      style={{ padding: "5px 10px", borderRadius: "8px", fontSize: "11px", border: `1px solid ${formData.shopCategories.includes(cat) ? "#6366f1" : border}`, background: formData.shopCategories.includes(cat) ? "#6366f1" : catBg, color: formData.shopCategories.includes(cat) ? "#fff" : txtMuted, cursor: "pointer" }}
                                    >
                                      {cat}
                                    </button>
                                  ))}
                                  {addingFor === type.value ? (
                                    <input 
                                      autoFocus style={{ padding: "4px 8px", borderRadius: "6px", border: "1px solid #6366f1", outline: "none", fontSize: "11px", width: "90px" }}
                                      value={newCatInputs[type.value] || ""}
                                      onChange={(e) => setNewCatInputs({...newCatInputs, [type.value]: e.target.value})}
                                      onKeyDown={(e) => e.key === "Enter" && handleAddCategory(type.value)}
                                    />
                                  ) : (
                                    <button type="button" onClick={() => setAddingFor(type.value)} style={{ border: "1px dashed #6366f1", background: "none", color: "#6366f1", borderRadius: "8px", padding: "4px 8px", fontSize: "11px", cursor: "pointer" }}><Plus size={10} /> Qo'shish</button>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Tanlanganlar Preview */}
                  {formData.shopCategories.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                      {formData.shopCategories.map(cat => (
                        <span key={cat} style={{ padding: "4px 8px", background: "rgba(99,102,241,0.1)", color: "#6366f1", borderRadius: "6px", fontSize: "11px", display: "flex", alignItems: "center", gap: "4px" }}>
                          {cat} <X size={10} onClick={() => toggleCategory(cat)} style={{ cursor: "pointer" }} />
                        </span>
                      ))}
                    </div>
                  )}

                  <hr style={{ border: "none", borderTop: `1px solid ${border}`, margin: "10px 0" }} />

                  {/* Login/Password */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <label style={{ fontSize: "13px", fontWeight: 700, color: txtMuted }}><User size={14} /> Login</label>
                    <input
                      type="text" value={formData.login}
                      onChange={(e) => setFormData({ ...formData, login: e.target.value })}
                      style={{ padding: "14px", borderRadius: "12px", backgroundColor: inputBg, border: `2px solid ${errors.login ? "#ef4444" : border}`, color: txtMain, outline: "none" }}
                    />
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <label style={{ fontSize: "13px", fontWeight: 700, color: txtMuted }}><Lock size={14} /> Parol</label>
                    <div style={{ position: "relative" }}>
                      <input
                        type={showPassword ? "text" : "password"} value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        style={{ width: "100%", padding: "14px", borderRadius: "12px", backgroundColor: inputBg, border: `2px solid ${errors.password ? "#ef4444" : border}`, color: txtMain, outline: "none", boxSizing: "border-box" }}
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: txtMuted, cursor: "pointer" }}>
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit" disabled={loading}
                    style={{ marginTop: "12px", padding: "16px", borderRadius: "16px", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff", border: "none", fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}
                  >
                    {loading ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                    {loading ? "Yaratilmoqda..." : "Foydalanuvchini qo'shish"}
                  </button>
                </form>
              </div>
            </div>
          </div>
        );
      }}
    </AdminLayout>
  );
};

export default AdminAddUser;