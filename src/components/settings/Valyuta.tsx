import React, { useState } from 'react';
import { Coins, ChevronRight, X, Check } from 'lucide-react';
import { useCurrency, CurrencyType } from '../../context/CurrencyContext';

interface CurrencyProps {
  theme: 'dark' | 'light';
  t: (key: string) => string;
  hoveredSetting: string | null;
  setHoveredSetting: (id: string | null) => void;
  idx: string;
}

const Currency: React.FC<CurrencyProps> = ({ theme, t, hoveredSetting, setHoveredSetting, idx }) => {
  const { currency, setCurrency, rates } = useCurrency();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const currencies: { id: CurrencyType; label: string; symbol: string; nativeName: string }[] = [
    { id: 'UZS', label: t('uzs') || "O'zbek so'mi", nativeName: "O'zbek so'mi", symbol: "so'm" },
    { id: 'USD', label: t('usd') || "AQSH dollari", nativeName: "US Dollar", symbol: "$" },
    { id: 'RUB', label: t('rub') || "Rossiya rubli", nativeName: "Российский рубль", symbol: "₽" },
  ];

  const currentCurrency = currencies.find(c => c.id === currency);
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
            <Coins size={20} />
          </div>

          {/* Matn — Languages bilan aynan bir xil */}
          <div style={{ flex: 1 }}>
            <h3 style={{
              fontSize: '19px',
              fontWeight: 600,
              color: theme === 'dark' ? '#fff' : '#1a1f2e',
            }}>
              {t('currency')}
            </h3>
            <p style={{
              fontSize: '13px',
              color: theme === 'dark' ? '#8b92a7' : '#64748b',
              marginBottom: '8px',
            }}>
              {t('currencyDescription')}
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
              {currentCurrency?.label}
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
                {t('selectCurrency') || "Valyutani tanlang"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: theme === 'dark' ? '#8b92a7' : '#64748b' }}
              >
                <X size={24} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {currencies.map(c => (
                <div
                  key={c.id}
                  onClick={() => { setCurrency(c.id); setIsModalOpen(false); }}
                  style={{
                    padding: '16px 20px',
                    borderRadius: '12px',
                    background: currency === c.id
                      ? (theme === 'dark' ? 'rgba(102,126,234,0.15)' : 'rgba(79,70,229,0.1)')
                      : (theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)'),
                    border: currency === c.id
                      ? '2px solid #667eea'
                      : `1px solid ${theme === 'dark' ? '#2a3144' : '#e2e8f0'}`,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{
                      width: '44px', height: '44px', borderRadius: '12px',
                      background: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '20px', fontWeight: 700, color: '#667eea',
                    }}>
                      {c.symbol}
                    </div>
                    <div>
                      <div style={{ fontSize: '18px', fontWeight: 600, color: theme === 'dark' ? '#fff' : '#1a1f2e', marginBottom: '4px' }}>
                        {c.label}
                      </div>
                      <div style={{ fontSize: '14px', color: theme === 'dark' ? '#8b92a7' : '#64748b' }}>
                        {c.nativeName}
                      </div>
                    </div>
                  </div>
                  {currency === c.id && (
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

            {/* Kurslar */}
            <div style={{
              marginTop: '32px',
              padding: '20px',
              borderRadius: '16px',
              background: theme === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
              border: `1px solid ${theme === 'dark' ? '#2a3144' : '#e2e8f0'}`,
            }}>
              <h4 style={{
                fontSize: '14px', fontWeight: 600,
                color: theme === 'dark' ? '#8b92a7' : '#64748b',
                textTransform: 'uppercase', letterSpacing: '1px',
                margin: '0 0 16px 0',
              }}>
                {t('currentRate') || "Joriy kurs"} ({currentCurrency?.symbol})
              </h4>
              <div style={{ display: 'flex', gap: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '16px', fontWeight: 700, color: '#667eea' }}>$</span>
                  <span style={{ fontSize: '16px', fontWeight: 600, color: theme === 'dark' ? '#fff' : '#1a1f2e' }}>
                    {rates.USD.toLocaleString()}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '16px', fontWeight: 700, color: '#667eea' }}>₽</span>
                  <span style={{ fontSize: '16px', fontWeight: 600, color: theme === 'dark' ? '#fff' : '#1a1f2e' }}>
                    {rates.RUB.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Currency;