// src/admin/adminComponents/AdminSidebar.tsx
import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { clearAuthClientState } from "../../utils/clientSession";
import {
  Settings,
  LayoutDashboard,
  UserPlus,
  LogOut,
  LucideIcon,
  PanelRightOpen,
  PanelRightClose,
  MessageSquare,
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
// Menu items — tarjima yo'q, to'g'ridan-to'g'ri matn
// ─────────────────────────────────────────────
const menuItems: MenuItem[] = [
  { id: "dashboard", icon: LayoutDashboard, label: "Dashboard",    path: "/admin-panel"    },
  { id: "add-user",  icon: UserPlus,        label: "Add User",     path: "/admin-add-user" },
  { id: "chat",      icon: MessageSquare,   label: "Chat",         path: "/admin-chat"     },
  { id: "settings",  icon: Settings,        label: "Settings",     path: "/admin-settings" },
];

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
const useIsMobile = () => {
  const [isMobile, setIsMobile] = React.useState(window.innerWidth < 768);
  React.useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return isMobile;
};

const gtc = (theme: "dark" | "light", dark: string, light: string) =>
  theme === "dark" ? dark : light;

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

const MobileToggleButton: React.FC<{ theme: "dark" | "light"; onOpen: () => void }> = ({ theme, onOpen }) => (
  <button
    onClick={onOpen}
    style={{
      position:       "fixed",
      left:           "20px",
      top:            "20px",
      background:     gtc(theme, "#1a1f2e", "#f1f5f9"),
      border:         "none",
      borderRadius:   "8px",
      padding:        "8px",
      cursor:         "pointer",
      display:        "flex",
      alignItems:     "center",
      justifyContent: "center",
      color:          gtc(theme, "#8b92a7", "#64748b"),
      zIndex:         50,
      transition:     "all 0.2s ease",
    }}
  >
    <PanelRightClose size={20} />
  </button>
);

const MobileOverlay: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <div
    onClick={onClose}
    style={{
      position:   "fixed",
      inset:      0,
      background: "rgba(0,0,0,0.5)",
      zIndex:     99,
      animation:  "fadeIn 0.3s ease",
    }}
  />
);

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
        display:        "flex",
        alignItems:     "center",
        justifyContent: showExpanded ? "space-between" : "center",
        padding:        showExpanded ? "0 24px" : "0",
        marginBottom:   "40px",
      }}
    >
      <button
        onClick={onToggle}
        style={{
          background:     gtc(theme, "rgba(255,255,255,0.05)", "rgba(0,0,0,0.05)"),
          border:         "none",
          borderRadius:   "12px",
          padding:        "10px",
          cursor:         "pointer",
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
          color:          gtc(theme, "#94a3b8", "#64748b"),
          transition:     "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = gtc(theme, "rgba(255,255,255,0.1)", "rgba(0,0,0,0.1)");
          e.currentTarget.style.color      = gtc(theme, "#fff", "#1a1f2e");
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = gtc(theme, "rgba(255,255,255,0.05)", "rgba(0,0,0,0.05)");
          e.currentTarget.style.color      = gtc(theme, "#94a3b8", "#64748b");
        }}
      >
        {isOpen ? <PanelRightOpen size={20} /> : <PanelRightClose size={20} />}
      </button>
    </div>
  );
};

const MenuItemButton: React.FC<{
  item: MenuItem;
  isActive: boolean;
  isExpanded: boolean;
  theme: "dark" | "light";
  onClick: () => void;
}> = ({ item, isActive, isExpanded, theme, onClick }) => {
  const Icon = item.icon;
  return (
    <li style={{ marginBottom: "10px" }}>
      <button
        onClick={onClick}
        title={!isExpanded ? item.label : ""}
        style={{
          display:        "flex",
          alignItems:     "center",
          justifyContent: isExpanded ? "flex-start" : "center",
          gap:            isExpanded ? "16px" : "0",
          padding:        isExpanded ? "14px 20px" : "14px",
          borderRadius:   "16px",
          cursor:         "pointer",
          color:          isActive ? "#fff" : gtc(theme, "#94a3b8", "#64748b"),
          background:     isActive
            ? "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)"
            : "transparent",
          transition:     "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          fontSize:       "15px",
          fontWeight:     600,
          border:         "none",
          width:          "100%",
          textAlign:      "left",
          boxShadow:      isActive ? "0 10px 20px -5px rgba(99,102,241,0.4)" : "none",
        }}
        onMouseEnter={(e) => {
          if (!isActive) {
            e.currentTarget.style.background = gtc(theme, "rgba(255,255,255,0.05)", "rgba(0,0,0,0.05)");
            e.currentTarget.style.color      = gtc(theme, "#f1f5f9", "#1a1f2e");
          }
        }}
        onMouseLeave={(e) => {
          if (!isActive) {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color      = gtc(theme, "#94a3b8", "#64748b");
          }
        }}
      >
        <Icon size={22} style={{ minWidth: "22px" }} />
        {isExpanded && (
          <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {item.label}
          </span>
        )}
      </button>
    </li>
  );
};

const LogoutButton: React.FC<{
  theme: "dark" | "light";
  isExpanded: boolean;
  onLogout: () => void;
}> = ({ theme, isExpanded, onLogout }) => (
  <div style={{ padding: "0 20px" }}>
    <button
      onClick={onLogout}
      title={!isExpanded ? "Logout" : ""}
      style={{
        display:        "flex",
        alignItems:     "center",
        justifyContent: isExpanded ? "flex-start" : "center",
        gap:            isExpanded ? "16px" : "0",
        padding:        isExpanded ? "14px 20px" : "14px",
        borderRadius:   "16px",
        cursor:         "pointer",
        color:          "#ef4444",
        background:     "transparent",
        transition:     "all 0.3s ease",
        fontSize:       "15px",
        fontWeight:     600,
        border:         `1.5px solid ${gtc(theme, "rgba(239,68,68,0.2)", "rgba(239,68,68,0.1)")}`,
        width:          "100%",
        textAlign:      "left",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background  = "rgba(239,68,68,0.1)";
        e.currentTarget.style.borderColor = "#ef4444";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background  = "transparent";
        e.currentTarget.style.borderColor = gtc(theme, "rgba(239,68,68,0.2)", "rgba(239,68,68,0.1)");
      }}
    >
      <LogOut size={22} style={{ minWidth: "22px" }} />
      {isExpanded && (
        <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          Logout
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
  const navigate  = useNavigate();
  const location  = useLocation();
  const isMobile  = useIsMobile();
  const isExpanded = isOpen || isMobile;

  const currentPage =
    menuItems.find((item) => location.pathname === item.path)?.id || "dashboard";

  const handleLogout = () => {
    if (confirm("Are you sure you want to logout?")) {
      clearAuthClientState({ clearAiChats: true });
      navigate("/login");
    }
  };

  const handleMenuClick = (path: string) => {
    navigate(path);
    if (isMobile) setIsOpen(false);
  };

  if (isMobile && !isOpen) {
    return <MobileToggleButton theme={theme} onOpen={() => setIsOpen(true)} />;
  }

  return (
    <>
      {isMobile && isOpen && <MobileOverlay onClose={() => setIsOpen(false)} />}

      <aside
        style={{
          position:      "fixed",
          left:          0,
          top:           0,
          width:         isMobile ? "280px" : isOpen ? "280px" : "88px",
          height:        "100vh",
          background:    gtc(theme, "#05070a", "#ffffff"),
          borderRight:   `1px solid ${gtc(theme, "#1f2937", "#e5e7eb")}`,
          padding:       "32px 0",
          zIndex:        200,
          transition:    "width 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
          overflowX:     "hidden",
          transform:     isMobile && !isOpen ? "translateX(-280px)" : "translateX(0)",
          display:       "flex",
          flexDirection: "column",
        }}
      >
        <SidebarHeader
          theme={theme}
          isOpen={isOpen}
          isMobile={isMobile}
          onToggle={() => setIsOpen(!isOpen)}
        />

        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <ul style={{ listStyle: "none", padding: "0 16px", margin: 0 }}>
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
        </div>

        <div
          style={{
            height:     "1px",
            background: gtc(theme, "#1f2937", "#e5e7eb"),
            margin:     "24px 20px",
          }}
        />

        <LogoutButton
          theme={theme}
          isExpanded={isExpanded}
          onLogout={handleLogout}
        />
      </aside>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </>
  );
}
