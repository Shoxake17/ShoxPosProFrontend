import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, X } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import getSocket from '../utils/socket';
import { fetchQurtOrders } from '../hooks/useQurtOrders';
import {
  attachAudioUnlock,
  flashTitle,
  isAudioReady,
  notificationPermission,
  requestNotificationPermission,
  ring,
  showSystemNotification,
  unlockAudio,
} from '../utils/qurtAlert';

/**
 * Qurt do'koni uchun YANGI BUYURTMA signali — har qanday sahifada (MainLayout ichida turadi):
 * qo'ng'iroq ovozi, tizim bildirishnomasi, sarlavha miltillashi va sahifa ustidagi xabar.
 *
 * Manba: OnDex -> ShoxPos jonli signal (socket `qurtOrder`) + zaxira: har 30 soniyada
 * yangi buyurtmalarni so'rab, ilgari ko'rilmaganini aniqlash (socket uzilsa ham signal yo'qolmasin).
 * Bir buyurtma uchun signal BIR MARTA (ikkala manba ham bo'lsa takrorlanmaydi).
 *
 * Ovoz va ruxsat brauzer qoidasiga ko'ra foydalanuvchi harakatidan keyin ochiladi: birinchi
 * bosishda avtomatik, yoki pastdagi "Yoqish" tugmasi bilan.
 */

interface Toast {
  key: string;
  text: string;
  kind: 'new' | 'info';
}

const POLL_MS = 30000;
const TOAST_MS = 20000;

export default function QurtOrderAlerts() {
  const { user } = useAuthStore();
  const enabled = user?.storeCategory === 'qurt';
  const navigate = useNavigate();

  const [toasts, setToasts] = useState<Toast[]>([]);
  const [needEnable, setNeedEnable] = useState(false);
  const announced = useRef<Set<string>>(new Set());
  const primed = useRef(false);

  const pushToast = useCallback((t: Toast) => {
    setToasts((prev) => [...prev.filter((x) => x.key !== t.key), t].slice(-4));
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.key !== t.key)), TOAST_MS);
  }, []);

  const announceNew = useCallback((orderId: string, number: string) => {
    if (announced.current.has(orderId)) return; // takror signal
    announced.current.add(orderId);
    if (announced.current.size > 500) announced.current.delete(announced.current.values().next().value as string);

    ring(3);
    void showSystemNotification('🛒 Yangi buyurtma', `№ ${number} — qabul qilish uchun oching`, `qurt-${orderId}`);
    flashTitle('🔔 Yangi buyurtma!');
    pushToast({ key: orderId, text: `Yangi buyurtma № ${number}`, kind: 'new' });
  }, [pushToast]);

  useEffect(() => {
    if (!enabled) return;

    setNeedEnable(notificationPermission() === 'default' || !isAudioReady());
    const detach = attachAudioUnlock(() => {
      void requestNotificationPermission().finally(() => setNeedEnable(notificationPermission() === 'default'));
    });

    const socket = getSocket();
    const onSignal = (p: { event?: string; orderId?: string; number?: string }) => {
      if (!p || typeof p.orderId !== 'string' || typeof p.number !== 'string') return;
      if (p.event === 'created') announceNew(p.orderId, p.number);
      else if (p.event === 'cancelled') {
        pushToast({ key: `x-${p.orderId}`, text: `Buyurtma № ${p.number} bekor qilindi`, kind: 'info' });
      }
    };
    socket.on('qurtOrder', onSignal);

    // Zaxira: davriy so'rov. Birinchi javob faqat "bor narsa" ni eslab qoladi (ovozsiz).
    let alive = true;
    const poll = async () => {
      try {
        const list = await fetchQurtOrders('new');
        if (!alive) return;
        if (!primed.current) {
          list.forEach((o) => announced.current.add(o.id));
          primed.current = true;
          return;
        }
        list.forEach((o) => announceNew(o.id, o.number));
      } catch {
        /* keyingi urinishda */
      }
    };
    void poll();
    const timer = setInterval(poll, POLL_MS);

    return () => {
      alive = false;
      detach();
      clearInterval(timer);
      socket.off('qurtOrder', onSignal);
    };
  }, [enabled, announceNew, pushToast]);

  if (!enabled) return null;

  const enableNow = async () => {
    unlockAudio();
    await requestNotificationPermission();
    ring(1); // tekshiruv: ovoz eshitilishi kerak
    setNeedEnable(false);
  };

  return (
    <div
      aria-live="polite"
      style={{
        position: 'fixed', right: 16, bottom: 96, zIndex: 3000, display: 'flex',
        flexDirection: 'column', gap: 10, fontFamily: "'DM Sans', sans-serif", maxWidth: 'min(360px, calc(100vw - 32px))',
      }}
    >
      {needEnable && (
        <div style={{
          background: '#111827', color: '#f1f5f9', border: '1px solid #334155', borderRadius: 14,
          padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5,
          boxShadow: '0 10px 30px rgba(0,0,0,.4)',
        }}>
          <Bell size={18} color="#f59e0b" style={{ flexShrink: 0 }} />
          <span style={{ flex: 1 }}>Yangi buyurtmalar ovoz va bildirishnoma bilan kelishi uchun yoqing</span>
          <button
            type="button" onClick={enableNow}
            style={{ background: '#6366f1', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 12px', fontWeight: 700, cursor: 'pointer' }}
          >Yoqish</button>
        </div>
      )}
      {toasts.map((t) => (
        <div
          key={t.key} role="alert"
          style={{
            background: t.kind === 'new' ? '#6366f1' : '#334155', color: '#fff', borderRadius: 14,
            padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700,
            boxShadow: '0 12px 32px rgba(0,0,0,.45)',
          }}
        >
          <Bell size={18} style={{ flexShrink: 0 }} />
          <span style={{ flex: 1 }}>{t.text}</span>
          {t.kind === 'new' && (
            <button
              type="button"
              onClick={() => { setToasts((p) => p.filter((x) => x.key !== t.key)); navigate('/orders'); }}
              style={{ background: '#fff', color: '#4f46e5', border: 'none', borderRadius: 10, padding: '7px 12px', fontWeight: 800, cursor: 'pointer' }}
            >Ko'rish</button>
          )}
          <button
            type="button" aria-label="Yopish"
            onClick={() => setToasts((p) => p.filter((x) => x.key !== t.key))}
            style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex' }}
          ><X size={16} /></button>
        </div>
      ))}
    </div>
  );
}
