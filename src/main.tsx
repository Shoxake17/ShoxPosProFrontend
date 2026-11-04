import React, { useEffect, useRef, Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { Toaster, toast } from "sonner";
import { registerSW } from 'virtual:pwa-register';

// ✅ i18next konfiguratsiyasini import qilamiz (bu juda muhim!)
import './i18n'; 

import Login            from "./pages/Login";
import AuthComplete     from "./pages/AuthComplete";
import ProtectedRoute   from "./components/layout/ProtectedRoute";
import NotFound         from "./pages/NotFound";

import { HandTrackingProvider } from "./context/HandTrackingContext";
import { CurrencyProvider } from "./context/CurrencyContext";
import { subscribeToPushNotifications } from './utils/pushNotification';

// ✅ react-i18next dan hook import qilamiz
import { useTranslation } from 'react-i18next';

// Lazy loading components
const Menu           = lazy(() => import("./pages/Menu"));
const Settings       = lazy(() => import("./pages/Settings"));
const Chatbot        = lazy(() => import("./pages/Ai"));
const Chat           = lazy(() => import("./pages/Chat"));
const MaxQoshish     = lazy(() => import("./pages/MaxQoshish"));
const Orders     = lazy(() => import("./pages/Orders"));
const Logistics  = lazy(() => import("./pages/Logistics"));
const MaxsulotBazasi = lazy(() => import("./pages/MaxsulotBazasi"));
const Scan           = lazy(() => import("./pages/Hisobotlar"));
const Scanner        = lazy(() => import("./pages/Scanner"));
const Sotilgan       = lazy(() => import("./pages/Sotilgan"));
const Qarzlar        = lazy(() => import("./pages/Qarzlar"));
const KirimBazasi    = lazy(() => import("./pages/KirimBazasi"));
const AdminPanel     = lazy(() => import("./admin/adminPages/AdminMenu"));
const AdminSettings  = lazy(() => import("./admin/adminPages/AdminSettings"));
const AdminAddUser   = lazy(() => import("./admin/adminPages/AdminAddUser"));
const ChatAdmin      = lazy(() => import("./admin/adminPages/ChatAdmin"));
const SubscriptionPlans = lazy(() => import("./pages/SubscriptionPlans"));
const PharmAdd = lazy(() => import("./pages/PharmAdd"));
const PharmBase = lazy(() => import("./pages/PharmBase"));
const PharmScanner = lazy(() => import("./pages/PharmScanner"));
const PharmSale = lazy(() => import("./pages/PharmSale"));
const PharmInformation = lazy(() => import("./pages/PharmInformation"));
const PharmMenu = lazy(() => import("./pages/PharmMenu"));
const PharmKirimBase = lazy(() => import("./pages/PharmKirimBase"));
const PharmHisobotlar = lazy(() => import("./pages/PharmHisobotlar"));
const PharmQarzlar = lazy(() => import("./pages/PharmQarzlar"));
const PharmAi = lazy(() => import("./pages/PharmAi"));
const PharmChat = lazy(() => import("./pages/PharmChat"));

import { getSocket, disconnectSocket }         from "./utils/socket";
import { setupAuthCheck, handleLogout }        from "./utils/authUtils";
import { invalidateAuthCache }                 from "./components/layout/ProtectedRoute";
import { hydrateSessionUserFromCookie, getSessionLogin, clearAuthClientState } from "./utils/clientSession";
import axiosInstance, { setMemoryCsrfToken } from "./api/axiosInstance";
import { installCategoryGuard } from "./utils/categoryGuard";
import { useAuthStore } from "./store/useAuthStore";

// Do'kon turi ruxsat bermagan bo'limga so'rov ketsa (eski ochiq tab) — o'zi tuzatiladi.
installCategoryGuard();

const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    updateSW(true);
  },
  onRegisteredSW(_, r) {
    if (r) {
      setInterval(() => r.update(), 30 * 60 * 1000);
    }
  }
});

import { MessageSquare } from "lucide-react";
import { showBrowserNotification, notificationStorage } from "./admin/adminUtils/notificationUtils";

// ─────────────────────────────────────────────────────────────
// GlobalSocketListener
// ─────────────────────────────────────────────────────────────
function GlobalSocketListener() {
  const navigate    = useNavigate();
  const navigateRef = useRef(navigate);
  const { user, setUser } = useAuthStore();
  
  // ✅ Standart useTranslation ishlatamiz
  const { t } = useTranslation(['common', 'settings']);

  useEffect(() => {
    navigateRef.current = navigate;
    setupAuthCheck(navigate); 
  }, [navigate]);

  useEffect(() => {
    const socket = getSocket();
    const login = getSessionLogin();
    
    if (login) {
      subscribeToPushNotifications();
    }     
    
    if (!socket.connected) socket.connect();

    const handleNewMessage = (msg: any) => {
      const currentUserLogin = getSessionLogin();
      
      if (msg.sender !== currentUserLogin) {
        if (notificationStorage.isEnabled()) {
          showBrowserNotification(
            t('settings:newChatMessage', { sender: msg.sender }),
            msg.content
          );
        } else {
          const isChatPage = window.location.pathname.includes('/chat') || window.location.pathname.includes('/admin-chat');
          if (!isChatPage) {
            import("./admin/adminUtils/notificationUtils").then(m => m.playNotificationSound());
          }
        }

        const isChatPage = window.location.pathname.includes('/chat') || window.location.pathname.includes('/admin-chat');
        if (!isChatPage) {
          toast(t('settings:newChatMessage', { sender: msg.sender }), {
            description: msg.content,
            icon: <MessageSquare size={18} />,
            action: {
              label: t('settings:open'),
              onClick: () => navigateRef.current(msg.sender === 'admin' ? '/admin-chat' : '/chat')
            }
          });
        }
      }
    };

    const handleForceLogout = (data: { reason?: string }) => {
      clearAuthClientState();
      invalidateAuthCache();
      disconnectSocket();
      handleLogout(data?.reason || t('settings:forcedLogout'));
    };

    const handleBlocked = (data: { login?: string; reason?: string }) => {
      const currentLogin = getSessionLogin();
      if (data.login && data.login !== currentLogin) return;

      clearAuthClientState();
      invalidateAuthCache();
      disconnectSocket();

      toast.error(t('settings:accountBlocked'), {
        description: data?.reason || t('settings:blockedByAdmin'),
        duration: 6000,
      });

      setTimeout(() => {
        handleLogout();
        navigateRef.current('/login', { replace: true });
      }, 3000);
    };

    const handleSubscriptionChanged = (data: { subscription: any }) => {
      const currentUserStr = sessionStorage.getItem('currentUser');
      if (currentUserStr) {
        const currentUser = JSON.parse(currentUserStr);
        const updatedUser = { ...currentUser, subscription: data.subscription };
        
        // Zustand store'ni yangilash
        setUser(updatedUser);
        
        // SessionStorage'ni yangilash
        sessionStorage.setItem('currentUser', JSON.stringify(updatedUser));
        sessionStorage.setItem('authCache', JSON.stringify({ 
          user: updatedUser, 
          timestamp: Date.now() 
        }));
        
      }
    };

    socket.on('privateMessage', handleNewMessage);
    socket.on('forceLogout',    handleForceLogout);
    socket.on('user:blocked',   handleBlocked);
    socket.on('subscriptionChanged', handleSubscriptionChanged);

    return () => {
      socket.off('privateMessage', handleNewMessage);
      socket.off('forceLogout',    handleForceLogout);
      socket.off('user:blocked',   handleBlocked);
      socket.off('subscriptionChanged', handleSubscriptionChanged);
    };
  }, [t]);

  return null;
}

// ─────────────────────────────────────────────────────────────
// Asosiy App Komponenti
// ─────────────────────────────────────────────────────────────
function App() {
  return (
    <BrowserRouter>
      <CurrencyProvider>
        <HandTrackingProvider>
          <Toaster position="top-center" richColors />
          <GlobalSocketListener />

          <Routes>
              <Route path="/"       element={<Navigate to="/login" replace />} />
              <Route path="/login"  element={<Login />} />
              <Route path="/auth/complete" element={<AuthComplete />} />

              {/* 🛒 Cashier Routes */}
              <Route path="/menu"           element={<Suspense fallback={null}><ProtectedRoute allowedRoles={['cashier']}><Menu /></ProtectedRoute></Suspense>} />
              <Route path="/settings"       element={<Suspense fallback={null}><ProtectedRoute allowedRoles={['cashier']}><Settings /></ProtectedRoute></Suspense>} />
              <Route path="/ai"             element={<Suspense fallback={null}><ProtectedRoute allowedRoles={['cashier']}><Chatbot /></ProtectedRoute></Suspense>} />
              <Route path="/chat"           element={<Suspense fallback={null}><ProtectedRoute allowedRoles={['cashier']}><Chat /></ProtectedRoute></Suspense>} />
              <Route path="/add-product"    element={<Suspense fallback={null}><ProtectedRoute allowedRoles={['cashier']}><MaxQoshish /></ProtectedRoute></Suspense>} />
              <Route path="/products"       element={<Suspense fallback={null}><ProtectedRoute allowedRoles={['cashier']}><MaxsulotBazasi /></ProtectedRoute></Suspense>} />
              <Route path="/reports"        element={<Suspense fallback={null}><ProtectedRoute allowedRoles={['cashier']}><Scan /></ProtectedRoute></Suspense>} />
              <Route path="/scanner"        element={<Suspense fallback={null}><ProtectedRoute allowedRoles={['cashier']}><Scanner /></ProtectedRoute></Suspense>} />
              <Route path="/sales"          element={<Suspense fallback={null}><ProtectedRoute allowedRoles={['cashier']}><Sotilgan /></ProtectedRoute></Suspense>} />
              <Route path="/orders"  element={<Suspense fallback={null}><ProtectedRoute allowedRoles={['cashier']}><Orders /></ProtectedRoute></Suspense>} />
              <Route path="/logistics"  element={<Suspense fallback={null}><ProtectedRoute allowedRoles={['cashier']}><Logistics /></ProtectedRoute></Suspense>} />
              {/* Eski manzillar (saqlangan bildirishnoma/PWA): yangi manzilga */}
              <Route path="/qurt-orders" element={<Navigate to="/orders" replace />} />
              <Route path="/qurt-logistics" element={<Navigate to="/logistics" replace />} />
          <Route path="/debts"          element={<Suspense fallback={null}><ProtectedRoute allowedRoles={['cashier']}><Qarzlar /></ProtectedRoute></Suspense>} />
              <Route path="/kirim-bazasi"   element={<Suspense fallback={null}><ProtectedRoute allowedRoles={['cashier']}><KirimBazasi /></ProtectedRoute></Suspense>} />
              <Route path="/subscription"     element={<Suspense fallback={null}><ProtectedRoute allowedRoles={['cashier']}><SubscriptionPlans /></ProtectedRoute></Suspense>} />
              
              {/* 💊 Pharmacy Routes */}
              <Route path="/pharm-menu"        element={<Suspense fallback={null}><ProtectedRoute allowedRoles={['cashier']}><PharmMenu /></ProtectedRoute></Suspense>} />
              <Route path="/pharm-add"        element={<Suspense fallback={null}><ProtectedRoute allowedRoles={['cashier']}><PharmAdd /></ProtectedRoute></Suspense>} />
              <Route path="/pharm-base"       element={<Suspense fallback={null}><ProtectedRoute allowedRoles={['cashier']}><PharmBase /></ProtectedRoute></Suspense>} />
              <Route path="/pharm-scanner"   element={<Suspense fallback={null}><ProtectedRoute allowedRoles={['cashier']}><PharmScanner /></ProtectedRoute></Suspense>} />
              <Route path="/pharm-sale"       element={<Suspense fallback={null}><ProtectedRoute allowedRoles={['cashier']}><PharmSale /></ProtectedRoute></Suspense>} />
              <Route path="/pharm-info"       element={<Suspense fallback={null}><ProtectedRoute allowedRoles={['cashier']}><PharmInformation /></ProtectedRoute></Suspense>} />
              <Route path="/pharm-kirim-base"  element={<Suspense fallback={null}><ProtectedRoute allowedRoles={['cashier']}><PharmKirimBase /></ProtectedRoute></Suspense>} />
              <Route path="/pharm-hisobotlar"  element={<Suspense fallback={null}><ProtectedRoute allowedRoles={['cashier']}><PharmHisobotlar /></ProtectedRoute></Suspense>} />
              <Route path="/pharm-qarzlar"  element={<Suspense fallback={null}><ProtectedRoute allowedRoles={['cashier']}><PharmQarzlar /></ProtectedRoute></Suspense>} />
              <Route path="/pharm-ai"  element={<Suspense fallback={null}><ProtectedRoute allowedRoles={['cashier']}><PharmAi /></ProtectedRoute></Suspense>} />
              <Route path="/pharm-chat"  element={<Suspense fallback={null}><ProtectedRoute allowedRoles={['cashier']}><PharmChat /></ProtectedRoute></Suspense>} />

              {/* 👑 Admin Routes */}
              <Route path="/admin-panel"    element={<Suspense fallback={null}><ProtectedRoute allowedRoles={['admin']}><AdminPanel /></ProtectedRoute></Suspense>} />
              <Route path="/admin-chat"     element={<Suspense fallback={null}><ProtectedRoute allowedRoles={['admin']}><ChatAdmin /></ProtectedRoute></Suspense>} />
              <Route path="/admin-settings" element={<Suspense fallback={null}><ProtectedRoute allowedRoles={['admin']}><AdminSettings /></ProtectedRoute></Suspense>} />
              <Route path="/admin-add-user" element={<Suspense fallback={null}><ProtectedRoute allowedRoles={['admin']}><AdminAddUser /></ProtectedRoute></Suspense>} />

              <Route path="*" element={<NotFound />} />
            </Routes>
        </HandTrackingProvider>
      </CurrencyProvider>
    </BrowserRouter>
  );
}

async function bootstrap() {
  try {
    const res = await axiosInstance.get("/csrf-token");
    if (res.data?.csrfToken) {
      setMemoryCsrfToken(res.data.csrfToken);
    }
  } catch (err) {
    console.warn("CSRF token xatosi:", err);
  }
  await hydrateSessionUserFromCookie();
  ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
}

void bootstrap();