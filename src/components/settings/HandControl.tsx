import React, { useState } from 'react';
import { HandMetal, ChevronRight } from 'lucide-react';
import { toast } from 'react-toastify';
// ✅ Tarjima hookini import qilamiz
import { useTranslation } from '../languages/Settings'; 

interface HandControlProps {
  theme: 'dark' | 'light';
  hoveredSetting: string | null;
  setHoveredSetting: (idx: string | null) => void;
  idx: string;
}

const HandControl: React.FC<HandControlProps> = ({ theme, hoveredSetting, setHoveredSetting, idx }) => {
  // ✅ Tarjima funksiyasini chaqiramiz
  const { t } = useTranslation();

  const [isEnabled, setIsEnabled] = useState(() => {
    return localStorage.getItem('handControlEnabled') === 'true';
  });

  const toggleHandControl = () => {
    const newState = !isEnabled;
    setIsEnabled(newState);
    localStorage.setItem('handControlEnabled', String(newState));
    
    window.dispatchEvent(new Event('handControlUpdate'));
    
    if (newState) {
      // ✅ Toast xabari tarjima qilindi
      toast.success(t('handControlEnabled'));
    } else {
      // ✅ Toast xabari tarjima qilindi
      toast.info(t('handControlDisabled'));
    }
  };

  const isHovered = hoveredSetting === idx;

  return (
    <div
      onMouseEnter={() => setHoveredSetting(idx)}
      onMouseLeave={() => setHoveredSetting(null)}
      onClick={toggleHandControl}
      style={{ 
        background: theme === 'dark' ? 'linear-gradient(135deg, #1a1f2e 0%, #252b3d 100%)' : 'linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%)', 
        borderRadius: '16px', 
        padding: '20px', 
        border: isHovered ? '1px solid #667eea' : `1px solid ${theme === 'dark' ? '#2a3144' : '#e2e8f0'}`, 
        cursor: 'pointer', 
        transition: 'all 0.3s ease', 
        transform: isHovered ? 'translateY(-2px)' : 'translateY(0)', 
        boxShadow: isHovered ? '0 8px 24px rgba(102,126,234,0.2)' : 'none' 
      }}
    >
      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
        <div style={{ 
          width: '40px', height: '40px', borderRadius: '10px', 
          background: theme === 'dark' ? 'rgba(102,126,234,0.1)' : 'rgba(79,70,229,0.1)', 
          color: '#667eea', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 
        }}>
          <HandMetal size={20} />
        </div>
        
        <div style={{ flex: 1 }}>
          {/* ✅ Sarlavha tarjima qilindi */}
          <h3 style={{ fontSize: '19px', fontWeight: 600, color: theme === 'dark' ? '#fff' : '#1a1f2e' }}>
            {t('handControlTitle')}
          </h3>
          {/* ✅ Tavsif tarjima qilindi */}
          <p style={{ fontSize: '13px', color: theme === 'dark' ? '#8b92a7' : '#64748b', marginBottom: '8px' }}>
            {t('handControlDescription')}
          </p>
          <span style={{ 
            display: 'inline-block', padding: '4px 12px', borderRadius: '6px', 
            background: theme === 'dark' ? '#0f1420' : '#f1f5f9', fontSize: '12px', 
            color: isEnabled ? '#4caf50' : '#ef4444', 
            fontWeight: 500 
          }}>
            {/* ✅ Holat tarjima qilindi (Yoqilgan/O'chirilgan) */}
            {isEnabled ? t('enabledStatus') : t('disabledStatus')}
          </span>
        </div>
        
        <ChevronRight size={20} color={theme === 'dark' ? '#8b92a7' : '#64748b'} style={{ flexShrink: 0, marginTop: '10px' }} />
      </div>
    </div>
  );
};

export default HandControl;