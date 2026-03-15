import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp, Package, FileText, Download, ChevronLeft, ChevronRight, BarChart2
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import MainLayout from "../components/MainLayout";
import { useTranslation, TranslationProvider } from '../components/languages/Hisobotlar';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

let reportsDB: IDBDatabase | null = null;

function ReportsContent() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [reports, setReports] = useState<any[]>([]);
  const [filteredReports, setFilteredReports] = useState<any[]>([]);
  const [totalSum, setTotalSum] = useState(0);
  const [totalProducts, setTotalProducts] = useState(0);
  const [totalItemsSold, setTotalItemsSold] = useState(0);
  const [userImage, setUserImage] = useState<string | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [loading, setLoading] = useState(true);

  const scrollChartRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [scrollStartLeft, setScrollStartLeft] = useState(0);

  const categories = [
    { value: 'Don va un', label: `🌾 ${t('grainFlour')}` },
    { value: "Go'sht", label: `🥩 ${t('meat')}` },
    { value: 'Sabzavot', label: `🥬 ${t('vegetables')}` },
    { value: 'Mevalar', label: `🍎 ${t('fruits')}` },
    { value: 'Ichimliklar', label: `🧃 ${t('drinks')}` },
    { value: 'Yog\'', label: `🧈 ${t('oil')}` },
    { value: 'Sut mahsulotlari', label: `🥛 ${t('dairy')}` },
    { value: 'Qandolat mahsulotlari', label: `🍫 ${t('sweets')}` },
    { value: 'Kiyim', label: `🧥 ${t('clothing')}` },
    { value: 'Texnika', label: `🛠️ ${t('electronics')}` },
    { value: 'Avtotransport vositalari', label: `🚗 ${t('vehicles')}` },
    { value: 'Gigiyena vositalari', label: `🧼 ${t('hygiene')}` },
    { value: 'Oshxona jihozlari', label: `🍽️ ${t('kitchenware')}` },
    { value: 'Bolalar mahsulotlari', label: `🧸 ${t('babyProducts')}` },
    { value: 'Kantselyariya mahsulotlari', label: `✏️ ${t('stationery')}` },
    { value: 'Uy hayvonlari uchun tovarlar', label: `🐶 ${t('petProducts')}` },
    { value: 'Dorilar', label: `💊 ${t('medicine')}` },
  ];

  useEffect(() => {
    let isSubscribed = true;
    const fetchData = async () => {
      if (isSubscribed) {
        const savedImage = localStorage.getItem('userImage');
        if (savedImage) setUserImage(savedImage);
        const savedTheme = (localStorage.getItem('theme') as 'dark' | 'light') || 'dark';
        setTheme(savedTheme);
        document.documentElement.setAttribute('data-theme', savedTheme);
        await init();
      }
    };
    fetchData();
    return () => { isSubscribed = false; };
  }, []);

  useEffect(() => { filterReports(); }, [dateFilter, reports]);

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
    const dx = e.clientX - dragStartX;
    scrollChartRef.current.scrollLeft = scrollStartLeft - dx;
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

  const openReportsDB = () => {
    return new Promise<void>((resolve, reject) => {
      const req = indexedDB.open("ShoxPosReports", 2);
      req.onupgradeneeded = (e: any) => {
        reportsDB = e.target.result;
        if (!reportsDB!.objectStoreNames.contains("reports")) {
          reportsDB!.createObjectStore("reports", { keyPath: "id", autoIncrement: true });
        }
      };
      req.onsuccess = (e: any) => {
        reportsDB = e.target.result;
        resolve();
      };
      req.onerror = () => reject(req.error);
    });
  };

  const loadReportsFromIndexedDB = () => {
    return new Promise<any[]>((resolve, reject) => {
      if (!reportsDB) return reject('DB not open');
      const tx = reportsDB.transaction("reports", "readonly");
      const store = tx.objectStore("reports");
      const req = store.openCursor();
      const arr: any[] = [];
      req.onsuccess = (e: any) => {
        const cursor = e.target.result;
        if (cursor) {
          arr.push(cursor.value);
          cursor.continue();
        } else resolve(arr);
      };
      req.onerror = () => reject(req.error);
    });
  };

  const loadReportsFromMongoDB = async (login: string) => {
    try {
      const res = await fetch(`/api/sales/${login}`);
      if (!res.ok) throw new Error(t('mongoLoadError'));
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error('❌ MongoDB xatosi:', err);
      return [];
    }
  };

  const init = async () => {
    setLoading(true);
    const user = JSON.parse(sessionStorage.getItem("currentUser") || '{}');
    const login = user?.login || localStorage.getItem('login');
    try {
      await openReportsDB();
      const [mongoReports, idbShortReports] = await Promise.all([
        loadReportsFromMongoDB(login),
        loadReportsFromIndexedDB()
      ]);
      const finalReports = mongoReports.map((mongoItem: any) => {
        const idbMatch = idbShortReports.find(idb => idb.barcode === mongoItem.barcode);
        if (idbMatch) {
          return { ...mongoItem, displayDate: new Date(idbMatch.soldAt).toLocaleString() };
        } else {
          const d = new Date(mongoItem.soldAt);
          return { ...mongoItem, displayDate: `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()} (${t('daily')})` };
        }
      });
      setReports(finalReports);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotals = (data: any[], currentFilter: string) => {
    let finalSum = 0;

    if (currentFilter === 'month') {
      // FAQAT OY FILTRI TANLANGANDA: Bugundan 1 oy orqaga qaytib hisoblaydi
      const now = new Date();
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(now.getMonth() - 1);

      finalSum = data.reduce((acc, item) => {
        const soldDate = new Date(item.soldAt);
        if (soldDate >= oneMonthAgo && soldDate <= now) {
          return acc + Number(item.total || 0);
        }
        return acc;
      }, 0);
    } else {
      // BOSHQACHA HOLATLARDA (ALL, TODAY, WEEK): 
      // Filtrlangan ma'lumotlarning umumiy summasini hisoblaydi
      finalSum = data.reduce((acc, item) => acc + Number(item.total || 0), 0);
    }

    const itemsSold = data.reduce((acc, item) => acc + Number(item.quantity || 0), 0);
    const salesCount = data.length;

    setTotalSum(finalSum);
    setTotalItemsSold(itemsSold);
    setTotalProducts(salesCount);
  };

  const filterReports = () => {
  let filtered = [...reports];
  const now = new Date();
  
  if (dateFilter !== 'all') {
    filtered = filtered.filter(item => {
      if (!item.soldAt) return false;
      const soldDate = new Date(item.soldAt);

      if (dateFilter === 'today') {
        return soldDate.toDateString() === now.toDateString();
      }

      if (dateFilter === 'week') {
        const lastWeek = new Date();
        lastWeek.setDate(now.getDate() - 7);
        lastWeek.setHours(0, 0, 0, 0); // Haftaning boshlanishi 00:00
        return soldDate >= lastWeek;
      }

      if (dateFilter === 'month') {
        // MUHIM QISM: 30 kunlik aniq filtr
        const oneMonthAgo = new Date();
        oneMonthAgo.setDate(now.getDate() - 30); // 30 kun orqaga
        oneMonthAgo.setHours(0, 0, 0, 0); // O'sha kunning boshlanishi
        
        const endOfToday = new Date();
        endOfToday.setHours(23, 59, 59, 999); // Bugunning oxiri

        return soldDate >= oneMonthAgo && soldDate <= endOfToday;
      }
      return true;
    });
  }

  setFilteredReports(filtered);
  // calculateTotals faqat kelgan ma'lumotni summasini hisoblaydi
  const sum = filtered.reduce((acc, item) => acc + Number(item.total || 0), 0);
  const qty = filtered.reduce((acc, item) => acc + Number(item.quantity || 0), 0);
  
  setTotalSum(sum);
  setTotalItemsSold(qty);
  setTotalProducts(filtered.length);
};

  const getAllDailySalesChartData = () => {
    const salesByDay = new Map<string, { total: number; count: number; qty: number }>();
    reports.forEach(item => {
      if (!item.soldAt) return;
      const d = new Date(item.soldAt);
      const key = d.toDateString();
      const existing = salesByDay.get(key) || { total: 0, count: 0, qty: 0 };
      existing.total += Number(item.total || 0);
      existing.count += 1;
      existing.qty += Number(item.quantity || 1);
      salesByDay.set(key, existing);
    });
    const allDates = reports.filter(r => r.soldAt).map(r => new Date(r.soldAt));
    if (allDates.length === 0) return { labels: [], data: [], counts: [], qtys: [] };
    const firstDate = new Date(Math.min(...allDates.map(d => d.getTime())));
    firstDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const labels: string[] = [], data: number[] = [], counts: number[] = [], qtys: number[] = [];
    const cursor = new Date(firstDate);
    while (cursor <= today) {
      labels.push(`${String(cursor.getDate()).padStart(2, '0')}.${String(cursor.getMonth() + 1).padStart(2, '0')}.${cursor.getFullYear()}`);
      const dayData = salesByDay.get(cursor.toDateString());
      data.push(dayData?.total || 0);
      counts.push(dayData?.count || 0);
      qtys.push(dayData?.qty || 0);
      cursor.setDate(cursor.getDate() + 1);
    }
    return { labels, data, counts, qtys };
  };

  const getDailySales = () => {
    const labels: string[] = [];
    const salesByDay: { [key: string]: number } = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const dateStr = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
      labels.push(dateStr);
      salesByDay[d.toDateString()] = 0;
    }
    filteredReports.forEach(item => {
      if (item.soldAt) {
        const d = new Date(item.soldAt);
        if (salesByDay.hasOwnProperty(d.toDateString())) salesByDay[d.toDateString()] += Number(item.total || 0);
      }
    });
    return {
      labels,
      datasets: [{
        label: t('sales'),
        data: labels.map((_, i) => {
          const d = new Date(); d.setDate(d.getDate() - (6 - i));
          return salesByDay[d.toDateString()] || 0;
        }),
        borderColor: '#667eea',
        backgroundColor: 'rgba(102, 126, 234, 0.1)',
        fill: true, tension: 0.4
      }]
    };
  };

  const getTopProducts = () => {
    const productMap = new Map<string, { name: string, totalSum: number }>();
    filteredReports.forEach(item => {
      const barcode = String(item.barcode || '').trim();
      if (!barcode) return;
      const current = productMap.get(barcode) || { name: item.name || t('unknown'), totalSum: 0 };
      current.totalSum += Number(item.total || 0);
      productMap.set(barcode, current);
    });
    const sorted = Array.from(productMap.entries()).sort((a, b) => b[1].totalSum - a[1].totalSum).slice(0, 10);
    return {
      labels: sorted.map(([_, p]) => p.name.length > 18 ? p.name.slice(0, 18) + '...' : p.name),
      datasets: [{
        label: t('totalSalesAmount'),
        data: sorted.map(([_, p]) => Math.round(p.totalSum)),
        backgroundColor: ['#667eea', '#764ba2', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316'],
        borderRadius: 8
      }]
    };
  };

  const getTopProductsByQuantity = () => {
    const productMap = new Map<string, { name: string, qty: number }>();
    filteredReports.forEach(item => {
      const barcode = String(item.barcode || '').trim();
      if (!barcode) return;
      const current = productMap.get(barcode) || { name: item.name || t('unknown'), qty: 0 };
      current.qty += Number(item.quantity || 1);
      productMap.set(barcode, current);
    });
    const sorted = Array.from(productMap.entries()).sort((a, b) => b[1].qty - a[1].qty).slice(0, 10);
    return {
      labels: sorted.map(([_, p]) => p.name.length > 18 ? p.name.slice(0, 18) + '...' : p.name),
      datasets: [{
        label: t('soldQuantity'),
        data: sorted.map(([_, p]) => p.qty),
        backgroundColor: ['#10b981', '#059669', '#34d399', '#6ee7b7', '#a7f3d0', '#14b8a6', '#0d9488', '#2dd4bf', '#5eead4', '#99f6e4'],
        borderRadius: 8
      }]
    };
  };

  const getCategorySales = () => {
    const catMap = new Map<string, number>();
    filteredReports.forEach(item => {
      const cat = item.category || t('all');
      catMap.set(cat, (catMap.get(cat) || 0) + Number(item.total || 0));
    });
    const sorted = Array.from(catMap.entries()).sort((a, b) => b[1] - a[1]);
    const labels = sorted.map(([val]) => categories.find(c => c.value === val)?.label || val);
    return {
      labels,
      datasets: [{
        data: sorted.map(([_, sum]) => sum),
        backgroundColor: ['#667eea', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'],
        borderWidth: 3,
        borderColor: theme === 'dark' ? '#1a1f2e' : '#fff'
      }]
    };
  };

  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: theme === 'dark' ? '#1a1f2e' : '#fff',
        titleColor: theme === 'dark' ? '#e2e8f0' : '#1e293b',
        bodyColor: theme === 'dark' ? '#8b92a7' : '#64748b',
        borderColor: theme === 'dark' ? '#2a3144' : '#e2e8f0',
        borderWidth: 1, padding: 12
      }
    }
  };

  const dailySalesOptions = {
    ...commonOptions,
    scales: {
      x: { ticks: { color: theme === 'dark' ? '#8b92a7' : '#64748b' }, grid: { color: theme === 'dark' ? '#2a3144' : '#e2e8f0' } },
      y: { ticks: { color: theme === 'dark' ? '#8b92a7' : '#64748b', callback: (v: any) => v.toLocaleString() + ' ' + t('currencyUnit') }, grid: { color: theme === 'dark' ? '#2a3144' : '#e2e8f0' } }
    }
  };

  const horizontalBarOptions = {
    ...commonOptions,
    indexAxis: 'y' as const,
    scales: {
      x: { ticks: { color: theme === 'dark' ? '#8b92a7' : '#64748b', callback: (v: any) => v.toLocaleString() }, grid: { color: theme === 'dark' ? '#2a3144' : '#e2e8f0' } },
      y: { ticks: { color: theme === 'dark' ? '#8b92a7' : '#64748b' }, grid: { display: false } }
    }
  };

  const categorySalesOptions = {
    ...commonOptions,
    cutout: '65%',
    plugins: {
      ...commonOptions.plugins,
      legend: {
        display: true, position: 'bottom' as const,
        labels: { color: theme === 'dark' ? '#e2e8f0' : '#1e293b', usePointStyle: true, pointStyle: 'circle' }
      }
    }
  };

  const allDailyChart = getAllDailySalesChartData();
  const allDailySalesLineData = {
    labels: allDailyChart.labels,
    datasets: [{
      label: t('sales'),
      data: allDailyChart.data,
      borderColor: '#667eea',
      backgroundColor: 'rgba(102, 126, 234, 0.1)',
      fill: true, tension: 0.4,
      pointRadius: allDailyChart.labels.length > 60 ? 2 : 4,
    }]
  };



  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const src = ev.target?.result as string;
        setUserImage(src);
        localStorage.setItem('userImage', src);
      };
      reader.readAsDataURL(file);
    }
  };

  const isDark = theme === 'dark';

  return (
    <MainLayout theme={theme} userImage={userImage} handleImageUpload={handleImageUpload} title={t("reports")}>
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: isDark ? '#8b92a7' : '#64748b' }}>
          <p style={{ fontSize: '18px', fontWeight: 500 }}>{t("loading")}</p>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '32px' }}>
            <div style={{ background: isDark ? 'linear-gradient(135deg, #1a1f2e 0%, #252b3d 100%)' : '#fff', borderRadius: '16px', padding: '24px', border: `1px solid ${isDark ? '#2a3144' : '#e2e8f0'}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><TrendingUp size={20} color="#10b981" /></div>
                <span style={{ fontSize: '14px', color: isDark ? '#8b92a7' : '#64748b' }}>{t("totalIncome")}</span>
              </div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#10b981' }}>{totalSum.toLocaleString()} {t('currencyUnit')}</div>
            </div>
            <div style={{ background: isDark ? 'linear-gradient(135deg, #1a1f2e 0%, #252b3d 100%)' : '#fff', borderRadius: '16px', padding: '24px', border: `1px solid ${isDark ? '#2a3144' : '#e2e8f0'}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(102, 126, 234, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FileText size={20} color="#667eea" /></div>
                <span style={{ fontSize: '14px', color: isDark ? '#8b92a7' : '#64748b' }}>{t("salesCount")}</span>
              </div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#667eea' }}>{totalProducts}</div>
            </div>

            <div style={{ background: isDark ? 'linear-gradient(135deg, #1a1f2e 0%, #252b3d 100%)' : '#fff', borderRadius: '16px', padding: '24px', border: `1px solid ${isDark ? '#2a3144' : '#e2e8f0'}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Package size={20} color="#f59e0b" /></div>
                <span style={{ fontSize: '14px', color: isDark ? '#8b92a7' : '#64748b' }}>{t("soldQuantity")}</span>
              </div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#f59e0b' }}>{totalItemsSold}</div>
            </div>
            
          </div>

          <div style={{ display: 'flex', gap: '12px', marginBottom: '32px', flexWrap: 'wrap' }}>
            {(['all', 'today', 'week', 'month'] as const).map(filter => (
              <button key={filter} onClick={() => setDateFilter(filter)} style={{ padding: '12px 20px', borderRadius: '12px', border: 'none', background: dateFilter === filter ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : (isDark ? '#1a1f2e' : '#f1f5f9'), color: dateFilter === filter ? '#fff' : (isDark ? '#e2e8f0' : '#1e293b'), fontWeight: 600, cursor: 'pointer' }}>{t(filter)}</button>
            ))}
          </div>

          <div style={{ background: isDark ? '#1a1f2e' : '#fff', borderRadius: '20px', padding: '28px', border: `1px solid ${isDark ? '#2a3144' : '#e2e8f0'}`, marginBottom: '32px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 700, color: isDark ? '#e2e8f0' : '#1e293b', marginBottom: '24px' }}>Barcha Sotuvlar Tarixi</h3>
            <div ref={scrollChartRef} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseLeave} onWheel={handleWheel} style={{ overflowX: 'auto', cursor: 'grab', paddingBottom: '10px' }}>
              <div style={{ width: `${Math.max(900, allDailyChart.labels.length * 44)}px`, height: '340px' }}>
                <Line data={allDailySalesLineData} options={dailySalesOptions} />
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginBottom: '40px' }}>
            <div style={{ background: isDark ? '#1a1f2e' : '#fff', borderRadius: '16px', padding: '24px', border: `1px solid ${isDark ? '#2a3144' : '#e2e8f0'}` }}>
              <h3 style={{ marginBottom: '20px', fontSize: '18px', fontWeight: 600, color: isDark ? '#e2e8f0' : '#1e293b' }}>{t("last7DaysSales")}</h3>
              <div style={{ height: '300px' }}><Line data={getDailySales()} options={dailySalesOptions} /></div>
            </div>
            <div style={{ background: isDark ? '#1a1f2e' : '#fff', borderRadius: '16px', padding: '24px', border: `1px solid ${isDark ? '#2a3144' : '#e2e8f0'}`, display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ marginBottom: '20px', fontSize: '18px', fontWeight: 600, color: isDark ? '#e2e8f0' : '#1e293b', textAlign: 'center' }}>{t("salesByCategory")}</h3>
              <div style={{ height: '300px' }}><Doughnut data={getCategorySales()} options={categorySalesOptions} /></div>
            </div>
            <div style={{ background: isDark ? '#1a1f2e' : '#fff', borderRadius: '16px', padding: '24px', border: `1px solid ${isDark ? '#2a3144' : '#e2e8f0'}` }}>
              <h3 style={{ marginBottom: '20px', fontSize: '18px', fontWeight: 600, color: isDark ? '#e2e8f0' : '#1e293b' }}>{t("top10ProductsByQuantity")}</h3>
              <div style={{ height: '300px' }}><Bar data={getTopProductsByQuantity()} options={horizontalBarOptions} /></div>
            </div>
            <div style={{ background: isDark ? '#1a1f2e' : '#fff', borderRadius: '16px', padding: '24px', border: `1px solid ${isDark ? '#2a3144' : '#e2e8f0'}` }}>
              <h3 style={{ marginBottom: '20px', fontSize: '18px', fontWeight: 600, color: isDark ? '#e2e8f0' : '#1e293b' }}>{t("top10ProductsByAmount")}</h3>
              <div style={{ height: '300px' }}><Bar data={getTopProducts()} options={horizontalBarOptions} /></div>
            </div>
          </div>
        </>
      )}
    </MainLayout>
  );
}

export default function Reports() {
  return (
    <TranslationProvider>
      <ReportsContent />
    </TranslationProvider>
  );
}