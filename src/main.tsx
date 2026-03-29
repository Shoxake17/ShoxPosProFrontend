import React, { useEffect, useRef } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { Toaster, toast } from "sonner";
import { registerSW } from 'virtual:pwa-register';

import Menu            from "./pages/Menu";
import Settings        from "./pages/Settings";
import Chatbot         from "./pages/Ai";
import Chat            from "./pages/Chat";
import MaxQoshish      from "./pages/MaxQoshish";
import MaxsulotBazasi  from "./pages/MaxsulotBazasi";
import Scan            from "./pages/Hisobotlar";
import Scanner         from "./pages/Scanner";
import Sotilgan        from "./pages/Sotilgan";
import Qarzlar         from "./pages/Qarzlar";
import Login           from "./pages/Login";
import KirimBazasi     from './pages/KirimBazasi';
import ProtectedRoute  from "./components/ProtectedRoute";
import AdminPanel      from "./adminPages/AdminMenu";
import AdminSettings   from "./adminPages/AdminSettings";
import NotFound        from "./pages/NotFound";

import { getSocket, disconnectSocket }         from "./utils/socket";
import { setupAuthCheck, handleLogout }        from "./utils/authUtils";
// ✅ stopAuthCheck import qilinmadi — socket handlerlardan chaqirish xato edi
import { invalidateAuthCache }                 from "./components/ProtectedRoute";
import { HandTrackingProvider }                from "./context/HandTrackingContext";
import { TranslationProvider }                 from "./pages/Settings";

registerSW({ immediate: true });

// ✅ CSRF token — app ochilganda bir marta
// ✅ Shunday bo'lishi kerak
fetch('/api/csrf-token', { method: 'GET', credentials: 'include' }).catch(() => {});

// ─────────────────────────────────────────────────────────────
// GlobalSocketListener — app umri davomida bir marta mount bo'ladi
// ─────────────────────────────────────────────────────────────
function GlobalSocketListener() {
  const navigate    = useNavigate();
  const navigateRef = useRef(navigate);

  // ✅ FIX 1 & 3: navigate o'zgarganda IKKI NARSA qilamiz:
  //   a) ref ni yangilaymiz (socket handler uchun)
  //   b) setupAuthCheck ga yangi navigate beramiz (authUtils ref uchun)
  //   setupAuthCheck isInitialized=true bo'lsa faqat navigateRef ni yangilaydi
  //   isInitialized=false bo'lsa (login dan keyin) — yangi interval yaratadi
  useEffect(() => {
    navigateRef.current = navigate;
    setupAuthCheck(navigate); // ✅ Har navigate o'zgarganda — idempotent
  }, [navigate]);

  // ✅ Socket — faqat bir marta, bo'sh dep array bilan
  useEffect(() => {
    const socket = getSocket();
    if (!socket.connected) socket.connect();

    // Socket ulanganda foydalanuvchini ro'yxatdan o'tkazish
    const handleConnect = () => {
      const _login    = localStorage.getItem('currentLogin') || '';
      const _deviceId = localStorage.getItem('deviceId')     || '';
      if (_login && _deviceId) {
        socket.emit('registerUser', { login: _login, deviceId: _deviceId });
      }
    };

    if (socket.connected) handleConnect();
    socket.on('connect', handleConnect);

    // ✅ FIX 2 & 4: stopAuthCheck chaqirmaymiz — handleLogout ishlatamiz
    // handleLogout (yangi authUtils da) intervalni tozalaydi lekin
    // isInitialized ni false qilmaydi — shuning uchun loop yo'q
    const handleForceLogout = (data: { reason?: string }) => {
      localStorage.removeItem('currentLogin');
      localStorage.removeItem('activeUser');
      localStorage.removeItem('login');
      sessionStorage.removeItem('currentUser');
      invalidateAuthCache();
      disconnectSocket();

      // ✅ handleLogout navigate olmaydi (navigateRef ichida saqlangan)
      handleLogout(data?.reason || '⛔ Siz boshqa qurilma tomonidan tizimdan chiqarildingiz');
    };

    const handleBlocked = (data: { login?: string; reason?: string }) => {
      const currentLogin = localStorage.getItem('currentLogin');
      // Boshqa user bloklangan bo'lsa — o'zimizga tegishli emas
      if (data.login && data.login !== currentLogin) return;

      localStorage.removeItem('currentLogin');
      localStorage.removeItem('activeUser');
      sessionStorage.removeItem('currentUser');
      invalidateAuthCache();
      disconnectSocket();

      toast.error('❌ Hisobingiz bloklandi', {
        description: data?.reason || 'Administrator tomonidan bloklandi',
        duration: 6000,
      });

      // ✅ navigateRef.current ishlatamiz — handleLogout emas
      // (handleLogout toast ham chiqaradi, duplicate bo'ladi)
      setTimeout(() => {
        handleLogout(); // interval tozalaydi
        navigateRef.current('/login', { replace: true });
      }, 3000);
    };

    socket.on('forceLogout',  handleForceLogout);
    socket.on('user:blocked', handleBlocked);

    // ✅ Cleanup: FAQAT socket event listenerlarni olib tashlaymiz
    // Auth interval va isInitialized ga tegmaymiz —
    // component unmount bo'lmaydi (App umri davomida yashaydi)
    return () => {
      socket.off('connect',      handleConnect);
      socket.off('forceLogout',  handleForceLogout);
      socket.off('user:blocked', handleBlocked);
    };
  }, []); // ✅ Bo'sh array — bir marta

  return null;
}

// ─────────────────────────────────────────────────────────────
// App
// ─────────────────────────────────────────────────────────────
function App() {
  return (
    <TranslationProvider>
      <BrowserRouter>
        <HandTrackingProvider>
          <Toaster position="top-center" richColors />
          <GlobalSocketListener />

          <Routes>
            <Route path="/"       element={<Navigate to="/login" replace />} />
            <Route path="/login"  element={<Login />} />

            <Route path="/menu"           element={<ProtectedRoute><Menu /></ProtectedRoute>} />
            <Route path="/settings"       element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/ai"             element={<ProtectedRoute><Chatbot /></ProtectedRoute>} />
            <Route path="/chat"           element={<ProtectedRoute><Chat /></ProtectedRoute>} />
            <Route path="/add-product"    element={<ProtectedRoute><MaxQoshish /></ProtectedRoute>} />
            <Route path="/products"       element={<ProtectedRoute><MaxsulotBazasi /></ProtectedRoute>} />
            <Route path="/reports"        element={<ProtectedRoute><Scan /></ProtectedRoute>} />
            <Route path="/scanner"        element={<ProtectedRoute><Scanner /></ProtectedRoute>} />
            <Route path="/sales"          element={<ProtectedRoute><Sotilgan /></ProtectedRoute>} />
            <Route path="/debts"          element={<ProtectedRoute><Qarzlar /></ProtectedRoute>} />
            <Route path="/kirim-bazasi"   element={<ProtectedRoute><KirimBazasi /></ProtectedRoute>} />
            <Route path="/admin-panel"    element={<ProtectedRoute><AdminPanel /></ProtectedRoute>} />
            <Route path="/admin-settings" element={<ProtectedRoute><AdminSettings /></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </HandTrackingProvider>
      </BrowserRouter>
    </TranslationProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);