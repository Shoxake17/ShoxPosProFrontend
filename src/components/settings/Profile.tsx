import React, { useState, useEffect } from "react";
import { X, User, Phone, Edit2, Save, Camera, Hash } from "lucide-react";
// ✅ 1. To'g'ri import: Standart react-i18next hooki
import { useTranslation } from 'react-i18next';
import { api } from "../../utils/api";
import { toast } from "sonner";
import { getSessionLogin } from "../../utils/clientSession";

interface ProfileProps {
  isOpen: boolean;
  onClose: () => void;
  theme: "dark" | "light";
  userImage: string | null;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function Profile({ isOpen, onClose, theme }: ProfileProps) {
  // ✅ 2. i18next hookidan foydalanamiz (settings namespace bilan)
  const { t } = useTranslation(['settings', 'common']);
  const login = getSessionLogin();

  const [isEditing, setIsEditing] = useState(false);
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

  // Profil ma'lumotlarini yuklash
  useEffect(() => {
    if (!isOpen || !login) return;

    const fetchProfile = async () => {
      try {
        const res = await api(`/api/users/profile?login=${login}`);
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
        // ✅ Namespace bilan tarjima
        console.error(t("settings:errorLoadingProfile"), err);
      }
    };

    fetchProfile();
  }, [isOpen, login, t]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    if (!formData.firstName.trim()) {
      toast.error(t("settings:nameRequired"));
      return;
    }

    setLoading(true);
    const data = new FormData();
    data.append("login", login!);
    data.append("firstName", formData.firstName);
    data.append("lastName", formData.lastName);
    data.append("phoneNumber", formData.phoneNumber);
    if (selectedFile) {
      data.append("avatar", selectedFile);
    }

    try {
      const res = await api("/api/users/profile", {
        method: "PUT",
        body: data,
      });

      if (res.ok) {
        const result = await res.json();
        toast.success(t("settings:updateSuccess"));
        
        const sessionUserRaw = sessionStorage.getItem("currentUser");
        if (sessionUserRaw) {
          const sessionUser = JSON.parse(sessionUserRaw);
          sessionUser.firstName = result.user.firstName;
          sessionUser.lastName = result.user.lastName;
          sessionUser.image = result.user.avatarUrl;
          sessionStorage.setItem("currentUser", JSON.stringify(sessionUser));
        }

        if (result.user.avatarUrl) {
          localStorage.setItem("userImage", result.user.avatarUrl);
          window.dispatchEvent(new Event("storage"));
          window.dispatchEvent(new Event("profileUpdated"));
        }
        setIsEditing(false);
      } else {
        toast.error(t("settings:updateError"));
      }
    } catch (err) {
      toast.error(t("settings:serverError"));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setSelectedFile(null);
    setPreviewUrl(formData.avatarUrl);
  };

  if (!isOpen) return null;

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "14px 16px",
    borderRadius: "12px",
    fontSize: "15px",
    background: theme === "dark" ? "#0f1420" : "#f8f9ff",
    border: `1px solid ${theme === "dark" ? "#2a3144" : "#e2e8f0"}`,
    color: theme === "dark" ? "#fff" : "#1a1f2e",
    boxSizing: "border-box",
    transition: "all 0.2s ease"
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    marginBottom: "8px",
    fontSize: "14px",
    fontWeight: 500,
    color: theme === "dark" ? "#8b92a7" : "#64748b"
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0, 0, 0, 0.6)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 1000, backdropFilter: "blur(8px)",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: theme === "dark" ? "linear-gradient(135deg, #1a1f2e 0%, #252b3d 100%)" : "#ffffff",
          borderRadius: "24px", padding: "32px", width: "90%", maxWidth: "520px",
          border: `1px solid ${theme === "dark" ? "#2a3144" : "#e2e8f0"}`,
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)", position: "relative",
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute", top: "16px", right: "16px", background: "transparent",
            border: "none", cursor: "pointer", color: theme === "dark" ? "#8b92a7" : "#64748b",
          }}
        >
          <X size={24} />
        </button>

        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div
            onClick={() => isEditing && document.getElementById("profileImageInput")?.click()}
            style={{
              width: "120px", height: "120px", borderRadius: "50%",
              background: "linear-gradient(135deg, #667eea, #764ba2)",
              margin: "0 auto 20px", display: "flex", alignItems: "center",
              justifyContent: "center", cursor: isEditing ? "pointer" : "default", overflow: "hidden",
              position: "relative", border: `4px solid ${theme === "dark" ? "#1a1f2e" : "#e2e8f0"}`,
            }}
          >
            {previewUrl ? (
              <img src={previewUrl} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <User size={56} color="#fff" />
            )}
            {isEditing && (
              <div style={{ position: "absolute", bottom: 0, right: 0, background: "rgba(0,0,0,0.6)", borderRadius: "50%", padding: "8px" }}>
                <Camera size={18} color="#fff" />
              </div>
            )}
          </div>
          <input id="profileImageInput" type="file" accept="image/*" onChange={handleFileChange} style={{ display: "none" }} />

          <h2 style={{ fontSize: "26px", fontWeight: 700, marginBottom: "8px", color: theme === "dark" ? "#fff" : "#1a1f2e" }}>
            {t("settings:profileTitle")}
          </h2>
          <p style={{ color: theme === "dark" ? "#8b92a7" : "#64748b", fontSize: "14px" }}>
            {t("settings:profileSubtitle")}
          </p>
        </div>

        <div style={{ display: "grid", gap: "20px" }}>
          <div style={{ display: "flex", gap: "15px" }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>{t("settings:firstName")}</label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                disabled={!isEditing}
                placeholder={t("settings:firstNamePlaceholder")}
                style={inputStyle}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>{t("settings:lastName")}</label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                disabled={!isEditing}
                placeholder={t("settings:lastNamePlaceholder")}
                style={inputStyle}
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>{t("settings:phoneLabel")}</label>
            <div style={{ position: "relative" }}>
              <Phone style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", color: "#667eea", pointerEvents: "none" }} size={20} />
              <input
                type="tel"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                disabled={!isEditing}
                placeholder="+998 90 123 45 67"
                style={{ ...inputStyle, paddingLeft: "48px" }}
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>{t("settings:chatIdLabel")}</label>
            <div style={{ position: "relative" }}>
              <Hash style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", color: "#6366f1", pointerEvents: "none" }} size={20} />
              <input
                type="text"
                value={formData.uniqueChatId}
                readOnly
                style={{
                  ...inputStyle,
                  paddingLeft: "48px",
                  background: theme === "dark" ? "#091020" : "#f1f5f9",
                  color: "#6366f1",
                  fontWeight: 700
                }}
              />
            </div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "center", gap: "16px", marginTop: "32px" }}>
          {isEditing ? (
            <>
              <button
                onClick={handleSave}
                disabled={loading}
                style={{
                  padding: "14px 36px", background: "linear-gradient(135deg, #28a745 0%, #218838 100%)",
                  color: "#fff", border: "none", borderRadius: "12px", fontSize: "16px", fontWeight: 600,
                  cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: "8px",
                }}
              >
                {loading ? t("settings:savingBtn") : <><Save size={20} /> {t("settings:saveBtn")}</>}
              </button>
              <button
                onClick={handleCancel}
                style={{
                  padding: "14px 36px", background: theme === "dark" ? "#1a1f2e" : "#f1f5f9",
                  color: theme === "dark" ? "#e2e8f0" : "#1e293b", border: "none", borderRadius: "12px",
                  fontSize: "16px", cursor: "pointer",
                }}
              >
                {t("settings:cancel")}
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              style={{
                padding: "14px 36px", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "#fff", border: "none", borderRadius: "12px", fontSize: "16px", fontWeight: 600,
                cursor: "pointer", display: "flex", alignItems: "center", gap: "8px",
              }}
            >
              <Edit2 size={20} />
              {t("settings:editBtn")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}