import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BrowserMultiFormatReader } from '@zxing/library';
import { useNavigate } from 'react-router-dom';
import {
  Camera, Smartphone, Search, Check, X,
  DollarSign, Receipt, ChevronRight
} from 'lucide-react';

import { api } from "../utils/api";
import MainLayout, { tc } from "../components/MainLayout";
import { useTranslation, TranslationProvider } from '../components/languages/Scanner';
import { useCurrency } from '../context/CurrencyContext';
import { getSocket } from '../utils/socket';
import { getSessionLogin } from '../utils/clientSession';
import PrinterButton from '../components/PrinterButton';

// ─── IndexedDB yordamchi funksiyalari ─────────────────────────────────────
const IDB_NAME    = 'ShoxPosDB';
const IDB_VERSION = 5;
const PRODUCTS_STORE = 'products';

const REPORTS_DB_NAME    = 'ShoxPosReports';
const REPORTS_DB_VERSION = 2;
const REPORTS_STORE      = 'reports';

// ✅ ShoxPosDB — promise-based, har safar yangi connection
function openShoxPosDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = (e: any) => {
      const db: IDBDatabase = e.target.result;
      if (!db.objectStoreNames.contains(PRODUCTS_STORE))
        db.createObjectStore(PRODUCTS_STORE, { keyPath: 'barcode' });
      if (!db.objectStoreNames.contains('pendingSync'))
        db.createObjectStore('pendingSync', { keyPath: 'barcode' });
    };
    req.onsuccess = (e: any) => resolve(e.target.result);
    req.onerror   = () => reject(req.error);
  });
}

// ✅ ShoxPosReports — promise-based (global var o'rniga)
function openReportsDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(REPORTS_DB_NAME, REPORTS_DB_VERSION);
    req.onupgradeneeded = (e: any) => {
      const db: IDBDatabase = e.target.result;
      if (!db.objectStoreNames.contains(REPORTS_STORE))
        db.createObjectStore(REPORTS_STORE, { keyPath: 'id', autoIncrement: true });
    };
    req.onsuccess = (e: any) => resolve(e.target.result);
    req.onerror   = () => reject(req.error);
  });
}

// ✅ Reports ga xavfsiz yozish
async function addReportSafe(items: any[], soldAt: string): Promise<void> {
  try {
    const db = await openReportsDB();

    // ✅ Store mavjudligini tekshir
    if (!db.objectStoreNames.contains(REPORTS_STORE)) {
      db.close();
      console.warn('reports store topilmadi, o\'tkazib yuborildi');
      return;
    }

    await new Promise<void>((resolve, reject) => {
      const tx    = db.transaction(REPORTS_STORE, 'readwrite');
      const store = tx.objectStore(REPORTS_STORE);
      items.forEach(item => store.add({ ...item, soldAt }));
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror    = () => { db.close(); reject(tx.error); };
    });
  } catch (err) {
    console.error('Reports yozishda xato:', err);
  }
}

async function getProductsFromIDB(login: string): Promise<any[]> {
  try {
    const db = await openShoxPosDB();
    return new Promise((resolve) => {
      const tx  = db.transaction(PRODUCTS_STORE, 'readonly');
      const req = tx.objectStore(PRODUCTS_STORE).getAll();
      req.onsuccess = () => {
        db.close();
        resolve((req.result || []).filter((p: any) => p.login === login));
      };
      req.onerror = () => { db.close(); resolve([]); };
    });
  } catch { return []; }
}

async function saveProductToIDB(product: any): Promise<void> {
  try {
    const db = await openShoxPosDB();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(PRODUCTS_STORE, 'readwrite');
      tx.objectStore(PRODUCTS_STORE).put({
        ...product,
        updatedAt: new Date().toISOString(),
      });
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror    = () => { db.close(); resolve(); };
    });
  } catch { /* silent */ }
}

// ──────────────────────────────────────────────────────────────────────────

const toggleStyles = `
  .switch { position: relative; display: inline-block; width: 52px; height: 26px; }
  .switch input { opacity: 0; width: 0; height: 0; }
  .slider { position: absolute; cursor: pointer; inset: 0; background-color: #ccc; transition: .4s; border-radius: 26px; }
  .slider:before { position: absolute; content: ""; height: 20px; width: 20px; left: 3px; bottom: 3px; background-color: white; transition: .4s; border-radius: 50%; }
  input:checked + .slider { background-color: rgb(102, 126, 234); }
  input:checked + .slider:before { transform: translateX(26px); }
  @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
  .animate-spin { animation: spin 1s linear infinite; }
`;

function ScannerContent() {
  const { t }      = useTranslation();
  const { format } = useCurrency();
  const navigate   = useNavigate();

  const loginRef = useRef<string>(getSessionLogin() || 'unknown');
  const tRef     = useRef(t);
  useEffect(() => { tRef.current = t; }, [t]);

  const [sales,          setSales]          = useState<any[]>(
    () => JSON.parse(sessionStorage.getItem('sales') || '[]')
  );
  const [scannerActive,  setScannerActive]  = useState(true);
  const [resultText,     setResultText]     = useState('');
  const [resultStatus,   setResultStatus]   = useState<'info' | 'success' | 'error'>('info');
  const [totalPrice,     setTotalPrice]     = useState(0);
  const [cameraDevices,  setCameraDevices]  = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string | null>(null);
  const [manualBarcode,  setManualBarcode]  = useState('');
  const [manualName,     setManualName]     = useState('');
  const [userImage,      setUserImage]      = useState<string | null>(null);
  const [theme,          setTheme]          = useState<'dark' | 'light'>('dark');
  const [hoveredSetting, setHoveredSetting] = useState<string | null>(null);
  const [printerConnected,  setPrinterConnected]  = useState<boolean | null>(null);
  const [printerModel,      setPrinterModel]      = useState<string>('');
  const [checkingPrinter,   setCheckingPrinter]   = useState(false);

  const [idbProducts,    setIdbProducts]    = useState<any[]>([]);
  const idbProductsRef = useRef<any[]>([]);

  const videoRef     = useRef<HTMLVideoElement>(null);
  const codeReader   = useRef(new BrowserMultiFormatReader());
  const scannerActiveRef = useRef(scannerActive);

  useEffect(() => { scannerActiveRef.current = scannerActive; }, [scannerActive]);
  useEffect(() => { idbProductsRef.current   = idbProducts;   }, [idbProducts]);

  const socket = getSocket();

  // ─── Theme va userImage ────────────────────────────────────────────────
  useEffect(() => {
    const savedImage = localStorage.getItem('userImage');
    if (savedImage) setUserImage(savedImage);
    const savedTheme = (localStorage.getItem('theme') as 'dark' | 'light') || 'dark';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
    setResultText(t('searching'));
  }, []);

  // ─── IDB cache yuklash ─────────────────────────────────────────────────
  const loadIdbCache = useCallback(async () => {
    const products = await getProductsFromIDB(loginRef.current);
    setIdbProducts(products);
    idbProductsRef.current = products;
  }, []);

  // ─── DB ochish va kamera ───────────────────────────────────────────────
  useEffect(() => {
    // ✅ ReportsDB ni ham oldindan ochib qo'yamiz (store yaratilsin)
    openReportsDB().catch(err => console.warn('ReportsDB ochishda xato:', err));
    loadIdbCache();

    codeReader.current.listVideoInputDevices().then(devices => {
      setCameraDevices(devices);
      if (devices.length > 0) setSelectedCamera(devices[0].deviceId);
    });

    return () => { codeReader.current.reset(); };
  }, []);

  // ─── Kamera scanner ────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedCamera) return;
    if (scannerActive) startScanner(selectedCamera);
    else codeReader.current.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCamera, scannerActive]);

  // ─── Savat → sessionStorage ────────────────────────────────────────────
  useEffect(() => {
    sessionStorage.setItem('sales', JSON.stringify(sales));
    const total = sales.reduce((sum, item) => sum + item.count * item.price, 0);
    setTotalPrice(total);
  }, [sales]);

  // ─── Socket ────────────────────────────────────────────────────────────
  useEffect(() => {
    const s = getSocket();
    if (!s.connected) s.connect();

    const handlePrintSuccess = (data: any) => {
      setResultText(`✅ ${tRef.current('checkPrintedSuccessfully')} (${data.login})`);
      setResultStatus('success');
    };
    const handlePrintError = (data: any) => {
      setResultText(`❌ ${data.message}`);
      setResultStatus('error');
    };

    s.on('print-success', handlePrintSuccess);
    s.on('print-error',   handlePrintError);
    return () => {
      s.off('print-success', handlePrintSuccess);
      s.off('print-error',   handlePrintError);
    };
  }, []);

  // ─── Printer tekshirish ────────────────────────────────────────────────
  const checkPrinterStatus = useCallback(async () => {
    setCheckingPrinter(true);
    try {
      const res  = await fetch('/api/printer/check-printer');
      const data = await res.json();
      setPrinterConnected(data.connected);
      if (data.connected) {
        const model = data.model || 'USB Thermal Printer';
        setPrinterModel(model);
        setResultText(`${tRef.current('printerConnected')} ${model}`);
        setResultStatus('success');
      } else {
        setPrinterModel('');
        setResultText(tRef.current('printerNotConnected'));
        setResultStatus('error');
      }
    } catch {
      setPrinterConnected(false);
      setPrinterModel('');
      setResultText(tRef.current('noPrinterConnection'));
      setResultStatus('error');
    } finally {
      setCheckingPrinter(false);
    }
  }, []);

  useEffect(() => {
    checkPrinterStatus();
    const interval = setInterval(checkPrinterStatus, 30000);
    return () => clearInterval(interval);
  }, [checkPrinterStatus]);

  // ─── Yordamchi funksiyalar ─────────────────────────────────────────────
  const normalizeText    = (text: string) => text.toLowerCase().trim().replace(/\s+/g, ' ');
  const isLikelyBarcode  = (query: string): boolean => /^\d{4,}$/.test(query.trim());

  // ─── Mahsulot qidirish ─────────────────────────────────────────────────
  const getProductByBarcodeOrName = useCallback(
    async (query: string): Promise<any | null> => {
      query = query.trim();
      if (!query) return null;

      const q           = query.toLowerCase();
      const barcodeMode = isLikelyBarcode(query);
      const login       = loginRef.current;

      const cached       = idbProductsRef.current;
      const localProducts = cached.length > 0
        ? cached
        : await getProductsFromIDB(login);

      if (cached.length === 0 && localProducts.length > 0) {
        setIdbProducts(localProducts);
        idbProductsRef.current = localProducts;
      }

      const foundLocal = localProducts.find((p: any) => {
        const barcodeMatch = String(p.barcode).toLowerCase() === q;
        const nameMatch    = !barcodeMode && p.name && p.name.toLowerCase().includes(q);
        return barcodeMatch || nameMatch;
      });

      if (foundLocal) return { ...foundLocal, source: 'user' };

      if (navigator.onLine) {
        try {
          const res = await api(
            `/api/products/search?q=${encodeURIComponent(query)}&login=${encodeURIComponent(login)}`
          );
          if (res.ok) {
            const results = await res.json();
            if (Array.isArray(results) && results.length > 0) {
              const found = results[0];
              await saveProductToIDB({ ...found, login });
              setIdbProducts(prev => {
                const exists  = prev.find(p => p.barcode === found.barcode);
                if (exists) return prev;
                const updated = [...prev, { ...found, login }];
                idbProductsRef.current = updated;
                return updated;
              });
              return { ...found, source: 'user' };
            }
          }
        } catch (err) {
          console.warn('Qidiruv xatosi:', err);
        }
      }

      return null;
    },
    []
  );

  // ─── Savatga qo'shish ──────────────────────────────────────────────────
  const addToSales = useCallback(async (product: any, count = 1) => {
    const login = loginRef.current;

    if (!product) {
      setResultText(tRef.current('productNotFound'));
      setResultStatus('error');
      return;
    }
    if (!login || login === 'unknown') {
      setResultText(tRef.current('loginNotFound'));
      setResultStatus('error');
      return;
    }

    let productPrice = Number(product.price || 0);

    if (productPrice === 0) {
      const userPrice = prompt(`${product.name} ${tRef.current('enterPrice')}`);
      if (!userPrice || isNaN(Number(userPrice)) || Number(userPrice) <= 0) {
        setResultText(tRef.current('canceled'));
        setResultStatus('error');
        return;
      }
      productPrice = Number(userPrice);

      if (navigator.onLine) {
        try {
          await api('/api/products/update-or-add-user-product', {
            method: 'POST',
            body: JSON.stringify({
              login,
              barcode:   product.barcode,
              name:      product.name,
              price:     productPrice,
              quantity:  count,
              basePrice: 0,
              category:  product.category || '',
            }),
          });
        } catch (err) {
          console.error(tRef.current('addToUserDBError'), err);
        }
      }

      await saveProductToIDB({ ...product, price: productPrice, login });
      setIdbProducts(prev => {
        const updated = prev.map(p =>
          String(p.barcode) === String(product.barcode)
            ? { ...p, price: productPrice }
            : p
        );
        idbProductsRef.current = updated;
        return updated;
      });
    }

    setSales(prev => {
      const existingIndex = prev.findIndex(s => s.barcode === product.barcode);
      if (existingIndex !== -1) {
        const existing = prev[existingIndex];
        const newCount = existing.count + count;
        if (product.source === 'user' && newCount > (existing.maxQuantity || 0)) {
          setResultText(tRef.current('outOfStock'));
          setResultStatus('error');
          return prev;
        }
        const updated = [...prev];
        updated[existingIndex] = { ...existing, count: newCount };
        return updated;
      } else {
        if (product.source === 'user' && count > (product.quantity || 0)) {
          setResultText(tRef.current('outOfStock'));
          setResultStatus('error');
          return prev;
        }
        return [
          ...prev,
          {
            barcode:     product.barcode,
            name:        product.name,
            price:       productPrice,
            count,
            category:    product.category || '',
            maxQuantity: product.source === 'user' ? product.quantity || 0 : Infinity,
            source:      product.source,
          },
        ];
      }
    });

    setResultText(
      `${product.name} — ${count} ${tRef.current('added')} (${format(productPrice)})`
    );
    setResultStatus('success');
    setManualBarcode('');
    setManualName('');
  }, []);

  // ─── Miqdor yangilash ──────────────────────────────────────────────────
  const updateCount = useCallback((barcode: string, value: number) => {
    setSales(prev => {
      const itemIndex = prev.findIndex(s => s.barcode === barcode);
      if (itemIndex === -1) return prev;
      if (value < 1) return prev.filter(s => s.barcode !== barcode);
      const item = prev[itemIndex];
      if (item.source === 'user' && value > (item.maxQuantity || 0)) {
        setResultText(tRef.current('outOfStock'));
        setResultStatus('error');
        return prev;
      }
      const updated = [...prev];
      updated[itemIndex] = { ...item, count: value };
      return updated;
    });
  }, []);

  // ─── Keyboard input ────────────────────────────────────────────────────
  const handleBarcodeInput = useCallback(
    async (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && manualBarcode.trim()) {
        const product = await getProductByBarcodeOrName(manualBarcode.trim());
        if (product) await addToSales(product, 1);
        else { setResultText(tRef.current('productNotFound')); setResultStatus('error'); }
        setManualBarcode('');
      }
    },
    [manualBarcode, getProductByBarcodeOrName, addToSales]
  );

  const handleNameInput = useCallback(
    async (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && manualName.trim()) {
        const product = await getProductByBarcodeOrName(normalizeText(manualName));
        if (product) await addToSales(product, 1);
        else { setResultText(tRef.current('productNotFound')); setResultStatus('error'); }
        setManualName('');
      }
    },
    [manualName, getProductByBarcodeOrName, addToSales]
  );

  // ─── Scanner ───────────────────────────────────────────────────────────
  const startScanner = (deviceId: string) => {
    if (!videoRef.current) return;
    codeReader.current.reset();
    codeReader.current.decodeFromVideoDevice(
      deviceId,
      videoRef.current,
      async (result) => {
        if (result && scannerActiveRef.current) {
          setScannerActive(false);
          codeReader.current.reset();
          const scanned = result.getText().trim();
          setResultText(`${tRef.current('barcodeRead')}: ${scanned}`);
          setResultStatus('success');
          const product = await getProductByBarcodeOrName(scanned);
          if (product) await addToSales(product, 1);
          else { setResultText(tRef.current('productNotFound')); setResultStatus('error'); }
          setTimeout(() => setScannerActive(true), 1500);
        }
      }
    );
  };

  // ─── Sotish (finalize) — TO'LIQ XAVFSIZ ──────────────────────────────
  const finalizeSale = useCallback(async () => {
    const login = loginRef.current;
    if (!login || login === 'unknown') { alert(tRef.current('loginNotFound')); return; }
    if (sales.length === 0)            { alert(tRef.current('cartEmpty'));      return; }

    const hasInsufficientStock = sales.some(
      item => item.source === 'user' && item.count > (item.maxQuantity || 0)
    );
    if (hasInsufficientStock) {
      setResultText(tRef.current('outOfStock'));
      setResultStatus('error');
      return;
    }

    const timestampISO = new Date().toISOString();

    try {
      // ─── Payload yig'ish ────────────────────────────────────────────
      const groupedSales = new Map<string, any>();
      sales.forEach(item => {
        const barcode = String(item.barcode);
        if (groupedSales.has(barcode)) {
          const ex = groupedSales.get(barcode);
          ex.quantity += Number(item.count);
          ex.total     = ex.quantity * Number(item.price);
        } else {
          groupedSales.set(barcode, {
            barcode,
            name:     String(item.name),
            quantity: Number(item.count),
            price:    Number(item.price),
            category: item.category || '',
            total:    Number(item.price) * Number(item.count),
            soldAt:   timestampISO,
          });
        }
      });

      const payload = Array.from(groupedSales.values());

      // ─── API ────────────────────────────────────────────────────────
      if (navigator.onLine) {
        const res = await api(`/api/sell-product/${login}`, {
          method: 'POST',
          body: JSON.stringify({ sales: payload }),
        });
        if (!res.ok) throw new Error(tRef.current('saleSaveError'));
      }

      // ─── IDB yangilash ──────────────────────────────────────────────
      const updatedIdb = [...idbProductsRef.current];
      for (const item of payload) {
        const idx = updatedIdb.findIndex(p => p.barcode === item.barcode);
        if (idx !== -1) {
          const newQty       = Math.max(0, (updatedIdb[idx].quantity || 0) - item.quantity);
          updatedIdb[idx]    = { ...updatedIdb[idx], quantity: newQty };
          await saveProductToIDB(updatedIdb[idx]);
        }
      }
      setIdbProducts(updatedIdb);
      idbProductsRef.current = updatedIdb;

      // ─── ✅ Reports — xavfsiz yozish (global var yo'q) ──────────────
      await addReportSafe(payload, timestampISO);

      // ─── Tozalash ───────────────────────────────────────────────────
      sessionStorage.removeItem('sales');
      setSales([]);
      setResultText(tRef.current('sold'));
      setResultStatus('success');
      window.dispatchEvent(new Event('saleAdded'));
      setTimeout(() => navigate('/sales'), 1000);

    } catch (err) {
      console.error(tRef.current('finalizeSaleError'), err);
      setResultText(tRef.current('saleFailed'));
      setResultStatus('error');
    }
  }, [sales, navigate]);

  // ─── Rasm yuklash ─────────────────────────────────────────────────────
  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
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
  }, []);

  // ─── UI ────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{toggleStyles}</style>
      <MainLayout
        theme={theme}
        userImage={userImage}
        handleImageUpload={handleImageUpload}
        title={t('salesTerminal')}
      >
        <section style={{ marginBottom: '32px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
            gap: '16px',
          }}>

            {/* ── Scanner Card ── */}
            <div
              onMouseEnter={() => setHoveredSetting('scanner')}
              onMouseLeave={() => setHoveredSetting(null)}
              style={{
                background: theme === 'dark'
                  ? 'linear-gradient(135deg, #1a1f2e, #252b3d)'
                  : 'linear-gradient(135deg, #ffffff, #f8f9ff)',
                borderRadius: '16px', padding: '20px',
                border: hoveredSetting === 'scanner'
                  ? '1px solid #667eea'
                  : `1px solid ${theme === 'dark' ? '#2a3144' : '#e2e8f0'}`,
                transition: 'all 0.3s ease',
                transform: hoveredSetting === 'scanner' ? 'translateY(-2px)' : 'translateY(0)',
                boxShadow: hoveredSetting === 'scanner' ? '0 8px 24px rgba(102,126,234,0.2)' : 'none',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(102,126,234,0.1)', color: '#667eea', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Camera size={20} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: 19, fontWeight: 600, color: theme === 'dark' ? '#fff' : '#1a1f2e' }}>
                      {t('qrBarcode')}
                    </h3>
                    <p style={{ fontSize: 13, color: theme === 'dark' ? '#8b92a7' : '#64748b' }}>
                      {t('sellViaQrCode')}
                    </p>
                  </div>
                </div>
                <label className="switch">
                  <input type="checkbox" checked={scannerActive} onChange={e => setScannerActive(e.target.checked)} />
                  <span className="slider" />
                </label>
              </div>

              <video
                ref={videoRef}
                autoPlay muted playsInline
                style={{ width: '100%', borderRadius: 8, marginBottom: 16, transform: 'scaleX(-1)', WebkitTransform: 'scaleX(-1)' }}
              />

              <select
                value={selectedCamera || ''}
                onChange={e => setSelectedCamera(e.target.value)}
                style={{
                  width: '100%', padding: 16, borderRadius: 12,
                  background: theme === 'dark' ? '#0f1420' : '#f8f9ff',
                  border: `1px solid ${theme === 'dark' ? '#2a3144' : '#e2e8f0'}`,
                  color: theme === 'dark' ? '#fff' : '#1a1f2e', fontSize: 15,
                }}
              >
                {cameraDevices.map((device, i) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `${t('camera')} ${i + 1}`}
                  </option>
                ))}
              </select>

              <div style={{
                padding: '12px 16px', marginTop: 16, borderRadius: 12, textAlign: 'center',
                background: resultStatus === 'success' ? 'rgba(16,185,129,0.1)' : resultStatus === 'error' ? 'rgba(239,68,68,0.1)' : 'rgba(102,126,234,0.1)',
                border: `1px solid ${resultStatus === 'success' ? 'rgba(16,185,129,0.3)' : resultStatus === 'error' ? 'rgba(239,68,68,0.3)' : 'rgba(102,126,234,0.3)'}`,
                color: resultStatus === 'success' ? '#10b981' : resultStatus === 'error' ? '#ef4444' : '#667eea',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 14,
              }}>
                {resultStatus === 'success' ? <Check size={16} /> : resultStatus === 'error' ? <X size={16} /> : <Search size={16} />}
                {resultText}
              </div>
            </div>

            {/* ── Manual Input Card ── */}
            <div
              onMouseEnter={() => setHoveredSetting('manual')}
              onMouseLeave={() => setHoveredSetting(null)}
              style={{
                background: theme === 'dark'
                  ? 'linear-gradient(135deg, #1a1f2e, #252b3d)'
                  : 'linear-gradient(135deg, #ffffff, #f8f9ff)',
                borderRadius: 16, padding: 20,
                border: hoveredSetting === 'manual'
                  ? '1px solid #667eea'
                  : `1px solid ${theme === 'dark' ? '#2a3144' : '#e2e8f0'}`,
                transition: 'all 0.3s ease',
                transform: hoveredSetting === 'manual' ? 'translateY(-2px)' : 'translateY(0)',
                boxShadow: hoveredSetting === 'manual' ? '0 8px 24px rgba(102,126,234,0.2)' : 'none',
              }}
            >
              <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 20 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(102,126,234,0.1)', color: '#667eea', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Smartphone size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: 19, fontWeight: 600, color: theme === 'dark' ? '#fff' : '#1a1f2e' }}>
                    {t('manualInput')}
                  </h3>
                  <p style={{ fontSize: 13, color: theme === 'dark' ? '#8b92a7' : '#64748b' }}>
                    {t('sellViaBarcodeOrName')}
                  </p>
                </div>
              </div>

              <input
                type="text"
                placeholder={t('enterBarcode')}
                value={manualBarcode}
                onChange={e => setManualBarcode(e.target.value)}
                onKeyDown={handleBarcodeInput}
                style={{
                  width: '90%', padding: 16, marginBottom: 16, borderRadius: 12,
                  background: theme === 'dark' ? '#0f1420' : '#f8f9ff',
                  border: `1px solid ${theme === 'dark' ? '#2a3144' : '#e2e8f0'}`,
                  color: theme === 'dark' ? '#fff' : '#1a1f2e', fontSize: 15,
                }}
              />
              <input
                type="text"
                placeholder={t('enterProductName')}
                value={manualName}
                onChange={e => setManualName(e.target.value)}
                onKeyDown={handleNameInput}
                style={{
                  width: '90%', padding: 16, marginBottom: 20, borderRadius: 12,
                  background: theme === 'dark' ? '#0f1420' : '#f8f9ff',
                  border: `1px solid ${theme === 'dark' ? '#2a3144' : '#e2e8f0'}`,
                  color: theme === 'dark' ? '#fff' : '#1a1f2e', fontSize: 15,
                }}
              />
            </div>

            {/* ── Actions Card ── */}
            <div style={{
              background: theme === 'dark' ? '#1d2232ff' : '#fff',
              borderRadius: 20, padding: 30,
              border: `1px solid ${theme === 'dark' ? '#2a3144' : '#e2e8f0'}`,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(102,126,234,0.1)', color: '#667eea', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Receipt size={20} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: 19, fontWeight: 600, color: theme === 'dark' ? '#fff' : '#1a1f2e' }}>{t('sales')}</h3>
                    <p style={{ fontSize: 13, color: theme === 'dark' ? '#8b92a7' : '#64748b' }}>{t('salesLog')}</p>
                  </div>
                </div>
                <div style={{ fontSize: 20, fontWeight: 'bold', textAlign: 'right' }}>
                  {t('total')}: {format(totalPrice)}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 10 }}>
                <div
                  onClick={finalizeSale}
                  style={{ background: theme === 'dark' ? '#091020' : '#fff', borderRadius: 16, padding: 20, cursor: 'pointer', border: '1px solid #2a3144' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(102,126,234,0.1)', color: '#667eea', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <DollarSign size={20} />
                      </div>
                      <div>
                        <h4 style={{ fontSize: 16, fontWeight: 600, color: theme === 'dark' ? '#fff' : '#1a1f2e' }}>{t('sell')}</h4>
                        <p style={{ fontSize: 13, color: '#8b92a7' }}>{t('finalizeSale')}</p>
                      </div>
                    </div>
                    <ChevronRight size={20} color="#8b92a7" />
                  </div>
                </div>

                <PrinterButton
                  sales={sales}
                  totalPrice={totalPrice}
                  theme={theme}
                  t={t}
                  finalizeSale={finalizeSale}
                  setResultText={setResultText}
                  setResultStatus={setResultStatus}
                  socket={socket}
                />
              </div>
            </div>
          </div>
        </section>

        {/* ── Savat jadvali ── */}
        <section>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: theme === 'dark' ? '#fff' : '#1a1f2e', marginBottom: 16 }}>
            {t('productsInList')}
          </h2>
          <div style={{
            background: theme === 'dark'
              ? 'linear-gradient(135deg, #1a1f2e, #252b3d)'
              : 'linear-gradient(135deg, #ffffff, #f8f9ff)',
            borderRadius: 16, padding: 20,
            border: `1px solid ${theme === 'dark' ? '#2a3144' : '#e2e8f0'}`,
          }}>
            <div style={{ fontSize: 20, fontWeight: 'bold', textAlign: 'right', marginBottom: 16 }}>
              {t('total')}: {format(totalPrice)}
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: theme === 'dark' ? '#0f1420' : '#f1f5f9' }}>
                  {[t('productName'), t('quantity'), t('price'), t('subtotal')].map((h, i) => (
                    <th key={h} style={{
                      padding: 12,
                      textAlign: i === 0 ? 'left' : i === 1 ? 'center' : 'right',
                      borderBottom: `1px solid ${theme === 'dark' ? '#2a3144' : '#e2e8f0'}`,
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sales.map(item => (
                  <tr key={item.barcode}>
                    <td style={{ padding: 12, borderBottom: `1px solid ${theme === 'dark' ? '#2a3144' : '#e2e8f0'}` }}>
                      {item.name}
                    </td>
                    <td style={{ padding: 12, textAlign: 'center', borderBottom: `1px solid ${theme === 'dark' ? '#2a3144' : '#e2e8f0'}` }}>
                      <input
                        type="number" min="0" value={item.count}
                        onChange={e => updateCount(item.barcode, Number(e.target.value))}
                        style={{
                          width: 80, padding: 8, borderRadius: 6,
                          background: theme === 'dark' ? '#0f1420' : '#f8f9ff',
                          border: `1px solid ${theme === 'dark' ? '#2a3144' : '#e2e8f0'}`,
                          color: theme === 'dark' ? '#fff' : '#1a1f2e',
                        }}
                      />
                    </td>
                    <td style={{ padding: 12, textAlign: 'right', borderBottom: `1px solid ${theme === 'dark' ? '#2a3144' : '#e2e8f0'}` }}>
                      {format(item.price)}
                    </td>
                    <td style={{ padding: 12, textAlign: 'right', fontWeight: 'bold', borderBottom: `1px solid ${theme === 'dark' ? '#2a3144' : '#e2e8f0'}` }}>
                      {format(item.count * item.price)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </MainLayout>
    </>
  );
}

const Scanner: React.FC = () => (
  <TranslationProvider>
    <ScannerContent />
  </TranslationProvider>
);

export default Scanner;