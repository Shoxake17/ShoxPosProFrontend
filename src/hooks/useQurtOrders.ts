// Qurt buyurtmalari (do'kon paneli): so'rovlar va jonli yangilanish.
//
// Buyurtmalar OnDex'da saqlanadi; ShoxPos backend ularni do'konga beradi (mijozning
// manzili va telefonisiz). Yangilanish: davriy so'rov (asosiy, har doim ishlaydi) +
// OnDex'dan kelgan jonli signal (socket `qurtOrder`) — u faqat tezlashtiradi.
import { useCallback, useEffect, useRef, useState } from 'react';
import axiosInstance from '../api/axiosInstance';
import getSocket from '../utils/socket';

export type QurtOrderStatus =
  | 'new' | 'confirmed' | 'rejected' | 'packed' | 'collected'
  | 'out_for_delivery' | 'delivered' | 'failed' | 'cancelled';

export interface QurtOrderItem {
  barcode: string;
  name: string;
  qty: number;
  price_tiyin: number;
  image_url?: string;
  weight_grams?: number;
}

export interface QurtOrder {
  id: string;
  number: string;
  status: QurtOrderStatus;
  delivery_date: string;
  items: QurtOrderItem[];
  total_tiyin: number;
  customer_name: string;
  reject_reason?: string;
  history: { to: QurtOrderStatus; at: string }[];
  created_at: string;
  payment_method: string;
}

/** Axios xatosidan foydalanuvchiga ko'rsatiladigan matn (server xabari bo'lsa o'sha). */
export function qurtErrorText(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: string } } };
  const m = e?.response?.data?.message;
  return typeof m === 'string' && m ? m : fallback;
}

export async function fetchQurtOrders(status?: string): Promise<QurtOrder[]> {
  const res = await axiosInstance.get('/qurt-orders', {
    params: { limit: 200, ...(status ? { status } : {}) },
  });
  return Array.isArray(res.data?.orders) ? (res.data.orders as QurtOrder[]) : [];
}

export async function transitionQurtOrder(id: string, to: 'confirmed' | 'rejected' | 'packed', reason?: string): Promise<QurtOrder> {
  const res = await axiosInstance.post(`/qurt-orders/${encodeURIComponent(id)}/transition`, { to, reason: reason ?? '' });
  return res.data.order as QurtOrder;
}

/** Yangi buyurtma kelganda qisqa ikki tonli signal (autoplay bloklangan bo'lsa jim o'tadi). */
export function playNewOrderSound(): void {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const beep = (freq: number, at: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + at);
      gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + at + 0.28);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + at);
      osc.stop(ctx.currentTime + at + 0.3);
    };
    beep(880, 0);
    beep(1175, 0.32);
    setTimeout(() => ctx.close().catch(() => {}), 1200);
  } catch {
    /* ovoz ixtiyoriy */
  }
}

/**
 * Buyurtmalar ro'yxati: davriy so'rov + jonli signal. `onNew` — oldin ko'rilmagan YANGI
 * (`new`) buyurtma paydo bo'lganda (birinchi yuklashda chaqirilmaydi).
 */
export function useQurtOrders(pollMs = 20000, onNew?: (fresh: QurtOrder[]) => void) {
  const [orders, setOrders] = useState<QurtOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const seenNew = useRef<Set<string> | null>(null);
  const onNewRef = useRef(onNew);
  onNewRef.current = onNew;
  const inflight = useRef(false);

  const reload = useCallback(async () => {
    if (inflight.current) return;
    inflight.current = true;
    try {
      const list = await fetchQurtOrders();
      setOrders(list);
      setError('');
      const nowNew = list.filter((o) => o.status === 'new');
      if (seenNew.current) {
        const fresh = nowNew.filter((o) => !seenNew.current!.has(o.id));
        if (fresh.length > 0) onNewRef.current?.(fresh);
      }
      seenNew.current = new Set(nowNew.map((o) => o.id));
    } catch (e) {
      setError(qurtErrorText(e, "Buyurtmalarni yuklab bo'lmadi"));
    } finally {
      inflight.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
    const timer = setInterval(() => { if (!document.hidden) reload(); }, pollMs);
    const onVisible = () => { if (!document.hidden) reload(); };
    document.addEventListener('visibilitychange', onVisible);

    const socket = getSocket();
    const onSignal = () => reload();
    socket.on('qurtOrder', onSignal);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      socket.off('qurtOrder', onSignal);
    };
  }, [reload, pollMs]);

  return { orders, setOrders, loading, error, reload };
}

/** Yon menyudagi belgi uchun: yangi buyurtmalar soni (faqat `enabled` bo'lsa so'raydi). */
export function useQurtNewCount(enabled: boolean, pollMs = 60000): number {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!enabled) { setCount(0); return; }
    let alive = true;
    const load = async () => {
      try {
        const list = await fetchQurtOrders('new');
        if (alive) setCount(list.length);
      } catch {
        /* belgi ixtiyoriy */
      }
    };
    load();
    const timer = setInterval(() => { if (!document.hidden) load(); }, pollMs);
    const socket = getSocket();
    socket.on('qurtOrder', load);
    return () => { alive = false; clearInterval(timer); socket.off('qurtOrder', load); };
  }, [enabled, pollMs]);
  return count;
}
