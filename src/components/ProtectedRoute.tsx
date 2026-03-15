import React, { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { ShieldCheck, ShieldAlert, Lock, Loader2, XCircle } from "lucide-react";
import { api } from "../utils/api";

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const [isVerifying, setIsVerifying] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [authError, setAuthError] = useState(false); 
  const [redirecting, setRedirecting] = useState(false); // Yo'naltirish holati

  const location = useLocation();

  useEffect(() => {
    const verifyAuth = async () => {
      try {
        const res = await api("/api/verify-session", { method: "GET" });

        if (res.ok) {
          const data = await res.json();
          if (data?.user) {
            setIsAuthenticated(true);
            setUserRole(data.user.role?.toLowerCase() || null);
            sessionStorage.setItem("currentUser", JSON.stringify(data.user));
            
            // Muvaffaqiyatli bo'lsa tezroq kirish
            setTimeout(() => setIsVerifying(false), 800);
          } else { throw new Error(); }
        } else { throw new Error(); }
      } catch (err) {
        setAuthError(true); 
        sessionStorage.clear();
        setIsAuthenticated(false);
        
        // 1-bosqich: Xatolikni ko'rsatish (3 soniya)
        setTimeout(() => {
          setRedirecting(true); // Yo'naltirish xabarini chiqarish
          
          // 2-bosqich: Yana 2 soniya kutib keyin login-ga o'tkazish
          setTimeout(() => {
            setIsVerifying(false);
          }, 2000);
        }, 3000);
      }
    };

    verifyAuth();
  }, [location.pathname]);

  if (isVerifying) {
    return (
      <div 
        style={{
          height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', backgroundColor: '#020617',
          color: 'white', position: 'fixed', top: 0, left: 0, zIndex: 9999, overflow: 'hidden'
        }}
      >
        {/* Orqa fon nur effekti */}
        <div style={{ 
          position: 'absolute', width: '500px', height: '500px', 
          backgroundColor: authError ? '#ef44440a' : '#10b9810a', 
          borderRadius: '50%', filter: 'blur(100px)', transition: 'background-color 0.5s'
        }}></div>

        <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          
          {/* Markaziy Ikonka */}
          <div style={{ position: 'relative', marginBottom: '2rem', transition: 'all 0.5s' }}>
             <div className={authError ? "animate-ping-slow" : "animate-ping"} style={{ 
               position: 'absolute', inset: -5, backgroundColor: authError ? '#ef4444' : '#10b981', 
               borderRadius: '50%', filter: 'blur(15px)', opacity: 0.1 
             }}></div>
             
             <div style={{ 
               position: 'relative', backgroundColor: '#0f172a', padding: '1.8rem', borderRadius: '1.8rem', 
               border: `2px solid ${authError ? '#ef4444' : '#10b981'}`,
               transform: authError ? 'scale(1.05)' : 'scale(1)',
               transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
             }}>
                {authError ? (
                  <ShieldAlert size={60} color="#ef4444" className="animate-shake" />
                ) : (
                  <ShieldCheck size={60} color="#10b981" className="animate-bounce" />
                )}
             </div>
          </div>

          {/* Sarlavha */}
          <h2 style={{ 
            fontSize: '1.75rem', fontWeight: '800', marginBottom: '0.5rem', 
            color: authError ? '#f87171' : '#34d399', transition: 'color 0.5s'
          }}>
            {authError ? "RUXSAT BERILMADI" : "ShoxPosPro Xavfsizlik"}
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.8rem' }}>
            <span style={{ 
              fontWeight: 500, color: authError ? '#ef4444' : '#94a3b8',
              textAlign: 'center', maxWidth: '280px'
            }}>
              {redirecting 
                ? "Login sahifasiga yo'naltirilmoqda..." 
                : authError 
                  ? "Sessiya tasdiqlanmadi. Qayta kirish talab etiladi." 
                  : "Tizimga kirish tekshirilmoqda..."}
            </span>

            {/* Progress Bar */}
            <div style={{ width: '12rem', height: '4px', backgroundColor: '#1e293b', borderRadius: '99px', overflow: 'hidden' }}>
              <div 
                className="animate-progress-bar" 
                style={{ 
                  height: '100%', backgroundColor: authError ? '#ef4444' : '#10b981', 
                  boxShadow: `0 0 10px ${authError ? '#ef4444' : '#10b981'}` 
                }}
              ></div>
            </div>
          </div>
        </div>

        {/* CSS Animatsiyalar */}
        <style>{`
          @keyframes progress-bar { 0% { width: 0%; } 100% { width: 100%; } }
          .animate-progress-bar { animation: progress-bar ${authError ? '3s' : '1.5s'} linear infinite; }
          .animate-spin { animation: spin 1s linear infinite; }
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          .animate-bounce { animation: bounce 1.2s infinite; }
          @keyframes bounce { 0%, 100% { transform: translateY(-5%); } 50% { transform: translateY(0); } }
          .animate-shake { animation: shake 0.6s cubic-bezier(.36,.07,.19,.97) both; }
          @keyframes shake { 10%, 90% { transform: translate3d(-1px, 0, 0); } 20%, 80% { transform: translate3d(2px, 0, 0); } 30%, 50%, 70% { transform: translate3d(-3px, 0, 0); } 40%, 60% { transform: translate3d(3px, 0, 0); } }
          @keyframes ping { 75%, 100% { transform: scale(1.4); opacity: 0; } }
          .animate-ping { animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite; }
          .animate-ping-slow { animation: ping 2.5s cubic-bezier(0, 0, 0.2, 1) infinite; }
        `}</style>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const isAdminRoute = location.pathname.startsWith("/admin-");
  if (isAdminRoute && userRole !== "admin") {
    return <Navigate to="/menu" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;