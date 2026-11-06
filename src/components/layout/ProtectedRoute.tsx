import React, { ReactNode, useEffect, useState, useCallback } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { ShieldCheck, ShieldAlert, Lock } from "lucide-react";
import { api } from "../../utils/api";
import { useAuthStore, PLAN_PERMISSIONS } from "../../store/useAuthStore";
import { isOrderPage, isPageAllowed, landingPath } from "../../utils/storeAccess";
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
  userPlan: 'free' | 'basic' | 'pro' | null;
  storeCategory: string;
  authError: boolean;
  redirecting: boolean;
  subscriptionError: boolean;
}

const VERIFY_SUCCESS_DELAY = 800;
const ERROR_SHOW_DELAY = 2500;
const ERROR_REDIRECT_DELAY = 1500;

// Sahifa ID larini rejalarga moslash
const PAGE_ID_MAP: Record<string, string> = {
  'menu': 'menu',
  'add-product': 'add-product',
  'products': 'products',
  'scanner': 'scanner',
  'sales': 'sales',
  'reports': 'reports',
  'kirim-bazasi': 'kirim-bazasi',
  'debts': 'debts',
  'ai': 'ai',
  'chat': 'chat',
  'settings': 'settings'
};

const hasPageAccess = (plan: 'free' | 'basic' | 'pro', pageId: string) => {
  const permissions = PLAN_PERMISSIONS[plan] || PLAN_PERMISSIONS.free;
  if (permissions.pages.includes('all')) return true;
  
  const mappedPageId = PAGE_ID_MAP[pageId] || pageId;
  return permissions.pages.includes(mappedPageId);
};

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
    userPlan: null,
    storeCategory: '',
    authError: false,
    redirecting: false,
    subscriptionError: false,
  });

  const { setUser } = useAuthStore();

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
            setUser(user);
            updateState({
              isAuthenticated: true,
              userRole: user.role.toLowerCase(),
              userPlan: user.subscription?.plan || 'free',
              storeCategory: user.storeCategory || '',
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
        const res = await api("/api/me", { method: "GET" });
        if (!res.ok) throw new Error("Unauthorized");

        const data = (await res.json()) as {
          success: boolean;
          user?: { 
            id?: string;
            login?: string; 
            role?: string; 
            name?: string;
            shopName?: string;
            shopType?: string;
            storeCategory?: string;
            shopCategories?: string[];
            subscription?: { plan: 'free' | 'basic' | 'pro'; isTrial: boolean; trialEndDate?: string; startDate?: string };
          };
        };
        if (!data?.success || !data?.user) throw new Error("Invalid Session");

        // Create complete user object with all required fields
        const completeUser = {
          id: data.user.id || '',
          login: data.user.login || '',
          role: data.user.role || 'cashier',
          name: data.user.name,
          shopName: data.user.shopName,
          shopType: data.user.shopType,
          storeCategory: data.user.storeCategory || '',
          shopCategories: data.user.shopCategories,
          subscription: data.user.subscription || { plan: 'free', isTrial: false }
        };

        const role = completeUser.role.toLowerCase() || null;
        const plan = completeUser.subscription?.plan || 'free';

        if (isMounted) {
          setUser(completeUser);
          sessionStorage.setItem("currentUser", JSON.stringify(completeUser));
          sessionStorage.setItem(
            "authCache",
            JSON.stringify({ user: completeUser, timestamp: Date.now() })
          );

          updateState({
            isAuthenticated: true,
            userRole: role,
            userPlan: plan,
            storeCategory: completeUser.storeCategory,
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
  }, [updateState, setUser]);

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

const SubscriptionBlockedScreen: React.FC = () => {
  const { t } = useTranslation('common');
  
  return (
    <div style={{
      height: "100vh", width: "100vw", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", backgroundColor: "#020617",
      color: "white", position: "fixed", top: 0, left: 0, zIndex: 9999,
    }}>
      <Lock size={64} color="#f59e0b" style={{ marginBottom: '1.5rem' }} />
      <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem", color: "#fbbf24" }}>
        Obuna Rejasini Yangilang
      </h2>
      <p style={{ fontSize: "1rem", color: "#94a3b8", textAlign: "center", maxWidth: "400px" }}>
        Bu saxifaga kirish uchun obuna rejangizni yangilashingiz kerak.
      </p>
    </div>
  );
};

// ✅ MAIN COMPONENT
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const location = useLocation();
  const { isVerifying, isAuthenticated, userRole, userPlan, storeCategory, authError, redirecting } = useAuth(location.pathname);

  if (isVerifying) {
    return <LoadingScreen authError={authError} redirecting={redirecting} />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && (!userRole || !allowedRoles.includes(userRole))) {
    return <Navigate to={landingPath(userRole, storeCategory)} replace />;
  }

  if (location.pathname.startsWith("/admin-") && userRole !== "admin") {
    return <Navigate to={landingPath(userRole, storeCategory)} replace />;
  }

  // Do'kon kategoriyasi (qurt va h.k.): ruxsat etilmagan sahifaga kirib bo'lmaydi
  // (URL'ni qo'lda yozsa ham). Backend ham shu ro'yxatni API darajasida majburlaydi.
  const accessPageId = location.pathname.split('/')[1] || "menu";
  if (userRole !== 'admin' && !isPageAllowed(storeCategory, accessPageId)) {
    return <Navigate to={landingPath(userRole, storeCategory)} replace />;
  }

  // Obuna rejasi tekshiruvi - ADMIN UCHUN CHEKLOV YO'Q!
  const pageId = location.pathname.split('/')[1] || "menu";
  // Buyurtmalar/Logistika: kirish yuqorida kategoriya bo'yicha tekshirildi — reja bo'yicha to'silmaydi.
  if (userRole !== 'admin' && userPlan && !isOrderPage(pageId) && !hasPageAccess(userPlan, pageId)) {
    return <SubscriptionBlockedScreen />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;