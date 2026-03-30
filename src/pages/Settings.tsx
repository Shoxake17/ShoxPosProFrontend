import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, ChevronRight } from 'lucide-react';
import axiosInstance, { getMemoryCsrfToken, setMemoryCsrfToken } from '../api/axiosInstance'; // ✅ getMemoryCsrfToken
import { getSocket } from '../utils/socket';
import { clearAuthClientState } from '../utils/clientSession';
import MainLayout from "../components/MainLayout";
import Profile from "../components/settings/Profile";
import { TranslationProvider as Provider, useTranslation } from '../components/languages/Settings';
export const TranslationProvider = Provider;
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
import HandControl from "../components/settings/HandControl";
import Languages from "../components/settings/Languages";
import Theme from "../components/settings/Theme";
import Currency from "../components/settings/Valyuta";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import {
  alertSessionExpired,
  alertForceLogout,
  alertLanguageChanged,
  alertSuccess,
} from '../components/alert/SettingsAlert';

// ─── ConfirmationModal ─────────────────────────────────────────────────────
function ConfirmationModal({ isOpen, onClose, onConfirm, theme, title, message }: {
  isOpen: boolean; onClose: () => void; onConfirm: () => void;
  theme: 'dark' | 'light'; title: string; message: string;
}) {
  if (!isOpen) return null;
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: theme === 'dark' ? 'linear-gradient(135deg, #1a1f2e 0%, #252b3d 100%)' : 'linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%)', borderRadius: '24px', padding: '32px', width: '90%', maxWidth: '400px', border: `1px solid ${theme === 'dark' ? '#2a3144' : '#e2e8f0'}`, boxShadow: '0 20px 60px rgba(0,0,0,0.4)', textAlign: 'center' }}
      >
        <h2 style={{ fontSize: '22px', fontWeight: 700, color: theme === 'dark' ? '#fff' : '#1a1f2e', marginBottom: '16px' }}>{title}</h2>
        <p style={{ fontSize: '16px', color: theme === 'dark' ? '#8b92a7' : '#64748b', marginBottom: '32px' }}>{message}</p>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={onClose}
            style={{ flex: 1, padding: '14px', background: theme === 'dark' ? '#1a1f2e' : '#f1f5f9', color: theme === 'dark' ? '#e2e8f0' : '#1e293b', border: `1px solid ${theme === 'dark' ? '#2a3144' : '#e2e8f0'}`, borderRadius: '12px', fontSize: '16px', fontWeight: 600, cursor: 'pointer' }}
          >
            Yo'q
          </button>
          <button
            onClick={() => { onConfirm(); onClose(); }}
            style={{ flex: 1, padding: '14px', background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 600, cursor: 'pointer' }}
          >
            Ha
          </button>
        </div>
      </div>
    </div>
  );
}



// ✅ currentLogin — sessionStorage dan xavfsiz olish
const getCurrentLogin = (): string | null => {
  try {
    const fromSession = sessionStorage.getItem('currentUser');
    if (fromSession) {
      const parsed = JSON.parse(fromSession);
      if (parsed?.login) return parsed.login;
    }
  } catch {
    // ✅ parse xatosi — crash qilmasin
  }
  return null;
};

// ─── POSSettingsPageContent ────────────────────────────────────────────────
function POSSettingsPageContent() {
  const navigate = useNavigate();
  const { t, language, setLanguage } = useTranslation();

  const [userImage, setUserImage]   = useState<string | null>(null);
  const [theme, setTheme]           = useState<'dark' | 'light'>('dark');
  const [notifications, setNotifications] = useState(true);
  const [hoveredSetting, setHoveredSetting] = useState<string | null>(null);

  const [isProfileOpen, setIsProfileOpen]             = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword]         = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");

  // ✅ csrfToken state — O'CHIRILDI (getMemoryCsrfToken() ishlatiladi)

  const [isConfirmOpen, setIsConfirmOpen]     = useState(false);
  const [confirmTitle, setConfirmTitle]       = useState("");
  const [confirmMessage, setConfirmMessage]   = useState("");
  const [confirmCallback, setConfirmCallback] = useState<(() => void) | null>(null);

  const prevLanguageRef = useRef(language);

  // ✅ Ref orqali — dependency loopdan qochish
  const navigateRef = useRef(navigate);
  const themeRef    = useRef(theme);
  const tRef        = useRef(t);
  useEffect(() => { navigateRef.current = navigate; }, [navigate]);
  useEffect(() => { themeRef.current = theme; },     [theme]);
  useEffect(() => { tRef.current = t; },             [t]);

  // ✅ currentLogin — sessionStorage dan, localStorage YO'Q
  const currentLogin = getCurrentLogin();

  // ✅ handleSessionExpired — ref orqali, bo'sh dependency
  const handleSessionExpired = useCallback(() => {
    alertSessionExpired(themeRef.current, tRef.current);
    setTimeout(() => navigateRef.current('/login', { replace: true }), 2000);
  }, []);

  // ✅ showSuccess — ref orqali, bo'sh dependency
  const showSuccess = useCallback((msg: string) => {
    alertSuccess(themeRef.current, msg);
  }, []);

  // ✅ Til o'zgarganda alert
  useEffect(() => {
    if (prevLanguageRef.current !== language) {
      const langDisplay: Record<string, string> = {
        uz: "O'zbek", ru: "Русский", en: "English",
      };
      alertLanguageChanged(
        themeRef.current,
        tRef.current,
        langDisplay[language] || language.toUpperCase()
      );
    }
    prevLanguageRef.current = language;
  }, [language]);

  // ✅ Force logout — bir marta, faqat kerakli storage tozalanadi
  useEffect(() => {
    const socket = getSocket();
    const handleForceLogout = () => {
      clearAuthClientState();
      alertForceLogout(themeRef.current, tRef.current);
      setTimeout(() => navigateRef.current("/login", { replace: true }), 2000);
    };
    socket.on('force-logout', handleForceLogout);
    return () => { socket.off('force-logout', handleForceLogout); };
  }, []);

  // ✅ Theme & image — bir marta
  useEffect(() => {
    const savedImage = localStorage.getItem('userImage');
    if (savedImage) setUserImage(savedImage);
    const savedTheme = (localStorage.getItem('theme') as 'dark' | 'light') || 'dark';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const imgSrc = e.target?.result as string;
      setUserImage(imgSrc);
      localStorage.setItem('userImage', imgSrc);
    };
    reader.readAsDataURL(file);
  };

  const showConfirm = (title: string, message: string, callback: () => void) => {
    setConfirmTitle(title);
    setConfirmMessage(message);
    setConfirmCallback(() => callback);
    setIsConfirmOpen(true);
  };

  const settingsGroups = [
    { title: t('general'),   items: [] as any[] },
    { title: t('visioncontrol'), items: [] as any[] },
    {
      title: t('security'),
      items: [
        {
          id: 'pw-card', icon: Lock,
          title: t('changePassword'),
          description: t('changePasswordDescription'),
          onClick: () => setIsChangePasswordOpen(true),
        },
      ],
    },
    { title: t('data') || "Ma'lumotlar", items: [] as any[] },
    {
      title: t('account'),
      items: [
        {
          id: 'profile-card', icon: User,
          title: t('profile'),
          description: t('profileDescription') || "Shaxsiy ma'lumotlarni ko'rish va tahrirlash",
          onClick: () => setIsProfileOpen(true),
        },
      ],
    },
  ];

  return (
    <MainLayout theme={theme} userImage={userImage} handleImageUpload={handleImageUpload} title={t('settings')}>

     
      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => {
          setIsChangePasswordOpen(false);
          setPasswordMessage("");
          setCurrentPassword("");
          setNewPassword("");
          setConfirmPassword("");
        }}
        theme={theme}
        currentPassword={currentPassword}   setCurrentPassword={setCurrentPassword}
        newPassword={newPassword}           setNewPassword={setNewPassword}
        confirmPassword={confirmPassword}   setConfirmPassword={setConfirmPassword}
        passwordLoading={passwordLoading}   setPasswordLoading={setPasswordLoading}
        passwordMessage={passwordMessage}   setPasswordMessage={setPasswordMessage}
      />

      <Profile
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        theme={theme}
        userImage={userImage}
        handleImageUpload={handleImageUpload}
      />

      <ConfirmationModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={() => confirmCallback?.()}
        theme={theme}
        title={confirmTitle}
        message={confirmMessage}
      />

      <ToastContainer position="top-right" autoClose={4000} theme={theme === 'dark' ? 'dark' : 'light'} />

      {settingsGroups.map((group, gIdx) => (
        <section key={gIdx} style={{ marginBottom: '32px' }}>
          {group.title && (
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: theme === 'dark' ? '#fff' : '#1a1f2e', marginBottom: '16px' }}>
              {group.title}
            </h2>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '16px' }}>

            {group.items.map((item) => {
              const Icon  = item.icon;
              const cardId = item.id;
              return (
                <div
                  key={cardId}
                  onMouseEnter={() => setHoveredSetting(cardId)}
                  onMouseLeave={() => setHoveredSetting(null)}
                  onClick={item.onClick}
                  style={{
                    background: theme === 'dark' ? 'linear-gradient(135deg, #1a1f2e 0%, #252b3d 100%)' : 'linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%)',
                    borderRadius: '16px', padding: '20px',
                    border: hoveredSetting === cardId ? '1px solid #667eea' : `1px solid ${theme === 'dark' ? '#2a3144' : '#e2e8f0'}`,
                    cursor: 'pointer', transition: 'all 0.3s ease',
                    transform: hoveredSetting === cardId ? 'translateY(-2px)' : 'translateY(0)',
                    boxShadow: hoveredSetting === cardId ? '0 8px 24px rgba(102,126,234,0.2)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: theme === 'dark' ? 'rgba(102,126,234,0.1)' : 'rgba(79,70,229,0.1)', color: '#667eea', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={20} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontSize: '19px', fontWeight: 600, color: theme === 'dark' ? '#fff' : '#1a1f2e', margin: 0, marginBottom: '4px' }}>{item.title}</h3>
                      <p style={{ fontSize: '13px', color: theme === 'dark' ? '#8b92a7' : '#64748b', margin: 0, marginBottom: item.value ? '8px' : '0' }}>{item.description}</p>
                      {item.value && (
                        <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: '6px', background: theme === 'dark' ? '#0f1420' : '#f1f5f9', fontSize: '12px', color: '#667eea', fontWeight: 500 }}>
                          {item.value}
                        </span>
                      )}
                    </div>
                    <ChevronRight size={20} color={theme === 'dark' ? '#8b92a7' : '#64748b'} style={{ flexShrink: 0, marginTop: '10px' }} />
                  </div>
                </div>
              );
            })}

            {gIdx === 0 && (
              <>
                <Languages    theme={theme} t={t} language={language} setLanguage={setLanguage} hoveredSetting={hoveredSetting} setHoveredSetting={setHoveredSetting} idx="lang-card" />
                <Currency     theme={theme} t={t} hoveredSetting={hoveredSetting} setHoveredSetting={setHoveredSetting} idx="currency-card" />
                <Theme        theme={theme} t={t} setTheme={setTheme} hoveredSetting={hoveredSetting} setHoveredSetting={setHoveredSetting} idx="theme-card" />
                <Notification theme={theme} t={t} notifications={notifications} setNotifications={setNotifications} hoveredSetting={hoveredSetting} setHoveredSetting={setHoveredSetting} idx="notif-card" />
              </>
            )}
            {gIdx === 1 && (
              <HandControl theme={theme} hoveredSetting={hoveredSetting} setHoveredSetting={setHoveredSetting} idx="hand-card" />
            )}
            {gIdx === 2 && (
              <>
                <GoogleAuth theme={theme} hoveredSetting={hoveredSetting} setHoveredSetting={setHoveredSetting} idx="gauth-card" currentLogin={currentLogin} showConfirm={showConfirm} showMessage={showSuccess} handleSessionExpired={handleSessionExpired} />
                <Biometric  theme={theme} t={t} hoveredSetting={hoveredSetting} setHoveredSetting={setHoveredSetting} idx="bio-card"   currentLogin={currentLogin} showConfirm={showConfirm} showMessage={showSuccess} handleSessionExpired={handleSessionExpired} />
                <Session    theme={theme} hoveredSetting={hoveredSetting} setHoveredSetting={setHoveredSetting} idx="session-card" />
              </>
            )}
            {gIdx === 3 && (
              <>
                <DataExport theme={theme} hoveredSetting={hoveredSetting} setHoveredSetting={setHoveredSetting} idx="export-card" />
                <Backup     theme={theme} hoveredSetting={hoveredSetting} setHoveredSetting={setHoveredSetting} idx="backup-card" />
                <ClearData  theme={theme} hoveredSetting={hoveredSetting} setHoveredSetting={setHoveredSetting} idx="clear-card" showMessage={showSuccess} />
              </>
            )}
            {gIdx === 4 && (
              <>
                <Email  theme={theme} t={t} hoveredSetting={hoveredSetting} setHoveredSetting={setHoveredSetting} idx="email-card" />
                <Logout theme={theme}     hoveredSetting={hoveredSetting} setHoveredSetting={setHoveredSetting} idx="logout-card" showMessage={showSuccess} />
              </>
            )}
          </div>
        </section>
      ))}
    </MainLayout>
  );
}

export default function POSSettingsPage() {
  return <POSSettingsPageContent />;
}
