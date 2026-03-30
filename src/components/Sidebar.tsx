import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "../components/languages/Sidebar";
import {
  LayoutDashboard,
  Plus,
  Package,
  DollarSign,
  BarChart3,
  CreditCard,
  Settings,
  Archive,
  LucideIcon,
  ShoppingCart,
  Bot,
  PanelRightOpen,
  PanelRightClose,
  Send,
  MessageSquare,
  MessageCircle,
  MessageCircleMore
} from "lucide-react";

type MenuItem = {
  id: string;
  icon: LucideIcon;
  labelKey: string; // label o'rniga labelKey
};

type SidebarProps = {
  theme: "dark" | "light";
  isOpen: boolean;
  setIsOpen: (value: boolean) => void;
};

// labelKey bilan menuItems
const menuItems: MenuItem[] = [
  { id: "menu", icon: LayoutDashboard, labelKey: "dashboard" },
  { id: "add-product", icon: Plus, labelKey: "addProduct" },
  { id: "products", icon: Package, labelKey: "products" },
  { id: "scanner", icon: ShoppingCart, labelKey: "scanner" },
  { id: "sales", icon: DollarSign, labelKey: "sales" },
  { id: "reports", icon: BarChart3, labelKey: "reports" },
  { id: "kirim-bazasi", icon: Archive, labelKey: "kirimBazasi" },
  { id: "debts", icon: CreditCard, labelKey: "debts" },
  { id: "ai", icon: Bot, labelKey: "ai" },
  { id: "chat", icon: MessageCircleMore, labelKey: "Xabarlar" },
  { id: "settings", icon: Settings, labelKey: "settings" },
];

export default function Sidebar({ theme, isOpen, setIsOpen }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const [isMobile, setIsMobile] = React.useState(window.innerWidth < 768);

  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const currentPage = location.pathname.split('/')[1] || "menu";

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
              <img 
                src="/ShoxPosPro.jpg"
                alt="POS icon" 
                style={{ 
                  width: "40px", 
                  height: "40px", 
                  borderRadius: "50%" 
                }} 
              />
              <div style={{ 
                fontSize: "20px", 
                fontWeight: 600, 
                fontFamily: 'Roboto, sans-serif',
                whiteSpace: "nowrap"
              }}>
                ShoxPosPro
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
            {isOpen ? <PanelRightOpen size={20} style={{ color: theme === "dark" ? "#ffffff" : "#000000" }} /> : <PanelRightClose size={20} style={{ color: theme === "dark" ? "#ffffff" : "#000000" }}/>}
          </button>
        </div>

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
            const label = t(item.labelKey);

            return (
              <li key={item.id} style={{ marginBottom: "8px" }}>
                <button
                  onClick={() => {
                    navigate(`/${item.id}`);
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
                  title={!isOpen && !isMobile ? label : ""}
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
                      {label}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </aside>
    </>
  );
}