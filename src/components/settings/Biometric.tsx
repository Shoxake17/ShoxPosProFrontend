// components/settings/Biometric.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Fingerprint, ChevronRight } from "lucide-react";
// ✅ i18next hookini import qilamiz
import { useTranslation } from 'react-i18next';
import { api } from '../../utils/api';
import { getDeviceInfo, getRpId, getDeviceId } from '../../utils/deviceUtils';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface BiometricProps {
  theme: 'dark' | 'light';
  hoveredSetting: string | null;
  setHoveredSetting: React.Dispatch<React.SetStateAction<string | null>>;
  idx: string;
  currentLogin: string | null;
  showConfirm: (title: string, message: string, callback: () => void) => void;
  showMessage: (text: string, type?: 'success' | 'error' | 'info') => void;
  handleSessionExpired: () => void;
}

const Biometric: React.FC<BiometricProps> = ({
  theme,
  hoveredSetting,
  setHoveredSetting,
  idx,
  currentLogin,
  showConfirm,
  handleSessionExpired,
}) => {
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  
  // ✅ useTranslation hookini chaqiramiz
  const { t } = useTranslation(['settings', 'common']);

  const currentLoginRef         = useRef(currentLogin);
  const handleSessionExpiredRef = useRef(handleSessionExpired);
  const themeRef                = useRef(theme);

  useEffect(() => { currentLoginRef.current         = currentLogin;         }, [currentLogin]);
  useEffect(() => { handleSessionExpiredRef.current = handleSessionExpired; }, [handleSessionExpired]);
  useEffect(() => { themeRef.current                = theme;                }, [theme]);

  // ✅ Mount da biometrik holat tekshirish
  useEffect(() => {
    const fetchBiometricStatus = async () => {
      const deviceId = await getDeviceId();
      if (!deviceId) return;

      try {
        const res = await api(`/api/biometric-status?deviceId=${deviceId}`);
        if (res.ok) {
          const data = await res.json();
          setBiometricEnabled(data.biometricEnabled || false);
        } else if (res.status === 401) {
          handleSessionExpiredRef.current();
        }
      } catch (err) {
        console.error('[Biometric] Status yuklash xatosi:', err);
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
        t('settings:biometricDisableTitle'),
        t('settings:confirmDisableBiometric'),
        async () => {
          try {
            const deviceId = await getDeviceId();
            const res = await api('/api/disable-biometric', {
              method: 'POST',
              body: JSON.stringify({ deviceId })
            });

            if (res.ok) {
              setBiometricEnabled(false);
              toast.error(t('settings:biometricAuthDisabled'), {
                position: "top-right",
                autoClose: 4000,
                theme: themeRef.current === 'dark' ? 'dark' : 'light'
              });
            } else {
              const data = await res.json();
              toast.error(data.message || t('settings:xatoYuzBerdi'), {
                position: "top-right",
                autoClose: 5000,
                theme: themeRef.current === 'dark' ? 'dark' : 'light',
              });
            }
          } catch (err) {
            toast.error(t('settings:serverError'), {
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
          toast.error(t('settings:biometricNotAvailable'), {
            position: "top-right",
            autoClose: 5000,
            theme: themeRef.current === 'dark' ? 'dark' : 'light',
          });
          return;
        }

        const deviceId = await getDeviceId();
        if (!deviceId) {
          toast.error(t('settings:deviceIdNotFound'), {
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
          toast.success(t('settings:biometricAuthEnabled'), {
            position: "top-right",
            autoClose: 4000,
            theme: themeRef.current === 'dark' ? 'dark' : 'light'
          });
        } else {
          toast.error(data.message || t('settings:xatoYuzBerdi'), {
            position: "top-right",
            autoClose: 5000,
            theme: themeRef.current === 'dark' ? 'dark' : 'light',
          });
        }
      } catch (err: any) {
        let errorKey = 'settings:xatoYuzBerdi';
        if      (err.name === 'NotAllowedError')  errorKey = 'settings:biometricCancelled';
        else if (err.name === 'SecurityError')     errorKey = 'settings:biometricSecurityError';
        else if (err.name === 'NotSupportedError') errorKey = 'settings:biometricNotSupported';

        toast.error(t(errorKey), {
          position: "top-right",
          autoClose: 5000,
          theme: themeRef.current === 'dark' ? 'dark' : 'light',
        });
      }
    }
  };

  const isDark = theme === 'dark';
  const isHovered = hoveredSetting === idx;

  return (
    <div
      onMouseEnter={() => setHoveredSetting(idx)}
      onMouseLeave={() => setHoveredSetting(null)}
      onClick={handleToggle}
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
        <div style={{
          width: '40px', height: '40px', borderRadius: '10px',
          background: isDark ? 'rgba(102,126,234,0.1)' : 'rgba(79,70,229,0.1)',
          color: '#667eea', display: 'flex', alignItems: 'center',
          justifyContent: 'center', flexShrink: 0
        }}>
          <Fingerprint size={20} />
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{
            fontSize: '19px', fontWeight: 600,
            color: isDark ? '#fff' : '#1a1f2e'
          }}>
            {t('settings:biometric')}
          </h3>
          <p style={{
            fontSize: '13px',
            color: isDark ? '#8b92a7' : '#64748b',
            marginBottom: '8px'
          }}>
            {t('settings:biometricDescription')}
          </p>
          <span style={{
            display: 'inline-block', padding: '4px 12px', borderRadius: '6px',
            background: isDark ? '#0f1420' : '#f1f5f9',
            fontSize: '12px',
            color: biometricEnabled ? '#10b981' : '#ef4444',
            fontWeight: 500
          }}>
            {biometricEnabled ? t('settings:enabled') : t('settings:disabled')}
          </span>
        </div>
        <ChevronRight
          size={20}
          color={isDark ? '#8b92a7' : '#64748b'}
          style={{ flexShrink: 0, marginTop: '10px' }}
        />
      </div>
    </div>
  );
};

export default Biometric;