// Settings.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Globe, Moon, Sun, Lock, User, ChevronRight, X, Check, Smartphone } from 'lucide-react';
import { Laptop, Tablet } from "lucide-react";
import { getDeviceInfo, getRpId } from '../utils/deviceUtils';
import { exportToExcel, exportToPDF } from '../utils/exportUtils';
import { api } from '../utils/api';
import axiosInstance from '../api/axiosInstance';
import { getSocket } from '../utils/socket'; // ✅ singleton
import MainLayout from "../components/MainLayout";
import Profile from "../components/settings/Profile";
import { TranslationProvider, useTranslation } from '../components/languages/Settings';
import Notification from "../components/settings/Notification";
import ChangePasswordModal from "../components/settings/ChangePassword";
import Biometric from "../components/settings/Biometric";
import Session from "../components/settings/Session";
import DataExport from "../components/settings/DataExport";
import Backup from "../components/settings/BackUp";
import ClearData from "../components/settings/ClearData";
import Logout from "../components/settings/Logout";
import Email from "../components/settings/Email";
import GoogleAuth from "../components/settings/Authentificator";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const getDeviceIcon = (type: string, os: string) => {
  if (type === 'desktop') return <Laptop size={32} />;
  if (type === 'tablet') return <Tablet size={32} />;
  if (os === 'iOS') return <Smartphone size={32} color="#A2AAAD" />;
  return <Smartphone size={32} />;
};

function LanguageModal({ isOpen, onClose, theme, currentLanguage, onSelectLanguage }: {
  isOpen: boolean; onClose: () => void; theme: 'dark' | 'light';
  currentLanguage: string; onSelectLanguage: (lang: string) => void;
}) {
  const { t } = useTranslation();
  if (!isOpen) return null;
  const languages = [
    { code: 'uz', name: "O'zbek", nativeName: "O'zbek" },
    { code: 'ru', name: 'Русский', nativeName: 'Русский' },
    { code: 'en', name: 'English', nativeName: 'English' }
  ];
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: theme === 'dark' ? 'linear-gradient(135deg, #1a1f2e 0%, #252b3d 100%)' : 'linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%)', borderRadius: '24px', padding: '32px', width: '90%', maxWidth: '500px', border: `1px solid ${theme === 'dark' ? '#2a3144' : '#e2e8f0'}`, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 700, color: theme === 'dark' ? '#fff' : '#1a1f2e', margin: 0 }}>{t('selectLanguage')}</h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: theme === 'dark' ? '#8b92a7' : '#64748b' }}><X size={24} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {languages.map(lang => (
            <div key={lang.code} onClick={() => { onSelectLanguage(lang.code); onClose(); }}
              style={{ padding: '16px 20px', borderRadius: '12px', background: currentLanguage === lang.code ? (theme === 'dark' ? 'rgba(102,126,234,0.15)' : 'rgba(79,70,229,0.1)') : (theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)'), border: currentLanguage === lang.code ? '2px solid #667eea' : `1px solid ${theme === 'dark' ? '#2a3144' : '#e2e8f0'}`, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '18px', fontWeight: 600, color: theme === 'dark' ? '#fff' : '#1a1f2e', marginBottom: '4px' }}>{lang.nativeName}</div>
                <div style={{ fontSize: '14px', color: theme === 'dark' ? '#8b92a7' : '#64748b' }}>{lang.name}</div>
              </div>
              {currentLanguage === lang.code && (
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#667eea', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Check size={16} color="#fff" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ConfirmationModal({ isOpen, onClose, onConfirm, theme, title, message }: {
  isOpen: boolean; onClose: () => void; onConfirm: () => void;
  theme: 'dark' | 'light'; title: string; message: string;
}) {
  if (!isOpen) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(8px)' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: theme === 'dark' ? 'linear-gradient(135deg, #1a1f2e 0%, #252b3d 100%)' : 'linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%)', borderRadius: '24px', padding: '32px', width: '90%', maxWidth: '400px', border: `1px solid ${theme === 'dark' ? '#2a3144' : '#e2e8f0'}`, boxShadow: '0 20px 60px rgba(0,0,0,0.4)', textAlign: 'center' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 700, color: theme === 'dark' ? '#fff' : '#1a1f2e', marginBottom: '16px' }}>{title}</h2>
        <p style={{ fontSize: '16px', color: theme === 'dark' ? '#8b92a7' : '#64748b', marginBottom: '32px' }}>{message}</p>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '14px', background: theme === 'dark' ? '#1a1f2e' : '#f1f5f9', color: theme === 'dark' ? '#e2e8f0' : '#1e293b', border: `1px solid ${theme === 'dark' ? '#2a3144' : '#e2e8f0'}`, borderRadius: '12px', fontSize: '16px', fontWeight: 600 }}>Yo'q</button>
          <button onClick={() => { onConfirm(); onClose(); }} style={{ flex: 1, padding: '14px', background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 600 }}>Ha</button>
        </div>
      </div>
    </div>
  );
}

function POSSettingsPageContent() {
  const navigate = useNavigate();
  const { t, language, setLanguage } = useTranslation();

  const [userImage, setUserImage] = useState<string | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [notifications, setNotifications] = useState(true);
  const [hoveredSetting, setHoveredSetting] = useState<string | null>(null);

  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [csrfToken, setCsrfToken] = useState("");

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState("");
  const [confirmMessage, setConfirmMessage] = useState("");
  const [confirmCallback, setConfirmCallback] = useState<(() => void) | null>(null);

  const prevLanguageRef = useRef(language);

  const currentLogin = localStorage.getItem('login') ||
    (sessionStorage.getItem('currentUser')
      ? JSON.parse(sessionStorage.getItem('currentUser') || '{}').login
      : null);

  // ✅ useCallback — 't' dependency YO'Q (t har render da yangi ref)
  const handleSessionExpired = useCallback(() => {
    toast.error('Sessiya tugadi. Qayta kirish kerak.', { autoClose: 4000 });
    setTimeout(() => navigate('/login', { replace: true }), 2000);
  }, [navigate]);

  const showSuccess = useCallback((msg: string) => toast.success(msg, { autoClose: 4000 }), []);
  const showError = useCallback((msg: string) => toast.error(msg, { autoClose: 5000 }), []);

  // ✅ CSRF — faqat 1 marta
  useEffect(() => {
    axiosInstance.get('/csrf-token')
      .then(res => {
        const token = res.data?.csrfToken;
        if (token) { setCsrfToken(token); localStorage.setItem('csrfToken', token); }
      })
      .catch(() => {});
  }, []);

  // ✅ CSRF modal ochilganda yangilash
  useEffect(() => {
    if (!isChangePasswordOpen) return;
    axiosInstance.get('/csrf-token')
      .then(res => {
        const token = res.data?.csrfToken;
        if (token) { setCsrfToken(token); localStorage.setItem('csrfToken', token); }
      })
      .catch(() => {});
  }, [isChangePasswordOpen]);

  const showConfirm = (title: string, message: string, callback: () => void) => {
    setConfirmTitle(title);
    setConfirmMessage(message);
    setConfirmCallback(() => callback);
    setIsConfirmOpen(true);
  };

  // ✅ Til o'zgarganda toast — faqat language dependency
  useEffect(() => {
    if (prevLanguageRef.current !== language) {
      const langDisplay: Record<string, string> = { uz: "O'zbek", ru: "Русский", en: "English" };
      toast.success(`Til o'zgartirildi: ${langDisplay[language] || language.toUpperCase()}`, { autoClose: 3000 });
    }
    prevLanguageRef.current = language;
  }, [language]);

  // ✅ Socket — singleton, yangi socket YARATMAYDI
  // Login.tsx da reconnectSocket() allaqachon chaqirilgan
  // Bu yerda faqat 'forceLogout' eventini tinglash kerak
  useEffect(() => {
    const socket = getSocket();

    const handleForceLogout = () => {
      localStorage.clear();
      sessionStorage.clear();
      toast.error('Sizning ShoxPosPro ilovasidan chiqarib yuborildingiz', { autoClose: 3000 });
      setTimeout(() => navigate('/login', { replace: true }), 2000);
    };

    socket.on('force-logout', handleForceLogout);
    socket.on('forceLogout', handleForceLogout);

    return () => {
      // ✅ Faqat listener o'chiramiz, disconnect QILMAYMIZ
      socket.off('force-logout', handleForceLogout);
      socket.off('forceLogout', handleForceLogout);
    };
  }, []);

  useEffect(() => {
    const savedImage = localStorage.getItem('userImage');
    if (savedImage) setUserImage(savedImage);
    const savedTheme = (localStorage.getItem('theme') as 'dark' | 'light') || 'dark';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imgSrc = e.target?.result as string;
        setUserImage(imgSrc);
        localStorage.setItem('userImage', imgSrc);
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const settingsGroups = [
    {
      items: [
        { icon: Globe, title: t('language'), description: t('languageDescription'), value: language === 'uz' ? t('uzbek') : language === 'ru' ? t('russian') : t('english'), onClick: () => setIsLanguageModalOpen(true) },
        { icon: theme === 'dark' ? Moon : Sun, title: t('theme'), description: t('themeDescription'), value: theme === 'dark' ? t('dark') : t('light'), onClick: toggleTheme }
      ]
    },
    { title: t('security'), items: [{ icon: Lock, title: t("changePassword"), description: t('changePasswordDescription'), onClick: () => setIsChangePasswordOpen(true) }] },
    { title: '', items: [] },
    { title: t("data"), items: [] },
    { title: t('account'), items: [{ icon: User, title: t('profile'), description: t('profileDescription') || "Shaxsiy ma'lumotlarni ko'rish va tahrirlash", onClick: () => setIsProfileOpen(true) }] }
  ];

  return (
    <MainLayout theme={theme} userImage={userImage} handleImageUpload={handleImageUpload} title={t("settings")}>
      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => { setIsChangePasswordOpen(false); setPasswordMessage(""); setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); }}
        theme={theme}
        currentPassword={currentPassword} setCurrentPassword={setCurrentPassword}
        newPassword={newPassword} setNewPassword={setNewPassword}
        confirmPassword={confirmPassword} setConfirmPassword={setConfirmPassword}
        passwordLoading={passwordLoading} setPasswordLoading={setPasswordLoading}
        passwordMessage={passwordMessage} setPasswordMessage={setPasswordMessage}
        csrfToken={csrfToken}
      />
      <LanguageModal isOpen={isLanguageModalOpen} onClose={() => setIsLanguageModalOpen(false)} theme={theme} currentLanguage={language} onSelectLanguage={setLanguage} />
      <Profile isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} theme={theme} userImage={userImage} handleImageUpload={handleImageUpload} />
      <ConfirmationModal isOpen={isConfirmOpen} onClose={() => setIsConfirmOpen(false)} onConfirm={() => confirmCallback && confirmCallback()} theme={theme} title={confirmTitle} message={confirmMessage} />
      <ToastContainer position="top-right" autoClose={4000} hideProgressBar={false} newestOnTop closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover theme={theme === 'dark' ? 'dark' : 'light'} />

      {settingsGroups.map((group, gIdx) => (
        <section key={gIdx} style={{ marginBottom: '32px' }}>
          {group.title && (
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: theme === 'dark' ? '#fff' : '#1a1f2e', marginBottom: '16px' }}>
              {group.title}
            </h2>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '16px' }}>
            {group.items.map((item, iIdx) => {
              const Icon = item.icon;
              const cardIdx = `${gIdx}-${iIdx}`;
              return (
                <div key={iIdx}
                  onMouseEnter={() => setHoveredSetting(cardIdx)}
                  onMouseLeave={() => setHoveredSetting(null)}
                  onClick={item.onClick}
                  style={{ background: theme === 'dark' ? 'linear-gradient(135deg, #1a1f2e 0%, #252b3d 100%)' : 'linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%)', borderRadius: '16px', padding: '20px', border: hoveredSetting === cardIdx ? '1px solid #667eea' : `1px solid ${theme === 'dark' ? '#2a3144' : '#e2e8f0'}`, cursor: 'pointer', transition: 'all 0.3s ease', transform: hoveredSetting === cardIdx ? 'translateY(-2px)' : 'translateY(0)', boxShadow: hoveredSetting === cardIdx ? '0 8px 24px rgba(102,126,234,0.2)' : 'none' }}>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: theme === 'dark' ? 'rgba(102,126,234,0.1)' : 'rgba(79,70,229,0.1)', color: '#667eea', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={20} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontSize: '19px', fontWeight: 600, color: theme === 'dark' ? '#fff' : '#1a1f2e' }}>{item.title}</h3>
                      <p style={{ fontSize: '13px', color: theme === 'dark' ? '#8b92a7' : '#64748b', marginBottom: item.value ? '8px' : '0' }}>{item.description}</p>
                      {item.value && (
                        <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: '6px', background: theme === 'dark' ? '#0f1420' : '#f1f5f9', fontSize: '12px', color: '#4caf50', fontWeight: 500 }}>{item.value}</span>
                      )}
                    </div>
                    <ChevronRight size={20} color={theme === 'dark' ? '#8b92a7' : '#64748b'} style={{ flexShrink: 0, marginTop: '10px' }} />
                  </div>
                </div>
              );
            })}

            {gIdx === 0 && (
              <Notification theme={theme} t={t} notifications={notifications} setNotifications={setNotifications} hoveredSetting={hoveredSetting} setHoveredSetting={setHoveredSetting} idx="0-2" />
            )}

            {gIdx === 1 && (
              <>
                <GoogleAuth theme={theme} t={t} hoveredSetting={hoveredSetting} setHoveredSetting={setHoveredSetting} idx="1-4" currentLogin={currentLogin} showConfirm={showConfirm} showMessage={showSuccess} handleSessionExpired={handleSessionExpired} />
                <Biometric theme={theme} t={t} hoveredSetting={hoveredSetting} setHoveredSetting={setHoveredSetting} idx="1-2" currentLogin={currentLogin} showConfirm={showConfirm} showMessage={showSuccess} handleSessionExpired={handleSessionExpired} />
                <Session theme={theme} t={t} hoveredSetting={hoveredSetting} setHoveredSetting={setHoveredSetting} idx="1-3" />
              </>
            )}

            {gIdx === 3 && (
              <>
                <DataExport theme={theme} t={t} hoveredSetting={hoveredSetting} setHoveredSetting={setHoveredSetting} idx="3-0" />
                <Backup theme={theme} t={t} hoveredSetting={hoveredSetting} setHoveredSetting={setHoveredSetting} idx="3-2" />
                <ClearData theme={theme} t={t} hoveredSetting={hoveredSetting} setHoveredSetting={setHoveredSetting} idx="3-3" showMessage={showSuccess} />
              </>
            )}

            {gIdx === 4 && (
              <>
                <Email theme={theme} t={t} hoveredSetting={hoveredSetting} setHoveredSetting={setHoveredSetting} idx="4-1" />
                <Logout theme={theme} t={t} hoveredSetting={hoveredSetting} setHoveredSetting={setHoveredSetting} idx="4-2" showMessage={showSuccess} />
              </>
            )}
          </div>
        </section>
      ))}
    </MainLayout>
  );
}

export default function POSSettingsPage() {
  return (
    <TranslationProvider>
      <POSSettingsPageContent />
    </TranslationProvider>
  );
}