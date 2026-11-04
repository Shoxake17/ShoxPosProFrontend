import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Banknote, CircleDollarSign, Plus, RefreshCw, Trash2, Truck, UserPlus, Users, Hourglass, PackageX } from 'lucide-react';
import MainLayout from '../components/layout/MainLayout';
import {
  addCourier,
  assignOrders,
  fetchCouriers,
  fetchMerchantOrders,
  orderErrorText,
  removeCourier,
  settleCourier,
  unassignOrder,
  type MerchantCourier,
  type MerchantOrder,
  type MerchantOrderStatus,
} from '../hooks/useMerchantOrders';

/**
 * Do'kon "Logistika" sahifasi — sotuvchi yetkazishni O'ZI boshqaradi:
 *   • o'z kuryerlarini qo'shadi (ular OnDexGO ilovasiga shu telefon bilan kiradi);
 *   • reysni (yetkazish kuni) yoki alohida buyurtmalarni o'z kuryeriga biriktiradi;
 *   • kuryer yetkazib mijozdan olgan naqd pulni topshirganda "Pulni qabul qilish" bilan hisobni yopadi.
 *
 * Kuryer faqat O'Z buyurtmasini ko'radi; mijozning manzili/telefoni do'konga ko'rinmaydi
 * (ularni faqat biriktirilgan kuryer, do'kondan olgandan keyin ko'radi).
 */

type View = 'trips' | 'couriers';

const ACTIVE = 'confirmed,packed,collected,out_for_delivery,failed';

const STATUS_LABEL: Partial<Record<MerchantOrderStatus, string>> = {
  confirmed: 'Qabul qilingan',
  packed: 'Qadoqlangan',
  collected: 'Kuryer oldi',
  out_for_delivery: "Yo'lda",
  failed: 'Yetkazilmadi',
};

const STATUS_COLOR: Partial<Record<MerchantOrderStatus, string>> = {
  confirmed: '#3b82f6',
  packed: '#6366f1',
  collected: '#06b6d4',
  out_for_delivery: '#f97316',
  failed: '#ef4444',
};

const WEEKDAYS = ['yakshanba', 'dushanba', 'seshanba', 'chorshanba', 'payshanba', 'juma', 'shanba'];
const MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];

function formatDate(ymd: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) return ymd;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return `${+m[3]}-${MONTHS[+m[2] - 1]}, ${WEEKDAYS[d.getUTCDay()]}`;
}

const formatSum = (tiyin: number) => `${new Intl.NumberFormat('ru-RU').format(Math.round(tiyin / 100))} so'm`;

const DK = { card: '#0d1220', cardB: '#1e2740', surf: '#111827', surfB: '#1e2740', text: '#f1f5f9', muted: '#94a3b8' };
const LT = { card: '#ffffff', cardB: '#e2e8f0', surf: '#f1f5f9', surfB: '#cbd5e1', text: '#0f172a', muted: '#64748b' };
const ACCENT = 'linear-gradient(135deg,#6366f1,#8b5cf6)';
const FONT = "'DM Sans', system-ui, -apple-system, 'Segoe UI', sans-serif";

export default function Logistics() {
  const [userImage] = useState<string | null>(localStorage.getItem('userImage'));
  const [theme] = useState<'dark' | 'light'>((localStorage.getItem('theme') as 'dark' | 'light') || 'dark');
  const c = theme === 'dark' ? DK : LT;

  const [view, setView] = useState<View>('trips');
  const [orders, setOrders] = useState<MerchantOrder[]>([]);
  const [couriers, setCouriers] = useState<MerchantCourier[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [picker, setPicker] = useState<{ title: string; target: { date?: string; orderIds?: string[] } } | null>(null);
  const [pickedId, setPickedId] = useState('');
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '+998' });

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [o, k] = await Promise.all([fetchMerchantOrders(ACTIVE), fetchCouriers()]);
      setOrders(o);
      setCouriers(k);
      setError('');
    } catch (e) {
      setError(orderErrorText(e, "Ma'lumotni yuklab bo'lmadi"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(true), 30000);
    return () => clearInterval(t);
  }, [load]);

  /** Amal: band bo'lsa ikkinchisi boshlanmaydi; natija xabarda, oxirida yangilanadi. */
  const run = async (action: () => Promise<string>) => {
    if (busy) return;
    setBusy(true);
    setNotice(null);
    try {
      setNotice({ kind: 'ok', text: await action() });
    } catch (e) {
      setNotice({ kind: 'err', text: orderErrorText(e, "Amalni bajarib bo'lmadi. Qayta urinib ko'ring") });
    } finally {
      setBusy(false);
    }
    await load(true);
  };

  const courierName = (id?: string) => (id ? couriers.find((x) => x.id === id)?.name ?? 'Kuryer' : '');

  const byDate = useMemo(() => {
    const m = new Map<string, MerchantOrder[]>();
    for (const o of orders) {
      const list = m.get(o.delivery_date) ?? [];
      list.push(o);
      m.set(o.delivery_date, list);
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [orders]);

  const stats = useMemo(() => ({
    unassigned: orders.filter((o) => !o.courier_id).length,
    onRoad: orders.filter((o) => o.status === 'out_for_delivery').length,
    held: couriers.reduce((s, x) => s + x.summary.held_tiyin, 0),
  }), [orders, couriers]);

  const openPicker = (title: string, target: { date?: string; orderIds?: string[] }) => {
    if (couriers.length === 0) {
      setNotice({ kind: 'err', text: "Avval \"Kuryerlar\" bo'limida o'z kuryeringizni qo'shing" });
      setView('couriers');
      return;
    }
    setPickedId(couriers[0].id);
    setPicker({ title, target });
  };

  const confirmAssign = () => {
    if (!picker || !pickedId) return;
    const { target } = picker;
    setPicker(null);
    void run(async () => {
      const r = await assignOrders(pickedId, target);
      return r.assigned > 0
        ? `${r.assigned} ta buyurtma ${courierName(pickedId)} ga biriktirildi`
        : "Biriktirib bo'lmadi (boshqa kuryerga biriktirilgan yoki yakunlangan bo'lishi mumkin)";
    });
  };

  const submitCourier = (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(false);
    void run(async () => {
      await addCourier(form.name.trim(), form.phone.trim());
      setForm({ name: '', phone: '+998' });
      return "Kuryer qo'shildi. U OnDexGO ilovasiga shu raqam bilan kiradi";
    });
  };

  const settle = (k: MerchantCourier) => {
    if (!window.confirm(`${k.name} sizga ${formatSum(k.summary.held_tiyin)} (${k.summary.held_orders} ta buyurtma) topshirdimi? Tasdiqlagach hisob yopiladi.`)) return;
    void run(async () => {
      const r = await settleCourier(k.id);
      return `${formatSum(r.total_tiyin)} qabul qilindi`;
    });
  };

  const remove = (k: MerchantCourier) => {
    if (!window.confirm(`${k.name} kuryerlar ro'yxatidan olib tashlansinmi? U ilovadan chiqariladi.`)) return;
    void run(async () => {
      await removeCourier(k.id);
      return 'Kuryer olib tashlandi';
    });
  };

  const panel: React.CSSProperties = { background: c.card, border: `1px solid ${c.cardB}`, borderRadius: 14 };
  const btn = (bg: string, color = '#fff', disabled = false): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 13px',
    borderRadius: 10, border: 'none', fontSize: 13, fontWeight: 700, background: bg, color, fontFamily: FONT,
    cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1,
  });

  const kpis = [
    { label: 'Kuryerlar', value: String(couriers.length), icon: <Users size={17} />, color: '#6366f1' },
    { label: 'Kuryersiz buyurtma', value: String(stats.unassigned), icon: <PackageX size={17} />, color: stats.unassigned > 0 ? '#f59e0b' : '#10b981' },
    { label: "Yo'lda", value: String(stats.onRoad), icon: <Hourglass size={17} />, color: '#f97316' },
    { label: 'Kuryerlarda pul', value: formatSum(stats.held), icon: <CircleDollarSign size={17} />, color: stats.held > 0 ? '#f59e0b' : '#10b981' },
  ];

  const tabBtn = (id: View, label: string) => (
    <button
      key={id} type="button" role="tab" aria-selected={view === id} onClick={() => setView(id)}
      style={{
        flex: '1 1 0', padding: '8px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700,
        background: view === id ? c.card : 'transparent', color: view === id ? c.text : c.muted, fontFamily: FONT,
        boxShadow: view === id ? '0 1px 4px rgba(0,0,0,.25)' : 'none',
      }}
    >{label}</button>
  );

  return (
    <MainLayout theme={theme} userImage={userImage} title="Logistika">
      <div style={{ maxWidth: 1100, margin: '0 auto', fontFamily: FONT, display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
          {kpis.map((k) => (
            <div key={k.label} style={{ ...panel, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: `${k.color}1f`, color: k.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{k.icon}</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ color: c.muted, fontSize: 12, fontWeight: 600 }}>{k.label}</div>
                <div style={{ color: c.text, fontSize: 17, fontWeight: 800, lineHeight: 1.2, overflowWrap: 'anywhere' }}>{k.value}</div>
              </div>
            </div>
          ))}
        </div>

        {notice && (
          <div role="status" style={{
            padding: '10px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600,
            background: notice.kind === 'ok' ? 'rgba(16,185,129,.12)' : 'rgba(239,68,68,.12)',
            color: notice.kind === 'ok' ? '#10b981' : '#ef4444',
            border: `1px solid ${notice.kind === 'ok' ? 'rgba(16,185,129,.3)' : 'rgba(239,68,68,.3)'}`,
          }}>{notice.text}</div>
        )}

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div role="tablist" style={{ display: 'flex', gap: 4, padding: 4, background: c.surf, borderRadius: 10, flex: 1, maxWidth: 420 }}>
            {tabBtn('trips', 'Reyslar')}
            {tabBtn('couriers', 'Kuryerlar va naqd pul')}
          </div>
          <button type="button" onClick={() => void load()} disabled={loading || busy} aria-label="Yangilash"
            style={{ ...btn(c.surf, c.text, loading || busy), border: `1px solid ${c.surfB}` }}><RefreshCw size={15} /></button>
        </div>

        {error && orders.length === 0 && couriers.length === 0 && (
          <div style={{ ...panel, padding: 24, textAlign: 'center', color: c.muted }}>
            {error} <button type="button" onClick={() => void load()} style={{ ...btn('#6366f1'), marginTop: 10 }}>Qayta urinish</button>
          </div>
        )}

        {loading && orders.length === 0 && couriers.length === 0 && !error && (
          <div style={{ textAlign: 'center', padding: 40, color: c.muted }}>Yuklanmoqda...</div>
        )}

        {/* Reyslar */}
        {view === 'trips' && !loading && !(error && orders.length === 0) && (
          byDate.length === 0 ? (
            <div style={{ ...panel, padding: 40, textAlign: 'center', color: c.muted }}>
              <Truck size={36} />
              <div style={{ fontWeight: 700, color: c.text, marginTop: 8 }}>Faol reys yo'q</div>
              <div style={{ fontSize: 13 }}>Qabul qilgan buyurtmalaringiz reys kuni bo'yicha shu yerda ko'rinadi.</div>
            </div>
          ) : byDate.map(([date, list]) => {
            const sum = list.reduce((s, o) => s + o.total_tiyin, 0);
            const free = list.filter((o) => !o.courier_id).length;
            return (
              <section key={date} style={{ ...panel, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <header style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ color: c.text, fontSize: 15, fontWeight: 800 }}>Reys: {formatDate(date)}</div>
                  <span style={{ color: c.muted, fontSize: 12.5 }}>{list.length} ta · {formatSum(sum)}</span>
                  {free > 0 && <span style={{ padding: '2px 9px', borderRadius: 999, fontSize: 12, fontWeight: 700, background: 'rgba(245,158,11,.15)', color: '#f59e0b' }}>Kuryersiz: {free}</span>}
                  <button type="button" disabled={busy || free === 0} onClick={() => openPicker(`${formatDate(date)} reysini biriktirish`, { date })}
                    style={{ ...btn(ACCENT, '#fff', busy || free === 0), marginLeft: 'auto' }}>
                    <UserPlus size={15} /> Reysni kuryerga biriktirish
                  </button>
                </header>
                <div style={{ border: `1px solid ${c.cardB}`, borderRadius: 10, overflow: 'hidden' }}>
                  {list.map((o, i) => {
                    const col = STATUS_COLOR[o.status] ?? c.muted;
                    const name = courierName(o.courier_id);
                    const canTake = !!o.courier_id && ['confirmed', 'packed', 'collected'].includes(o.status);
                    return (
                      <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', flexWrap: 'wrap', borderTop: i === 0 ? 'none' : `1px solid ${c.cardB}` }}>
                        <div style={{ color: c.text, fontWeight: 800, fontSize: 13.5 }}>№ {o.number}</div>
                        <span style={{ padding: '2px 9px', borderRadius: 999, fontSize: 11.5, fontWeight: 700, background: `${col}22`, color: col }}>{STATUS_LABEL[o.status] ?? o.status}</span>
                        <span style={{ color: name ? c.text : '#f59e0b', fontSize: 12.5 }}>{name ? `Kuryer: ${name}` : 'kuryersiz'}</span>
                        <span style={{ marginLeft: 'auto', color: c.text, fontWeight: 800, fontSize: 13.5 }}>{formatSum(o.total_tiyin)}</span>
                        {o.status !== 'out_for_delivery' && (
                          <button type="button" disabled={busy} onClick={() => openPicker(`№ ${o.number} ni biriktirish`, { orderIds: [o.id] })}
                            style={{ ...btn(c.surf, c.text, busy), border: `1px solid ${c.surfB}`, padding: '5px 10px', fontSize: 12 }}>
                            {name ? 'Boshqa kuryer' : 'Biriktirish'}
                          </button>
                        )}
                        {canTake && (
                          <button type="button" disabled={busy}
                            onClick={() => void run(async () => { await unassignOrder(o.id); return 'Kuryerdan olindi'; })}
                            style={{ ...btn('transparent', c.muted, busy), border: `1px solid ${c.surfB}`, padding: '5px 10px', fontSize: 12 }}>
                            Kuryerdan olish
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })
        )}

        {/* Kuryerlar va naqd pul */}
        {view === 'couriers' && !loading && !(error && couriers.length === 0 && orders.length === 0) && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ color: c.muted, fontSize: 12.5, flex: '1 1 240px' }}>
                Kuryerlar OnDexGO ilovasiga telefon raqami bilan kiradi va faqat sizning buyurtmalaringizni ko'radi.
              </div>
              <button type="button" disabled={busy} onClick={() => setAdding(true)} style={btn(ACCENT, '#fff', busy)}>
                <Plus size={15} /> Kuryer qo'shish
              </button>
            </div>
            {couriers.length === 0 && (
              <div style={{ ...panel, padding: 36, textAlign: 'center', color: c.muted }}>Hali kuryer yo'q — "Kuryer qo'shish" ni bosing.</div>
            )}
            {couriers.map((k) => (
              <div key={k.id} style={{ ...panel, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ width: 38, height: 38, borderRadius: 99, background: 'rgba(99,102,241,.15)', color: '#818cf8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Truck size={18} /></div>
                <div style={{ flex: '1 1 160px', minWidth: 0 }}>
                  <div style={{ color: c.text, fontWeight: 800, fontSize: 14.5 }}>{k.name}</div>
                  <div style={{ color: c.muted, fontSize: 12.5 }}>{k.phone} · faol buyurtma: {k.summary.active_orders}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: k.summary.held_tiyin > 0 ? '#f59e0b' : c.text, fontWeight: 800, fontSize: 15 }}>
                    <Banknote size={14} style={{ verticalAlign: -2, marginRight: 4 }} />{formatSum(k.summary.held_tiyin)}
                  </div>
                  <div style={{ color: c.muted, fontSize: 11.5 }}>{k.summary.held_tiyin > 0 ? `kuryerda · ${k.summary.held_orders} ta` : 'pul topshirilgan'}</div>
                </div>
                <button type="button" disabled={busy || k.summary.held_tiyin === 0} onClick={() => settle(k)} style={btn(ACCENT, '#fff', busy || k.summary.held_tiyin === 0)}>Pulni qabul qilish</button>
                <button type="button" disabled={busy} onClick={() => remove(k)} aria-label="Olib tashlash" title="Olib tashlash"
                  style={{ ...btn(c.surf, '#ef4444', busy), border: `1px solid ${c.surfB}`, padding: '8px 10px' }}><Trash2 size={15} /></button>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Kuryerga biriktirish */}
      {picker && (
        <div role="dialog" aria-modal="true" aria-label={picker.title} onClick={() => setPicker(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ ...panel, padding: 18, width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 12, fontFamily: FONT }}>
            <div style={{ color: c.text, fontSize: 16, fontWeight: 800 }}>{picker.title}</div>
            <select value={pickedId} onChange={(e) => setPickedId(e.target.value)} aria-label="Kuryer"
              style={{ padding: 10, borderRadius: 10, border: `1px solid ${c.surfB}`, background: c.surf, color: c.text, fontSize: 14, fontFamily: FONT }}>
              {couriers.map((k) => <option key={k.id} value={k.id}>{k.name} · {k.phone}</option>)}
            </select>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setPicker(null)} style={{ ...btn('transparent', c.text), border: `1px solid ${c.surfB}` }}>Bekor qilish</button>
              <button type="button" onClick={confirmAssign} style={btn(ACCENT)}>Biriktirish</button>
            </div>
          </div>
        </div>
      )}

      {/* Kuryer qo'shish */}
      {adding && (
        <div role="dialog" aria-modal="true" aria-label="Kuryer qo'shish" onClick={() => setAdding(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={submitCourier}
            style={{ ...panel, padding: 18, width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 10, fontFamily: FONT }}>
            <div style={{ color: c.text, fontSize: 16, fontWeight: 800 }}>Kuryer qo'shish</div>
            {([['name', 'Ism', 'text'], ['phone', 'Telefon raqami', 'tel']] as const).map(([key, label, type]) => (
              <label key={key} style={{ color: c.muted, fontSize: 12.5, fontWeight: 600 }}>
                {label}
                <input
                  type={type} value={form[key]} maxLength={key === 'name' ? 80 : 20} required autoFocus={key === 'name'}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  style={{ width: '100%', boxSizing: 'border-box', marginTop: 5, padding: '9px 11px', borderRadius: 10, border: `1px solid ${c.surfB}`, background: c.surf, color: c.text, fontSize: 14, fontFamily: FONT, outline: 'none' }}
                />
              </label>
            ))}
            <div style={{ color: c.muted, fontSize: 12 }}>Kuryer OnDexGO ilovasiga shu raqam bilan (Telegram/SMS kod) kiradi. Boshqa akkauntga ulanmaydi.</div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setAdding(false)} style={{ ...btn('transparent', c.text), border: `1px solid ${c.surfB}` }}>Bekor qilish</button>
              <button type="submit" disabled={form.name.trim().length < 2 || form.phone.trim().length < 9} style={btn(ACCENT, '#fff', form.name.trim().length < 2 || form.phone.trim().length < 9)}>Qo'shish</button>
            </div>
          </form>
        </div>
      )}
    </MainLayout>
  );
}
