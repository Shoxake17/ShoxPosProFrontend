// src/components/ProtectedRoute.tsx
import React, { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { ShieldCheck, ShieldAlert } from "lucide-react";
import { api } from "../utils/api";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface ProtectedRouteProps {
  children: ReactNode;
}

interface AuthState {
  isVerifying:     boolean;
  isAuthenticated: boolean;
  userRole:        string | null;
  authError:       boolean;
  redirecting:     boolean;
}

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
const VERIFY_SUCCESS_DELAY = 800;   // ms — muvaffaqiyatda kirish animatsiyasi
const ERROR_SHOW_DELAY     = 3000;  // ms — xatolikni ko'rsatish vaqti
const ERROR_REDIRECT_DELAY = 2000;  // ms — yo'naltirish oldidan kutish

// ─────────────────────────────────────────────
// Custom hook: autentifikatsiya tekshiruvi
// ─────────────────────────────────────────────
const useAuth = (pathname: string) => {
  const [state, setState] = useState<AuthState>({
    isVerifying:     true,
    isAuthenticated: false,
    userRole:        null,
    authError:       false,
    redirecting:     false,
  });

  const set = (partial: Partial<AuthState>) =>
    setState((prev) => ({ ...prev, ...partial }));

  useEffect(() => {
    const verifyAuth = async () => {
      try {
        const res = await api("/api/verify-session", { method: "GET" });
        if (!res.ok) throw new Error("Not OK");

        const data = await res.json();
        if (!data?.user) throw new Error("No user");

        set({ isAuthenticated: true, userRole: data.user.role?.toLowerCase() || null });
        sessionStorage.setItem("currentUser", JSON.stringify(data.user));
        setTimeout(() => set({ isVerifying: false }), VERIFY_SUCCESS_DELAY);

      } catch {
        sessionStorage.clear();
        set({ authError: true, isAuthenticated: false });

        // 1-bosqich: xatolikni ko'rsatish
        setTimeout(() => {
          set({ redirecting: true });
          // 2-bosqich: login sahifasiga o'tkazish
          setTimeout(() => set({ isVerifying: false }), ERROR_REDIRECT_DELAY);
        }, ERROR_SHOW_DELAY);
      }
    };

    verifyAuth();
  }, [pathname]);

  return state;
};

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

/** Orqa fon nur effekti */
const GlowBackground: React.FC<{ hasError: boolean }> = ({ hasError }) => (
  <div style={{
    position: "absolute", width: "500px", height: "500px",
    backgroundColor: hasError ? "#ef44440a" : "#10b9810a",
    borderRadius: "50%", filter: "blur(100px)",
    transition: "background-color 0.5s",
  }} />
);

/** Markaziy qalqon ikonkasi */
const ShieldIcon: React.FC<{ hasError: boolean }> = ({ hasError }) => (
  <div style={{ position: "relative", marginBottom: "2rem", transition: "all 0.5s" }}>
    <div
      className={hasError ? "animate-ping-slow" : "animate-ping"}
      style={{
        position: "absolute", inset: -5,
        backgroundColor: hasError ? "#ef4444" : "#10b981",
        borderRadius: "50%", filter: "blur(15px)", opacity: 0.1,
      }}
    />
    <div style={{
      position: "relative", backgroundColor: "#0f172a",
      padding: "1.8rem", borderRadius: "1.8rem",
      border: `2px solid ${hasError ? "#ef4444" : "#10b981"}`,
      transform: hasError ? "scale(1.05)" : "scale(1)",
      transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
    }}>
      {hasError
        ? <ShieldAlert  size={60} color="#ef4444" className="animate-shake"  />
        : <ShieldCheck  size={60} color="#10b981" className="animate-bounce" />
      }
    </div>
  </div>
);

/** Progress bar */
const ProgressBar: React.FC<{ hasError: boolean }> = ({ hasError }) => (
  <div style={{
    width: "12rem", height: "4px",
    backgroundColor: "#1e293b", borderRadius: "99px", overflow: "hidden",
  }}>
    <div
      className="animate-progress-bar"
      style={{
        height: "100%",
        backgroundColor: hasError ? "#ef4444" : "#10b981",
        boxShadow: `0 0 10px ${hasError ? "#ef4444" : "#10b981"}`,
      }}
    />
  </div>
);

/** Yuklash ekrani */
const LoadingScreen: React.FC<{
  authError:   boolean;
  redirecting: boolean;
}> = ({ authError, redirecting }) => {
  const statusText = redirecting
    ? "Login sahifasiga yo'naltirilmoqda..."
    : authError
      ? "Sessiya tasdiqlanmadi. Qayta kirish talab etiladi."
      : "Tizimga kirish tekshirilmoqda...";

  return (
    <div style={{
      height: "100vh", width: "100vw",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      backgroundColor: "#020617", color: "white",
      position: "fixed", top: 0, left: 0, zIndex: 9999, overflow: "hidden",
    }}>
      <GlowBackground hasError={authError} />

      <div style={{
        position: "relative", zIndex: 10,
        display: "flex", flexDirection: "column", alignItems: "center",
      }}>
        <ShieldIcon hasError={authError} />

        <h2 style={{
          fontSize: "1.75rem", fontWeight: 800, marginBottom: "0.5rem",
          color: authError ? "#f87171" : "#34d399",
          transition: "color 0.5s",
        }}>
          {authError ? "RUXSAT BERILMADI" : "ShoxPosPro Xavfsizlik"}
        </h2>

        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", gap: "0.8rem",
        }}>
          <span style={{
            fontWeight: 500,
            color: authError ? "#ef4444" : "#94a3b8",
            textAlign: "center", maxWidth: "280px",
          }}>
            {statusText}
          </span>
          <ProgressBar hasError={authError} />
        </div>
      </div>

      <style>{`
        @keyframes progress-bar { 0% { width: 0%; } 100% { width: 100%; } }
        .animate-progress-bar { animation: progress-bar ${authError ? "3s" : "1.5s"} linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes bounce { 0%,100% { transform: translateY(-5%); } 50% { transform: translateY(0); } }
        .animate-bounce { animation: bounce 1.2s infinite; }
        @keyframes shake { 10%,90% { transform: translate3d(-1px,0,0); } 20%,80% { transform: translate3d(2px,0,0); } 30%,50%,70% { transform: translate3d(-3px,0,0); } 40%,60% { transform: translate3d(3px,0,0); } }
        .animate-shake { animation: shake 0.6s cubic-bezier(.36,.07,.19,.97) both; }
        @keyframes ping { 75%,100% { transform: scale(1.4); opacity: 0; } }
        .animate-ping      { animation: ping 1.5s cubic-bezier(0,0,0.2,1) infinite; }
        .animate-ping-slow { animation: ping 2.5s cubic-bezier(0,0,0.2,1) infinite; }
      `}</style>
    </div>
  );
};

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const location = useLocation();
  const { isVerifying, isAuthenticated, userRole, authError, redirecting } =
    useAuth(location.pathname);

  // Tekshirish davom etmoqda
  if (isVerifying) {
    return <LoadingScreen authError={authError} redirecting={redirecting} />;
  }

  // Autentifikatsiya muvaffaqiyatsiz
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Admin yo'llari uchun rol tekshiruvi
  if (location.pathname.startsWith("/admin-") && userRole !== "admin") {
    return <Navigate to="/menu" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;