// Biometric.tsx - Biometrik autentifikatsiya moduli

import { useState, useEffect } from 'react';
import { getDeviceInfo, getRpId } from '../../utils/deviceUtils';
import { getSocket } from '../../utils/socket';


interface BiometricState {
  biometricAvailable: boolean;
  biometricEnabled: boolean;
  biometricType: string;
  loading: boolean;
  message: string;
}

interface BiometricLoginParams {
  navigate: (path: string, options?: any) => void;
  setLoading: (loading: boolean) => void;
  setMessage: (message: string) => void;
}

/**
 * Biometrik autentifikatsiya hook
 */
export const useBiometric = () => {
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricType, setBiometricType] = useState<string>("");

  /**
   * Biometrik qurilmada mavjudligini tekshirish
   */
  const checkBiometricAvailability = async () => {
    if (!window.PublicKeyCredential) {
      console.log("❌ WebAuthn mavjud emas");
      setBiometricAvailable(false);
      return;
    }

    try {
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      console.log("✅ Biometrik mavjud:", available);
      setBiometricAvailable(available);
      
      if (available) {
        const ua = navigator.userAgent.toLowerCase();
        if (/iphone|ipad|ipod/i.test(ua)) {
          setBiometricType("Face ID / Touch ID");
        } else if (/mac os x/i.test(ua)) {
          setBiometricType("Touch ID");
        } else if (/windows/i.test(ua)) {
          setBiometricType("Biometric / PIN");
        } else if (/android/i.test(ua)) {
          setBiometricType("Fingerprint");
        } else {
          setBiometricType("Biometric");
        }
      }
    } catch (error) {
      console.error("❌ Biometrik tekshirish xatosi:", error);
      setBiometricAvailable(false);
    }
  };

  /**
   * Biometrik faol yoki yo'qligini tekshirish
   */
  const checkBiometricEnabled = () => {
    const deviceId = localStorage.getItem("deviceId");
    const storedCred = localStorage.getItem(`biometric_${deviceId}`);
    const isEnabled = !!storedCred;
    setBiometricEnabled(isEnabled);
    console.log(`Biometrik holati: ${isEnabled ? "Faol" : "Faol emas"}`);
  };

  /**
   * Biometrik ma'lumotlarni saqlash
   */
  const saveBiometricCredential = (credentialId: string, userLogin: string) => {
    const deviceId = localStorage.getItem("deviceId");
    if (!deviceId) {
      console.error("❌ DeviceId topilmadi");
      return false;
    }

    const data = {
      credentialId,
      userLogin,
      savedAt: new Date().toISOString()
    };

    localStorage.setItem(`biometric_${deviceId}`, JSON.stringify(data));
    setBiometricEnabled(true);
    console.log("✅ Biometrik ma'lumot saqlandi");
    return true;
  };

  /**
   * Biometrik ma'lumotlarni o'chirish
   */
  const clearBiometricCredential = () => {
    const deviceId = localStorage.getItem("deviceId");
    if (deviceId) {
      localStorage.removeItem(`biometric_${deviceId}`);
      setBiometricEnabled(false);
      console.log("✅ Biometrik ma'lumot o'chirildi");
    }
  };

  /**
   * Biometrik ro'yxatdan o'tish
   */
  const registerBiometric = async (userLogin: string): Promise<{ success: boolean; message: string; credentialId?: string }> => {
    if (!biometricAvailable) {
      return { success: false, message: "Biometrik autentifikatsiya mavjud emas" };
    }

    try {
      const deviceId = localStorage.getItem("deviceId");
      if (!deviceId) {
        return { success: false, message: "DeviceId topilmadi" };
      }

      // Challenge yaratish
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      const userId = new Uint8Array(16);
      crypto.getRandomValues(userId);

      // PublicKeyCredential yaratish
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: challenge,
          rp: {
            name: "ShoxPosPro",
            id: getRpId()
          },
          user: {
            id: userId,
            name: userLogin,
            displayName: userLogin
          },
          pubKeyCredParams: [
            { alg: -7, type: "public-key" },  // ES256
            { alg: -257, type: "public-key" } // RS256
          ],
          timeout: 60000,
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            requireResidentKey: false,
            userVerification: "preferred"
          },
          attestation: "none"
        }
      }) as PublicKeyCredential;

      if (!credential) {
        return { success: false, message: "Credential yaratilmadi" };
      }

      // Credential ID ni base64 ga o'tkazish
      const rawId = new Uint8Array(credential.rawId);
      const credentialId = btoa(String.fromCharCode(...rawId));

      console.log("✅ Biometrik credential yaratildi:", credentialId);

      // Backend'ga saqlash uchun yuborish
      const info = getDeviceInfo();
      const response = await fetch("/api/register-biometric", {
        method: "POST",
        credentials: 'include',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          login: userLogin,
          deviceId,
          deviceType: info.deviceType,
          deviceOS: info.deviceOS,
          credentialId
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        saveBiometricCredential(credentialId, userLogin);
        return { 
          success: true, 
          message: "Biometrik ro'yxatdan o'tish muvaffaqiyatli", 
          credentialId 
        };
      } else {
        return { 
          success: false, 
          message: data.message || "Backend'da xatolik yuz berdi" 
        };
      }

    } catch (error: any) {
      console.error("❌ Biometrik ro'yxatdan o'tish xatosi:", error);
      
      if (error.name === 'NotAllowedError') {
        return { success: false, message: "Biometrik ro'yxatdan o'tish bekor qilindi" };
      } else if (error.name === 'InvalidStateError') {
        return { success: false, message: "Bu qurilmada allaqachon ro'yxatdan o'tilgan" };
      } else {
        return { success: false, message: `Xato: ${error.message}` };
      }
    }
  };

  /**
   * Biometrik orqali kirish
   */
  const handleBiometricLogin = async (
    navigate: (path: string, options?: any) => void,
    setLoading: (loading: boolean) => void,
    setMessage: (message: string) => void
  ) => {
    if (!biometricAvailable || !biometricEnabled) {
      setMessage("error:Biometrik autentifikatsiya mavjud emas");
      return;
    }

    setLoading(true);
    
    try {
      const deviceId = localStorage.getItem("deviceId")!;
      const storedData = localStorage.getItem(`biometric_${deviceId}`);
      
      if (!storedData) {
        setMessage("error:Biometrik ma'lumotlar topilmadi");
        setLoading(false);
        return;
      }

      const { credentialId, userLogin } = JSON.parse(storedData);
      console.log("🔐 Biometrik kirish:", userLogin, deviceId);

      // Challenge yaratish (WebAuthn protokoli uchun)
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      try {
        // Biometrik autentifikatsiya
        const credential = await navigator.credentials.get({
          publicKey: {
            challenge: challenge,
            rpId: getRpId(),
            allowCredentials: [{
              id: Uint8Array.from(atob(credentialId), c => c.charCodeAt(0)),
              type: 'public-key',
              transports: ['internal', 'hybrid']
            }],
            timeout: 60000,
            userVerification: 'preferred'
          }
        }) as PublicKeyCredential;

        if (!credential) {
          throw new Error("Credential olinmadi");
        }

        console.log("✅ Credential olindi");

        const info = getDeviceInfo();
        
        // Backend'ga so'rov yuborish
        const res = await fetch("/api/biometric-login", {
          method: "POST",
          credentials: 'include',
          headers: { 
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            login: userLogin,
            deviceId,
            deviceType: info.deviceType,
            deviceOS: info.deviceOS,
            credentialId
          }),
        });

        const data = await res.json();

        if (res.ok && data.success) {
          // ✅ Tokenlar cookie'da saqlanadi
          sessionStorage.setItem("currentLogin", userLogin);
          sessionStorage.setItem("activeUser", userLogin);

          if (data.user) {
            sessionStorage.setItem("currentUser", JSON.stringify(data.user));
          }

          // Socket.io orqali xabar yuborish
          const socket = getSocket();
          socket.emit("userLogged", {
            login: userLogin,
            deviceId,
            deviceType: info.deviceType,
            deviceOS: info.deviceOS,
            active: true,
          });

          setMessage(`success:ShoxPosPro ilovasiga muvaffaqiyatli kirildi!`);

          // Role bo'yicha yo'naltirish
          const role = data.user?.role?.toLowerCase() || 'seller';
          setTimeout(() => {
            navigate(role === 'admin' ? "/admin-panel" : "/menu", { replace: true });
          }, 500);
        } else {
          setMessage(`error:${data.message || "Biometrik kirish xatosi"}`);
        }
        
        setLoading(false);
      } catch (credError: any) {
        console.error("❌ Credential xatosi:", credError);
        
        if (credError.name === 'NotAllowedError') {
          setMessage("warning:Biometrik autentifikatsiya bekor qilindi");
        } else if (credError.name === 'SecurityError') {
          setMessage("error:Xavfsizlik xatosi. HTTPS ishlatilganiga ishonch hosil qiling");
        } else if (credError.name === 'InvalidStateError') {
          setMessage("error:Biometrik ma'lumot topilmadi. Qayta ro'yxatdan o'ting");
          clearBiometricCredential();
        } else {
          setMessage(`error:Xato: ${credError.message}`);
        }
        
        setLoading(false);
      }
    } catch (error: any) {
      console.error("❌ Biometrik kirish xatosi:", error);
      setMessage("error:Kutilmagan xato yuz berdi");
      setLoading(false);
    }
  };

  // Component mount bo'lganda tekshirish
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
    saveBiometricCredential,
    clearBiometricCredential,
    registerBiometric,
    handleBiometricLogin
  };
};

export default useBiometric;