import React, { useState } from 'react';
import { LogOut, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { clearAuthClientState } from '../../utils/clientSession';
import { api } from '../../utils/api';

interface LogoutProps {
  theme: 'dark' | 'light';
  hoveredSetting: string | null;
  setHoveredSetting: React.Dispatch<React.SetStateAction<string | null>>;
  idx: string;
  showMessage?: (text: string, type?: 'success' | 'error' | 'info') => void;
}

const Logout: React.FC<LogoutProps> = ({
  theme, hoveredSetting, setHoveredSetting, idx, showMessage
}) => {
  const { t } = useTranslation(['settings', 'common']);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // Chiqish SERVERDA (A4c.5): BFF sessiya + OnDex markaziy sessiyasi yopiladi,
  // keyin brauzer OnDex end_session'ga o'tadi (SSO cookie ham o'chadi).
  // Ilgari faqat brauzer holati tozalanardi — sessiya serverda tirik qolardi.
  const handleLogoutConfirm = async () => {
    let redirect = '/login';
    try {
      const res = await api('/api/auth/oidc/logout', { method: 'POST', body: '{}' });
      const data = await res.json().catch(() => ({}));
      if (typeof data?.redirect === 'string' && data.redirect) redirect = data.redirect;
    } catch {
      // tarmoq xatosi: mahalliy holat baribir tozalanadi; server sessiyasi
      // OnDex refresh'ida (≤10 daqiqa) yoki keyingi chiqishda yopiladi.
    }
    clearAuthClientState({ clearAiChats: true });
    if (showMessage) showMessage(t('logoutSuccess'), 'success');
    setIsConfirmOpen(false);
    window.location.assign(redirect);
  };

  const renderConfirmModal = () => (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, backdropFilter: 'blur(8px)'
      }}
      onClick={() => setIsConfirmOpen(false)}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: theme === 'dark'
            ? 'linear-gradient(135deg, #1a1f2e 0%, #252b3d 100%)'
            : 'linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%)',
          borderRadius: '24px', padding: '32px', width: '90%', maxWidth: '400px',
          border: `1px solid ${theme === 'dark' ? '#2a3144' : '#e2e8f0'}`,
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)', textAlign: 'center'
        }}
      >
        <h2 style={{ fontSize: '22px', fontWeight: 700, color: theme === 'dark' ? '#fff' : '#1a1f2e', marginBottom: '16px' }}>
          {t('logoutModalTitle')}
        </h2>
        <p style={{ fontSize: '16px', color: theme === 'dark' ? '#8b92a7' : '#64748b', marginBottom: '32px' }}>
          {t('confirmLogout')}
        </p>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => setIsConfirmOpen(false)}
            style={{
              flex: 1, padding: '14px', borderRadius: '12px', fontSize: '16px', fontWeight: 600,
              background: theme === 'dark' ? '#1a1f2e' : '#f1f5f9',
              color: theme === 'dark' ? '#e2e8f0' : '#1e293b',
              border: `1px solid ${theme === 'dark' ? '#2a3144' : '#e2e8f0'}`,
              cursor: 'pointer'
            }}
          >
            {t('noBtn')}
          </button>
          <button
            onClick={handleLogoutConfirm}
            style={{
              flex: 1, padding: '14px', border: 'none', borderRadius: '12px',
              fontSize: '16px', fontWeight: 600,
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              color: '#fff', cursor: 'pointer'
            }}
          >
            {t('yesBtn')}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div
        onMouseEnter={() => setHoveredSetting(idx)}
        onMouseLeave={() => setHoveredSetting(null)}
        onClick={() => setIsConfirmOpen(true)}
        style={{
          background: theme === 'dark'
            ? 'linear-gradient(135deg, #1a1f2e 0%, #252b3d 100%)'
            : 'linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%)',
          borderRadius: '16px', padding: '20px', cursor: 'pointer',
          transition: 'all 0.3s ease',
          border: hoveredSetting === idx
            ? '1px solid #667eea'
            : `1px solid ${theme === 'dark' ? '#2a3144' : '#e2e8f0'}`,
          transform: hoveredSetting === idx ? 'translateY(-2px)' : 'translateY(0)',
          boxShadow: hoveredSetting === idx ? '0 8px 24px rgba(102,126,234,0.2)' : 'none',
        }}
      >
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '10px',
            background: 'rgba(239,68,68,0.1)', color: '#ef4444',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            <LogOut size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: '19px', fontWeight: 600, color: '#ef4444' }}>
              {t('logout')}
            </h3>
            <p style={{ fontSize: '13px', color: theme === 'dark' ? '#8b92a7' : '#64748b', marginBottom: 0 }}>
              {t('logoutDescription')}
            </p>
          </div>
          <ChevronRight size={20} color={theme === 'dark' ? '#8b92a7' : '#64748b'}
            style={{ flexShrink: 0, marginTop: '10px' }} />
        </div>
      </div>
      {isConfirmOpen && renderConfirmModal()}
    </>
  );
};

export default Logout;
