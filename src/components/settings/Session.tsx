// src/components/settings/Session.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Smartphone, ChevronRight, Laptop, Tablet } from "lucide-react";
import axiosInstance, { getMemoryCsrfToken } from '../../api/axiosInstance'; // ✅ getMemoryCsrfToken import
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { getSocket } from '../../utils/socket';
import { clearAuthClientState } from '../../utils/clientSession';

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

// ✅ getCsrfToken() — BUTUNLAY O'CHIRILDI
// ✅ localStorage.setItem('csrfToken') — O'CHIRILDI
// ✅ getMemoryCsrfToken() — axiosInstance dan ishlatiladi

const forceLogout = (message: string, theme: 'dark' | 'light') => {
  toast.error(message, {
    position: 'top-right', autoClose: 5000,
    theme: theme === 'dark' ? 'dark' : 'light',
  });
  clearAuthClientState();
  localStorage.removeItem('deviceId');
  sessionStorage.removeItem('deviceId');
  setTimeout(() => { window.location.href = '/login'; }, 3000);
};

// ─── DevicesModal ──────────────────────────────────────────────────────────
function DevicesModal({
  isOpen, onClose, theme,
}: {
  isOpen: boolean;
  onClose: () => void;
  theme: 'dark' | 'light';
}) {
  const { t } = useTranslation(['settings', 'common']);
  const [devices, setDevices]               = useState<any[]>([]);
  const [loading, setLoading]               = useState(true);
  const [kickingDeviceId, setKickingDeviceId] = useState<string | null>(null);
  const [currentDeviceId, setCurrentDeviceId] = useState<string>('');
  const isMounted = useRef(false);
  const pollRef   = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchDevices = async () => {
    try {
      const res = await axiosInstance.get('/user-devices');
      if (!isMounted.current) return;

      // Qurilmalar = OnDex markaziy sessiyalari (A4c.5); joriysini server belgilaydi
      // (`current`) — brauzerdagi deviceId bilan solishtirilMAYDI.
      const activeDevices  = (res.data.devices || []).filter((d: any) => d.isActive === true);
      const cur = (activeDevices as Array<{ deviceId: string; current?: boolean }>).find((d) => d.current === true);
      setCurrentDeviceId(cur ? cur.deviceId : '');

      if (!cur && activeDevices.length > 0) {
        if (pollRef.current) clearInterval(pollRef.current);
        forceLogout(t('sessionKickedError'), theme);
        return;
      }

      setDevices(activeDevices);
    } catch (err: any) {
      // ✅ console.error O'CHIRILDI — faqat 401 bo'lmasa silent xato
      if (err.response?.status === 401) return; // token muddati o'tgan — silent
    }
  };

  useEffect(() => {
    if (!isOpen) {
      isMounted.current = false;
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      setDevices([]);
      return;
    }

    isMounted.current = true;
    setLoading(true);

    const load = async () => {
      await fetchDevices();
      if (isMounted.current) setLoading(false);
    };
    load();

    // ✅ 15 soniyada bir polling — modal ochiq bo'lganda
    pollRef.current = setInterval(() => {
      if (isMounted.current) fetchDevices();
    }, 15000);

    return () => {
      isMounted.current = false;
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    };
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleKick = async (deviceId: string, deviceName: string) => {
    if (!confirm(t('sessionKickConfirm'))) return;
    setKickingDeviceId(deviceId);

    try {
      // ✅ CSRF — memory dan olinadi (localStorage YO'Q, getCsrfToken() YO'Q)
      const csrfToken = getMemoryCsrfToken() ?? '';

      await axiosInstance.post(
        '/kick-device',
        { deviceId },
        { headers: { 'CSRF-Token': csrfToken } } // ✅ faqat bitta nom
      );

      setDevices(prev => prev.filter(d => d.deviceId !== deviceId));
      toast.success(`${t('sessionKickSuccess')}: ${deviceName}`, {
        position: 'top-right', autoClose: 4000,
        theme: theme === 'dark' ? 'dark' : 'light',
      });
      await fetchDevices();

    } catch (err: any) {
      // ✅ console.error O'CHIRILDI
      const status  = err.response?.status;
      const message = err.response?.data?.message ?? '';

      // ✅ CSRF muddati o'tgan — bir marta retry (server yangi token beradi)
      if (status === 403 && message.includes('CSRF')) {
        toast.warning(t('sessionCsrfExpired'), {
          position: 'top-right', autoClose: 2000,
          theme: theme === 'dark' ? 'dark' : 'light',
        });

        try {
          // ✅ Yangi CSRF token serverdan olinadi — axiosInstance interceptor qaytaradi
          const retryRes = await axiosInstance.get('/csrf-token');
          const newToken: string = retryRes.data?.csrfToken ?? retryRes.data?.token ?? '';

          await axiosInstance.post(
            '/kick-device',
            { deviceId },
            { headers: { 'CSRF-Token': newToken } } // ✅ faqat bitta nom
          );

          setDevices(prev => prev.filter(d => d.deviceId !== deviceId));
          toast.success(`${t('sessionKickSuccess')}: ${deviceName}`, {
            position: 'top-right', autoClose: 4000,
            theme: theme === 'dark' ? 'dark' : 'light',
          });
          await fetchDevices();
        } catch {
          // ✅ console.error O'CHIRILDI
          toast.error(t('sessionKickError'), {
            position: 'top-right', autoClose: 4000,
            theme: theme === 'dark' ? 'dark' : 'light',
          });
        }

      } else {
        toast.error(t('sessionKickError'), {
          position: 'top-right', autoClose: 4000,
          theme: theme === 'dark' ? 'dark' : 'light',
        });
      }
    } finally {
      setKickingDeviceId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, backdropFilter: 'blur(8px)'
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: theme === 'dark'
            ? 'linear-gradient(135deg, #1a1f2e 0%, #252b3d 100%)'
            : 'linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%)',
          borderRadius: '24px', padding: '40px', width: '90%', maxWidth: '620px',
          border: `1px solid ${theme === 'dark' ? '#2a3144' : '#e2e8f0'}`,
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
          maxHeight: '80vh', overflowY: 'auto'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 700, color: theme === 'dark' ? '#fff' : '#1a1f2e' }}>
            {t('devices')}
          </h2>
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', color: theme === 'dark' ? '#8b92a7' : '#64748b' }}>
            {t('loading')}
          </p>
        ) : devices.length === 0 ? (
          <p style={{ textAlign: 'center', color: theme === 'dark' ? '#8b92a7' : '#64748b' }}>
            {t('noDevicesFound')}
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
                const isCurrentDevice  = device.deviceId === currentDeviceId;
                const isBeingKicked    = kickingDeviceId === device.deviceId;
                const deviceDisplayName =
                  device.deviceModel ||
                  `${device.deviceOS || ''} ${device.deviceType || ''}`.trim() ||
                  t('unknownDevice');

                return (
                  <div
                    key={device.deviceId}
                    style={{
                      padding: '16px', borderRadius: '14px',
                      background: theme === 'dark' ? '#0f1420' : '#f8f9ff',
                      border: `1px solid ${isCurrentDevice ? '#10b98150' : (theme === 'dark' ? '#2a3144' : '#e2e8f0')}`,
                      display: 'flex', alignItems: 'flex-start', gap: '14px',
                      opacity: isBeingKicked ? 0.5 : 1, transition: 'opacity 0.3s ease'
                    }}
                  >
                    {/* Qurilma ikonkasi */}
                    <div style={{
                      color: isCurrentDevice ? '#10b981' : '#667eea',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: '48px', height: '48px', borderRadius: '12px', flexShrink: 0,
                      background: isCurrentDevice ? 'rgba(16,185,129,0.1)' : 'rgba(102,126,234,0.1)'
                    }}>
                      {getDeviceIcon(device.deviceType, device.deviceOS)}
                    </div>

                    {/* Qurilma ma'lumotlari */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{
                        fontSize: '14px', fontWeight: 600, margin: '0 0 2px',
                        color: theme === 'dark' ? '#fff' : '#1a1f2e'
                      }}>
                        {deviceDisplayName}
                      </h3>
                      <p style={{
                        fontSize: '12px', color: theme === 'dark' ? '#8b92a7' : '#64748b', margin: '2px 0'
                      }}>
                        {[device.deviceOS, device.browser].filter(Boolean).join(' · ')}
                      </p>
                      <p style={{
                        fontSize: '12px', color: theme === 'dark' ? '#8b92a7' : '#64748b', margin: '4px 0 2px'
                      }}>
                        {formatDate(device.lastLogin)}
                      </p>
                      <span style={{ fontSize: '11px', color: '#4caf50', fontWeight: 600 }}>
                        {t('onlineStatus')}
                      </span>
                    </div>

                    {/* Badge yoki Kick tugmasi */}
                    {isCurrentDevice ? (
                      <div style={{
                        fontSize: '12px', color: '#10b981', fontWeight: 600,
                        background: 'rgba(16,185,129,0.1)', padding: '6px 12px',
                        borderRadius: '50px', alignSelf: 'center'
                      }}>
                        {t('currentDeviceBadge')}
                      </div>
                    ) : (
                      <button
                        onClick={() => handleKick(device.deviceId, deviceDisplayName)}
                        disabled={isBeingKicked}
                        style={{
                          padding: '8px 14px', alignSelf: 'center',
                          background: '#ef444415', color: '#ef4444',
                          border: '1px solid #ef444430', borderRadius: '8px',
                          cursor: isBeingKicked ? 'not-allowed' : 'pointer',
                          fontSize: '13px', fontWeight: 600, minWidth: '120px'
                        }}
                      >
                        {isBeingKicked ? t('kickingBtn') : t('kickDeviceBtn')}
                      </button>
                    )}
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
              fontSize: '16px', fontWeight: 600, cursor: 'pointer'
            }}
          >
            {t('closeBtn')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Session kartasi ───────────────────────────────────────────────────────
interface SessionProps {
  theme: 'dark' | 'light';
  hoveredSetting: string | null;
  setHoveredSetting: React.Dispatch<React.SetStateAction<string | null>>;
  idx: string;
}

const Session: React.FC<SessionProps> = ({ theme, hoveredSetting, setHoveredSetting, idx }) => {
  const { t } = useTranslation(['settings', 'common']); // ✅ 'common' qo'shildi, umumiy tarjimalar uchun
  const [isOpen, setIsOpen] = useState(false);
  const tRef     = useRef(t);
  const themeRef = useRef(theme);

  useEffect(() => { tRef.current = t; }, [t]);
  useEffect(() => { themeRef.current = theme; }, [theme]);

  // ✅ getCsrfToken() useEffect — O'CHIRILDI (memory dan avtomatik olinadi)

  // ✅ Socket — faqat bir marta, forceLogout tinglash
  useEffect(() => {
    const socket = getSocket();

    const handleForceLogout = (data: { reason?: string }) => {
      // ✅ console.log O'CHIRILDI — stack trace chiqmasin
      forceLogout(
        data?.reason ?? tRef.current('sessionKickedWarn'),
        themeRef.current
      );
    };

    // ✅ Avval o'chirish — takrorlanmaslik uchun
    socket.off('forceLogout', handleForceLogout);
    socket.on('forceLogout', handleForceLogout);

    return () => {
      socket.off('forceLogout', handleForceLogout);
    };
  }, []); // ✅ Bo'sh — bir marta ishga tushadi

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
          borderRadius: '16px', padding: '20px', cursor: 'pointer',
          transition: 'all 0.3s ease',
          border: hoveredSetting === idx
            ? '1px solid #667eea'
            : `1px solid ${theme === 'dark' ? '#2a3144' : '#e2e8f0'}`,
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
          <ChevronRight
            size={20}
            color={theme === 'dark' ? '#8b92a7' : '#64748b'}
            style={{ flexShrink: 0, marginTop: '10px' }}
          />
        </div>
      </div>

      <DevicesModal isOpen={isOpen} onClose={() => setIsOpen(false)} theme={theme} />
    </>
  );
};

export default Session;
