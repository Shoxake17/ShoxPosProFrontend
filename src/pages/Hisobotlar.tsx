// pages/Hisobotlar.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  TrendingUp, Package, FileText,
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import MainLayout from "../components/MainLayout";
import { useTranslation, TranslationProvider } from '../components/languages/Hisobotlar';
import { api } from '../utils/api';
import { useCurrency } from '../context/CurrencyContext';
ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Title, Tooltip, Legend, Filler
);

// ─── IndexedDB — modul darajasida bir marta ───────────────────────────────
let reportsDB: IDBDatabase | null = null;

const openReportsDB = (): Promise<IDBDatabase> => {
  if (reportsDB) return Promise.resolve(reportsDB);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("ShoxPosReports", 2);
    req.onupgradeneeded = (e: any) => {
      const db: IDBDatabase = e.target.result;
      if (!db.objectStoreNames.contains("reports")) {
        db.createObjectStore("reports", { keyPath: "id", autoIncrement: true });
      }
    };
    req.onsuccess = (e: any) => { reportsDB = e.target.result; resolve(reportsDB!); };
    req.onerror  = () => reject(req.error);
  });
};

const loadReportsFromIDB = async (): Promise<any[]> => {
  const db = await openReportsDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction("reports", "readonly");
    const req = tx.objectStore("reports").openCursor();
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

// ─────────────────────────────────────────────────────────────────────────
function ReportsContent() {
  const { t } = useTranslation();
  const { format, convert } = useCurrency();
  const [reports,         setReports]         = useState<any[]>([]);
  const [filteredReports, setFilteredReports] = useState<any[]>([]);
  const [totalSum,        setTotalSum]        = useState(0);
  const [totalProducts,   setTotalProducts]   = useState(0);
  const [totalItemsSold,  setTotalItemsSold]  = useState(0);
  const [userImage,       setUserImage]       = useState<string | null>(null);
  const [theme,           setTheme]           = useState<'dark' | 'light'>('dark');
  const [dateFilter,      setDateFilter]      = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [loading,         setLoading]         = useState(true);

  const scrollChartRef  = useRef<HTMLDivElement>(null);
  const [isDragging,      setIsDragging]      = useState(false);
  const [dragStartX,      setDragStartX]      = useState(0);
  const [scrollStartLeft, setScrollStartLeft] = useState(0);

  // ✅ Fetch guard
  const isFetching = useRef(false);
  const isMounted  = useRef(true);

  // ✅ t ref — dependency loop'dan qochish uchun
  const tRef = useRef(t);
  useEffect(() => { tRef.current = t; }, [t]);

  // ─── Kategoriyalar — t ref orqali ─────────────────────────────────────
  const getCategories = () => [
    { value: 'grainFlour',      label: `🌾 ${tRef.current('grainFlour')}` },
    { value: 'meat',            label: `🥩 ${tRef.current('meat')}` },
    { value: 'vegetables',      label: `🥬 ${tRef.current('vegetables')}` },
    { value: 'fruits',          label: `🍎 ${tRef.current('fruits')}` },
    { value: 'drinks',          label: `🧃 ${tRef.current('drinks')}` },
    { value: 'oil',             label: `🧈 ${tRef.current('oil')}` },
    { value: 'dairy',           label: `🥛 ${tRef.current('dairy')}` },
    { value: 'sweets',          label: `🍫 ${tRef.current('sweets')}` },
    { value: 'clothing',        label: `🧥 ${tRef.current('clothing')}` },
    { value: 'electronics',     label: `🛠️ ${tRef.current('electronics')}` },
    { value: 'vehicles',        label: `🚗 ${tRef.current('vehicles')}` },
    { value: 'hygiene',         label: `🧼 ${tRef.current('hygiene')}` },
    { value: 'kitchenware',     label: `🍽️ ${tRef.current('kitchenware')}` },
    { value: 'babyProducts',    label: `🧸 ${tRef.current('babyProducts')}` },
    { value: 'stationery',      label: `✏️ ${tRef.current('stationery')}` },
    { value: 'petProducts',     label: `🐶 ${tRef.current('petProducts')}` },
    { value: 'medicine',        label: `💊 ${tRef.current('medicine')}` },
  ];

  // ─── Data yuklash — ✅ bo'sh dependency, faqat bir marta yaratiladi ───
  const loadData = useCallback(async () => {
    if (isFetching.current) return;
    isFetching.current = true;

    const user  = JSON.parse(sessionStorage.getItem("currentUser") || '{}');
    const login = user?.login || '';

    setLoading(true);
    try {
      const [mongoReports, idbReports] = await Promise.all([
        loadReportsFromMongoDB(login),
        loadReportsFromIDB(),
      ]);

      if (!isMounted.current) return;

      const finalReports = mongoReports.map((mongoItem: any) => {
        const idbMatch = idbReports.find(
          (idb: any) => idb.barcode === mongoItem.barcode
        );
        if (idbMatch) {
          return {
            ...mongoItem,
            displayDate: new Date(idbMatch.soldAt).toLocaleString(),
          };
        }
        const d = new Date(mongoItem.soldAt);
        return {
          ...mongoItem,
          displayDate: `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`,
        };
      });

      setReports(finalReports);
    } catch (err) {
      console.error('Hisobot yuklash xatosi:', err);
    } finally {
      isFetching.current = false;
      if (isMounted.current) setLoading(false);
    }
  }, []); // ✅ Bo'sh — hech qachon qayta yaratilmaydi

  // ─── Bir marta mount ─────────────────────────────────────────────────
  useEffect(() => {
    isMounted.current = true;

    setUserImage(localStorage.getItem('userImage'));
    const savedTheme = (localStorage.getItem('theme') as 'dark' | 'light') || 'dark';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);

    loadData();

    // ✅ Debounce — saleAdded ko'p kelsa faqat bir marta ishlaydi
    let debounceTimer: ReturnType<typeof setTimeout>;
    const handleSaleAdded = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => loadData(), 300);
    };

    window.addEventListener('saleAdded', handleSaleAdded);

    return () => {
      isMounted.current = false;
      clearTimeout(debounceTimer);
      window.removeEventListener('saleAdded', handleSaleAdded);
    };
  }, []); // ✅ Bo'sh — faqat mount/unmount

  // ─── Filter ───────────────────────────────────────────────────────────
  useEffect(() => {
    const now = new Date();
    let filtered = [...reports];

    if (dateFilter !== 'all') {
      filtered = filtered.filter(item => {
        if (!item.soldAt) return false;
        const d = new Date(item.soldAt);
        if (dateFilter === 'today') return d.toDateString() === now.toDateString();
        if (dateFilter === 'week') {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          weekAgo.setHours(0, 0, 0, 0);
          return d >= weekAgo;
        }
        if (dateFilter === 'month') {
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          monthAgo.setHours(0, 0, 0, 0);
          return d >= monthAgo;
        }
        return true;
      });
    }

    setFilteredReports(filtered);
    setTotalSum(filtered.reduce((s, i) => s + Number(i.total    || 0), 0));
    setTotalItemsSold(filtered.reduce((s, i) => s + Number(i.quantity || 0), 0));
    setTotalProducts(filtered.length);
  }, [dateFilter, reports]);

  // ─── Chart drag handlers ──────────────────────────────────────────────
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!scrollChartRef.current) return;
    setIsDragging(true);
    setDragStartX(e.clientX);
    setScrollStartLeft(scrollChartRef.current.scrollLeft);
    scrollChartRef.current.style.cursor = 'grabbing';
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !scrollChartRef.current) return;
    e.preventDefault();
    scrollChartRef.current.scrollLeft = scrollStartLeft - (e.clientX - dragStartX);
  }, [isDragging, dragStartX, scrollStartLeft]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    if (scrollChartRef.current) scrollChartRef.current.style.cursor = 'grab';
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      if (scrollChartRef.current) scrollChartRef.current.style.cursor = 'grab';
    }
  }, [isDragging]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!scrollChartRef.current) return;
    e.preventDefault();
    scrollChartRef.current.scrollLeft += e.deltaY * 2;
  }, []);

  // ─── Theme variables ──────────────────────────────────────────────────
  const isDark = theme === 'dark';
  const bdr    = isDark ? '#2a3144' : '#e2e8f0';
  const sub    = isDark ? '#8b92a7' : '#64748b';
  const txt    = isDark ? '#e2e8f0' : '#1e293b';
  const cardBg = isDark ? 'linear-gradient(135deg,#1a1f2e 0%,#252b3d 100%)' : '#fff';

  // ─── Chart data builders ──────────────────────────────────────────────
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
    first.setHours(0, 0, 0, 0);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const labels: string[] = [], data: number[] = [];
    const cur = new Date(first);
    while (cur <= today) {
      labels.push(
        `${String(cur.getDate()).padStart(2,'0')}.${String(cur.getMonth()+1).padStart(2,'0')}.${cur.getFullYear()}`
      );
      data.push(byDay.get(cur.toDateString()) || 0);
      cur.setDate(cur.getDate() + 1);
    }
    return { labels, data };
  };

  const getDailySales = () => {
    const byDay: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      byDay[d.toDateString()] = 0;
    }
    filteredReports.forEach(item => {
      if (item.soldAt) {
        const key = new Date(item.soldAt).toDateString();
        if (key in byDay) byDay[key] += Number(item.total || 0);
      }
    });
    const labels = Object.keys(byDay).map(k => {
      const d = new Date(k);
      return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`;
    });
    return {
      labels,
      datasets: [{
        label: t('sales'),
        data: Object.values(byDay),
        borderColor: '#667eea',
        backgroundColor: 'rgba(102,126,234,0.1)',
        fill: true,
        tension: 0.4,
      }],
    };
  };

  const getTopProducts = () => {
    const map = new Map<string, { name: string; total: number }>();
    filteredReports.forEach(item => {
      const b = String(item.barcode || '').trim();
      if (!b) return;
      const cur = map.get(b) || { name: item.name || t('unknown'), total: 0 };
      cur.total += Number(item.total || 0);
      map.set(b, cur);
    });
    const sorted = [...map.values()].sort((a, b) => b.total - a.total).slice(0, 10);
    return {
      labels: sorted.map(p => p.name.length > 18 ? p.name.slice(0, 18) + '...' : p.name),
      datasets: [{
        label: t('totalSalesAmount'),
        data: sorted.map(p => Math.round(p.total)),
        backgroundColor: ['#667eea','#764ba2','#f59e0b','#10b981','#ef4444','#8b5cf6','#ec4899','#06b6d4','#84cc16','#f97316'],
        borderRadius: 8,
      }],
    };
  };

  const getTopProductsByQuantity = () => {
    const map = new Map<string, { name: string; qty: number }>();
    filteredReports.forEach(item => {
      const b = String(item.barcode || '').trim();
      if (!b) return;
      const cur = map.get(b) || { name: item.name || t('unknown'), qty: 0 };
      cur.qty += Number(item.quantity || 1);
      map.set(b, cur);
    });
    const sorted = [...map.values()].sort((a, b) => b.qty - a.qty).slice(0, 10);
    return {
      labels: sorted.map(p => p.name.length > 18 ? p.name.slice(0, 18) + '...' : p.name),
      datasets: [{
        label: t('soldQuantity'),
        data: sorted.map(p => p.qty),
        backgroundColor: ['#10b981','#059669','#34d399','#6ee7b7','#a7f3d0','#14b8a6','#0d9488','#2dd4bf','#5eead4','#99f6e4'],
        borderRadius: 8,
      }],
    };
  };

  const getCategorySales = () => {
    const categories = getCategories();
    const map = new Map<string, number>();
    filteredReports.forEach(item => {
      const cat = item.category || t('all');
      map.set(cat, (map.get(cat) || 0) + Number(item.total || 0));
    });
    const sorted = [...map.entries()].sort((a, b) => b[1] - a[1]);
    return {
      labels: sorted.map(([val]) => categories.find(c => c.value === val)?.label || val),
      datasets: [{
        data: sorted.map(([, sum]) => sum),
        backgroundColor: ['#667eea','#f59e0b','#10b981','#ef4444','#8b5cf6','#ec4899','#06b6d4','#84cc16','#f97316','#6366f1'],
        borderWidth: 3,
        borderColor: isDark ? '#1a1f2e' : '#fff',
      }],
    };
  };

  // ─── Chart options ────────────────────────────────────────────────────
  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: isDark ? '#1a1f2e' : '#fff',
        titleColor: txt,
        bodyColor: sub,
        borderColor: bdr,
        borderWidth: 1,
        padding: 12,
      },
    },
  };

  const axisOptions = {
    ...commonOptions,
    scales: {
      x: { ticks: { color: sub }, grid: { color: bdr } },
      y: {
        ticks: {
          color: sub,
          callback: (v: any) => format(Number(v)),
        },
        grid: { color: bdr },
      },
    },
  };

  const horizBarOptions = {
    ...commonOptions,
    indexAxis: 'y' as const,
    scales: {
      x: { ticks: { color: sub, callback: (v: any) => v.toLocaleString() }, grid: { color: bdr } },
      y: { ticks: { color: sub }, grid: { display: false } },
    },
  };

  const donutOptions = {
    ...commonOptions,
    cutout: '65%',
    plugins: {
      ...commonOptions.plugins,
      legend: {
        display: true,
        position: 'bottom' as const,
        labels: { color: txt, usePointStyle: true, pointStyle: 'circle' as const },
      },
    },
  };

  const allChart = getAllDailySalesChartData();
  const allLineData = {
    labels: allChart.labels,
    datasets: [{
      label: t('sales'),
      data: allChart.data,
      borderColor: '#667eea',
      backgroundColor: 'rgba(102,126,234,0.1)',
      fill: true,
      tension: 0.4,
      pointRadius: allChart.labels.length > 60 ? 2 : 4,
    }],
  };

  // ─── Stat card helper ─────────────────────────────────────────────────
  const statCard = (
    icon: React.ReactNode,
    label: string,
    value: React.ReactNode,
    color: string
  ) => (
    <div style={{ background: cardBg, borderRadius: 16, padding: 24, border: `1px solid ${bdr}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: `${color}20`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {icon}
        </div>
        <span style={{ fontSize: 14, color: sub }}>{label}</span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color }}>{value}</div>
    </div>
  );

  // ─── Render ───────────────────────────────────────────────────────────
  return (
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
      title={t("reports")}
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: sub }}>
          <p style={{ fontSize: 18, fontWeight: 500 }}>{t("loading")}</p>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit,minmax(250px,1fr))',
            gap: 20,
            marginBottom: 32,
          }}>
            {statCard(<TrendingUp size={20} color="#10b981" />, t("totalIncome"),  format(totalSum), "#10b981")}
            {statCard(<FileText   size={20} color="#667eea" />, t("salesCount"),   totalProducts,   "#667eea")}
            {statCard(<Package    size={20} color="#f59e0b" />, t("soldQuantity"), totalItemsSold,  "#f59e0b")}
          </div>

          {/* Date filter */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 32, flexWrap: 'wrap' }}>
            {(['all', 'today', 'week', 'month'] as const).map(f => (
              <button
                key={f}
                onClick={() => setDateFilter(f)}
                style={{
                  padding: '12px 20px',
                  borderRadius: 12,
                  border: 'none',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: dateFilter === f
                    ? 'linear-gradient(135deg,#667eea 0%,#764ba2 100%)'
                    : (isDark ? '#1a1f2e' : '#f1f5f9'),
                  color: dateFilter === f ? '#fff' : txt,
                  transition: 'all 0.2s ease',
                }}
              >
                {t(f)}
              </button>
            ))}
          </div>

          {/* All sales history chart */}
          <div style={{
            background: isDark ? '#1a1f2e' : '#fff',
            borderRadius: 20, padding: 28,
            border: `1px solid ${bdr}`,
            marginBottom: 32,
          }}>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: txt, marginBottom: 24 }}>
              {t('allSalesHistory')}
            </h3>
            <div
              ref={scrollChartRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
              onWheel={handleWheel}
              style={{ overflowX: 'auto', cursor: 'grab', paddingBottom: 10 }}
            >
              <div style={{ width: `${Math.max(900, allChart.labels.length * 44)}px`, height: 340 }}>
                <Line data={allLineData} options={axisOptions} />
              </div>
            </div>
          </div>

          {/* Charts grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit,minmax(400px,1fr))',
            gap: 24,
            marginBottom: 40,
          }}>
            {[
              { title: t("last7DaysSales"),          chart: <Line     data={getDailySales()}            options={axisOptions}     /> },
              { title: t("salesByCategory"),         chart: <Doughnut data={getCategorySales()}         options={donutOptions}    /> },
              { title: t("top10ProductsByQuantity"), chart: <Bar      data={getTopProductsByQuantity()}  options={horizBarOptions} /> },
              { title: t("top10ProductsByAmount"),   chart: <Bar      data={getTopProducts()}            options={horizBarOptions} /> },
            ].map(({ title, chart }) => (
              <div key={title} style={{
                background: isDark ? '#1a1f2e' : '#fff',
                borderRadius: 16, padding: 24,
                border: `1px solid ${bdr}`,
              }}>
                <h3 style={{ marginBottom: 20, fontSize: 18, fontWeight: 600, color: txt, textAlign: 'center' }}>
                  {title}
                </h3>
                <div style={{ height: 300 }}>{chart}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </MainLayout>
  );
}

export default function Reports() {
  return <TranslationProvider><ReportsContent /></TranslationProvider>;
}