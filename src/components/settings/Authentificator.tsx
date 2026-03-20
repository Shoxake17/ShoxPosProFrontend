// components/settings/Authentificator.tsx
import React, { useState, useEffect } from 'react';
import { Shield, ChevronRight, X, Copy, Check } from 'lucide-react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface GoogleAuthProps {
  theme: 'dark' | 'light';
  t: (key: string) => string;
  hoveredSetting: string | null;
  setHoveredSetting: React.Dispatch<React.SetStateAction<string | null>>;
  idx: string;
  currentLogin: string | null;
  showConfirm: (title: string, message: string, callback: () => void) => void;
  showMessage: (msg: string) => void;
  handleSessionExpired: () => void;
}

export default function GoogleAuth({
  theme,
  t,
  hoveredSetting,
  setHoveredSetting,
  idx,
  currentLogin,
  showConfirm,
  showMessage,
  handleSessionExpired
}: GoogleAuthProps) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [step, setStep] = useState<'qr' | 'verify'>('qr');

  useEffect(() => {
    checkGoogleAuthStatus();
  }, [currentLogin]);

  const checkGoogleAuthStatus = async () => {
    if (!currentLogin) return;

    try {
      const res = await fetch('/api/google-auth/status', {
        credentials: 'include'
      });

      if (res.status === 401) {
        handleSessionExpired();
        return;
      }

      if (res.ok) {
        const data = await res.json();
        setIsEnabled(data.enabled);
      }
    } catch (error) {
      console.error('Google Auth status xatosi:', error);
    }
  };

  const handleToggle = () => {
    if (isEnabled) {
      // O'chirish
      showConfirm(
        t('Authenticator o\'chirish'),
        t('Authenticator autentifikatsiyasini o\'chirmoqchimisiz?'),
        async () => {
          setLoading(true);
          try {
            const res = await fetch('/api/google-auth/disable', {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ login: currentLogin })
            });

            if (res.status === 401) {
              handleSessionExpired();
              return;
            }

            if (res.ok) {
              setIsEnabled(false);
              toast.success(t('Authenticator o\'chirildi') || "Authenticator o'chirildi", {
                position: "top-right",
                autoClose: 4000,
                theme: theme === 'dark' ? 'dark' : 'light'
              });
            } else {
              const data = await res.json();
              toast.error(data.message || t('Xato yuz berdi'), {
                position: "top-right",
                autoClose: 5000,
                theme: theme === 'dark' ? 'dark' : 'light'
              });
            }
          } catch (error) {
            console.error('Disable xatosi:', error);
            toast.error(t('Server xatosi'), {
              position: "top-right",
              autoClose: 5000,
              theme: theme === 'dark' ? 'dark' : 'light'
            });
          } finally {
            setLoading(false);
          }
        }
      );
    } else {
      // Yoqish
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
        body: JSON.stringify({ login: currentLogin })
      });

      if (res.status === 401) {
        handleSessionExpired();
        return;
      }

      if (res.ok) {
        const data = await res.json();
        setQrCodeUrl(data.qrCodeUrl);
        setSecret(data.secret);
        setIsModalOpen(true);
        setStep('qr');
      } else {
        const data = await res.json();
        toast.error(data.message || t('Xato yuz berdi'), {
          position: "top-right",
          autoClose: 5000,
          theme: theme === 'dark' ? 'dark' : 'light'
        });
      }
    } catch (error) {
      console.error('Google Auth setup xatosi:', error);
      toast.error(t('Server bilan bog\'lanishda xato'), {
        position: "top-right",
        autoClose: 5000,
        theme: theme === 'dark' ? 'dark' : 'light'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (verificationCode.length !== 6) {
      toast.warn(t('6 raqamli kodni kiriting'), {
        position: "top-right",
        autoClose: 4000,
        theme: theme === 'dark' ? 'dark' : 'light'
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/google-auth/verify', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          login: currentLogin,
          token: verificationCode
        })
      });

      if (res.status === 401) {
        handleSessionExpired();
        return;
      }

      const data = await res.json();

      if (res.ok && data.success) {
        setIsEnabled(true);
        setIsModalOpen(false);
        setVerificationCode('');
        toast.success(t('Google Authenticator muvaffaqiyatli yoqildi!'), {
          position: "top-right",
          autoClose: 4000,
          theme: theme === 'dark' ? 'dark' : 'light'
        });
      } else {
        toast.error(data.message || t('Kod noto\'g\'ri'), {
          position: "top-right",
          autoClose: 5000,
          theme: theme === 'dark' ? 'dark' : 'light'
        });
      }
    } catch (error) {
      console.error('Verify xatosi:', error);
      toast.error(t('Tasdiqlashda xato'), {
        position: "top-right",
        autoClose: 5000,
        theme: theme === 'dark' ? 'dark' : 'light'
      });
    } finally {
      setLoading(false);
    }
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    toast.success(t('Kod nusxalandi!'), {
      position: "top-right",
      autoClose: 2000,
      theme: theme === 'dark' ? 'dark' : 'light'
    });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <div
        onMouseEnter={() => setHoveredSetting(idx)}
        onMouseLeave={() => setHoveredSetting(null)}
        onClick={handleToggle}
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
            <Shield size={20} />
          </div>

          <div style={{ flex: 1 }}>
            <h3 style={{
              fontSize: '19px',
              fontWeight: 600,
              color: theme === 'dark' ? '#fff' : '#1a1f2e'
            }}>
              {t('Authenticators') || 'Authenticator'}
            </h3>

            <p style={{
              fontSize: '13px',
              color: theme === 'dark' ? '#8b92a7' : '#64748b',
              marginBottom: '8px'
            }}>
              {t('AuthDiscription') || 'Google Authenticator ilovasi orqali kirish'}
            </p>

            <span style={{
              display: 'inline-block',
              padding: '4px 12px',
              borderRadius: '6px',
              background: theme === 'dark' ? '#0f1420' : '#f1f5f9',
              fontSize: '12px',
              color: isEnabled ? '#4caf50' : '#ef4444',
              fontWeight: 500
            }}>
              {isEnabled ? t('enabled') || 'Yoqilgan' : t('disabled') || 'O\'chirilgan'}
            </span>
          </div>

          <ChevronRight
            size={20}
            color={theme === 'dark' ? '#8b92a7' : '#64748b'}
            style={{ flexShrink: 0, marginTop: '10px' }}
          />
        </div>
      </div>

      {/* Setup Modal — Biometric ga yaqin dizayn */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
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
              borderRadius: '20px',
              padding: '32px',
              width: '90%',
              maxWidth: '480px',
              border: `1px solid ${theme === 'dark' ? '#2a3144' : '#e2e8f0'}`,
              boxShadow: '0 20px 60px rgba(0,0,0,0.4)'
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px'
            }}>
              <h2 style={{
                fontSize: '24px',
                fontWeight: 700,
                color: theme === 'dark' ? '#fff' : '#1a1f2e',
                margin: 0
              }}>
                {t('authenticatorSetup') || 'Authenticator sozlash'}
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

            {step === 'qr' && (
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  background: '#fff',
                  padding: '16px',
                  borderRadius: '12px',
                  marginBottom: '20px',
                  display: 'inline-block',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}>
                  <img
                    src={qrCodeUrl}
                    alt="QR Code"
                    style={{
                      width: '180px',
                      height: '180px',
                      display: 'block'
                    }}
                  />
                </div>

                

                <p style={{
                  fontSize: '14px',
                  color: theme === 'dark' ? '#8b92a7' : '#64748b',
                  marginBottom: '24px',
                  lineHeight: '1.5'
                }}>
                  1. Google Authenticator ilovasini oching<br />
                  2. QR kodni skanerlang
                </p>

                <button
                  onClick={() => setStep('verify')}
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '16px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '16px',
                    fontWeight: 600,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.7 : 1
                  }}
                >
                  {loading ? t('loading') || 'Yuklanmoqda...' : t('next') || 'Keyingi'}
                </button>
              </div>
            )}

            {step === 'verify' && (
              <div>
                <p style={{
                  fontSize: '15px',
                  color: theme === 'dark' ? '#8b92a7' : '#64748b',
                  marginBottom: '20px',
                  textAlign: 'center'
                }}>
                  {t('enter6DigitCode') || 'Google Authenticator ilovasida ko‘rsatilgan 6 raqamli kodni kiriting'}
                </p>

                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '16px',
                    textAlign: 'center',
                    fontSize: '32px',
                    letterSpacing: '12px',
                    background: theme === 'dark' ? '#0f1420' : '#f8f9ff',
                    border: `2px solid ${theme === 'dark' ? '#2a3144' : '#e2e8f0'}`,
                    borderRadius: '12px',
                    color: theme === 'dark' ? '#fff' : '#1a1f2e',
                    outline: 'none',
                    marginBottom: '24px'
                  }}
                />

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={() => setStep('qr')}
                    style={{
                      flex: 1,
                      padding: '16px',
                      background: theme === 'dark' ? '#1a1f2e' : '#f1f5f9',
                      color: theme === 'dark' ? '#e2e8f0' : '#1e293b',
                      border: `1px solid ${theme === 'dark' ? '#2a3144' : '#e2e8f0'}`,
                      borderRadius: '12px',
                      fontSize: '16px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {t('back') || 'Orqaga'}
                  </button>

                  <button
                    onClick={handleVerifyCode}
                    disabled={loading || verificationCode.length !== 6}
                    style={{
                      flex: 1,
                      padding: '16px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '12px',
                      fontSize: '16px',
                      fontWeight: 600,
                      cursor: loading || verificationCode.length !== 6 ? 'not-allowed' : 'pointer',
                      opacity: loading || verificationCode.length !== 6 ? 0.6 : 1
                    }}
                  >
                    {loading ? t('verifying') || 'Tekshirilmoqda...' : t('verify') || 'Tasdiqlash'}
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