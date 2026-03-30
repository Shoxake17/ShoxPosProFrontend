// components/settings/Theme.tsx
import React, { useEffect } from 'react';
import { Moon, Sun, ChevronRight } from 'lucide-react';

interface ThemeProps {
  theme: 'dark' | 'light';
  t: (key: string) => string;
  setTheme: (theme: 'dark' | 'light') => void;
  hoveredSetting: string | null;
  setHoveredSetting: (val: string | null) => void;
  idx: string;
}

export default function Theme({
  theme,
  t,
  setTheme,
  hoveredSetting,
  setHoveredSetting,
  idx
}: ThemeProps) {

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const isHovered = hoveredSetting === idx;
  const Icon = theme === 'dark' ? Moon : Sun;

  return (
    <div
      onMouseEnter={() => setHoveredSetting(idx)}
      onMouseLeave={() => setHoveredSetting(null)}
      onClick={toggleTheme}
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

        {/* Icon */}
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '10px',
          background: theme === 'dark' ? 'rgba(102,126,234,0.1)' : 'rgba(79,70,229,0.1)',
          color: '#667eea',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Icon size={20} />
        </div>

        {/* Matn — Notification bilan aynan bir xil joylashuv */}
        <div style={{ flex: 1 }}>
          <h3 style={{
            fontSize: '19px',
            fontWeight: 600,
            color: theme === 'dark' ? '#fff' : '#1a1f2e',
          }}>
            {t('theme')}
          </h3>
          <p style={{
            fontSize: '13px',
            color: theme === 'dark' ? '#8b92a7' : '#64748b',
            marginBottom: '8px',
          }}>
            {t('themeDescription')}
          </p>
          <span style={{
            display: 'inline-block',
            padding: '4px 12px',
            borderRadius: '6px',
            background: theme === 'dark' ? '#0f1420' : '#f1f5f9',
            fontSize: '12px',
            color: '#667eea',
            fontWeight: 500,
          }}>
            {theme === 'dark' ? t('dark') : t('light')}
          </span>
        </div>

        {/* Arrow */}
        <ChevronRight
          size={20}
          color={theme === 'dark' ? '#8b92a7' : '#64748b'}
          style={{ flexShrink: 0, marginTop: '10px' }}
        />
      </div>
    </div>
  );
}