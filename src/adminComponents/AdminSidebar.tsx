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

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
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

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
const menuItems: MenuItem[] = [
  { id: "dashboard", icon: LayoutDashboard, label: "Dashboard",  path: "/admin-panel"    },
  { id: "settings",  icon: Settings,        label: "Sozlamalar", path: "/admin-settings" },
];

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
const useIsMobile = () => {
  const [isMobile, setIsMobile] = React.useState(window.innerWidth < 768);

  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return isMobile;
};

const getThemeColor = (theme: "dark" | "light", dark: string, light: string) =>
  theme === "dark" ? dark : light;

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

/** Mobil holatda sidebar yopiq bo'lganda ko'rinadigan toggle tugma */
const MobileToggleButton: React.FC<{
  theme: "dark" | "light";
  onOpen: () => void;
}> = ({ theme, onOpen }) => (
  <button
    onClick={onOpen}
    style={{
      position: "fixed",
      left: "20px",
      top: "20px",
      background: getThemeColor(theme, "#1a1f2e", "#f1f5f9"),
      border: "none",
      borderRadius: "8px",
      padding: "8px",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: getThemeColor(theme, "#8b92a7", "#64748b"),
      zIndex: 50,
      transition: "all 0.2s ease",
    }}
  >
    <PanelRightClose size={20} />
  </button>
);

/** Mobil overlay (sidebar ochiq bo'lganda orqa fon) */
const MobileOverlay: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <div
    onClick={onClose}
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.5)",
      zIndex: 99,
      animation: "fadeIn 0.3s ease",
    }}
  />
);

/** Logo va toggle tugmasi bo'limi */
const SidebarHeader: React.FC<{
  theme: "dark" | "light";
  isOpen: boolean;
  isMobile: boolean;
  onToggle: () => void;
}> = ({ theme, isOpen, isMobile, onToggle }) => {
  const showExpanded = isOpen || isMobile;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: showExpanded ? "space-between" : "center",
        padding: showExpanded ? "0 20px" : "0",
        marginBottom: "35px",
      }}
    >
      {showExpanded && (
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
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
            <div
              style={{
                fontSize: "18px",
                fontWeight: 700,
                fontFamily: "Roboto, sans-serif",
                whiteSpace: "nowrap",
                color: getThemeColor(theme, "#ffffff", "#000000"),
              }}
            >
              ShoxPosPro
            </div>
            <div
              style={{
                fontSize: "11px",
                color: getThemeColor(theme, "#94a3b8", "#64748b"),
                fontFamily: "Roboto, sans-serif",
              }}
            >
              Admin Panel
            </div>
          </div>
        </div>
      )}

      <button
        onClick={onToggle}
        style={{
          background: getThemeColor(theme, "#1a1f2e", "#f1f5f9"),
          border: "none",
          borderRadius: "8px",
          padding: "8px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: getThemeColor(theme, "#8b92a7", "#64748b"),
          transition: "all 0.2s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = getThemeColor(theme, "#262d3d", "#e2e8f0");
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = getThemeColor(theme, "#1a1f2e", "#f1f5f9");
        }}
      >
        {isOpen ? (
          <PanelRightOpen size={20} style={{ color: getThemeColor(theme, "#ffffff", "#000000") }} />
        ) : (
          <PanelRightClose size={20} style={{ color: getThemeColor(theme, "#ffffff", "#000000") }} />
        )}
      </button>
    </div>
  );
};

/** Joriy foydalanuvchi ma'lumoti kartasi */
const UserInfoCard: React.FC<{
  theme: "dark" | "light";
  currentUserLogin: string;
}> = ({ theme, currentUserLogin }) => (
  <div
    style={{
      background: getThemeColor(theme, "#1a1f2e", "#f1f5f9"),
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
            color: getThemeColor(theme, "#ffffff", "#000000"),
            fontFamily: "Roboto, sans-serif",
          }}
        >
          {currentUserLogin}
        </div>
        <div
          style={{
            fontSize: "12px",
            color: getThemeColor(theme, "#94a3b8", "#64748b"),
            fontFamily: "Roboto, sans-serif",
          }}
        >
          Administrator
        </div>
      </div>
    </div>
  </div>
);

/** Bitta menyu elementi tugmasi */
const MenuItemButton: React.FC<{
  item: MenuItem;
  isActive: boolean;
  isExpanded: boolean;
  theme: "dark" | "light";
  onClick: () => void;
}> = ({ item, isActive, isExpanded, theme, onClick }) => {
  const Icon = item.icon;

  return (
    <li style={{ marginBottom: "8px" }}>
      <button
        onClick={onClick}
        title={!isExpanded ? item.label : ""}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: isExpanded ? "flex-start" : "center",
          gap: isExpanded ? "20px" : "0",
          padding: isExpanded ? "14px 20px" : "14px",
          borderRadius: "12px",
          cursor: "pointer",
          color: isActive ? "#fff" : getThemeColor(theme, "#8b92a7", "#64748b"),
          background: isActive
            ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
            : "transparent",
          transition: "all 0.3s ease",
          fontSize: "16px",
          fontFamily: "Roboto, sans-serif",
          border: "none",
          width: "100%",
          textAlign: "left",
        }}
        onMouseEnter={(e) => {
          if (!isActive)
            e.currentTarget.style.background = getThemeColor(theme, "#1a1f2e", "#f1f5f9");
        }}
        onMouseLeave={(e) => {
          if (!isActive) e.currentTarget.style.background = "transparent";
        }}
      >
        <Icon size={20} style={{ minWidth: "20px" }} />
        {isExpanded && (
          <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {item.label}
          </span>
        )}
      </button>
    </li>
  );
};

/** Chiqish tugmasi */
const LogoutButton: React.FC<{
  theme: "dark" | "light";
  isExpanded: boolean;
  onLogout: () => void;
}> = ({ theme, isExpanded, onLogout }) => (
  <div style={{ padding: "0 15px" }}>
    <button
      onClick={onLogout}
      title={!isExpanded ? "Chiqish" : ""}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: isExpanded ? "flex-start" : "center",
        gap: isExpanded ? "20px" : "0",
        padding: isExpanded ? "14px 20px" : "14px",
        borderRadius: "12px",
        cursor: "pointer",
        color: getThemeColor(theme, "#8b92a7", "#64748b"),
        background: "transparent",
        transition: "all 0.3s ease",
        fontSize: "16px",
        fontFamily: "Roboto, sans-serif",
        border: `1px solid ${getThemeColor(theme, "#334155", "#e2e8f0")}`,
        width: "100%",
        textAlign: "left",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(239,68,68,0.1)";
        e.currentTarget.style.borderColor = "#ef4444";
        e.currentTarget.style.color = "#fca5a5";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.borderColor = getThemeColor(theme, "#334155", "#e2e8f0");
        e.currentTarget.style.color = getThemeColor(theme, "#8b92a7", "#64748b");
      }}
    >
      <LogOut size={20} style={{ minWidth: "20px" }} />
      {isExpanded && (
        <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          Chiqish
        </span>
      )}
    </button>
  </div>
);

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────
export default function AdminSidebar({
  theme = "dark",
  isOpen,
  setIsOpen,
  currentUserLogin,
}: AdminSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();

  const isExpanded = isOpen || isMobile;
  const currentPage =
    menuItems.find((item) => location.pathname === item.path)?.id || "dashboard";

  const handleLogout = () => {
    if (confirm("Tizimdan chiqishni xohlaysizmi?")) {
      localStorage.clear();
      navigate("/login");
    }
  };

  const handleMenuClick = (path: string) => {
    navigate(path);
    if (isMobile) setIsOpen(false);
  };

  // Mobilda sidebar yopiq bo'lganda faqat toggle tugma
  if (isMobile && !isOpen) {
    return <MobileToggleButton theme={theme} onOpen={() => setIsOpen(true)} />;
  }

  return (
    <>
      {isMobile && isOpen && <MobileOverlay onClose={() => setIsOpen(false)} />}

      <aside
        style={{
          position: "fixed",
          left: 0,
          top: 0,
          width: isMobile ? "280px" : isOpen ? "280px" : "80px",
          height: "100vh",
          background: getThemeColor(theme, "#0f1420", "#ffffff"),
          borderRight: `1px solid ${getThemeColor(theme, "#1a1f2e", "#e2e8f0")}`,
          padding: "30px 0",
          zIndex: 100,
          transition: "width 0.3s ease",
          overflowX: "hidden",
          transform: isMobile && !isOpen ? "translateX(-280px)" : "translateX(0)",
        }}
      >
        <SidebarHeader
          theme={theme}
          isOpen={isOpen}
          isMobile={isMobile}
          onToggle={() => setIsOpen(!isOpen)}
        />

        {isExpanded && (
          <UserInfoCard theme={theme} currentUserLogin={currentUserLogin} />
        )}

        {isExpanded && (
          <div
            style={{
              fontSize: "11px",
              fontWeight: 700,
              color: getThemeColor(theme, "#64748b", "#94a3b8"),
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: "12px",
              paddingLeft: "35px",
              fontFamily: "Roboto, sans-serif",
            }}
          >
            Menyu
          </div>
        )}

        <ul
          style={{
            listStyle: "none",
            padding: "0 15px",
            margin: 0,
            marginTop: isExpanded ? "0" : "40px",
          }}
        >
          {menuItems.map((item) => (
            <MenuItemButton
              key={item.id}
              item={item}
              isActive={currentPage === item.id}
              isExpanded={isExpanded}
              theme={theme}
              onClick={() => handleMenuClick(item.path)}
            />
          ))}
        </ul>

        <div
          style={{
            height: "1px",
            background: getThemeColor(theme, "#1a1f2e", "#e2e8f0"),
            margin: "16px 15px",
          }}
        />

        <LogoutButton
          theme={theme}
          isExpanded={isExpanded}
          onLogout={handleLogout}
        />
      </aside>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
    </>
  );
}