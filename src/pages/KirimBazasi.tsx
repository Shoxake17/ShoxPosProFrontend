import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from "../components/MainLayout";
import { useTranslation, TranslationProvider } from '../components/languages/KirimBazasi';
import { getCategories, getCategoryEmoji, translateCategory } from '../components/Category';
import { Search, TrendingUp, TrendingDown, Package, DollarSign, RefreshCw } from 'lucide-react';
import { ToastContainer, toast } from 'react-toastify';
import "react-toastify/dist/ReactToastify.css";

// ─── IndexedDB yordamchi funksiyalari ─────────────────────────────────────
const IDB_NAME = 'ShoxPosDB';
const IDB_VERSION = 5;
const PRODUCTS_STORE = 'products';
const PENDING_STORE = 'pendingSync';

function openShoxPosDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = (e: any) => {
      const db: IDBDatabase = e.target.result;
      if (!db.objectStoreNames.contains(PRODUCTS_STORE)) {
        db.createObjectStore(PRODUCTS_STORE, { keyPath: 'barcode' });
      }
      if (!db.objectStoreNames.contains(PENDING_STORE)) {
        db.createObjectStore(PENDING_STORE, { keyPath: 'barcode' });
      }
    };
    req.onsuccess = (e: any) => resolve(e.target.result);
    req.onerror = () => reject(req.error);
  });
}

async function getAllFromIDB(login: string): Promise<any[]> {
  try {
    const db = await openShoxPosDB();
    return new Promise((resolve) => {
      const tx = db.transaction(PRODUCTS_STORE, 'readonly');
      const req = tx.objectStore(PRODUCTS_STORE).getAll();
      req.onsuccess = () => resolve((req.result || []).filter((p: any) => p.login === login));
      req.onerror = () => resolve([]);
    });
  } catch { return []; }
}

async function saveToIDB(product: any): Promise<void> {
  try {
    const db = await openShoxPosDB();
    return new Promise((resolve) => {
      const tx = db.transaction(PRODUCTS_STORE, 'readwrite');
      tx.objectStore(PRODUCTS_STORE).put({ ...product, updatedAt: new Date().toISOString() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch { /* silent */ }
}

async function addToPending(data: any, action: 'update-base-price' | 'update-quantity'): Promise<void> {
  try {
    const db = await openShoxPosDB();
    return new Promise((resolve) => {
      const tx = db.transaction(PENDING_STORE, 'readwrite');
      tx.objectStore(PENDING_STORE).put({ ...data, action });
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch { /* silent */ }
}

async function getPending(): Promise<any[]> {
  try {
    const db = await openShoxPosDB();
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
    const db = await openShoxPosDB();
    return new Promise((resolve) => {
      const tx = db.transaction(PENDING_STORE, 'readwrite');
      tx.objectStore(PENDING_STORE).delete(barcode);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
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
        const res = await fetch('/api/products/update-base-price', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ barcode: item.barcode, newBasePrice: item.basePrice, login }),
        });
        ok = res.ok;
      } else if (item.action === 'update-quantity') {
        const res = await fetch('/api/products/update-quantity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ barcode: item.barcode, newQuantity: item.quantity, login }),
        });
        ok = res.ok;
      }
      if (ok) { await removeFromPending(item.barcode); synced++; }
    } catch { /* davom etamiz */ }
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

// ─── Asosiy komponent ─────────────────────────────────────────────────────
function KirimBazasiContent() {
  const { t, language } = useTranslation();
  const navigate = useNavigate();

  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [soldProducts, setSoldProducts] = useState<SoldProduct[]>([]);
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [userImage, setUserImage] = useState<string | null>(null);
  const [theme] = useState<'dark' | 'light'>((localStorage.getItem('theme') as any) || 'dark');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const [idbCount, setIdbCount] = useState(0);

  const categories = getCategories(language);

  const currentLogin = localStorage.getItem('currentLogin');
  useEffect(() => {
    if (!currentLogin) navigate('/login', { replace: true });
  }, [currentLogin, navigate]);
  if (!currentLogin) return null;
  const login = currentLogin;

  // ─── Online/Offline listener ──────────────────────────────────────────
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      setSyncing(true);
      const count = await syncPendingToMongoDB(login);
      if (count > 0) toast.success(`✅ ${t('ozgarishSyncBoldi', { count: String(count) })}`);
      setSyncing(false);
    };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    if (navigator.onLine) syncPendingToMongoDB(login);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [login]);

  // ─── Mahsulotlarni yuklash (offline-first) ────────────────────────────
  useEffect(() => {
    const savedImage = localStorage.getItem('userImage');
    if (savedImage) setUserImage(savedImage);
    loadProducts();
    fetchSoldProducts();
  }, [login]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const idbProducts = await getAllFromIDB(login);
      setIdbCount(idbProducts.length);

      if (idbProducts.length > 0) {
        const normalized = idbProducts.map(p => ({ ...p, basePrice: p.basePrice || 0 }));
        setProducts(normalized);
        setFilteredProducts(normalized);
        if (navigator.onLine) syncFromMongoDB(idbProducts);
      } else if (navigator.onLine) {
        await syncFromMongoDB([]);
      }
    } catch (err) {
      console.error('Yuklash xatosi:', err);
    } finally {
      setLoading(false);
    }
  };

  const syncFromMongoDB = async (existingIdb: any[]) => {
    try {
      const res = await fetch(`/api/products/user-products/${login}`);
      if (!res.ok) return;
      const data = await res.json();
      if (!Array.isArray(data)) return;

      const normalized = data.map((p: any) => ({ ...p, basePrice: p.basePrice || 0, login }));

      const idbBarcodes = new Set(existingIdb.map((p: any) => p.barcode));
      for (const p of normalized) {
        if (!idbBarcodes.has(p.barcode)) await saveToIDB(p);
      }

      if (existingIdb.length === 0) {
        setProducts(normalized);
        setFilteredProducts(normalized);
        setIdbCount(normalized.length);
      }
    } catch (err) {
      console.error('MongoDB sync xatosi:', err);
    }
  };

  const fetchSoldProducts = async () => {
    if (!navigator.onLine) return;
    try {
      const res = await fetch(`/api/sales/${login}`);
      if (res.ok) {
        const data = await res.json();
        setSoldProducts(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Sotilgan mahsulotlarni yuklashda xato:', err);
    }
  };

  // ─── Filter ───────────────────────────────────────────────────────────
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

  // ─── Ulgurji narx yangilash (offline-first) ───────────────────────────
  const updateBasePrice = async (barcode: string, newBasePrice: number) => {
    if (newBasePrice < 0) return;

    const updated = products.map(p => p.barcode === barcode ? { ...p, basePrice: newBasePrice } : p);
    setProducts(updated);

    const product = products.find(p => p.barcode === barcode);
    if (product) await saveToIDB({ ...product, basePrice: newBasePrice, login });

    if (navigator.onLine) {
      try {
        const res = await fetch('/api/products/update-base-price', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ barcode, newBasePrice, login }),
        });
        if (res.ok) toast.success(t('narxYangilandi'));       // ✅ to'g'ri kalit
        else await addToPending({ barcode, basePrice: newBasePrice, login }, 'update-base-price');
      } catch {
        await addToPending({ barcode, basePrice: newBasePrice, login }, 'update-base-price');
      }
    } else {
      await addToPending({ barcode, basePrice: newBasePrice, login }, 'update-base-price');
      toast.info(t('offlineSaqlandi'));                        // ✅ tarjima
    }
  };

  // ─── Miqdor yangilash (offline-first) ────────────────────────────────
  const updateQuantity = async (barcode: string, newQuantity: number) => {
    if (newQuantity < 0) return;

    const updated = products.map(p => p.barcode === barcode ? { ...p, quantity: newQuantity } : p);
    setProducts(updated);

    const product = products.find(p => p.barcode === barcode);
    if (product) await saveToIDB({ ...product, quantity: newQuantity, login });

    if (navigator.onLine) {
      try {
        const res = await fetch('/api/products/update-quantity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ barcode, newQuantity, login }),
        });
        if (res.ok) toast.success(t('miqdorYangilandi'));     // ✅ to'g'ri kalit
        else await addToPending({ barcode, quantity: newQuantity, login }, 'update-quantity');
      } catch {
        await addToPending({ barcode, quantity: newQuantity, login }, 'update-quantity');
      }
    } else {
      await addToPending({ barcode, quantity: newQuantity, login }, 'update-quantity');
      toast.info(t('offlineSaqlandi'));                        // ✅ tarjima
    }
  };

  // ─── Qo'lda sync ─────────────────────────────────────────────────────
  const manualSync = async () => {
    if (!navigator.onLine) { toast.warning(t('internetYoq')); return; }  // ✅ tarjima
    setSyncing(true);
    const count = await syncPendingToMongoDB(login);
    await syncFromMongoDB(products);
    setSyncing(false);
    toast.success(
      count > 0
        ? t('ozgarishSyncBoldi', { count: String(count) })   // ✅ "{count} ta o'zgarish..."
        : t('barchiMalumotYuklandi')                          // ✅ tarjima
    );
  };

  // ─── Statistika ───────────────────────────────────────────────────────
  const totalChiqim = soldProducts.reduce((sum, item) => sum + item.basePrice * (item.quantity || 1), 0);
  const totalKirim = soldProducts.reduce((sum, item) => sum + item.price * (item.quantity || 1), 0);
  const totalDaromad = totalKirim - totalChiqim;
  const totalIncomingQuantity = soldProducts.reduce((sum, item) => sum + (item.quantity || 1), 0);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = ev.target?.result as string;
      setUserImage(img);
      localStorage.setItem('userImage', img);
    };
    reader.readAsDataURL(file);
  };

  // ─── UI ───────────────────────────────────────────────────────────────
  return (
    <MainLayout theme={theme} userImage={userImage} handleImageUpload={handleImageUpload} title={t('KirimBazasi')}>

      {/* ── Filter ── */}
      <div className="filters-container">
        <div className="search-box">
          <Search className="search-icon" size={20} />
          <input
            type="text"
            placeholder={t('BarcodeOrNom')}
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

      {/* ── Statistika kartalar ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '32px', marginTop: '24px' }}>
        {[
          { icon: <TrendingUp size={20} color="#10b981" />,   label: t('UmumiyKirim'),   value: totalKirim,             color: '#10b981' },
          { icon: <TrendingDown size={20} color="#ef4444" />, label: t('UmumiyChiqim'),  value: totalChiqim,            color: '#ef4444' },
          { icon: <DollarSign size={20} color={totalDaromad >= 0 ? '#22c55e' : '#ef4444'} />, label: t('Daromad'), value: totalDaromad, color: totalDaromad >= 0 ? '#22c55e' : '#ef4444' },
          { icon: <Package size={20} color="#f59e0b" />,      label: t('sotilganMiqdor'), value: totalIncomingQuantity, color: '#f59e0b', noUnit: true }, // ✅ tarjima
        ].map((card, i) => (
          <div key={i} style={{ background: theme === 'dark' ? 'linear-gradient(135deg, #1a1f2e 0%, #252b3d 100%)' : '#fff', borderRadius: '16px', padding: '24px', border: `1px solid ${theme === 'dark' ? '#2a3144' : '#e2e8f0'}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              {card.icon}
              <span style={{ fontSize: '14px', color: theme === 'dark' ? '#8b92a7' : '#64748b' }}>{card.label}</span>
            </div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: card.color }}>
              {card.value.toLocaleString()}{!card.noUnit && ` ${t('som')}`}
            </div>
          </div>
        ))}
      </div>

      {/* ── Jadval ── */}
      <div className="table-card">
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>{t('N')}</th>
                <th>{t('Barcode')}</th>
                <th>{t('MahsulotNomi')}</th>
                <th>{t('ChiqimNarx')}</th>
                <th>{t('Miqdori')}</th>
                <th>{t('UmumiyChiqim')}</th>
                <th>{t('Kategoriya')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="empty-state">{t('jadvalYuklanmoqda')}</td></tr>  
              ) : filteredProducts.length === 0 ? (
                <tr><td colSpan={7} className="empty-state">{t('noData')}</td></tr>
              ) : (
                filteredProducts.map((p, i) => (
                  <tr key={p.barcode}>
                    <td className="text-center">{i + 1}</td>
                    <td className="barcode-cell">{p.barcode}</td>
                    <td className="name-cell">{p.name || '-'}</td>
                    <td>
                      <input
                        type="number" className="table-input"
                        value={p.basePrice}
                        onChange={e => updateBasePrice(p.barcode, Number(e.target.value))}
                      />
                    </td>
                    <td>
                      <input
                        type="number" className="table-input" min="0"
                        value={p.quantity || 0}
                        onChange={e => updateQuantity(p.barcode, Number(e.target.value))}
                      />
                    </td>
                    <td style={{ fontWeight: 700 }}>
                      {(p.basePrice * (p.quantity || 1)).toLocaleString()} {t('som')}
                    </td>
                    <td>
                      <span className="category-badge">
                        {getCategoryEmoji(p.category)} {translateCategory(p.category, language)}
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
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
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

export default function KirimBazasi() {
  return (
    <TranslationProvider>
      <KirimBazasiContent />
    </TranslationProvider>
  );
}