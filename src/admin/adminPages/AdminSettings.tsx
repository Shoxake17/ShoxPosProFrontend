// src/admin/adminPages/AdminSettings.tsx
import React, { useState } from "react";
import AdminLayout from "../adminComponents/AdminLayout";
import {
  User, Bell, Shield, Database,
  Globe, Moon, Sun, Lock, ChevronRight,
} from "lucide-react";
import { getSessionLogin } from "../../utils/clientSession";
import AdminProfile from "../adminComponents/adminSettings/AdminProfile";
import { requestNotificationPermission, notificationStorage } from "../adminUtils/notificationUtils";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

// TypeScript xatolarini oldini olish uchun interfeys
interface SettingItem {
  id: string;
  icon: React.ElementType;
  title: string;
  description: string;
  value?: string;
  onClick: () => void;
}

interface SettingGroup {
  title: string;
  items: SettingItem[];
}

export default function AdminSettings() {
  const { i18n, t } = useTranslation();
  const [notifications, setNotifications] = useState(notificationStorage.isEnabled());
  const [hoveredSetting, setHoveredSetting] = useState<string | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const currentUserLogin = getSessionLogin() || "—";

  // Tilni almashtirish funksiyasi
  const changeLanguage = () => {
    const langs = ['uz', 'ru', 'en'];
    const currentLang = i18n.language;
    const nextLang = langs[(langs.indexOf(currentLang) + 1) % langs.length];
    
    i18n.changeLanguage(nextLang);
    localStorage.setItem("i18nextLng", nextLang);
    toast.success(t("languageChanged") || "Language changed");
  };

  const getSettingsGroups = (theme: "dark" | "light", toggleTheme: () => void): SettingGroup[] => [
    {
      title: t("generalSettings") || "Umumiy sozlamalar",
      items: [
        {
          id: "lang",
          icon: Globe,
          title: t("language") || "Til",
          description: t("languageDescription") || "Interfeys tilini tanlash",
          value: i18n.language === 'uz' ? "O'zbek" : i18n.language === 'ru' ? "Русский" : "English",
          onClick: changeLanguage,
        },
        {
          id: "theme",
          icon: theme === "dark" ? Moon : Sun,
          title: t("theme") || "Mavzu",
          description: t("themeDescription") || "Yorug' yoki qorong'i rejim",
          value: theme === "dark" ? (t("dark") || "Qorong'i") : (t("light") || "Yorug'"),
          onClick: toggleTheme,
        },
        {
          id: "notifications",
          icon: Bell,
          title: t("notifications") || "Bildirishnomalar",
          description: t("notificationsDescription") || "Yangi xabarlar haqidabildirishnoma olish",
          value: notifications ? (t("enabled") || "Yoqilgan") : (t("disabled") || "O'chirilgan"),
          onClick: async () => {
            if (!notifications) {
              const granted = await requestNotificationPermission();
              if (granted) {
                setNotifications(true);
                notificationStorage.setEnabled(true);
                toast.success(t("notificationsEnabled") || "Bildirishnomalar yoqildi");
              } else {
                toast.error(t("notificationsBlocked") || "Brauzerda bildirishnomalarga ruxsat berilmagan");
              }
            } else {
              setNotifications(false);
              notificationStorage.setEnabled(false);
              toast.info(t("notificationsDisabled") || "Bildirishnomalar o'chirildi");
            }
          },
        },
      ],
    },
    {
      title: t("data") || "Ma'lumotlar",
      items: [
        {
          id: "backup",
          icon: Database,
          title: t("backup") || "Backup",
          description: t("backupDescription") || "Zaxira nusxa yaratish",
          onClick: () => console.log("Backup"),
        },
        {
          id: "profile",
          icon: User,
          title: t("profile") || "Shaxsiy ma'lumotlar",
          description: t("profileDescription") || "Profil sozlamalari",
          onClick: () => setIsProfileModalOpen(true),
        },
      ],
    },
  ];

  return (
    <AdminLayout title={t("settings") || "Sozlamalar"}>
      {({ theme, tc }) => {
        const toggleTheme = () => {
          const newTheme = theme === "dark" ? "light" : "dark";
          localStorage.setItem("adminTheme", newTheme);
          window.dispatchEvent(new Event("adminThemeChanged"));
        };

        return (
          <div style={{ display: "flex", flexDirection: "column", gap: "40px" }}>
            {getSettingsGroups(theme, toggleTheme).map((group, gIdx) => (
              <section key={gIdx}>
                <h2
                  style={{
                    fontSize: "18px",
                    fontWeight: 700,
                    color: theme === "dark" ? "#fff" : "#1a1f2e",
                    marginBottom: "20px",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  <div style={{ width: "4px", height: "18px", background: "#6366f1", borderRadius: "2px" }} />
                  {group.title}
                </h2>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))",
                    gap: "20px",
                  }}
                >
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isHovered = hoveredSetting === item.id;

                    return (
                      <div
                        key={item.id}
                        onMouseEnter={() => setHoveredSetting(item.id)}
                        onMouseLeave={() => setHoveredSetting(null)}
                        onClick={item.onClick}
                        style={{
                          background: theme === "dark"
                            ? "linear-gradient(145deg, #111827, #1e293b)"
                            : "linear-gradient(145deg, #ffffff, #f9fafb)",
                          borderRadius: "20px",
                          padding: "24px",
                          border: `1px solid ${isHovered ? "#6366f1" : theme === "dark" ? "#1f2937" : "#e5e7eb"}`,
                          cursor: "pointer",
                          transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)",
                          transform: isHovered ? "translateY(-4px)" : "translateY(0)",
                          boxShadow: isHovered ? "0 12px 24px -8px rgba(99,102,241,0.3)" : "none",
                          display: "flex",
                          alignItems: "flex-start",
                          gap: "20px",
                        }}
                      >
                        <div
                          style={{
                            width: "48px",
                            height: "48px",
                            borderRadius: "14px",
                            background: theme === "dark" ? "rgba(99,102,241,0.1)" : "rgba(99,102,241,0.05)",
                            color: "#6366f1",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            transition: "all 0.3s ease",
                            transform: isHovered ? "scale(1.1)" : "scale(1)",
                          }}
                        >
                          <Icon size={24} />
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h3
                            style={{
                              fontSize: "17px",
                              fontWeight: 700,
                              color: theme === "dark" ? "#f1f5f9" : "#1a1f2e",
                              marginBottom: "4px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                            }}
                          >
                            {item.title}
                            <ChevronRight
                              size={18}
                              style={{
                                color: "#64748b",
                                transform: isHovered ? "translateX(4px)" : "translateX(0)",
                                transition: "transform 0.3s ease",
                              }}
                            />
                          </h3>
                          <p style={{ fontSize: "14px", color: "#64748b", marginBottom: item.value ? "12px" : "0", lineHeight: "1.5" }}>
                            {item.description}
                          </p>
                          {item.value && (
                            <span style={{
                              display: "inline-flex",
                              alignItems: "center",
                              padding: "4px 12px",
                              borderRadius: "8px",
                              background: theme === "dark" ? "rgba(34,197,94,0.1)" : "rgba(34,197,94,0.05)",
                              fontSize: "12px",
                              color: "#22c55e",
                              fontWeight: 600,
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

            {isProfileModalOpen && (
              <AdminProfile
                theme={theme}
                tc={tc}
                currentUserLogin={currentUserLogin}
                onClose={() => setIsProfileModalOpen(false)}
              />
            )}
          </div>
        );
      }}
    </AdminLayout>
  );
}
