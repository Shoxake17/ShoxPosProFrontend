import React, { useState, useEffect } from "react";
import { X, User, Mail, Phone, Edit2, Save, Camera } from "lucide-react";
import { useTranslation } from "../languages/Settings";

interface ProfileProps {
  isOpen: boolean;
  onClose: () => void;
  theme: "dark" | "light";
  userImage: string | null;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function Profile({ isOpen, onClose, theme, userImage, handleImageUpload }: ProfileProps) {
  const { t } = useTranslation();

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    const savedName = localStorage.getItem("userName") || t("Foydalanuvchi");
    const savedEmail = localStorage.getItem("userEmail") || "";
    const savedPhone = localStorage.getItem("userPhone") || "";

    setName(savedName);
    setEmail(savedEmail);
    setPhone(savedPhone);
  }, [isOpen, t]);

  const handleSave = () => {
    if (!name.trim()) {
      alert(t("nameEmptyError"));
      return;
    }

    localStorage.setItem("userName", name.trim());
    localStorage.setItem("userEmail", email.trim());
    localStorage.setItem("userPhone", phone.trim());
    setIsEditing(false);
  };

  const handleCancel = () => {
    const savedName = localStorage.getItem("userName") || t("Foydalanuvchi");
    const savedEmail = localStorage.getItem("userEmail") || "";
    const savedPhone = localStorage.getItem("userPhone") || "";

    setName(savedName);
    setEmail(savedEmail);
    setPhone(savedPhone);
    setIsEditing(false);
  };

  if (!isOpen) return null;

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
            onClick={() => document.getElementById("profileImageInput")?.click()}
            style={{
              width: "120px", height: "120px", borderRadius: "50%",
              background: "linear-gradient(135deg, #667eea, #764ba2)",
              margin: "0 auto 20px", display: "flex", alignItems: "center",
              justifyContent: "center", cursor: "pointer", overflow: "hidden",
              position: "relative", border: `4px solid ${theme === "dark" ? "#1a1f2e" : "#e2e8f0"}`,
            }}
          >
            {userImage ? (
              <img src={userImage} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <User size={56} color="#fff" />
            )}
            <div style={{ position: "absolute", bottom: 0, right: 0, background: "rgba(0,0,0,0.6)", borderRadius: "50%", padding: "8px" }}>
              <Camera size={18} color="#fff" />
            </div>
          </div>
          <input id="profileImageInput" type="file" accept="image/*" onChange={handleImageUpload} style={{ display: "none" }} />

          <h2 style={{ fontSize: "26px", fontWeight: 700, marginBottom: "8px", color: theme === "dark" ? "#fff" : "#1a1f2e" }}>
            {t("profile")}
          </h2>
          <p style={{ color: theme === "dark" ? "#8b92a7" : "#64748b" }}>
            {t("profileDescription")}
          </p>
        </div>

        <div style={{ display: "grid", gap: "20px" }}>
          {/* Ism */}
          <div>
            <label style={{ display: "block", marginBottom: "8px", color: theme === "dark" ? "#8b92a7" : "#64748b" }}>
              {t("nameLabel")}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!isEditing}
              placeholder={t("namePlaceholder")}
              style={{
                width: "100%", padding: "14px 16px", borderRadius: "12px", fontSize: "15px",
                background: theme === "dark" ? "#0f1420" : "#f8f9ff",
                border: `1px solid ${theme === "dark" ? "#2a3144" : "#e2e8f0"}`,
                color: theme === "dark" ? "#fff" : "#1a1f2e", boxSizing: "border-box",
              }}
            />
          </div>

          {/* Email */}
          <div>
            <label style={{ display: "block", marginBottom: "8px", color: theme === "dark" ? "#8b92a7" : "#64748b" }}>
              {t("email")}
            </label>
            <div style={{ position: "relative" }}>
              <Mail style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", color: "#667eea", pointerEvents: "none" }} size={20} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={!isEditing}
                placeholder={t("emailPlaceholder")}
                style={{
                  width: "100%", padding: "14px 16px 14px 48px", borderRadius: "12px", fontSize: "15px",
                  background: theme === "dark" ? "#0f1420" : "#f8f9ff",
                  border: `1px solid ${theme === "dark" ? "#2a3144" : "#e2e8f0"}`,
                  color: theme === "dark" ? "#fff" : "#1a1f2e", boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          {/* Telefon */}
          <div>
            <label style={{ display: "block", marginBottom: "8px", color: theme === "dark" ? "#8b92a7" : "#64748b" }}>
              {t("phoneLabel")}
            </label>
            <div style={{ position: "relative" }}>
              <Phone style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", color: "#667eea", pointerEvents: "none" }} size={20} />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={!isEditing}
                placeholder={t("phonePlaceholder")}
                style={{
                  width: "100%", padding: "14px 16px 14px 48px", borderRadius: "12px", fontSize: "15px",
                  background: theme === "dark" ? "#0f1420" : "#f8f9ff",
                  border: `1px solid ${theme === "dark" ? "#2a3144" : "#e2e8f0"}`,
                  color: theme === "dark" ? "#fff" : "#1a1f2e", boxSizing: "border-box",
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
                style={{
                  padding: "14px 36px", background: "linear-gradient(135deg, #28a745 0%, #218838 100%)",
                  color: "#fff", border: "none", borderRadius: "12px", fontSize: "16px", fontWeight: 600,
                  cursor: "pointer", display: "flex", alignItems: "center", gap: "8px",
                }}
              >
                <Save size={20} />
                {t("saveBtn")}
              </button>
              <button
                onClick={handleCancel}
                style={{
                  padding: "14px 36px", background: theme === "dark" ? "#1a1f2e" : "#f1f5f9",
                  color: theme === "dark" ? "#e2e8f0" : "#1e293b", border: "none", borderRadius: "12px",
                  fontSize: "16px", cursor: "pointer",
                }}
              >
                {t("cancel")}
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
              {t("editBtn")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}