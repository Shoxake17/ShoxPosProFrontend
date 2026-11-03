import React, { useCallback, useMemo, useState } from 'react';
import { CheckCircle2, Package, PackageCheck, RefreshCw, Truck, XCircle, Clock, ImageOff } from 'lucide-react';
import MainLayout from '../components/layout/MainLayout';
import {
  qurtErrorText,
  transitionQurtOrder,
  useQurtOrders,
  type QurtOrder,
  type QurtOrderStatus,
} from '../hooks/useQurtOrders';

/**
 * Qurt do'koni "Buyurtmalar" sahifasi.
 *
 * Buyurtmani mijoz OnDex ilovasidan beradi (naqd to'lov); u bir necha kun to'planib
 * REYS bilan yetkaziladi. Do'kon: yangi buyurtmani qabul qiladi yoki rad etadi (sabab bilan),
 * qabul qilingandan keyin qadoqlaydi — keyin OnDex logistikasi do'kondan oladi.
 *
 * Mijozning manzili va telefoni do'konga KO'RSATILMAYDI (faqat ism, tovar, summa, reys sanasi).
 * Tasdiqlaganda tovar ombordan avtomatik ayiriladi (yetmasa tasdiqlanmaydi).
 */

type Tab = 'new' | 'active' | 'done' | 'closed';

const TABS: { id: Tab; label: string; statuses: QurtOrderStatus[] }[] = [
  { id: 'new', label: 'Yangi', statuses: ['new'] },
  { id: 'active', label: 'Jarayonda', statuses: ['confirmed', 'packed', 'collected', 'out_for_delivery', 'failed'] },
  { id: 'done', label: 'Yetkazilgan', statuses: ['delivered'] },
  { id: 'closed', label: 'Bekor / rad', statuses: ['rejected', 'cancelled'] },
];

const STATUS_LABEL: Record<QurtOrderStatus, string> = {
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

const STATUS_COLOR: Record<QurtOrderStatus, string> = {
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

function formatTime(iso: string): string {
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return '';
  const two = (n: number) => String(n).padStart(2, '0');
  return `${two(t.getDate())}.${two(t.getMonth() + 1)} ${two(t.getHours())}:${two(t.getMinutes())}`;
}

const formatSum = (tiyin: number) => `${new Intl.NumberFormat('ru-RU').format(Math.round(tiyin / 100))} so'm`;

const DK = { card: '#0d1220', cardB: '#1e2740', surf: '#111827', surfB: '#1e2740', text: '#f1f5f9', muted: '#94a3b8' };
const LT = { card: '#ffffff', cardB: '#e2e8f0', surf: '#f1f5f9', surfB: '#cbd5e1', text: '#0f172a', muted: '#64748b' };

export default function QurtOrders() {
  const [userImage] = useState<string | null>(localStorage.getItem('userImage'));
  const [theme] = useState<'dark' | 'light'>((localStorage.getItem('theme') as 'dark' | 'light') || 'dark');
  const c = theme === 'dark' ? DK : LT;

  const [tab, setTab] = useState<Tab>('new');
  const [busy, setBusy] = useState<string | null>(null); // amal bajarilayotgan buyurtma ID'si
  const [notice, setNotice] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [rejecting, setRejecting] = useState<QurtOrder | null>(null);
  const [reason, setReason] = useState('');

  const onNew = useCallback((fresh: QurtOrder[]) => {
    // Ovoz/bildirishnoma — global QurtOrderAlerts'da (har sahifada ishlaydi).
    setNotice({ kind: 'ok', text: fresh.length === 1 ? `Yangi buyurtma: ${fresh[0].number}` : `${fresh.length} ta yangi buyurtma keldi` });
    setTab('new');
  }, []);

  const { orders, setOrders, loading, error, reload } = useQurtOrders(20000, onNew);

  const counts = useMemo(() => {
    const out: Record<Tab, number> = { new: 0, active: 0, done: 0, closed: 0 };
    for (const t of TABS) out[t.id] = orders.filter((o) => t.statuses.includes(o.status)).length;
    return out;
  }, [orders]);

  const visible = useMemo(() => {
    const statuses = TABS.find((t) => t.id === tab)!.statuses;
    return orders.filter((o) => statuses.includes(o.status));
  }, [orders, tab]);

  const act = async (order: QurtOrder, to: 'confirmed' | 'rejected' | 'packed', why?: string) => {
    if (busy) return; // qo'sh bosish himoyasi
    setBusy(order.id);
    setNotice(null);
    try {
      const updated = await transitionQurtOrder(order.id, to, why);
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
    } catch (e) {
      setNotice({ kind: 'err', text: qurtErrorText(e, "Amalni bajarib bo'lmadi. Qayta urinib ko'ring") });
      reload(); // holat boshqa joyda o'zgargan bo'lishi mumkin
    } finally {
      setBusy(null);
    }
  };

  const card: React.CSSProperties = {
    background: c.card, border: `1px solid ${c.cardB}`, borderRadius: 18, padding: 18,
    display: 'flex', flexDirection: 'column', gap: 14,
  };

  const btn = (bg: string, color = '#fff', disabled = false): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: '11px 18px', borderRadius: 12, border: 'none', fontSize: 14.5, fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1,
    background: bg, color, fontFamily: "'DM Sans', sans-serif",
  });

  return (
    <MainLayout theme={theme} userImage={userImage} title="Buyurtmalar">
      <div style={{ maxWidth: 980, margin: '0 auto', padding: '0 0 90px', fontFamily: "'DM Sans', sans-serif" }}>
        {/* Filtr tablari */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                style={{
                  padding: '10px 16px', borderRadius: 999, cursor: 'pointer', fontSize: 14, fontWeight: 700,
                  border: `1.5px solid ${active ? '#6366f1' : c.surfB}`,
                  background: active ? '#6366f1' : 'transparent', color: active ? '#fff' : c.text,
                  display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {t.label}
                <span style={{
                  minWidth: 22, padding: '1px 7px', borderRadius: 999, fontSize: 12, fontWeight: 800, textAlign: 'center',
                  background: active ? 'rgba(255,255,255,.25)' : (t.id === 'new' && counts.new > 0 ? '#ef4444' : c.surf),
                  color: active || (t.id === 'new' && counts.new > 0) ? '#fff' : c.muted,
                }}>{counts[t.id]}</span>
              </button>
            );
          })}
          <button
            type="button" onClick={reload} aria-label="Yangilash" title="Yangilash"
            style={{ ...btn(c.surf, c.text), marginLeft: 'auto', padding: '10px 12px', border: `1px solid ${c.surfB}` }}
          >
            <RefreshCw size={16} />
          </button>
        </div>

        {notice && (
          <div role="status" style={{
            marginBottom: 14, padding: '12px 14px', borderRadius: 12, fontSize: 14, fontWeight: 600,
            background: notice.kind === 'ok' ? 'rgba(16,185,129,.12)' : 'rgba(239,68,68,.12)',
            color: notice.kind === 'ok' ? '#10b981' : '#ef4444',
            border: `1px solid ${notice.kind === 'ok' ? 'rgba(16,185,129,.3)' : 'rgba(239,68,68,.3)'}`,
          }}>{notice.text}</div>
        )}

        {error && orders.length === 0 && (
          <div style={{ ...card, alignItems: 'center', textAlign: 'center', color: c.muted }}>
            <span>{error}</span>
            <button type="button" onClick={reload} style={btn('#6366f1')}>Qayta urinish</button>
          </div>
        )}

        {loading && orders.length === 0 && !error && (
          <div style={{ textAlign: 'center', padding: 60, color: c.muted }}>Yuklanmoqda...</div>
        )}

        {!loading && !error && visible.length === 0 && (
          <div style={{ ...card, alignItems: 'center', padding: 48, color: c.muted, textAlign: 'center' }}>
            <Package size={40} />
            <div style={{ fontWeight: 700, color: c.text }}>
              {tab === 'new' ? "Yangi buyurtma yo'q" : "Bu bo'limda buyurtma yo'q"}
            </div>
            <div style={{ fontSize: 13.5 }}>Mijoz OnDex ilovasidan buyurtma bersa, shu yerda ovoz bilan paydo bo'ladi.</div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {visible.map((o) => (
            <article key={o.id} style={card} aria-label={`Buyurtma ${o.number}`}>
              <header style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ fontSize: 17, fontWeight: 800, color: c.text }}>№ {o.number}</div>
                <span style={{
                  padding: '4px 12px', borderRadius: 999, fontSize: 12.5, fontWeight: 800,
                  background: `${STATUS_COLOR[o.status]}22`, color: STATUS_COLOR[o.status],
                }}>{STATUS_LABEL[o.status]}</span>
                <span style={{ marginLeft: 'auto', color: c.muted, fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Clock size={14} /> {formatTime(o.created_at)}
                </span>
              </header>

              <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', color: c.muted, fontSize: 13.5 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Truck size={15} /> Yetkazish: <b style={{ color: c.text }}>{formatDate(o.delivery_date)}</b>
                </span>
                {o.customer_name && <span>Mijoz: <b style={{ color: c.text }}>{o.customer_name}</b></span>}
                <span>To'lov: <b style={{ color: c.text }}>naqd (yetkazilganda)</b></span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {o.items.map((it, i) => (
                  <div key={`${it.barcode}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 88, height: 40, borderRadius: 10, overflow: 'hidden', flexShrink: 0, background: c.surf,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {it.image_url
                        ? <img src={it.image_url} alt="" loading="lazy" referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        : <ImageOff size={18} color={c.muted} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: c.text, fontWeight: 700, fontSize: 14.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.name}</div>
                      <div style={{ color: c.muted, fontSize: 12.5 }}>
                        {it.qty} dona × {formatSum(it.price_tiyin)}{it.weight_grams ? ` · ${it.weight_grams} g` : ''}
                      </div>
                    </div>
                    <div style={{ color: c.text, fontWeight: 800, fontSize: 14.5, whiteSpace: 'nowrap' }}>{formatSum(it.qty * it.price_tiyin)}</div>
                  </div>
                ))}
              </div>

              <footer style={{
                display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
                paddingTop: 14, borderTop: `1px dashed ${c.surfB}`,
              }}>
                <div style={{ color: c.muted, fontSize: 14 }}>Jami: <b style={{ color: '#6366f1', fontSize: 18 }}>{formatSum(o.total_tiyin)}</b></div>

                <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {o.status === 'new' && (
                    <>
                      <button
                        type="button" disabled={busy !== null}
                        onClick={() => { setRejecting(o); setReason(''); setNotice(null); }}
                        style={btn('rgba(239,68,68,.12)', '#ef4444', busy !== null)}
                      ><XCircle size={17} /> Rad etish</button>
                      <button
                        type="button" disabled={busy !== null}
                        onClick={() => act(o, 'confirmed')}
                        style={btn('linear-gradient(135deg,#6366f1,#8b5cf6)', '#fff', busy !== null)}
                      >
                        <CheckCircle2 size={17} /> {busy === o.id ? 'Bajarilmoqda...' : 'Qabul qilish'}
                      </button>
                    </>
                  )}
                  {o.status === 'confirmed' && (
                    <button
                      type="button" disabled={busy !== null}
                      onClick={() => act(o, 'packed')}
                      style={btn('linear-gradient(135deg,#6366f1,#8b5cf6)', '#fff', busy !== null)}
                    >
                      <PackageCheck size={17} /> {busy === o.id ? 'Bajarilmoqda...' : 'Qadoqlandi'}
                    </button>
                  )}
                  {o.status === 'packed' && (
                    <span style={{ color: c.muted, fontSize: 13.5 }}>Logistika reys kuni do'kondan olib ketadi</span>
                  )}
                </div>
              </footer>

              {o.status === 'new' && (
                <div style={{ color: c.muted, fontSize: 12.5 }}>
                  Qabul qilsangiz tovar ombordan avtomatik ayiriladi. Yetmasa buyurtma qabul qilinmaydi — avval qoldiqni to'ldiring yoki rad eting.
                </div>
              )}
              {o.reject_reason && (o.status === 'rejected' || o.status === 'cancelled' || o.status === 'failed') && (
                <div style={{ color: c.muted, fontSize: 13 }}>Sabab: {o.reject_reason}</div>
              )}
            </article>
          ))}
        </div>
      </div>

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
            style={{ ...card, width: '100%', maxWidth: 460 }}
          >
            <div style={{ fontSize: 18, fontWeight: 800, color: c.text }}>№ {rejecting.number} ni rad etish</div>
            <label style={{ color: c.text, fontWeight: 600, fontSize: 14 }}>
              Sabab (mijozga ko'rsatiladi)
              <textarea
                autoFocus value={reason} maxLength={200} rows={3}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Masalan: mahsulot tugagan"
                style={{
                  width: '100%', marginTop: 8, padding: 12, borderRadius: 12, border: `1.5px solid ${c.surfB}`,
                  background: c.surf, color: c.text, fontSize: 15, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box',
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
