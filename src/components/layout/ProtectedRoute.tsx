import React, { ReactNode, useEffect, useState, useCallback } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { ShieldCheck, ShieldAlert } from "lucide-react";
import { api } from "../../utils/api";
// react-i18next kutubxonasiga o'tamiz
import { useTranslation } from 'react-i18next';

// ─────────────────────────────────────────────
// TYPES & CONSTANTS
// ─────────────────────────────────────────────
interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: string[];
}

interface AuthState {
  isVerifying: boolean;
  isAuthenticated: boolean;
  userRole: string | null;
  authError: boolean;
  redirecting: boolean;
}

const VERIFY_SUCCESS_DELAY = 800;
const ERROR_SHOW_DELAY = 2500;
const ERROR_REDIRECT_DELAY = 1500;

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
const clearSessionUserOnly = () => {
  sessionStorage.removeItem("currentUser");
};

export const invalidateAuthCache = () => {
  sessionStorage.removeItem("authCache");
  clearSessionUserOnly();
};

// ─────────────────────────────────────────────
// AUTH HOOK
// ─────────────────────────────────────────────
const useAuth = (pathname: string) => {
  const [state, setState] = useState<AuthState>({
    isVerifying: true,
    isAuthenticated: false,
    userRole: null,
    authError: false,
    redirecting: false,
  });

  const updateState = useCallback(
    (partial: Partial<AuthState>) =>
      setState((prev) => ({ ...prev, ...partial })),
    []
  );

  useEffect(() => {
    let isMounted = true;

    const verifyAuth = async () => {
      const isAdminRoute = pathname.startsWith("/admin-");
      const cached = sessionStorage.getItem("authCache");
      
      if (cached && !isAdminRoute) {
        try {
          const { user, timestamp } = JSON.parse(cached);
          const age = Date.now() - timestamp;
          if (age < 30000 && user?.role) {
            updateState({
              isAuthenticated: true,
              userRole: user.role.toLowerCase(),
              authError: false,
              isVerifying: false
            });
            return;
          }
        } catch (e) {
          sessionStorage.removeItem("authCache");
        }
      }

      if (isAdminRoute) {
        sessionStorage.removeItem("authCache");
      }

      try {
        const res = await api("/api/verify-session", { method: "GET" });
        if (!res.ok) throw new Error("Unauthorized");

        const data = (await res.json()) as {
          user?: { role?: string; login?: string; id?: string };
        };
        if (!data?.user) throw new Error("Invalid Session");

        const role = data.user.role?.toLowerCase() || null;

        if (isMounted) {
          sessionStorage.setItem("currentUser", JSON.stringify(data.user));
          sessionStorage.setItem(
            "authCache",
            JSON.stringify({ user: data.user, timestamp: Date.now() })
          );

          updateState({
            isAuthenticated: true,
            userRole: role,
            authError: false,
          });
          setTimeout(() => {
            if (isMounted) updateState({ isVerifying: false });
          }, VERIFY_SUCCESS_DELAY);
        }
      } catch {
        if (isMounted) {
          invalidateAuthCache();
          updateState({ authError: true, isAuthenticated: false });

          setTimeout(() => {
            if (isMounted) updateState({ redirecting: true });
            setTimeout(() => {
              if (isMounted) updateState({ isVerifying: false });
            }, ERROR_REDIRECT_DELAY);
          }, ERROR_SHOW_DELAY);
        }
      }
    };

    verifyAuth();
    return () => { isMounted = false; };
  }, [pathname, updateState]);

  return state;
};

// 🎨 UI COMPONENTS (GlowBackground, ShieldIcon, ProgressBar o'zgarishsiz qoladi...)
const GlowBackground: React.FC<{ hasError: boolean }> = ({ hasError }) => (
  <div style={{
      position: "absolute", width: "600px", height: "600px",
      backgroundColor: hasError ? "rgba(239, 68, 68, 0.08)" : "rgba(16, 185, 129, 0.08)",
      borderRadius: "50%", filter: "blur(120px)", transition: "background-color 0.8s ease",
    }}
  />
);

const ShieldIcon: React.FC<{ hasError: boolean }> = ({ hasError }) => (
  <div style={{ position: "relative", marginBottom: "2.5rem" }}>
    <div className={hasError ? "animate-ping-slow" : "animate-ping"}
      style={{
        position: "absolute", inset: -8, borderRadius: "2rem", filter: "blur(20px)",
        backgroundColor: hasError ? "#ef4444" : "#10b981", opacity: 0.15,
      }}
    />
    <div style={{
        position: "relative", backgroundColor: "#0f172a", padding: "2rem",
        borderRadius: "2rem", border: `2px solid ${hasError ? "#ef4444" : "#10b981"}`,
        boxShadow: `0 0 30px ${hasError ? "rgba(239, 68, 68, 0.2)" : "rgba(16, 185, 129, 0.2)"}`,
      }}
    >
      {hasError ? <ShieldAlert size={64} color="#ef4444" className="animate-shake" /> 
                : <ShieldCheck size={64} color="#10b981" className="animate-bounce" />}
    </div>
  </div>
);

const ProgressBar: React.FC<{ hasError: boolean }> = ({ hasError }) => (
  <div style={{
      width: "14rem", height: "5px", backgroundColor: "#1e293b",
      borderRadius: "99px", overflow: "hidden", marginTop: "1.5rem",
    }}
  >
    <div className="animate-progress-bar" style={{
        height: "100%", backgroundColor: hasError ? "#ef4444" : "#10b981",
        boxShadow: `0 0 15px ${hasError ? "#ef4444" : "#10b981"}`,
      }}
    />
  </div>
);

const LoadingScreen: React.FC<{ authError: boolean; redirecting: boolean; }> = ({ authError, redirecting }) => {
  // Yangi tarjima hooki
  const { t } = useTranslation('common');

  return (
    <div style={{
        height: "100vh", width: "100vw", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", backgroundColor: "#020617",
        color: "white", position: "fixed", top: 0, left: 0, zIndex: 9999, overflow: "hidden",
      }}
    >
      <GlowBackground hasError={authError} />

      <div style={{ position: "relative", zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <ShieldIcon hasError={authError} />

        <h2 style={{
            fontSize: "2rem", fontWeight: 800, marginBottom: "0.75rem",
            color: authError ? "#f87171" : "#34d399", letterSpacing: "-0.025em",
          }}
        >
          {authError ? t('accessDenied') : t('securityTitle')}
        </h2>

        <span style={{
            fontWeight: 500, fontSize: "1rem", color: authError ? "#ef4444" : "#94a3b8",
            textAlign: "center", maxWidth: "320px", lineHeight: 1.5,
          }}
        >
          {redirecting ? t('redirecting') : authError ? t('sessionInvalid') : t('checkingAuth')}
        </span>

        <ProgressBar hasError={authError} />
      </div>

      <style>{`
        @keyframes progress-bar { 0% { width: 0%; } 100% { width: 100%; } }
        .animate-progress-bar  { animation: progress-bar ${authError ? "3s" : "1.8s"} cubic-bezier(0.65, 0, 0.35, 1) infinite; }
        @keyframes bounce       { 0%,100% { transform: translateY(-8%); } 50% { transform: translateY(0); } }
        .animate-bounce        { animation: bounce 1.5s ease-in-out infinite; }
        @keyframes shake       { 10%,90% { transform: translate3d(-1px,0,0); } 20%,80% { transform: translate3d(2px,0,0); } 30%,50%,70% { transform: translate3d(-3px,0,0); } 40%,60% { transform: translate3d(3px,0,0); } }
        .animate-shake         { animation: shake 0.7s cubic-bezier(.36,.07,.19,.97) both; }
        @keyframes ping        { 75%,100% { transform: scale(1.5); opacity: 0; } }
        .animate-ping          { animation: ping 2s cubic-bezier(0,0,0.2,1) infinite; }
        .animate-ping-slow     { animation: ping 3s cubic-bezier(0,0,0.2,1) infinite; }
      `}</style>
    </div>
  );
};

// ✅ MAIN COMPONENT
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const location = useLocation();
  const { isVerifying, isAuthenticated, userRole, authError, redirecting } = useAuth(location.pathname);

  if (isVerifying) {
    return <LoadingScreen authError={authError} redirecting={redirecting} />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && (!userRole || !allowedRoles.includes(userRole))) {
    if (userRole === "admin") return <Navigate to="/admin-panel" replace />;
    return <Navigate to="/menu" replace />;
  }

  if (location.pathname.startsWith("/admin-") && userRole !== "admin") {
    return <Navigate to="/menu" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;