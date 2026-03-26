// adminPages/AdminMenu.tsx
import React, { useState, useEffect, useCallback } from "react";
import axiosInstance from "../api/axiosInstance";
import AdminSidebar from "../adminComponents/AdminSidebar";
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

type RoleFilter = "All" | "admin" | "cashier" | "user";
type Theme = "dark" | "light";

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
const ROLE_LABELS: Record<string, string> = {
  All: "Barcha", admin: "Admin", cashier: "Kassir", user: "Foydalanuvchi",
};

const ROLE_STYLES: Record<string, { bg: string; color: string }> = {
  admin:   { bg: "rgba(239,68,68,0.2)",   color: "#fca5a5" },
  cashier: { bg: "rgba(34,197,94,0.2)",   color: "#86efac" },
  user:    { bg: "rgba(59,130,246,0.2)",  color: "#93c5fd" },
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

/** Dashboard sarlavhasi va asboblar paneli */
const DashboardHeader: React.FC<{
  theme: Theme;
  loading: boolean;
  selectedRole: RoleFilter;
  lastUpdated: Date;
  onRoleChange: (role: RoleFilter) => void;
  onRefresh: () => void;
}> = ({ theme, loading, selectedRole, lastUpdated, onRoleChange, onRefresh }) => (
  <div style={{
    display: "flex", justifyContent: "space-between", alignItems: "center",
    marginBottom: "32px", flexWrap: "wrap", gap: "16px",
  }}>
    <div>
      <h1 style={{ fontSize: "28px", fontWeight: 700, margin: 0, color: tc(theme, "#fff", "#1a1f2e") }}>
        Dashboard
      </h1>
      <p style={{ color: tc(theme, "#94a3b8", "#64748b"), marginTop: "8px", margin: 0 }}>
        Tizimga kirgan foydalanuvchilarni boshqarish
      </p>
    </div>

    <div style={{ display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>
      <select
        value={selectedRole}
        onChange={(e) => onRoleChange(e.target.value as RoleFilter)}
        style={{
          padding: "10px 16px", borderRadius: "8px", fontSize: "14px",
          minWidth: "170px", cursor: "pointer",
          background: tc(theme, "#1e293b", "#ffffff"),
          border: `1px solid ${tc(theme, "#334155", "#e2e8f0")}`,
          color: tc(theme, "#e2e8f0", "#1a1f2e"),
        }}
      >
        <option value="All">Barcha rollar</option>
        <option value="admin">Admin</option>
        <option value="cashier">Kassir</option>
        <option value="user">Foydalanuvchi</option>
      </select>

      <button
        onClick={onRefresh}
        disabled={loading}
        style={{
          display: "flex", alignItems: "center", gap: "8px",
          padding: "10px 16px", borderRadius: "8px", transition: "all 0.2s",
          background: tc(theme, "#1e293b", "#ffffff"),
          border: `1px solid ${tc(theme, "#334155", "#e2e8f0")}`,
          color: tc(theme, "#94a3b8", "#64748b"),
          cursor: loading ? "not-allowed" : "pointer",
          opacity: loading ? 0.6 : 1,
        }}
      >
        <RefreshCw size={18} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
        Yangilash
      </button>

      <div style={{
        padding: "10px 16px", borderRadius: "8px", fontSize: "14px",
        background: tc(theme, "#1e293b", "#ffffff"),
        border: `1px solid ${tc(theme, "#334155", "#e2e8f0")}`,
      }}>
        Oxirgi yangilanish: {formatDate(lastUpdated.toISOString())}
      </div>
    </div>
  </div>
);

/** Statistika kartalari */
const StatsCards: React.FC<{
  theme: Theme;
  stats: Stats | null;
  statsLoading: boolean;
}> = ({ theme, stats, statsLoading }) => (
  <div style={{
    display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: "20px", marginBottom: "32px",
  }}>
    {STAT_CARDS.map(({ key, label, icon: Icon, iconColor, iconBg }) => (
      <div
        key={key}
        style={{
          borderRadius: "12px", padding: "20px",
          background: tc(theme,
            "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
            "linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%)"
          ),
          border: `1px solid ${tc(theme, "#334155", "#e2e8f0")}`,
          boxShadow: tc(theme, "none", "0 2px 8px rgba(0,0,0,0.05)"),
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
          <div style={{
            width: "40px", height: "40px", borderRadius: "8px",
            background: iconBg, display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Icon size={20} color={iconColor} />
          </div>
          <div style={{ color: tc(theme, "#94a3b8", "#64748b"), fontSize: "14px" }}>{label}</div>
        </div>
        <div style={{ fontSize: "32px", fontWeight: 700, color: tc(theme, "#fff", "#1a1f2e") }}>
          {statsLoading ? "..." : (stats?.[key] ?? 0)}
        </div>
      </div>
    ))}
  </div>
);

/** Foydalanuvchi satri uchun rol badge */
const RoleBadge: React.FC<{ role: string }> = ({ role }) => {
  const style = ROLE_STYLES[role] ?? { bg: "rgba(148,163,184,0.2)", color: "#94a3b8" };
  return (
    <span style={{
      padding: "4px 10px", borderRadius: "999px",
      fontSize: "12px", fontWeight: 600,
      background: style.bg, color: style.color,
    }}>
      {role.toUpperCase()}
    </span>
  );
};

/** Foydalanuvchi holati (faol / bloklangan) */
const UserStatus: React.FC<{ blocked: boolean }> = ({ blocked }) => (
  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
    <div style={{
      width: "8px", height: "8px", borderRadius: "50%",
      background: blocked ? "#ef4444" : "#22c55e",
    }} />
    <span style={{ fontSize: "13px", color: blocked ? "#fca5a5" : "#86efac" }}>
      {blocked ? "Bloklangan" : "Faol"}
    </span>
  </div>
);

/** Bloklash / Faollashtirish tugmasi */
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
      padding: "6px 16px", borderRadius: "8px",
      fontSize: "13px", fontWeight: 600,
      display: "flex", alignItems: "center", gap: "8px", margin: "0 auto",
      cursor: isLoading ? "not-allowed" : "pointer",
      opacity: isLoading ? 0.6 : 1,
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

/** Jadval thead */
const TableHead: React.FC<{ theme: Theme }> = ({ theme }) => (
  <thead>
    <tr style={{ background: tc(theme, "#1e293b", "#f8f9fa") }}>
      {["Foydalanuvchi", "Rol", "Qurilma", "Birinchi kirish", "Oxirgi kirish", "Holat", "Harakat"].map((col, i) => (
        <th key={col} style={{
          padding: "16px",
          textAlign: i === 6 ? "center" : "left",
          color: tc(theme, "#e2e8f0", "#1a1f2e"),
        }}>
          {col}
        </th>
      ))}
    </tr>
  </thead>
);

/** Bitta foydalanuvchi satri */
const UserRow: React.FC<{
  user: UserData;
  theme: Theme;
  currentUserLogin: string;
  actionLoading: string | null;
  onBlock: (id: string, login: string) => void;
  onUnblock: (id: string, login: string) => void;
}> = ({ user: u, theme, currentUserLogin, actionLoading, onBlock, onUnblock }) => {
  const isMobile = u.currentDevice.deviceType?.toLowerCase().includes("mobile");

  return (
    <tr style={{
      borderBottom: `1px solid ${tc(theme, "#1e293b", "#e2e8f0")}`,
      background: u.login === currentUserLogin
        ? "rgba(99,102,241,0.08)"
        : u.blocked ? "rgba(239,68,68,0.05)" : undefined,
      transition: "background 0.2s",
    }}>
      {/* Foydalanuvchi */}
      <td style={{ padding: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <User size={18} color={tc(theme, "#94a3b8", "#64748b")} />
          <div>
            <strong style={{ color: tc(theme, "#e2e8f0", "#1a1f2e") }}>{u.login}</strong>
            {u.name && (
              <div style={{ fontSize: "12px", color: tc(theme, "#94a3b8", "#64748b") }}>{u.name}</div>
            )}
          </div>
          {u.login === currentUserLogin && (
            <span style={{
              fontSize: "12px", background: "#6366f1", color: "white",
              padding: "2px 8px", borderRadius: "999px",
            }}>
              Siz
            </span>
          )}
        </div>
      </td>

      {/* Rol */}
      <td style={{ padding: "16px" }}>
        <RoleBadge role={u.role} />
      </td>

      {/* Qurilma */}
      <td style={{ padding: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {isMobile
            ? <Smartphone size={16} color="#a78bfa" />
            : <Monitor   size={16} color="#60a5fa" />
          }
          <div>
            <div style={{ color: tc(theme, "#e2e8f0", "#1a1f2e") }}>
              {u.currentDevice.deviceType || "—"}
            </div>
            <div style={{ fontSize: "12px", color: tc(theme, "#94a3b8", "#64748b") }}>
              {u.currentDevice.deviceOS || "—"}
            </div>
          </div>
        </div>
      </td>

      {/* Birinchi kirish */}
      <td style={{ padding: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Calendar size={14} color={tc(theme, "#94a3b8", "#64748b")} />
          <span style={{ fontSize: "13px", color: tc(theme, "#e2e8f0", "#1a1f2e") }}>
            {formatDate(u.firstLoginAt)}
          </span>
        </div>
      </td>

      {/* Oxirgi kirish */}
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

      {/* Holat */}
      <td style={{ padding: "16px" }}>
        <UserStatus blocked={u.blocked} />
      </td>

      {/* Harakat */}
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

/** Foydalanuvchilar jadvali */
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
}> = ({ theme, loading, error, filteredUsers, selectedRole, currentUserLogin, actionLoading, onBlock, onUnblock }) => (
  <div style={{
    borderRadius: "12px", overflow: "hidden",
    background: tc(theme, "#111827", "#ffffff"),
    border: `1px solid ${tc(theme, "#1e293b", "#e2e8f0")}`,
    boxShadow: tc(theme, "none", "0 2px 8px rgba(0,0,0,0.05)"),
  }}>
    {/* Jadval sarlavhasi */}
    <div style={{
      padding: "20px", fontSize: "18px", fontWeight: 600,
      display: "flex", alignItems: "center", gap: "12px",
      color: tc(theme, "#fff", "#1a1f2e"),
      borderBottom: `1px solid ${tc(theme, "#1e293b", "#e2e8f0")}`,
    }}>
      <Users size={22} color="#a78bfa" />
      {selectedRole === "All"
        ? "Tizimga kirgan foydalanuvchilar"
        : `${ROLE_LABELS[selectedRole]} rolli foydalanuvchilar`
      }
      <span style={{ color: tc(theme, "#94a3b8", "#64748b") }}>
        ({filteredUsers.length})
      </span>
    </div>

    {/* Xato xabari */}
    {error && (
      <div style={{
        padding: "16px", background: "rgba(239,68,68,0.15)", color: "#fca5a5",
        borderBottom: "1px solid #7f1d1d", display: "flex", alignItems: "center", gap: "12px",
      }}>
        <AlertTriangle size={18} /> {error}
      </div>
    )}

    {/* Yuklanmoqda */}
    {loading ? (
      <div style={{ padding: "60px 20px", textAlign: "center", color: tc(theme, "#94a3b8", "#64748b") }}>
        <RefreshCw size={24} style={{ animation: "spin 1s linear infinite", marginBottom: "12px" }} />
        <div>Yuklanmoqda...</div>
      </div>

    /* Bo'sh holat */
    ) : filteredUsers.length === 0 ? (
      <div style={{ padding: "60px 20px", textAlign: "center", color: tc(theme, "#94a3b8", "#64748b") }}>
        <Users size={48} style={{ opacity: 0.3, marginBottom: "16px" }} />
        <div style={{ fontSize: "16px" }}>
          {selectedRole === "All"
            ? "Hozircha tizimga kirgan foydalanuvchi yo'q"
            : `${ROLE_LABELS[selectedRole]} rolli hech kim tizimga kirmagan`
          }
        </div>
      </div>

    /* Jadval */
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
  const [lastUpdated,   setLastUpdated]   = useState(new Date());
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [sidebarOpen,   setSidebarOpen]   = useState(true);
  const [theme,         setTheme]         = useState<Theme>("dark");
  const [selectedRole,  setSelectedRole]  = useState<RoleFilter>("All");

  const currentUserLogin = localStorage.getItem("currentLogin") || "—";

  // Tema yuklash
  useEffect(() => {
    const saved = localStorage.getItem("adminTheme") as Theme | null;
    if (saved) setTheme(saved);
  }, []);

  // API so'rovlari
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await axiosInstance.get("/admin/users");
      if (res.data.success) {
        setUsers(res.data.users || []);
        setLastUpdated(new Date());
      }
    } catch (err: any) {
      console.error("Users yuklashda xato:", err);
      setError(err.response?.data?.message || "Ma'lumotlarni yuklab bo'lmadi");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const res = await axiosInstance.get("/admin/stats");
      if (res.data.success) setStats(res.data.stats || null);
    } catch (err: any) {
      console.error("Statistikani yuklashda xato:", err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const refreshAll = useCallback(() => {
    fetchUsers();
    fetchStats();
  }, [fetchUsers, fetchStats]);

  // Dastlabki yuklash + 60s interval
  useEffect(() => {
    refreshAll();
    const interval = setInterval(refreshAll, 60000);
    return () => clearInterval(interval);
  }, [refreshAll]);

  // Bloklash / Faollashtirish
  const handleBlockUser = async (userId: string, login: string) => {
    if (!confirm(`${login} ni bloklashni xohlaysizmi?\n\nU tizimga kira olmaydi va barcha sessiyalari tugatiladi.`)) return;
    try {
      setActionLoading(userId);
      const res = await axiosInstance.post("/admin/block-user", { userId });
      if (res.data.success) {
        alert(`✅ ${login} bloklandi`);
        await refreshAll();
      }
    } catch (err: any) {
      alert(`❌ ${err.response?.data?.message || "Bloklashda xato yuz berdi"}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnblockUser = async (userId: string, login: string) => {
    if (!confirm(`${login} ni blokdan chiqarishni xohlaysizmi?\n\nU yana tizimga kira oladi.`)) return;
    try {
      setActionLoading(userId);
      const res = await axiosInstance.post("/admin/unblock-user", { userId });
      if (res.data.success) {
        alert(`✅ ${login} blokdan chiqarildi`);
        await refreshAll();
      }
    } catch (err: any) {
      alert(`❌ ${err.response?.data?.message || "Blokdan chiqarishda xato yuz berdi"}`);
    } finally {
      setActionLoading(null);
    }
  };

  const filteredUsers = selectedRole === "All"
    ? users
    : users.filter((u) => u.role.toLowerCase() === selectedRole.toLowerCase());

  return (
    <div style={{
      display: "flex", minHeight: "100vh",
      background: tc(theme, "#0a0e1a", "#f8f9fa"),
      color: tc(theme, "#e2e8f0", "#1a1f2e"),
      fontFamily: "system-ui, sans-serif",
      transition: "background 0.3s ease, color 0.3s ease",
    }}>
      <AdminSidebar
        theme={theme}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
        currentUserLogin={currentUserLogin}
      />

      <div style={{
        flex: 1,
        marginLeft: sidebarOpen ? "280px" : "80px",
        padding: "24px", overflow: "auto",
        transition: "margin-left 0.3s ease",
      }}>
        <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
          <DashboardHeader
            theme={theme}
            loading={loading}
            selectedRole={selectedRole}
            lastUpdated={lastUpdated}
            onRoleChange={setSelectedRole}
            onRefresh={refreshAll}
          />

          <StatsCards
            theme={theme}
            stats={stats}
            statsLoading={statsLoading}
          />

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
          />
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}