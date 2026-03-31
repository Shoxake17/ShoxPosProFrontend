// src/admin/adminComponents/adminSettings/AdminProfile.tsx
import React, { useState, useEffect } from "react";
import { X, Camera, Save, Phone, User as UserIcon, Hash } from "lucide-react";
import { api } from "../../../utils/api";
import { toast } from "sonner";

interface AdminProfileProps {
  theme: "dark" | "light";
  tc: (dark: string, light: string) => string;
  onClose: () => void;
  currentUserLogin: string;
}

export default function AdminProfile({ theme, tc, onClose, currentUserLogin }: AdminProfileProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phoneNumber: "",
    avatarUrl: "",
    uniqueChatId: ""
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api(`/api/users/profile?login=${currentUserLogin}`);
        if (res.ok) {
          const data = await res.json();
          setFormData({
            firstName: data.firstName || "",
            lastName: data.lastName || "",
            phoneNumber: data.phoneNumber || "",
            avatarUrl: data.avatarUrl || "",
            uniqueChatId: data.uniqueChatId || ""
          });
          setPreviewUrl(data.avatarUrl);
        }
      } catch (err) {
        toast.error("Profilni yuklashda xato");
      }
    };
    fetchProfile();
  }, [currentUserLogin]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const data = new FormData();
    data.append("login", currentUserLogin);
    data.append("firstName", formData.firstName);
    data.append("lastName", formData.lastName);
    data.append("phoneNumber", formData.phoneNumber);
    if (selectedFile) {
      data.append("avatar", selectedFile);
    }

    try {
      const res = await api("/api/users/profile", {
        method: "PUT",
        body: data, // FormData ishlatilganda content-type o'zi sozlanadi
      });

      if (res.ok) {
        const result = await res.json();
        toast.success("Profil muvaffaqiyatli yangilandi");
        if (result.user.avatarUrl) {
          localStorage.setItem("userImage", result.user.avatarUrl);
          window.dispatchEvent(new Event("storage"));
        }
        onClose();
      } else {
        toast.error("Yangilashda xato yuz berdi");
      }
    } catch (err) {
      toast.error("Server bilan ulanishda xato");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
      backdropFilter: "blur(4px)"
    }}>
      <div style={{
        width: "450px", background: tc("#161d2f", "#fff"), borderRadius: "20px",
        padding: "30px", position: "relative", boxShadow: "0 20px 50px rgba(0,0,0,0.3)"
      }}>
        <button onClick={onClose} style={{
          position: "absolute", top: "20px", right: "20px", background: "none",
          border: "none", color: "#64748b", cursor: "pointer"
        }}><X size={24} /></button>

        <h2 style={{ fontSize: "24px", fontWeight: 700, marginBottom: "25px", color: tc("#fff", "#1a1f2e") }}>Profil sozlamalari</h2>

        <form onSubmit={handleSubmit}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "30px" }}>
            <div style={{ position: "relative" }}>
              <div style={{
                width: "120px", height: "120px", borderRadius: "30px", overflow: "hidden",
                background: tc("#1e293b", "#f1f5f9"), border: "3px solid #6366f1",
                display: "flex", alignItems: "center", justifyContent: "center"
              }}>
                {previewUrl ? (
                  <img src={previewUrl} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <UserIcon size={50} color="#64748b" />
                )}
              </div>
              <label style={{
                position: "absolute", bottom: "-10px", right: "-10px",
                width: "40px", height: "40px", borderRadius: "12px", background: "#6366f1",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", cursor: "pointer", boxShadow: "0 4px 10px rgba(99,102,241,0.4)"
              }}>
                <Camera size={20} />
                <input type="file" hidden onChange={handleFileChange} accept="image/*" />
              </label>
            </div>
          </div>

          <div style={{ display: "flex", gap: "15px", marginBottom: "15px" }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: "12px", color: "#64748b", marginBottom: "5px" }}>Ism</label>
              <input
                type="text"
                value={formData.firstName}
                onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                placeholder="Ism"                style={{ width: "100%", padding: "12px", borderRadius: "10px", border: "none", background: tc("#1e293b", "#f1f5f9"), color: tc("#fff", "#1a1f2e"), outline: "none" }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: "12px", color: "#64748b", marginBottom: "5px" }}>Ism</label>
              <input
                type="text"
                value={formData.lastName}
                onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                placeholder="Familiya"                style={{ width: "100%", padding: "12px", borderRadius: "10px", border: "none", background: tc("#1e293b", "#f1f5f9"), color: tc("#fff", "#1a1f2e"), outline: "none" }}
              />
            </div>
          </div>

          <div style={{ marginBottom: "15px" }}>
            <label style={{ display: "block", fontSize: "12px", color: "#64748b", marginBottom: "5px" }}>Telefon raqam</label>
            <div style={{ position: "relative" }}>
              <Phone size={18} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#64748b" }} />
              <input
                type="text"
                value={formData.phoneNumber}
                onChange={e => setFormData({ ...formData, phoneNumber: e.target.value })}
                placeholder="+998 90 123 45 67"
                style={{ width: "100%", padding: "12px 12px 12px 40px", borderRadius: "10px", border: "none", background: tc("#1e293b", "#f1f5f9"), color: tc("#fff", "#1a1f2e"), outline: "none" }}
              />
            </div>
          </div>

          <div style={{ marginBottom: "25px" }}>
            <label style={{ display: "block", fontSize: "12px", color: "#64748b", marginBottom: "5px" }}>Chat ID (Unikal)</label>
            <div style={{ position: "relative" }}>
              <Hash size={18} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#64748b" }} />
              <input
                type="text"
                value={formData.uniqueChatId}
                readOnly
                style={{ width: "100%", padding: "12px 12px 12px 40px", borderRadius: "10px", border: "none", background: tc("#0f1420", "#f8fafc"), color: "#6366f1", outline: "none", fontWeight: 700 }}
              />
            </div>
          </div>

          <button
            disabled={loading}
            style={{
              width: "100%", padding: "14px", borderRadius: "12px", background: "#6366f1",
              color: "#fff", border: "none", fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
              boxShadow: "0 10px 20px rgba(99,102,241,0.2)"
            }}
          >
            {loading ? "Saqlanmoqda..." : <><Save size={20} /> Saqlash</>}
          </button>
        </form>
      </div>
    </div>
  );
}
