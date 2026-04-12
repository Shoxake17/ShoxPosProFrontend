import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import MainLayout from "../components/layout/MainLayout";

// ✅ Professional i18next importi
import { useTranslation } from 'react-i18next';

import { getCategories, getCategoryEmoji, translateCategory, getUserShopCategoriesAsync, syncUserCategoriesToIDB } from '../components/Category';
import { Search, TrendingUp, TrendingDown, Package, DollarSign } from 'lucide-react';
import { ToastContainer, toast } from 'react-toastify';
import "react-toastify/dist/ReactToastify.css";
import axiosInstance from '../api/axiosInstance';
import { getSessionLogin } from "../utils/clientSession";
import { useCurrency } from '../context/CurrencyContext';
import {
  openDB,
  saveToIDB,
  saveAllToIDB,
  getAllFromIDB,
  fetchFromMongoDB
} from '../hooks/useProductSync';

// ─── IndexedDB yordamchi funksiyalari ──────────────────────
const PENDING_STORE = 'pendingSync';

async function addToPending(data: any, action: 'update-base-price' | 'update-quantity'): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(PENDING_STORE, 'readwrite');
    tx.objectStore(PENDING_STORE).put({ ...data, action });
  } catch { /* silent */ }
}

async function getPending(): Promise<any[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(PENDING_STORE, 'readonly');
      const req = tx.objectStore(PENDING_STORE).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  } catch { return []; }
}

async function removeFromPending(barcode: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(PENDING_STORE, 'readwrite');
    tx.objectStore(PENDING_STORE).delete(barcode);
  } catch { /* silent */ }
}

async function syncPendingToMongoDB(login: string): Promise<number> {
  if (!navigator.onLine) return 0;
  const pending = await getPending();
  let synced = 0;
  for (const item of pending) {
    try {
      let ok = false;
      if (item.action === 'update-base-price') {
        const res = await api('/api/products/update-base-price', {
          method: 'POST',
          body: JSON.stringify({ barcode: item.barcode, newBasePrice: item.basePrice, login }),
        });
        ok = res.ok;
      } else if (item.action === 'update-quantity') {
        const res = await api('/api/products/update-quantity', {
          method: 'POST',
          body: JSON.stringify({ barcode: item.barcode, newQuantity: item.quantity, login }),
        });
        ok = res.ok;
      }
      if (ok) { await removeFromPending(item.barcode); synced++; }
    } catch { /* skip */ }
  }
  return synced;
}

// ─── Tiplar ───────────────────────────────────────────────────────────────
interface Product {
  _id?: string;
  barcode: string;
  name?: string;
  basePrice: number;
  price: number;
  quantity?: number;
  category: string;
  createdAt?: string;
  login?: string;
}

interface SoldProduct {
  barcode: string;
  name?: string;
  basePrice: number;
  price: number;
  quantity: number;
  category: string;
}

export default function KirimBazasi() {
  // ✅ i18next hook (namespace: kirim, categories)
  const { t, i18n } = useTranslation(['kirim', 'categories', 'common']);
  const { currency, convert, format } = useCurrency();
  const navigate = useNavigate();

  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [soldProducts, setSoldProducts] = useState<SoldProduct[]>([]);
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [userImage, setUserImage] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const [userCategories, setUserCategories] = useState<string[]>([]);

  const login = getSessionLogin();

  // Kategoriyalarni yuklash
  useEffect(() => {
    const refreshData = async () => {
      if (!login) return;
      const idbCats = await getUserShopCategoriesAsync(login);
      if (idbCats.length > 0) {
        setUserCategories(idbCats);
      }
      if (idbCats.length === 0 && navigator.onLine) {
        try {
          const res = await axiosInstance.get("/me");
          if (res.data.success) {
            const freshUser = res.data.user;
            setUserCategories(freshUser.shopCategories || []);
            syncUserCategoriesToIDB(freshUser.login, freshUser.shopCategories);
          }
        } catch (err) { console.error(err); }
      }
    };
    refreshData();
  }, [login]);

  const categories = getCategories(i18n.language, userCategories);

  useEffect(() => {
    if (!login) navigate("/login", { replace: true });
  }, [login, navigate]);

  // Online/Offline listener
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      setSyncing(true);
      const count = await syncPendingToMongoDB(login!);
      if (count > 0) toast.success(`✅ ${t('kirim:changesSynced', { count })}`);
      setSyncing(false);
    };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [login, t]);

  // Mahsulotlarni yuklash
  const loadProducts = useCallback(async () => {
    if (!login) return;
    setLoading(true);
    try {
      const idbProducts = await getAllFromIDB(login);
      if (idbProducts.length > 0) {
        const normalized = idbProducts.map(p => ({ ...p, basePrice: p.basePrice || 0 }));
        setProducts(normalized);
        setFilteredProducts(normalized);
        if (navigator.onLine) syncFromMongoDB(login, idbProducts);
      } else if (navigator.onLine) {
        await syncFromMongoDB(login, []);
      }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, [login]);

  const syncFromMongoDB = async (userLogin: string, existingIdb: any[]) => {
    try {
      const mongoProducts = await fetchFromMongoDB(userLogin);
      if (mongoProducts.length === 0) return;
      const normalized = mongoProducts.map((p: any) => ({ ...p, basePrice: p.basePrice || 0, login: userLogin }));
      await saveAllToIDB(normalized);
      if (existingIdb.length === 0) {
        setProducts(normalized);
        setFilteredProducts(normalized);
      }
    } catch (err) { console.error(err); }
  };

  const fetchSoldProducts = async () => {
    if (!navigator.onLine || !login) return;
    try {
      const res = await api(`/api/sales/${login}`);
      if (res.ok) {
        const data = await res.json();
        setSoldProducts(Array.isArray(data) ? data : []);
      }
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    const savedImage = localStorage.getItem('userImage');
    if (savedImage) setUserImage(savedImage);
    loadProducts();
    fetchSoldProducts();
  }, [login, loadProducts]);

  // Filter mantiqi
  useEffect(() => {
    let filtered = products;
    if (searchText.trim()) {
      const lower = searchText.toLowerCase();
      filtered = filtered.filter(p =>
        p.barcode.toLowerCase().includes(lower) || (p.name && p.name.toLowerCase().includes(lower))
      );
    }
    if (selectedCategory) {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }
    setFilteredProducts(filtered);
  }, [searchText, selectedCategory, products]);

  // Narxni yangilash
  const updateBasePrice = async (barcode: string, newBasePrice: number) => {
    if (newBasePrice < 0) return;
    const updated = products.map(p => p.barcode === barcode ? { ...p, basePrice: newBasePrice } : p);
    setProducts(updated);
    const product = products.find(p => p.barcode === barcode);
    if (product) await saveToIDB({ ...product, basePrice: newBasePrice, login });

    if (navigator.onLine) {
      try {
        const res = await api('/api/products/update-base-price', {
          method: 'POST',
          body: JSON.stringify({ barcode, newBasePrice, login }),
        });
        if (res.ok) toast.success(t('kirim:priceUpdated'));
        else await addToPending({ barcode, basePrice: newBasePrice, login }, 'update-base-price');
      } catch { await addToPending({ barcode, basePrice: newBasePrice, login }, 'update-base-price'); }
    } else {
      await addToPending({ barcode, basePrice: newBasePrice, login }, 'update-base-price');
      toast.info(t('kirim:savedOffline'));
    }
  };

  // Miqdor yangilash
  const updateQuantity = async (barcode: string, newQuantity: number) => {
    if (newQuantity < 0) return;
    const updated = products.map(p => p.barcode === barcode ? { ...p, quantity: newQuantity } : p);
    setProducts(updated);
    const product = products.find(p => p.barcode === barcode);
    if (product) await saveToIDB({ ...product, quantity: newQuantity, login });

    if (navigator.onLine) {
      try {
        const res = await api('/api/products/update-quantity', {
          method: 'POST',
          body: JSON.stringify({ barcode, newQuantity, login }),
        });
        if (res.ok) toast.success(t('kirim:quantityUpdated'));
        else await addToPending({ barcode, quantity: newQuantity, login }, 'update-quantity');
      } catch { await addToPending({ barcode, quantity: newQuantity, login }, 'update-quantity'); }
    } else {
      await addToPending({ barcode, quantity: newQuantity, login }, 'update-quantity');
      toast.info(t('kirim:savedOffline'));
    }
  };

  // Statistika hisoblari
  const totalChiqim = soldProducts.reduce((sum, item) => sum + (item.basePrice || 0) * (item.quantity || 1), 0);
  const totalKirim = soldProducts.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0);
  const totalDaromad = totalKirim - totalChiqim;
  const totalIncomingQuantity = soldProducts.reduce((sum, item) => sum + (item.quantity || 1), 0);

  const theme = (localStorage.getItem('theme') as any) || 'dark';

  return (
    <MainLayout theme={theme} userImage={userImage} title={t('kirim:title')}>
      
      <div className="filters-container">
        <div className="search-box">
          <Search className="search-icon" size={20} />
          <input
            type="text"
            placeholder={t('kirim:barcodeOrName')}
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
          />
        </div>
        <select
          className="category-select"
          value={selectedCategory}
          onChange={e => setSelectedCategory(e.target.value)}
        >
          {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '32px', marginTop: '24px' }}>
        {[
          { icon: <TrendingUp size={20} color="#10b981" />,   label: t('kirim:totalIncoming'),   value: totalKirim,             color: '#10b981' },
          { icon: <TrendingDown size={20} color="#ef4444" />, label: t('kirim:totalOutgoing'),  value: totalChiqim,            color: '#ef4444' },
          { icon: <DollarSign size={20} color={totalDaromad >= 0 ? '#22c55e' : '#ef4444'} />, label: t('kirim:income'), value: totalDaromad, color: totalDaromad >= 0 ? '#22c55e' : '#ef4444' },
          { icon: <Package size={20} color="#f59e0b" />,      label: t('kirim:soldQuantity'), value: totalIncomingQuantity, color: '#f59e0b', noUnit: true },
        ].map((card, i) => (
          <div key={i} style={{ background: theme === 'dark' ? 'linear-gradient(135deg, #1a1f2e 0%, #252b3d 100%)' : '#fff', borderRadius: '16px', padding: '24px', border: `1px solid ${theme === 'dark' ? '#2a3144' : '#e2e8f0'}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              {card.icon}
              <span style={{ fontSize: '14px', color: theme === 'dark' ? '#8b92a7' : '#64748b' }}>{card.label}</span>
            </div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: card.color }}>
              {card.noUnit ? card.value.toLocaleString() : format(Number(card.value))}
            </div>
          </div>
        ))}
      </div>

      <div className="table-card">
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>{t('kirim:n')}</th>
                <th>{t('kirim:barcode')}</th>
                <th>{t('kirim:productName')}</th>
                <th>{t('kirim:exitPrice')}</th>
                <th>{t('kirim:quantity')}</th>
                <th>{t('kirim:totalOutgoingSum')}</th>
                <th>{t('kirim:category')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="empty-state">{t('kirim:loadingTable')}</td></tr>  
              ) : filteredProducts.length === 0 ? (
                <tr><td colSpan={7} className="empty-state">{t('kirim:noData')}</td></tr>
              ) : (
                filteredProducts.map((p, i) => (
                  <tr key={p.barcode}>
                    <td className="text-center">{i + 1}</td>
                    <td className="barcode-cell">{p.barcode}</td>
                    <td className="name-cell">{p.name || '-'}</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <input
                          type="number" className="table-input"
                          step={currency === 'UZS' ? '1' : '0.01'}
                          value={convert(p.basePrice, 'UZS', currency).toFixed(currency === 'UZS' ? 0 : 2)}
                          onChange={e => {
                            const val = Number(e.target.value);
                            const inUZS = convert(val, currency, 'UZS');
                            updateBasePrice(p.barcode, inUZS);
                          }}
                        />
                        {currency !== 'UZS' && (
                          <span style={{ fontSize: '10px', color: '#64748b' }}>
                            {p.basePrice.toLocaleString()} so'm
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <input
                        type="number" className="table-input" min="0"
                        value={p.quantity || 0}
                        onChange={e => updateQuantity(p.barcode, Number(e.target.value))}
                      />
                    </td>
                    <td style={{ fontWeight: 700 }}>
                      {format(p.basePrice * (p.quantity || 1))}
                    </td>
                    <td>
                      <span className="category-badge">
                        {getCategoryEmoji(p.category)} {t(`${p.category}`)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ToastContainer theme={theme === 'dark' ? 'dark' : 'light'} />

      <style>{`
        .filters-container { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; margin-bottom: 24px; }
        .search-box { position: relative; display: flex; align-items: center; }
        .search-icon { position: absolute; left: 16px; color: #64748b; pointer-events: none; }
        .search-box input, .category-select {
          width: 100%; padding: 14px 14px 14px 48px; border-radius: 14px;
          border: 1px solid ${theme === 'dark' ? '#1e293b' : '#e2e8f0'};
          background: ${theme === 'dark' ? '#111827' : '#fff'};
          color: ${theme === 'dark' ? '#fff' : '#1a1f2e'}; font-size: 15px;
        }
        .category-select { padding-left: 16px; cursor: pointer; }
        .table-card { background: ${theme === 'dark' ? '#111827' : '#fff'}; border-radius: 20px; border: 1px solid ${theme === 'dark' ? '#1e293b' : '#f1f5f9'}; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
        .table-responsive { overflow-x: auto; }
        table { width: 100%; border-collapse: collapse; min-width: 900px; }
        th { background: ${theme === 'dark' ? '#1e293b' : '#f8fafc'}; padding: 16px; text-align: left; font-size: 13px; color: #64748b; text-transform: uppercase; font-weight: 600; }
        td { padding: 16px; border-bottom: 1px solid ${theme === 'dark' ? '#1e293b' : '#f1f5f9'}; color: ${theme === 'dark' ? '#e2e8f0' : '#334155'}; }
        .barcode-cell { font-family: monospace; color: #4f46e5; font-weight: 600; }
        .name-cell { font-weight: 500; }
        .table-input { width: 100px; padding: 8px; border-radius: 8px; border: 1px solid ${theme === 'dark' ? '#334155' : '#ddd'}; text-align: center; background: transparent; color: inherit; }
        .category-badge { background: #4f46e515; color: #4f46e5; padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 600; }
        .text-center { text-align: center; }
        .empty-state { text-align: center; padding: 60px; color: #64748b; }
      `}</style>
    </MainLayout>
  );
}