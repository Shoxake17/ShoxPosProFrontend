import React, { useEffect, useRef, Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { Toaster, toast } from "sonner";
import { registerSW } from 'virtual:pwa-register';

import Login            from "./pages/Login";
import ProtectedRoute   from "./components/ProtectedRoute";
import NotFound         from "./pages/NotFound";

import { TranslationProvider, useTranslation } from "./components/languages/Settings";
import { HandTrackingProvider } from "./context/HandTrackingContext";
import { CurrencyProvider } from "./context/CurrencyContext";

// Lazy loading components for other pages
const Menu           = lazy(() => import("./pages/Menu"));
const Settings       = lazy(() => import("./pages/Settings"));
const Chatbot        = lazy(() => import("./pages/Ai"));
const Chat           = lazy(() => import("./pages/Chat"));
const MaxQoshish     = lazy(() => import("./pages/MaxQoshish"));
const MaxsulotBazasi = lazy(() => import("./pages/MaxsulotBazasi"));
const Scan           = lazy(() => import("./pages/Hisobotlar"));
const Scanner        = lazy(() => import("./pages/Scanner"));
const Sotilgan       = lazy(() => import("./pages/Sotilgan"));
const Qarzlar        = lazy(() => import("./pages/Qarzlar"));
const KirimBazasi   = lazy(() => import("./pages/KirimBazasi"));
const AdminPanel    = lazy(() => import("./admin/adminPages/AdminMenu"));
const AdminSettings = lazy(() => import("./admin/adminPages/AdminSettings"));
const AdminAddUser  = lazy(() => import("./admin/adminPages/AdminAddUser"));
const ChatAdmin     = lazy(() => import("./admin/adminPages/ChatAdmin"));
// const AdminLayout   = lazy(() => import("./adminComponents/AdminLayout"));

import { getSocket, disconnectSocket }         from "./utils/socket";
import { setupAuthCheck, handleLogout }        from "./utils/authUtils";
import { invalidateAuthCache }                 from "./components/ProtectedRoute";
import { hydrateSessionUserFromCookie, getSessionLogin, clearAuthClientState } from "./utils/clientSession";

import axiosInstance, { setMemoryCsrfToken } from "./api/axiosInstance";

registerSW({ immediate: true });

import { MessageSquare } from "lucide-react";
import { showBrowserNotification, notificationStorage } from "./admin/adminUtils/notificationUtils";

// ─────────────────────────────────────────────────────────────
// GlobalSocketListener — app umri davomida bir marta mount bo'ladi
// ─────────────────────────────────────────────────────────────
function GlobalSocketListener() {
  const navigate    = useNavigate();
  const navigateRef = useRef(navigate);
  const { t } = useTranslation();

  useEffect(() => {
    navigateRef.current = navigate;
    setupAuthCheck(navigate); 
  }, [navigate]);

  useEffect(() => {
    const socket = getSocket();
    
    // 🛡️ Ulanishni tekshirish
    if (!socket.connected) socket.connect();

    // ── Yangi xabarlarni tinglash (Global bildirishnoma va ovoz uchun) ──
    const handleNewMessage = (msg: any) => {
      const currentUserLogin = getSessionLogin();
      
      // Agar xabar boshqa odamdan kelgan bo'lsa
      if (msg.sender !== currentUserLogin) {
        // 1. Ovoz chiqarish va OS notification
        // notificationStorage.isEnabled() ichida showBrowserNotification o'zi playNotificationSound() ni chaqiradi
        if (notificationStorage.isEnabled()) {
          showBrowserNotification(
            t('newChatMessage', { sender: msg.sender }),
            msg.content
          );
        } else {
          // Agar OS notification o'chiq bo'lsa, faqat ovoz chiqsin (agar foydalanuvchi chatda bo'lmasa)
          const isChatPage = window.location.pathname.includes('/chat') || window.location.pathname.includes('/admin-chat');
          if (!isChatPage) {
            import("./admin/adminUtils/notificationUtils").then(m => m.playNotificationSound());
          }
        }

        // 2. Toast bildirishnoma (Ilova ochiq bo'lsa va chatda bo'lmasa ko'rinadi)
        const isChatPage = window.location.pathname.includes('/chat') || window.location.pathname.includes('/admin-chat');
        if (!isChatPage) {
          toast(t('newChatMessage', { sender: msg.sender }), {
            description: msg.content,
            icon: <MessageSquare size={18} />,
            action: {
              label: t('open'),
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
      handleLogout(data?.reason || t('forcedLogout'));
    };

    const handleBlocked = (data: { login?: string; reason?: string }) => {
      const currentLogin = getSessionLogin();
      if (data.login && data.login !== currentLogin) return;

      clearAuthClientState();
      invalidateAuthCache();
      disconnectSocket();

      toast.error(t('accountBlocked'), {
        description: data?.reason || t('blockedByAdmin'),
        duration: 6000,
      });

      setTimeout(() => {
        handleLogout();
        navigateRef.current('/login', { replace: true });
      }, 3000);
    };

    socket.on('privateMessage', handleNewMessage);
    socket.on('forceLogout',    handleForceLogout);
    socket.on('user:blocked',   handleBlocked);

    return () => {
      socket.off('privateMessage', handleNewMessage);
      socket.off('forceLogout',    handleForceLogout);
      socket.off('user:blocked',   handleBlocked);
    };
  }, []);

  return null;
}

// ─────────────────────────────────────────────────────────────
// Asosiy App Komponenti
// ─────────────────────────────────────────────────────────────
function App() {
  return (
    <TranslationProvider>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <CurrencyProvider>
          <HandTrackingProvider>
            <Toaster position="top-center" richColors />
            <GlobalSocketListener />

            <Routes>
                <Route path="/"       element={<Navigate to="/login" replace />} />
                <Route path="/login"  element={<Login />} />

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
                <Route path="/debts"          element={<Suspense fallback={null}><ProtectedRoute allowedRoles={['cashier']}><Qarzlar /></ProtectedRoute></Suspense>} />
                <Route path="/kirim-bazasi"   element={<Suspense fallback={null}><ProtectedRoute allowedRoles={['cashier']}><KirimBazasi /></ProtectedRoute></Suspense>} />

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
    </TranslationProvider>
  );
}

async function bootstrap() {
  try {
    const res = await axiosInstance.get("/csrf-token");
    if (res.data?.csrfToken) {
      setMemoryCsrfToken(res.data.csrfToken);
    }
  } catch (err) {
    console.warn(
      "CSRF token yuklashda xatolik (bu backend rate-limit bilan bog'liq bo'lishi mumkin):",
      err
    );
  }
  await hydrateSessionUserFromCookie();
  ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
}

void bootstrap();