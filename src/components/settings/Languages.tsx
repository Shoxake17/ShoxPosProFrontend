import React, { useState } from 'react';
import { Globe, ChevronRight, X, Check } from 'lucide-react';
// ✅ i18next hookini import qilamiz
import { useTranslation } from 'react-i18next';

interface LanguagesProps {
  theme: 'dark' | 'light';
  hoveredSetting: string | null;
  setHoveredSetting: (val: string | null) => void;
  idx: string;
}

const Languages: React.FC<LanguagesProps> = ({
  theme,
  hoveredSetting,
  setHoveredSetting,
  idx
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // ✅ useTranslation orqali t va i18n obyektlarini olamiz
  const { t, i18n } = useTranslation(['settings', 'common']);

  const languages = [
    { code: 'uz', name: "O'zbek", nativeName: "O'zbek" },
    { code: 'ru', name: 'Русский', nativeName: 'Русский' },
    { code: 'en', name: 'English', nativeName: 'English' }
  ];

  // ✅ Hozirgi tanlangan tilni aniqlash
  const currentLang = languages.find(l => l.code === i18n.language) || languages[0];

  const handleSelectLanguage = (code: string) => {
    // 1. i18next'ning o'zida tilni o'zgartirish
    i18n.changeLanguage(code);
    
    // 2. LocalStorage-ga saqlash (i18next-browser-languagedetector buni avtomatik qilishi ham mumkin, 
    // lekin ishonch uchun qo'lda yozish zarar qilmaydi)
    localStorage.setItem('i18nextLng', code); 
    
    // 3. Modalni yopish
    setIsModalOpen(false);
  };

  const isDark = theme === 'dark';
  const isHovered = hoveredSetting === idx;

  return (
    <>
      {/* Kartochka */}
      <div
        onMouseEnter={() => setHoveredSetting(idx)}
        onMouseLeave={() => setHoveredSetting(null)}
        onClick={() => setIsModalOpen(true)}
        style={{
          background: isDark
            ? 'linear-gradient(135deg, #1a1f2e 0%, #252b3d 100%)'
            : 'linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%)',
          borderRadius: '16px',
          padding: '20px',
          border: isHovered
            ? '1px solid #667eea'
            : `1px solid ${isDark ? '#2a3144' : '#e2e8f0'}`,
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
            background: isDark ? 'rgba(102,126,234,0.1)' : 'rgba(79,70,229,0.1)',
            color: '#667eea',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Globe size={20} />
          </div>

          {/* Matn */}
          <div style={{ flex: 1 }}>
            <h3 style={{
              fontSize: '19px',
              fontWeight: 600,
              color: isDark ? '#fff' : '#1a1f2e',
              margin: 0,
              marginBottom: '4px'
            }}>
              {t('settings:language')}
            </h3>
            <p style={{
              fontSize: '13px',
              color: isDark ? '#8b92a7' : '#64748b',
              margin: 0,
              marginBottom: '8px',
            }}>
              {t('settings:languageDescription')}
            </p>
            <span style={{
              display: 'inline-block',
              padding: '4px 12px',
              borderRadius: '6px',
              background: isDark ? '#0f1420' : '#f1f5f9',
              fontSize: '12px',
              color: '#667eea',
              fontWeight: 500,
            }}>
              {currentLang.nativeName}
            </span>
          </div>

          <ChevronRight
            size={20}
            color={isDark ? '#8b92a7' : '#64748b'}
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
              background: isDark
                ? 'linear-gradient(135deg, #1a1f2e 0%, #252b3d 100%)'
                : 'linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%)',
              borderRadius: '24px',
              padding: '32px',
              width: '90%',
              maxWidth: '500px',
              border: `1px solid ${isDark ? '#2a3144' : '#e2e8f0'}`,
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{
                fontSize: '24px', fontWeight: 700,
                color: isDark ? '#fff' : '#1a1f2e',
                margin: 0,
              }}>
                {t('settings:selectLanguage')}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: isDark ? '#8b92a7' : '#64748b' }}
              >
                <X size={24} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {languages.map(lang => (
                <div
                  key={lang.code}
                  onClick={() => handleSelectLanguage(lang.code)}
                  style={{
                    padding: '16px 20px',
                    borderRadius: '12px',
                    background: i18n.language === lang.code
                      ? (isDark ? 'rgba(102,126,234,0.15)' : 'rgba(79,70,229,0.1)')
                      : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)'),
                    border: i18n.language === lang.code
                      ? '2px solid #667eea'
                      : `1px solid ${isDark ? '#2a3144' : '#e2e8f0'}`,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '18px', fontWeight: 600, color: isDark ? '#fff' : '#1a1f2e', marginBottom: '4px' }}>
                      {lang.nativeName}
                    </div>
                    <div style={{ fontSize: '14px', color: isDark ? '#8b92a7' : '#64748b' }}>
                      {lang.name}
                    </div>
                  </div>
                  {i18n.language === lang.code && (
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