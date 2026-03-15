// components/settings/Biometric.tsx
import React, { useState, useEffect } from 'react';
import { Fingerprint, ChevronRight } from "lucide-react";
import { api } from '../../utils/api';
import { getDeviceInfo, getRpId } from '../../utils/deviceUtils';

// Toast kutubxonasi
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

const Biometric: React.FC<BiometricProps> = ({
  theme,
  t,
  hoveredSetting,
  setHoveredSetting,
  idx,
  currentLogin,
  showConfirm,
  showMessage,
  handleSessionExpired
}) => {
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  useEffect(() => {
    const fetchBiometricStatus = async () => {
      if (!currentLogin) return;
      const deviceId = localStorage.getItem('deviceId');
      if (!deviceId) {
        console.warn('⚠️ Device ID topilmadi. Biometrik holati aniqlanmadi.');
        return;
      }
      try {
        const res = await api(`/api/users/${currentLogin}?deviceId=${deviceId}`);
        if (res.ok) {
          const data = await res.json();
          setBiometricEnabled(data.biometricEnabled || false);
        } else if (res.status === 401) {
          handleSessionExpired();
        }
      } catch (err) {
        console.error('Biometric status yuklash xatosi:', err);
      }
    };
    fetchBiometricStatus();
  }, [currentLogin, handleSessionExpired]);

  const handleToggle = async () => {
    if (!currentLogin) {
      handleSessionExpired();
      return;
    }

    if (biometricEnabled) {
      // O'chirish
      showConfirm(t('Biometrik o\'chirish'), t('confirmDisableBiometric'), async () => {
        try {
          const deviceId = localStorage.getItem('deviceId');
          const res = await api('/api/disable-biometric', {
            method: 'POST',
            body: JSON.stringify({ deviceId })
          });
          if (res.ok) {
            localStorage.removeItem(`biometric_${deviceId}`);
            setBiometricEnabled(false);

            // Toast — o‘chirildi
            toast.error(
              t('Biometrik autentifikatsiya o\'chirildi') || "Biometrik autentifikatsiya o'chirildi",
              {
                position: "top-right",
                autoClose: 4000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                theme: theme === 'dark' ? 'dark' : 'light',
              }
            );
          } else {
            const data = await res.json();
            toast.error(data.message || t('Xato yuz berdi'), {
              position: "top-right",
              autoClose: 5000,
              theme: theme === 'dark' ? 'dark' : 'light',
            });
          }
        } catch (err) {
          console.error('❌ Disable biometric error:', err);
          toast.error(t('Server xatosi'), {
            position: "top-right",
            autoClose: 5000,
            theme: theme === 'dark' ? 'dark' : 'light',
          });
        }
      });
    } else {
      // Yoqish — TO'LIQ WebAuthn jarayoni
      try {
        // 1️⃣ WebAuthn mavjudligini tekshirish
        if (!window.PublicKeyCredential) {
          toast.error(t('Biometrik bu qurilmada mavjud emas'), {
            position: "top-right",
            autoClose: 5000,
            theme: theme === 'dark' ? 'dark' : 'light',
          });
          return;
        }

        const deviceId = localStorage.getItem('deviceId');
        if (!deviceId) {
          toast.error(t('DeviceId topilmadi'), {
            position: "top-right",
            autoClose: 5000,
            theme: theme === 'dark' ? 'dark' : 'light',
          });
          return;
        }

        const info = getDeviceInfo();

        // 2️⃣ Challenge yaratish
        const challenge = new Uint8Array(32);
        crypto.getRandomValues(challenge);

        const userId = new Uint8Array(16);
        crypto.getRandomValues(userId);

        console.log("🔐 Biometrik ro'yxatdan o'tish:", currentLogin);

        // 3️⃣ WebAuthn credential yaratish
        const credential = await navigator.credentials.create({
          publicKey: {
            challenge: challenge,
            rp: {
              name: "POS System",
              id: getRpId()
            },
            user: {
              id: userId,
              name: currentLogin!,
              displayName: currentLogin!
            },
            pubKeyCredParams: [
              { alg: -7, type: "public-key" },   // ES256
              { alg: -257, type: "public-key" }  // RS256
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

        if (!credential) {
          throw new Error("Credential yaratilmadi");
        }

        console.log("✅ Credential yaratildi");

        // 4️⃣ CredentialId ni Base64 ga o'girish
        const credentialId = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));

        // 5️⃣ Lokalda saqlash
        localStorage.setItem(`biometric_${deviceId}`, JSON.stringify({
          credentialId,
          userLogin: currentLogin,
          enabledAt: new Date().toISOString()
        }));

        // 6️⃣ Backend ga yuborish
        const res = await api('/api/enable-biometric', {
          method: 'POST',
          body: JSON.stringify({
            deviceId,
            credentialId, // MUHIM!
            deviceType: info.deviceType,
            deviceOS: info.deviceOS
          })
        });

        const data = await res.json();

        if (res.ok && data.success) {
          setBiometricEnabled(true);

          // Toast — yoqildi
          toast.success(
            t('Biometrik autentifikatsiya yoqildi') || "Biometrik autentifikatsiya yoqildi",
            {
              position: "top-right",
              autoClose: 4000,
              hideProgressBar: false,
              closeOnClick: true,
              pauseOnHover: true,
              draggable: true,
              theme: theme === 'dark' ? 'dark' : 'light',
            }
          );

          console.log("✅ Backend ga saqlandi");
        } else {
          console.error("❌ Backend xatosi:", data);
          toast.error(data.message || t('Xato yuz berdi'), {
            position: "top-right",
            autoClose: 5000,
            theme: theme === 'dark' ? 'dark' : 'light',
          });

          // Agar backend xato bersa — lokalni ham o‘chiramiz
          localStorage.removeItem(`biometric_${deviceId}`);
        }
      } catch (err: any) {
        console.error("❌ Biometrik faollashtirish xatosi:", err);

        let errorMsg = t('Xato yuz berdi');

        if (err.name === 'NotAllowedError') {
          errorMsg = t('Biometrik faollashtirish bekor qilindi');
        } else if (err.name === 'SecurityError') {
          errorMsg = t('Xavfsizlik xatosi. HTTPS kerak bo\'lishi mumkin');
        } else if (err.name === 'NotSupportedError') {
          errorMsg = t('Biometrik bu qurilmada qo\'llab-quvvatlanmaydi');
        } else {
          errorMsg = `Xato: ${err.message}`;
        }

        toast.error(errorMsg, {
          position: "top-right",
          autoClose: 5000,
          theme: theme === 'dark' ? 'dark' : 'light',
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
          <Fingerprint size={20} />
        </div>

        <div style={{ flex: 1 }}>
          <h3 style={{
            fontSize: '19px',
            fontWeight: 600,
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
            display: 'inline-block',
            padding: '4px 12px',
            borderRadius: '6px',
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