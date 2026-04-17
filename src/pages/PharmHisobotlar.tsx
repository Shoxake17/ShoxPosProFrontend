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
import axiosInstance from '../api/axiosInstance';
import { useCurrency } from '../context/CurrencyContext';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Title, Tooltip, Legend, Filler,
);

const STYLES = `
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

  .hb-scroll-wrap {
    overflow-x: auto; cursor: grab; padding-bottom: 10px;
  }
  .hb-scroll-wrap:active { cursor: grabbing; }

  .hb-charts-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 24px;
    margin-bottom: 40px;
  }

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

  @media (max-width: 900px) {
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

    .hb-filters { gap: 6px; margin-bottom: 12px; }
    .hb-fbtn {
      flex: 1; padding: 8px 4px;
      font-size: 12px; border-radius: 10px;
      text-align: center;
    }

    .hb-chart-card {
      padding: 14px 12px;
      border-radius: 16px;
      margin-bottom: 10px;
    }
    .hb-chart-title      { font-size: 13px; margin-bottom: 12px; }

    .hb-charts-grid {
      grid-template-columns: 1fr;
      gap: 10px;
      margin-bottom: 16px;
    }
  }
`;

function fmtShort(n: number) {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B';
  if (n >= 1_000_000)     return (n / 1_000_000).toFixed(0)     + 'M';
  if (n >= 1_000)         return (n / 1_000).toFixed(0)         + 'K';
  return String(n);
}

function PharmHisobotlarContent() {
  const { t }             = useTranslation(['hisobotlar', 'common', 'categories']);
  const { format, convert, currency } = useCurrency();

  const [sales,            setSales]           = useState<any[]>([]);
  const [filteredSales,    setFiltered]        = useState<any[]>([]);
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

  const [user, setUser] = useState(() => JSON.parse(sessionStorage.getItem('currentUser') || '{}'));
  const login = user?.login || '';

  const loadData = useCallback(async () => {
    if (isFetching.current || !login) return;
    isFetching.current = true;
    setLoading(true);
    try {
      const res = await axiosInstance.get(`/pharmacy/pharm-sales/${login}`);
      if (Array.isArray(res.data)) {
        if (!isMounted.current) return;
        setSales(res.data);
      }
    } catch (err) {
      console.error('Sotuvlar yuklash xatosi:', err);
    } finally {
      isFetching.current = false;
      if (isMounted.current) setLoading(false);
    }
  }, [login]);

  useEffect(() => {
    isMounted.current = true;
    setUserImage(localStorage.getItem('userImage'));
    const saved = (localStorage.getItem('theme') as 'dark' | 'light') || 'dark';
    setTheme(saved);
    document.documentElement.setAttribute('data-theme', saved);
    if (login) loadData();
    return () => { isMounted.current = false; };
  }, [login, loadData]);

  useEffect(() => {
    const now = new Date();
    let filtered = [...sales];
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
    
    const sum = filtered.reduce((s, sale) => s + Number(sale.totalAmount || 0), 0);
    const totalItems = filtered.reduce((s, sale) => s + (sale.items?.reduce((si, it) => si + Number(it.quantity || 0), 0) || 0), 0);
    const uniqueProducts = new Set<string>();
    filtered.forEach(sale => {
      sale.items?.forEach((it: any) => uniqueProducts.add(it.barcode));
    });
    
    setTotalSum(sum);
    setTotalItemsSold(totalItems);
    setTotalProducts(uniqueProducts.size);
  }, [dateFilter, sales]);

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

  const isDark = theme === 'dark';
  const bdr    = isDark ? '#2a3144' : '#e2e8f0';
  const sub    = isDark ? '#64748b' : '#64748b';
  const txt    = isDark ? '#e2e8f0' : '#1e293b';

  const getAllDailySalesChartData = () => {
    const byDay = new Map<string, number>();
    sales.forEach(sale => {
      if (!sale.soldAt) return;
      const key = new Date(sale.soldAt).toDateString();
      byDay.set(key, (byDay.get(key) || 0) + Number(sale.totalAmount || 0));
    });
    const dates = sales.filter(s => s.soldAt).map(s => new Date(s.soldAt));
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
    filteredSales.forEach(sale => {
      if (sale.soldAt) {
        const k = new Date(sale.soldAt).toDateString();
        if (k in byDay) byDay[k] += Number(sale.totalAmount || 0);
      }
    });
    const labels = Object.keys(byDay).map(k => {
      const d = new Date(k);
      return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}`;
    });
    return {
      labels,
      datasets: [{
        label: 'Sotuvlar',
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
    filteredSales.forEach(sale => {
      sale.items?.forEach((item: any) => {
        const b = String(item.barcode || '').trim();
        if (!b) return;
        const cur = map.get(b) || { name: item.name || '?', total: 0 };
        cur.total += Number(item.total || 0);
        map.set(b, cur);
      });
    });
    const sorted = [...map.values()].sort((a, b) => b.total - a.total).slice(0, 10);
    return {
      labels: sorted.map(p => p.name.length > 18 ? p.name.slice(0, 18) + '...' : p.name),
      datasets: [{
        label: 'Jami summa',
        data: sorted.map(p => Math.round(p.total)),
        backgroundColor: ['#667eea','#764ba2','#f59e0b','#10b981','#ef4444','#8b5cf6','#ec4899','#06b6d4','#84cc16','#f97316'],
        borderRadius: 6,
      }],
    };
  };

  const getTopByQty = () => {
    const map = new Map<string, { name: string; qty: number }>();
    filteredSales.forEach(sale => {
      sale.items?.forEach((item: any) => {
        const b = String(item.barcode || '').trim();
        if (!b) return;
        const cur = map.get(b) || { name: item.name || '?', qty: 0 };
        cur.qty += Number(item.quantity || 1);
        map.set(b, cur);
      });
    });
    const sorted = [...map.values()].sort((a, b) => b.qty - a.qty).slice(0, 10);
    return {
      labels: sorted.map(p => p.name.length > 18 ? p.name.slice(0, 18) + '...' : p.name),
      datasets: [{
        label: 'Sotilgan soni',
        data: sorted.map(p => p.qty),
        backgroundColor: ['#10b981','#059669','#34d399','#6ee7b7','#a7f3d0','#14b8a6','#0d9488','#2dd4bf','#5eead4','#99f6e4'],
        borderRadius: 6,
      }],
    };
  };

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

  const allChart   = getAllDailySalesChartData();
  const allLineData = {
    labels: allChart.labels,
    datasets: [{
      label: 'Sotuvlar',
      data: allChart.data,
      borderColor: '#667eea',
      backgroundColor: 'rgba(102,126,234,0.1)',
      fill: true, tension: 0.4,
      pointRadius: allChart.labels.length > 60 ? 2 : 4,
    }],
  };

  const FILTERS: { key: 'all'|'today'|'week'|'month'; lbl: string }[] = [
    { key: 'all',   lbl: 'Barchasi' },
    { key: 'today', lbl: 'Bugun' },
    { key: 'week',  lbl: 'Hafta' },
    { key: 'month', lbl: 'Oy' },
  ];

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
        title="Dorixona hisobotlari"
      >
        <div className="hb-root">
          {loading ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 20 }}>
                {[1,2,3].map(i => <div key={i} className="hb-skeleton" style={{ height: 96 }} />)}
              </div>
              {[1,2,3].map(i => <div key={i} className="hb-skeleton" />)}
            </>
          ) : (
            <>
              <div className="hb-stats">
                <div className="hb-stat">
                  <div className="hb-stat-icon" style={{ background: 'rgba(16,185,129,.15)' }}>
                    <TrendingUp size={18} color="#10b981" />
                  </div>
                  <div className="hb-stat-lbl">Umumiy daromad</div>
                  <div className="hb-stat-val" style={{ color: '#10b981' }}>{format(totalSum)}</div>
                </div>

                <div className="hb-stat">
                  <div className="hb-stat-icon" style={{ background: 'rgba(102,126,234,.15)' }}>
                    <FileText size={18} color="#667eea" />
                  </div>
                  <div className="hb-stat-lbl">Sotilgan dori turi</div>
                  <div className="hb-stat-val" style={{ color: '#667eea' }}>
                    {totalProducts}
                  </div>
                </div>

                <div className="hb-stat">
                  <div className="hb-stat-icon" style={{ background: 'rgba(245,158,11,.15)' }}>
                    <Package size={18} color="#f59e0b" />
                  </div>
                  <div className="hb-stat-lbl">Sotilgan dori miqdori</div>
                  <div className="hb-stat-val" style={{ color: '#f59e0b' }}>{totalItemsSold}</div>
                </div>
              </div>

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

              <div className="hb-chart-card">
                <div className="hb-chart-title">Barcha Sotuvlar Tarixi</div>
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

              <div className="hb-charts-grid">
                <div className="hb-chart-card" style={{ marginBottom: 0 }}>
                  <div className="hb-chart-title center">Oxirgi 7 kunlik sotuvlar</div>
                  <div style={{ height: 240 }}>
                    <Line data={getDailySales()} options={lineOpts} />
                  </div>
                </div>

                <div className="hb-chart-card" style={{ marginBottom: 0 }}>
                  <div className="hb-chart-title center">Top 10 dori (dona)</div>
                  <div style={{ height: 280 }}>
                    <Bar data={getTopByQty()} options={horizOpts} />
                  </div>
                </div>

                <div className="hb-chart-card" style={{ marginBottom: 0 }}>
                  <div className="hb-chart-title center">Top 10 dori (summa)</div>
                  <div style={{ height: 280 }}>
                    <Bar data={getTopBySum()} options={horizOpts} />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </MainLayout>
    </>
  );
}

export default function PharmHisobotlar() {
  return <PharmHisobotlarContent />;
}
