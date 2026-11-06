import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, BellOff, X } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import getSocket from '../utils/socket';
import { useLiveRefresh } from '../hooks/useLiveRefresh';
import { hasOnlineOrders } from '../utils/storeAccess';
import { fetchMerchantOrders } from '../hooks/useMerchantOrders';
import {
  attachAudioUnlock,
  flashTitle,
  isAudioReady,
  isSoundEnabled,
  notificationPermission,
  requestNotificationPermission,
  ring,
  setSoundEnabled,
  showSystemNotification,
  startLoop,
  stopLoop,
  unlockAudio,
} from '../utils/orderAlert';

/**
 * Onlayn buyurtma moduli yoqilgan do'kon uchun YANGI BUYURTMA signali — har qanday sahifada (MainLayout ichida turadi):
 * qo'ng'iroq ovozi, tizim bildirishnomasi, sarlavha miltillashi va sahifa ustidagi xabar.
 *
 * Manba: OnDex -> ShoxPos jonli signal (socket `storeOrder`) + zaxira: har 30 soniyada
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

const TOAST_MS = 20000;

export default function OrderAlerts() {
  const { user } = useAuthStore();
  const enabled = hasOnlineOrders(user?.storeCategory);
  const navigate = useNavigate();

  const [toasts, setToasts] = useState<Toast[]>([]);
  const [needEnable, setNeedEnable] = useState(false);
  const announced = useRef<Set<string>>(new Set());
  const primed = useRef(false);
  // Qabul qilinmagan (`new`) buyurtmalar soni: > 0 bo'lsa qo'ng'iroq TO'XTAMAY takrorlanadi.
  const [pending, setPending] = useState(0);
  const [soundOn, setSoundOn] = useState(isSoundEnabled());
  const [unlockTick, setUnlockTick] = useState(0); // ovoz ochilganda qo'ng'iroqni qayta urinish uchun

  const pushToast = useCallback((t: Toast) => {
    setToasts((prev) => [...prev.filter((x) => x.key !== t.key), t].slice(-4));
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.key !== t.key)), TOAST_MS);
  }, []);

  const announceNew = useCallback((orderId: string, number: string) => {
    if (announced.current.has(orderId)) return; // takror signal
    announced.current.add(orderId);
    if (announced.current.size > 500) announced.current.delete(announced.current.values().next().value as string);

    setPending((n) => Math.max(n, 1)); // darrov jiringlasin; aniq sonni keyingi so'rov qo'yadi
    void showSystemNotification('🛒 Yangi buyurtma', `№ ${number} — qabul qilish uchun oching`, `order-${orderId}`);
    flashTitle('🔔 Yangi buyurtma!');
    pushToast({ key: orderId, text: `Yangi buyurtma № ${number}`, kind: 'new' });
  }, [pushToast]);

  // Server holati bilan solishtirish. Birinchi javob faqat "bor narsa" ni eslab qoladi (ovozsiz);
  // keyingilarida ilgari ko'rilmagan yangi buyurtma e'lon qilinadi (announceNew takrorni o'tkazmaydi).
  const poll = useCallback(async () => {
    try {
      const list = await fetchMerchantOrders('new');
      setPending(list.length);
      if (!primed.current) {
        list.forEach((o) => announced.current.add(o.id));
        primed.current = true;
        return;
      }
      list.forEach((o) => announceNew(o.id, o.number));
    } catch {
      /* keyingi signal/urinishda */
    }
  }, [announceNew]);

  useEffect(() => {
    if (!enabled) return;

    setNeedEnable(notificationPermission() === 'default' || !isAudioReady());
    const detach = attachAudioUnlock(() => {
      setUnlockTick((t) => t + 1);
      void requestNotificationPermission().finally(() => setNeedEnable(notificationPermission() === 'default'));
    });
    // Buyurtma shu panelning o'zida qabul/rad etilsa ovoz DARHOL to'xtashi uchun (signalni kutmasdan).
    const onChanged = () => { void poll(); };
    window.addEventListener('merchant-orders-changed', onChanged);

    const socket = getSocket();
    const onSignal = (p: { event?: string; orderId?: string; number?: string }) => {
      if (!p || typeof p.orderId !== 'string' || typeof p.number !== 'string') return;
      if (p.event === 'created') announceNew(p.orderId, p.number);
      else if (p.event === 'cancelled') {
        pushToast({ key: `x-${p.orderId}`, text: `Buyurtma № ${p.number} bekor qilindi`, kind: 'info' });
      }
    };
    socket.on('storeOrder', onSignal);

    void poll();

    return () => {
      detach();
      window.removeEventListener('merchant-orders-changed', onChanged);
      socket.off('storeOrder', onSignal);
      stopLoop();
    };
  }, [enabled, announceNew, pushToast, poll]);

  // Qo'ng'iroq: qabul qilinmagan buyurtma bor va ovoz yoqiq ekan — to'xtamay; yo'q bo'lsa jim.
  // Brauzer bloklasa (sahifa hali bosilmagan) "Yoqish" ko'rsatiladi va bosilishi bilan qayta uriniladi.
  useEffect(() => {
    if (!enabled) return;
    if (pending > 0 && soundOn) {
      void startLoop().then((ok) => {
        if (!ok && isSoundEnabled()) { setNeedEnable(true); ring(3); }
      });
    } else {
      stopLoop();
    }
  }, [enabled, pending, soundOn, unlockTick]);

  // Jonli: har bir signalda ro'yxat tekshiriladi (takror ovoz yo'q); soket uzilsa — vaqtincha so'rov,
  // qayta ulanganda uzilish paytida kelgan buyurtmalar darrov aniqlanadi.
  useLiveRefresh(poll, { fallbackMs: 10000, enabled });

  if (!enabled) return null;

  const enableNow = async () => {
    unlockAudio();
    await requestNotificationPermission();
    if (pending === 0) ring(1); // tekshiruv: ovoz eshitilishi kerak (buyurtma bo'lsa qo'ng'iroq o'zi boshlanadi)
    setUnlockTick((t) => t + 1);
    setNeedEnable(false);
  };

  const toggleSound = () => {
    const next = !soundOn;
    setSoundEnabled(next);
    setSoundOn(next);
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
      {pending > 0 && (
        <div style={{
          background: '#b45309', color: '#fff', borderRadius: 14, padding: '10px 14px',
          display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700,
          boxShadow: '0 12px 32px rgba(0,0,0,.45)',
        }}>
          <Bell size={18} style={{ flexShrink: 0 }} />
          <span style={{ flex: 1 }}>{pending} ta yangi buyurtma qabul qilishni kutmoqda</span>
          <button
            type="button" onClick={() => navigate('/orders')}
            style={{ background: '#fff', color: '#b45309', border: 'none', borderRadius: 10, padding: '7px 12px', fontWeight: 800, cursor: 'pointer' }}
          >Ko'rish</button>
          <button
            type="button" onClick={toggleSound}
            aria-label={soundOn ? "Ovozni o'chirish" : 'Ovozni yoqish'}
            title={soundOn ? "Ovozni o'chirish" : 'Ovozni yoqish'}
            style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex' }}
          >{soundOn ? <Bell size={16} /> : <BellOff size={16} />}</button>
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
