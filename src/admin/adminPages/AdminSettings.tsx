// src/admin/adminPages/AdminSettings.tsx
import React, { useState } from "react";
import AdminLayout from "../adminComponents/AdminLayout";
import {
  User, Bell, Shield, Database,
  Globe, Moon, Sun, Lock, ChevronRight,
} from "lucide-react";
import { getSessionLogin } from "../../utils/clientSession";
import ChangePassword from "../adminComponents/adminSettings/AdminChangePassword"; // ← import
import Admin2FA from "../adminComponents/adminSettings/Admin2FA"; // ← import
import { requestNotificationPermission, notificationStorage } from "../adminUtils/notificationUtils";
import { toast } from "sonner";

export default function AdminSettings() {
  const [notifications,   setNotifications]  = useState(notificationStorage.isEnabled());
  const [hoveredSetting,  setHoveredSetting]  = useState<string | null>(null);
  const [isPassModalOpen, setIsPassModalOpen] = useState(false);
  const [is2FAModalOpen,  setIs2FAModalOpen]  = useState(false);

  const currentUserLogin = getSessionLogin() || "—";

  const settingsGroups = (theme: "dark" | "light", toggleTheme: () => void) => [
    {
      title: "Umumiy sozlamalar",
      items: [
        {
          id:          "lang",
          icon:        Globe,
          title:       "Til",
          description: "Interfeys tilini tanlash",
          value:       "O'zbek",
          onClick:     () => console.log("Til sozlamalari"),
        },
        {
          id:          "theme",
          icon:        theme === "dark" ? Moon : Sun,
          title:       "Mavzu",
          description: "Yorug' yoki qorong'i rejim",
          value:       theme === "dark" ? "Qorong'i" : "Yorug'",
          onClick:     toggleTheme,
        },
        {
          id:          "notifications",
          icon:        Bell,
          title:       "Bildirishnomalar",
          description: "Yangi xabarlar haqida bildirishnoma olish",
          value:       notifications ? "Yoqilgan" : "O'chirilgan",
          onClick:     async () => {
            if (!notifications) {
              const granted = await requestNotificationPermission();
              if (granted) {
                setNotifications(true);
                notificationStorage.setEnabled(true);
                toast.success("Bildirishnomalar yoqildi");
              } else {
                toast.error("Brauzerda bildirishnomalarga ruxsat berilmagan");
              }
            } else {
              setNotifications(false);
              notificationStorage.setEnabled(false);
              toast.info("Bildirishnomalar o'chirildi");
            }
          },
        },
      ],
    },
    {
      title: "Xavfsizlik",
      items: [
        {
          id:          "password",
          icon:        Lock,
          title:       "Parolni o'zgartirish",
          description: "Admin parolini yangilash",
          onClick:     () => setIsPassModalOpen(true),
        },
        {
          id:          "2fa",
          icon:        Shield,
          title:       "Ikki faktorli autentifikatsiya",
          description: "Qo'shimcha xavfsizlik qatlami",
          onClick:     () => setIs2FAModalOpen(true),
        },
      ],
    },
    {
      title: "Ma'lumotlar",
      items: [
        {
          id:          "backup",
          icon:        Database,
          title:       "Backup",
          description: "Zaxira nusxa yaratish",
          onClick:     () => console.log("Backup"),
        },
        {
          id:          "profile",
          icon:        User,
          title:       "Shaxsiy ma'lumotlar",
          description: "Profil sozlamalari",
          onClick:     () => console.log("Profil"),
        },
      ],
    },
  ];

  return (
    <AdminLayout title="Sozlamalar">
      {({ theme, tc }) => {
        // ✅ Reload yo'q — Custom Event orqali tema o'zgartiriladi
        const toggleTheme = () => {
          const newTheme = theme === "dark" ? "light" : "dark";
          localStorage.setItem("adminTheme", newTheme);
          window.dispatchEvent(new Event("adminThemeChanged"));
        };

        return (
          <div style={{ display: "flex", flexDirection: "column", gap: "40px" }}>

            {/* ── Settings Cards ── */}
            {settingsGroups(theme, toggleTheme).map((group, gIdx) => (
              <section key={gIdx}>
                <h2
                  style={{
                    fontSize:     "18px",
                    fontWeight:   700,
                    color:        theme === "dark" ? "#fff" : "#1a1f2e",
                    marginBottom: "20px",
                    display:      "flex",
                    alignItems:   "center",
                    gap:          "10px",
                  }}
                >
                  <div style={{ width: "4px", height: "18px", background: "#6366f1", borderRadius: "2px" }} />
                  {group.title}
                </h2>

                <div
                  style={{
                    display:             "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))",
                    gap:                 "20px",
                  }}
                >
                  {group.items.map((item) => {
                    const Icon      = item.icon;
                    const isHovered = hoveredSetting === item.id;

                    return (
                      <div
                        key={item.id}
                        onMouseEnter={() => setHoveredSetting(item.id)}
                        onMouseLeave={() => setHoveredSetting(null)}
                        onClick={item.onClick}
                        style={{
                          background:   theme === "dark"
                            ? "linear-gradient(145deg, #111827, #1e293b)"
                            : "linear-gradient(145deg, #ffffff, #f9fafb)",
                          borderRadius: "20px",
                          padding:      "24px",
                          border:       `1px solid ${isHovered ? "#6366f1" : theme === "dark" ? "#1f2937" : "#e5e7eb"}`,
                          cursor:       "pointer",
                          transition:   "all 0.3s cubic-bezier(0.4,0,0.2,1)",
                          transform:    isHovered ? "translateY(-4px)" : "translateY(0)",
                          boxShadow:    isHovered ? "0 12px 24px -8px rgba(99,102,241,0.3)" : "none",
                          display:      "flex",
                          alignItems:   "flex-start",
                          gap:          "20px",
                        }}
                      >
                        <div
                          style={{
                            width:          "48px",
                            height:         "48px",
                            borderRadius:   "14px",
                            background:     theme === "dark" ? "rgba(99,102,241,0.1)" : "rgba(99,102,241,0.05)",
                            color:          "#6366f1",
                            display:        "flex",
                            alignItems:     "center",
                            justifyContent: "center",
                            flexShrink:     0,
                            transition:     "all 0.3s ease",
                            transform:      isHovered ? "scale(1.1)" : "scale(1)",
                          }}
                        >
                          <Icon size={24} />
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h3
                            style={{
                              fontSize:       "17px",
                              fontWeight:     700,
                              color:          theme === "dark" ? "#f1f5f9" : "#1a1f2e",
                              marginBottom:   "4px",
                              display:        "flex",
                              alignItems:     "center",
                              justifyContent: "space-between",
                            }}
                          >
                            {item.title}
                            <ChevronRight
                              size={18}
                              style={{
                                color:      "#64748b",
                                transform:  isHovered ? "translateX(4px)" : "translateX(0)",
                                transition: "transform 0.3s ease",
                              }}
                            />
                          </h3>
                          <p style={{ fontSize: "14px", color: "#64748b", marginBottom: item.value ? "12px" : "0", lineHeight: "1.5" }}>
                            {item.description}
                          </p>
                          {item.value && (
                            <span style={{
                              display:      "inline-flex",
                              alignItems:   "center",
                              padding:      "4px 12px",
                              borderRadius: "8px",
                              background:   theme === "dark" ? "rgba(34,197,94,0.1)" : "rgba(34,197,94,0.05)",
                              fontSize:     "12px",
                              color:        "#22c55e",
                              fontWeight:   600,
                            }}>
                              <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#22c55e", marginRight: "8px" }} />
                              {item.value}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}

            {/* ✅ ChangePassword modal — alohida komponent sifatida */}
            {isPassModalOpen && (
              <ChangePassword
                theme={theme}
                tc={tc}
                onClose={() => setIsPassModalOpen(false)}
              />
            )}

            {is2FAModalOpen && (
              <Admin2FA
                theme={theme}
                tc={tc}
                onClose={() => setIs2FAModalOpen(false)}
              />
            )}
          </div>
        );
      }}
    </AdminLayout>
  );
}