// src/components/AdminComponents/AdminSidebar.tsx
import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Shield,
  Settings,
  LayoutDashboard,
  LogOut,
  LucideIcon,
  PanelRightOpen,
  PanelRightClose,
} from "lucide-react";

type MenuItem = {
  id: string;
  icon: LucideIcon;
  label: string;
  path: string;
};

interface AdminSidebarProps {
  theme?: "dark" | "light";
  isOpen: boolean;
  setIsOpen: (value: boolean) => void;
  currentUserLogin: string;
}

const menuItems: MenuItem[] = [
  { id: "dashboard", icon: LayoutDashboard, label: "Dashboard", path: "/admin-panel" },
  { id: "settings", icon: Settings, label: "Sozlamalar", path: "/admin-settings" },
];

export default function AdminSidebar({ 
  theme = "dark",
  isOpen, 
  setIsOpen,
  currentUserLogin,
}: AdminSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobile, setIsMobile] = React.useState(window.innerWidth < 768);

  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = () => {
    if (confirm("Tizimdan chiqishni xohlaysizmi?")) {
      localStorage.clear();
      navigate("/login");
    }
  };

  const currentPage = menuItems.find(item => location.pathname === item.path)?.id || "dashboard";

  // Mobilda faqat toggle button
  if (isMobile && !isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          left: '20px',
          top: '20px',
          background: theme === "dark" ? "#1a1f2e" : "#f1f5f9",
          border: "none",
          borderRadius: "8px",
          padding: "8px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: theme === "dark" ? "#8b92a7" : "#64748b",
          zIndex: 50,
          transition: "all 0.2s ease"
        }}
      >
        <PanelRightClose size={20} />
      </button>
    );
  }

  return (
    <>
      {/* Mobile Overlay */}
      {isMobile && isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 99,
            animation: 'fadeIn 0.3s ease'
          }}
        />
      )}

      <aside
        style={{
          position: "fixed",
          left: 0,
          top: 0,
          width: isMobile ? "280px" : (isOpen ? "280px" : "80px"),
          height: "100vh",
          background: theme === "dark" ? "#0f1420" : "#ffffff",
          borderRight: `1px solid ${theme === "dark" ? "#1a1f2e" : "#e2e8f0"}`,
          padding: "30px 0",
          zIndex: 100,
          transition: "width 0.3s ease",
          overflowX: "hidden",
          transform: isMobile && !isOpen ? 'translateX(-280px)' : 'translateX(0)',
        }}
      >
        {/* Logo & Toggle */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: (isOpen || isMobile) ? "space-between" : "center",
            padding: (isOpen || isMobile) ? "0 20px" : "0",
            marginBottom: "35px",
            position: "relative"
          }}
        >
          {(isOpen || isMobile) && (
            <div style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: "12px" 
            }}>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Shield size={22} color="white" />
              </div>
              <div>
                <div style={{ 
                  fontSize: "18px", 
                  fontWeight: 700, 
                  fontFamily: 'Roboto, sans-serif',
                  whiteSpace: "nowrap",
                  color: theme === "dark" ? "#ffffff" : "#000000"
                }}>
                  ShoxPosPro
                </div>
                <div style={{ 
                  fontSize: "11px", 
                  color: theme === "dark" ? "#94a3b8" : "#64748b",
                  fontFamily: 'Roboto, sans-serif'
                }}>
                  Admin Panel
                </div>
              </div>
            </div>
          )}

          <button
            onClick={() => setIsOpen(!isOpen)}
            style={{
              background: theme === "dark" ? "#1a1f2e" : "#f1f5f9",
              border: "none",
              borderRadius: "8px",
              padding: "8px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: theme === "dark" ? "#8b92a7" : "#64748b",
              transition: "all 0.2s ease",
              position: "relative"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = theme === "dark" ? "#262d3d" : "#e2e8f0";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = theme === "dark" ? "#1a1f2e" : "#f1f5f9";
            }}
          >
            {isOpen ? (
              <PanelRightOpen size={20} style={{ color: theme === "dark" ? "#ffffff" : "#000000" }} />
            ) : (
              <PanelRightClose size={20} style={{ color: theme === "dark" ? "#ffffff" : "#000000" }} />
            )}
          </button>
        </div>

        {/* User Info Card */}
        {(isOpen || isMobile) && (
          <div
            style={{
              background: theme === "dark" ? "#1a1f2e" : "#f1f5f9",
              borderRadius: "12px",
              padding: "16px",
              margin: "0 15px 24px 15px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  borderRadius: "10px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: "16px",
                  color: "#ffffff",
                }}
              >
                {currentUserLogin.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, overflow: "hidden" }}>
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: "14px",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    color: theme === "dark" ? "#ffffff" : "#000000",
                    fontFamily: 'Roboto, sans-serif'
                  }}
                >
                  {currentUserLogin}
                </div>
                <div style={{ 
                  fontSize: "12px", 
                  color: theme === "dark" ? "#94a3b8" : "#64748b",
                  fontFamily: 'Roboto, sans-serif'
                }}>
                  Administrator
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Label */}
        {(isOpen || isMobile) && (
          <div
            style={{
              fontSize: "11px",
              fontWeight: 700,
              color: theme === "dark" ? "#64748b" : "#94a3b8",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: "12px",
              paddingLeft: "35px",
              fontFamily: 'Roboto, sans-serif'
            }}
          >
            Menyu
          </div>
        )}

        {/* Menu Items */}
        <ul style={{ 
          listStyle: "none", 
          padding: "0 15px", 
          margin: 0,
          marginTop: (isOpen || isMobile) ? "0" : "40px"
        }}>
          {menuItems.map(item => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;

            return (
              <li key={item.id} style={{ marginBottom: "8px" }}>
                <button
                  onClick={() => {
                    navigate(item.path);
                    if (isMobile) setIsOpen(false);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: (isOpen || isMobile) ? "flex-start" : "center",
                    gap: (isOpen || isMobile) ? "20px" : "0",
                    padding: (isOpen || isMobile) ? "14px 20px" : "14px",
                    borderRadius: "12px",
                    cursor: "pointer",
                    color: isActive ? "#fff" : theme === "dark" ? "#8b92a7" : "#64748b",
                    background: isActive ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" : "transparent",
                    transition: "all 0.3s ease",
                    fontSize: "16px",
                    fontFamily: 'Roboto, sans-serif',
                    border: "none",
                    width: "100%",
                    textAlign: "left",
                    position: "relative",
                    overflow: "hidden"
                  }}
                  title={!isOpen && !isMobile ? item.label : ""}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = theme === "dark" ? "#1a1f2e" : "#f1f5f9";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = "transparent";
                    }
                  }}
                >
                  <Icon size={20} style={{ minWidth: "20px" }} />
                  {(isOpen || isMobile) && (
                    <span style={{ 
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis"
                    }}>
                      {item.label}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        {/* Divider */}
        <div
          style={{
            height: "1px",
            background: theme === "dark" ? "#1a1f2e" : "#e2e8f0",
            margin: "16px 15px",
          }}
        />

        {/* Logout Button */}
        <div style={{ padding: "0 15px" }}>
          <button
            onClick={handleLogout}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: (isOpen || isMobile) ? "flex-start" : "center",
              gap: (isOpen || isMobile) ? "20px" : "0",
              padding: (isOpen || isMobile) ? "14px 20px" : "14px",
              borderRadius: "12px",
              cursor: "pointer",
              color: theme === "dark" ? "#8b92a7" : "#64748b",
              background: "transparent",
              transition: "all 0.3s ease",
              fontSize: "16px",
              fontFamily: 'Roboto, sans-serif',
              border: `1px solid ${theme === "dark" ? "#334155" : "#e2e8f0"}`,
              width: "100%",
              textAlign: "left",
            }}
            title={!isOpen && !isMobile ? "Chiqish" : ""}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(239,68,68,0.1)";
              e.currentTarget.style.borderColor = "#ef4444";
              e.currentTarget.style.color = "#fca5a5";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.borderColor = theme === "dark" ? "#334155" : "#e2e8f0";
              e.currentTarget.style.color = theme === "dark" ? "#8b92a7" : "#64748b";
            }}
          >
            <LogOut size={20} style={{ minWidth: "20px" }} />
            {(isOpen || isMobile) && (
              <span style={{ 
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis"
              }}>
                Chiqish
              </span>
            )}
          </button>
        </div>
      </aside>

      {/* CSS Animations */}
      <style>
        {`
          @keyframes fadeIn {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }
        `}
      </style>
    </>
  );
}