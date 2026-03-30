// components/Login/Biometric.tsx


import { useState, useEffect } from 'react';
import { getDeviceInfo, getRpId } from '../../utils/deviceUtils';
import { getSocket } from '../../utils/socket';
import { invalidateAuthCache } from "../ProtectedRoute";
import { api } from '../../utils/api';
import axiosInstance from '../../api/axiosInstance';

// ✅ deviceId: sessionStorage → localStorage (migration)
const getDeviceId = (): string | null =>
  sessionStorage.getItem('deviceId') ?? localStorage.getItem('deviceId');

export const useBiometric = () => {
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled,   setBiometricEnabled]   = useState(false);
  const [biometricType,      setBiometricType]       = useState<string>('');

  // ─── Qurilmada WebAuthn borligini tekshirish ─────────────────────────────
  const checkBiometricAvailability = async () => {
    if (!window.PublicKeyCredential) {
      setBiometricAvailable(false);
      return;
    }
    try {
      const available =
        await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      setBiometricAvailable(available);

      if (available) {
        const ua = navigator.userAgent.toLowerCase();
        if      (/iphone|ipad|ipod/i.test(ua)) setBiometricType('Face ID / Touch ID');
        else if (/mac os x/i.test(ua))          setBiometricType('Touch ID');
        else if (/windows/i.test(ua))           setBiometricType('Windows Hello');
        else if (/android/i.test(ua))           setBiometricType('Fingerprint');
        else                                    setBiometricType('Biometric');
      }
    } catch {
      setBiometricAvailable(false);
    }
  };

  // ─── Serverdan biometrik holat tekshirish ────────────────────────────────
  const checkBiometricEnabled = async () => {
    const deviceId = getDeviceId();
    if (!deviceId) {
      setBiometricEnabled(false);
      return;
    }

    try {
      const res = await axiosInstance.get('/biometric-status', {
        params: { deviceId }
      });

      if (res.status === 200) {
        setBiometricEnabled(res.data.biometricEnabled === true);
      } else {
        setBiometricEnabled(false);
      }
    } catch {
      setBiometricEnabled(false);
    }
  };

  const clearBiometricCredential = () => {
    const deviceId = getDeviceId();
    if (deviceId) {
      localStorage.removeItem(`biometric_${deviceId}`);
    }
    setBiometricEnabled(false);
  };

  // ─── Biometrik orqali kirish ─────────────────────────────────────────────
  const handleBiometricLogin = async (
    navigate: (path: string, options?: any) => void,
    setLoading: (v: boolean) => void,
    setMessage: (v: string) => void,
  ) => {
    if (!biometricAvailable || !biometricEnabled) {
      setMessage('error:Biometrik autentifikatsiya mavjud emas');
      return;
    }

    setLoading(true);

    try {
      const deviceId = getDeviceId();
      if (!deviceId) {
        setMessage('error:DeviceId topilmadi');
        setLoading(false);
        return;
      }

      // ── 1. Serverdan credentialId va challenge olish ─────────────────────
      let credentialId: string;
      let serverChallenge: Uint8Array;

      const initRes = await api('/api/biometric-login-init', {
        method: 'POST',
        body: JSON.stringify({ deviceId }),
      });

      if (!initRes.ok) {
        if (initRes.status === 404) {
          clearBiometricCredential();
          setMessage("error:Biometrik ma'lumot topilmadi. Sozlamalarda qayta yoqing");
        } else {
          const errData = await initRes.json().catch(() => ({}));
          setMessage(`error:${errData.message || 'Server xatosi'}`);
        }
        setLoading(false);
        return;
      }

      const initData = await initRes.json();
      credentialId   = initData.credentialId;
      serverChallenge = Uint8Array.from(atob(initData.challenge), c => c.charCodeAt(0));

      // ── 2. WebAuthn: brauzer barmoq izi / yuz tekshiruvi ─────────────────
      const credential = await navigator.credentials.get({
        publicKey: {
          challenge: serverChallenge as BufferSource,
          rpId: getRpId(),
          allowCredentials: [{
            id: Uint8Array.from(atob(credentialId), c => c.charCodeAt(0)) as BufferSource,
            type: 'public-key',
            transports: ['internal', 'hybrid'],
          }],
          timeout: 60000,
          userVerification: 'preferred',
        },
      }) as PublicKeyCredential;

      if (!credential) throw new Error('Credential olinmadi');

      // ── 3. Serverga yuborish va tekshirish ───────────────────────────────
      const info = getDeviceInfo();
      const authResponse = credential.response as AuthenticatorAssertionResponse;

      const res = await api('/api/biometric-login', {
        method: 'POST',
        body: JSON.stringify({
          deviceId,
          credentialId,
          deviceType: info.deviceType,
          deviceOS: info.deviceOS,
          authenticatorData: btoa(String.fromCharCode(...new Uint8Array(authResponse.authenticatorData))),
          clientDataJSON: btoa(String.fromCharCode(...new Uint8Array(authResponse.clientDataJSON))),
          signature: btoa(String.fromCharCode(...new Uint8Array(authResponse.signature))),
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        const loginName = data.user?.login;
        sessionStorage.setItem('currentUser', JSON.stringify(data.user));

        // ✅ 2. ProtectedRoute uchun keshni yangilash
        const authCacheData = {
          user: data.user,
          timestamp: Date.now()
        };
        sessionStorage.setItem("authCache", JSON.stringify(authCacheData));
        invalidateAuthCache(); // Keshni tozalab, yangidan o'qitish

        // ✅ 3. Socket-ni ulash
        const socket = getSocket();
        if (socket) {
          socket.emit('userLogged', {
            login: loginName,
            deviceId,
            deviceType: info.deviceType,
            deviceOS: info.deviceOS,
            active: true,
          });
        }

        setMessage('success:Muvaffaqiyatli kirildi!');
        
        // ✅ 4. Sahifaga yo'naltirish (Biroz kutish bilan)
        const role = data.user?.role?.toLowerCase() || 'cashier';
        setTimeout(() => {
          // window.location Axios xotirasini to'liq yangilash uchun xavfsizroq
          window.location.href = role === 'admin' ? '/admin-panel' : '/menu';
        }, 300);

      } else {
        setMessage(`error:${data.message || 'Biometrik kirish xatosi'}`);
      }
    } catch (err: any) {
      if (err.name === 'NotAllowedError') setMessage('warning:Biometrik bekor qilindi');
      else setMessage('error:Kutilmagan xato yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkBiometricAvailability();
    checkBiometricEnabled();
  }, []);

  return {
    biometricAvailable,
    biometricEnabled,
    biometricType,
    checkBiometricAvailability,
    checkBiometricEnabled,
    clearBiometricCredential,
    handleBiometricLogin,
  };
};

export default useBiometric;