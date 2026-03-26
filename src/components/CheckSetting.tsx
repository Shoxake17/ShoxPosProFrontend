// components/CheckSettings.tsx
import React, { useState, useEffect } from 'react';
import { Receipt, Save, X, Store, MapPin, Type, Maximize2 } from 'lucide-react';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
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

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
const DEFAULT_CONFIG: CheckConfig = {
  storeName: 'SHOXPOSPRO',
  storeAddress: '',
  fontSize: 'medium',
  checkWidth: 32,
  paperSize: '58mm',
  phoneNumber: '+998 90 123 45 67',
  inn: '123456789',
};

const FONT_SIZES: { key: 'small' | 'medium' | 'large'; label: string }[] = [
  { key: 'small',  label: 'Kichik' },
  { key: 'medium', label: "O'rta"  },
  { key: 'large',  label: 'Katta'  },
];

const PAPER_SIZES: { value: '58mm' | '80mm'; width: number; desc: string }[] = [
  { value: '58mm', width: 32, desc: 'Kichik printer'   },
  { value: '80mm', width: 48, desc: 'Standart printer' },
];

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
const tc = (theme: 'dark' | 'light', dark: string, light: string) =>
  theme === 'dark' ? dark : light;

const getFontPx = (size: 'small' | 'medium' | 'large') =>
  ({ small: '10px', medium: '12px', large: '14px' }[size]);

const loadConfig = (): CheckConfig => {
  try {
    const saved = localStorage.getItem('checkSettings');
    if (!saved) return DEFAULT_CONFIG;
    const p = JSON.parse(saved);
    return {
      storeName:    p.storeName    || DEFAULT_CONFIG.storeName,
      storeAddress: p.storeAddress || DEFAULT_CONFIG.storeAddress,
      fontSize:     p.fontSize     || DEFAULT_CONFIG.fontSize,
      checkWidth:   p.checkWidth   || DEFAULT_CONFIG.checkWidth,
      paperSize:    p.paperSize    || DEFAULT_CONFIG.paperSize,
      phoneNumber:  p.phoneNumber  || DEFAULT_CONFIG.phoneNumber,
      inn:          p.inn          || DEFAULT_CONFIG.inn,
    };
  } catch {
    return DEFAULT_CONFIG;
  }
};

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

/** Sozlamalar kartasi (modal ochish tugmasi) */
const SettingsCard: React.FC<{
  theme: 'dark' | 'light';
  isHovered: boolean;
  config: CheckConfig;
  onHoverEnter: () => void;
  onHoverLeave: () => void;
  onClick: () => void;
}> = ({ theme, isHovered, config, onHoverEnter, onHoverLeave, onClick }) => (
  <div
    onMouseEnter={onHoverEnter}
    onMouseLeave={onHoverLeave}
    onClick={onClick}
    style={{
      background: tc(theme,
        'linear-gradient(135deg, #1a1f2e 0%, #252b3d 100%)',
        'linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%)'
      ),
      borderRadius: '16px',
      padding: '20px',
      border: isHovered ? '1px solid #667eea' : `1px solid ${tc(theme, '#2a3144', '#e2e8f0')}`,
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
      boxShadow: isHovered ? '0 8px 24px rgba(102,126,234,0.2)' : 'none',
    }}
  >
    <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
      <div style={{
        width: '40px', height: '40px', borderRadius: '10px',
        background: tc(theme, 'rgba(102,126,234,0.1)', 'rgba(79,70,229,0.1)'),
        color: '#667eea', display: 'flex', alignItems: 'center',
        justifyContent: 'center', flexShrink: 0,
      }}>
        <Receipt size={20} />
      </div>
      <div style={{ flex: 1 }}>
        <h3 style={{ fontSize: '19px', fontWeight: 600, color: tc(theme, '#fff', '#1a1f2e') }}>
          Chek sozlamalari
        </h3>
        <p style={{ fontSize: '13px', color: tc(theme, '#8b92a7', '#64748b'), marginBottom: '8px' }}>
          Do'kon nomi, manzil va chek parametrlarini sozlash
        </p>
        <span style={{
          display: 'inline-block', padding: '4px 12px', borderRadius: '6px',
          background: tc(theme, '#0f1420', '#f1f5f9'),
          fontSize: '12px', color: '#4caf50', fontWeight: 500,
        }}>
          {config.storeName || 'SHOXPOSPRO'} • {config.paperSize}
        </span>
      </div>
    </div>
  </div>
);

/** Qog'oz o'lchami tanlash */
const PaperSizeSelector: React.FC<{
  theme: 'dark' | 'light';
  selected: '58mm' | '80mm';
  onChange: (size: '58mm' | '80mm') => void;
}> = ({ theme, selected, onChange }) => (
  <div style={{ marginBottom: '24px' }}>
    <label style={{
      display: 'flex', alignItems: 'center', gap: '8px',
      fontSize: '14px', fontWeight: 600,
      color: tc(theme, '#e2e8f0', '#1e293b'), marginBottom: '12px',
    }}>
      <Maximize2 size={16} /> Printer razmeri
    </label>
    <div style={{ display: 'flex', gap: '12px' }}>
      {PAPER_SIZES.map(({ value, width, desc }) => {
        const isSelected = selected === value;
        return (
          <div
            key={value}
            onClick={() => onChange(value)}
            style={{
              flex: 1, padding: '20px', borderRadius: '12px', cursor: 'pointer',
              textAlign: 'center', transition: 'all 0.2s',
              color: tc(theme, '#fff', '#1a1f2e'),
              background: isSelected
                ? tc(theme, 'rgba(102,126,234,0.15)', 'rgba(79,70,229,0.1)')
                : tc(theme, 'rgba(255,255,255,0.05)', 'rgba(0,0,0,0.02)'),
              border: isSelected ? '2px solid #667eea'
                : `1px solid ${tc(theme, '#2a3144', '#e2e8f0')}`,
            }}
          >
            <div style={{ fontSize: '20px', fontWeight: 700, marginBottom: '4px' }}>{value}</div>
            <div style={{ fontSize: '12px', color: tc(theme, '#8b92a7', '#64748b') }}>
              {width} belgi
            </div>
            <div style={{ fontSize: '11px', color: tc(theme, '#6b7280', '#9ca3af'), marginTop: '4px' }}>
              {desc}
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

/** Font o'lchami tanlash */
const FontSizeSelector: React.FC<{
  theme: 'dark' | 'light';
  selected: 'small' | 'medium' | 'large';
  onChange: (size: 'small' | 'medium' | 'large') => void;
}> = ({ theme, selected, onChange }) => (
  <div style={{ marginBottom: '24px' }}>
    <label style={{
      display: 'flex', alignItems: 'center', gap: '8px',
      fontSize: '14px', fontWeight: 600,
      color: tc(theme, '#e2e8f0', '#1e293b'), marginBottom: '12px',
    }}>
      <Type size={16} /> Matn o'lchami
    </label>
    <div style={{ display: 'flex', gap: '12px' }}>
      {FONT_SIZES.map(({ key, label }) => {
        const isSelected = selected === key;
        return (
          <div
            key={key}
            onClick={() => onChange(key)}
            style={{
              flex: 1, padding: '16px', borderRadius: '12px', cursor: 'pointer',
              textAlign: 'center', transition: 'all 0.2s',
              color: tc(theme, '#fff', '#1a1f2e'),
              fontWeight: isSelected ? 600 : 400,
              background: isSelected
                ? tc(theme, 'rgba(102,126,234,0.15)', 'rgba(79,70,229,0.1)')
                : tc(theme, 'rgba(255,255,255,0.05)', 'rgba(0,0,0,0.02)'),
              border: isSelected ? '2px solid #667eea'
                : `1px solid ${tc(theme, '#2a3144', '#e2e8f0')}`,
            }}
          >
            {label}
          </div>
        );
      })}
    </div>
  </div>
);

/** Text input field */
const FieldInput: React.FC<{
  theme: 'dark' | 'light';
  icon: React.ReactNode;
  label: string;
  value: string;
  placeholder: string;
  onChange: (val: string) => void;
}> = ({ theme, icon, label, value, placeholder, onChange }) => (
  <div>
    <label style={{
      display: 'flex', alignItems: 'center', gap: '8px',
      fontSize: '14px', fontWeight: 600,
      color: tc(theme, '#e2e8f0', '#1e293b'), marginBottom: '8px',
    }}>
      {icon} {label}
    </label>
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: '100%', padding: '14px 16px', borderRadius: '12px',
        background: tc(theme, '#0f1420', '#f8f9ff'),
        border: `1px solid ${tc(theme, '#2a3144', '#e2e8f0')}`,
        color: tc(theme, '#fff', '#1a1f2e'),
        fontSize: '15px', outline: 'none', transition: 'all 0.2s',
      }}
      onFocus={(e)  => (e.target.style.borderColor = '#667eea')}
      onBlur={(e)   => (e.target.style.borderColor = tc(theme, '#2a3144', '#e2e8f0'))}
    />
  </div>
);

/** Chek preview */
const CheckPreview: React.FC<{
  theme: 'dark' | 'light';
  config: CheckConfig;
}> = ({ theme, config }) => {
  const w = Math.min(config.checkWidth, 32);
  const preview = [
    config.storeName || 'SHOXPOSPRO',
    config.storeAddress ? `${config.storeAddress}\n` : '',
    '09.02.2026  14:30:45',
    '='.repeat(w),
    'MAHSULOT            SUMMA',
    '-'.repeat(w),
    '1. Mahsulot nomi',
    '   2 x 50 000     100 000',
    '='.repeat(w),
    'Oraliq summa:      100 000',
    'QQS (0%):                0',
    '-'.repeat(Math.min(config.checkWidth, 24)),
    "JAMI:              100 000",
    "                    so'm",
    'Xaridingiz uchun raxmat!',
  ].join('\n');

  return (
    <div style={{
      padding: '20px', borderRadius: '12px', marginBottom: '24px',
      background: tc(theme, '#0f1420', '#f8f9ff'),
      border: `1px solid ${tc(theme, '#2a3144', '#e2e8f0')}`,
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        marginBottom: '16px', paddingBottom: '12px',
        borderBottom: `1px solid ${tc(theme, '#2a3144', '#e2e8f0')}`,
      }}>
        <span style={{ fontSize: '14px', color: tc(theme, '#8b92a7', '#64748b'), fontWeight: 600 }}>
          📄 Chek ko'rinishi
        </span>
        <span style={{ fontSize: '12px', color: '#667eea' }}>
          {config.paperSize} • {config.checkWidth} belgi
        </span>
      </div>
      <div style={{
        fontFamily: 'monospace', fontSize: getFontPx(config.fontSize),
        color: tc(theme, '#e2e8f0', '#1e293b'),
        whiteSpace: 'pre', textAlign: 'center', lineHeight: '1.8',
        padding: '12px', borderRadius: '8px',
        background: tc(theme, '#1a1f2e', '#fff'),
      }}>
        {preview}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────
const CheckSettings: React.FC<CheckSettingsProps> = ({
  theme, hoveredSetting, setHoveredSetting, idx, showMessage,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [config, setConfig] = useState<CheckConfig>(DEFAULT_CONFIG);

  useEffect(() => {
    setConfig(loadConfig());
  }, []);

  const updateConfig = (partial: Partial<CheckConfig>) =>
    setConfig((prev) => ({ ...prev, ...partial }));

  const handlePaperSizeChange = (size: '58mm' | '80mm') => {
    const paperDefs = PAPER_SIZES.find((p) => p.value === size);
    updateConfig({ paperSize: size, checkWidth: paperDefs?.width ?? 32 });
  };

  const saveSettings = () => {
    localStorage.setItem('checkSettings', JSON.stringify(config));
    showMessage('Chek sozlamalari saqlandi ✅');
    setIsModalOpen(false);
  };

  return (
    <>
      <SettingsCard
        theme={theme}
        isHovered={hoveredSetting === idx}
        config={config}
        onHoverEnter={() => setHoveredSetting(idx)}
        onHoverLeave={() => setHoveredSetting(null)}
        onClick={() => setIsModalOpen(true)}
      />

      {isModalOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, backdropFilter: 'blur(8px)',
          }}
          onClick={() => setIsModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: tc(theme,
                'linear-gradient(135deg, #1a1f2e 0%, #252b3d 100%)',
                'linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%)'
              ),
              borderRadius: '24px', padding: '32px',
              width: '90%', maxWidth: '700px',
              maxHeight: '90vh', overflowY: 'auto',
              border: `1px solid ${tc(theme, '#2a3144', '#e2e8f0')}`,
              boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
            }}
          >
            {/* Header */}
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', marginBottom: '24px',
            }}>
              <h2 style={{
                fontSize: '24px', fontWeight: 700, margin: 0,
                color: tc(theme, '#fff', '#1a1f2e'),
              }}>
                🖨️ Chek sozlamalari
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  color: tc(theme, '#8b92a7', '#64748b'),
                }}
              >
                <X size={24} />
              </button>
            </div>

            {/* Paper size */}
            <PaperSizeSelector
              theme={theme}
              selected={config.paperSize}
              onChange={handlePaperSizeChange}
            />

            {/* Do'kon nomi */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <FieldInput
                theme={theme}
                icon={<Store size={16} />}
                label="Do'kon nomi"
                value={config.storeName}
                placeholder="SHOXPOSPRO"
                onChange={(val) => updateConfig({ storeName: val })}
              />
            </div>

            {/* Manzil */}
            <div style={{ marginBottom: '24px' }}>
              <FieldInput
                theme={theme}
                icon={<MapPin size={16} />}
                label="Do'kon manzili"
                value={config.storeAddress}
                placeholder="Toshkent sh., Yunusobod t., Amir Temur ko'ch., 1-uy"
                onChange={(val) => updateConfig({ storeAddress: val })}
              />
            </div>

            {/* Font size */}
            <FontSizeSelector
              theme={theme}
              selected={config.fontSize}
              onChange={(val) => updateConfig({ fontSize: val })}
            />

            {/* Preview */}
            <CheckPreview theme={theme} config={config} />

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{
                  flex: 1, padding: '14px', borderRadius: '12px',
                  background: tc(theme, '#1a1f2e', '#f1f5f9'),
                  color: tc(theme, '#e2e8f0', '#1e293b'),
                  border: `1px solid ${tc(theme, '#2a3144', '#e2e8f0')}`,
                  fontSize: '16px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                }}
              >
                Bekor qilish
              </button>
              <button
                onClick={saveSettings}
                style={{
                  flex: 1, padding: '14px', borderRadius: '12px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: '#fff', border: 'none',
                  fontSize: '16px', fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  transition: 'all 0.2s',
                }}
              >
                <Save size={18} /> Saqlash
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CheckSettings;