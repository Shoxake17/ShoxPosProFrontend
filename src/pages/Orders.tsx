import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, CheckCircle2, ClipboardList, Clock, ImageOff, Inbox,
  PackageCheck, RefreshCw, Search, Truck, XCircle, Boxes, CircleDollarSign, Hourglass,
} from 'lucide-react';
import MainLayout from '../components/layout/MainLayout';
import {
  orderErrorText,
  transitionMerchantOrder,
  useMerchantOrders,
  type MerchantOrder,
  type MerchantOrderStatus,
} from '../hooks/useMerchantOrders';

/**
 * Do'kon "Buyurtmalar" sahifasi (POS uslubidagi buyurtma boshqaruvi).
 *
 * Kompyuterda ikki panel: chapda ro'yxat (qidiruv + bo'limlar), o'ngda tanlangan buyurtma
 * tafsiloti va amallar. Telefonda ro'yxat, buyurtmaga bosilsa — to'liq ekranli tafsilot.
 *
 * Buyurtmani mijoz OnDex ilovasidan beradi (naqd to'lov); u bir necha kun to'planib REYS bilan
 * yetkaziladi. Do'kon: yangi buyurtmani qabul qiladi yoki rad etadi (sabab bilan), qabuldan
 * keyin qadoqlaydi — keyin OnDex logistikasi do'kondan oladi.
 *
 * Mijozning manzili va telefoni do'konga KO'RSATILMAYDI (faqat ism, tovar, summa, reys sanasi).
 * Tasdiqlaganda tovar ombordan avtomatik ayiriladi (yetmasa tasdiqlanmaydi).
 */

type Tab = 'new' | 'active' | 'done' | 'closed';

const TABS: { id: Tab; label: string; statuses: MerchantOrderStatus[] }[] = [
  { id: 'new', label: 'Yangi', statuses: ['new'] },
  { id: 'active', label: 'Jarayonda', statuses: ['confirmed', 'packed', 'collected', 'out_for_delivery', 'failed'] },
  { id: 'done', label: 'Yetkazilgan', statuses: ['delivered'] },
  { id: 'closed', label: 'Yopilgan', statuses: ['rejected', 'cancelled'] },
];

const STATUS_LABEL: Record<MerchantOrderStatus, string> = {
  new: 'Yangi',
  confirmed: 'Qabul qilindi',
  rejected: 'Rad etildi',
  packed: 'Qadoqlandi',
  collected: 'Logistika oldi',
  out_for_delivery: "Yo'lda",
  delivered: 'Yetkazildi',
  failed: "Yetkazib bo'lmadi",
  cancelled: 'Bekor qilindi',
};

const STATUS_COLOR: Record<MerchantOrderStatus, string> = {
  new: '#f59e0b',
  confirmed: '#3b82f6',
  packed: '#6366f1',
  collected: '#06b6d4',
  out_for_delivery: '#f97316',
  delivered: '#10b981',
  failed: '#ef4444',
  rejected: '#94a3b8',
  cancelled: '#94a3b8',
};

const WEEKDAYS = ['yakshanba', 'dushanba', 'seshanba', 'chorshanba', 'payshanba', 'juma', 'shanba'];
const MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];

/** "2026-11-03" -> "3-noyabr, seshanba". */
function formatDate(ymd: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) return ymd;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return `${+m[3]}-${MONTHS[+m[2] - 1]}, ${WEEKDAYS[d.getUTCDay()]}`;
}

const two = (n: number) => String(n).padStart(2, '0');

function formatTime(iso: string): string {
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return '';
  return `${two(t.getDate())}.${two(t.getMonth() + 1)} ${two(t.getHours())}:${two(t.getMinutes())}`;
}

/** "5 daq oldin" / "2 soat oldin" / sana. */
function timeAgo(iso: string, now: number): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const min = Math.max(0, Math.floor((now - t) / 60000));
  if (min < 1) return 'hozir';
  if (min < 60) return `${min} daq oldin`;
  if (min < 24 * 60) return `${Math.floor(min / 60)} soat oldin`;
  return formatTime(iso);
}

const formatSum = (tiyin: number) => `${new Intl.NumberFormat('ru-RU').format(Math.round(tiyin / 100))} so'm`;
const countPieces = (o: MerchantOrder) => o.items.reduce((s, it) => s + it.qty, 0);

function useIsWide(minPx: number): boolean {
  const query = `(min-width: ${minPx}px)`;
  const [wide, setWide] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setWide(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return wide;
}

const DK = { bg: '#0a0e1a', card: '#0d1220', cardB: '#1e2740', surf: '#111827', surfB: '#1e2740', hover: '#141b2e', text: '#f1f5f9', muted: '#94a3b8' };
const LT = { bg: '#f8f9ff', card: '#ffffff', cardB: '#e2e8f0', surf: '#f1f5f9', surfB: '#cbd5e1', hover: '#f8fafc', text: '#0f172a', muted: '#64748b' };

const ACCENT = 'linear-gradient(135deg,#6366f1,#8b5cf6)';

export default function Orders() {
  const [userImage] = useState<string | null>(localStorage.getItem('userImage'));
  const [theme] = useState<'dark' | 'light'>((localStorage.getItem('theme') as 'dark' | 'light') || 'dark');
  const c = theme === 'dark' ? DK : LT;
  const wide = useIsWide(1100);

  const [tab, setTab] = useState<Tab>('new');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false); // faqat telefonda
  const [busy, setBusy] = useState<string | null>(null); // amal bajarilayotgan buyurtma ID'si
  const [notice, setNotice] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [rejecting, setRejecting] = useState<MerchantOrder | null>(null);
  const [reason, setReason] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  const onNew = useCallback((fresh: MerchantOrder[]) => {
    // Ovoz/bildirishnoma — global OrderAlerts'da (har sahifada ishlaydi).
    setNotice({ kind: 'ok', text: fresh.length === 1 ? `Yangi buyurtma: ${fresh[0].number}` : `${fresh.length} ta yangi buyurtma keldi` });
    setTab('new');
  }, []);

  const { orders, setOrders, loading, error, reload } = useMerchantOrders(10000, onNew);

  useEffect(() => { if (!loading) setUpdatedAt(Date.now()); }, [orders, loading]);

  const counts = useMemo(() => {
    const out: Record<Tab, number> = { new: 0, active: 0, done: 0, closed: 0 };
    for (const t of TABS) out[t.id] = orders.filter((o) => t.statuses.includes(o.status)).length;
    return out;
  }, [orders]);

  /** Ko'rsatkichlar: faqat bekor/rad etilmaganlar summasi. */
  const stats = useMemo(() => {
    const alive = orders.filter((o) => o.status !== 'rejected' && o.status !== 'cancelled');
    return {
      sum: alive.reduce((s, o) => s + o.total_tiyin, 0),
      pieces: alive.reduce((s, o) => s + countPieces(o), 0),
    };
  }, [orders]);

  const visible = useMemo(() => {
    const statuses = TABS.find((t) => t.id === tab)!.statuses;
    const q = query.trim().toLowerCase();
    return orders
      .filter((o) => statuses.includes(o.status))
      .filter((o) => !q
        || o.number.toLowerCase().includes(q)
        || (o.customer_name || '').toLowerCase().includes(q)
        || o.items.some((it) => it.name.toLowerCase().includes(q)))
      .sort((a, b) => (tab === 'new' ? a.created_at.localeCompare(b.created_at) : b.created_at.localeCompare(a.created_at)));
  }, [orders, tab, query]);

  // Kompyuterda doim biror buyurtma tanlangan bo'lsin; tanlangani bo'limdan chiqib ketsa — birinchisi.
  useEffect(() => {
    if (!wide) return;
    if (!visible.some((o) => o.id === selectedId)) setSelectedId(visible[0]?.id ?? null);
  }, [wide, visible, selectedId]);

  const selected = useMemo(() => orders.find((o) => o.id === selectedId) ?? null, [orders, selectedId]);

  const act = async (order: MerchantOrder, to: 'confirmed' | 'rejected' | 'packed', why?: string) => {
    if (busy) return; // qo'sh bosish himoyasi
    setBusy(order.id);
    setNotice(null);
    try {
      const updated = await transitionMerchantOrder(order.id, to, why);
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
      setNotice({
        kind: 'ok',
        text:
          to === 'confirmed' ? `${order.number} qabul qilindi — tovar ombordan ayirildi`
            : to === 'packed' ? `${order.number} qadoqlandi — logistika oladi`
              : `${order.number} rad etildi`,
      });
      setRejecting(null);
      setReason('');
      setDetailOpen(false);
    } catch (e) {
      setNotice({ kind: 'err', text: orderErrorText(e, "Amalni bajarib bo'lmadi. Qayta urinib ko'ring") });
      reload(); // holat boshqa joyda o'zgargan bo'lishi mumkin
    } finally {
      setBusy(null);
    }
  };

  const openOrder = (o: MerchantOrder) => { setSelectedId(o.id); if (!wide) setDetailOpen(true); };

  const btn = (bg: string, color = '#fff', disabled = false): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: '9px 14px', borderRadius: 10, border: 'none', fontSize: 13, fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1,
    background: bg, color, fontFamily: "'DM Sans', system-ui, -apple-system, 'Segoe UI', sans-serif",
  });

  const panel: React.CSSProperties = { background: c.card, border: `1px solid ${c.cardB}`, borderRadius: 18 };

  // ── KPI ──────────────────────────────────────────────────────────────
  const kpis: { label: string; value: string; icon: React.ReactNode; color: string; pulse?: boolean }[] = [
    { label: 'Yangi', value: String(counts.new), icon: <Inbox size={17} />, color: '#f59e0b', pulse: counts.new > 0 },
    { label: 'Jarayonda', value: String(counts.active), icon: <Hourglass size={17} />, color: '#3b82f6' },
    { label: 'Tovar (dona)', value: new Intl.NumberFormat('ru-RU').format(stats.pieces), icon: <Boxes size={17} />, color: '#6366f1' },
    { label: 'Umumiy summa', value: formatSum(stats.sum), icon: <CircleDollarSign size={17} />, color: '#10b981' },
  ];

  // ── Ro'yxat qatori ───────────────────────────────────────────────────
  const row = (o: MerchantOrder) => {
    const active = wide && o.id === selectedId;
    const col = STATUS_COLOR[o.status];
    return (
      <button
        key={o.id} type="button" onClick={() => openOrder(o)} className="qo-row"
        aria-label={`Buyurtma ${o.number}`} aria-current={active ? 'true' : undefined}
        style={{
          width: '100%', textAlign: 'left', cursor: 'pointer', padding: '10px 12px', borderRadius: 12,
          border: `1.5px solid ${active ? '#6366f1' : c.cardB}`,
          background: active ? 'rgba(99,102,241,.10)' : c.card, color: c.text,
          display: 'flex', flexDirection: 'column', gap: 5, fontFamily: "'DM Sans', system-ui, -apple-system, 'Segoe UI', sans-serif",
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {o.status === 'new' && <span className="qo-dot" aria-hidden />}
          <span style={{ fontSize: 14, fontWeight: 800 }}>№ {o.number}</span>
          <span style={{
            marginLeft: 'auto', padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 800,
            background: `${col}22`, color: col,
          }}>{STATUS_LABEL[o.status]}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: c.muted, fontSize: 11 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Clock size={13} /> {timeAgo(o.created_at, now)}</span>
          <span>·</span>
          <span>{countPieces(o)} dona</span>
          <span style={{ marginLeft: 'auto', color: c.text, fontWeight: 800, fontSize: 13 }}>{formatSum(o.total_tiyin)}</span>
        </div>
        <div style={{ color: c.muted, fontSize: 11, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Truck size={13} /> {formatDate(o.delivery_date)}
          {o.customer_name && <span style={{ marginLeft: 'auto', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '45%' }}>{o.customer_name}</span>}
        </div>
      </button>
    );
  };

  // ── Tafsilot ─────────────────────────────────────────────────────────
  const detail = (o: MerchantOrder) => {
    const col = STATUS_COLOR[o.status];
    const canAct = o.status === 'new' || o.status === 'confirmed';
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%' }}>
        <div style={{ padding: '14px 16px 0', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {!wide && (
            <button type="button" onClick={() => setDetailOpen(false)} aria-label="Ro'yxatga qaytish"
              style={{ ...btn(c.surf, c.text), padding: '10px 12px', border: `1px solid ${c.surfB}` }}>
              <ArrowLeft size={18} />
            </button>
          )}
          <div style={{ fontSize: 20.5, fontWeight: 800, color: c.text }}>№ {o.number}</div>
          <span style={{ padding: '5px 14px', borderRadius: 999, fontSize: 11, fontWeight: 800, background: `${col}22`, color: col }}>
            {STATUS_LABEL[o.status]}
          </span>
        </div>

        <div className="qo-scroll" style={{ padding: '12px 16px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <div style={{ color: c.muted, fontSize: 11, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', marginBottom: 8 }}>
              Tovarlar ({o.items.length})
            </div>
            <div style={{ border: `1px solid ${c.cardB}`, borderRadius: 14, overflow: 'hidden' }}>
              {o.items.map((it, i) => (
                <div key={`${it.barcode}-${i}`} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                  borderTop: i === 0 ? 'none' : `1px solid ${c.cardB}`,
                }}>
                  {/* Mahsulot rasmi — chegarali blokda */}
                  <div style={{
                    width: 64, height: 64, borderRadius: 12, flexShrink: 0, boxSizing: 'border-box', padding: 4,
                    border: `1.5px solid ${c.surfB}`, background: c.surf, overflow: 'hidden',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {it.image_url
                      ? <img src={it.image_url} alt={it.name} referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 8 }} />
                      : <ImageOff size={22} color={c.muted} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: c.text, fontWeight: 700, fontSize: 12.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.name}</div>
                    <div style={{ color: c.muted, fontSize: 11 }}>
                      {formatSum(it.price_tiyin)}{it.weight_grams ? ` · ${it.weight_grams} g` : ''}
                    </div>
                  </div>
                  <div style={{ color: c.muted, fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap' }}>× {it.qty}</div>
                  <div style={{ color: c.text, fontWeight: 800, fontSize: 12.5, whiteSpace: 'nowrap', minWidth: 84, textAlign: 'right' }}>
                    {formatSum(it.qty * it.price_tiyin)}
                  </div>
                </div>
              ))}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px',
                background: c.surf, borderTop: `1px solid ${c.cardB}`,
              }}>
                <span style={{ color: c.muted, fontWeight: 600 }}>Jami ({countPieces(o)} dona)</span>
                <span style={{ color: '#6366f1', fontWeight: 800, fontSize: 19 }}>{formatSum(o.total_tiyin)}</span>
              </div>
            </div>
          </div>

          {o.reject_reason && (o.status === 'rejected' || o.status === 'cancelled' || o.status === 'failed') && (
            <div style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(239,68,68,.1)', color: '#ef4444', fontSize: 12, fontWeight: 600 }}>
              Sabab: {o.reject_reason}
            </div>
          )}

          {o.history.length > 0 && (
            <div>
              <div style={{ color: c.muted, fontSize: 11, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', marginBottom: 10 }}>Holatlar tarixi</div>
              <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {o.history.map((h, i) => (
                  <li key={`${h.to}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11.5 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 99, background: STATUS_COLOR[h.to], flexShrink: 0 }} />
                    <span style={{ color: c.text, fontWeight: 700 }}>{STATUS_LABEL[h.to]}</span>
                    <span style={{ color: c.muted, marginLeft: 'auto' }}>{formatTime(h.at)}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>

        {/* Amallar paneli */}
        <div style={{ padding: '10px 16px', borderTop: `1px solid ${c.cardB}`, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', background: c.card }}>
          {o.status === 'new' && (
            <>
              <div style={{ color: c.muted, fontSize: 11, flex: '1 1 220px' }}>
                Qabul qilsangiz tovar ombordan avtomatik ayiriladi. Yetmasa qabul qilinmaydi — qoldiqni to'ldiring yoki rad eting.
              </div>
              <button type="button" disabled={busy !== null}
                onClick={() => { setRejecting(o); setReason(''); setNotice(null); }}
                style={btn('rgba(239,68,68,.12)', '#ef4444', busy !== null)}>
                <XCircle size={18} /> Rad etish
              </button>
              <button type="button" disabled={busy !== null} onClick={() => act(o, 'confirmed')}
                style={{ ...btn(ACCENT, '#fff', busy !== null), minWidth: 150 }}>
                <CheckCircle2 size={18} /> {busy === o.id ? 'Bajarilmoqda...' : 'Qabul qilish'}
              </button>
            </>
          )}
          {o.status === 'confirmed' && (
            <>
              <div style={{ color: c.muted, fontSize: 11, flex: '1 1 220px' }}>Tovarni yig'ib bo'lgach "Qadoqlandi" ni bosing.</div>
              <button type="button" disabled={busy !== null} onClick={() => act(o, 'packed')}
                style={{ ...btn(ACCENT, '#fff', busy !== null), minWidth: 150 }}>
                <PackageCheck size={18} /> {busy === o.id ? 'Bajarilmoqda...' : 'Qadoqlandi'}
              </button>
            </>
          )}
          {!canAct && (
            <div style={{ color: c.muted, fontSize: 11.5 }}>
              {o.status === 'packed' ? "Logistika reys kuni do'kondan olib ketadi."
                : o.status === 'collected' || o.status === 'out_for_delivery' ? "Buyurtma yo'lda — do'kondan amal talab qilinmaydi."
                  : o.status === 'delivered' ? 'Buyurtma yetkazilgan.'
                    : 'Bu buyurtma bo\'yicha amal yo\'q.'}
            </div>
          )}
        </div>
      </div>
    );
  };

  const listBody = (
    <>
      {error && orders.length === 0 && (
        <div style={{ ...panel, padding: 28, textAlign: 'center', color: c.muted, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
          <span>{error}</span>
          <button type="button" onClick={reload} style={btn('#6366f1')}>Qayta urinish</button>
        </div>
      )}
      {loading && orders.length === 0 && !error && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[0, 1, 2].map((i) => <div key={i} className="qo-skel" style={{ height: 96, borderRadius: 14, background: c.surf }} />)}
        </div>
      )}
      {!loading && !error && visible.length === 0 && (
        <div style={{ padding: '48px 16px', textAlign: 'center', color: c.muted, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <ClipboardList size={40} />
          <div style={{ fontWeight: 700, color: c.text }}>
            {query ? 'Hech narsa topilmadi' : tab === 'new' ? "Yangi buyurtma yo'q" : "Bu bo'limda buyurtma yo'q"}
          </div>
          <div style={{ fontSize: 11.5 }}>
            {query ? "Qidiruv so'zini o'zgartirib ko'ring." : "Mijoz OnDex ilovasidan buyurtma bersa, shu yerda ovoz bilan paydo bo'ladi."}
          </div>
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{visible.map(row)}</div>
    </>
  );

  return (
    <MainLayout theme={theme} userImage={userImage} title="Buyurtmalar">
      <style>{`
        .qo-scroll { scrollbar-width: none; -ms-overflow-style: none; }
        .qo-scroll::-webkit-scrollbar { display: none; }
        html { scrollbar-width: thin; scrollbar-color: #334155 transparent; }
        ::-webkit-scrollbar-button { display: none; width: 0; height: 0; }
        .qo-row { transition: border-color .15s, background .15s, transform .1s; }
        .qo-row:hover { border-color: #6366f1 !important; }
        .qo-row:active { transform: scale(.995); }
        .qo-dot { width: 10px; height: 10px; border-radius: 99px; background: #f59e0b; box-shadow: 0 0 0 0 rgba(245,158,11,.6); animation: qo-pulse 1.6s infinite; flex-shrink: 0; }
        @keyframes qo-pulse { 70% { box-shadow: 0 0 0 9px rgba(245,158,11,0); } 100% { box-shadow: 0 0 0 0 rgba(245,158,11,0); } }
        .qo-skel { animation: qo-fade 1.2s ease-in-out infinite; }
        @keyframes qo-fade { 50% { opacity: .5; } }
        @media (prefers-reduced-motion: reduce) { .qo-dot, .qo-skel { animation: none; } }
      `}</style>

      <div style={{ maxWidth: 1400, margin: '0 auto', fontFamily: "'DM Sans', system-ui, -apple-system, 'Segoe UI', sans-serif", display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 20 }}>
        {/* KPI */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
          {kpis.map((k) => (
            <div key={k.label} style={{ ...panel, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: `${k.color}1f`, color: k.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {k.icon}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ color: c.muted, fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                  {k.label}{k.pulse && <span className="qo-dot" aria-hidden />}
                </div>
                <div style={{ color: c.text, fontSize: 17, fontWeight: 800, lineHeight: 1.2, overflowWrap: 'anywhere' }}>{k.value}</div>
              </div>
            </div>
          ))}
        </div>

        {notice && (
          <div role="status" style={{
            padding: '12px 14px', borderRadius: 12, fontSize: 12, fontWeight: 600,
            background: notice.kind === 'ok' ? 'rgba(16,185,129,.12)' : 'rgba(239,68,68,.12)',
            color: notice.kind === 'ok' ? '#10b981' : '#ef4444',
            border: `1px solid ${notice.kind === 'ok' ? 'rgba(16,185,129,.3)' : 'rgba(239,68,68,.3)'}`,
          }}>{notice.text}</div>
        )}

        {/* Ish maydoni */}
        <div style={{
          display: 'grid', gap: 12, alignItems: 'start',
          gridTemplateColumns: wide ? 'minmax(400px, 460px) minmax(0, 1fr)' : 'minmax(0, 1fr)',
        }}>
          {/* Chap: ro'yxat */}
          <section style={{ ...panel, padding: 10, display: 'flex', flexDirection: 'column', gap: 8, ...(wide ? { maxHeight: 'calc(100vh - 290px)', minHeight: 420 } : {}) }}>
            <div role="tablist" aria-label="Buyurtma bo'limlari" style={{ display: 'flex', gap: 4, padding: 4, background: c.surf, borderRadius: 12, overflowX: 'auto' }} className="qo-scroll">
              {TABS.map((t) => {
                const active = tab === t.id;
                const hot = t.id === 'new' && counts.new > 0;
                return (
                  <button
                    key={t.id} type="button" role="tab" aria-selected={active} onClick={() => setTab(t.id)}
                    style={{
                      flex: '1 1 0', padding: '7px 6px', borderRadius: 8, border: 'none', cursor: 'pointer',
                      fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', fontFamily: "'DM Sans', system-ui, -apple-system, 'Segoe UI', sans-serif",
                      background: active ? c.card : 'transparent', color: active ? c.text : c.muted,
                      boxShadow: active ? '0 1px 4px rgba(0,0,0,.25)' : 'none',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}
                  >
                    {t.label}
                    {(counts[t.id] > 0 || active) && <span style={{
                      minWidth: 20, padding: '1px 6px', borderRadius: 999, fontSize: 11, fontWeight: 800, textAlign: 'center',
                      background: hot ? '#ef4444' : active ? '#6366f1' : 'transparent', color: hot || active ? '#fff' : c.muted,
                    }}>{counts[t.id]}</span>}
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <label style={{ position: 'relative', flex: 1 }}>
                <Search size={16} color={c.muted} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Raqam, mijoz yoki tovar..."
                  aria-label="Buyurtmalarni qidirish" maxLength={60}
                  style={{
                    width: '100%', boxSizing: 'border-box', padding: '8px 10px 8px 32px', borderRadius: 10,
                    border: `1px solid ${c.surfB}`, background: c.surf, color: c.text, fontSize: 12, fontFamily: 'inherit', outline: 'none',
                  }}
                />
              </label>
              <button type="button" onClick={reload} aria-label="Yangilash" title={updatedAt ? `Yangilandi: ${two(new Date(updatedAt).getHours())}:${two(new Date(updatedAt).getMinutes())}` : 'Yangilash'}
                style={{ ...btn(c.surf, c.text), padding: '0 14px', border: `1px solid ${c.surfB}` }}>
                <RefreshCw size={16} />
              </button>
            </div>

            <div className="qo-scroll" style={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>{listBody}</div>
          </section>

          {/* O'ng: tafsilot (kompyuterda) */}
          {wide && (
            <section aria-label="Buyurtma tafsiloti" style={{ ...panel, overflow: 'hidden', maxHeight: 'calc(100vh - 290px)', minHeight: 420, display: 'flex', flexDirection: 'column' }}>
              {selected ? detail(selected) : (
                <div style={{ margin: 'auto', textAlign: 'center', color: c.muted, padding: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                  <ClipboardList size={44} />
                  <div style={{ fontWeight: 700, color: c.text }}>Buyurtmani tanlang</div>
                  <div style={{ fontSize: 11.5 }}>Tafsilot va amallar shu yerda ko'rinadi.</div>
                </div>
              )}
            </section>
          )}
        </div>
      </div>

      {/* Telefonda: to'liq ekranli tafsilot */}
      {!wide && detailOpen && selected && (
        <div role="dialog" aria-modal="true" aria-label={`Buyurtma ${selected.number}`}
          style={{ position: 'fixed', inset: 0, zIndex: 900, background: c.bg, display: 'flex', flexDirection: 'column' }}>
          {detail(selected)}
        </div>
      )}

      {/* Rad etish sababi */}
      {rejecting && (
        <div
          role="dialog" aria-modal="true" aria-label="Buyurtmani rad etish"
          onClick={() => { if (busy === null) setRejecting(null); }}
          style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => { e.preventDefault(); act(rejecting, 'rejected', reason.trim()); }}
            style={{ ...panel, padding: 22, display: 'flex', flexDirection: 'column', gap: 14, width: '100%', maxWidth: 460 }}
          >
            <div style={{ fontSize: 15.5, fontWeight: 800, color: c.text }}>№ {rejecting.number} ni rad etish</div>
            <label style={{ color: c.text, fontWeight: 600, fontSize: 12 }}>
              Sabab (mijozga ko'rsatiladi)
              <textarea
                autoFocus value={reason} maxLength={200} rows={3}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Masalan: mahsulot tugagan"
                style={{
                  width: '100%', marginTop: 8, padding: 12, borderRadius: 12, border: `1.5px solid ${c.surfB}`,
                  background: c.surf, color: c.text, fontSize: 13, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box',
                }}
              />
            </label>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button type="button" disabled={busy !== null} onClick={() => setRejecting(null)} style={{ ...btn('transparent', c.text, busy !== null), border: `1.5px solid ${c.surfB}` }}>Bekor qilish</button>
              <button type="submit" disabled={busy !== null || reason.trim().length < 3} style={btn('#ef4444', '#fff', busy !== null || reason.trim().length < 3)}>
                {busy === rejecting.id ? 'Bajarilmoqda...' : 'Rad etish'}
              </button>
            </div>
          </form>
        </div>
      )}
    </MainLayout>
  );
}
