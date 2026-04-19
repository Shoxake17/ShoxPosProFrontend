// src/adminPages/AdminMenu.tsx
import React, { useState, useEffect, useCallback } from "react";
import axiosInstance from "../../api/axiosInstance";
import { getSessionLogin } from "../../utils/clientSession";
import AdminLayout from "../adminComponents/AdminLayout";
import {
  User, Clock, Monitor, Smartphone, RefreshCw, XCircle,
  AlertTriangle, Users, Lock, Unlock, Calendar, Activity,
} from "lucide-react";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface UserData {
  _id: string;
  login: string;
  role: string;
  name?: string;
  email?: string;
  blocked: boolean;
  telegramId?: string;
  subscription?: {
    plan: 'free' | 'basic' | 'pro';
    isTrial: boolean;
    trialEndDate?: string;
    startDate?: string;
  };
  currentDevice: {
    deviceId: string;
    deviceType: string;
    deviceOS: string;
    lastLogin: string | null;
  };
  devicesCount: number;
  firstLoginAt: string;
  createdAt: string;
}

interface Stats {
  totalUsers: number;
  activeUsers: number;
  blockedUsers: number;
  timestamp: string;
}

type RoleFilter = "All" | "admin" | "cashier";
type Theme      = "dark" | "light";

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
const ROLE_LABELS: Record<string, string> = {
  All: "Barcha", admin: "Admin", cashier: "Kassir",
};

const ROLE_STYLES: Record<string, { bg: string; color: string }> = {
  admin:   { bg: "rgba(239,68,68,0.2)", color: "#fca5a5" },
  cashier: { bg: "rgba(34,197,94,0.2)", color: "#86efac" },
};

const PLAN_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  free: { bg: "rgba(148,163,184,0.2)", color: "#94a3b8", label: "Free" },
  basic: { bg: "rgba(59,130,246,0.2)", color: "#93c5fd", label: "Basic" },
  pro: { bg: "rgba(168,85,247,0.2)", color: "#d8b4fe", label: "Pro" },
};

const STAT_CARDS = [
  { key: "totalUsers",   label: "Jami foydalanuvchilar", icon: Users,    iconColor: "#6366f1", iconBg: "rgba(99,102,241,0.2)"  },
  { key: "activeUsers",  label: "Faol foydalanuvchilar", icon: Activity, iconColor: "#22c55e", iconBg: "rgba(34,197,94,0.2)"   },
  { key: "blockedUsers", label: "Bloklanganlar",         icon: XCircle,  iconColor: "#ef4444", iconBg: "rgba(239,68,68,0.2)"   },
] as const;

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
const tc = (theme: Theme, dark: string, light: string) =>
  theme === "dark" ? dark : light;

const formatDate = (dateStr: string): string => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const getRelativeTime = (dateStr: string): string => {
  if (!dateStr) return "";
  const diffMin = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (diffMin < 1)    return "hozirgina";
  if (diffMin < 60)   return `${diffMin} daqiqa oldin`;
  if (diffMin < 1440) return `${Math.floor(diffMin / 60)} soat oldin`;
  return `${Math.floor(diffMin / 1440)} kun oldin`;
};

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────
const StatsCards: React.FC<{ theme: Theme; stats: Stats | null; statsLoading: boolean }> = ({ theme, stats, statsLoading }) => (
  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px" }}>
    {STAT_CARDS.map(({ key, label, icon: Icon, iconColor, iconBg }) => (
      <div
        key={key}
        style={{
          borderRadius: "24px",
          padding:      "28px",
          background:   theme === "dark" ? "linear-gradient(145deg, #111827, #1e293b)" : "#ffffff",
          border:       `1px solid ${theme === "dark" ? "#1f2937" : "#e5e7eb"}`,
          boxShadow:    theme === "dark" ? "none" : "0 10px 15px -3px rgba(0,0,0,0.05)",
          display:      "flex",
          alignItems:   "center",
          gap:          "24px",
          transition:   "transform 0.3s ease",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-4px)")}
        onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
      >
        <div style={{
          width:          "64px",
          height:         "64px",
          borderRadius:   "18px",
          background:     iconBg,
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
          boxShadow:      `0 8px 16px -4px ${iconColor}40`,
        }}>
          <Icon size={30} color={iconColor} />
        </div>
        <div>
          <div style={{ color: "#64748b", fontSize: "14px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>
            {label}
          </div>
          <div style={{ fontSize: "32px", fontWeight: 800, color: theme === "dark" ? "#fff" : "#1a1f2e", letterSpacing: "-0.02em" }}>
            {statsLoading ? "..." : (stats?.[key] ?? 0).toLocaleString()}
          </div>
        </div>
      </div>
    ))}
  </div>
);

const RoleBadge: React.FC<{ role: string }> = ({ role }) => {
  const style = ROLE_STYLES[role] ?? { bg: "rgba(148,163,184,0.2)", color: "#94a3b8" };
  return (
    <span style={{ padding: "4px 10px", borderRadius: "999px", fontSize: "12px", fontWeight: 600, background: style.bg, color: style.color }}>
      {role.toUpperCase()}
    </span>
  );
};

const PlanBadge: React.FC<{ plan?: string }> = ({ plan }) => {
  const currentPlan = plan || 'free';
  const style = PLAN_STYLES[currentPlan] ?? PLAN_STYLES.free;
  return (
    <span style={{ padding: "4px 10px", borderRadius: "999px", fontSize: "12px", fontWeight: 600, background: style.bg, color: style.color }}>
      {style.label}
    </span>
  );
};

const UserStatus: React.FC<{ blocked: boolean }> = ({ blocked }) => (
  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
    <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: blocked ? "#ef4444" : "#22c55e" }} />
    <span style={{ fontSize: "13px", color: blocked ? "#fca5a5" : "#86efac" }}>
      {blocked ? "Bloklangan" : "Faol"}
    </span>
  </div>
);

const ActionButton: React.FC<{
  user: UserData;
  isLoading: boolean;
  onBlock: () => void;
  onUnblock: () => void;
}> = ({ user, isLoading, onBlock, onUnblock }) => (
  <button
    onClick={user.blocked ? onUnblock : onBlock}
    disabled={isLoading}
    style={{
      padding:    "6px 16px",
      borderRadius:"8px",
      fontSize:   "13px",
      fontWeight: 600,
      display:    "flex",
      alignItems: "center",
      gap:        "8px",
      margin:     "0 auto",
      cursor:     isLoading ? "not-allowed" : "pointer",
      opacity:    isLoading ? 0.6 : 1,
      background: user.blocked ? "rgba(34,197,94,0.2)"  : "rgba(239,68,68,0.2)",
      border:     user.blocked ? "1px solid rgba(34,197,94,0.3)" : "1px solid rgba(239,68,68,0.3)",
      color:      user.blocked ? "#86efac" : "#fca5a5",
    }}
  >
    {isLoading ? "..." : user.blocked
      ? <><Unlock size={14} /> Faollashtirish</>
      : <><Lock   size={14} /> Bloklash</>
    }
  </button>
);

const TableHead: React.FC<{ theme: Theme }> = ({ theme }) => (
  <thead>
    <tr style={{ background: tc(theme, "#1e293b", "#f8f9fa") }}>
      {["Foydalanuvchi", "Rol", "Tarif", "Telegram ID", "Qurilma", "Birinchi kirish", "Oxirgi kirish", "Holat", "Harakat"].map((col, i) => (
        <th key={col} style={{ padding: "16px", textAlign: i === 8 ? "center" : "left", color: tc(theme, "#e2e8f0", "#1a1f2e"), whiteSpace: "nowrap" }}>
          {col}
        </th>
      ))}
    </tr>
  </thead>
);

const UserRow: React.FC<{
  user: UserData;
  theme: Theme;
  currentUserLogin: string;
  actionLoading: string | null;
  onBlock: (id: string, login: string) => void;
  onUnblock: (id: string, login: string) => void;
  onChangePlan: (userId: string, login: string, newPlan: 'free' | 'basic' | 'pro') => void;
  onUpdateTelegramId: (userId: string, login: string, telegramId: string) => void;
}> = ({ user: u, theme, currentUserLogin, actionLoading, onBlock, onUnblock, onChangePlan, onUpdateTelegramId }) => {
  const isMobile = u.currentDevice.deviceType?.toLowerCase().includes("mobile");
  const currentPlan = u.subscription?.plan || 'free';
  const [telegramIdInput, setTelegramIdInput] = useState(u.telegramId || '');
  const [editingTelegramId, setEditingTelegramId] = useState(false);

  const handlePlanChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newPlan = e.target.value as 'free' | 'basic' | 'pro';
    if (newPlan !== currentPlan) {
      onChangePlan(u._id, u.login, newPlan);
    }
  };

  const handleTelegramIdSave = () => {
    onUpdateTelegramId(u._id, u.login, telegramIdInput);
    setEditingTelegramId(false);
  };

  return (
    <tr style={{
      borderBottom: `1px solid ${tc(theme, "#1e293b", "#e2e8f0")}`,
      background:   u.login === currentUserLogin ? "rgba(99,102,241,0.08)" : u.blocked ? "rgba(239,68,68,0.05)" : undefined,
      transition:   "background 0.2s",
    }}>
      <td style={{ padding: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <User size={18} color={tc(theme, "#94a3b8", "#64748b")} />
          <div>
            <strong style={{ color: tc(theme, "#e2e8f0", "#1a1f2e") }}>{u.login}</strong>
            {u.name && <div style={{ fontSize: "12px", color: tc(theme, "#94a3b8", "#64748b") }}>{u.name}</div>}
          </div>
          {u.login === currentUserLogin && (
            <span style={{ fontSize: "12px", background: "#6366f1", color: "white", padding: "2px 8px", borderRadius: "999px" }}>Siz</span>
          )}
        </div>
      </td>
      <td style={{ padding: "16px" }}><RoleBadge role={u.role} /></td>
      <td style={{ padding: "16px" }}>
        <select
          value={currentPlan}
          onChange={handlePlanChange}
          disabled={actionLoading === u._id}
          style={{
            padding: "6px 12px",
            borderRadius: "8px",
            fontSize: "13px",
            fontWeight: 600,
            background: PLAN_STYLES[currentPlan].bg,
            color: PLAN_STYLES[currentPlan].color,
            border: "none",
            outline: "none",
            cursor: actionLoading === u._id ? "not-allowed" : "pointer",
            opacity: actionLoading === u._id ? 0.6 : 1,
          }}
        >
          <option value="free">Free</option>
          <option value="basic">Basic</option>
          <option value="pro">Pro</option>
        </select>
      </td>
      <td style={{ padding: "16px" }}>
        {editingTelegramId ? (
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              value={telegramIdInput}
              onChange={(e) => setTelegramIdInput(e.target.value)}
              placeholder="Telegram ID"
              style={{
                padding: "6px 10px",
                borderRadius: "8px",
                border: `1px solid ${tc(theme, "#334155", "#cbd5e1")}`,
                background: tc(theme, "#0f172a", "#f8fafc"),
                color: tc(theme, "#e2e8f0", "#1a1f2e"),
                fontSize: "13px",
                outline: "none",
                width: "150px",
              }}
            />
            <button
              onClick={handleTelegramIdSave}
              disabled={actionLoading === u._id}
              style={{
                padding: "6px 12px",
                borderRadius: "8px",
                border: "none",
                background: "#22c55e",
                color: "white",
                fontSize: "13px",
                fontWeight: 600,
                cursor: actionLoading === u._id ? "not-allowed" : "pointer",
              }}
            >
              Saqlash
            </button>
            <button
              onClick={() => {
                setEditingTelegramId(false);
                setTelegramIdInput(u.telegramId || '');
              }}
              style={{
                padding: "6px 12px",
                borderRadius: "8px",
                border: "none",
                background: "transparent",
                color: "#64748b",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Bekor
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ 
              fontSize: "13px", 
              color: u.telegramId ? tc(theme, "#22c55e", "#16a34a") : tc(theme, "#64748b", "#94a3b8"),
              fontFamily: "monospace"
            }}>
              {u.telegramId || "—"}
            </span>
            <button
              onClick={() => setEditingTelegramId(true)}
              style={{
                background: "transparent",
                border: "none",
                color: tc(theme, "#64748b", "#64748b"),
                cursor: "pointer",
                padding: "4px",
              }}
            >
              ✏️
            </button>
          </div>
        )}
      </td>
      <td style={{ padding: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {isMobile ? <Smartphone size={16} color="#a78bfa" /> : <Monitor size={16} color="#60a5fa" />}
          <div>
            <div style={{ color: tc(theme, "#e2e8f0", "#1a1f2e") }}>{u.currentDevice.deviceType || "—"}</div>
            <div style={{ fontSize: "12px", color: tc(theme, "#94a3b8", "#64748b") }}>{u.currentDevice.deviceOS || "—"}</div>
          </div>
        </div>
      </td>
      <td style={{ padding: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Calendar size={14} color={tc(theme, "#94a3b8", "#64748b")} />
          <span style={{ fontSize: "13px", color: tc(theme, "#e2e8f0", "#1a1f2e") }}>{formatDate(u.firstLoginAt)}</span>
        </div>
      </td>
      <td style={{ padding: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Clock size={14} color={tc(theme, "#94a3b8", "#64748b")} />
          <div>
            <div style={{ fontSize: "13px", color: tc(theme, "#e2e8f0", "#1a1f2e") }}>
              {u.currentDevice.lastLogin ? formatDate(u.currentDevice.lastLogin) : "—"}
            </div>
            {u.currentDevice.lastLogin && (
              <div style={{ fontSize: "12px", color: tc(theme, "#64748b", "#94a3b8") }}>
                {getRelativeTime(u.currentDevice.lastLogin)}
              </div>
            )}
          </div>
        </div>
      </td>
      <td style={{ padding: "16px" }}><UserStatus blocked={u.blocked} /></td>
      <td style={{ padding: "16px", textAlign: "center" }}>
        {u.login !== currentUserLogin && (
          <ActionButton
            user={u}
            isLoading={actionLoading === u._id}
            onBlock={() => onBlock(u._id, u.login)}
            onUnblock={() => onUnblock(u._id, u.login)}
          />
        )}
      </td>
    </tr>
  );
};

const UsersTable: React.FC<{
  theme: Theme;
  loading: boolean;
  error: string;
  filteredUsers: UserData[];
  selectedRole: RoleFilter;
  currentUserLogin: string;
  actionLoading: string | null;
  onBlock: (id: string, login: string) => void;
  onUnblock: (id: string, login: string) => void;
  onChangePlan: (userId: string, login: string, newPlan: 'free' | 'basic' | 'pro') => void;
  onUpdateTelegramId: (userId: string, login: string, telegramId: string) => void;
}> = ({ theme, loading, error, filteredUsers, selectedRole, currentUserLogin, actionLoading, onBlock, onUnblock, onChangePlan, onUpdateTelegramId }) => (
  <div style={{
    borderRadius: "24px",
    overflow:     "hidden",
    background:   theme === "dark" ? "#111827" : "#ffffff",
    border:       `1px solid ${theme === "dark" ? "#1f2937" : "#e5e7eb"}`,
    boxShadow:    theme === "dark" ? "none" : "0 4px 20px rgba(0,0,0,0.03)",
  }}>
    <div style={{
      padding:      "24px 32px",
      fontSize:     "20px",
      fontWeight:   800,
      display:      "flex",
      alignItems:   "center",
      gap:          "16px",
      color:        theme === "dark" ? "#fff" : "#1a1f2e",
      borderBottom: `1px solid ${theme === "dark" ? "#1f2937" : "#e5e7eb"}`,
    }}>
      <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: "rgba(99,102,241,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#6366f1" }}>
        <Users size={22} />
      </div>
      <div style={{ flex: 1 }}>
        {selectedRole === "All" ? "Tizim foydalanuvchilari" : `${ROLE_LABELS[selectedRole]}lar`}
        <span style={{ color: "#64748b", marginLeft: "12px", fontSize: "15px", fontWeight: 600 }}>
          ({filteredUsers.length} ta)
        </span>
      </div>
    </div>

    {error && (
      <div style={{ padding: "16px", background: "rgba(239,68,68,0.15)", color: "#fca5a5", borderBottom: "1px solid #7f1d1d", display: "flex", alignItems: "center", gap: "12px" }}>
        <AlertTriangle size={18} /> {error}
      </div>
    )}

    {loading ? (
      <div style={{ padding: "60px 20px", textAlign: "center", color: tc(theme, "#94a3b8", "#64748b") }}>
        <RefreshCw size={24} style={{ animation: "spin 1s linear infinite", marginBottom: "12px" }} />
        <div>Yuklanmoqda...</div>
      </div>
    ) : filteredUsers.length === 0 ? (
      <div style={{ padding: "60px 20px", textAlign: "center", color: tc(theme, "#94a3b8", "#64748b") }}>
        <Users size={48} style={{ opacity: 0.3, marginBottom: "16px" }} />
        <div style={{ fontSize: "16px" }}>
          {selectedRole === "All" ? "Hozircha tizimga kirgan foydalanuvchi yo'q" : `${ROLE_LABELS[selectedRole]} rolli hech kim tizimga kirmagan`}
        </div>
      </div>
    ) : (
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
          <TableHead theme={theme} />
          <tbody>
            {filteredUsers.map((u) => (
              <UserRow
                key={u._id}
                user={u}
                theme={theme}
                currentUserLogin={currentUserLogin}
                actionLoading={actionLoading}
                onBlock={onBlock}
                onUnblock={onUnblock}
                onChangePlan={onChangePlan}
                onUpdateTelegramId={onUpdateTelegramId}
              />
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
);

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────
export default function AdminPanel() {
  const [users,         setUsers]         = useState<UserData[]>([]);
  const [stats,         setStats]         = useState<Stats | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [statsLoading,  setStatsLoading]  = useState(true);
  const [error,         setError]         = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedRole,  setSelectedRole]  = useState<RoleFilter>("All");

  const currentUserLogin = getSessionLogin() || "—";

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true); setError("");
      const res = await axiosInstance.get("/admin/users");
      if (res.data.success) setUsers(res.data.users || []);
    } catch (err: any) {
      setError(err.response?.data?.message || "Ma'lumotlarni yuklab bo'lmadi");
    } finally { setLoading(false); }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const res = await axiosInstance.get("/admin/stats");
      if (res.data.success) setStats(res.data.stats || null);
    } catch { /* silent */ } finally { setStatsLoading(false); }
  }, []);

  const refreshAll = useCallback(() => { fetchUsers(); fetchStats(); }, [fetchUsers, fetchStats]);

  useEffect(() => {
    refreshAll();
    const interval = setInterval(refreshAll, 60000);
    return () => clearInterval(interval);
  }, [refreshAll]);

  const handleBlockUser = async (userId: string, login: string) => {
    if (!confirm(`${login} ni bloklashni xohlaysizmi?\n\nU tizimga kira olmaydi.`)) return;
    try {
      setActionLoading(userId);
      const res = await axiosInstance.post("/admin/block-user", { userId });
      if (res.data.success) { alert(`✅ ${login} bloklandi`); await refreshAll(); }
    } catch (err: any) {
      alert(`❌ ${err.response?.data?.message || "Bloklashda xato"}`);
    } finally { setActionLoading(null); }
  };

  const handleUnblockUser = async (userId: string, login: string) => {
    if (!confirm(`${login} ni blokdan chiqarishni xohlaysizmi?`)) return;
    try {
      setActionLoading(userId);
      const res = await axiosInstance.post("/admin/unblock-user", { userId });
      if (res.data.success) { alert(`✅ ${login} blokdan chiqarildi`); await refreshAll(); }
    } catch (err: any) {
      alert(`❌ ${err.response?.data?.message || "Blokdan chiqarishda xato"}`);
    } finally { setActionLoading(null); }
  };

  const handleChangePlan = async (userId: string, login: string, newPlan: 'free' | 'basic' | 'pro') => {
    if (!confirm(`${login} foydalanuvchining tarif rejagini ${newPlan.toUpperCase()} ga o'zgartirishni xohlaysizmi?`)) return;
    try {
      setActionLoading(userId);
      const res = await axiosInstance.post("/admin/change-user-plan", { userId, plan: newPlan });
      if (res.data.success) { 
        alert(`✅ ${login} foydalanuvchining tarif rejasi ${newPlan.toUpperCase()} ga o'zgartirildi!`); 
        await refreshAll(); 
      }
    } catch (err: any) {
      alert(`❌ ${err.response?.data?.message || "Tarif rejini o'zgartirishda xato"}`);
      // Error bo'lsa, select'ni eski qiymatga qaytarish uchun refresh qilamiz
      await refreshAll();
    } finally { setActionLoading(null); }
  };

  const handleUpdateTelegramId = async (userId: string, login: string, telegramId: string) => {
    try {
      setActionLoading(userId);
      const res = await axiosInstance.put(`/telegram/user/${login}`, { telegramId: telegramId || null });
      if (res.data.success) { 
        alert(`✅ Telegram ID saqlandi!`); 
        await refreshAll(); 
      }
    } catch (err: any) {
      alert(`❌ ${err.response?.data?.message || "Telegram ID ni saqlashda xato"}`);
      await refreshAll();
    } finally { setActionLoading(null); }
  };

  const filteredUsers = selectedRole === "All"
    ? users
    : users.filter((u) => u.role.toLowerCase() === selectedRole.toLowerCase());

  return (
    <AdminLayout
      title="Dashboard"
      actions={
        <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value as RoleFilter)}
            style={{
              padding:    "10px 16px",
              borderRadius:"10px",
              fontSize:   "14px",
              minWidth:   "160px",
              cursor:     "pointer",
              background: "transparent",
              border:     "1px solid rgba(148,163,184,0.2)",
              color:      "inherit",
              outline:    "none",
            }}
          >
            <option value="All">Barcha rollar</option>
            <option value="admin">Admin</option>
            <option value="cashier">Kassir</option>
          </select>

          <button
            onClick={refreshAll}
            disabled={loading}
            style={{
              display:    "flex",
              alignItems: "center",
              gap:        "8px",
              padding:    "10px 20px",
              borderRadius:"10px",
              background: "#6366f1",
              border:     "none",
              color:      "#fff",
              fontWeight: 600,
              cursor:     loading ? "not-allowed" : "pointer",
              boxShadow:  "0 4px 12px rgba(99,102,241,0.2)",
            }}
          >
            <RefreshCw size={18} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
            Yangilash
          </button>
        </div>
      }
    >
      {({ theme }) => (
        <>
          <StatsCards theme={theme} stats={stats} statsLoading={statsLoading} />

          <UsersTable
            theme={theme}
            loading={loading}
            error={error}
            filteredUsers={filteredUsers}
            selectedRole={selectedRole}
            currentUserLogin={currentUserLogin}
            actionLoading={actionLoading}
            onBlock={handleBlockUser}
            onUnblock={handleUnblockUser}
            onChangePlan={handleChangePlan}
            onUpdateTelegramId={handleUpdateTelegramId}
          />

          <style>{`
            @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            select option {
              background: ${theme === "dark" ? "#1e293b" : "#ffffff"};
              color: ${theme === "dark" ? "#e2e8f0" : "#1a1f2e"};
            }
          `}</style>
        </>
      )}
    </AdminLayout>
  );
}
