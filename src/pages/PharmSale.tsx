// pages/PharmSale.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TrendingUp, FileText, Package, Search } from 'lucide-react';
import MainLayout from '../components/layout/MainLayout';
import { useTranslation } from 'react-i18next';
import { useCurrency } from '../context/CurrencyContext';
import axiosInstance from '../api/axiosInstance';

// ─── styles ──────────────────────────────────────────────────────────────────
const STYLES = `
  .sot-root {
    width: 100%;
  }

  /* ── Stat kartalar ── */
  .sot-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    margin-bottom: 24px;
  }
  .sot-stat-card {
    border-radius: 16px;
    padding: 20px;
    border: 1px solid var(--sot-bdr);
    background: var(--sot-card);
  }
  .sot-stat-icon {
    width: 38px;
    height: 38px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 10px;
  }
  .sot-stat-label {
    font-size: 13px;
    color: var(--sot-sub);
    margin-bottom: 6px;
    font-weight: 500;
  }
  .sot-stat-value {
    font-size: 26px;
    font-weight: 700;
    line-height: 1.2;
  }

  /* ── Search + Filter panel ── */
  .sot-filter-panel {
    background: var(--sot-card);
    border-radius: 16px;
    padding: 18px 20px;
    border: 1px solid var(--sot-bdr);
    margin-bottom: 20px;
    display: flex;
    gap: 14px;
    flex-wrap: wrap;
    align-items: center;
  }
  .sot-search-wrap {
    flex: 1;
    min-width: 220px;
    position: relative;
  }
  .sot-search-icon {
    position: absolute;
    left: 13px;
    top: 50%;
    transform: translateY(-50%);
    pointer-events: none;
  }
  .sot-search-input {
    width: 100%;
    padding: 11px 14px 11px 40px;
    border-radius: 12px;
    border: 1px solid var(--sot-bdr);
    background: var(--sot-input-bg);
    color: var(--sot-text);
    font-size: 14px;
    outline: none;
    box-sizing: border-box;
    transition: border-color 0.2s;
  }
  .sot-search-input:focus { border-color: #667eea; }
  .sot-search-input::placeholder { color: var(--sot-sub); }

  .sot-filters {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
  .sot-filter-btn {
    padding: 9px 16px;
    border-radius: 10px;
    border: none;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
  }
  .sot-filter-btn.active {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: #fff;
  }
  .sot-filter-btn.inactive {
    background: var(--sot-input-bg);
    color: var(--sot-sub);
  }
  .sot-filter-btn.inactive:hover {
    background: var(--sot-bdr-strong);
    color: var(--sot-text);
  }

  /* ── Desktop table ── */
  .sot-table-wrap {
    background: var(--sot-card);
    border-radius: 20px;
    padding: 24px;
    border: 1px solid var(--sot-bdr);
    overflow-x: auto;
  }
  .sot-table {
    width: 100%;
    border-collapse: collapse;
    min-width: 560px;
  }
  .sot-table thead tr {
    border-bottom: 2px solid var(--sot-bdr);
  }
  .sot-table th {
    padding: 13px 16px;
    color: var(--sot-sub);
    font-weight: 600;
    font-size: 13px;
    white-space: nowrap;
  }
  .sot-table tbody tr {
    border-bottom: 1px solid var(--sot-bdr);
    transition: background 0.15s;
  }
  .sot-table tbody tr:hover {
    background: var(--sot-row-hover);
  }
  .sot-table tbody tr:last-child {
    border-bottom: none;
  }
  .sot-table td {
    padding: 15px 16px;
    font-size: 14px;
  }

  /* ── Mobile cards ── */
  .sot-mobile-list {
    display: none;
  }
  .sot-mobile-card {
    background: var(--sot-card);
    border-radius: 16px;
    border: 1px solid var(--sot-bdr);
    padding: 14px;
    margin-bottom: 10px;
    transition: border-color 0.2s;
  }
  .sot-mobile-card:active {
    border-color: #667eea;
  }
  .sot-mc-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 10px;
    margin-bottom: 10px;
  }
  .sot-mc-name {
    font-size: 14px;
    font-weight: 600;
    color: var(--sot-text);
    line-height: 1.35;
    flex: 1;
  }
  .sot-mc-time {
    background: var(--sot-input-bg);
    border-radius: 8px;
    padding: 3px 9px;
    font-size: 11px;
    color: var(--sot-sub);
    white-space: nowrap;
    flex-shrink: 0;
    font-family: monospace;
  }
  .sot-mc-bottom {
    display: grid;
    grid-template-columns: 1fr auto auto;
    gap: 8px;
    align-items: center;
  }
  .sot-mc-barcode {
    font-size: 11px;
    color: #6366f1;
    font-family: monospace;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .sot-mc-pay-badge {
    display: inline-flex;
    padding: 3px 9px;
    border-radius: 7px;
    font-size: 10px;
    font-weight: 700;
    margin-top: 4px;
  }
  .pay-naqd   { background: rgba(16,185,129,0.15); color: #10b981; }
  .pay-plastik{ background: rgba(99,102,241,0.15);  color: #818cf8; }
  .pay-qarz   { background: rgba(245,158,11,0.15);  color: #f59e0b; }
  .pay-other  { background: rgba(100,116,139,0.15); color: #94a3b8; }

  .sot-mc-qty {
    display: inline-flex;
    width: 28px;
    height: 28px;
    background: var(--sot-input-bg);
    border-radius: 8px;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    font-weight: 700;
    color: var(--sot-text);
    flex-shrink: 0;
  }
  .sot-mc-amount {
    text-align: right;
  }
  .sot-mc-total {
    font-size: 15px;
    font-weight: 800;
    color: #10b981;
    font-family: monospace;
  }
  .sot-mc-unit {
    font-size: 10px;
    color: var(--sot-sub);
    margin-top: 2px;
    text-align: right;
  }

  /* ── Mobile summary bar (sticky top below header) ── */
  .sot-mobile-summary {
    display: none;
    background: var(--sot-card);
    border: 1px solid var(--sot-bdr);
    border-radius: 14px;
    padding: 12px 14px;
    margin-bottom: 12px;
    align-items: center;
    justify-content: space-between;
  }
  .sot-ms-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
  }
  .sot-ms-label {
    font-size: 10px;
    color: var(--sot-sub);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.4px;
  }
  .sot-ms-value {
    font-size: 15px;
    font-weight: 800;
    font-family: monospace;
  }
  .sot-ms-divider {
    width: 1px;
    height: 32px;
    background: var(--sot-bdr);
  }

  /* ── Section date divider ── */
  .sot-date-divider {
    text-align: center;
    font-size: 11px;
    font-weight: 700;
    color: var(--sot-sub);
    letter-spacing: 0.8px;
    text-transform: uppercase;
    padding: 6px 0 10px;
    position: relative;
  }
  .sot-date-divider::before,
  .sot-date-divider::after {
    content: '';
    position: absolute;
    top: 50%;
    width: 28%;
    height: 1px;
    background: var(--sot-bdr);
  }
  .sot-date-divider::before { left: 0; }
  .sot-date-divider::after  { right: 0; }

  /* ── Empty / loading state ── */
  .sot-empty {
    text-align: center;
    padding: 60px 20px;
    color: var(--sot-sub);
  }
  .sot-empty svg {
    margin: 0 auto 16px;
    opacity: 0.25;
    display: block;
  }
  .sot-empty-title {
    font-size: 17px;
    font-weight: 600;
    margin-bottom: 6px;
    color: var(--sot-text);
  }
  .sot-empty-sub {
    font-size: 13px;
  }

  /* ── Loading skeleton ── */
  .sot-skeleton {
    background: var(--sot-input-bg);
    border-radius: 10px;
    height: 72px;
    margin-bottom: 10px;
    animation: sot-pulse 1.4s ease-in-out infinite;
  }
  @keyframes sot-pulse {
    0%, 100% { opacity: 0.5; }
    50%       { opacity: 1;   }
  }

  /* ── Responsive ── */
  @media (max-width: 900px) {
    .sot-stats {
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 14px;
    }
    .sot-stats .sot-stat-card:first-child {
      grid-column: 1 / -1;
    }
    .sot-stat-card {
      padding: 14px;
      border-radius: 14px;
    }
    .sot-stat-value {
      font-size: 20px;
    }
    .sot-stat-icon {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      margin-bottom: 8px;
    }
    .sot-stat-label {
      font-size: 11px;
    }

    .sot-filter-panel {
      padding: 12px;
      border-radius: 14px;
      gap: 10px;
      margin-bottom: 12px;
    }
    .sot-search-wrap {
      min-width: 0;
    }
    .sot-filters {
      width: 100%;
      justify-content: space-between;
    }
    .sot-filter-btn {
      flex: 1;
      padding: 8px 6px;
      font-size: 12px;
      text-align: center;
    }

    /* Hide desktop table, show mobile cards */
    .sot-table-wrap { display: none; }
    .sot-mobile-list { display: block; }
    .sot-mobile-summary { display: flex; }
  }

  /* ── Light theme ── */
  [data-theme="light"] {
    --sot-card:       #ffffff;
    --sot-input-bg:   #f4f6fb;
    --sot-bdr:        #e2e8f0;
    --sot-bdr-strong: #cbd5e1;
    --sot-sub:        #64748b;
    --sot-text:       #1e293b;
    --sot-row-hover:  #f8fafc;
  }
  [data-theme="dark"] {
    --sot-card:       #111827;
    --sot-input-bg:   #0f1420;
    --sot-bdr:        #1e293b;
    --sot-bdr-strong: #2a3144;
    --sot-sub:        #64748b;
    --sot-text:       #e2e8f0;
    --sot-row-hover:  rgba(255,255,255,0.03);
  }
`;

// ─── API ──────────────────────────────────────────────────────────────────────
async function loadPharmSalesFromAPI(): Promise<any[]> {
  try {
    const raw = sessionStorage.getItem('currentUser');
    const user = raw ? JSON.parse(raw) : null;
    if (!user?.login) return [];
    const res = await axiosInstance.get(`/pharmacy/pharm-sales/${encodeURIComponent(user.login)}`);
    const sales = Array.isArray(res.data) ? res.data : [];
    // Flatten sale items into individual records
    const flattened: any[] = [];
    sales.forEach((sale: any) => {
      sale.items.forEach((item: any) => {
        flattened.push({
          ...item,
          soldAt: sale.soldAt,
          paymentMethod: sale.paymentMethod,
          total: item.total,
          price: item.price,
          quantity: item.quantity,
          name: item.name,
          barcode: item.barcode,
        });
      });
    });
    return flattened;
  } catch (e) {
    console.error('Dorixona sotuvlarini yuklashda xato:', e);
    return [];
  }
}

// ─── helpers ─────────────────────────────────────────────────────────────────
function paymentClass(method?: string) {
  if (!method) return 'pay-other';
  const m = method.toLowerCase();
  if (m === 'naqd')    return 'pay-naqd';
  if (m === 'plastik') return 'pay-plastik';
  if (m === 'qarz')    return 'pay-qarz';
  return 'pay-other';
}

function paymentLabel(method?: string) {
  if (!method) return '—';
  const m = method.toLowerCase();
  if (m === 'naqd')    return 'Naqd';
  if (m === 'plastik') return 'Plastik';
  if (m === 'qarz')    return 'Qarz';
  return method;
}

function fmtDatetime(iso?: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  const dd   = String(d.getDate()).padStart(2, '0');
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh   = String(d.getHours()).padStart(2, '0');
  const min  = String(d.getMinutes()).padStart(2, '0');
  return `${dd}.${mm}.${yyyy}, ${hh}:${min}`;
}

function fmtTime(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function fmtDateLabel(iso?: string) {
  if (!iso) return '';
  const d   = new Date(iso);
  const now = new Date();
  const dd   = String(d.getDate()).padStart(2, '0');
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  if (d.toDateString() === now.toDateString()) return `Bugun — ${dd}.${mm}.${yyyy}`;
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return `Kecha — ${dd}.${mm}.${yyyy}`;
  return `${dd}.${mm}.${yyyy}`;
}

// Group items by date for mobile view
function groupByDate(items: any[]) {
  const groups: { label: string; items: any[] }[] = [];
  const map = new Map<string, any[]>();
  items.forEach(item => {
    const key = item.soldAt ? new Date(item.soldAt).toDateString() : 'unknown';
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  });
  map.forEach((its, key) => {
    const label = its[0]?.soldAt ? fmtDateLabel(its[0].soldAt) : 'Noma\'lum';
    groups.push({ label, items: its });
  });
  return groups;
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function PharmSale() {
  const { t } = useTranslation(['pharmSale', 'common']);
  const { format } = useCurrency();

  const [reports, setReports]               = useState<any[]>([]);
  const [filteredReports, setFiltered]      = useState<any[]>([]);
  const [totalSum, setTotalSum]             = useState(0);
  const [userImage, setUserImage]           = useState<string | null>(null);
  const [theme, setTheme]                   = useState<'dark' | 'light'>('dark');
  const [searchQuery, setSearchQuery]       = useState('');
  const [dateFilter, setDateFilter]         = useState('all');
  const [loading, setLoading]              = useState(true);

  const isMounted = useRef(true);

  const loadData = useCallback(async () => {
    console.log("🔄 [PharmSale] loadData called!");
    if (!isMounted.current) return;
    setLoading(true);
    try {
      const apiData = await loadPharmSalesFromAPI();
      console.log("✅ [PharmSale] apiData:", apiData);
      if (isMounted.current) setReports(apiData);
    } catch (err) {
      console.error('❌ [PharmSale] Yuklash xatosi:', err);
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    setUserImage(localStorage.getItem('userImage'));
    const saved = (localStorage.getItem('theme') as 'dark' | 'light') || 'dark';
    setTheme(saved);
    document.documentElement.setAttribute('data-theme', saved);
    loadData();

    const onOnline     = () => loadData();
    const onSaleAdded  = () => loadData();
    window.addEventListener('online',     onOnline);
    window.addEventListener('saleAdded',  onSaleAdded);
    return () => {
      isMounted.current = false;
      window.removeEventListener('online',    onOnline);
      window.removeEventListener('saleAdded', onSaleAdded);
    };
  }, [loadData]);

  useEffect(() => {
    let filtered = [...reports];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        item =>
          item.name?.toLowerCase().includes(q) ||
          String(item.barcode).includes(q),
      );
    }
    if (dateFilter !== 'all') {
      const now = new Date();
      filtered = filtered.filter(item => {
        if (!item.soldAt) return false;
        const d = new Date(item.soldAt);
        if (dateFilter === 'today')
          return d.toDateString() === now.toDateString();
        if (dateFilter === 'week')
          return d >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (dateFilter === 'month')
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        return true;
      });
    }
    // Sort newest first
    filtered.sort((a, b) =>
      new Date(b.soldAt || 0).getTime() - new Date(a.soldAt || 0).getTime(),
    );
    setFiltered(filtered);
    setTotalSum(filtered.reduce((s, i) => s + Number(i.total || 0), 0));
  }, [searchQuery, dateFilter, reports]);

  const uniqueCount    = new Set(filteredReports.map(i => i.barcode)).size;
  const soldTotal      = filteredReports.reduce((s, i) => s + Number(i.quantity || 0), 0);
  const groupedReports = groupByDate(filteredReports);

  const filterLabels: Record<string, string> = {
    all: 'Barchasi',
    today: 'Kunlik',
    week: 'Haftalik',
    month: 'Oylik',
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{STYLES}</style>
      <MainLayout
        theme={theme}
        userImage={userImage}
        handleImageUpload={e => {
          const file = e.target.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = ev => {
            const src = ev.target?.result as string;
            setUserImage(src);
            localStorage.setItem('userImage', src);
          };
          reader.readAsDataURL(file);
        }}
        title="Sotuvlar"
      >
        <div className="sot-root">

          {/* ── Stat kartalar ── */}
          <div className="sot-stats">
            <div className="sot-stat-card">
              <div className="sot-stat-icon" style={{ background: 'rgba(16,185,129,0.15)' }}>
                <TrendingUp size={18} color="#10b981" />
              </div>
              <div className="sot-stat-label">Umumiy summa</div>
              <div className="sot-stat-value" style={{ color: '#10b981' }}>{format(totalSum)}</div>
            </div>

            <div className="sot-stat-card">
              <div className="sot-stat-icon" style={{ background: 'rgba(99,102,241,0.15)' }}>
                <FileText size={18} color="#667eea" />
              </div>
              <div className="sot-stat-label">Turli dorilar soni</div>
              <div className="sot-stat-value" style={{ color: '#667eea' }}>{uniqueCount}</div>
            </div>

            <div className="sot-stat-card">
              <div className="sot-stat-icon" style={{ background: 'rgba(245,158,11,0.15)' }}>
                <Package size={18} color="#f59e0b" />
              </div>
              <div className="sot-stat-label">Sotilgan dorilar</div>
              <div className="sot-stat-value" style={{ color: '#f59e0b' }}>{soldTotal}</div>
            </div>
          </div>

          {/* ── Search + Filter ── */}
          <div className="sot-filter-panel">
            <div className="sot-search-wrap">
              <Search size={16} color="var(--sot-sub)" className="sot-search-icon" />
              <input
                type="text"
                className="sot-search-input"
                placeholder="Barcode va Nomi orqali qidiring"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="sot-filters">
              {(['all', 'today', 'week', 'month'] as const).map(f => (
                <button
                  key={f}
                  className={`sot-filter-btn ${dateFilter === f ? 'active' : 'inactive'}`}
                  onClick={() => setDateFilter(f)}
                >
                  {filterLabels[f]}
                </button>
              ))}
            </div>
          </div>

          

          {/* ══════════════════════════════════════════════
              DESKTOP — table
          ══════════════════════════════════════════════ */}
          <div className="sot-table-wrap">
            {loading ? (
              <div className="sot-empty">
                <p style={{ fontSize: 15 }}>Yuklanmoqda...</p>
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="sot-empty">
                <FileText size={48} />
                <div className="sot-empty-title">Sotuvlar topilmadi</div>
                <div className="sot-empty-sub">Filtrlarni o'zgartiring</div>
              </div>
            ) : (
              <table className="sot-table">
                <thead>
                  <tr>
                    {[
                      { label: 'Dorilar', align: 'left' },
                      { label: 'Barkod',      align: 'center' },
                      { label: 'Soni',        align: 'center' },
                      { label: 'Narxi',       align: 'right' },
                      { label: 'Jammi',       align: 'right' },
                      { label: 'Vaqti',       align: 'right' },
                    ].map((h, i) => (
                      <th key={i} style={{ textAlign: h.align as any }}>{h.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredReports.map((item, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 500, color: 'var(--sot-text)' }}>{item.name}</td>
                      <td style={{ textAlign: 'center', color: '#6366f1', fontFamily: 'monospace', fontSize: 13 }}>
                        {item.barcode}
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--sot-text)' }}>
                        {item.quantity}
                      </td>
                      <td style={{ textAlign: 'right', color: 'var(--sot-sub)' }}>
                        {format(item.price)}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#10b981' }}>
                        {format(item.total)}
                      </td>
                      <td style={{ textAlign: 'right', fontSize: 12, color: 'var(--sot-sub)' }}>
                        {fmtDatetime(item.soldAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* ══════════════════════════════════════════════
              MOBILE — cards grouped by date
          ══════════════════════════════════════════════ */}
          <div className="sot-mobile-list">
            {loading ? (
              <>
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="sot-skeleton" />
                ))}
              </>
            ) : filteredReports.length === 0 ? (
              <div className="sot-empty">
                <FileText size={44} />
                <div className="sot-empty-title">Sotuvlar topilmadi</div>
                <div className="sot-empty-sub">Filtrlarni o'zgartiring</div>
              </div>
            ) : (
              groupedReports.map((group, gi) => (
                <div key={gi}>
                  <div className="sot-date-divider">{group.label}</div>
                  {group.items.map((item, idx) => (
                    <div key={idx} className="sot-mobile-card">

                      {/* Top row: name + time */}
                      <div className="sot-mc-top">
                        <div className="sot-mc-name">{item.name}</div>
                        <div className="sot-mc-time">{fmtTime(item.soldAt)}</div>
                      </div>

                      {/* Bottom row: barcode+badge | qty | amount */}
                      <div className="sot-mc-bottom">
                        <div>
                          <div className="sot-mc-barcode">{item.barcode}</div>
                          <div>
                            <span className={`sot-mc-pay-badge ${paymentClass(item.paymentMethod)}`}>
                              {paymentLabel(item.paymentMethod)}
                            </span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                          <span className="sot-mc-qty">{item.quantity}</span>
                        </div>

                        <div className="sot-mc-amount">
                          <div className="sot-mc-total">{format(item.total)}</div>
                          <div className="sot-mc-unit">
                            {format(item.price)} × {item.quantity}
                          </div>
                        </div>
                      </div>

                    </div>
                  ))}
                </div>
              ))
            )}
          </div>

        </div>
      </MainLayout>
    </>
  );
}
