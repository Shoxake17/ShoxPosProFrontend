// components/CheckSettings.tsx
import React, { useState, useEffect } from 'react';
import { Receipt, Save, X, Store, MapPin, Type, Maximize2, Phone, FileText } from 'lucide-react';

interface CheckSettingsProps {
  theme: 'dark' | 'light';
  t: (key: string) => string;
  hoveredSetting: string | null;
  setHoveredSetting: (id: string | null) => void;
  idx: string;
  showMessage: (msg: string) => void;
}

interface CheckConfig {
  storeName: string;
  storeAddress: string;
  fontSize: 'small' | 'medium' | 'large';
  checkWidth: number;
  paperSize: '58mm' | '80mm';
  phoneNumber: string;
  inn: string;
}

const CheckSettings: React.FC<CheckSettingsProps> = ({
  theme,
  t,
  hoveredSetting,
  setHoveredSetting,
  idx,
  showMessage
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [config, setConfig] = useState<CheckConfig>({
    storeName: 'SHOXPOSPRO',
    storeAddress: '',
    fontSize: 'medium',
    checkWidth: 32,
    paperSize: '58mm',
    phoneNumber: '+998 90 123 45 67',
    inn: '123456789'
  });

  // Sozlamalarni yuklash
  useEffect(() => {
    const saved = localStorage.getItem('checkSettings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setConfig({
          storeName: parsed.storeName || 'SHOXPOS PRO',
          storeAddress: parsed.storeAddress || '',
          fontSize: parsed.fontSize || 'medium',
          checkWidth: parsed.checkWidth || 32,
          paperSize: parsed.paperSize || '58mm',
          phoneNumber: parsed.phoneNumber || '+998 90 123 45 67',
          inn: parsed.inn || '123456789'
        });
      } catch (e) {
        console.error('Check sozlamalarini yuklashda xato:', e);
      }
    }
  }, []);

  // Sozlamalarni saqlash
  const saveSettings = () => {
    localStorage.setItem('checkSettings', JSON.stringify(config));
    showMessage('Chek sozlamalari saqlandi ✅');
    setIsModalOpen(false);
  };

  // Font o'lchamlari
  const fontSizes = {
    small: { label: 'Kichik', value: 'small' },
    medium: { label: 'O\'rta', value: 'medium' },
    large: { label: 'Katta', value: 'large' }
  };

  // Paper size o'zgartirganda checkWidth ni avtomatik yangilash
  const handlePaperSizeChange = (size: '58mm' | '80mm') => {
    setConfig({
      ...config,
      paperSize: size,
      checkWidth: size === '58mm' ? 32 : 48
    });
  };

  return (
    <>
      {/* Settings Card */}
      <div
        onMouseEnter={() => setHoveredSetting(idx)}
        onMouseLeave={() => setHoveredSetting(null)}
        onClick={() => setIsModalOpen(true)}
        style={{
          background: theme === 'dark' 
            ? 'linear-gradient(135deg, #1a1f2e 0%, #252b3d 100%)' 
            : 'linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%)',
          borderRadius: '16px',
          padding: '20px',
          border: hoveredSetting === idx ? '1px solid #667eea' : `1px solid ${theme === 'dark' ? '#2a3144' : '#e2e8f0'}`,
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          transform: hoveredSetting === idx ? 'translateY(-2px)' : 'translateY(0)',
          boxShadow: hoveredSetting === idx ? '0 8px 24px rgba(102,126,234,0.2)' : 'none'
        }}
      >
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: theme === 'dark' ? 'rgba(102,126,234,0.1)' : 'rgba(79,70,229,0.1)',
            color: '#667eea',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Receipt size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: '19px', fontWeight: 600, color: theme === 'dark' ? '#fff' : '#1a1f2e' }}>
              Chek sozlamalari
            </h3>
            <p style={{ fontSize: '13px', color: theme === 'dark' ? '#8b92a7' : '#64748b', marginBottom: '8px' }}>
              Do'kon nomi, manzil va chek parametrlarini sozlash
            </p>
            <span style={{
              display: 'inline-block',
              padding: '4px 12px',
              borderRadius: '6px',
              background: theme === 'dark' ? '#0f1420' : '#f1f5f9',
              fontSize: '12px',
              color: '#4caf50',
              fontWeight: 500
            }}>
              {config.storeName || 'SHOXPOSPRO'} • {config.paperSize}
            </span>
          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
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
          onClick={() => setIsModalOpen(false)}
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
              maxWidth: '700px',
              maxHeight: '90vh',
              overflowY: 'auto',
              border: `1px solid ${theme === 'dark' ? '#2a3144' : '#e2e8f0'}`,
              boxShadow: '0 20px 60px rgba(0,0,0,0.4)'
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 700, color: theme === 'dark' ? '#fff' : '#1a1f2e', margin: 0 }}>
                🖨️ Chek sozlamalari
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: theme === 'dark' ? '#8b92a7' : '#64748b'
                }}
              >
                <X size={24} />
              </button>
            </div>

            {/* Printer razmeri */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                fontWeight: 600,
                color: theme === 'dark' ? '#e2e8f0' : '#1e293b',
                marginBottom: '12px'
              }}>
                <Maximize2 size={16} />
                Printer razmeri
              </label>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div
                  onClick={() => handlePaperSizeChange('58mm')}
                  style={{
                    flex: 1,
                    padding: '20px',
                    borderRadius: '12px',
                    background: config.paperSize === '58mm'
                      ? (theme === 'dark' ? 'rgba(102,126,234,0.15)' : 'rgba(79,70,229,0.1)')
                      : (theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)'),
                    border: config.paperSize === '58mm'
                      ? '2px solid #667eea'
                      : `1px solid ${theme === 'dark' ? '#2a3144' : '#e2e8f0'}`,
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.2s',
                    color: theme === 'dark' ? '#fff' : '#1a1f2e'
                  }}
                >
                  <div style={{ fontSize: '20px', fontWeight: 700, marginBottom: '4px' }}>58mm</div>
                  <div style={{ fontSize: '12px', color: theme === 'dark' ? '#8b92a7' : '#64748b' }}>
                    32 belgi
                  </div>
                  <div style={{ fontSize: '11px', color: theme === 'dark' ? '#6b7280' : '#9ca3af', marginTop: '4px' }}>
                    Kichik printer
                  </div>
                </div>
                <div
                  onClick={() => handlePaperSizeChange('80mm')}
                  style={{
                    flex: 1,
                    padding: '20px',
                    borderRadius: '12px',
                    background: config.paperSize === '80mm'
                      ? (theme === 'dark' ? 'rgba(102,126,234,0.15)' : 'rgba(79,70,229,0.1)')
                      : (theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)'),
                    border: config.paperSize === '80mm'
                      ? '2px solid #667eea'
                      : `1px solid ${theme === 'dark' ? '#2a3144' : '#e2e8f0'}`,
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.2s',
                    color: theme === 'dark' ? '#fff' : '#1a1f2e'
                  }}
                >
                  <div style={{ fontSize: '20px', fontWeight: 700, marginBottom: '4px' }}>80mm</div>
                  <div style={{ fontSize: '12px', color: theme === 'dark' ? '#8b92a7' : '#64748b' }}>
                    48 belgi
                  </div>
                  <div style={{ fontSize: '11px', color: theme === 'dark' ? '#6b7280' : '#9ca3af', marginTop: '4px' }}>
                    Standart printer
                  </div>
                </div>
              </div>
            </div>

            {/* Ikki ustunli grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              {/* Do'kon nomi */}
              <div>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: theme === 'dark' ? '#e2e8f0' : '#1e293b',
                  marginBottom: '8px'
                }}>
                  <Store size={16} />
                  Do'kon nomi
                </label>
                <input
                  type="text"
                  value={config.storeName}
                  onChange={(e) => setConfig({ ...config, storeName: e.target.value })}
                  placeholder="SHOXPOSPRO"
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    borderRadius: '12px',
                    background: theme === 'dark' ? '#0f1420' : '#f8f9ff',
                    border: `1px solid ${theme === 'dark' ? '#2a3144' : '#e2e8f0'}`,
                    color: theme === 'dark' ? '#fff' : '#1a1f2e',
                    fontSize: '15px',
                    outline: 'none',
                    transition: 'all 0.2s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#667eea'}
                  onBlur={(e) => e.target.style.borderColor = theme === 'dark' ? '#2a3144' : '#e2e8f0'}
                />
              </div>

             
            </div>

            {/* Do'kon manzili - to'liq kenglik */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                fontWeight: 600,
                color: theme === 'dark' ? '#e2e8f0' : '#1e293b',
                marginBottom: '8px'
              }}>
                <MapPin size={16} />
                Do'kon manzili
              </label>
              <input
                type="text"
                value={config.storeAddress}
                onChange={(e) => setConfig({ ...config, storeAddress: e.target.value })}
                placeholder="Toshkent sh., Yunusobod t., Amir Temur ko'ch., 1-uy"
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  background: theme === 'dark' ? '#0f1420' : '#f8f9ff',
                  border: `1px solid ${theme === 'dark' ? '#2a3144' : '#e2e8f0'}`,
                  color: theme === 'dark' ? '#fff' : '#1a1f2e',
                  fontSize: '15px',
                  outline: 'none',
                  transition: 'all 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = theme === 'dark' ? '#2a3144' : '#e2e8f0'}
              />
            </div>

                    {/* Font o'lchami */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                fontWeight: 600,
                color: theme === 'dark' ? '#e2e8f0' : '#1e293b',
                marginBottom: '12px'
              }}>
                <Type size={16} />
                Matn o'lchami
              </label>
              <div style={{ display: 'flex', gap: '12px' }}>
                {Object.entries(fontSizes).map(([key, { label, value }]) => (
                  <div
                    key={key}
                    onClick={() => setConfig({ ...config, fontSize: value as 'small' | 'medium' | 'large' })}
                    style={{
                      flex: 1,
                      padding: '16px',
                      borderRadius: '12px',
                      background: config.fontSize === value
                        ? (theme === 'dark' ? 'rgba(102,126,234,0.15)' : 'rgba(79,70,229,0.1)')
                        : (theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)'),
                      border: config.fontSize === value
                        ? '2px solid #667eea'
                        : `1px solid ${theme === 'dark' ? '#2a3144' : '#e2e8f0'}`,
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.2s',
                      color: theme === 'dark' ? '#fff' : '#1a1f2e',
                      fontWeight: config.fontSize === value ? 600 : 400
                    }}
                  >
                    {label}
                  </div>
                ))}
              </div>
            </div>

            {/* Preview */}
            <div style={{
              padding: '20px',
              borderRadius: '12px',
              background: theme === 'dark' ? '#0f1420' : '#f8f9ff',
              border: `1px solid ${theme === 'dark' ? '#2a3144' : '#e2e8f0'}`,
              marginBottom: '24px'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px',
                paddingBottom: '12px',
                borderBottom: `1px solid ${theme === 'dark' ? '#2a3144' : '#e2e8f0'}`
              }}>
                <span style={{ fontSize: '14px', color: theme === 'dark' ? '#8b92a7' : '#64748b', fontWeight: 600 }}>
                  📄 Chek ko'rinishi
                </span>
                <span style={{ fontSize: '12px', color: '#667eea' }}>
                  {config.paperSize} • {config.checkWidth} belgi
                </span>
              </div>
              <div style={{
                fontFamily: 'monospace',
                fontSize: config.fontSize === 'small' ? '10px' : config.fontSize === 'large' ? '14px' : '12px',
                color: theme === 'dark' ? '#e2e8f0' : '#1e293b',
                whiteSpace: 'pre',
                textAlign: 'center',
                lineHeight: '1.8',
                padding: '12px',
                background: theme === 'dark' ? '#1a1f2e' : '#fff',
                borderRadius: '8px'
              }}>
                {config.storeName || 'SHOXPOSPRO'}
                {'\n'}
                {config.storeAddress && `${config.storeAddress}\n`}
                {'\n'}
                {'09.02.2026  14:30:45\n'}
                {'='.repeat(Math.min(config.checkWidth, 32))}
                {'\nMAHSULOT            SUMMA\n'}
                {'-'.repeat(Math.min(config.checkWidth, 32))}
                {'\n1. Mahsulot nomi\n'}
                {'   2 x 50 000     100 000\n'}
                {'='.repeat(Math.min(config.checkWidth, 32))}
                {'\nOraliq summa:      100 000\n'}
                {'QQS (0%):                0\n'}
                {'-'.repeat(Math.min(config.checkWidth, 24))}
                {'\nJAMI:              100 000\n'}
                {'                    so\'m\n'}
                {'Xaridingiz uchun raxmat!'}
              </div>
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{
                  flex: 1,
                  padding: '14px',
                  background: theme === 'dark' ? '#1a1f2e' : '#f1f5f9',
                  color: theme === 'dark' ? '#e2e8f0' : '#1e293b',
                  border: `1px solid ${theme === 'dark' ? '#2a3144' : '#e2e8f0'}`,
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Bekor qilish
              </button>
              <button
                onClick={saveSettings}
                style={{
                  flex: 1,
                  padding: '14px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <Save size={18} />
                Saqlash
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CheckSettings;