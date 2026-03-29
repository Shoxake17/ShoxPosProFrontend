// src/components/settings/Authentificator.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Shield, ChevronRight, X, Check } from 'lucide-react';
import { toast } from 'react-toastify';
import { useTranslation } from '../languages/Settings';

interface GoogleAuthProps {
  theme: 'dark' | 'light';
  hoveredSetting: string | null;
  setHoveredSetting: React.Dispatch<React.SetStateAction<string | null>>;
  idx: string;
  currentLogin: string | null;
  showConfirm: (title: string, message: string, callback: () => void) => void;
  showMessage: (msg: string) => void;
  handleSessionExpired: () => void;
}

export default function GoogleAuth({
  theme, hoveredSetting, setHoveredSetting, idx,
  currentLogin, showConfirm, handleSessionExpired,
}: GoogleAuthProps) {
  const { t } = useTranslation();

  const [isEnabled,         setIsEnabled]         = useState(false);
  const [isModalOpen,       setIsModalOpen]        = useState(false);
  const [qrCodeUrl,         setQrCodeUrl]          = useState('');
  const [verificationCode,  setVerificationCode]   = useState('');
  const [loading,           setLoading]            = useState(false);
  const [step,              setStep]               = useState<'qr' | 'verify'>('qr');

  // ✅ currentLogin ref — dependency loop'dan qochish
  const currentLoginRef       = useRef(currentLogin);
  const handleSessionExpiredRef = useRef(handleSessionExpired);
  const tRef                  = useRef(t);

  useEffect(() => { currentLoginRef.current       = currentLogin;       }, [currentLogin]);
  useEffect(() => { handleSessionExpiredRef.current = handleSessionExpired; }, [handleSessionExpired]);
  useEffect(() => { tRef.current                  = t;                  }, [t]);

  // ✅ Bir marta — mount da status tekshirish
  useEffect(() => {
    const checkStatus = async () => {
      if (!currentLoginRef.current) return;
      try {
        const res = await fetch('/api/google-auth/status', { credentials: 'include' });
        if (res.status === 401) { handleSessionExpiredRef.current(); return; }
        if (res.ok) {
          const data = await res.json();
          setIsEnabled(data.enabled);
        }
      } catch (error) {
        console.error('Status error:', error);
      }
    };
    checkStatus();
  }, []); // ✅ bo'sh — hech qachon qayta ishlaydi

  const handleToggle = () => {
    if (isEnabled) {
      showConfirm(
        tRef.current('authDisableConfirmTitle'),
        tRef.current('authDisableConfirmMsg'),
        async () => {
          setLoading(true);
          try {
            const res = await fetch('/api/google-auth/disable', {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ login: currentLoginRef.current })
            });
            if (res.status === 401) { handleSessionExpiredRef.current(); return; }
            if (res.ok) {
              setIsEnabled(false);
              toast.success(tRef.current('authDisabledSuccess'));
            }
          } catch {
            toast.error(tRef.current('errUnexpected'));
          } finally {
            setLoading(false);
          }
        }
      );
    } else {
      handleEnableGoogleAuth();
    }
  };

  const handleEnableGoogleAuth = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/google-auth/setup', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: currentLoginRef.current })
      });
      if (res.status === 401) { handleSessionExpiredRef.current(); return; }
      if (res.ok) {
        const data = await res.json();
        setQrCodeUrl(data.qrCodeUrl);
        setIsModalOpen(true);
        setStep('qr');
      }
    } catch {
      toast.error(tRef.current('errNoConnection'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (verificationCode.length !== 6) {
      toast.warn(tRef.current('errEnter6Digit'));
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/google-auth/verify', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: currentLoginRef.current, token: verificationCode })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsEnabled(true);
        setIsModalOpen(false);
        setVerificationCode('');
        toast.success(tRef.current('authEnabledSuccess'));
      } else {
        toast.error(tRef.current('errCodeInvalid'));
      }
    } catch {
      toast.error(tRef.current('errUnexpected'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div
        onMouseEnter={() => setHoveredSetting(idx)}
        onMouseLeave={() => setHoveredSetting(null)}
        onClick={handleToggle}
        style={{
          background: theme === 'dark' ? 'linear-gradient(135deg, #1a1f2e 0%, #252b3d 100%)' : 'linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%)',
          borderRadius: '16px', padding: '20px', cursor: 'pointer', transition: 'all 0.3s ease',
          border: hoveredSetting === idx ? '1px solid #667eea' : `1px solid ${theme === 'dark' ? '#2a3144' : '#e2e8f0'}`,
          transform: hoveredSetting === idx ? 'translateY(-2px)' : 'translateY(0)',
          boxShadow: hoveredSetting === idx ? '0 8px 24px rgba(102,126,234,0.2)' : 'none',
        }}
      >
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: theme === 'dark' ? 'rgba(102,126,234,0.1)' : 'rgba(79,70,229,0.1)', color: '#667eea', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Shield size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: '19px', fontWeight: 600, color: theme === 'dark' ? '#fff' : '#1a1f2e' }}>{t('authTitle')}</h3>
            <p style={{ fontSize: '13px', color: theme === 'dark' ? '#8b92a7' : '#64748b', marginBottom: '8px' }}>{t('authDescription')}</p>
            <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: '6px', background: theme === 'dark' ? '#0f1420' : '#f1f5f9', fontSize: '12px', color: isEnabled ? '#4caf50' : '#ef4444', fontWeight: 500 }}>
              {isEnabled ? t('enabled') : t('disabled')}
            </span>
          </div>
          <ChevronRight size={20} color={theme === 'dark' ? '#8b92a7' : '#64748b'} style={{ flexShrink: 0, marginTop: '10px' }} />
        </div>
      </div>

      {isModalOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(8px)' }}
          onClick={() => setIsModalOpen(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: theme === 'dark' ? 'linear-gradient(135deg, #1a1f2e 0%, #252b3d 100%)' : 'linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%)', borderRadius: '20px', padding: '32px', width: '90%', maxWidth: '480px', border: `1px solid ${theme === 'dark' ? '#2a3144' : '#e2e8f0'}`, boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 700, color: theme === 'dark' ? '#fff' : '#1a1f2e', margin: 0 }}>{t('authSetupTitle')}</h2>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: theme === 'dark' ? '#8b92a7' : '#64748b' }}><X size={24} /></button>
            </div>

            {step === 'qr' && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ background: '#fff', padding: '16px', borderRadius: '12px', marginBottom: '20px', display: 'inline-block' }}>
                  <img src={qrCodeUrl} alt="QR Code" style={{ width: '180px', height: '180px', display: 'block' }} />
                </div>
                <p style={{ fontSize: '14px', color: theme === 'dark' ? '#8b92a7' : '#64748b', marginBottom: '24px', lineHeight: '1.5' }}>
                  {t('authStep1')}<br />{t('authStep2')}
                </p>
                <button onClick={() => setStep('verify')} style={{ width: '100%', padding: '16px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 600 }}>
                  {t('next')}
                </button>
              </div>
            )}

            {step === 'verify' && (
              <div>
                <p style={{ fontSize: '15px', color: theme === 'dark' ? '#8b92a7' : '#64748b', marginBottom: '20px', textAlign: 'center' }}>{t('authEnterCode')}</p>
                <input
                  type="text"
                  value={verificationCode}
                  onChange={e => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  style={{ width: '95%', padding: '16px', textAlign: 'center', fontSize: '32px', letterSpacing: '12px', background: theme === 'dark' ? '#0f1420' : '#f8f9ff', border: `2px solid ${theme === 'dark' ? '#2a3144' : '#e2e8f0'}`, borderRadius: '12px', color: theme === 'dark' ? '#fff' : '#1a1f2e', outline: 'none', marginBottom: '24px' }}
                />
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button onClick={() => setStep('qr')} style={{ flex: 1, padding: '16px', background: theme === 'dark' ? '#1a1f2e' : '#f1f5f9', color: theme === 'dark' ? '#e2e8f0' : '#1e293b', border: `1px solid ${theme === 'dark' ? '#2a3144' : '#e2e8f0'}`, borderRadius: '12px', fontSize: '16px', fontWeight: 600 }}>
                    {t('back')}
                  </button>
                  <button onClick={handleVerifyCode} disabled={loading || verificationCode.length !== 6} style={{ flex: 1, padding: '16px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 600, opacity: loading ? 0.6 : 1 }}>
                    {loading ? t('verifying') : t('verify')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}