// src/pages/AdminSettings.tsx
import React, { useState, useEffect } from "react";
import AdminSidebar from "../adminComponents/AdminSidebar";
import {
  User,
  Mail,
  Bell,
  Shield,
  Database,
  Download,
  Upload,
  Trash2,
  Globe,
  Moon,
  Sun,
  Lock,
  ChevronRight,
} from "lucide-react";

export default function AdminSettings() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [notifications, setNotifications] = useState(true);
  const [hoveredSetting, setHoveredSetting] = useState<string | null>(null);

  const currentUserLogin = localStorage.getItem("currentLogin") || "—";

  // Theme ni localStorage dan yuklash
  useEffect(() => {
    const savedTheme = localStorage.getItem("adminTheme") as "dark" | "light";
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  // Theme o'zgartirish funksiyasi
  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("adminTheme", newTheme);
  };

  const settingsGroups = [
    {
      title: "Umumiy sozlamalar",
      items: [
        {
          icon: Globe,
          title: "Til",
          description: "Interfeys tilini tanlash",
          value: "O'zbek",
          onClick: () => console.log("Til sozlamalari"),
        },
        {
          icon: theme === "dark" ? Moon : Sun,
          title: "Mavzu",
          description: "Yorug' yoki qorong'i rejim",
          value: theme === "dark" ? "Qorong'i" : "Yorug'",
          onClick: toggleTheme,
        },
        {
          icon: Bell,
          title: "Bildirishnomalar",
          description: "Email va push bildirishnomalar",
          value: notifications ? "Yoqilgan" : "O'chirilgan",
          onClick: () => setNotifications(!notifications),
        },
      ],
    },
    {
      title: "Xavfsizlik",
      items: [
        {
          icon: Lock,
          title: "Parolni o'zgartirish",
          description: "Admin parolini yangilash",
          onClick: () => console.log("Parol o'zgartirish"),
        },
        {
          icon: Shield,
          title: "Ikki faktorli autentifikatsiya",
          description: "Qo'shimcha xavfsizlik qatlami",
          onClick: () => console.log("2FA sozlamalari"),
        },
      ],
    },
    {
      title: "Ma'lumotlar",
      items: [
        {
          icon: Database,
          title: "Backup",
          description: "Zaxira nusxa yaratish",
          onClick: () => console.log("Backup"),
        },
        {
          icon: User,
          title: "Shaxsiy ma'lumotlar",
          description: "Profil sozlamalari",
          onClick: () => console.log("Profil"),
        },
      ],
    },

  ];

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: theme === "dark" ? "#0a0e1a" : "#f8f9fa",
        color: theme === "dark" ? "#e2e8f0" : "#1a1f2e",
        fontFamily: "system-ui, sans-serif",
        transition: "background 0.3s ease, color 0.3s ease",
      }}
    >
      {/* Admin Sidebar */}
      <AdminSidebar
        theme={theme}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
        currentUserLogin={currentUserLogin}
      />

      {/* Main Content */}
      <div
        style={{
          flex: 1,
          marginLeft: sidebarOpen ? "280px" : "80px",
          padding: "24px",
          overflow: "auto",
          transition: "margin-left 0.3s ease",
        }}
      >
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          {/* Header */}
          <div style={{ marginBottom: "32px" }}>
            <h1 
              style={{ 
                fontSize: "28px", 
                fontWeight: 700, 
                margin: 0,
                color: theme === "dark" ? "#fff" : "#1a1f2e"
              }}
            >
              Sozlamalar
            </h1>
            <p 
              style={{ 
                color: theme === "dark" ? "#94a3b8" : "#64748b", 
                marginTop: "8px", 
                margin: 0 
              }}
            >
              Admin panel sozlamalarini boshqarish
            </p>
          </div>

          {/* Settings Groups */}
          {settingsGroups.map((group, gIdx) => (
            <section key={gIdx} style={{ marginBottom: "32px" }}>
              <h2
                style={{
                  fontSize: "18px",
                  fontWeight: 600,
                  color: theme === "dark" ? "#fff" : "#1a1f2e",
                  marginBottom: "16px",
                }}
              >
                {group.title}
              </h2>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
                  gap: "16px",
                }}
              >
                {group.items.map((item, iIdx) => {
                  const Icon = item.icon;
                  const cardIdx = `${gIdx}-${iIdx}`;

                  return (
                    <div
                      key={iIdx}
                      onMouseEnter={() => setHoveredSetting(cardIdx)}
                      onMouseLeave={() => setHoveredSetting(null)}
                      onClick={item.onClick}
                      style={{
                        background: theme === "dark" 
                          ? "linear-gradient(135deg, #1a1f2e 0%, #252b3d 100%)"
                          : "linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%)",
                        borderRadius: "16px",
                        padding: "20px",
                        border: hoveredSetting === cardIdx
                          ? "1px solid #667eea"
                          : theme === "dark"
                          ? "1px solid #2a3144"
                          : "1px solid #e2e8f0",
                        cursor: "pointer",
                        transition: "all 0.3s ease",
                        transform: hoveredSetting === cardIdx
                          ? "translateY(-2px)"
                          : "translateY(0)",
                        boxShadow: hoveredSetting === cardIdx
                          ? "0 8px 24px rgba(102,126,234,0.2)"
                          : theme === "dark"
                          ? "none"
                          : "0 2px 8px rgba(0,0,0,0.05)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          gap: "16px",
                          alignItems: "flex-start",
                        }}
                      >
                        <div
                          style={{
                            width: "40px",
                            height: "40px",
                            borderRadius: "10px",
                            background: theme === "dark" 
                              ? "rgba(102,126,234,0.1)"
                              : "rgba(79,70,229,0.1)",
                            color: "#667eea",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <Icon size={20} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <h3
                            style={{
                              fontSize: "19px",
                              fontWeight: 600,
                              color: theme === "dark" ? "#fff" : "#1a1f2e",
                              marginBottom: "4px",
                            }}
                          >
                            {item.title}
                          </h3>
                          <p
                            style={{
                              fontSize: "13px",
                              color: theme === "dark" ? "#8b92a7" : "#64748b",
                              marginBottom: item.value ? "8px" : "0",
                            }}
                          >
                            {item.description}
                          </p>
                          {item.value && (
                            <span
                              style={{
                                display: "inline-block",
                                padding: "4px 12px",
                                borderRadius: "6px",
                                background: theme === "dark" 
                                  ? "#0f1420"
                                  : "#f1f5f9",
                                fontSize: "12px",
                                color: "#4caf50",
                                fontWeight: 500,
                              }}
                            >
                              {item.value}
                            </span>
                          )}
                        </div>
                        <ChevronRight
                          size={20}
                          color={theme === "dark" ? "#8b92a7" : "#64748b"}
                          style={{ flexShrink: 0, marginTop: "10px" }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}