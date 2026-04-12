import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ghost, Home, AlertTriangle, ShieldX } from 'lucide-react';

type Language = 'uz' | 'ru' | 'en';

const translations: Record<Language, Record<string, string>> = {
  uz: {
    notFound: "SAHIFA TOPILMADI",
    notFoundMessage: "Siz qidirayotgan resurs tizim bazasida mavjud emas yoki kirish cheklangan.",
    backToMain: "Bosh sahifaga qaytish"
  },
  ru: {
    notFound: "СТРАНИЦА НЕ НАЙДЕНА",
    notFoundMessage: "Запрошенный ресурс отсутствует в базе данных системы или доступ ограничен.",
    backToMain: "Вернуться на главную"
  },
  en: {
    notFound: "PAGE NOT FOUND",
    notFoundMessage: "The requested resource does not exist in the system database or access is restricted.",
    backToMain: "Back to Home"
  }
};

export default function NotFound() {
  const navigate = useNavigate();
  const [lang] = useState<Language>((localStorage.getItem('language') as Language) || 'uz');
  const [glitch, setGlitch] = useState(false);

  // Tasodifiy glitch effekti
  useEffect(() => {
    const interval = setInterval(() => {
      setGlitch(true);
      setTimeout(() => setGlitch(false), 150);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const t = (key: string) => translations[lang][key] || key;

  return (
    <div 
      style={{
        height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', backgroundColor: '#020617',
        color: 'white', position: 'fixed', top: 0, left: 0, overflow: 'hidden'
      }}
    >
      {/* Orqa fondagi harakatlanuvchi neon nurlar */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', opacity: 0.1 }}>
        <div className="animate-float" style={{ position: 'absolute', top: '10%', left: '15%', width: '40vw', height: '40vw', backgroundColor: '#3b82f6', borderRadius: '50%', filter: 'blur(120px)' }}></div>
        <div className="animate-float-slow" style={{ position: 'absolute', bottom: '15%', right: '10%', width: '35vw', height: '35vw', backgroundColor: '#ef4444', borderRadius: '50%', filter: 'blur(150px)' }}></div>
      </div>

      <div style={{ position: 'relative', zIndex: 10, textAlign: 'center', padding: '0 20px' }}>
        
        {/* Yuqori belgi */}
        <div style={{ marginBottom: '2rem' }}>
          <div className="animate-pulse" style={{ display: 'inline-block', position: 'relative' }}>
             <ShieldX size={80} color={glitch ? '#ef4444' : '#64748b'} strokeWidth={1.5} />
             {glitch && <div style={{ position: 'absolute', inset: 0, color: '#3b82f6', opacity: 0.5, transform: 'translateX(3px)' }}><ShieldX size={80} /></div>}
          </div>
        </div>

        {/* 404 Raqami */}
        <h1 
          style={{ 
            fontSize: 'clamp(8rem, 20vw, 12rem)', fontWeight: '900', lineHeight: '0.8', margin: '0',
            letterSpacing: '-8px', position: 'relative', fontStyle: 'italic',
            textShadow: glitch ? '5px 0 #ef4444, -5px 0 #3b82f6' : 'none',
            transition: 'all 0.1s ease'
          }}
        >
          404
        </h1>

        <h2 style={{ fontSize: '1.5rem', fontWeight: '800', marginTop: '1.5rem', letterSpacing: '4px', color: '#94a3b8' }}>
          {t('notFound')}
        </h2>

        <p style={{ color: '#475569', fontSize: '1rem', maxWidth: '450px', margin: '1.5rem auto', lineHeight: '1.6' }}>
          {t('notFoundMessage')}
        </p>

        {/* Kiber-uslubdagi Tugma */}
        <button
          onClick={() => navigate('/login')}
          style={{
            marginTop: '2rem', padding: '15px 40px', backgroundColor: 'transparent',
            border: '1px solid #334155', color: 'white', borderRadius: '4px',
            fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: '12px',
            letterSpacing: '2px', transition: 'all 0.3s ease', textTransform: 'uppercase'
          }}
          className="hover-button"
        >
          <Home size={18} />
          {t('backToMain')}
        </button>
      </div>

      {/* Footer System Log */}
      <div style={{ position: 'absolute', bottom: '2rem', width: '100%', textAlign: 'center', opacity: 0.3 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontSize: '0.7rem' }}>
          <AlertTriangle size={14} />
          <span style={{ fontFamily: 'monospace' }}>ERROR_CODE: 0x404_PAGE_NOT_FOUND // SYSTEM: SHOXPOSPRO_SECURE</span>
        </div>
      </div>

      {/* Dinamik CSS */}
      <style>{`
        .hover-button:hover {
          background-color: white !important;
          color: black !important;
          box-shadow: 0 0 30px rgba(255, 255, 255, 0.2);
          transform: translateY(-2px);
        }
        
        @keyframes float {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(50px, 100px); }
        }
        .animate-float { animation: float 12s ease-in-out infinite; }
        .animate-float-slow { animation: float 18s ease-in-out infinite reverse; }

        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.05); opacity: 1; }
        }
        .animate-pulse { animation: pulse 2s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
