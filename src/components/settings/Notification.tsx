// components/settings/Notification.tsx
import React, { useEffect } from 'react';
import { Bell, ChevronRight } from 'lucide-react';
import { alertSuccess, alertError } from '../alert/SettingsAlert';

interface NotificationProps {
  theme: 'dark' | 'light';
  t: (key: string) => string;
  notifications: boolean;
  setNotifications: React.Dispatch<React.SetStateAction<boolean>>;
  hoveredSetting: string | null;
  setHoveredSetting: React.Dispatch<React.SetStateAction<string | null>>;
  idx: string;
}

// ✅ Boshqa komponentlar uchun helper funksiya
export const isNotificationsEnabled = (): boolean => {
  try {
    const val = localStorage.getItem('notificationsEnabled');
    return val === null ? true : JSON.parse(val);
  } catch { return true; }
};

export default function Notification({
  theme, t, notifications, setNotifications,
  hoveredSetting, setHoveredSetting, idx
}: NotificationProps) {

  // ✅ localStorage dan yuklash
  useEffect(() => {
    const saved = localStorage.getItem('notificationsEnabled');
    if (saved !== null) {
      setNotifications(JSON.parse(saved));
    }
  }, [setNotifications]);

  const toggleNotifications = () => {
    const newValue = !notifications;
    setNotifications(newValue);
    // ✅ NotificationBar tekshiradigan key
    localStorage.setItem('notificationsEnabled', JSON.stringify(newValue));

    if (newValue) {
      alertSuccess(theme, t('notificationsEnabled') || "Bildirishnomalar yoqildi");
    } else {
      alertError(theme, t('notificationsDisabled') || "Bildirishnomalar o'chirildi");
    }
  };

  const isHovered = hoveredSetting === idx;

  return (
    <div
      onMouseEnter={() => setHoveredSetting(idx)}
      onMouseLeave={() => setHoveredSetting(null)}
      onClick={toggleNotifications}
      style={{
        background: theme === 'dark'
          ? 'linear-gradient(135deg, #1a1f2e 0%, #252b3d 100%)'
          : 'linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%)',
        borderRadius: '16px',
        padding: '20px',
        border: isHovered
          ? '1px solid #667eea'
          : `1px solid ${theme === 'dark' ? '#2a3144' : '#e2e8f0'}`,
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: isHovered ? '0 8px 24px rgba(102,126,234,0.2)' : 'none',
      }}
    >
      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
        <div style={{
          width: '40px', height: '40px', borderRadius: '10px',
          background: theme === 'dark' ? 'rgba(102,126,234,0.1)' : 'rgba(79,70,229,0.1)',
          color: '#667eea', display: 'flex', alignItems: 'center',
          justifyContent: 'center', flexShrink: 0,
        }}>
          <Bell size={20} />
        </div>

        <div style={{ flex: 1 }}>
          <h3 style={{
            fontSize: '19px', fontWeight: 600,
            color: theme === 'dark' ? '#fff' : '#1a1f2e',
          }}>
            {t('notifications')}
          </h3>
          <p style={{
            fontSize: '13px',
            color: theme === 'dark' ? '#8b92a7' : '#64748b',
            marginBottom: '8px',
          }}>
            {t('notificationsDescription')}
          </p>
          <span style={{
            display: 'inline-block', padding: '4px 12px', borderRadius: '6px',
            background: theme === 'dark' ? '#0f1420' : '#f1f5f9',
            fontSize: '12px',
            color: notifications ? '#4caf50' : '#ef4444',
            fontWeight: 500,
          }}>
            {notifications ? t('enabled') : t('disabled')}
          </span>
        </div>

        <ChevronRight
          size={20}
          color={theme === 'dark' ? '#8b92a7' : '#64748b'}
          style={{ flexShrink: 0, marginTop: '10px' }}
        />
      </div>
    </div>
  );
}