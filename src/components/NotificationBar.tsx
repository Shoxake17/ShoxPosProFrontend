// src/components/NotificationBar.tsx
import React, { useState, useEffect, useRef } from "react";
import { Bell, Package, AlertTriangle, XCircle, X, ShoppingCart } from "lucide-react";
import { loadProductsOfflineFirst } from "../hooks/useProductSync";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface LowStockItem {
  barcode: string;
  name?: string;
  quantity: number;
}

interface NotificationProps {
  theme: "dark" | "light";
}

type StockLevel = "out" | "warn" | "caution";

interface StockGroup {
  level: StockLevel;
  label: string;
  color: string;
  icon: React.ReactNode;
  items: LowStockItem[];
  rowBg?: (dark: boolean) => string;
}

// ─────────────────────────────────────────────
// Constants & Helpers
// ─────────────────────────────────────────────
const getLevel = (qty: number): StockLevel => {
  if (qty === 0)  return "out";
  if (qty <= 5)   return "warn";
  return "caution";
};

const SEEN_KEY = "notif_seen_v2";

const loadSeen = (): Set<string> => {
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || "[]"));
  } catch {
    return new Set();
  }
};

const saveSeen = (s: Set<string>) =>
  localStorage.setItem(SEEN_KEY, JSON.stringify([...s]));

const getCurrentLogin = (): string | null => {
  try {
    const user = JSON.parse(sessionStorage.getItem("currentUser") || "{}");
    return user?.login || localStorage.getItem("login");
  } catch {
    return localStorage.getItem("login");
  }
};

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

/** Bitta bildirishnoma satri */
const NotifRow: React.FC<{
  item: LowStockItem;
  iconBg: string;
  icon: React.ReactNode;
  badgeBg: string;
  badgeColor: string;
  subText: string;
  subColor: string;
  rowBg?: string;
  bdr: string;
  tx: string;
}> = ({ item, iconBg, icon, badgeBg, badgeColor, subText, subColor, rowBg, bdr, tx }) => (
  <div style={{
    padding: "10px 18px", borderBottom: `1px solid ${bdr}`,
    display: "flex", alignItems: "center", gap: 12,
    background: rowBg,
  }}>
    <div style={{
      width: 36, height: 36, borderRadius: 10, flexShrink: 0,
      background: iconBg, display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      {icon}
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{
        fontSize: 13, fontWeight: 600, color: tx,
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
      }}>
        {item.name || item.barcode}
      </div>
      <div style={{ fontSize: 11, color: subColor, fontWeight: 600, marginTop: 2 }}>
        {subText}
      </div>
    </div>
    <span style={{
      background: badgeBg, color: badgeColor,
      padding: "3px 8px", borderRadius: 8,
      fontSize: 11, fontWeight: 800, flexShrink: 0,
    }}>
      {item.quantity} dona
    </span>
  </div>
);

/** Guruh sarlavhasi */
const GroupHeader: React.FC<{ emoji: string; label: string; color: string }> = ({ emoji, label, color }) => (
  <div style={{
    padding: "10px 18px 4px", fontSize: 10, fontWeight: 800,
    textTransform: "uppercase", letterSpacing: 1, color,
  }}>
    {emoji} {label}
  </div>
);

/** Bo'sh holat */
const EmptyState: React.FC<{ sub: string }> = ({ sub }) => (
  <div style={{ padding: "40px 20px", textAlign: "center", color: sub }}>
    <Package size={40} style={{ opacity: 0.3, marginBottom: 10 }} />
    <p style={{ fontSize: 13, margin: 0 }}>Barcha mahsulotlar yetarli</p>
  </div>
);

/** Qo'ng'iroq tugmasi */
const BellButton: React.FC<{
  dark: boolean;
  unread: number;
  animate: boolean;
  hasOut: boolean;
  onClick: () => void;
}> = ({ dark, unread, animate, hasOut, onClick }) => (
  <button
    onClick={onClick}
    style={{
      width: 44, height: 44, borderRadius: "50%", border: "none",
      background: dark ? "#1a1f2e" : "#f1f5f9",
      cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
      transition: "all 0.2s ease", position: "relative",
      animation: animate ? "ring 0.6s ease" : "none",
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.background = dark ? "#262d3d" : "#e2e8f0";
      e.currentTarget.style.transform = "scale(1.05)";
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = dark ? "#1a1f2e" : "#f1f5f9";
      e.currentTarget.style.transform = "scale(1)";
    }}
  >
    <Bell size={20} color={unread > 0 ? "#f59e0b" : (dark ? "#8b92a7" : "#64748b")} />
    {unread > 0 && (
      <span style={{
        position: "absolute", top: 6, right: 6,
        width: 8, height: 8, borderRadius: "50%",
        background: hasOut ? "#ef4444" : "#f59e0b",
        border: `2px solid ${dark ? "#0f1420" : "#fff"}`,
        animation: "pulse-dot 1.5s infinite",
      }} />
    )}
  </button>
);

// ─────────────────────────────────────────────
// Hooks
// ─────────────────────────────────────────────

/** Mahsulotlarni yuklash va seen boshqaruvi */
const useNotifications = () => {
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [seen, setSeen] = useState<Set<string>>(loadSeen);

  const updateSeen = (items: LowStockItem[]) => {
    setSeen((prev) => {
      const currentKeys = new Set(items.map((p) => `${p.barcode}:${getLevel(p.quantity)}`));
      const filtered = new Set([...prev].filter((key) => currentKeys.has(key)));
      saveSeen(filtered);
      return filtered;
    });
  };

  const load = React.useCallback(async () => {
    const login = getCurrentLogin();
    if (!login) return;
    try {
      const data = await loadProductsOfflineFirst(login);
      const low: LowStockItem[] = data
        .filter((p: any) => Number(p.quantity ?? 0) <= 10)
        .map((p: any) => ({ barcode: p.barcode, name: p.name, quantity: Number(p.quantity ?? 0) }));
      setLowStockItems(low);
      updateSeen(low);
    } catch (err) {
      console.error("Notification load error:", err);
    }
  }, []);

  useEffect(() => {
    load();
    window.addEventListener("online", load);
    return () => window.removeEventListener("online", load);
  }, [load]);

  const markAllSeen = (items: LowStockItem[]) => {
    const newSeen = new Set([...seen, ...items.map((p) => `${p.barcode}:${getLevel(p.quantity)}`)]);
    setSeen(newSeen);
    saveSeen(newSeen);
  };

  return { lowStockItems, seen, markAllSeen };
};

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────
const Notification: React.FC<NotificationProps> = ({ theme }) => {
  const [open, setOpen]       = useState(false);
  const [animate, setAnimate] = useState(false);
  const panelRef              = useRef<HTMLDivElement>(null);

  const { lowStockItems, seen, markAllSeen } = useNotifications();

  // Guruhlar
  const outItems  = React.useMemo(() => lowStockItems.filter((p) => p.quantity === 0),              [lowStockItems]);
  const warnItems = React.useMemo(() => lowStockItems.filter((p) => p.quantity > 0 && p.quantity <= 5), [lowStockItems]);
  const cautItems = React.useMemo(() => lowStockItems.filter((p) => p.quantity > 5 && p.quantity <= 10), [lowStockItems]);
  const allNotifs = React.useMemo(() => [...outItems, ...warnItems, ...cautItems], [outItems, warnItems, cautItems]);

  const unread = React.useMemo(
    () => allNotifs.filter((p) => !seen.has(`${p.barcode}:${getLevel(p.quantity)}`)).length,
    [allNotifs, seen]
  );

  // Animatsiya
  useEffect(() => {
    if (unread === 0) return;
    setAnimate(true);
    const t = setTimeout(() => setAnimate(false), 1000);
    return () => clearTimeout(t);
  }, [unread]);

  // Tashqariga bosish
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleOpen = () => {
    if (!open) markAllSeen(allNotifs);
    setOpen((o) => !o);
  };

  const dark = theme === "dark";
  const bg   = dark ? "#1a1f2e" : "#ffffff";
  const bdr  = dark ? "#2a3144" : "#e2e8f0";
  const tx   = dark ? "#e2e8f0" : "#1e293b";
  const sub  = dark ? "#64748b" : "#94a3b8";

  // Guruh konfiguratsiyasi — nesting kamaytirish uchun
  const stockGroups: StockGroup[] = [
    {
      level: "out", label: "Tugagan mahsulotlar", color: "#ef4444", emoji: "🔴",
      items: outItems,
      rowBg: (d) => d ? "rgba(239,68,68,0.05)" : "#fff5f5",
    },
    {
      level: "warn", label: "Kritik darajada kam (1–5 dona)", color: "#f97316", emoji: "🟠",
      items: warnItems,
    },
    {
      level: "caution", label: "Oz qolgan", color: "#f59e0b", emoji: "🟡",
      items: cautItems,
    },
  ] as any;

  const LEVEL_CONFIG = {
    out:     { iconBg: "#ef444420", icon: <XCircle     size={18} color="#ef4444" />, badgeBg: "#ef444420", badgeColor: "#ef4444", subText: "Tugadi! Tezroq xarid qiling", subColor: "#ef4444" },
    warn:    { iconBg: "#f9731620", icon: <AlertTriangle size={18} color="#f97316" />, badgeBg: "#f9731620", badgeColor: "#f97316", subText: "Tez orada tugaydi — xarid qiling", subColor: sub },
    caution: { iconBg: "#f59e0b20", icon: <Package      size={18} color="#f59e0b" />, badgeBg: "#f59e0b20", badgeColor: "#f59e0b", subText: "Zaxira ozayib bormoqda", subColor: sub },
  };

  return (
    <div style={{ position: "relative" }} ref={panelRef}>
      <BellButton
        dark={dark}
        unread={unread}
        animate={animate}
        hasOut={outItems.length > 0}
        onClick={handleOpen}
      />

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 10px)", right: 0,
          width: 320, maxHeight: 480, background: bg,
          border: `1px solid ${bdr}`, borderRadius: 20, zIndex: 1000,
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
          display: "flex", flexDirection: "column",
          animation: "slideDown 0.2s ease", overflow: "hidden",
        }}>
          {/* Sarlavha */}
          <div style={{
            padding: "16px 18px 12px", borderBottom: `1px solid ${bdr}`,
            display: "flex", alignItems: "center", justifyContent: "space-between",
            background: dark ? "#111827" : "#f8fafc",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Bell size={16} color="#f59e0b" />
              <span style={{ fontSize: 14, fontWeight: 700, color: tx }}>Bildirishnomalar</span>
              {allNotifs.length > 0 && (
                <span style={{
                  background: outItems.length > 0 ? "#ef444420" : "#f59e0b20",
                  color:      outItems.length > 0 ? "#ef4444"   : "#f59e0b",
                  padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                }}>
                  {allNotifs.length}
                </span>
              )}
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{ background: "none", border: "none", cursor: "pointer", color: sub, padding: 4, borderRadius: 6 }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Kontent */}
          <div style={{ overflowY: "auto", flex: 1 }}>
            {allNotifs.length === 0 ? (
              <EmptyState sub={sub} />
            ) : (
              stockGroups.map(({ level, label, color, items, rowBg }) => {
                if (items.length === 0) return null;
                const cfg = LEVEL_CONFIG[level];
                const emoji = { out: "🔴", warn: "🟠", caution: "🟡" }[level];
                return (
                  <div key={level}>
                    <GroupHeader emoji={emoji} label={label} color={color} />
                    {items.map((item) => (
                      <NotifRow
                        key={item.barcode}
                        item={item}
                        iconBg={cfg.iconBg}
                        icon={cfg.icon}
                        badgeBg={cfg.badgeBg}
                        badgeColor={cfg.badgeColor}
                        subText={cfg.subText}
                        subColor={cfg.subColor}
                        rowBg={rowBg ? rowBg(dark) : undefined}
                        bdr={bdr}
                        tx={tx}
                      />
                    ))}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {allNotifs.length > 0 && (
            <div style={{
              padding: "12px 18px", borderTop: `1px solid ${bdr}`,
              background: dark ? "#111827" : "#f8fafc",
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <ShoppingCart size={14} color={sub} />
              <span style={{ fontSize: 12, color: sub }}>
                Jami <strong style={{ color: tx }}>{allNotifs.length}</strong> ta mahsulotga e'tibor bering
              </span>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes ring {
          0%,100% { transform: rotate(0deg); }
          20% { transform: rotate(-15deg); }
          40% { transform: rotate(15deg); }
          60% { transform: rotate(-10deg); }
          80% { transform: rotate(10deg); }
        }
        @keyframes pulse-dot {
          0%,100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.4); opacity: 0.7; }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default Notification;