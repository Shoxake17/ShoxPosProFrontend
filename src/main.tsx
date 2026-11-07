import React, { useEffect, useRef, Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { Toaster, toast } from "sonner";
import { registerSW } from 'virtual:pwa-register';

// ✅ i18next konfiguratsiyasini import qilamiz (bu juda muhim!)
import './i18n'; 

import Login            from "./pages/Login";
import ProtectedRoute   from "./components/layout/ProtectedRoute";
import NotFound         from "./pages/NotFound";

import { CurrencyProvider } from "./context/CurrencyContext";
import { subscribeToPushNotifications } from './utils/pushNotification';

// ✅ react-i18next dan hook import qilamiz
import { useTranslation } from 'react-i18next';

// Lazy loading components
const Menu           = lazy(() => import("./pages/Menu"));
const Settings       = lazy(() => import("./pages/Settings"));
const MaxQoshish     = lazy(() => import("./pages/MaxQoshish"));
const Orders     = lazy(() => import("./pages/Orders"));
const Logistics  = lazy(() => import("./pages/Logistics"));
const MaxsulotBazasi = lazy(() => import("./pages/MaxsulotBazasi"));
const Scan           = lazy(() => import("./pages/Hisobotlar"));
const Scanner        = lazy(() => import("./pages/Scanner"));
const Sotilgan       = lazy(() => import("./pages/Sotilgan"));
const Qarzlar        = lazy(() => import("./pages/Qarzlar"));
const KirimBazasi    = lazy(() => import("./pages/KirimBazasi"));
const PharmAdd = lazy(() => import("./pages/PharmAdd"));
const PharmBase = lazy(() => import("./pages/PharmBase"));
const PharmScanner = lazy(() => import("./pages/PharmScanner"));
const PharmSale = lazy(() => import("./pages/PharmSale"));
const PharmInformation = lazy(() => import("./pages/PharmInformation"));
const PharmMenu = lazy(() => import("./pages/PharmMenu"));
const PharmKirimBase = lazy(() => import("./pages/PharmKirimBase"));
const PharmHisobotlar = lazy(() => import("./pages/PharmHisobotlar"));
const PharmQarzlar = lazy(() => import("./pages/PharmQarzlar"));

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

// ─────────────────────────────────────────────────────────────
// GlobalSocketListener
// ─────────────────────────────────────────────────────────────
function GlobalSocketListener() {
  const navigate    = useNavigate();
  const navigateRef = useRef(navigate);

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

    socket.on('forceLogout',    handleForceLogout);
    socket.on('user:blocked',   handleBlocked);

    return () => {
      socket.off('forceLogout',    handleForceLogout);
      socket.off('user:blocked',   handleBlocked);
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
          <Toaster position="top-center" richColors />
          <GlobalSocketListener />

          <Routes>
              <Route path="/"       element={<Navigate to="/login" replace />} />
              <Route path="/login"  element={<Login />} />

              {/* 🛒 Do'kon moduli (OnDex Merchant web) */}
              <Route path="/menu"           element={<Suspense fallback={null}><ProtectedRoute allowedRoles={['cashier']}><Menu /></ProtectedRoute></Suspense>} />
              <Route path="/settings"       element={<Suspense fallback={null}><ProtectedRoute allowedRoles={['cashier']}><Settings /></ProtectedRoute></Suspense>} />
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

              {/* AI, chat, obuna, admin — OnDex markaziy servislarida (ADR-000/002) */}
              <Route path="*" element={<NotFound />} />
            </Routes>
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