// src/adminPages/AdminEditUserCategories.tsx
import React, { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import axiosInstance from "../../api/axiosInstance";
import AdminLayout from "../adminComponents/AdminLayout";
import { Save, Loader2, Tag, ChevronDown, Plus, X, ArrowLeft } from "lucide-react";

// ─── ShopType tipi ──────────────────────────────────────────────────────────
type ShopType = {
  value:      string;
  label:      string;
  icon:       string;
  categories: string[];
};

const DEFAULT_SHOP_TYPES: ShopType[] = [];

// ─── Komponent ───────────────────────────────────────────────────────────────
const AdminEditUserCategories: React.FC = () => {
  const { login } = useParams<{ login: string }>();
  const navigate  = useNavigate();

  const [loading,       setLoading]       = useState(false);
  const [fetching,      setFetching]      = useState(true);
  const [shopTypes,     setShopTypes]     = useState<ShopType[]>(DEFAULT_SHOP_TYPES);
  const [userShopType,  setUserShopType]  = useState<string>("");
  const [userShopName,  setUserShopName]  = useState<string>("");
  const [selectedCats,  setSelectedCats]  = useState<string[]>([]);
  const [expandedType,  setExpandedType]  = useState<string | null>(null);
  const [dropdownOpen,  setDropdownOpen]  = useState(false);
  const [addingFor,     setAddingFor]     = useState<string | null>(null);
  const [newCatInputs,  setNewCatInputs]  = useState<Record<string, string>>({});
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ─── Foydalanuvchi ma'lumotlarini yuklash ──────────────────────────────
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const [userRes, typesRes] = await Promise.all([
          axiosInstance.get(`/users/${login}`),
          axiosInstance.get("/shop-types"),
        ]);

        const userData = userRes.data.user;
        setUserShopType(userData.shopType || "");
        setUserShopName(userData.shopName || "");
        setSelectedCats(userData.shopCategories || []);
        setExpandedType(userData.shopType || null);

        if (typesRes.data && typesRes.data.length > 0) {
          setShopTypes(typesRes.data);
        }
      } catch (err) {
        toast.error("Foydalanuvchi ma'lumotlarini yuklashda xato");
      } finally {
        setFetching(false);
      }
    };
    if (login) fetchUser();
  }, [login]);

  // ─── Tashqarida click → dropdown yopish ────────────────────────────────
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

  const selectedTypeObj = shopTypes.find(s => s.value === userShopType);

  // ─── Kategoriya toggle ──────────────────────────────────────────────────
  const toggleCategory = (cat: string) => {
    setSelectedCats(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  // ─── Shop type o'zgartirish ─────────────────────────────────────────────
  const selectShopType = (type: ShopType) => {
    setUserShopType(type.value);
    setExpandedType(type.value);
    // Shop type o'zgarganda kategoriyalarni reset qilmaymiz —
    // admin o'zi tanlaydi
  };

  // ─── Yangi kategoriya qo'shish ──────────────────────────────────────────
  const handleAddCategory = async (typeValue: string) => {
    const text = (newCatInputs[typeValue] || "").trim();
    if (!text) return;

    try {
      const targetType = shopTypes.find(s => s.value === typeValue);
      await axiosInstance.post("/add-shop-category", {
        shopType: typeValue,
        category: text,
        label: targetType?.label,
        icon: targetType?.icon
      });

      setShopTypes(prev =>
        prev.map(s => s.value === typeValue ? { ...s, categories: [...s.categories, text] } : s)
      );
      // Avtomatik tanlash (doim tanlangan bo'lishi kerak)
      setSelectedCats(prev => prev.includes(text) ? prev : [...prev, text]);
      setNewCatInputs(prev => ({ ...prev, [typeValue]: "" }));
      setAddingFor(null);
      toast.success("Kategoriya qo'shildi");
    } catch (err) {
      toast.error("Kategoriya saqlashda xato");
    }
  };

  // ─── Saqlash ────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!login) return;
    setLoading(true);
    try {
      await axiosInstance.post("/update-user-categories", {
        login,
        shopType:       userShopType,
        shopCategories: selectedCats,
      });
      toast.success("Kategoriyalar muvaffaqiyatli yangilandi!");
      setTimeout(() => navigate("/admin-panel"), 1500);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout title="Kategoriyalarni tahrirlash">
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
            <div style={{ width: "100%", maxWidth: "620px" }}>

              {/* Orqaga */}
              <button
                onClick={() => navigate(-1)}
                style={{ display: "flex", alignItems: "center", gap: "8px", background: "none", border: "none", color: txtMuted, cursor: "pointer", marginBottom: "16px", fontSize: "14px" }}
              >
                <ArrowLeft size={16} /> Orqaga
              </button>

              <div style={{ background: panelBg, borderRadius: "28px", padding: "40px", border: `1px solid ${border}`, boxShadow: "0 10px 25px rgba(0,0,0,0.1)" }}>

                {/* Header */}
                <div style={{ marginBottom: "28px" }}>
                  <h1 style={{ fontSize: "22px", fontWeight: 800, color: txtMain }}>
                    <Tag size={20} style={{ verticalAlign: "middle", marginRight: 8 }} />
                    Kategoriyalarni tahrirlash
                  </h1>
                  <p style={{ color: txtMuted, fontSize: "14px", marginTop: "6px" }}>
                    <strong style={{ color: txtMain }}>@{login}</strong>
                    {userShopName && <> — {userShopName}</>}
                  </p>
                </div>

                {fetching ? (
                  <div style={{ textAlign: "center", padding: "40px", color: txtMuted }}>
                    <Loader2 size={32} className="animate-spin" style={{ margin: "0 auto" }} />
                    <p style={{ marginTop: 12 }}>Yuklanmoqda...</p>
                  </div>
                ) : (
                  <>
                    {/* Do'kon turi tanlash */}
                    <div style={{ marginBottom: "20px" }}>
                      <label style={{ fontSize: "13px", fontWeight: 700, color: txtMuted, display: "block", marginBottom: "8px" }}>
                        Do'kon turi
                      </label>
                      <div ref={dropdownRef} style={{ position: "relative" }}>
                        <button
                          type="button"
                          onClick={() => setDropdownOpen(!dropdownOpen)}
                          style={{ width: "100%", padding: "14px", borderRadius: "12px", backgroundColor: inputBg, border: `2px solid ${border}`, color: selectedTypeObj ? txtMain : txtMuted, display: "flex", justifyContent: "space-between", cursor: "pointer" }}
                        >
                          <span>{selectedTypeObj ? `${selectedTypeObj.icon || '🛒'} ${selectedTypeObj.label || selectedTypeObj.value}` : "Do'kon turini tanlang"}</span>
                          <ChevronDown size={18} style={{ transform: dropdownOpen ? "rotate(180deg)" : "none", transition: "0.2s" }} />
                        </button>

                        {dropdownOpen && (
                          <div style={{ position: "absolute", top: "110%", left: 0, right: 0, background: dropBg, border: `1px solid ${border}`, borderRadius: "16px", zIndex: 100, maxHeight: "350px", overflowY: "auto", boxShadow: "0 10px 20px rgba(0,0,0,0.2)" }}>
                            {shopTypes.map(type => (
                              <div key={type.value} style={{ borderBottom: `1px solid ${border}` }}>
                                <div
                                  onClick={() => selectShopType(type)}
                                  style={{ padding: "12px 16px", cursor: "pointer", display: "flex", justifyContent: "space-between", background: userShopType === type.value ? rowHov : "transparent" }}
                                >
                                  <span style={{ color: txtMain }}>{type.icon || '🛒'} {type.label || type.value}</span>
                                  <ChevronDown size={14} style={{ transform: expandedType === type.value ? "rotate(180deg)" : "none" }} />
                                </div>

                                {expandedType === type.value && (
                                  <div style={{ padding: "12px", background: subBg, display: "flex", flexWrap: "wrap", gap: "6px" }}>
                                    {type.categories.map(cat => (
                                      <button
                                        key={cat} type="button"
                                        onClick={() => toggleCategory(cat)}
                                        style={{
                                          padding: "5px 10px", borderRadius: "8px", fontSize: "11px",
                                          border: `1px solid ${selectedCats.includes(cat) ? "#6366f1" : border}`,
                                          background: selectedCats.includes(cat) ? "#6366f1" : catBg,
                                          color: selectedCats.includes(cat) ? "#fff" : txtMuted,
                                          cursor: "pointer",
                                        }}
                                      >
                                        {cat}
                                      </button>
                                    ))}

                                    {/* Yangi kategoriya qo'shish */}
                                    {addingFor === type.value ? (
                                      <input
                                        autoFocus
                                        style={{ padding: "4px 8px", borderRadius: "6px", border: "1px solid #6366f1", outline: "none", fontSize: "11px", width: "110px" }}
                                        value={newCatInputs[type.value] || ""}
                                        onChange={e => setNewCatInputs({ ...newCatInputs, [type.value]: e.target.value })}
                                        onKeyDown={e => e.key === "Enter" && handleAddCategory(type.value)}
                                        placeholder="Yangi kategoriya..."
                                      />
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => setAddingFor(type.value)}
                                        style={{ border: "1px dashed #6366f1", background: "none", color: "#6366f1", borderRadius: "8px", padding: "4px 8px", fontSize: "11px", cursor: "pointer" }}
                                      >
                                        <Plus size={10} /> Qo'shish
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Tanlangan kategoriyalar preview */}
                    {selectedCats.length > 0 && (
                      <div style={{ marginBottom: "24px" }}>
                        <p style={{ fontSize: "13px", fontWeight: 700, color: txtMuted, marginBottom: "10px" }}>
                          Tanlangan kategoriyalar ({selectedCats.length} ta):
                        </p>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                          {selectedCats.map(cat => (
                            <span
                              key={cat}
                              style={{ padding: "6px 10px", background: "rgba(99,102,241,0.12)", color: "#6366f1", borderRadius: "8px", fontSize: "12px", display: "flex", alignItems: "center", gap: "6px", border: "1px solid rgba(99,102,241,0.25)" }}
                            >
                              {cat}
                              <X
                                size={12}
                                onClick={() => toggleCategory(cat)}
                                style={{ cursor: "pointer", opacity: 0.7 }}
                              />
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedCats.length === 0 && (
                      <div style={{ marginBottom: "24px", padding: "14px", borderRadius: "12px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", fontSize: "13px" }}>
                        ⚠️ Hech qanday kategoriya tanlanmagan. Foydalanuvchi barcha kategoriyalarni ko'ra oladi.
                      </div>
                    )}

                    {/* Saqlash tugmasi */}
                    <button
                      onClick={handleSave}
                      disabled={loading}
                      style={{ width: "100%", padding: "16px", borderRadius: "16px", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff", border: "none", fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", fontSize: "16px" }}
                    >
                      {loading ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                      {loading ? "Saqlanmoqda..." : "Kategoriyalarni saqlash"}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      }}
    </AdminLayout>
  );
};

export default AdminEditUserCategories;
