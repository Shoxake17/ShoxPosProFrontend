// components/settings/Session.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Smartphone, ChevronRight, Laptop, Tablet, MapPin, Globe } from "lucide-react";
import axiosInstance from '../../api/axiosInstance';
import { useTranslation } from '../../components/languages/Settings';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const getCurrentDeviceId = (): string =>
  sessionStorage.getItem('deviceId') || localStorage.getItem('deviceId') || '';

const getDeviceIcon = (type: string, os: string) => {
  if (type === 'desktop') return <Laptop size={28} />;
  if (type === 'tablet') return <Tablet size={28} />;
  if (os?.includes('iOS')) return <Smartphone size={28} color="#A2AAAD" />;
  return <Smartphone size={28} />;
};

const formatDate = (dateStr: string) => {
  try {
    return new Date(dateStr).toLocaleString('uz-UZ', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return dateStr; }
};

// ✅ CSRF token olish va localStorage ga saqlash
const getCsrfToken = async (): Promise<string> => {
  try {
    const res = await axiosInstance.get('/csrf-token');
    const token = res.data.csrfToken || res.data.token || '';
    
    // ✅ localStorage ga saqlash
    if (token) {
      localStorage.setItem('csrfToken', token);
      console.log('✅ CSRF token saqlandi:', token.substring(0, 10) + '...');
    }
    
    return token;
  } catch (err) {
    console.error('❌ CSRF token olishda xato:', err);
    return '';
  }
};

// ─── Modal ────────────────────────────────────────────────────────────────
function DevicesModal({
  isOpen, onClose, theme,
}: {
  isOpen: boolean;
  onClose: () => void;
  theme: 'dark' | 'light';
}) {
  const { t } = useTranslation();
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [kickingDeviceId, setKickingDeviceId] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMounted = useRef(false);

  const fetchDevices = async () => {
    try {
      const res = await axiosInstance.get('/user-devices');
      if (!isMounted.current) return;

      const activeDevices = (res.data.devices || []).filter((d: any) => d.isActive === true);
      const currentDeviceId = getCurrentDeviceId();
      const isStillActive = activeDevices.some((d: any) => d.deviceId === currentDeviceId);

      if (currentDeviceId && !isStillActive && activeDevices.length > 0) {
        if (pollRef.current) clearInterval(pollRef.current);
        toast.error("Bu qurilma boshqa tomonidan chiqarib yuborildi!", {
          position: 'top-right', autoClose: 5000,
          theme: theme === 'dark' ? 'dark' : 'light',
        });
        localStorage.removeItem('deviceId');
        sessionStorage.removeItem('deviceId');
        sessionStorage.removeItem('currentUser');
        setTimeout(() => { window.location.href = '/login'; }, 3000);
        return;
      }

      setDevices(activeDevices);
    } catch (err: any) {
      if (err.response?.status !== 401) {
        console.error('Qurilmalarni yuklashda xato:', err.message);
      }
    }
  };

  useEffect(() => {
    if (!isOpen) {
      isMounted.current = false;
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      return;
    }

    isMounted.current = true;
    setLoading(true);
    
    // ✅ Modal ochilganda CSRF token ni olish va saqlash
    getCsrfToken().catch(err => console.error('CSRF token xatosi:', err));
    
    fetchDevices().finally(() => { if (isMounted.current) setLoading(false); });

    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(fetchDevices, 5000);

    return () => {
      isMounted.current = false;
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    };
  }, [isOpen]);

  const handleKick = async (deviceId: string, deviceName: string) => {
    if (!confirm(t('Tizimdan chiqarmoqchimisiz'))) return;
    setKickingDeviceId(deviceId);
    try {
      // ✅ CSRF token ni olish (localStorage dan yoki yangi)
      let csrfToken = localStorage.getItem('csrfToken');
      
      // Agar token yo'q bo'lsa, yangisini olish
      if (!csrfToken) {
        csrfToken = await getCsrfToken();
      }
      
      await axiosInstance.post('/kick-device',
        { deviceId },
        { headers: { 'X-CSRF-Token': csrfToken, 'CSRF-Token': csrfToken } }
      );
      setDevices(prev => prev.filter(d => d.deviceId !== deviceId));
      toast.success(`✅ Qurilma chiqarildi: ${deviceName}`, {
        position: 'top-right', autoClose: 4000,
        theme: theme === 'dark' ? 'dark' : 'light',
      });
      await fetchDevices();
    } catch (err: any) {
      const message = err.response?.data?.message || '';
      if (err.response?.status === 403 && message.includes('CSRF')) {
        // ✅ CSRF xatosi bo'lsa, yangi token olish va qayta urinish
        toast.warning("CSRF token muddati tugagan, yangilanmoqda...", {
          position: 'top-right', autoClose: 2000,
          theme: theme === 'dark' ? 'dark' : 'light',
        });
        
        try {
          const newToken = await getCsrfToken();
          await axiosInstance.post('/kick-device',
            { deviceId },
            { headers: { 'X-CSRF-Token': newToken, 'CSRF-Token': newToken } }
          );
          setDevices(prev => prev.filter(d => d.deviceId !== deviceId));
          toast.success(`✅ Qurilma chiqarildi: ${deviceName}`, {
            position: 'top-right', autoClose: 4000,
            theme: theme === 'dark' ? 'dark' : 'light',
          });
          await fetchDevices();
        } catch (retryErr: any) {
          toast.error(retryErr.response?.data?.message || "Qurilmani chiqarib bo'lmadi", {
            position: 'top-right', autoClose: 5000,
            theme: theme === 'dark' ? 'dark' : 'light',
          });
        }
      } else {
        toast.error(message || "Qurilmani chiqarib bo'lmadi", {
          position: 'top-right', autoClose: 5000,
          theme: theme === 'dark' ? 'dark' : 'light',
        });
      }
    } finally {
      setKickingDeviceId(null);
    }
  };

  if (!isOpen) return null;

  const currentDeviceId = getCurrentDeviceId();

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, backdropFilter: 'blur(8px)',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: theme === 'dark'
            ? 'linear-gradient(135deg, #1a1f2e 0%, #252b3d 100%)'
            : 'linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%)',
          borderRadius: '24px', padding: '40px',
          width: '90%', maxWidth: '620px',
          border: `1px solid ${theme === 'dark' ? '#2a3144' : '#e2e8f0'}`,
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
          maxHeight: '80vh', overflowY: 'auto',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 700, color: theme === 'dark' ? '#fff' : '#1a1f2e' }}>
            {t('devices')}
          </h2>
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', color: theme === 'dark' ? '#8b92a7' : '#64748b' }}>
            Yuklanmoqda...
          </p>
        ) : devices.length === 0 ? (
          <p style={{ textAlign: 'center', color: theme === 'dark' ? '#8b92a7' : '#64748b' }}>
            Hech qanday faol qurilma topilmadi
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[...devices]
              .sort((a, b) => {
                if (a.deviceId === currentDeviceId) return -1;
                if (b.deviceId === currentDeviceId) return 1;
                return 0;
              })
              .map(device => {
                const isCurrentDevice = device.deviceId === currentDeviceId;
                const isBeingKicked = kickingDeviceId === device.deviceId;

                const deviceDisplayName = device.deviceModel
                  || `${device.deviceOS || ''} ${device.deviceType || ''}`.trim()
                  || "Noma'lum qurilma";

                return (
                  <div
                    key={device.deviceId}
                    style={{
                      padding: '16px', borderRadius: '14px',
                      background: theme === 'dark' ? '#0f1420' : '#f8f9ff',
                      border: `1px solid ${isCurrentDevice ? '#10b98150' : (theme === 'dark' ? '#2a3144' : '#e2e8f0')}`,
                      display: 'flex', alignItems: 'flex-start', gap: '14px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)', position: 'relative',
                      opacity: isBeingKicked ? 0.5 : 1, transition: 'opacity 0.3s ease',
                    }}
                  >
                    {/* ICON */}
                    <div style={{
                      color: isCurrentDevice ? '#10b981' : '#667eea',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: '48px', height: '48px', borderRadius: '12px', flexShrink: 0,
                      marginTop: '2px',
                      background: isCurrentDevice ? 'rgba(16,185,129,0.1)' : 'rgba(102,126,234,0.1)',
                    }}>
                      {getDeviceIcon(device.deviceType, device.deviceOS)}
                    </div>

                    {/* MA'LUMOTLAR */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{
                        fontSize: '14px', fontWeight: 600, margin: '0 0 2px',
                        color: theme === 'dark' ? '#fff' : '#1a1f2e',
                        display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap',
                      }}>
                        {deviceDisplayName}
                      </h3>

                      <p style={{ fontSize: '12px', color: theme === 'dark' ? '#8b92a7' : '#64748b', margin: '2px 0' }}>
                        {[device.deviceOS, device.browser].filter(Boolean).join(' · ')}
                      </p>

                      {device.location && (
                        <p style={{
                          fontSize: '12px', color: theme === 'dark' ? '#667eea' : '#4f46e5',
                          margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: '4px',
                        }}>
                          <MapPin size={11} />
                          {device.location}
                        </p>
                      )}

                      {device.ip && (
                        <p style={{
                          fontSize: '11px', color: theme === 'dark' ? '#4a5168' : '#94a3b8',
                          margin: '2px 0 0', display: 'flex', alignItems: 'center', gap: '4px',
                        }}>
                          <Globe size={10} />
                          {device.ip}
                        </p>
                      )}

                      <p style={{
                        fontSize: '12px', color: theme === 'dark' ? '#8b92a7' : '#64748b',
                        margin: '4px 0 2px',
                      }}>
                        {formatDate(device.lastLogin)}
                      </p>

                      <span style={{ fontSize: '11px', color: '#4caf50', fontWeight: 600 }}>● Onlayn</span>
                    </div>

                    {/* JORIY QURILMA BADGE */}
                    {isCurrentDevice && (
                      <div style={{
                        position: 'absolute', top: '40px', right: '8px',
                        fontSize: '14px', color: '#10b981', fontWeight: 600,
                        background: 'rgba(16,185,129,0.1)', padding: '7px 15px', borderRadius: '50px',
                      }}>
                        Bu sizning qurilmangiz
                      </div>
                    )}

                    {/* KICK TUGMASI */}
                    {!isCurrentDevice && (
                      <button
                        onClick={() => handleKick(device.deviceId, deviceDisplayName)}
                        disabled={isBeingKicked}
                        style={{
                          padding: '8px 14px', alignSelf: 'center',
                          background: isBeingKicked ? 'rgba(239,68,68,0.05)' : 'rgba(239,68,68,0.1)',
                          color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)',
                          borderRadius: '8px', cursor: isBeingKicked ? 'not-allowed' : 'pointer',
                          fontSize: '13px', fontWeight: 600, minWidth: '130px', flexShrink: 0,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {isBeingKicked ? 'Chiqarilmoqda...' : 'Chiqarib yuborish'}
                      </button>
                    )}

                    {isCurrentDevice && <div style={{ width: '130px', flexShrink: 0 }} />}
                  </div>
                );
              })}
          </div>
        )}

        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <button
            onClick={onClose}
            style={{
              padding: '12px 32px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: '#fff', border: 'none', borderRadius: '12px',
              fontSize: '16px', fontWeight: 600, cursor: 'pointer',
            }}
          >
            Yopish
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Session kartasi ───────────────────────────────────────────────────────
interface SessionProps {
  theme: 'dark' | 'light';
  t: (key: string) => string;
  hoveredSetting: string | null;
  setHoveredSetting: React.Dispatch<React.SetStateAction<string | null>>;
  idx: string;
}

const Session: React.FC<SessionProps> = ({ theme, t, hoveredSetting, setHoveredSetting, idx }) => {
  const [isOpen, setIsOpen] = useState(false);

  // ✅ Komponent mount bo'lganda CSRF token ni olish
  useEffect(() => {
    getCsrfToken().catch(err => console.error('Initial CSRF token xatosi:', err));
  }, []);

  useEffect(() => {
    const checkIfKicked = async () => {
      const currentDeviceId = getCurrentDeviceId();
      if (!currentDeviceId) return;
      try {
        const res = await axiosInstance.get('/user-devices');
        const activeDevices = (res.data.devices || []).filter((d: any) => d.isActive === true);
        const isStillActive = activeDevices.some((d: any) => d.deviceId === currentDeviceId);
        if (activeDevices.length > 0 && !isStillActive) {
          toast.error("⚠️ Siz boshqa qurilma tomonidan tizimdan chiqarildingiz!", {
            position: 'top-right', autoClose: 5000,
            theme: theme === 'dark' ? 'dark' : 'light',
          });
          localStorage.removeItem('deviceId');
          sessionStorage.removeItem('deviceId');
          sessionStorage.removeItem('currentUser');
          setTimeout(() => { window.location.href = '/login'; }, 3000);
        }
      } catch { }
    };

    const interval = setInterval(() => {
      if (!isOpen) checkIfKicked();
    }, 15000);

    return () => clearInterval(interval);
  }, [isOpen, theme]);

  return (
    <>
      <div
        onMouseEnter={() => setHoveredSetting(idx)}
        onMouseLeave={() => setHoveredSetting(null)}
        onClick={() => setIsOpen(true)}
        style={{
          background: theme === 'dark'
            ? 'linear-gradient(135deg, #1a1f2e 0%, #252b3d 100%)'
            : 'linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%)',
          borderRadius: '16px', padding: '20px',
          border: hoveredSetting === idx
            ? '1px solid #667eea'
            : `1px solid ${theme === 'dark' ? '#2a3144' : '#e2e8f0'}`,
          cursor: 'pointer', transition: 'all 0.3s ease',
          transform: hoveredSetting === idx ? 'translateY(-2px)' : 'translateY(0)',
          boxShadow: hoveredSetting === idx ? '0 8px 24px rgba(102,126,234,0.2)' : 'none',
        }}
      >
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '10px',
            background: theme === 'dark' ? 'rgba(102,126,234,0.1)' : 'rgba(79,70,229,0.1)',
            color: '#667eea', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Smartphone size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: '19px', fontWeight: 600, color: theme === 'dark' ? '#fff' : '#1a1f2e' }}>
              {t('devices')}
            </h3>
            <p style={{ fontSize: '13px', color: theme === 'dark' ? '#8b92a7' : '#64748b', marginBottom: 0 }}>
              {t('devicesDescription')}
            </p>
          </div>
          <ChevronRight size={20} color={theme === 'dark' ? '#8b92a7' : '#64748b'} style={{ flexShrink: 0, marginTop: '10px' }} />
        </div>
      </div>

      <DevicesModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        theme={theme}
      />
    </>
  );
};

export default Session;