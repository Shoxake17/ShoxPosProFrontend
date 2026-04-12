import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Bell, Package, AlertTriangle, XCircle, X, ShoppingCart,
} from "lucide-react";
import { loadProductsOfflineFirst } from "../hooks/useProductSync";
import { useTranslation } from "react-i18next";
import { getTranslation } from "./languages/NotificationLanguages";
import { isNotificationsEnabled } from "./settings/Notification";

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
  hoveredSetting?: string | null;
  setHoveredSetting?: React.Dispatch<React.SetStateAction<string | null>>;
  idx?: string;
}

type StockLevel = "out" | "warn" | "caution";

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
const getLevel = (qty: number): StockLevel => {
  if (qty === 0) return "out";
  if (qty <= 5) return "warn";
  return "caution";
};

const SEEN_KEY          = "notif_seen_v2";
const INITIALIZED_KEY   = "notif_initialized";
const KNOWN_KEY         = "notif_known_barcodes";

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
    return user?.login || null;
  } catch {
    return null;
  }
};

// ─── Ovoz chiqarish ───────────────────────────────────────────────────────────
const playNotificationSound = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(880, ctx.currentTime);
    gain1.gain.setValueAtTime(0.3, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.3);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(1100, ctx.currentTime + 0.35);
    gain2.gain.setValueAtTime(0.3, ctx.currentTime + 0.35);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.65);
    osc2.start(ctx.currentTime + 0.35);
    osc2.stop(ctx.currentTime + 0.65);
  } catch (e) {
    console.warn("Audio play error:", e);
  }
};

// ─────────────────────────────────────────────
// NotifCard
// ─────────────────────────────────────────────
const NotifCard: React.FC<{
  item: LowStockItem;
  level: StockLevel;
  dark: boolean;
  unit: string;
  isNew: boolean;
  index: number;
  safeT: (key: string) => string;
}> = ({ item, level, dark, unit, isNew, index, safeT }) => {
  const [visible, setVisible] = useState(false);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), index * 60);
    return () => clearTimeout(timer);
  }, [index]);

  const config = {
    out: {
      border: "rgba(239,68,68,0.35)",
      iconBg: "linear-gradient(135deg, #ef4444, #dc2626)",
      icon: <XCircle size={20} color="#fff" />,
      accent: "#ef4444",
      label:    safeT("outLabel"),
      sublabel: safeT("outSublabel"),
    },
    warn: {
      border: "rgba(249,115,22,0.35)",
      iconBg: "linear-gradient(135deg, #f97316, #ea580c)",
      icon: <AlertTriangle size={20} color="#fff" />,
      accent: "#f97316",
      label:    safeT("warnLabel"),
      sublabel: safeT("warnSublabel"),
    },
    caution: {
      border: "rgba(245,158,11,0.3)",
      iconBg: "linear-gradient(135deg, #f59e0b, #d97706)",
      icon: <Package size={20} color="#fff" />,
      accent: "#f59e0b",
      label:    safeT("cautionLabel"),
      sublabel: safeT("cautionSublabel"),
    },
  }[level];

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        margin: "0 12px 10px",
        borderRadius: 16,
        background: hovered
          ? dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.04)"
          : dark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.9)",
        border: `1px solid ${hovered
          ? config.border
          : dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)"}`,
        padding: "14px 16px",
        display: "flex",
        alignItems: "center",
        gap: 14,
        cursor: "pointer",
        transition: "all 0.25s cubic-bezier(0.4,0,0.2,1)",
        transform: visible
          ? hovered ? "translateX(4px)" : "translateX(0)"
          : "translateX(-20px)",
        opacity: visible ? 1 : 0,
        boxShadow: hovered
          ? `0 8px 24px ${config.accent}22`
          : dark ? "none" : "0 2px 8px rgba(0,0,0,0.06)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Chap rang chizig'i */}
      <div style={{
        position: "absolute", left: 0, top: "20%", bottom: "20%",
        width: 3, borderRadius: "0 3px 3px 0",
        background: config.accent,
        opacity: hovered ? 1 : 0.5,
        transition: "opacity 0.2s",
      }} />

      {/* Icon */}
      <div style={{
        width: 44, height: 44, borderRadius: 14, flexShrink: 0,
        background: config.iconBg,
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: `0 4px 12px ${config.accent}44`,
        position: "relative",
      }}>
        {config.icon}
        {isNew && (
          <span style={{
            position: "absolute", top: -3, right: -3,
            width: 10, height: 10, borderRadius: "50%",
            background: config.accent,
            border: `2px solid ${dark ? "#0f1420" : "#fff"}`,
            animation: "notif-pulse-dot 1.5s infinite",
          }} />
        )}
      </div>

      {/* Matn */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13.5, fontWeight: 700,
          color: dark ? "#f1f5f9" : "#0f172a",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          marginBottom: 3,
        }}>
          {item.name || item.barcode}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: config.accent }}>
            {config.label}
          </span>
          <span style={{ fontSize: 10, color: dark ? "#64748b" : "#94a3b8" }}>
            · {config.sublabel}
          </span>
        </div>
      </div>

      {/* Miqdor */}
      <span style={{
        background: `${config.accent}22`,
        color: config.accent,
        padding: "3px 10px", borderRadius: 20,
        fontSize: 12, fontWeight: 800, flexShrink: 0,
        border: `1px solid ${config.accent}44`,
      }}>
        {item.quantity} {unit}
      </span>
    </div>
  );
};

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────
const NotificationBar: React.FC<NotificationProps> = ({ theme }) => {
  const { t, i18n } = useTranslation(["notification", "common"]);
  const language = i18n.language;
  const [open, setOpen]               = useState(false);
  const [animate, setAnimate]         = useState(false);
  const [panelVisible, setPanelVisible] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);

  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [seen, setSeen]               = useState<Set<string>>(loadSeen);

  const [notifEnabled, setNotifEnabled] = useState<boolean>(isNotificationsEnabled());
  const notifEnabledRef = useRef(notifEnabled);
  useEffect(() => { notifEnabledRef.current = notifEnabled; }, [notifEnabled]);

  const loginRef = useRef<string | null>(getCurrentLogin());

  const knownRef = useRef<Set<string>>(
    new Set(JSON.parse(localStorage.getItem(KNOWN_KEY) || "[]"))
  );
  const isFirstLoadRef = useRef<boolean>(true);

  // ─── safeT helper ────────────────────────────────────────────────
  const safeT = useCallback((key: string) => {
    try { return getTranslation(language as any, key as any); }
    catch { return t(key); }
  }, [language, t]);

  // ─── Settings listener ──────────────────────────────────────────
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "notificationsEnabled") {
        const val = e.newValue ? JSON.parse(e.newValue) : true;
        setNotifEnabled(val);
      }
    };
    const handleCustom = () => setNotifEnabled(isNotificationsEnabled());
    window.addEventListener("storage", handleStorage);
    window.addEventListener("notifSettingChanged", handleCustom);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("notifSettingChanged", handleCustom);
    };
  }, []);

  // ─── Mahsulot yuklash ────────────────────────────────────────────
  const load = useCallback(async () => {
      if (!notifEnabledRef.current) return;
      const login = getCurrentLogin();
      if (!login) return;
    try {
      const data = await loadProductsOfflineFirst(login);
      const low = data
        .filter((p: any) => Number(p.quantity ?? 0) <= 10)
        .map((p: any) => ({
          barcode: p.barcode,
          name: p.name,
          quantity: Number(p.quantity ?? 0),
        }));
      setLowStockItems(low);
    } catch (err) {
      console.error("Notif load error:", err);
    }
  }, []);

  useEffect(() => {
    if (!notifEnabled) return;
    load();
    window.addEventListener("online", load);
    window.addEventListener("saleAdded", load);
    return () => {
      window.removeEventListener("online", load);
      window.removeEventListener("saleAdded", load);
    };
  }, []); // eslint-disable-line

  useEffect(() => {
    if (!notifEnabled) {
      setOpen(false);
      setLowStockItems([]);
    } else {
      load();
    }
  }, [notifEnabled, load]);

  // ─── Gruplar ─────────────────────────────────────────────────────
  const outItems  = lowStockItems.filter(p => p.quantity === 0);
  const warnItems = lowStockItems.filter(p => p.quantity > 0 && p.quantity <= 5);
  const cautItems = lowStockItems.filter(p => p.quantity > 5 && p.quantity <= 10);
  const allItems  = [...outItems, ...warnItems, ...cautItems];

  const unreadCount = lowStockItems.filter(
    p => !seen.has(`${p.barcode}:${getLevel(p.quantity)}`)
  ).length;

  const markAllSeen = useCallback(() => {
    const newSeen = new Set([
      ...seen,
      ...lowStockItems.map(p => `${p.barcode}:${getLevel(p.quantity)}`),
    ]);
    setSeen(newSeen);
    saveSeen(newSeen);
  }, [seen, lowStockItems]);

  // ─── OVOZ: faqat haqiqiy yangi mahsulot kelganda ─────────────────
  useEffect(() => {
    if (!notifEnabled) return;
    if (lowStockItems.length === 0) return;

    const currentKeys = lowStockItems.map(p => `${p.barcode}:${getLevel(p.quantity)}`);

    if (isFirstLoadRef.current) {
      isFirstLoadRef.current = false;
      const updated = new Set([...knownRef.current, ...currentKeys]);
      knownRef.current = updated;
      localStorage.setItem(KNOWN_KEY, JSON.stringify([...updated]));
      return;
    }

    const hasNew = currentKeys.some(key => !knownRef.current.has(key));

    if (hasNew) {
      setAnimate(true);
      playNotificationSound();
      const timer = setTimeout(() => setAnimate(false), 1000);

      const updated = new Set([...knownRef.current, ...currentKeys]);
      knownRef.current = updated;
      localStorage.setItem(KNOWN_KEY, JSON.stringify([...updated]));

      return () => clearTimeout(timer);
    }
  }, [lowStockItems, notifEnabled]);

  // ─── Panel animatsiya ────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => setPanelVisible(true), 10);
      return () => clearTimeout(timer);
    } else {
      setPanelVisible(false);
    }
  }, [open]);

  // ─── Tashqariga click ────────────────────────────────────────────
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const dark = theme === "dark";

  if (!notifEnabled) return null;

  // ─────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────
  return (
    <div ref={wrapperRef} style={{ position: "relative" }}>

      {/* ══ Bell + Badge ══ */}
      <div
        style={{
          position: "relative",
          display: "inline-flex",
          overflow: "visible",
        }}
      >
        <button
          onClick={() => {
            if (!open) markAllSeen();
            setOpen(prev => !prev);
          }}
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            border: "none",
            background: dark ? "#1a1f2e" : "#f1f5f9",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background 0.2s ease",
            overflow: "visible",
            position: "static",
            animation: animate ? "notif-ring 0.6s ease" : "none",
          }}
        >
          <Bell
            size={20}
            color={unreadCount > 0 ? "#f59e0b" : dark ? "#8b92a7" : "#64748b"}
          />
        </button>

        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: -6,
              right: -6,
              minWidth: 18,
              height: 18,
              borderRadius: 9,
              background: outItems.length > 0
                ? "linear-gradient(135deg, #ef4444, #dc2626)"
                : "linear-gradient(135deg, #f97316, #ea580c)",
              border: `2.5px solid ${dark ? "#0a0e1a" : "#f8f9ff"}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 9,
              fontWeight: 900,
              color: "#fff",
              padding: "0 4px",
              lineHeight: "1",
              zIndex: 50,
              pointerEvents: "none",
              boxShadow: outItems.length > 0
                ? "0 2px 8px rgba(239,68,68,0.6)"
                : "0 2px 8px rgba(249,115,22,0.6)",
              animation: "notif-badge-pop 0.35s cubic-bezier(0.34,1.56,0.64,1) both",
            }}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </div>
      {/* ══ end Bell + Badge ══ */}

      {/* ══ Notification Panel ══ */}
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 12px)",
            right: 0,
            width: 360,
            background: dark
              ? "rgba(10,14,26,0.96)"
              : "rgba(248,249,255,0.97)",
            backdropFilter: "blur(24px) saturate(180%)",
            WebkitBackdropFilter: "blur(24px) saturate(180%)",
            border: `1px solid ${dark
              ? "rgba(255,255,255,0.1)"
              : "rgba(0,0,0,0.08)"}`,
            borderRadius: 24,
            zIndex: 1000,
            boxShadow: dark
              ? "0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)"
              : "0 24px 64px rgba(0,0,0,0.15)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            transform: panelVisible
              ? "translateY(0) scale(1)"
              : "translateY(-12px) scale(0.97)",
            opacity: panelVisible ? 1 : 0,
            transition: "transform 0.25s cubic-bezier(0.4,0,0.2,1), opacity 0.25s ease",
            transformOrigin: "top right",
          }}
        >
          {/* ── Header ── */}
          <div
            style={{
              padding: "18px 20px 14px",
              borderBottom: `1px solid ${dark
                ? "rgba(255,255,255,0.08)"
                : "rgba(0,0,0,0.06)"}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 12,
                background: "linear-gradient(135deg, rgba(245,158,11,0.2), rgba(249,115,22,0.1))",
                border: "1px solid rgba(245,158,11,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                <Bell size={16} color="#f59e0b" />
              </div>

              <div>
                <div style={{
                  fontSize: 15, fontWeight: 700,
                  color: dark ? "#f1f5f9" : "#0f172a",
                  lineHeight: 1.2,
                }}>
                  {/* ✅ "Bildirishnomalars" typo tuzatildi */}
                  {safeT("title")}
                </div>
                <div style={{ fontSize: 11, color: dark ? "#64748b" : "#94a3b8", marginTop: 1 }}>
                  {lowStockItems.length > 0
                    ? `${lowStockItems.length} ${safeT("headerSubtitle")}`
                    : safeT("allGood")}
                </div>
              </div>

              {lowStockItems.length > 0 && (
                <span style={{
                  background: outItems.length > 0
                    ? "linear-gradient(135deg, #ef4444, #dc2626)"
                    : "linear-gradient(135deg, #f97316, #ea580c)",
                  color: "#fff",
                  padding: "3px 10px", borderRadius: 20,
                  fontSize: 11, fontWeight: 800, marginLeft: 4,
                  flexShrink: 0,
                  boxShadow: outItems.length > 0
                    ? "0 2px 8px rgba(239,68,68,0.4)"
                    : "0 2px 8px rgba(249,115,22,0.4)",
                }}>
                  {lowStockItems.length}
                </span>
              )}
            </div>

            <button
              onClick={() => setOpen(false)}
              style={{
                width: 30, height: 30, borderRadius: 10,
                border: "none", cursor: "pointer",
                background: dark
                  ? "rgba(255,255,255,0.08)"
                  : "rgba(0,0,0,0.06)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: dark ? "#94a3b8" : "#64748b",
                transition: "background 0.15s",
                flexShrink: 0,
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background =
                  dark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background =
                  dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
              }}
            >
              <X size={14} />
            </button>
          </div>

          {/* ── Filter pills ── */}
          {lowStockItems.length > 0 && (
            <div style={{
              display: "flex", gap: 6,
              padding: "12px 14px 4px",
              flexWrap: "wrap",
            }}>
              {outItems.length > 0 && (
                <span style={{
                  background: "rgba(239,68,68,0.12)", color: "#ef4444",
                  padding: "3px 10px", borderRadius: 20,
                  fontSize: 10, fontWeight: 800, letterSpacing: 0.5,
                  border: "1px solid rgba(239,68,68,0.2)",
                  textTransform: "uppercase",
                }}>
                  {safeT("filterOut")} · {outItems.length}
                </span>
              )}
              {warnItems.length > 0 && (
                <span style={{
                  background: "rgba(249,115,22,0.12)", color: "#f97316",
                  padding: "3px 10px", borderRadius: 20,
                  fontSize: 10, fontWeight: 800, letterSpacing: 0.5,
                  border: "1px solid rgba(249,115,22,0.2)",
                  textTransform: "uppercase",
                }}>
                  {safeT("filterCritical")} · {warnItems.length}
                </span>
              )}
              {cautItems.length > 0 && (
                <span style={{
                  background: "rgba(245,158,11,0.12)", color: "#f59e0b",
                  padding: "3px 10px", borderRadius: 20,
                  fontSize: 10, fontWeight: 800, letterSpacing: 0.5,
                  border: "1px solid rgba(245,158,11,0.2)",
                  textTransform: "uppercase",
                }}>
                  {safeT("filterLow")} · {cautItems.length}
                </span>
              )}
            </div>
          )}

          {/* ── Body ── */}
          <div style={{
            overflowY: "auto", flex: 1,
            maxHeight: 420, paddingTop: 10, paddingBottom: 8,
          }}>
            {allItems.length === 0 ? (
              <div style={{
                padding: "48px 20px", textAlign: "center",
                display: "flex", flexDirection: "column",
                alignItems: "center", gap: 12,
              }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 18,
                  background: dark
                    ? "rgba(255,255,255,0.04)"
                    : "rgba(0,0,0,0.04)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Package size={24} color={dark ? "#374151" : "#d1d5db"} />
                </div>
                <div>
                  <div style={{
                    fontSize: 13, fontWeight: 600,
                    color: dark ? "#4b5563" : "#9ca3af", marginBottom: 4,
                  }}>
                    {safeT("allGoodTitle")}
                  </div>
                  <div style={{ fontSize: 11, color: dark ? "#374151" : "#d1d5db" }}>
                    {safeT("noNotifications")}
                  </div>
                </div>
              </div>
            ) : (
              allItems.map((item, i) => (
                <NotifCard
                  key={item.barcode}
                  item={item}
                  level={getLevel(item.quantity)}
                  dark={dark}
                  unit={safeT("itemUnit")}
                  isNew={!seen.has(`${item.barcode}:${getLevel(item.quantity)}`)}
                  index={i}
                  safeT={safeT}
                />
              ))
            )}
          </div>

          
        </div>
      )}
      {/* ══ end Panel ══ */}

      <style>{`
        @keyframes notif-ring {
          0%,100% { transform: rotate(0deg); }
          20%     { transform: rotate(-15deg); }
          40%     { transform: rotate(15deg); }
          60%     { transform: rotate(-10deg); }
          80%     { transform: rotate(10deg); }
        }
        @keyframes notif-pulse-dot {
          0%,100% { transform: scale(1);   opacity: 1;   }
          50%     { transform: scale(1.4); opacity: 0.6; }
        }
        @keyframes notif-badge-pop {
          0%   { transform: scale(0); opacity: 0; }
          60%  { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>

    </div>
  );
};

export default NotificationBar;
