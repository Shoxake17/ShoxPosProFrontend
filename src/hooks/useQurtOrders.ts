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
  /** Logistika: do'kon biriktirgan kuryer va naqd pul holati. */
  courier_id?: string;
  cash_status?: 'held' | 'settled';
  cash_tiyin?: number;
}

export interface QurtCourier {
  id: string;
  name: string;
  phone: string;
  summary: { held_tiyin: number; held_orders: number; active_orders: number };
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
    const timer = setInterval(reload, pollMs);
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
    const timer = setInterval(load, pollMs);
    const socket = getSocket();
    socket.on('qurtOrder', load);
    return () => { alive = false; clearInterval(timer); socket.off('qurtOrder', load); };
  }, [enabled, pollMs]);
  return count;
}

// ── Logistika: do'konning o'z kuryerlari ─────────────────────────────

export async function fetchQurtCouriers(): Promise<QurtCourier[]> {
  const res = await axiosInstance.get('/qurt-couriers');
  return Array.isArray(res.data?.couriers) ? (res.data.couriers as QurtCourier[]) : [];
}

export async function addQurtCourier(name: string, phone: string): Promise<void> {
  await axiosInstance.post('/qurt-couriers', { name, phone });
}

export async function removeQurtCourier(id: string): Promise<void> {
  await axiosInstance.delete(`/qurt-couriers/${encodeURIComponent(id)}`);
}

/** Kuryerdagi naqd pulni qabul qiladi: {orders, total_tiyin}. */
export async function settleQurtCourier(id: string): Promise<{ orders: number; total_tiyin: number }> {
  const res = await axiosInstance.post(`/qurt-couriers/${encodeURIComponent(id)}/settle`, {});
  return res.data.result;
}

/** Reysni (sana) yoki tanlangan buyurtmalarni kuryerga biriktiradi: {assigned, skipped}. */
export async function assignQurtOrders(courierId: string, target: { date?: string; orderIds?: string[] }): Promise<{ assigned: number; skipped: number }> {
  const res = await axiosInstance.post('/qurt-assign', { courierId, ...target });
  return res.data.result;
}

export async function unassignQurtOrder(id: string): Promise<void> {
  await axiosInstance.post(`/qurt-orders/${encodeURIComponent(id)}/unassign`, {});
}
