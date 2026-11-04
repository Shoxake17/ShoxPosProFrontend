// Buyurtmalar (do'kon paneli): so'rovlar va jonli yangilanish.
//
// Buyurtmalar OnDex'da saqlanadi; ShoxPos backend ularni do'konga beradi (mijozning
// manzili va telefonisiz). Yangilanish JONLI: OnDex'dan kelgan signal (socket `storeOrder`) darrov
// ro'yxatni yangilaydi; so'rov (polling) faqat jonli ulanish uzilgan paytda vaqtincha ishlaydi.
import { useCallback, useEffect, useRef, useState } from 'react';
import axiosInstance from '../api/axiosInstance';
import { useLiveRefresh } from './useLiveRefresh';

export type MerchantOrderStatus =
  | 'new' | 'confirmed' | 'rejected' | 'packed' | 'collected'
  | 'out_for_delivery' | 'delivered' | 'failed' | 'cancelled';

export interface MerchantOrderItem {
  barcode: string;
  name: string;
  qty: number;
  price_tiyin: number;
  image_url?: string;
  weight_grams?: number;
}

export interface MerchantOrder {
  id: string;
  number: string;
  status: MerchantOrderStatus;
  delivery_date: string;
  items: MerchantOrderItem[];
  total_tiyin: number;
  customer_name: string;
  reject_reason?: string;
  history: { to: MerchantOrderStatus; at: string }[];
  created_at: string;
  payment_method: string;
  /** Logistika: do'kon biriktirgan kuryer va naqd pul holati. */
  courier_id?: string;
  cash_status?: 'held' | 'settled';
  cash_tiyin?: number;
}

export interface MerchantCourier {
  id: string;
  name: string;
  phone: string;
  summary: { held_tiyin: number; held_orders: number; active_orders: number };
}

/** Axios xatosidan foydalanuvchiga ko'rsatiladigan matn (server xabari bo'lsa o'sha). */
export function orderErrorText(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: string } } };
  const m = e?.response?.data?.message;
  return typeof m === 'string' && m ? m : fallback;
}

export async function fetchMerchantOrders(status?: string): Promise<MerchantOrder[]> {
  const res = await axiosInstance.get('/store-orders', {
    params: { limit: 200, ...(status ? { status } : {}) },
  });
  return Array.isArray(res.data?.orders) ? (res.data.orders as MerchantOrder[]) : [];
}

export async function transitionMerchantOrder(id: string, to: 'confirmed' | 'rejected' | 'packed', reason?: string): Promise<MerchantOrder> {
  const res = await axiosInstance.post(`/store-orders/${encodeURIComponent(id)}/transition`, { to, reason: reason ?? '' });
  return res.data.order as MerchantOrder;
}

/**
 * Buyurtmalar ro'yxati: davriy so'rov + jonli signal. `onNew` — oldin ko'rilmagan YANGI
 * (`new`) buyurtma paydo bo'lganda (birinchi yuklashda chaqirilmaydi).
 */
export function useMerchantOrders(pollMs = 10000, onNew?: (fresh: MerchantOrder[]) => void) {
  const [orders, setOrders] = useState<MerchantOrder[]>([]);
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
      const list = await fetchMerchantOrders();
      setOrders(list);
      setError('');
      const nowNew = list.filter((o) => o.status === 'new');
      if (seenNew.current) {
        const fresh = nowNew.filter((o) => !seenNew.current!.has(o.id));
        if (fresh.length > 0) onNewRef.current?.(fresh);
      }
      seenNew.current = new Set(nowNew.map((o) => o.id));
    } catch (e) {
      setError(orderErrorText(e, "Buyurtmalarni yuklab bo'lmadi"));
    } finally {
      inflight.current = false;
      setLoading(false);
    }
  }, []);

  // Birinchi yuklash + ekranga qaytganda bir marta yangilash (vaqt bo'yicha so'rov YO'Q).
  useEffect(() => {
    reload();
    const onVisible = () => { if (!document.hidden) reload(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [reload]);

  // Jonli signal; so'rov faqat soket uzilganda (vaqtincha).
  useLiveRefresh(reload, { fallbackMs: pollMs });
  return { orders, setOrders, loading, error, reload };
}

/** Yon menyudagi belgi uchun: yangi buyurtmalar soni (faqat `enabled` bo'lsa so'raydi). Jonli yangilanadi. */
export function useNewOrdersCount(enabled: boolean, pollMs = 10000): number {
  const [count, setCount] = useState(0);
  const load = useCallback(async () => {
    try {
      setCount((await fetchMerchantOrders('new')).length);
    } catch {
      /* belgi ixtiyoriy */
    }
  }, []);
  useEffect(() => {
    if (!enabled) { setCount(0); return; }
    void load();
  }, [enabled, load]);
  useLiveRefresh(load, { fallbackMs: pollMs, enabled });
  return count;
}
// ── Logistika: do'konning o'z kuryerlari ─────────────────────────────

export async function fetchCouriers(): Promise<MerchantCourier[]> {
  const res = await axiosInstance.get('/store-couriers');
  return Array.isArray(res.data?.couriers) ? (res.data.couriers as MerchantCourier[]) : [];
}

export async function addCourier(name: string, phone: string): Promise<void> {
  await axiosInstance.post('/store-couriers', { name, phone });
}

export async function removeCourier(id: string): Promise<void> {
  await axiosInstance.delete(`/store-couriers/${encodeURIComponent(id)}`);
}

/** Kuryerdagi naqd pulni qabul qiladi: {orders, total_tiyin}. */
export async function settleCourier(id: string): Promise<{ orders: number; total_tiyin: number }> {
  const res = await axiosInstance.post(`/store-couriers/${encodeURIComponent(id)}/settle`, {});
  return res.data.result;
}

/** Reysni (sana) yoki tanlangan buyurtmalarni kuryerga biriktiradi: {assigned, skipped}. */
export async function assignOrders(courierId: string, target: { date?: string; orderIds?: string[] }): Promise<{ assigned: number; skipped: number }> {
  const res = await axiosInstance.post('/store-assign', { courierId, ...target });
  return res.data.result;
}

export async function unassignOrder(id: string): Promise<void> {
  await axiosInstance.post(`/store-orders/${encodeURIComponent(id)}/unassign`, {});
}
