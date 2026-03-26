import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/MainLayout';
import { Search, Trash2, RefreshCw } from 'lucide-react';
import { useTranslation } from '../components/languages/MaxsulotBazasi';
import { getCategories, getCategoryEmoji, translateCategory } from '../components/Category';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import {
  loadProductsOfflineFirst,
  deleteProductOfflineFirst,
  saveToIDB,
  syncPendingToMongoDB,
  fetchFromMongoDB,
} from '../hooks/useProductSync';

interface Product {
  _id?: string;
  barcode: string;
  name?: string;
  price: number;
  basePrice?: number;
  quantity?: number;
  category: string;
  login?: string;
}

export default function MaxsulotBazasi() {
  const navigate = useNavigate();
  const { t, language } = useTranslation();

  const [products, setProducts] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [userImage] = useState<string | null>(localStorage.getItem('userImage'));
  const [theme] = useState<'dark' | 'light'>((localStorage.getItem('theme') as any) || 'dark');
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);

  const user = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
  const login = user?.login || localStorage.getItem('login');

  const categoryOptions = getCategories(language);

  // ─── Mahsulotlarni yuklash ────────────────────────────────────────────
  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await loadProductsOfflineFirst(login);
      setAllProducts(data);
      setProducts(data);
    } catch (err) {
      console.error('❌ Yuklash xatosi:', err);
    } finally {
      setLoading(false);
    }
  }, [login]);

  useEffect(() => {
    if (!user || !user.login) { navigate('/'); return; }
    loadProducts();
  }, [login]);

  // ─── Online/Offline listener ──────────────────────────────────────────
  useEffect(() => {
    const handleOnline = async () => {
      setSyncing(true);
      const count = await syncPendingToMongoDB();
      if (count > 0) {
        toast.success(`${count} ta mahsulot yuklandi`, {
          position: 'top-right', autoClose: 4000,
          theme: theme === 'dark' ? 'dark' : 'light',
        });
      }
      await loadProducts();
      setSyncing(false);
    };
    const handleOffline = () => {
      toast.warning("Internet uzildi — offline rejimda ishlayapti", {
        position: 'top-right', autoClose: 3000,
        theme: theme === 'dark' ? 'dark' : 'light',
      });
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [loadProducts]);

  // ─── Filter ───────────────────────────────────────────────────────────
  const applyFilter = (text: string, category: string, source: Product[]) => {
    const q = text.trim().toLowerCase();
    let filtered = source;
    if (q) {
      filtered = filtered.filter(p =>
        p.barcode.toLowerCase().includes(q) ||
        (p.name && p.name.toLowerCase().includes(q))
      );
    }
    if (category) filtered = filtered.filter(p => p.category === category);
    return filtered;
  };

  const handleSearch = async (text: string, category: string) => {
    const localResult = applyFilter(text, category, allProducts);
    setProducts(localResult);
    if (navigator.onLine && text.trim() && localResult.length === 0) {
      try {
        const globalRes = await fetch(`/api/products/search?q=${encodeURIComponent(text.trim())}`);
        if (globalRes.ok) {
          let globalData: Product[] = await globalRes.json();
          if (category) globalData = globalData.filter(p => p.category === category);
          setProducts(globalData);
        }
      } catch {}
    }
  };

  // ─── Narx yangilash ───────────────────────────────────────────────────
  const updatePrice = async (barcode: string, newPrice: number) => {
    const updated = allProducts.map(p => p.barcode === barcode ? { ...p, price: newPrice } : p);
    setAllProducts(updated);
    setProducts(applyFilter(searchText, selectedCategory, updated));
    const product = allProducts.find(p => p.barcode === barcode);
    if (product) await saveToIDB({ ...product, price: newPrice, login });
    if (navigator.onLine) {
      fetch('/api/update-price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barcode, newPrice, login }),
      }).catch(console.error);
    } else {
      toast.info("Offline saqlandi", {
        position: 'top-right', autoClose: 3000,
        theme: theme === 'dark' ? 'dark' : 'light',
      });
    }
  };

  // ─── Mahsulot o'chirish ───────────────────────────────────────────────
  const deleteProduct = async (barcode: string) => {
    if (!confirm(t('deleteConfirm'))) return;
    try {
      await deleteProductOfflineFirst(barcode, login);
      const updated = allProducts.filter(p => p.barcode !== barcode);
      setAllProducts(updated);
      setProducts(applyFilter(searchText, selectedCategory, updated));
      toast.success("Mahsulot o'chirildi", {
        position: 'top-right', autoClose: 3000,
        theme: theme === 'dark' ? 'dark' : 'light',
      });
    } catch (err) {
      toast.error("O'chirishda xato yuz berdi", {
        position: 'top-right', autoClose: 3000,
        theme: theme === 'dark' ? 'dark' : 'light',
      });
    }
  };

  // ─── Qo'lda sync ──────────────────────────────────────────────────────
  const manualSync = async () => {
    if (!navigator.onLine) {
      toast.warning("Tarmoqdan uzilgan", {
        position: 'top-right', autoClose: 3000,
        theme: theme === 'dark' ? 'dark' : 'light',
      });
      return;
    }
    setSyncing(true);
    const count = await syncPendingToMongoDB();
    const mongoProducts = await fetchFromMongoDB(login);
    for (const p of mongoProducts) await saveToIDB({ ...p, login });
    await loadProducts();
    setSyncing(false);
    toast.success(count > 0 ? `${count} ta sync bo'ldi` : "Barcha mahsulot saqlandi", {
      position: 'top-right', autoClose: 4000,
      theme: theme === 'dark' ? 'dark' : 'light',
    });
  };

  return (
    <MainLayout
      theme={theme}
      userImage={userImage}
      title={t('productsDatabase')}
    >
      {/* ── Filter ── */}
      <div className="filters-container">
        <div className="search-box">
          <Search className="search-icon" size={20} />
          <input
            type="text"
            placeholder={t('searchPlaceholder')}
            value={searchText}
            onChange={e => {
              setSearchText(e.target.value);
              handleSearch(e.target.value, selectedCategory);
            }}
          />
        </div>
        <select
          className="category-select"
          value={selectedCategory}
          onChange={e => {
            setSelectedCategory(e.target.value);
            handleSearch(searchText, e.target.value);
          }}
        >
          {categoryOptions.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>

      {/* ── Jadval ── */}
      <div className="table-card">
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                {[t('number'), t('barcode'), t('productName'), t('price'), t('quantity'), t('category'), t('actions')].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="empty-state">Sahifa Yuklanmoqda...</td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan={7} className="empty-state">{t('noData')}</td></tr>
              ) : (
                products.map((p, i) => {
                  const qty = p.quantity ?? 0;
                  const isOut  = qty === 0;
                  const isWarn = qty > 0 && qty <= 5;
                  const isCaut = qty > 5 && qty <= 10;
                  return (
                    <tr key={p._id || p.barcode} style={{
                      background: isOut
                        ? (theme === 'dark' ? 'rgba(239,68,68,0.06)' : '#fff5f5')
                        : isWarn
                        ? (theme === 'dark' ? 'rgba(249,115,22,0.04)' : '#fff7ed')
                        : 'transparent',
                    }}>
                      <td className="text-center">{i + 1}</td>
                      <td className="barcode-cell">{p.barcode}</td>
                      <td className="name-cell">{p.name || '-'}</td>
                      <td>
                        <input
                          type="number"
                          className="table-input"
                          value={p.price}
                          onChange={e => updatePrice(p.barcode, Number(e.target.value))}
                        />
                      </td>
                      <td className="text-center font-medium">
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          color: isOut ? '#ef4444' : isWarn ? '#f97316' : isCaut ? '#f59e0b' : 'inherit',
                          fontWeight: isOut || isWarn ? 700 : 600,
                        }}>
                          {isOut && <span></span>}
                          {isWarn && !isOut && <span></span>}
                          {isCaut && <span></span>}
                          {qty}
                        </span>
                      </td>
                      <td>
                        <span className="category-badge">
                          {getCategoryEmoji(p.category)} {translateCategory(p.category, language)}
                        </span>
                      </td>
                      <td className="text-center">
                        <button className="delete-btn" onClick={() => deleteProduct(p.barcode)}>
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ToastContainer theme={theme === 'dark' ? 'dark' : 'light'} />

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .filters-container { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; margin-bottom: 24px; }
        .search-box { position: relative; display: flex; align-items: center; }
        .search-icon { position: absolute; left: 16px; color: #64748b; pointer-events: none; }
        .search-box input {
          width: 100%; padding: 14px 14px 14px 48px; border-radius: 14px;
          border: 1px solid ${theme === 'dark' ? '#1e293b' : '#e2e8f0'};
          background: ${theme === 'dark' ? '#111827' : '#fff'};
          color: ${theme === 'dark' ? '#fff' : '#1a1f2e'}; font-size: 15px;
        }
        .category-select {
          width: 100%; padding: 14px 16px; border-radius: 14px; cursor: pointer;
          border: 1px solid ${theme === 'dark' ? '#1e293b' : '#e2e8f0'};
          background: ${theme === 'dark' ? '#111827' : '#fff'};
          color: ${theme === 'dark' ? '#fff' : '#1a1f2e'}; font-size: 15px;
        }
        .table-card {
          background: ${theme === 'dark' ? '#111827' : '#fff'};
          border-radius: 20px; border: 1px solid ${theme === 'dark' ? '#1e293b' : '#f1f5f9'};
          overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }
        .table-responsive { overflow-x: auto; }
        table { width: 100%; border-collapse: collapse; min-width: 900px; }
        th {
          background: ${theme === 'dark' ? '#1e293b' : '#f8fafc'};
          padding: 16px; text-align: left; font-size: 13px;
          color: #64748b; text-transform: uppercase; font-weight: 600;
        }
        td {
          padding: 16px; border-bottom: 1px solid ${theme === 'dark' ? '#1e293b' : '#f1f5f9'};
          color: ${theme === 'dark' ? '#e2e8f0' : '#334155'};
        }
        .barcode-cell { font-family: monospace; color: #4f46e5; font-weight: 600; }
        .name-cell { font-weight: 500; }
        .table-input {
          width: 100px; padding: 8px; border-radius: 8px;
          border: 1px solid ${theme === 'dark' ? '#334155' : '#ddd'};
          text-align: center; background: transparent; color: inherit;
        }
        .category-badge {
          background: #4f46e515; color: #4f46e5;
          padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 600;
        }
        .delete-btn { background: #ef444415; color: #ef4444; border: none; padding: 10px; border-radius: 10px; cursor: pointer; }
        .text-center { text-align: center; }
        .empty-state { text-align: center; padding: 60px; color: #64748b; }
        .font-medium { font-weight: 600; }
      `}</style>
    </MainLayout>
  );
}