// src/pages/AdminPanel.tsx
import React, { useState, useEffect } from "react";
import axiosInstance from "../api/axiosInstance";
import AdminSidebar from "../adminComponents/AdminSidebar";
import {
  User,
  Clock,
  Monitor,
  Smartphone,
  RefreshCw,
  XCircle,
  AlertTriangle,
  Users,
  Lock,
  Unlock,
  Calendar,
  Activity,
} from "lucide-react";

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

export default function AdminPanel() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [selectedRole, setSelectedRole] = useState<"All" | "admin" | "cashier" | "user">("All");

  const currentUserLogin = localStorage.getItem("currentLogin") || "—";

  useEffect(() => {
    const savedTheme = localStorage.getItem("adminTheme") as "dark" | "light" | null;
    if (savedTheme) setTheme(savedTheme);
  }, []);

  const fetchUsers = async () => {
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
  };

  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      const res = await axiosInstance.get("/admin/stats");

      if (res.data.success) {
        setStats(res.data.stats || null);
      }
    } catch (err: any) {
      console.error("Statistikani yuklashda xato:", err);
    } finally {
      setStatsLoading(false);
    }
  };

  const handleBlockUser = async (userId: string, login: string) => {
    if (!confirm(`${login} ni bloklashni xohlaysizmi?\n\nU tizimga kira olmaydi va barcha sessiyalari tugatiladi.`)) return;

    try {
      setActionLoading(userId);
      const res = await axiosInstance.post("/admin/block-user", { userId });

      if (res.data.success) {
        alert(`✅ ${login} bloklandi`);
        await fetchUsers();
        await fetchStats();
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
        await fetchUsers();
        await fetchStats();
      }
    } catch (err: any) {
      alert(`❌ ${err.response?.data?.message || "Blokdan chiqarishda xato yuz berdi"}`);
    } finally {
      setActionLoading(null);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchStats();

    const interval = setInterval(() => {
      fetchUsers();
      fetchStats();
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  // Sana formatini 24.01.2026 shakliga o'zgartirdik
  const formatDate = (dateStr: string) => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";

  const day    = String(d.getDate()).padStart(2, '0');
  const month  = String(d.getMonth() + 1).padStart(2, '0');
  const year   = d.getFullYear();
  const hours  = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');

  return `${day}.${month}.${year} ${hours}:${minutes}`;
};

  const getRelativeTime = (dateStr: string) => {
    if (!dateStr) return "";
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffMin = Math.floor(diffMs / 60000);

    if (diffMin < 1) return "hozirgina";
    if (diffMin < 60) return `${diffMin} daqiqa oldin`;
    if (diffMin < 1440) return `${Math.floor(diffMin / 60)} soat oldin`;
    return `${Math.floor(diffMin / 1440)} kun oldin`;
  };

  const handleRefresh = () => {
    fetchUsers();
    fetchStats();
  };

  const filteredUsers = selectedRole === "All"
    ? users
    : users.filter((u) => u.role.toLowerCase() === selectedRole.toLowerCase());

  const getRoleDisplayName = (role: string) => {
    if (role === "All") return "Barcha";
    if (role === "admin") return "Admin";
    if (role === "cashier") return "Kassir";
    if (role === "user") return "Foydalanuvchi";
    return role;
  };

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: theme === "dark" ? "#0a0e1a" : "#f8f9fa",
        color: theme === "dark" ? "#e2e8f0" : "#1a1f2e",
        fontFamily: "system-ui, sans-serif",
        transition: "background 0.3s ease, color 0.3s ease",
      }}
    >
      <AdminSidebar
        theme={theme}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
        currentUserLogin={currentUserLogin}
      />

      <div
        style={{
          flex: 1,
          marginLeft: sidebarOpen ? "280px" : "80px",
          padding: "24px",
          overflow: "auto",
          transition: "margin-left 0.3s ease",
        }}
      >
        <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
          {/* Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "32px",
              flexWrap: "wrap",
              gap: "16px",
            }}
          >
            <div>
              <h1
                style={{
                  fontSize: "28px",
                  fontWeight: 700,
                  margin: 0,
                  color: theme === "dark" ? "#fff" : "#1a1f2e",
                }}
              >
                Dashboard
              </h1>
              <p
                style={{
                  color: theme === "dark" ? "#94a3b8" : "#64748b",
                  marginTop: "8px",
                  margin: 0,
                }}
              >
                Tizimga kirgan foydalanuvchilarni boshqarish
              </p>
            </div>

            <div style={{ display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as typeof selectedRole)}
                style={{
                  padding: "10px 16px",
                  background: theme === "dark" ? "#1e293b" : "#ffffff",
                  border: theme === "dark" ? "1px solid #334155" : "1px solid #e2e8f0",
                  borderRadius: "8px",
                  color: theme === "dark" ? "#e2e8f0" : "#1a1f2e",
                  fontSize: "14px",
                  minWidth: "170px",
                  cursor: "pointer",
                }}
              >
                <option value="All">Barcha rollar</option>
                <option value="admin">Admin</option>
                <option value="cashier">Kassir</option>
                <option value="user">Foydalanuvchi</option>
              </select>

              <button
                onClick={handleRefresh}
                disabled={loading}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 16px",
                  background: theme === "dark" ? "#1e293b" : "#ffffff",
                  border: theme === "dark" ? "1px solid #334155" : "1px solid #e2e8f0",
                  borderRadius: "8px",
                  color: theme === "dark" ? "#94a3b8" : "#64748b",
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.6 : 1,
                  transition: "all 0.2s",
                }}
              >
                <RefreshCw
                  size={18}
                  style={{ animation: loading ? "spin 1s linear infinite" : "none" }}
                />
                Yangilash
              </button>

              <div
                style={{
                  background: theme === "dark" ? "#1e293b" : "#ffffff",
                  padding: "10px 16px",
                  borderRadius: "8px",
                  fontSize: "14px",
                  border: theme === "dark" ? "1px solid #334155" : "1px solid #e2e8f0",
                }}
              >
                Oxirgi yangilanish: {formatDate(lastUpdated.toISOString())}
              </div>
            </div>
          </div>

          {/* Statistics Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
              gap: "20px",
              marginBottom: "32px",
            }}
          >
            <div
              style={{
                background:
                  theme === "dark"
                    ? "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)"
                    : "linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%)",
                borderRadius: "12px",
                padding: "20px",
                border: theme === "dark" ? "1px solid #334155" : "1px solid #e2e8f0",
                boxShadow: theme === "dark" ? "none" : "0 2px 8px rgba(0,0,0,0.05)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    background: "rgba(99, 102, 241, 0.2)",
                    borderRadius: "8px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Users size={20} color="#6366f1" />
                </div>
                <div style={{ color: theme === "dark" ? "#94a3b8" : "#64748b", fontSize: "14px" }}>
                  Jami foydalanuvchilar
                </div>
              </div>
              <div
                style={{
                  fontSize: "32px",
                  fontWeight: 700,
                  color: theme === "dark" ? "#fff" : "#1a1f2e",
                }}
              >
                {statsLoading ? "..." : stats?.totalUsers || 0}
              </div>
            </div>

            <div
              style={{
                background:
                  theme === "dark"
                    ? "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)"
                    : "linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%)",
                borderRadius: "12px",
                padding: "20px",
                border: theme === "dark" ? "1px solid #334155" : "1px solid #e2e8f0",
                boxShadow: theme === "dark" ? "none" : "0 2px 8px rgba(0,0,0,0.05)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    background: "rgba(34, 197, 94, 0.2)",
                    borderRadius: "8px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Activity size={20} color="#22c55e" />
                </div>
                <div style={{ color: theme === "dark" ? "#94a3b8" : "#64748b", fontSize: "14px" }}>
                  Faol foydalanuvchilar
                </div>
              </div>
              <div
                style={{
                  fontSize: "32px",
                  fontWeight: 700,
                  color: theme === "dark" ? "#fff" : "#1a1f2e",
                }}
              >
                {statsLoading ? "..." : stats?.activeUsers || 0}
              </div>
            </div>

            <div
              style={{
                background:
                  theme === "dark"
                    ? "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)"
                    : "linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%)",
                borderRadius: "12px",
                padding: "20px",
                border: theme === "dark" ? "1px solid #334155" : "1px solid #e2e8f0",
                boxShadow: theme === "dark" ? "none" : "0 2px 8px rgba(0,0,0,0.05)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    background: "rgba(239, 68, 68, 0.2)",
                    borderRadius: "8px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <XCircle size={20} color="#ef4444" />
                </div>
                <div style={{ color: theme === "dark" ? "#94a3b8" : "#64748b", fontSize: "14px" }}>
                  Bloklanganlar
                </div>
              </div>
              <div
                style={{
                  fontSize: "32px",
                  fontWeight: 700,
                  color: theme === "dark" ? "#fff" : "#1a1f2e",
                }}
              >
                {statsLoading ? "..." : stats?.blockedUsers || 0}
              </div>
            </div>
          </div>

          {/* Users Table */}
          <div
            style={{
              background: theme === "dark" ? "#111827" : "#ffffff",
              borderRadius: "12px",
              overflow: "hidden",
              border: theme === "dark" ? "1px solid #1e293b" : "1px solid #e2e8f0",
              boxShadow: theme === "dark" ? "none" : "0 2px 8px rgba(0,0,0,0.05)",
            }}
          >
            <div
              style={{
                padding: "20px",
                borderBottom: theme === "dark" ? "1px solid #1e293b" : "1px solid #e2e8f0",
                fontSize: "18px",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                color: theme === "dark" ? "#fff" : "#1a1f2e",
                flexWrap: "wrap",
                gap: "12px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <Users size={22} color="#a78bfa" />
                {selectedRole === "All"
                  ? "Tizimga kirgan foydalanuvchilar"
                  : `${getRoleDisplayName(selectedRole)} rolli foydalanuvchilar`}{" "}
                <span style={{ color: theme === "dark" ? "#94a3b8" : "#64748b" }}>
                  ({filteredUsers.length})
                </span>
              </div>
            </div>

            {error && (
              <div
                style={{
                  padding: "16px",
                  background: "rgba(239,68,68,0.15)",
                  color: "#fca5a5",
                  borderBottom: "1px solid #7f1d1d",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                }}
              >
                <AlertTriangle size={18} />
                {error}
              </div>
            )}

            {loading ? (
              <div
                style={{
                  padding: "60px 20px",
                  textAlign: "center",
                  color: theme === "dark" ? "#94a3b8" : "#64748b",
                }}
              >
                <RefreshCw
                  size={24}
                  style={{ animation: "spin 1s linear infinite", marginBottom: "12px" }}
                />
                <div>Yuklanmoqda...</div>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div
                style={{
                  padding: "60px 20px",
                  textAlign: "center",
                  color: theme === "dark" ? "#94a3b8" : "#64748b",
                }}
              >
                <Users size={48} style={{ opacity: 0.3, marginBottom: "16px" }} />
                <div style={{ fontSize: "16px" }}>
                  {selectedRole === "All"
                    ? "Hozircha tizimga kirgan foydalanuvchi yo‘q"
                    : `${getRoleDisplayName(selectedRole)} rolli hech kim tizimga kirmagan`}
                </div>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: "14px",
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        background: theme === "dark" ? "#1e293b" : "#f8f9fa",
                      }}
                    >
                      <th style={{ padding: "16px", textAlign: "left", color: theme === "dark" ? "#e2e8f0" : "#1a1f2e" }}>
                        Foydalanuvchi
                      </th>
                      <th style={{ padding: "16px", textAlign: "left", color: theme === "dark" ? "#e2e8f0" : "#1a1f2e" }}>
                        Rol
                      </th>
                      <th style={{ padding: "16px", textAlign: "left", color: theme === "dark" ? "#e2e8f0" : "#1a1f2e" }}>
                        Qurilma
                      </th>
                      <th style={{ padding: "16px", textAlign: "left", color: theme === "dark" ? "#e2e8f0" : "#1a1f2e" }}>
                        Birinchi kirish
                      </th>
                      <th style={{ padding: "16px", textAlign: "left", color: theme === "dark" ? "#e2e8f0" : "#1a1f2e" }}>
                        Oxirgi kirish
                      </th>
                      <th style={{ padding: "16px", textAlign: "left", color: theme === "dark" ? "#e2e8f0" : "#1a1f2e" }}>
                        Holat
                      </th>
                      <th style={{ padding: "16px", textAlign: "center", color: theme === "dark" ? "#e2e8f0" : "#1a1f2e" }}>
                        Harakat
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => (
                      <tr
                        key={u._id}
                        style={{
                          borderBottom: theme === "dark" ? "1px solid #1e293b" : "1px solid #e2e8f0",
                          background:
                            u.login === currentUserLogin
                              ? "rgba(99,102,241,0.08)"
                              : u.blocked
                              ? "rgba(239,68,68,0.05)"
                              : undefined,
                          transition: "background 0.2s",
                        }}
                      >
                        <td style={{ padding: "16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            <User size={18} color={theme === "dark" ? "#94a3b8" : "#64748b"} />
                            <div>
                              <strong style={{ color: theme === "dark" ? "#e2e8f0" : "#1a1f2e" }}>
                                {u.login}
                              </strong>
                              {u.name && (
                                <div style={{ fontSize: "12px", color: theme === "dark" ? "#94a3b8" : "#64748b" }}>
                                  {u.name}
                                </div>
                              )}
                            </div>
                            {u.login === currentUserLogin && (
                              <span
                                style={{
                                  fontSize: "12px",
                                  background: "#6366f1",
                                  color: "white",
                                  padding: "2px 8px",
                                  borderRadius: "999px",
                                }}
                              >
                                Siz
                              </span>
                            )}
                          </div>
                        </td>

                        <td style={{ padding: "16px" }}>
                          <span
                            style={{
                              padding: "4px 10px",
                              borderRadius: "999px",
                              fontSize: "12px",
                              fontWeight: 600,
                              background:
                                u.role === "admin"
                                  ? "rgba(239,68,68,0.2)"
                                  : u.role === "cashier"
                                  ? "rgba(34,197,94,0.2)"
                                  : "rgba(59,130,246,0.2)",
                              color:
                                u.role === "admin"
                                  ? "#fca5a5"
                                  : u.role === "cashier"
                                  ? "#86efac"
                                  : "#93c5fd",
                            }}
                          >
                            {u.role.toUpperCase()}
                          </span>
                        </td>

                        <td style={{ padding: "16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            {u.currentDevice.deviceType?.toLowerCase().includes("mobile") ? (
                              <Smartphone size={16} color="#a78bfa" />
                            ) : (
                              <Monitor size={16} color="#60a5fa" />
                            )}
                            <div>
                              <div style={{ color: theme === "dark" ? "#e2e8f0" : "#1a1f2e" }}>
                                {u.currentDevice.deviceType || "—"}
                              </div>
                              <div style={{ fontSize: "12px", color: theme === "dark" ? "#94a3b8" : "#64748b" }}>
                                {u.currentDevice.deviceOS || "—"}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td style={{ padding: "16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <Calendar size={14} color={theme === "dark" ? "#94a3b8" : "#64748b"} />
                            <span style={{ fontSize: "13px", color: theme === "dark" ? "#e2e8f0" : "#1a1f2e" }}>
                              {formatDate(u.firstLoginAt)}
                            </span>
                          </div>
                        </td>

                        <td style={{ padding: "16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <Clock size={14} color={theme === "dark" ? "#94a3b8" : "#64748b"} />
                            <div>
                              <div style={{ fontSize: "13px", color: theme === "dark" ? "#e2e8f0" : "#1a1f2e" }}>
                                {u.currentDevice.lastLogin ? formatDate(u.currentDevice.lastLogin) : "—"}
                              </div>
                              {u.currentDevice.lastLogin && (
                                <div style={{ fontSize: "12px", color: theme === "dark" ? "#64748b" : "#94a3b8" }}>
                                  {getRelativeTime(u.currentDevice.lastLogin)}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        <td style={{ padding: "16px" }}>
                          {u.blocked ? (
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <div
                                style={{
                                  width: "8px",
                                  height: "8px",
                                  borderRadius: "50%",
                                  background: "#ef4444",
                                }}
                              />
                              <span style={{ color: "#fca5a5", fontSize: "13px" }}>Bloklangan</span>
                            </div>
                          ) : (
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <div
                                style={{
                                  width: "8px",
                                  height: "8px",
                                  borderRadius: "50%",
                                  background: "#22c55e",
                                }}
                              />
                              <span style={{ color: "#86efac", fontSize: "13px" }}>Faol</span>
                            </div>
                          )}
                        </td>

                        <td style={{ padding: "16px", textAlign: "center" }}>
                          {u.login !== currentUserLogin && (
                            <button
                              onClick={() =>
                                u.blocked
                                  ? handleUnblockUser(u._id, u.login)
                                  : handleBlockUser(u._id, u.login)
                              }
                              disabled={actionLoading === u._id}
                              style={{
                                padding: "6px 16px",
                                background: u.blocked ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)",
                                border: u.blocked ? "1px solid rgba(34,197,94,0.3)" : "1px solid rgba(239,68,68,0.3)",
                                borderRadius: "8px",
                                color: u.blocked ? "#86efac" : "#fca5a5",
                                cursor: actionLoading === u._id ? "not-allowed" : "pointer",
                                fontSize: "13px",
                                fontWeight: 600,
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                margin: "0 auto",
                                opacity: actionLoading === u._id ? 0.6 : 1,
                              }}
                            >
                              {actionLoading === u._id ? (
                                "..."
                              ) : u.blocked ? (
                                <>
                                  <Unlock size={14} /> Faollashtirish
                                </>
                              ) : (
                                <>
                                  <Lock size={14} /> Bloklash
                                </>
                              )}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}