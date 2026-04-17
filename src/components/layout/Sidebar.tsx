import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from 'react-i18next';
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
  MessageCircleMore,
  Home,
  Crown,
  Pill,
  PlusCircle,
  Search,
  History,
  TrendingUp
} from "lucide-react";
import { useAuthStore, hasPageAccess } from "../../store/useAuthStore";

type MenuItem = {
  id: string;
  icon: LucideIcon;
  labelKey: string;
  requiresPlan?: 'basic' | 'pro';
};

type SidebarProps = {
  theme: "dark" | "light";
  isOpen: boolean;
  setIsOpen: (value: boolean) => void;
};

const regularMenuItems: MenuItem[] = [
  { id: "menu", icon: Home, labelKey: "dashboard" },
  { id: "add-product", icon: Plus, labelKey: "addProduct" },
  { id: "products", icon: Package, labelKey: "products" },
  { id: "scanner", icon: ShoppingCart, labelKey: "scanner" },
  { id: "sales", icon: DollarSign, labelKey: "sales" },
  { id: "kirim-bazasi", icon: Archive, labelKey: "kirimBazasi" },
  { id: "reports", icon: BarChart3, labelKey: "reports", requiresPlan: 'pro' },
  { id: "debts", icon: CreditCard, labelKey: "debts", requiresPlan: 'basic' },
  { id: "ai", icon: Bot, labelKey: "ai", requiresPlan: 'pro' },
  { id: "chat", icon: MessageCircleMore, labelKey: "chat", requiresPlan: 'basic' },
  { id: "settings", icon: Settings, labelKey: "settings" },
];

const pharmacyMenuItems: MenuItem[] = [
    { id: "pharm-menu", icon: Home, labelKey: "dashboard" },
    { id: "pharm-add", icon: PlusCircle, labelKey: "addProduct" },
    { id: "pharm-base", icon: Pill, labelKey: "products" },
    { id: "pharm-scanner", icon: ShoppingCart, labelKey: "scanner" },
    { id: "pharm-sale", icon: History, labelKey: "sales" },
    { id: "pharm-hisobotlar", icon: BarChart3, labelKey: "reports" },
    { id: "pharm-kirim-base", icon: TrendingUp, labelKey: "products" },
    { id: "pharm-info", icon: Search, labelKey: "reports" },
    { id: "pharm-qarzlar", icon: CreditCard, labelKey: "debts" },
    { id: "pharm-ai", icon: Bot, labelKey: "ai" },
    { id: "pharm-chat", icon: MessageCircleMore, labelKey: "chat" },
    { id: "settings", icon: Settings, labelKey: "settings" },
  ];

export default function Sidebar({ theme, isOpen, setIsOpen }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation('sidebar');
  const { user } = useAuthStore();
  
  const [isMobile, setIsMobile] = React.useState(window.innerWidth < 768);

  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const currentPage = location.pathname.split('/')[1] || "menu";
  const userPlan = user?.subscription?.plan || 'free';
  const userRole = user?.role?.toLowerCase();
  const isPharmacy = user?.shopType === 'dorixona';
  const menuItems = isPharmacy ? pharmacyMenuItems : regularMenuItems;

  const filteredMenuItems = menuItems.filter(item => {
    // ADMIN UCHUN BARCHA CHEKLOV YO'Q!
    if (userRole === 'admin') return true;
    
    if (!item.requiresPlan) return true;
    const planOrder = ['free', 'basic', 'pro'];
    const itemPlanIndex = planOrder.indexOf(item.requiresPlan);
    const userPlanIndex = planOrder.indexOf(userPlan);
    return userPlanIndex >= itemPlanIndex;
  });

  if (isMobile && !isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed', left: '20px', top: '20px',
          background: theme === "dark" ? "#1a1f2e" : "#f1f5f9",
          border: "none", borderRadius: "8px", padding: "8px",
          cursor: "pointer", display: "flex", alignItems: "center",
          justifyContent: "center", color: theme === "dark" ? "#8b92a7" : "#64748b",
          zIndex: 50, transition: "all 0.2s ease"
        }}
      >
        <PanelRightClose size={20} />
      </button>
    );
  }

  return (
    <>
      {isMobile && isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)', zIndex: 1999,
            animation: 'fadeIn 0.3s ease'
          }}
        />
      )}

      <aside
        style={{
          position: "fixed", left: 0, top: 0,
          width: isMobile ? "280px" : (isOpen ? "280px" : "80px"),
          height: "100vh",
          background: theme === "dark" ? "#0f1420" : "#ffffff",
          borderRight: `1px solid ${theme === "dark" ? "#1a1f2e" : "#e2e8f0"}`,
          padding: "30px 0", zIndex: 2000,
          transition: "width 0.3s ease", overflowX: "hidden",
          transform: isMobile && !isOpen ? 'translateX(-280px)' : 'translateX(0)',
        }}
      >
        <div
          style={{
            display: "flex", alignItems: "center",
            justifyContent: (isOpen || isMobile) ? "space-between" : "center",
            padding: (isOpen || isMobile) ? "0 20px" : "0",
            marginBottom: "35px"
          }}
        >
          {(isOpen || isMobile) && (
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <img 
                src="/ShoxPosPro.jpg" 
                alt="POS icon" 
                style={{ width: "40px", height: "40px", borderRadius: "50%" }} 
              />
              <div style={{ fontSize: "20px", fontWeight: 700, fontFamily: 'Roboto, sans-serif' }}>
                {userRole === 'admin' ? 'ShoxPosPro' : userPlan === 'free' ? 'ShoxPosFree' : userPlan === 'basic' ? 'ShoxPosBasic' : 'ShoxPosPro'}
              </div>
            </div>
          )}

          <button
            onClick={() => setIsOpen(!isOpen)}
            style={{
              background: theme === "dark" ? "#1a1f2e" : "#f1f5f9",
              border: "none", borderRadius: "8px", padding: "8px",
              cursor: "pointer", display: "flex", alignItems: "center",
              justifyContent: "center", color: theme === "dark" ? "#8b92a7" : "#64748b"
            }}
          >
            {isOpen ? <PanelRightOpen size={20} /> : <PanelRightClose size={20} />}
          </button>
        </div>

        <ul style={{ listStyle: "none", padding: "0 15px", margin: 0 }}>
          {filteredMenuItems.map(item => {
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
                    display: "flex", alignItems: "center",
                    justifyContent: (isOpen || isMobile) ? "flex-start" : "center",
                    gap: (isOpen || isMobile) ? "18px" : "0", // Icon va matn oralig'i
                    padding: (isOpen || isMobile) ? "13px 20px" : "13px", // Ichki joy (padding) kattalashtirildi
                    borderRadius: "14px", cursor: "pointer",
                    color: isActive ? "#fff" : theme === "dark" ? "#8b92a7" : "#64748b",
                    background: isActive ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" : "transparent",
                    transition: "all 0.3s ease", border: "none", width: "100%",
                  }}
                  title={!isOpen && !isMobile ? label : ""}
                >
                  <Icon size={20} style={{ minWidth: "20px" }} /> {/* Icon xajmi ham biroz kattalashdi */}
                  {(isOpen || isMobile) && (
                    <span style={{ 
                      whiteSpace: "nowrap", 
                      overflow: "hidden", 
                      textOverflow: "ellipsis",
                      fontSize: "16px", 
                      fontWeight: isActive ? 400 : 500, 
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