import React, { useState } from 'react';
import { Trash2, ChevronRight } from 'lucide-react';
import { useTranslation } from '../../components/languages/Settings'; // ✅ Yo'lni tekshirings

interface ClearDataProps {
  theme: 'dark' | 'light';
  hoveredSetting: string | null;
  setHoveredSetting: React.Dispatch<React.SetStateAction<string | null>>;
  idx: string;
  showMessage?: (text: string, type?: 'success' | 'error' | 'info') => void;
}

const ClearData: React.FC<ClearDataProps> = ({
  theme,
  hoveredSetting,
  setHoveredSetting,
  idx,
  showMessage
}) => {
  const { t } = useTranslation(); // ✅ Hook orqali tarjimani olamiz
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const handleClear = () => {
    localStorage.clear();
    if (showMessage) {
      showMessage(t("dataCleared"), 'success');
    } else {
      alert(t("dataCleared"));
    }
    setIsConfirmOpen(false);
    // Ma'lumotlar tozalangandan so'ng sahifani yangilash tavsiya etiladi
    window.location.reload(); 
  };

  const openConfirm = () => {
    setIsConfirmOpen(true);
  };

  // Tasdiqlash modali
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
        onClick={(e) => e.stopPropagation()}
        style={{
          background: theme === 'dark' ? 'linear-gradient(135deg, #1a1f2e 0%, #252b3d 100%)' : 'linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%)',
          borderRadius: '24px', padding: '32px', width: '90%', maxWidth: '400px',
          border: `1px solid ${theme === 'dark' ? '#2a3144' : '#e2e8f0'}`,
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)', textAlign: 'center'
        }}
      >
        <h2 style={{ fontSize: '22px', fontWeight: 700, color: theme === 'dark' ? '#fff' : '#1a1f2e', marginBottom: '16px' }}>
          {t('clearDataModalTitle')}
        </h2>
        <p style={{ fontSize: '16px', color: theme === 'dark' ? '#8b92a7' : '#64748b', marginBottom: '32px' }}>
          {t('confirmClear')}
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
            onClick={handleClear}
            style={{
              flex: 1, padding: '14px', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 600,
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
        onClick={openConfirm}
        style={{
          background: theme === 'dark' ? 'linear-gradient(135deg, #1a1f2e 0%, #252b3d 100%)' : 'linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%)',
          borderRadius: '16px', padding: '20px', cursor: 'pointer', transition: 'all 0.3s ease',
          border: hoveredSetting === idx ? '1px solid #667eea' : `1px solid ${theme === 'dark' ? '#2a3144' : '#e2e8f0'}`,
          transform: hoveredSetting === idx ? 'translateY(-2px)' : 'translateY(0)',
          boxShadow: hoveredSetting === idx ? '0 8px 24px rgba(102,126,234,0.2)' : 'none'
        }}
      >
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Trash2 size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: '19px', fontWeight: 600, color: '#ef4444' }}>
              {t('clearData')}
            </h3>
            <p style={{ fontSize: '13px', color: theme === 'dark' ? '#8b92a7' : '#64748b', marginBottom: 0 }}>
              {t('clearDataDescription')}
            </p>
          </div>
          <ChevronRight size={20} color={theme === 'dark' ? '#8b92a7' : '#64748b'} style={{ flexShrink: 0, marginTop: '10px' }} />
        </div>
      </div>
      {isConfirmOpen && renderConfirmModal()}
    </>
  );
};

export default ClearData;