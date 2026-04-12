import React, { useState } from 'react';
import { Database, X, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// ... (IndexedDB yordamchi funksiyalari o'zgarishsiz qoladi)
const IDB_NAME = 'ShoxPosDB';
const IDB_VERSION = 5;
const PRODUCTS_STORE = 'products';

function openShoxPosDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = (e: any) => {
      const db: IDBDatabase = e.target.result;
      if (!db.objectStoreNames.contains(PRODUCTS_STORE)) db.createObjectStore(PRODUCTS_STORE, { keyPath: 'barcode' });
      if (!db.objectStoreNames.contains('pendingSync')) db.createObjectStore('pendingSync', { keyPath: 'barcode' });
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
  } catch { }
}

async function syncMongoToIDB(login: string): Promise<{ products: number; sales: number }> {
  let savedProducts = 0;
  let savedSales = 0;
  try {
    const res = await fetch(`/api/products/user-products/${login}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        const idbProducts = await getAllFromIDB(login);
        const idbBarcodes = new Set(idbProducts.map((p: any) => p.barcode));
        for (const product of data) {
          if (!idbBarcodes.has(product.barcode)) {
            await saveToIDB({ ...product, basePrice: product.basePrice || 0, login });
            savedProducts++;
          }
        }
      }
    }
  } catch (err) { console.warn('MaxsulotBazasi sync xatosi:', err); }

  try {
    const res = await fetch(`/api/sales/${login}`);
    if (res.ok) {
      const salesData = await res.json();
      if (Array.isArray(salesData)) {
        const idbProducts = await getAllFromIDB(login);
        const idbBarcodes = new Set(idbProducts.map((p: any) => p.barcode));
        for (const sale of salesData) {
          if (sale.barcode && !idbBarcodes.has(sale.barcode)) {
            await saveToIDB({
              barcode: sale.barcode, name: sale.name || '', basePrice: sale.basePrice || 0,
              price: sale.price || 0, quantity: sale.quantity || 0, category: sale.category || '', login,
            });
            savedSales++;
          }
        }
      }
    }
  } catch (err) { console.warn('KirimBazasi sync xatosi:', err); }
  return { products: savedProducts, sales: savedSales };
}

// ─── Modal ─────────────────────────────────────────────────────────────────
function BackupModal({
  isOpen, onClose, theme, login,
}: {
  isOpen: boolean; onClose: () => void; theme: 'dark' | 'light'; login: string;
}) {
  const { t } = useTranslation(['settings', 'common']);
  const [loading, setLoading] = useState(false);

  const handleSync = async () => {
    if (!navigator.onLine) {
      toast.warning(t('noInternetSync'), { theme: theme === 'dark' ? 'dark' : 'light' });
      return;
    }
    setLoading(true);
    toast.info(t('syncingFromMongo'), { autoClose: 2500, theme: theme === 'dark' ? 'dark' : 'light' });

    try {
      const { products, sales } = await syncMongoToIDB(login);
      const total = products + sales;
      if (total > 0) {
        toast.success(`${products} ${t('syncSuccess')}`, { theme: theme === 'dark' ? 'dark' : 'light' });
      } else {
        toast.info(t('syncAlreadyUpToDate'), { theme: theme === 'dark' ? 'dark' : 'light' });
      }
    } catch (err) {
      toast.error(t('syncError'), { theme: theme === 'dark' ? 'dark' : 'light' });
    } finally {
      setLoading(false);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, backdropFilter: 'blur(8px)',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: theme === 'dark' ? 'linear-gradient(135deg, #1a1f2e 0%, #252b3d 100%)' : 'linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%)',
          borderRadius: '24px', padding: '40px', width: '90%', maxWidth: '480px',
          border: `1px solid ${theme === 'dark' ? '#2a3144' : '#e2e8f0'}`,
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: theme === 'dark' ? '#fff' : '#1a1f2e', margin: 0 }}>
            {t('backup')}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme === 'dark' ? '#8b92a7' : '#64748b' }}>
            <X size={22} />
          </button>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              flex: 1, padding: '13px', borderRadius: '12px', fontSize: '15px', fontWeight: 600,
              background: theme === 'dark' ? '#1a1f2e' : '#f1f5f9',
              color: theme === 'dark' ? '#e2e8f0' : '#1e293b',
              border: `1px solid ${theme === 'dark' ? '#2a3144' : '#e2e8f0'}`,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {t('cancel')}
          </button>

          <button
            onClick={handleSync}
            disabled={loading || !navigator.onLine}
            style={{
              flex: 1, padding: '13px', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: 600,
              background: loading || !navigator.onLine ? '#64748b' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: '#fff', cursor: loading || !navigator.onLine ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? t('loading') : t('downloadBtn')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Backup kartasi ────────────────────────────────────────────────────────
interface BackupProps {
  theme: 'dark' | 'light';
  hoveredSetting: string | null;
  setHoveredSetting: React.Dispatch<React.SetStateAction<string | null>>;
  idx: string;
}

const Backup: React.FC<BackupProps> = ({ theme, hoveredSetting, setHoveredSetting, idx }) => {
  const { t } = useTranslation(['settings', 'common']);
  const [isOpen, setIsOpen] = useState(false);

  const login = JSON.parse(sessionStorage.getItem("currentUser") || "{}")?.login || "unknown";

  return (
    <>
      <div
        onMouseEnter={() => setHoveredSetting(idx)}
        onMouseLeave={() => setHoveredSetting(null)}
        onClick={() => setIsOpen(true)}
        style={{
          background: theme === 'dark' ? 'linear-gradient(135deg, #1a1f2e 0%, #252b3d 100%)' : 'linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%)',
          borderRadius: '16px', padding: '20px', cursor: 'pointer', transition: 'all 0.3s ease',
          border: hoveredSetting === idx ? '1px solid #667eea' : `1px solid ${theme === 'dark' ? '#2a3144' : '#e2e8f0'}`,
          transform: hoveredSetting === idx ? 'translateY(-2px)' : 'translateY(0)',
          boxShadow: hoveredSetting === idx ? '0 8px 24px rgba(102,126,234,0.2)' : 'none',
        }}
      >
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: theme === 'dark' ? 'rgba(102,126,234,0.1)' : 'rgba(79,70,229,0.1)', color: '#667eea', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Database size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: '19px', fontWeight: 600, color: theme === 'dark' ? '#fff' : '#1a1f2e' }}>
              {t('backup')}
            </h3>
            <p style={{ fontSize: '13px', color: theme === 'dark' ? '#8b92a7' : '#64748b', marginBottom: 0 }}>
              {t('backupDescription')}
            </p>
          </div>
          <ChevronRight size={20} color={theme === 'dark' ? '#8b92a7' : '#64748b'} style={{ flexShrink: 0, marginTop: '10px' }} />
        </div>
      </div>

      <BackupModal isOpen={isOpen} onClose={() => setIsOpen(false)} theme={theme} login={login} />
    </>
  );
};

export default Backup;
