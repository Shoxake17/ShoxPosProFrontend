// src/adminComponents/AdminLayout.tsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AdminSidebar from "./AdminSidebar";
import { getSessionLogin } from "../../utils/clientSession";
import { getSocket } from "../../utils/socket";
import { showBrowserNotification, notificationStorage, playVoiceNotification } from "../adminUtils/notificationUtils";
import { toast } from "sonner";
import { MessageSquare } from "lucide-react";

type Theme = "dark" | "light";

export interface AdminLayoutChildProps {
  theme: Theme;
  tc: (dark: string, light: string) => string;
}

interface AdminLayoutProps {
  children:
    | React.ReactNode
    | ((props: AdminLayoutChildProps) => React.ReactNode);
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  /** Chat kabi full-height sahifalar uchun true qiling */
  fullHeight?: boolean;
}

export default function AdminLayout({
  children,
  title,
  description,
  actions,
  fullHeight = false,
}: AdminLayoutProps) {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile]       = useState(false);
  const [theme, setTheme]             = useState<Theme>("dark");
  const currentUserLogin              = getSessionLogin() || "Admin";

  // ── Theme yuklash ──────────────────────────────────────────────────────
  useEffect(() => {
    const stored = (localStorage.getItem("adminTheme") || localStorage.getItem("theme")) as Theme | null;
    if (stored === "light" || stored === "dark") setTheme(stored);
  }, []);

  // ── Tashqi theme o'zgartirish eventini tinglash (reload yo'q) ─────────
  useEffect(() => {
    const handler = (e: Event) => {
      const newTheme = (e as CustomEvent<Theme>).detail;
      if (newTheme === "dark" || newTheme === "light") setTheme(newTheme);
    };
    window.addEventListener("adminThemeChange", handler);
    return () => window.removeEventListener("adminThemeChange", handler);
  }, []);

  // ── Responsive ────────────────────────────────────────────────────────
  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      const mobile = w < 768;
      setIsMobile(mobile);
      setSidebarOpen(!mobile && w >= 1024);
    };
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // ── Bildirishnomalar (Global Socket Listener) ─────────────────────────
  // ✅ ENDI main.tsx'da GlobalSocketListener orqali boshqariladi


  const tc = (dark: string, light: string) =>
    theme === "dark" ? dark : light;

  const sidebarWidth = isMobile ? 0 : sidebarOpen ? 280 : 80;

  return (
    <div
      style={{
        // ✅ FIX: position fixed + inset:0 — parent margin/padding ta'sir qilmaydi
        position:   "fixed",
        inset:      0,
        display:    "flex",
        overflow:   "hidden",
        background: tc("#0a0e1a", "#f0f2f5"),
        color:      tc("#e2e8f0", "#1a1f2e"),
        fontFamily: "'Inter', 'Roboto', system-ui, sans-serif",
        transition: "background 0.3s ease, color 0.3s ease",
      }}
    >
      {/* ── Sidebar ── */}
      <AdminSidebar
        theme={theme}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
        currentUserLogin={currentUserLogin}
      />

      {/* ── Asosiy kontent ── */}
      <div
        style={{
          flex:          1,
          marginLeft:    `${sidebarWidth}px`,
          transition:    "margin-left 0.3s ease",
          display:       "flex",
          flexDirection: "column",
          height:        "100%",
          minWidth:      0,
          overflow:      "hidden",
        }}
      >
        {/* ── Header ── */}
        {(title || description || actions) && (
          <header
            style={{
              flexShrink:     0,
              padding:        isMobile ? "14px 16px" : "18px 32px",
              background:     tc("rgba(10,14,26,0.95)", "rgba(255,255,255,0.95)"),
              backdropFilter: "blur(20px)",
              borderBottom:   `1px solid ${tc("#1a1f2e", "#e2e8f0")}`,
              display:        "flex",
              justifyContent: "space-between",
              alignItems:     "center",
              gap:            "16px",
              zIndex:         10,
            }}
          >
            <div style={{ minWidth: 0 }}>
              {title && (
                <h1
                  style={{
                    fontSize:      isMobile ? "16px" : "22px",
                    fontWeight:    800,
                    margin:        0,
                    color:         tc("#fff", "#1a1f2e"),
                    letterSpacing: "-0.02em",
                    overflow:      "hidden",
                    textOverflow:  "ellipsis",
                    whiteSpace:    "nowrap",
                  }}
                >
                  {title}
                </h1>
              )}
              {description && (
                <p
                  style={{
                    margin:     "2px 0 0",
                    fontSize:   "13px",
                    fontWeight: 500,
                    color:      tc("#64748b", "#64748b"),
                  }}
                >
                  {description}
                </p>
              )}
            </div>

            {actions && (
              <div
                style={{
                  display:    "flex",
                  gap:        "12px",
                  alignItems: "center",
                  flexShrink: 0,
                  flexWrap:   "wrap",
                }}
              >
                {actions}
              </div>
            )}
          </header>
        )}

        {/* ── Page Content ── */}
        <main
          style={{
            flex:          1,
            minHeight:     0,
            display:       "flex",
            flexDirection: "column",
            padding:       fullHeight
              ? "0"
              : isMobile ? "16px" : "28px 32px",
            gap:           fullHeight ? "0" : "28px",
            overflowY:     fullHeight ? "hidden" : "auto",
            boxSizing:     "border-box",
          }}
        >
          {typeof children === "function"
            ? children({ theme, tc })
            : children}
        </main>
      </div>

      <style>{`
        /* ✅ Global reset — oq bo'shliqlarni yo'q qiladi */
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body, #root { height: 100%; width: 100%; overflow: hidden; }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
