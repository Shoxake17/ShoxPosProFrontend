// components/settings/Biometric.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Fingerprint, ChevronRight } from "lucide-react";
import { api } from '../../utils/api';
import { getDeviceInfo, getRpId } from '../../utils/deviceUtils';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface BiometricProps {
  theme: 'dark' | 'light';
  t: (key: string) => string;
  hoveredSetting: string | null;
  setHoveredSetting: React.Dispatch<React.SetStateAction<string | null>>;
  idx: string;
  currentLogin: string | null;
  showConfirm: (title: string, message: string, callback: () => void) => void;
  showMessage: (text: string, type?: 'success' | 'error' | 'info') => void;
  handleSessionExpired: () => void;
}

// ✅ deviceId ni sessionStorage'dan olish (localStorage fallback — migration uchun)
const getDeviceId = (): string | null => {
  return sessionStorage.getItem('deviceId') ?? localStorage.getItem('deviceId');
};

const Biometric: React.FC<BiometricProps> = ({
  theme, t,
  hoveredSetting, setHoveredSetting, idx,
  currentLogin, showConfirm, handleSessionExpired,
}) => {
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  const currentLoginRef         = useRef(currentLogin);
  const handleSessionExpiredRef = useRef(handleSessionExpired);
  const tRef                    = useRef(t);
  const themeRef                = useRef(theme);

  useEffect(() => { currentLoginRef.current         = currentLogin;        }, [currentLogin]);
  useEffect(() => { handleSessionExpiredRef.current = handleSessionExpired; }, [handleSessionExpired]);
  useEffect(() => { tRef.current                    = t;                   }, [t]);
  useEffect(() => { themeRef.current                = theme;               }, [theme]);

  // ✅ Mount da biometrik holat tekshirish
  useEffect(() => {
    const fetchBiometricStatus = async () => {
      const deviceId = getDeviceId();
      if (!deviceId) {
        if (import.meta.env.DEV) {
          console.warn('[Biometric] Device ID topilmadi.');
        }
        return;
      }

      try {
        const res = await api(`/api/biometric-status?deviceId=${deviceId}`);
        if (res.ok) {
          const data = await res.json();
          setBiometricEnabled(data.biometricEnabled || false);
        } else if (res.status === 401) {
          handleSessionExpiredRef.current();
        }
      } catch (err) {
        if (import.meta.env.DEV) {
          console.error('[Biometric] Status yuklash xatosi:', err);
        }
      }
    };

    fetchBiometricStatus();
  }, []);

  const handleToggle = async () => {
    if (!currentLoginRef.current) {
      handleSessionExpiredRef.current();
      return;
    }

    if (biometricEnabled) {
      // ── Biometrikni o'chirish ──────────────────────────────────────────────
      showConfirm(
        tRef.current('biometricDisableTitle'),
        tRef.current('confirmDisableBiometric'),
        async () => {
          try {
            const deviceId = getDeviceId();

            const res = await api('/api/disable-biometric', {
              method: 'POST',
              body: JSON.stringify({ deviceId })
            });

            if (res.ok) {
              // ✅ biometric_ localStorage kaliti O'CHIRILDI
              if (deviceId) {
                localStorage.removeItem(`biometric_${deviceId}`);
              }

              setBiometricEnabled(false);
              toast.error(
                tRef.current('biometricAuthDisabled'),
                {
                  position: "top-right",
                  autoClose: 4000,
                  hideProgressBar: false,
                  closeOnClick: true,
                  pauseOnHover: true,
                  draggable: true,
                  theme: themeRef.current === 'dark' ? 'dark' : 'light'
                }
              );
            } else {
              const data = await res.json();
              toast.error(data.message || tRef.current('xatoYuzBerdi'), {
                position: "top-right",
                autoClose: 5000,
                theme: themeRef.current === 'dark' ? 'dark' : 'light',
              });
            }
          } catch (err) {
            if (import.meta.env.DEV) {
              console.error('[Biometric] Disable xatosi:', err);
            }
            toast.error(tRef.current('serverError'), {
              position: "top-right",
              autoClose: 5000,
              theme: themeRef.current === 'dark' ? 'dark' : 'light',
            });
          }
        }
      );
    } else {
      // ── Biometrikni yoqish — WebAuthn ─────────────────────────────────────
      try {
        if (!window.PublicKeyCredential) {
          toast.error(tRef.current('biometricNotAvailable'), {
            position: "top-right",
            autoClose: 5000,
            theme: themeRef.current === 'dark' ? 'dark' : 'light',
          });
          return;
        }

        const deviceId = getDeviceId();
        if (!deviceId) {
          toast.error(tRef.current('deviceIdNotFound'), {
            position: "top-right",
            autoClose: 5000,
            theme: themeRef.current === 'dark' ? 'dark' : 'light',
          });
          return;
        }

        const info = getDeviceInfo();
        const challenge = new Uint8Array(32);
        crypto.getRandomValues(challenge);
        const userId = new Uint8Array(16);
        crypto.getRandomValues(userId);

        if (import.meta.env.DEV) {
          console.log('[Biometric] Registration boshlandi');
        }

        const credential = await navigator.credentials.create({
          publicKey: {
            challenge,
            rp: { name: "POS System", id: getRpId() },
            user: {
              id: userId,
              name: currentLoginRef.current!,
              displayName: currentLoginRef.current!
            },
            pubKeyCredParams: [
              { alg: -7,   type: "public-key" },
              { alg: -257, type: "public-key" }
            ],
            authenticatorSelection: {
              authenticatorAttachment: "platform",
              userVerification: "preferred",
              requireResidentKey: false
            },
            timeout: 60000,
            attestation: "none"
          }
        }) as PublicKeyCredential;

        if (!credential) throw new Error("Credential yaratilmadi");

        const credentialId = btoa(
          String.fromCharCode(...new Uint8Array(credential.rawId))
        );

        // ✅ credentialId FAQAT serverga yuboriladi — brauzerda saqlanmaydi
        const res = await api('/api/enable-biometric', {
          method: 'POST',
          body: JSON.stringify({
            deviceId,
            credentialId,
            deviceType: info.deviceType,
            deviceOS:   info.deviceOS
          })
        });

        const data = await res.json();

        if (res.ok && data.success) {
          setBiometricEnabled(true);
          toast.success(
            tRef.current('biometricAuthEnabled'),
            {
              position: "top-right",
              autoClose: 4000,
              hideProgressBar: false,
              closeOnClick: true,
              pauseOnHover: true,
              draggable: true,
              theme: themeRef.current === 'dark' ? 'dark' : 'light'
            }
          );
          if (import.meta.env.DEV) {
            console.log('[Biometric] Backend ga muvaffaqiyatli saqlandi');
          }
        } else {
          if (import.meta.env.DEV) {
            console.error('[Biometric] Backend xatosi:', data);
          }
          toast.error(data.message || tRef.current('xatoYuzBerdi'), {
            position: "top-right",
            autoClose: 5000,
            theme: themeRef.current === 'dark' ? 'dark' : 'light',
          });
          // ✅ Eski biometric_ kalitini tozalash (migration — agar qolgan bo'lsa)
          localStorage.removeItem(`biometric_${deviceId}`);
        }
      } catch (err: any) {
        if (import.meta.env.DEV) {
          console.error('[Biometric] Faollashtirish xatosi:', err);
        }

        let errorKey = 'xatoYuzBerdi';
        if      (err.name === 'NotAllowedError')  errorKey = 'biometricCancelled';
        else if (err.name === 'SecurityError')     errorKey = 'biometricSecurityError';
        else if (err.name === 'NotSupportedError') errorKey = 'biometricNotSupported';

        toast.error(tRef.current(errorKey), {
          position: "top-right",
          autoClose: 5000,
          theme: themeRef.current === 'dark' ? 'dark' : 'light',
        });
      }
    }
  };

  return (
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
        boxShadow: hoveredSetting === idx ? '0 8px 24px rgba(102,126,234,0.2)' : 'none',
      }}
    >
      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
        <div style={{
          width: '40px', height: '40px', borderRadius: '10px',
          background: theme === 'dark' ? 'rgba(102,126,234,0.1)' : 'rgba(79,70,229,0.1)',
          color: '#667eea', display: 'flex', alignItems: 'center',
          justifyContent: 'center', flexShrink: 0
        }}>
          <Fingerprint size={20} />
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{
            fontSize: '19px', fontWeight: 600,
            color: theme === 'dark' ? '#fff' : '#1a1f2e'
          }}>
            {t('biometric')}
          </h3>
          <p style={{
            fontSize: '13px',
            color: theme === 'dark' ? '#8b92a7' : '#64748b',
            marginBottom: '8px'
          }}>
            {t('biometricDescription')}
          </p>
          <span style={{
            display: 'inline-block', padding: '4px 12px', borderRadius: '6px',
            background: theme === 'dark' ? '#0f1420' : '#f1f5f9',
            fontSize: '12px',
            color: biometricEnabled ? '#4caf50' : '#ef4444',
            fontWeight: 500
          }}>
            {biometricEnabled ? t('enabled') : t('disabled')}
          </span>
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

export default Biometric;