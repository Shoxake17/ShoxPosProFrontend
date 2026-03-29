// pages/Sotilgan.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  TrendingUp, FileText, Package, Search,
} from 'lucide-react';
import MainLayout from "../components/MainLayout";
import { useTranslation, TranslationProvider } from '../components/languages/Sotilgan';

// ─── IndexedDB — modül darajasida bir marta ochiladi ─────────────────────
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
    req.onsuccess = (e: any) => {
      reportsDB = e.target.result;
      resolve(reportsDB!);
    };
    req.onerror = () => reject(req.error);
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

// ─────────────────────────────────────────────────────────────────────────
function ReportsContent() {
  const { t } = useTranslation();

  const [reports,         setReports]         = useState<any[]>([]);
  const [filteredReports, setFilteredReports] = useState<any[]>([]);
  const [totalSum,        setTotalSum]        = useState(0);
  const [userImage,       setUserImage]       = useState<string | null>(null);
  const [theme,           setTheme]           = useState<'dark' | 'light'>('dark');
  const [searchQuery,     setSearchQuery]     = useState('');
  const [dateFilter,      setDateFilter]      = useState('all');
  const [loading,         setLoading]         = useState(true);

  const isMounted = useRef(true);

  // ─── Ma'lumot yuklash — faqat kerak bo'lganda ─────────────────────────
  const loadData = useCallback(async () => {
    if (!isMounted.current) return;
    setLoading(true);
    try {
      const data = await loadReportsFromIDB();
      if (isMounted.current) setReports(data);
    } catch (err) {
      console.error('IndexedDB xatosi:', err);
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, []);

  // ─── Bir marta yuklash + online event ─────────────────────────────────
  useEffect(() => {
    isMounted.current = true;

    // Theme va image
    setUserImage(localStorage.getItem('userImage'));
    const savedTheme = (localStorage.getItem('theme') as 'dark' | 'light') || 'dark';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);

    // Dastlabki yuklash
    loadData();

    // ✅ Interval YO'Q — faqat online bo'lganda va custom event da yangilanadi
    const handleOnline = () => loadData();

    // Sotuv qo'shilganda tashqaridan xabar berish uchun custom event
    // Scanner.tsx da sotilgandan keyin: window.dispatchEvent(new Event('saleAdded'))
    const handleSaleAdded = () => loadData();

    window.addEventListener('online',    handleOnline);
    window.addEventListener('saleAdded', handleSaleAdded);

    return () => {
      isMounted.current = false;
      window.removeEventListener('online',    handleOnline);
      window.removeEventListener('saleAdded', handleSaleAdded);
    };
  }, [loadData]);

  // ─── Filter ───────────────────────────────────────────────────────────
  useEffect(() => {
    let filtered = [...reports];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.name?.toLowerCase().includes(q) ||
        item.barcode?.toString().includes(q)
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

    setFilteredReports(filtered);
    setTotalSum(filtered.reduce((s, i) => s + Number(i.total || 0), 0));
  }, [searchQuery, dateFilter, reports]);

  // ─── Styles ───────────────────────────────────────────────────────────
  const isDark  = theme === 'dark';
  const cardBg  = isDark
    ? 'linear-gradient(135deg,#1a1f2e 0%,#252b3d 100%)'
    : 'linear-gradient(135deg,#ffffff 0%,#f8f9ff 100%)';
  const bdr     = isDark ? '#2a3144' : '#e2e8f0';
  const subText = isDark ? '#8b92a7' : '#64748b';
  const text    = isDark ? '#e2e8f0' : '#1e293b';

  const statCard = (icon: React.ReactNode, label: string, value: React.ReactNode, color: string) => (
    <div style={{ background: cardBg, borderRadius: 16, padding: 24, border: `1px solid ${bdr}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: `${color}20`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {icon}
        </div>
        <span style={{ fontSize: 14, color: subText }}>{label}</span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color }}>{value}</div>
    </div>
  );

  return (
    <MainLayout
      theme={theme}
      userImage={userImage}
      handleImageUpload={(e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          const src = ev.target?.result as string;
          setUserImage(src);
          localStorage.setItem('userImage', src);
        };
        reader.readAsDataURL(file);
      }}
      title={t("sales")}
    >
      {/* Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: 20, marginBottom: 32,
      }}>
        {statCard(<TrendingUp size={20} color="#10b981" />, t("totalAmount"),
          `${totalSum.toLocaleString()} ${t('currencyUnit')}`, "#10b981")}
        {statCard(<FileText size={20} color="#667eea" />, t("uniqueProductsCount"),
          new Set(filteredReports.map(i => i.barcode)).size, "#667eea")}
        {statCard(<Package size={20} color="#f59e0b" />, t("soldProducts"),
          filteredReports.reduce((s, i) => s + Number(i.quantity || 0), 0), "#f59e0b")}
      </div>

      {/* Filters */}
      <div style={{ background: cardBg, borderRadius: 16, padding: 20, border: `1px solid ${bdr}`, marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: 250, position: 'relative' }}>
            <Search size={18} color={subText}
              style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder={t("searchPlaceholder")}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '90%', padding: '12px 12px 12px 40px',
                borderRadius: 12, border: 'none',
                background: isDark ? '#0f1420' : '#f8fafc',
                color: text, fontSize: 14,
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {['all', 'today', 'week', 'month'].map(f => (
              <button key={f} onClick={() => setDateFilter(f)} style={{
                padding: '10px 16px', borderRadius: 10, border: 'none',
                background: dateFilter === f
                  ? 'linear-gradient(135deg,#667eea 0%,#764ba2 100%)'
                  : (isDark ? '#0f1420' : '#f8fafc'),
                color: dateFilter === f ? '#fff' : subText,
                cursor: 'pointer', fontSize: 14, fontWeight: 500,
                transition: 'all 0.2s ease',
              }}>
                {t(f)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div style={{ background: cardBg, borderRadius: 20, padding: 24, border: `1px solid ${bdr}`, overflowX: 'auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: subText }}>
            <p style={{ fontSize: 16 }}>Yuklanmoqda...</p>
          </div>
        ) : filteredReports.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: subText }}>
            <FileText size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
            <p style={{ fontSize: 18, fontWeight: 500 }}>{t("noSales")}</p>
            <p style={{ fontSize: 14, marginTop: 8 }}>{t("changeFilters")}</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${bdr}` }}>
                {[t("products"), t("barcode"), t("quantity"), t("price"), t("total"), t("time")].map((h, i) => (
                  <th key={i} style={{
                    padding: 14,
                    textAlign: i === 0 ? 'left' : i >= 3 ? 'right' : 'center',
                    color: subText, fontWeight: 600, fontSize: 13,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredReports.map((item, idx) => (
                <tr key={idx}
                  style={{ borderBottom: `1px solid ${bdr}`, transition: 'background 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.background = isDark ? 'rgba(102,126,234,0.05)' : 'rgba(102,126,234,0.03)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: 16, fontWeight: 500 }}>{item.name}</td>
                  <td style={{ padding: 16, textAlign: 'center', color: subText }}>{item.barcode}</td>
                  <td style={{ padding: 16, textAlign: 'center', fontWeight: 600 }}>{item.quantity}</td>
                  <td style={{ padding: 16, textAlign: 'right', color: subText }}>
                    {Number(item.price).toLocaleString()} {t('currencyUnit')}
                  </td>
                  <td style={{ padding: 16, textAlign: 'right', fontWeight: 600, color: '#10b981' }}>
                    {Number(item.total).toLocaleString()} {t('currencyUnit')}
                  </td>
                  <td style={{ padding: 16, textAlign: 'right', fontSize: 13, color: subText }}>
                    {item.soldAt ? new Date(item.soldAt).toLocaleString('uz-UZ', {
                      year: 'numeric', month: '2-digit', day: '2-digit',
                      hour: '2-digit', minute: '2-digit',
                    }) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
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