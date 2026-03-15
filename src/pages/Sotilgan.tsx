// Yangilangan Sotilgan.tsx fayli
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp, FileText, Package, Download, Search, Filter
} from 'lucide-react';
import MainLayout from "../components/MainLayout";
import { useTranslation, TranslationProvider } from '../components/languages/Sotilgan';

let reportsDB: IDBDatabase | null = null;

function ReportsContent() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [reports, setReports] = useState<any[]>([]);
  const [filteredReports, setFilteredReports] = useState<any[]>([]);
  const [totalSum, setTotalSum] = useState(0);
  const [userImage, setUserImage] = useState<string | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [loading, setLoading] = useState(true);

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

    // Real-time yangilanish uchun har 2 soniyada tekshirish
    const interval = setInterval(() => {
      if (isSubscribed) {
        init();
      }
    }, 2000);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    filterReports();
  }, [searchQuery, dateFilter, reports]);

  const openReportsDB = () => {
    return new Promise<void>((resolve, reject) => {
      const req = indexedDB.open("ShoxPosReports", 2);
      req.onupgradeneeded = (e: any) => {
        reportsDB = e.target.result;
        if (!reportsDB.objectStoreNames.contains("reports")) {
          reportsDB.createObjectStore("reports", { keyPath: "id", autoIncrement: true });
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
        } else {
          resolve(arr);
        }
      };
      req.onerror = () => reject(req.error);
    });
  };

  const init = async () => {
    setLoading(true);

    try {
      await openReportsDB();
      const idbReports = await loadReportsFromIndexedDB();
      setReports(idbReports);
    } catch (err) {
      console.error('IndexedDB xatosi:', err);
    } finally {
      setLoading(false);
    }
  };

  const filterReports = () => {
    let filtered = [...reports];

    if (searchQuery) {
      filtered = filtered.filter(item =>
        item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.barcode?.toString().includes(searchQuery)
      );
    }

    if (dateFilter !== 'all') {
      const now = new Date();
      filtered = filtered.filter(item => {
        if (!item.soldAt) return false;
        const soldDate = new Date(item.soldAt);
        if (dateFilter === 'today') {
          return soldDate.toDateString() === now.toDateString();
        } else if (dateFilter === 'week') {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return soldDate >= weekAgo;
        } else if (dateFilter === 'month') {
          return soldDate.getMonth() === now.getMonth() &&
                 soldDate.getFullYear() === now.getFullYear();
        }
        return true;
      });
    }

    setFilteredReports(filtered);
    const filteredTotal = filtered.reduce((sum, item) => sum + Number(item.total || 0), 0);
    setTotalSum(filteredTotal);
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imgSrc = e.target?.result as string;
        setUserImage(imgSrc);
        localStorage.setItem('userImage', imgSrc);
      };
      reader.readAsDataURL(file);
    }
  };



  return (
    <MainLayout
      theme={theme}
      userImage={userImage}
      handleImageUpload={handleImageUpload}
      title={t("sales")}
    >
      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '20px',
        marginBottom: '32px'
      }}>
        <div style={{
          background: theme === 'dark'
            ? 'linear-gradient(135deg, #1a1f2e 0%, #252b3d 100%)'
            : 'linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%)',
          borderRadius: '16px',
          padding: '24px',
          border: `1px solid ${theme === 'dark' ? '#2a3144' : '#e2e8f0'}`
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'rgba(16, 185, 129, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <TrendingUp size={20} color="#10b981" />
            </div>
            <span style={{ fontSize: '14px', color: theme === 'dark' ? '#8b92a7' : '#64748b' }}>
              {t("totalAmount")}
            </span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#10b981' }}>
            {totalSum.toLocaleString()} {t('currencyUnit')}
          </div>
        </div>

        <div style={{
          background: theme === 'dark'
            ? 'linear-gradient(135deg, #1a1f2e 0%, #252b3d 100%)'
            : 'linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%)',
          borderRadius: '16px',
          padding: '24px',
          border: `1px solid ${theme === 'dark' ? '#2a3144' : '#e2e8f0'}`
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'rgba(102, 126, 234, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FileText size={20} color="#667eea" />
            </div>
            <span style={{ fontSize: '14px', color: theme === 'dark' ? '#8b92a7' : '#64748b' }}>
              {t("uniqueProductsCount")}
            </span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#667eea' }}>
            {new Set(filteredReports.map(item => item.barcode)).size}
          </div>
        </div>

        <div style={{
          background: theme === 'dark'
            ? 'linear-gradient(135deg, #1a1f2e 0%, #252b3d 100%)'
            : 'linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%)',
          borderRadius: '16px',
          padding: '24px',
          border: `1px solid ${theme === 'dark' ? '#2a3144' : '#e2e8f0'}`
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'rgba(245, 158, 11, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Package size={20} color="#f59e0b" />
            </div>
            <span style={{ fontSize: '14px', color: theme === 'dark' ? '#8b92a7' : '#64748b' }}>
              {t("soldProducts")}
            </span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#f59e0b' }}>
            {filteredReports.reduce((sum, item) => sum + Number(item.quantity || 0), 0)}
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div style={{
        background: theme === 'dark'
          ? 'linear-gradient(135deg, #1a1f2e 0%, #252b3d 100%)'
          : 'linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%)',
        borderRadius: '16px',
        padding: '20px',
        border: `1px solid ${theme === 'dark' ? '#2a3144' : '#e2e8f0'}`,
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: '250px', position: 'relative' }}>
            <Search
              size={18}
              color={theme === 'dark' ? '#8b92a7' : '#64748b'}
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
            />
            <input
              type="text"
              placeholder={t("searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '90%',
                padding: '12px 12px 12px 40px',
                borderRadius: '12px',
                border: 'none',
                background: theme === 'dark' ? '#0f1420' : '#f8fafc',
                color: theme === 'dark' ? '#e2e8f0' : '#1e293b',
                fontSize: '14px'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {['all', 'today', 'week', 'month'].map(filter => (
              <button
                key={filter}
                onClick={() => setDateFilter(filter)}
                style={{
                  padding: '10px 16px',
                  borderRadius: '10px',
                  border: 'none',
                  background: dateFilter === filter
                    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                    : theme === 'dark' ? '#0f1420' : '#f8fafc',
                  color: dateFilter === filter ? '#fff' : (theme === 'dark' ? '#8b92a7' : '#64748b'),
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                  transition: 'all 0.2s ease'
                }}
              >
                {t(filter)}
              </button>
            ))}
          </div>

          
        </div>
      </div>

      {/* Reports Table */}
      <div style={{
        background: theme === 'dark'
          ? 'linear-gradient(135deg, #1a1f2e 0%, #252b3d 100%)'
          : 'linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%)',
        borderRadius: '20px',
        padding: '24px',
        border: `1px solid ${theme === 'dark' ? '#2a3144' : '#e2e8f0'}`,
        overflowX: 'auto'
      }}>
        {filteredReports.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: theme === 'dark' ? '#8b92a7' : '#64748b'
          }}>
            <FileText size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
            <p style={{ fontSize: '18px', fontWeight: 500 }}>{t("noSales")}</p>
            <p style={{ fontSize: '14px', marginTop: '8px' }}>{t("changeFilters")}</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${theme === 'dark' ? '#2a3144' : '#e2e8f0'}` }}>
                <th style={{ padding: '14px', textAlign: 'left', color: theme === 'dark' ? '#8b92a7' : '#64748b', fontWeight: 600, fontSize: '13px' }}>{t("products")}</th>
                <th style={{ padding: '14px', textAlign: 'center', color: theme === 'dark' ? '#8b92a7' : '#64748b', fontWeight: 600, fontSize: '13px' }}>{t("barcode")}</th>
                <th style={{ padding: '14px', textAlign: 'center', color: theme === 'dark' ? '#8b92a7' : '#64748b', fontWeight: 600, fontSize: '13px' }}>{t("quantity")}</th>
                <th style={{ padding: '14px', textAlign: 'right', color: theme === 'dark' ? '#8b92a7' : '#64748b', fontWeight: 600, fontSize: '13px' }}>{t("price")}</th>
                <th style={{ padding: '14px', textAlign: 'right', color: theme === 'dark' ? '#8b92a7' : '#64748b', fontWeight: 600, fontSize: '13px' }}>{t("total")}</th>
                <th style={{ padding: '14px', textAlign: 'right', color: theme === 'dark' ? '#8b92a7' : '#64748b', fontWeight: 600, fontSize: '13px' }}>{t("time")}</th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.map((item, index) => (
                <tr
                  key={index}
                  style={{
                    borderBottom: `1px solid ${theme === 'dark' ? '#2a3144' : '#e2e8f0'}`,
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = theme === 'dark' ? 'rgba(102, 126, 234, 0.05)' : 'rgba(102, 126, 234, 0.03)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <td style={{ padding: '16px', fontWeight: 500 }}>{item.name}</td>
                  <td style={{ padding: '16px', textAlign: 'center', color: theme === 'dark' ? '#8b92a7' : '#64748b' }}>{item.barcode}</td>
                  <td style={{ padding: '16px', textAlign: 'center', fontWeight: 600 }}>{item.quantity}</td>
                  <td style={{ padding: '16px', textAlign: 'right', color: theme === 'dark' ? '#8b92a7' : '#64748b' }}>
                    {Number(item.price).toLocaleString()} {t('currencyUnit')}
                  </td>
                  <td style={{ padding: '16px', textAlign: 'right', fontWeight: 600, color: '#10b981' }}>
                    {Number(item.total).toLocaleString()} {t('currencyUnit')}
                  </td>
                  <td style={{ padding: '16px', textAlign: 'right', fontSize: '13px', color: theme === 'dark' ? '#8b92a7' : '#64748b' }}>
                    {item.soldAt ? new Date(item.soldAt).toLocaleString('uz-UZ', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
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