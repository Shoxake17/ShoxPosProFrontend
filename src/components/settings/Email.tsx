// components/settings/Email.tsx
import React from 'react';
import { Mail, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface EmailProps {
  theme: 'dark' | 'light';
  t: (key: string) => string;
  hoveredSetting: string | null;
  setHoveredSetting: React.Dispatch<React.SetStateAction<string | null>>;
  idx: string;
}

const Email: React.FC<EmailProps> = ({
  theme,
  t,
  hoveredSetting,
  setHoveredSetting,
  idx
}) => {
  const navigate = useNavigate();

  const handleClick = () => {
    // Hozircha oddiy redirect (kelajakda email o'zgartirish sahifasiga yoki modal ochilishi mumkin)
    navigate('/signup'); // yoki '/settings/email' yoki boshqa sahifaga
  };

  return (
    <div
      onMouseEnter={() => setHoveredSetting(idx)}
      onMouseLeave={() => setHoveredSetting(null)}
      onClick={handleClick}
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
          <Mail size={20} />
        </div>

        <div style={{ flex: 1 }}>
          <h3 style={{
            fontSize: '19px',
            fontWeight: 600,
            color: theme === 'dark' ? '#fff' : '#1a1f2e'
          }}>
            {t('email')}
          </h3>
          <p style={{
            fontSize: '13px',
            color: theme === 'dark' ? '#8b92a7' : '#64748b',
            marginBottom: 0
          }}>
            {t('emailDescription') || "E-pochtangizni o'zgartirish yoki yangilash"}
          </p>
        </div>

        <ChevronRight
          size={20}
          color={theme === 'dark' ? '#8b92a7' : '#64748b'}
          style={{ flexShrink: 0, marginTop: '10px' }}
        />
      </div>
    </div>
  );
};

export default Email;