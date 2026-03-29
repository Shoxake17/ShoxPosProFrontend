// components/settings/Languages.tsx
import React, { useState } from 'react';
import { Globe, ChevronRight, X, Check } from 'lucide-react';

interface LanguagesProps {
  theme: 'dark' | 'light';
  t: (key: string) => string;
  language: string;
  setLanguage: (lang: any) => void;
  hoveredSetting: string | null;
  setHoveredSetting: (val: string | null) => void;
  idx: string;
}

const Languages: React.FC<LanguagesProps> = ({
  theme,
  t,
  language,
  setLanguage,
  hoveredSetting,
  setHoveredSetting,
  idx
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const languages = [
    { code: 'uz', name: "O'zbek", nativeName: "O'zbek" },
    { code: 'ru', name: 'Русский', nativeName: 'Русский' },
    { code: 'en', name: 'English', nativeName: 'English' }
  ];

  const currentLangLabel =
    language === 'uz' ? "O'zbek" :
    language === 'ru' ? "Русский" : "English";

  const isHovered = hoveredSetting === idx;

  return (
    <>
      {/* Kartochka */}
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
            <Globe size={20} />
          </div>

          {/* Matn — Notification bilan aynan bir xil */}
          <div style={{ flex: 1 }}>
            <h3 style={{
              fontSize: '19px',
              fontWeight: 600,
              color: theme === 'dark' ? '#fff' : '#1a1f2e',
            }}>
              {t('language')}
            </h3>
            <p style={{
              fontSize: '13px',
              color: theme === 'dark' ? '#8b92a7' : '#64748b',
              marginBottom: '8px',
            }}>
              {t('languageDescription')}
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
              {currentLangLabel}
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

      {/* Modal */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1100,
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => setIsModalOpen(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: theme === 'dark'
                ? 'linear-gradient(135deg, #1a1f2e 0%, #252b3d 100%)'
                : 'linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%)',
              borderRadius: '24px',
              padding: '32px',
              width: '90%',
              maxWidth: '500px',
              border: `1px solid ${theme === 'dark' ? '#2a3144' : '#e2e8f0'}`,
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{
                fontSize: '24px', fontWeight: 700,
                color: theme === 'dark' ? '#fff' : '#1a1f2e',
                margin: 0,
              }}>
                {t('selectLanguage')}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: theme === 'dark' ? '#8b92a7' : '#64748b' }}
              >
                <X size={24} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {languages.map(lang => (
                <div
                  key={lang.code}
                  onClick={() => { setLanguage(lang.code); setIsModalOpen(false); }}
                  style={{
                    padding: '16px 20px',
                    borderRadius: '12px',
                    background: language === lang.code
                      ? (theme === 'dark' ? 'rgba(102,126,234,0.15)' : 'rgba(79,70,229,0.1)')
                      : (theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)'),
                    border: language === lang.code
                      ? '2px solid #667eea'
                      : `1px solid ${theme === 'dark' ? '#2a3144' : '#e2e8f0'}`,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '18px', fontWeight: 600, color: theme === 'dark' ? '#fff' : '#1a1f2e', marginBottom: '4px' }}>
                      {lang.nativeName}
                    </div>
                    <div style={{ fontSize: '14px', color: theme === 'dark' ? '#8b92a7' : '#64748b' }}>
                      {lang.name}
                    </div>
                  </div>
                  {language === lang.code && (
                    <div style={{
                      width: '28px', height: '28px', borderRadius: '50%',
                      background: '#667eea',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Check size={16} color="#fff" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Languages;