import React, { useState, useEffect, useRef } from "react";
import { Bell, Package, AlertTriangle, XCircle, X, ShoppingCart } from "lucide-react";
import { loadProductsOfflineFirst } from "../hooks/useProductSync";

interface LowStockItem {
  barcode: string;
  name?: string;
  quantity: number;
}

interface NotificationProps {
  theme: "dark" | "light";
}

// Miqdorga qarab daraja aniqlash
const getLevel = (qty: number): "out" | "warn" | "caution" => {
  if (qty === 0) return "out";
  if (qty <= 5)  return "warn";
  return "caution";
};

const Notification: React.FC<NotificationProps> = ({ theme }) => {
  const [open, setOpen] = useState(false);
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);

  // seen: "barcode:level" formatida saqlash
  const [seen, setSeen] = useState<Set<string>>(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem("notif_seen_v2") || "[]"));
    } catch {
      return new Set();
    }
  });

  const [animate, setAnimate] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // ─── Mahsulotlarni yuklash ────────────────────────────────────────────
  useEffect(() => {
    const user = JSON.parse(sessionStorage.getItem("currentUser") || "{}");
    const login = user?.login || localStorage.getItem("login");
    if (!login) return;

    const load = async () => {
      try {
        const data = await loadProductsOfflineFirst(login);
        const low: LowStockItem[] = data
          .filter((p: any) => Number(p.quantity ?? 0) <= 10)
          .map((p: any) => ({
            barcode: p.barcode,
            name: p.name,
            quantity: Number(p.quantity ?? 0),
          }));

        setLowStockItems(low);

        // Eski seen tozalash — hozirgi mahsulotlar va ularning darajasiga moslashtirish
        setSeen(prev => {
          const currentKeys = new Set(low.map(p => `${p.barcode}:${getLevel(p.quantity)}`));
          const filtered = new Set([...prev].filter(key => currentKeys.has(key)));
          localStorage.setItem("notif_seen_v2", JSON.stringify([...filtered]));
          return filtered;
        });

      } catch (err) {
        console.error("Notification load error:", err);
      }
    };

    load();
    window.addEventListener("online", load);
    return () => window.removeEventListener("online", load);
  }, []);

  // ─── Hisoblash ────────────────────────────────────────────────────────
  const outItems = React.useMemo(
    () => lowStockItems.filter(p => p.quantity === 0),
    [lowStockItems]
  );
  const warnItems = React.useMemo(
    () => lowStockItems.filter(p => p.quantity > 0 && p.quantity <= 5),
    [lowStockItems]
  );
  const cautItems = React.useMemo(
    () => lowStockItems.filter(p => p.quantity > 5 && p.quantity <= 10),
    [lowStockItems]
  );
  const allNotifs = React.useMemo(
    () => [...outItems, ...warnItems, ...cautItems],
    [outItems, warnItems, cautItems]
  );

  // unread: "barcode:level" kaliti seen da yo'q bo'lsa unread
  const unread = React.useMemo(
    () => allNotifs.filter(p => !seen.has(`${p.barcode}:${getLevel(p.quantity)}`)).length,
    [allNotifs, seen]
  );

  // Yangi bildirishnoma kelganda animatsiya
  useEffect(() => {
    if (unread > 0) {
      setAnimate(true);
      const t = setTimeout(() => setAnimate(false), 1000);
      return () => clearTimeout(t);
    }
  }, [unread]);

  // Tashqariga bosganda yopish
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Barchasini o'qilgan deb belgilash — "barcode:level" formatida
  const markAllSeen = () => {
    const newSeen = new Set([
      ...seen,
      ...allNotifs.map(p => `${p.barcode}:${getLevel(p.quantity)}`),
    ]);
    setSeen(newSeen);
    localStorage.setItem("notif_seen_v2", JSON.stringify([...newSeen]));
  };

  const handleOpen = () => {
    setOpen(o => !o);
    if (!open) markAllSeen();
  };

  const dark = theme === "dark";
  const bg   = dark ? "#1a1f2e" : "#ffffff";
  const bdr  = dark ? "#2a3144" : "#e2e8f0";
  const tx   = dark ? "#e2e8f0" : "#1e293b";
  const sub  = dark ? "#64748b" : "#94a3b8";

  return (
    <div style={{ position: "relative" }} ref={panelRef}>
      {/* Qo'ng'iroq tugmasi */}
      <button
        onClick={handleOpen}
        style={{
          width: 44, height: 44, borderRadius: "50%", border: "none",
          background: dark ? "#1a1f2e" : "#f1f5f9",
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all 0.2s ease", position: "relative",
          animation: animate ? "ring 0.6s ease" : "none",
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = dark ? "#262d3d" : "#e2e8f0";
          e.currentTarget.style.transform = "scale(1.05)";
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = dark ? "#1a1f2e" : "#f1f5f9";
          e.currentTarget.style.transform = "scale(1)";
        }}
      >
        <Bell
          size={20}
          color={unread > 0 ? "#f59e0b" : (dark ? "#8b92a7" : "#64748b")}
        />

        {/* Badge */}
        {unread > 0 && (
          <span style={{
            position: "absolute", top: 6, right: 6,
            width: 8, height: 8, borderRadius: "50%",
            background: outItems.length > 0 ? "#ef4444" : "#f59e0b",
            border: `2px solid ${dark ? "#0f1420" : "#fff"}`,
            animation: "pulse-dot 1.5s infinite",
          }} />
        )}
      </button>

      {/* Panel */}
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 10px)", right: 0,
          width: 320, maxHeight: 480,
          background: bg, border: `1px solid ${bdr}`,
          borderRadius: 20, zIndex: 1000,
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
          display: "flex", flexDirection: "column",
          animation: "slideDown 0.2s ease",
          overflow: "hidden",
        }}>
          {/* Sarlavha */}
          <div style={{
            padding: "16px 18px 12px",
            borderBottom: `1px solid ${bdr}`,
            display: "flex", alignItems: "center", justifyContent: "space-between",
            background: dark ? "#111827" : "#f8fafc",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Bell size={16} color="#f59e0b" />
              <span style={{ fontSize: 14, fontWeight: 700, color: tx }}>Bildirishnomalar</span>
              {allNotifs.length > 0 && (
                <span style={{
                  background: outItems.length > 0 ? "#ef444420" : "#f59e0b20",
                  color: outItems.length > 0 ? "#ef4444" : "#f59e0b",
                  padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                }}>{allNotifs.length}</span>
              )}
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{
                background: "none", border: "none", cursor: "pointer",
                color: sub, padding: 4, borderRadius: 6,
              }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Kontent */}
          <div style={{ overflowY: "auto", flex: 1 }}>
            {allNotifs.length === 0 ? (
              <div style={{ padding: "40px 20px", textAlign: "center", color: sub }}>
                <Package size={40} style={{ opacity: 0.3, marginBottom: 10 }} />
                <p style={{ fontSize: 13, margin: 0 }}>Barcha mahsulotlar yetarli</p>
              </div>
            ) : (
              <>
                {outItems.length > 0 && (
                  <div>
                    <div style={{
                      padding: "10px 18px 4px", fontSize: 10, fontWeight: 800,
                      textTransform: "uppercase", letterSpacing: 1, color: "#ef4444",
                    }}>🔴 Tugagan mahsulotlar</div>
                    {outItems.map(item => (
                      <div key={item.barcode} style={{
                        padding: "10px 18px", borderBottom: `1px solid ${bdr}`,
                        display: "flex", alignItems: "center", gap: 12,
                        background: dark ? "rgba(239,68,68,0.05)" : "#fff5f5",
                      }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                          background: "#ef444420",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          <XCircle size={18} color="#ef4444" />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: tx, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {item.name || item.barcode}
                          </div>
                          <div style={{ fontSize: 11, color: "#ef4444", fontWeight: 600, marginTop: 2 }}>
                            Tugadi! Tezroq xarid qiling
                          </div>
                        </div>
                        <span style={{
                          background: "#ef444420", color: "#ef4444",
                          padding: "3px 8px", borderRadius: 8,
                          fontSize: 11, fontWeight: 800, flexShrink: 0,
                        }}>0 dona</span>
                      </div>
                    ))}
                  </div>
                )}

                {warnItems.length > 0 && (
                  <div>
                    <div style={{
                      padding: "10px 18px 4px", fontSize: 10, fontWeight: 800,
                      textTransform: "uppercase", letterSpacing: 1, color: "#f97316",
                    }}>🟠 Kritik darajada kam (1–5 dona)</div>
                    {warnItems.map(item => (
                      <div key={item.barcode} style={{
                        padding: "10px 18px", borderBottom: `1px solid ${bdr}`,
                        display: "flex", alignItems: "center", gap: 12,
                      }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                          background: "#f9731620",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          <AlertTriangle size={18} color="#f97316" />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: tx, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {item.name || item.barcode}
                          </div>
                          <div style={{ fontSize: 11, color: sub, marginTop: 2 }}>
                            Tez orada tugaydi — xarid qiling
                          </div>
                        </div>
                        <span style={{
                          background: "#f9731620", color: "#f97316",
                          padding: "3px 8px", borderRadius: 8,
                          fontSize: 11, fontWeight: 800, flexShrink: 0,
                        }}>{item.quantity} dona</span>
                      </div>
                    ))}
                  </div>
                )}

                {cautItems.length > 0 && (
                  <div>
                    <div style={{
                      padding: "10px 18px 4px", fontSize: 10, fontWeight: 800,
                      textTransform: "uppercase", letterSpacing: 1, color: "#f59e0b",
                    }}>🟡 Oz qolgan</div>
                    {cautItems.map(item => (
                      <div key={item.barcode} style={{
                        padding: "10px 18px", borderBottom: `1px solid ${bdr}`,
                        display: "flex", alignItems: "center", gap: 12,
                      }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                          background: "#f59e0b20",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          <Package size={18} color="#f59e0b" />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: tx, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {item.name || item.barcode}
                          </div>
                          <div style={{ fontSize: 11, color: sub, marginTop: 2 }}>
                            Zaxira ozayib bormoqda
                          </div>
                        </div>
                        <span style={{
                          background: "#f59e0b20", color: "#f59e0b",
                          padding: "3px 8px", borderRadius: 8,
                          fontSize: 11, fontWeight: 800, flexShrink: 0,
                        }}>{item.quantity} dona</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
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