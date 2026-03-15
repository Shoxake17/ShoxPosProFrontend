// components/settings/Logout.tsx
import React, { useState } from 'react';
import { LogOut, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface LogoutProps {
  theme: 'dark' | 'light';
  t: (key: string) => string;
  hoveredSetting: string | null;
  setHoveredSetting: React.Dispatch<React.SetStateAction<string | null>>;
  idx: string;
  showMessage?: (text: string, type?: 'success' | 'error' | 'info') => void;
}

const Logout: React.FC<LogoutProps> = ({
  theme,
  t,
  hoveredSetting,
  setHoveredSetting,
  idx,
  showMessage
}) => {
  const navigate = useNavigate();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const handleLogoutConfirm = () => {
    localStorage.clear();
    sessionStorage.clear();
    if (showMessage) {
      showMessage(t('Muvaffaqiyatli chiqdingiz'), 'success');
    }
    setIsConfirmOpen(false);
    setTimeout(() => {
      navigate('/login', { replace: true });
    }, 500);
  };

  const openConfirm = () => {
    setIsConfirmOpen(true);
  };

  // Tasdiqlash modal
  const renderConfirmModal = () => (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        backdropFilter: 'blur(8px)'
      }}
      onClick={() => setIsConfirmOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: theme === 'dark'
            ? 'linear-gradient(135deg, #1a1f2e 0%, #252b3d 100%)'
            : 'linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%)',
          borderRadius: '24px',
          padding: '32px',
          width: '90%',
          maxWidth: '400px',
          border: `1px solid ${theme === 'dark' ? '#2a3144' : '#e2e8f0'}`,
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
          textAlign: 'center'
        }}
      >
        <h2 style={{
          fontSize: '22px',
          fontWeight: 700,
          color: theme === 'dark' ? '#fff' : '#1a1f2e',
          marginBottom: '16px'
        }}>
          {t('Chiqish')}
        </h2>
        <p style={{
          fontSize: '16px',
          color: theme === 'dark' ? '#8b92a7' : '#64748b',
          marginBottom: '32px'
        }}>
          {t('confirmLogout')}
        </p>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => setIsConfirmOpen(false)}
            style={{
              flex: 1,
              padding: '14px',
              background: theme === 'dark' ? '#1a1f2e' : '#f1f5f9',
              color: theme === 'dark' ? '#e2e8f0' : '#1e293b',
              border: `1px solid ${theme === 'dark' ? '#2a3144' : '#e2e8f0'}`,
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: 600
            }}
          >
            Yo'q
          </button>
          <button
            onClick={handleLogoutConfirm}
            style={{
              flex: 1,
              padding: '14px',
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: 600
            }}
          >
            Ha
          </button>
        </div>
      </div>
    </div>
  );

  // Asosiy kartochka
  const renderCard = () => (
    <div
      onMouseEnter={() => setHoveredSetting(idx)}
      onMouseLeave={() => setHoveredSetting(null)}
      onClick={openConfirm}
      style={{
        background: theme === 'dark'
          ? 'linear-gradient(135deg, #1a1f2e 0%, #252b3d 100%)'
          : 'linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%)',
        borderRadius: '16px',
        padding: '20px',
        border: hoveredSetting === idx
          ? '1px solid #667eea'
          : `1px solid ${theme === 'dark' ? '#2a3144' : '#e2e8f0'}`,
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        transform: hoveredSetting === idx ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: hoveredSetting === idx ? '0 8px 24px rgba(102,126,234,0.2)' : 'none',
        color: '#ef4444' // danger rangi
      }}
    >
      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '10px',
          background: 'rgba(239,68,68,0.1)',
          color: '#ef4444',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          <LogOut size={20} />
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{
            fontSize: '19px',
            fontWeight: 600,
            color: '#ef4444'
          }}>
            {t('logout')}
          </h3>
          <p style={{
            fontSize: '13px',
            color: theme === 'dark' ? '#8b92a7' : '#64748b',
            marginBottom: 0
          }}>
            {t('logoutDescription')}
          </p>
        </div>
        <ChevronRight size={20} color={theme === 'dark' ? '#8b92a7' : '#64748b'} style={{ flexShrink: 0, marginTop: '10px' }} />
      </div>
    </div>
  );

  return (
    <>
      {renderCard()}
      {isConfirmOpen && renderConfirmModal()}
    </>
  );
};

export default Logout;