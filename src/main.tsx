// src/main.tsx
import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { Toaster, toast } from "sonner";
import { registerSW } from 'virtual:pwa-register';

import Menu from "./pages/Menu";
import Settings from "./pages/Settings";
import Chatbot from "./pages/Ai";
import Chat from "./pages/Chat";
import MaxQoshish from "./pages/MaxQoshish";
import MaxsulotBazasi from "./pages/MaxsulotBazasi";
import Scan from "./pages/Hisobotlar";
import Scanner from "./pages/Scanner";
import Sotilgan from "./pages/Sotilgan";
import Qarzlar from "./pages/Qarzlar";
import Login from "./pages/Login";
import KirimBazasi from './pages/KirimBazasi';
import Ai from "./pages/Ai";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminPanel from "./adminPages/AdminMenu";
import AdminSettings from "./adminPages/AdminSettings";
import NotFound from "./pages/NotFound";
import { getSocket, disconnectSocket } from "./utils/socket";

registerSW({ immediate: true });

// ✅ GLOBAL SOCKET LISTENER COMPONENT
function GlobalSocketListener() {
  const navigate = useNavigate();

  useEffect(() => {
    const login = localStorage.getItem('currentLogin') || 
                  localStorage.getItem('login') || '';
    const deviceId = localStorage.getItem('deviceId') || '';

    // Login qilmagan foydalanuvchi uchun listener kerak emas
    if (!login || !deviceId) return;

    const socket = getSocket();

    // ✅ forceLogout — boshqa qurilma tomonidan chiqarilganda
    const handleForceLogout = (data: { reason?: string }) => {
      console.warn('⛔ forceLogout eventi keldi:', data);

      // Barcha ma'lumotlarni tozalash
      localStorage.removeItem('currentLogin');
      localStorage.removeItem('activeUser');
      localStorage.removeItem('login');
      sessionStorage.removeItem('currentUser');

      // Socket ni uzish
      disconnectSocket();

      // Xabar ko'rsatish
      toast.warning(
        data?.reason || '⛔ Siz boshqa qurilma tomonidan tizimdan chiqarildingiz',
        { duration: 6000 }
      );

      // Login sahifasiga yo'naltirish
      navigate('/login', { replace: true });
    };

    socket.on('forceLogout', handleForceLogout);

    // Cleanup
    return () => {
      socket.off('forceLogout', handleForceLogout);
    };
  }, [navigate]);

  return null; // UI chiqarmaydi
}

// ====================================
// ✅ ASOSIY APP
// ====================================
function App() {
  // 🔐 Ilova ishga tushganda CSRF tokenni olish (bir marta)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/csrf-token', {
          method: 'GET',
          credentials: 'include',
        });
        if (!res.ok) return;
        const data = await res.json();
        const token = data.csrfToken || data.token;
        if (token) {
          localStorage.setItem('csrfToken', token);
          // console.log('CSRF token initialized');
        }
      } catch {
        // CSRF token olinmasa ham ilova ishlashda davom etadi,
        // lekin POST/PUT/DELETE so'rovlarda 403 bo'lishi mumkin.
      }
    })();
  }, []);

  return (
    <React.StrictMode>
      <BrowserRouter>
        <Toaster position="top-center" richColors />

        {/* ✅ Global socket listener — barcha sahifalarda ishlaydi */}
        <GlobalSocketListener />

        <Routes>
          {/* ❌ Ochiq sahifalar */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />

          {/* ✅ Himoyalangan sahifalar */}
          <Route path="/menu" element={<ProtectedRoute><Menu /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/ai" element={<ProtectedRoute><Chatbot /></ProtectedRoute>} />
          <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
          <Route path="/add-product" element={<ProtectedRoute><MaxQoshish /></ProtectedRoute>} />
          <Route path="/products" element={<ProtectedRoute><MaxsulotBazasi /></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute><Scan /></ProtectedRoute>} />
          <Route path="/scanner" element={<ProtectedRoute><Scanner /></ProtectedRoute>} />
          <Route path="/sales" element={<ProtectedRoute><Sotilgan /></ProtectedRoute>} />
          <Route path="/debts" element={<ProtectedRoute><Qarzlar /></ProtectedRoute>} />
          <Route path="/kirim-bazasi" element={<ProtectedRoute><KirimBazasi /></ProtectedRoute>} />
          <Route path="/admin-panel" element={<ProtectedRoute><AdminPanel /></ProtectedRoute>} />
          <Route path="/admin-settings" element={<ProtectedRoute><AdminSettings /></ProtectedRoute>} />

          {/* 404 */}
          <Route path="*" element={<NotFound />}       
          />
        </Routes>
      </BrowserRouter>
    </React.StrictMode>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);