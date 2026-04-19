// pages/Hisobotlar.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TrendingUp, Package, FileText } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import MainLayout from '../components/layout/MainLayout';
import { useTranslation } from 'react-i18next';
import { api } from '../utils/api';
import { useCurrency } from '../context/CurrencyContext';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Title, Tooltip, Legend, Filler,
);

// ─── CSS ─────────────────────────────────────────────────────────────────────
const STYLES = `
  /* ── CSS variables ── */
  [data-theme="dark"] {
    --hb-bg:        #0a0e1a;
    --hb-card:      #111827;
    --hb-card2:     #1a1f2e;
    --hb-bdr:       #1e293b;
    --hb-bdr2:      #2a3144;
    --hb-sub:       #64748b;
    --hb-text:      #e2e8f0;
    --hb-input:     #0f1420;
    --hb-hover:     rgba(255,255,255,0.03);
  }
  [data-theme="light"] {
    --hb-bg:        #f8f9ff;
    --hb-card:      #ffffff;
    --hb-card2:     #ffffff;
    --hb-bdr:       #e2e8f0;
    --hb-bdr2:      #cbd5e1;
    --hb-sub:       #64748b;
    --hb-text:      #1e293b;
    --hb-input:     #f4f6fb;
    --hb-hover:     rgba(0,0,0,0.02);
  }

  .hb-root { width: 100%; }

  /* ── Stat kartalar ── */
  .hb-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
    margin-bottom: 32px;
  }
  .hb-stat {
    background: var(--hb-card);
    border-radius: 16px;
    padding: 24px;
    border: 1px solid var(--hb-bdr);
    transition: border-color .2s;
  }
  .hb-stat:hover { border-color: var(--hb-bdr2); }
  .hb-stat-icon {
    width: 40px; height: 40px; border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 12px;
  }
  .hb-stat-lbl { font-size: 14px; color: var(--hb-sub); margin-bottom: 6px; }
  .hb-stat-val { font-size: 28px; font-weight: 700; line-height: 1.2; }

  /* ── Filter buttons ── */
  .hb-filters {
    display: flex; gap: 12px; margin-bottom: 32px; flex-wrap: wrap;
  }
  .hb-fbtn {
    padding: 12px 20px; border-radius: 12px; border: none;
    font-weight: 600; font-size: 14px; cursor: pointer;
    transition: all .2s;
  }
  .hb-fbtn.on {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: #fff;
  }
  .hb-fbtn.off {
    background: var(--hb-input);
    color: var(--hb-sub);
  }
  .hb-fbtn.off:hover { color: var(--hb-text); }

  /* ── Chart card ── */
  .hb-chart-card {
    background: var(--hb-card2);
    border-radius: 20px;
    padding: 28px;
    border: 1px solid var(--hb-bdr);
    margin-bottom: 24px;
  }
  .hb-chart-title {
    font-size: 18px; font-weight: 700;
    color: var(--hb-text);
    margin-bottom: 20px;
  }
  .hb-chart-title.center { text-align: center; }

  /* ── Scroll chart wrapper ── */
  .hb-scroll-wrap {
    overflow-x: auto; cursor: grab; padding-bottom: 10px;
  }
  .hb-scroll-wrap:active { cursor: grabbing; }

  /* ── Charts grid (desktop 2 col) ── */
  .hb-charts-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 24px;
    margin-bottom: 40px;
  }

  /* ── Loading / empty ── */
  .hb-loading {
    text-align: center; padding: 80px 20px;
    color: var(--hb-sub);
  }
  .hb-skeleton {
    background: var(--hb-input); border-radius: 12px;
    height: 80px; margin-bottom: 10px;
    animation: hb-pulse 1.4s ease-in-out infinite;
  }
  @keyframes hb-pulse {
    0%,100% { opacity: .5; }
    50%      { opacity: 1;  }
  }

  /* ── Mobile mini-summary bar ── */
  .hb-mini-bar {
    display: none;
    background: var(--hb-card);
    border: 1px solid var(--hb-bdr);
    border-radius: 14px;
    padding: 10px 12px;
    margin-bottom: 12px;
    align-items: center;
    justify-content: space-around;
  }
  .hb-mb-item {
    display: flex; flex-direction: column;
    align-items: center; gap: 2px;
  }
  .hb-mb-lbl {
    font-size: 9px; font-weight: 700;
    color: var(--hb-sub);
    text-transform: uppercase; letter-spacing: .4px;
  }
  .hb-mb-val {
    font-size: 13px; font-weight: 800;
    font-family: monospace;
  }
  .hb-mb-div {
    width: 1px; height: 28px;
    background: var(--hb-bdr);
  }

  /* ── Mobile top3 cards ── */
  .hb-top3 {
    display: none;
    gap: 8px;
    margin-bottom: 12px;
  }
  .hb-top3-card {
    flex: 1;
    background: var(--hb-card);
    border: 1px solid var(--hb-bdr);
    border-radius: 12px;
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .hb-top3-rank {
    width: 22px; height: 22px; border-radius: 7px;
    display: flex; align-items: center; justify-content: center;
    font-size: 11px; font-weight: 800; color: #fff;
    margin-bottom: 4px;
  }
  .hb-top3-name {
    font-size: 11px; font-weight: 600; color: var(--hb-text);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .hb-top3-val {
    font-size: 10px; font-weight: 700;
    color: #10b981; font-family: monospace;
  }

  /* ════════════════════════════════════
     MOBILE — max 900px
  ════════════════════════════════════ */
  @media (max-width: 900px) {

    /* Stats: 2 col, first full-width */
    .hb-stats {
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-bottom: 12px;
    }
    .hb-stat:first-child { grid-column: 1 / -1; }
    .hb-stat {
      padding: 12px 14px;
      border-radius: 14px;
    }
    .hb-stat-icon { width: 30px; height: 30px; border-radius: 8px; margin-bottom: 7px; }
    .hb-stat-lbl  { font-size: 11px; margin-bottom: 3px; }
    .hb-stat-val  { font-size: 19px; }

    /* Filters: equal width pills */
    .hb-filters { gap: 6px; margin-bottom: 12px; }
    .hb-fbtn {
      flex: 1; padding: 8px 4px;
      font-size: 12px; border-radius: 10px;
      text-align: center;
    }

    /* Show mobile-only blocks */
    .hb-mini-bar { display: flex; }
    .hb-top3     { display: flex; }

    /* Chart cards */
    .hb-chart-card {
      padding: 14px 12px;
      border-radius: 16px;
      margin-bottom: 10px;
    }
    .hb-chart-title      { font-size: 13px; margin-bottom: 12px; }
    .hb-chart-title.center { font-size: 13px; }

    /* Charts grid: single column on mobile */
    .hb-charts-grid {
      grid-template-columns: 1fr;
      gap: 10px;
      margin-bottom: 16px;
    }

    /* Donut: side-by-side on mobile */
    .hb-donut-wrap {
      display: flex !important;
      align-items: center;
      gap: 10px;
    }
    .hb-donut-canvas  { flex: 0 0 120px; }
    .hb-donut-legend  { flex: 1; }

    /* Skeleton */
    .hb-skeleton { height: 60px; }
  }
`;

// ─── IndexedDB ────────────────────────────────────────────────────────────────
let reportsDB: IDBDatabase | null = null;

const openReportsDB = (): Promise<IDBDatabase> => {
  if (reportsDB) return Promise.resolve(reportsDB);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('ShoxPosReports', 2);
    req.onupgradeneeded = (e: any) => {
      const db: IDBDatabase = e.target.result;
      if (!db.objectStoreNames.contains('reports'))
        db.createObjectStore('reports', { keyPath: 'id', autoIncrement: true });
    };
    req.onsuccess = (e: any) => { reportsDB = e.target.result; resolve(reportsDB!); };
    req.onerror   = () => reject(req.error);
  });
};

const loadReportsFromIDB = async (): Promise<any[]> => {
  const db = await openReportsDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction('reports', 'readonly');
    const req = tx.objectStore('reports').openCursor();
    const arr: any[] = [];
    req.onsuccess = (e: any) => {
      const cursor = e.target.result;
      if (cursor) { arr.push(cursor.value); cursor.continue(); }
      else resolve(arr);
    };
    req.onerror = () => reject(req.error);
  });
};

const loadReportsFromMongoDB = async (login: string): Promise<any[]> => {
  try {
    const res = await api(`/api/sales/${login}`);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch { return []; }
};

// ─── helpers ─────────────────────────────────────────────────────────────────
function fmtShort(n: number) {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B';
  if (n >= 1_000_000)     return (n / 1_000_000).toFixed(0)     + 'M';
  if (n >= 1_000)         return (n / 1_000).toFixed(0)         + 'K';
  return String(n);
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
function HisobotlarContent() {
  const { t }             = useTranslation(['hisobotlar', 'common', 'categories']);
  const { format }        = useCurrency();

  const [reports,          setReports]         = useState<any[]>([]);
  const [filteredReports,  setFiltered]        = useState<any[]>([]);
  const [totalSum,         setTotalSum]        = useState(0);
  const [totalProducts,    setTotalProducts]   = useState(0);
  const [totalItemsSold,   setTotalItemsSold]  = useState(0);
  const [userImage,        setUserImage]       = useState<string | null>(null);
  const [theme,            setTheme]           = useState<'dark' | 'light'>('dark');
  const [dateFilter,       setDateFilter]      = useState<'all'|'today'|'week'|'month'>('all');
  const [loading,          setLoading]         = useState(true);

  const scrollChartRef  = useRef<HTMLDivElement>(null);
  const [isDragging,    setIsDragging]    = useState(false);
  const [dragStartX,    setDragStartX]    = useState(0);
  const [scrollStart,   setScrollStart]   = useState(0);
  const isFetching      = useRef(false);
  const isMounted       = useRef(true);

  const getCatLabel = (val: string) => val;

  // ── Load ─────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (isFetching.current) return;
    isFetching.current = true;
    const user  = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
    const login = user?.login || '';
    setLoading(true);
    try {
      const [mongoData, idbData] = await Promise.all([
        loadReportsFromMongoDB(login),
        loadReportsFromIDB(),
      ]);
      if (!isMounted.current) return;
      const merged = mongoData.map((m: any) => {
        const idb = idbData.find((i: any) => i.barcode === m.barcode);
        return idb ? { ...m, displayDate: new Date(idb.soldAt).toLocaleString() } : m;
      });
      setReports(merged);
    } catch (err) {
      console.error('Hisobot yuklash xatosi:', err);
    } finally {
      isFetching.current = false;
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
    let timer: ReturnType<typeof setTimeout>;
    const onSale = () => { clearTimeout(timer); timer = setTimeout(() => loadData(), 300); };
    window.addEventListener('saleAdded', onSale);
    return () => { isMounted.current = false; clearTimeout(timer); window.removeEventListener('saleAdded', onSale); };
  }, [loadData]);

  useEffect(() => {
    const now = new Date();
    let filtered = [...reports];
    if (dateFilter !== 'all') {
      filtered = filtered.filter(item => {
        if (!item.soldAt) return false;
        const d = new Date(item.soldAt);
        if (dateFilter === 'today') return d.toDateString() === now.toDateString();
        if (dateFilter === 'week') {
          const wa = new Date(now.getTime() - 7 * 86400000); wa.setHours(0,0,0,0);
          return d >= wa;
        }
        if (dateFilter === 'month') {
          const ma = new Date(now.getTime() - 30 * 86400000); ma.setHours(0,0,0,0);
          return d >= ma;
        }
        return true;
      });
    }
    setFiltered(filtered);
    setTotalSum(filtered.reduce((s, i) => s + Number(i.total    || 0), 0));
    setTotalItemsSold(filtered.reduce((s, i) => s + Number(i.quantity || 0), 0));
    setTotalProducts(filtered.length);
  }, [dateFilter, reports]);

  // ── Drag handlers ────────────────────────────────────────────────────
  const onMouseDown = (e: React.MouseEvent) => {
    if (!scrollChartRef.current) return;
    setIsDragging(true); setDragStartX(e.clientX); setScrollStart(scrollChartRef.current.scrollLeft);
    scrollChartRef.current.style.cursor = 'grabbing';
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollChartRef.current) return;
    e.preventDefault();
    scrollChartRef.current.scrollLeft = scrollStart - (e.clientX - dragStartX);
  };
  const onMouseUp = () => {
    setIsDragging(false);
    if (scrollChartRef.current) scrollChartRef.current.style.cursor = 'grab';
  };
  const onWheel = (e: React.WheelEvent) => {
    if (!scrollChartRef.current) return;
    e.preventDefault();
    scrollChartRef.current.scrollLeft += e.deltaY * 2;
  };

  // ── Theme shortcuts ───────────────────────────────────────────────────
  const isDark = theme === 'dark';
  const bdr    = isDark ? '#2a3144' : '#e2e8f0';
  const sub    = isDark ? '#64748b' : '#64748b';
  const txt    = isDark ? '#e2e8f0' : '#1e293b';

  // ── Chart data ────────────────────────────────────────────────────────
  const getAllDailySalesChartData = () => {
    const byDay = new Map<string, number>();
    reports.forEach(item => {
      if (!item.soldAt) return;
      const key = new Date(item.soldAt).toDateString();
      byDay.set(key, (byDay.get(key) || 0) + Number(item.total || 0));
    });
    const dates = reports.filter(r => r.soldAt).map(r => new Date(r.soldAt));
    if (!dates.length) return { labels: [], data: [] };
    const first = new Date(Math.min(...dates.map(d => d.getTime())));
    first.setHours(0,0,0,0);
    const today = new Date(); today.setHours(0,0,0,0);
    const labels: string[] = [], data: number[] = [];
    const cur = new Date(first);
    while (cur <= today) {
      labels.push(`${String(cur.getDate()).padStart(2,'0')}.${String(cur.getMonth()+1).padStart(2,'0')}.${cur.getFullYear()}`);
      data.push(byDay.get(cur.toDateString()) || 0);
      cur.setDate(cur.getDate() + 1);
    }
    return { labels, data };
  };

  const getDailySales = () => {
    const byDay: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i); byDay[d.toDateString()] = 0;
    }
    filteredReports.forEach(item => {
      if (item.soldAt) {
        const k = new Date(item.soldAt).toDateString();
        if (k in byDay) byDay[k] += Number(item.total || 0);
      }
    });
    const labels = Object.keys(byDay).map(k => {
      const d = new Date(k);
      return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}`;
    });
    return {
      labels,
      datasets: [{
        label: t('hisobotlar:sales'),
        data: Object.values(byDay),
        borderColor: '#667eea',
        backgroundColor: 'rgba(102,126,234,0.1)',
        fill: true, tension: 0.4,
        pointRadius: 4, pointHoverRadius: 6,
      }],
    };
  };

  const getTopBySum = () => {
    const map = new Map<string, { name: string; total: number }>();
    filteredReports.forEach(item => {
      const b = String(item.barcode || '').trim();
      if (!b) return;
      const cur = map.get(b) || { name: item.name || '?', total: 0 };
      cur.total += Number(item.total || 0);
      map.set(b, cur);
    });
    const sorted = [...map.values()].sort((a, b) => b.total - a.total).slice(0, 10);
    return {
      labels: sorted.map(p => p.name.length > 18 ? p.name.slice(0, 18) + '...' : p.name),
      datasets: [{
        label: t('hisobotlar:totalSalesAmount'),
        data: sorted.map(p => Math.round(p.total)),
        backgroundColor: ['#667eea','#764ba2','#f59e0b','#10b981','#ef4444','#8b5cf6','#ec4899','#06b6d4','#84cc16','#f97316'],
        borderRadius: 6,
      }],
    };
  };

  const getTopByQty = () => {
    const map = new Map<string, { name: string; qty: number }>();
    filteredReports.forEach(item => {
      const b = String(item.barcode || '').trim();
      if (!b) return;
      const cur = map.get(b) || { name: item.name || '?', qty: 0 };
      cur.qty += Number(item.quantity || 1);
      map.set(b, cur);
    });
    const sorted = [...map.values()].sort((a, b) => b.qty - a.qty).slice(0, 10);
    return {
      labels: sorted.map(p => p.name.length > 18 ? p.name.slice(0, 18) + '...' : p.name),
      datasets: [{
        label: t('hisobotlar:soldQuantity'),
        data: sorted.map(p => p.qty),
        backgroundColor: ['#10b981','#059669','#34d399','#6ee7b7','#a7f3d0','#14b8a6','#0d9488','#2dd4bf','#5eead4','#99f6e4'],
        borderRadius: 6,
      }],
    };
  };

  const getCategorySales = () => {
    const map = new Map<string, number>();
    filteredReports.forEach(item => {
      const cat = item.category || 'all';
      map.set(cat, (map.get(cat) || 0) + Number(item.total || 0));
    });
    const sorted = [...map.entries()].sort((a, b) => b[1] - a[1]);
    return {
      labels: sorted.map(([v]) => getCatLabel(v)),
      datasets: [{
        data: sorted.map(([, s]) => s),
        backgroundColor: ['#6366f1','#f59e0b','#10b981','#ef4444','#a855f7','#06b6d4','#84cc16','#f97316','#ec4899','#667eea'],
        borderWidth: 3,
        borderColor: isDark ? '#1a1f2e' : '#fff',
        hoverOffset: 6,
      }],
    };
  };

  // ── Chart options ─────────────────────────────────────────────────────
  const tooltipBase = {
    backgroundColor: isDark ? '#1a1f2e' : '#fff',
    titleColor: txt, bodyColor: sub,
    borderColor: bdr, borderWidth: 1, padding: 12,
  };
  const gridColor = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)';

  const lineOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { ...tooltipBase, callbacks: { label: (ctx: any) => ' ' + format(Number(ctx.raw)) } } },
    scales: {
      x: { ticks: { color: sub, font: { size: 11 } }, grid: { color: gridColor } },
      y: { ticks: { color: sub, font: { size: 11 }, callback: (v: any) => fmtShort(Number(v)) }, grid: { color: gridColor } },
    },
  };

  const horizOpts = {
    responsive: true, maintainAspectRatio: false,
    indexAxis: 'y' as const,
    plugins: { legend: { display: false }, tooltip: { ...tooltipBase } },
    scales: {
      x: { ticks: { color: sub, font: { size: 10 }, callback: (v: any) => fmtShort(Number(v)) }, grid: { color: gridColor } },
      y: { ticks: { color: sub, font: { size: 10 } }, grid: { display: false } },
    },
  };

  const donutOpts = {
    responsive: true, maintainAspectRatio: false, cutout: '65%',
    plugins: {
      legend: { display: true, position: 'bottom' as const, labels: { color: txt, usePointStyle: true, pointStyle: 'circle' as const, font: { size: 11 }, padding: 10 } },
      tooltip: { ...tooltipBase, callbacks: { label: (ctx: any) => ' ' + format(Number(ctx.raw)) } },
    },
  };

  // Compact donut options for mobile side-by-side layout
  const donutOptsMobile = { ...donutOpts, plugins: { ...donutOpts.plugins, legend: { display: false } } };

  const allChart   = getAllDailySalesChartData();
  const allLineData = {
    labels: allChart.labels,
    datasets: [{
      label: t('hisobotlar:sales'),
      data: allChart.data,
      borderColor: '#667eea',
      backgroundColor: 'rgba(102,126,234,0.1)',
      fill: true, tension: 0.4,
      pointRadius: allChart.labels.length > 60 ? 2 : 4,
    }],
  };

  // Top-3 products by qty for mobile highlight
  const top3 = (() => {
    const map = new Map<string, { name: string; qty: number }>();
    filteredReports.forEach(item => {
      const b = String(item.barcode || '').trim();
      if (!b) return;
      const cur = map.get(b) || { name: item.name || '?', qty: 0 };
      cur.qty += Number(item.quantity || 1);
      map.set(b, cur);
    });
    return [...map.values()].sort((a, b) => b.qty - a.qty).slice(0, 3);
  })();

  const rankColors = ['#f59e0b', '#94a3b8', '#cd7f32'];

  // ── Category legend for mobile (beside donut) ─────────────────────────
  const catData     = getCategorySales();
  const catColors   = ['#6366f1','#f59e0b','#10b981','#ef4444','#a855f7','#06b6d4','#84cc16','#f97316','#ec4899','#667eea'];

  // ── filter labels ─────────────────────────────────────────────────────
  const FILTERS: { key: 'all'|'today'|'week'|'month'; lbl: string }[] = [
    { key: 'all',   lbl: t('hisobotlar:all',   'Barchasi') },
    { key: 'today', lbl: t('hisobotlar:today', 'Bugun') },
    { key: 'week',  lbl: t('hisobotlar:week',  'Hafta') },
    { key: 'month', lbl: t('hisobotlar:month', 'Oy') },
  ];

  // ─────────────────────────────────────────────────────────────────────
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
            setUserImage(src); localStorage.setItem('userImage', src);
          };
          reader.readAsDataURL(file);
        }}
        title={t('hisobotlar:reports', 'Hisobotlar')}
      >
        <div className="hb-root">

          {loading ? (
            /* ── Loading skeletons ── */
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 20 }}>
                {[1,2,3].map(i => <div key={i} className="hb-skeleton" style={{ height: 96 }} />)}
              </div>
              {[1,2,3].map(i => <div key={i} className="hb-skeleton" />)}
            </>
          ) : (
            <>
              {/* ════════════════════════════════════
                  STAT KARTALAR
              ════════════════════════════════════ */}
              <div className="hb-stats">
                <div className="hb-stat">
                  <div className="hb-stat-icon" style={{ background: 'rgba(16,185,129,.15)' }}>
                    <TrendingUp size={18} color="#10b981" />
                  </div>
                  <div className="hb-stat-lbl">{t('hisobotlar:totalIncome', 'Umumiy daromad')}</div>
                  <div className="hb-stat-val" style={{ color: '#10b981' }}>{format(totalSum)}</div>
                </div>

                <div className="hb-stat">
                  <div className="hb-stat-icon" style={{ background: 'rgba(102,126,234,.15)' }}>
                    <FileText size={18} color="#667eea" />
                  </div>
                  <div className="hb-stat-lbl">{t('hisobotlar:salesCount', 'Sotilgan mahsulot turi')}</div>
                  <div className="hb-stat-val" style={{ color: '#667eea' }}>
                    {new Set(filteredReports.map(i => i.barcode)).size}
                  </div>
                </div>

                <div className="hb-stat">
                  <div className="hb-stat-icon" style={{ background: 'rgba(245,158,11,.15)' }}>
                    <Package size={18} color="#f59e0b" />
                  </div>
                  <div className="hb-stat-lbl">{t('hisobotlar:soldQuantity', 'Sotilgan mahsulot miqdori')}</div>
                  <div className="hb-stat-val" style={{ color: '#f59e0b' }}>{totalItemsSold}</div>
                </div>
              </div>

            

              {/* ════════════════════════════════════
                  FILTER BUTTONS
              ════════════════════════════════════ */}
              <div className="hb-filters">
                {FILTERS.map(f => (
                  <button
                    key={f.key}
                    className={`hb-fbtn ${dateFilter === f.key ? 'on' : 'off'}`}
                    onClick={() => setDateFilter(f.key)}
                  >
                    {f.lbl}
                  </button>
                ))}
              </div>

              

              {/* ════════════════════════════════════
                  BARCHA SOTUVLAR TARIXI (scroll)
              ════════════════════════════════════ */}
              <div className="hb-chart-card">
                <div className="hb-chart-title">
                  {t('hisobotlar:allSalesHistory', 'Barcha Sotuvlar Tarixi')}
                </div>
                <div
                  ref={scrollChartRef}
                  className="hb-scroll-wrap"
                  onMouseDown={onMouseDown}
                  onMouseMove={onMouseMove}
                  onMouseUp={onMouseUp}
                  onMouseLeave={onMouseUp}
                  onWheel={onWheel}
                >
                  <div style={{ width: `${Math.max(700, allChart.labels.length * 44)}px`, height: 280 }}>
                    <Line data={allLineData} options={lineOpts} />
                  </div>
                </div>
              </div>

              {/* ════════════════════════════════════
                  2-COLUMN CHARTS GRID
              ════════════════════════════════════ */}
              <div className="hb-charts-grid">

                {/* 1. Oxirgi 7 kun */}
                <div className="hb-chart-card" style={{ marginBottom: 0 }}>
                  <div className="hb-chart-title center">
                    {t('hisobotlar:last7DaysSales', 'Oxirgi 7 kunlik sotuvlar')}
                  </div>
                  <div style={{ height: 240 }}>
                    <Line data={getDailySales()} options={lineOpts} />
                  </div>
                </div>

                {/* 2. Kategoriyalar donut */}
                <div className="hb-chart-card" style={{ marginBottom: 0 }}>
                  <div className="hb-chart-title center">
                    {t('hisobotlar:salesByCategory', 'Kategoriyalar bo\'yicha sotuvlar')}
                  </div>

                  {/* Desktop: full donut with bottom legend */}
                  <div style={{ height: 240, display: 'block' }} className="hb-desktop-donut">
                    <Doughnut data={getCategorySales()} options={donutOpts} />
                  </div>

                  {/* Mobile: small donut + side legend */}
                  <div className="hb-donut-wrap" style={{ display: 'none' }}>
                    <div className="hb-donut-canvas" style={{ height: 120 }}>
                      <Doughnut data={getCategorySales()} options={donutOptsMobile} />
                    </div>
                    <div className="hb-donut-legend">
                      {catData.labels.slice(0, 6).map((lbl, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
                          <div style={{ width: 7, height: 7, borderRadius: '50%', background: catColors[i] ?? '#94a3b8', flexShrink: 0 }} />
                          <span style={{ fontSize: 10, color: sub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{String(lbl)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 3. Top 10 dona */}
                <div className="hb-chart-card" style={{ marginBottom: 0 }}>
                  <div className="hb-chart-title center">
                    {t('hisobotlar:top10ProductsByQuantity', 'Top 10 mahsulot (dona)')}
                  </div>
                  <div style={{ height: 280 }}>
                    <Bar data={getTopByQty()} options={horizOpts} />
                  </div>
                </div>

                {/* 4. Top 10 summa */}
                <div className="hb-chart-card" style={{ marginBottom: 0 }}>
                  <div className="hb-chart-title center">
                    {t('hisobotlar:top10ProductsByAmount', 'Top 10 mahsulot (summa)')}
                  </div>
                  <div style={{ height: 280 }}>
                    <Bar data={getTopBySum()} options={horizOpts} />
                  </div>
                </div>

              </div>
            </>
          )}
        </div>
      </MainLayout>

      {/* ── Mobile: switch donut layout via media query style tag ── */}
      <style>{`
        @media (max-width: 900px) {
          .hb-desktop-donut { display: none !important; }
          .hb-donut-wrap    { display: flex !important; }
        }
        @media (min-width: 901px) {
          .hb-desktop-donut { display: block !important; }
          .hb-donut-wrap    { display: none !important; }
        }
      `}</style>
    </>
  );
}

export default function Hisobotlar() {
  return <HisobotlarContent />;
}