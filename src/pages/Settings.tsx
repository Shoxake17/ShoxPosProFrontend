import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, ChevronRight, LucideIcon } from 'lucide-react';
import { getSocket } from '../utils/socket';
import { clearAuthClientState } from '../utils/clientSession';
import MainLayout from "../components/layout/MainLayout";
import Profile from "../components/settings/Profile";
import { useAuthStore, PLAN_PERMISSIONS } from "../store/useAuthStore";

// ✅ Professional i18next importi
import { useTranslation } from 'react-i18next';

import Notification from "../components/settings/Notification";
import ChangePassword from "../components/settings/ChangePassword";
import Biometric from "../components/settings/Biometric";
import Session from "../components/settings/Session";
import DataExport from "../components/settings/DataExport";
import Backup from "../components/settings/BackUp";
import ClearData from "../components/settings/ClearData";
import Logout from "../components/settings/Logout";
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
  alertSuccess,
} from '../components/alert/SettingsAlert';

// ─── Interfaces ────────────────────────────────────────────────────────────
interface SettingItem {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  onClick: () => void;
  value?: string | number;
}

interface SettingGroup {
  title: string;
  items: SettingItem[];
}

// ─── ConfirmationModal ─────────────────────────────────────────────────────
function ConfirmationModal({ isOpen, onClose, onConfirm, theme, title, message, t }: {
  isOpen: boolean; onClose: () => void; onConfirm: () => void;
  theme: 'dark' | 'light'; title: string; message: string; 
  t: any;
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
            {t('settings:noBtn')}
          </button>
          <button
            onClick={() => { onConfirm(); onClose(); }}
            style={{ flex: 1, padding: '14px', background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 600, cursor: 'pointer' }}
          >
            {t('settings:yesBtn')}
          </button>
        </div>
      </div>
    </div>
  );
}

const getCurrentLogin = (): string | null => {
  try {
    const fromSession = sessionStorage.getItem('currentUser');
    if (fromSession) {
      const parsed = JSON.parse(fromSession);
      if (parsed?.login) return parsed.login;
    }
  } catch { /* ignore */ }
  return null;
};

export default function POSSettingsPage() {
  const navigate = useNavigate();
  
  // ✅ i18next hook (namespace: settings, common)
  const { t } = useTranslation(['settings', 'common']);
  const { user } = useAuthStore();

  const [userImage, setUserImage]   = useState<string | null>(null);
  const [theme, setTheme]           = useState<'dark' | 'light'>('dark');
  const [notifications, setNotifications] = useState(true);
  const [hoveredSetting, setHoveredSetting] = useState<string | null>(null);

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  
  const userPlan = user?.subscription?.plan || 'free';
  const permissions = PLAN_PERMISSIONS[userPlan] || PLAN_PERMISSIONS.free;
  const hasAllSettingsFeatures = permissions.settingsFeatures.includes('all');
  const hasCurrencyFeature = permissions.settingsFeatures.includes('currency');
  const hasSettingsFeature = (feature: string) => {
    if (hasAllSettingsFeatures) return true;
    return permissions.settingsFeatures.includes(feature);
  };

  const [isConfirmOpen, setIsConfirmOpen]     = useState(false);
  const [confirmTitle, setConfirmTitle]       = useState("");
  const [confirmMessage, setConfirmMessage]   = useState("");
  const [confirmCallback, setConfirmCallback] = useState<(() => void) | null>(null);

  const navigateRef = useRef(navigate);
  const themeRef    = useRef(theme);
  const tRef        = useRef(t);

  useEffect(() => { navigateRef.current = navigate; }, [navigate]);
  useEffect(() => { themeRef.current = theme; },     [theme]);
  useEffect(() => { tRef.current = t; },             [t]);

  const currentLogin = getCurrentLogin();

  const handleSessionExpired = useCallback(() => {
    alertSessionExpired(themeRef.current, tRef.current);
    setTimeout(() => navigateRef.current('/login', { replace: true }), 2000);
  }, []);

  const showSuccess = useCallback((msg: string) => {
    alertSuccess(themeRef.current, msg);
  }, []);

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

  const settingsGroups: SettingGroup[] = [
    { title: t('settings:general'), items: [] },
    { title: t('settings:visioncontrol'), items: [] },
    { title: t('settings:security'), items: [] }, 
    { title: t('settings:data'), items: [] },
    { title: t('settings:account'), items: [
        {
          id: 'profile-card', 
          icon: User,
          title: t('settings:profile'),
          description: t('settings:profileDescription'),
          onClick: () => setIsProfileOpen(true),
        },
      ],
    },
  ];

  return (
    <MainLayout theme={theme} userImage={userImage} handleImageUpload={handleImageUpload} title={t('settings:settings')}>
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
        t={t}
      />

      <ToastContainer position="top-right" autoClose={4000} theme={theme === 'dark' ? 'dark' : 'light'} />

      {settingsGroups.map((group, gIdx) => {
        // Free rejimda faqat general va account guruhlarini ko'rsatamiz
        const shouldShowGroup = userPlan !== 'free' || gIdx === 0 || gIdx === 4;
        if (!shouldShowGroup) return null;
        
        return (
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
                      <p style={{ fontSize: '13px', color: theme === 'dark' ? '#8b92a7' : '#64748b', margin: 0, marginBottom: '8px' }}>{item.description}</p>
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
                {hasSettingsFeature('languages') && <Languages theme={theme} hoveredSetting={hoveredSetting} setHoveredSetting={setHoveredSetting} idx="lang-card" />}
                {hasCurrencyFeature && <Currency theme={theme} hoveredSetting={hoveredSetting} setHoveredSetting={setHoveredSetting} idx="currency-card" />}
                {hasSettingsFeature('theme') && <Theme theme={theme} setTheme={setTheme} hoveredSetting={hoveredSetting} setHoveredSetting={setHoveredSetting} idx="theme-card" />}
                {hasAllSettingsFeatures && <Notification theme={theme} notifications={notifications} setNotifications={setNotifications} hoveredSetting={hoveredSetting} setHoveredSetting={setHoveredSetting} idx="notif-card" />}
              </>
            )}
            {gIdx === 1 && hasAllSettingsFeatures && (
              <HandControl theme={theme} hoveredSetting={hoveredSetting} setHoveredSetting={setHoveredSetting} idx="hand-card" />
            )}
            {gIdx === 2 && hasAllSettingsFeatures && (
              <>
                <ChangePassword theme={theme} hoveredSetting={hoveredSetting} setHoveredSetting={setHoveredSetting} idx="pw-card" />
                <GoogleAuth theme={theme} hoveredSetting={hoveredSetting} setHoveredSetting={setHoveredSetting} idx="gauth-card" currentLogin={currentLogin} showConfirm={showConfirm} showMessage={showSuccess} handleSessionExpired={handleSessionExpired} />
                <Biometric theme={theme} hoveredSetting={hoveredSetting} setHoveredSetting={setHoveredSetting} idx="bio-card" currentLogin={currentLogin} showConfirm={showConfirm} showMessage={showSuccess} handleSessionExpired={handleSessionExpired} />
                <Session theme={theme} hoveredSetting={hoveredSetting} setHoveredSetting={setHoveredSetting} idx="session-card" />
              </>
            )}
            {gIdx === 3 && hasAllSettingsFeatures && (
              <>
                <DataExport theme={theme} hoveredSetting={hoveredSetting} setHoveredSetting={setHoveredSetting} idx="export-card" />
                <Backup theme={theme} hoveredSetting={hoveredSetting} setHoveredSetting={setHoveredSetting} idx="backup-card" />
                <ClearData theme={theme} hoveredSetting={hoveredSetting} setHoveredSetting={setHoveredSetting} idx="clear-card" showMessage={showSuccess} />
              </>
            )}
            {gIdx === 4 && (
              <>
                {hasSettingsFeature('logout') && <Logout theme={theme} hoveredSetting={hoveredSetting} setHoveredSetting={setHoveredSetting} idx="logout-card" showMessage={showSuccess} />}
              </>
            )}
          </div>
        </section>
      );
      })}
    </MainLayout>
  );
}