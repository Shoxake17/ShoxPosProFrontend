import React, { useState } from 'react';
import { Trash2, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation(['settings', 'common']);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const handleClear = async () => {
    setIsClearing(true);

    try {
      // 1. LocalStorage
      localStorage.clear();

      // 2. SessionStorage
      sessionStorage.clear();

      // 3. IndexedDB — barcha bazalarni o'chirish
      try {
        const databases = await indexedDB.databases();
        await Promise.all(
          databases.map(
            (db) =>
              new Promise<void>((resolve) => {
                if (!db.name) return resolve();
                const req = indexedDB.deleteDatabase(db.name);
                req.onsuccess = () => resolve();
                req.onerror   = () => resolve(); // xato bo'lsa ham davom etsin
                req.onblocked = () => resolve(); // blocked bo'lsa ham davom etsin
              })
          )
        );
      } catch (err) {
        console.error('IndexedDB tozalashda xato:', err);
      }

      // 4. Cache Storage (PWA cache)
      try {
        if ('caches' in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((key) => caches.delete(key)));
        }
      } catch (err) {
        console.error('Cache tozalashda xato:', err);
      }

      if (showMessage) {
        showMessage(t('dataCleared'), 'success');
      } else {
        alert(t('dataCleared'));
      }

      setIsConfirmOpen(false);
      window.location.reload();

    } catch (err) {
      console.error('Tozalashda xato:', err);
      if (showMessage) {
        showMessage('Xato yuz berdi', 'error');
      }
    } finally {
      setIsClearing(false);
    }
  };

  const renderConfirmModal = () => (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, backdropFilter: 'blur(8px)'
      }}
      onClick={() => !isClearing && setIsConfirmOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: theme === 'dark'
            ? 'linear-gradient(135deg, #1a1f2e 0%, #252b3d 100%)'
            : 'linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%)',
          borderRadius: '24px', padding: '32px', width: '90%', maxWidth: '400px',
          border: `1px solid ${theme === 'dark' ? '#2a3144' : '#e2e8f0'}`,
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)', textAlign: 'center'
        }}
      >
        {/* Icon */}
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: 'rgba(239,68,68,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px'
        }}>
          <Trash2 size={28} color="#ef4444" />
        </div>

        <h2 style={{
          fontSize: '22px', fontWeight: 700,
          color: theme === 'dark' ? '#fff' : '#1a1f2e',
          marginBottom: '12px'
        }}>
          {t('clearDataModalTitle')}
        </h2>

        <p style={{
          fontSize: '14px',
          color: theme === 'dark' ? '#8b92a7' : '#64748b',
          marginBottom: '12px', lineHeight: 1.6
        }}>
          {t('confirmClear')}
        </p>

        

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => setIsConfirmOpen(false)}
            disabled={isClearing}
            style={{
              flex: 1, padding: '14px', borderRadius: '12px',
              fontSize: '15px', fontWeight: 600,
              background: theme === 'dark' ? '#1a1f2e' : '#f1f5f9',
              color: theme === 'dark' ? '#e2e8f0' : '#1e293b',
              border: `1px solid ${theme === 'dark' ? '#2a3144' : '#e2e8f0'}`,
              cursor: isClearing ? 'not-allowed' : 'pointer',
              opacity: isClearing ? 0.5 : 1,
            }}
          >
            {t('noBtn')}
          </button>
          <button
            onClick={handleClear}
            disabled={isClearing}
            style={{
              flex: 1, padding: '14px', border: 'none',
              borderRadius: '12px', fontSize: '15px', fontWeight: 600,
              background: isClearing
                ? 'rgba(239,68,68,0.5)'
                : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              color: '#fff',
              cursor: isClearing ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'all 0.2s'
            }}
          >
            {isClearing ? (
              <>
                <span style={{
                  width: 16, height: 16, border: '2px solid #fff',
                  borderTopColor: 'transparent', borderRadius: '50%',
                  display: 'inline-block',
                  animation: 'spin 0.7s linear infinite'
                }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                O'chirilmoqda...
              </>
            ) : t('yesBtn')}
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
          boxShadow: hoveredSetting === idx ? '0 8px 24px rgba(102,126,234,0.2)' : 'none'
        }}
      >
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '10px',
            background: 'rgba(239,68,68,0.1)', color: '#ef4444',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
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
          <ChevronRight
            size={20}
            color={theme === 'dark' ? '#8b92a7' : '#64748b'}
            style={{ flexShrink: 0, marginTop: '10px' }}
          />
        </div>
      </div>

      {isConfirmOpen && renderConfirmModal()}
    </>
  );
};

export default ClearData;
