import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BrowserMultiFormatReader } from '@zxing/library';
import { useNavigate } from 'react-router-dom';
import {
  Search, Check, X,
  DollarSign, CreditCard, Wallet, Printer, ScanLine
} from 'lucide-react';

import {
  openDB,
  getAllFromIDB,
  saveToIDB,
  openReportsDB,
} from '../hooks/useProductSync';

import { api } from "../utils/api";
import MainLayout, { tc } from "../components/MainLayout";
import { useTranslation, TranslationProvider } from '../components/languages/Scanner';
import { useCurrency } from '../context/CurrencyContext';
import { getSocket } from '../utils/socket';
import { getSessionLogin } from '../utils/clientSession';
import PrinterButton from '../components/PrinterButton';
import { useResponsive } from '../hooks/useResponsive';

// --- IndexedDB yordamchi funksiyalari (Reports uchun) ---------------------
const REPORTS_STORE = 'reports';

async function addReportSafe(items: any[], soldAt: string): Promise<void> {
  try {
    const db = await openReportsDB();
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
// --------------------------------------------------------------------------

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Outfit:wght@300;400;500;600;700&display=swap');

  .pos-root * { box-sizing: border-box; margin: 0; padding: 0; }
  .pos-root {
    font-family:  monospace;
    color: #e2e8f0;
    width: 100%;
  }

  .switch { position: relative; display: inline-block; width: 46px; height: 24px; }
  .switch input { opacity: 0; width: 0; height: 0; }
  .slider { position: absolute; cursor: pointer; inset: 0; background: #2a3144; transition: .3s; border-radius: 24px; }
  .slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px; background: white; transition: .3s; border-radius: 50%; }
  input:checked + .slider { background: #667eea; }
  input:checked + .slider:before { transform: translateX(22px); }

  .pos-btn { cursor: pointer; border: none; outline: none; transition: all 0.2s ease; }
  .pos-btn:hover { transform: translateY(-1px); }
  .pos-btn:active { transform: translateY(0); }

  /* --- Search row --- */
  .pos-search-row {
    display: grid;
    grid-template-columns: 1fr 268px;
    gap: 16px;
    margin-bottom: 16px;
  }
  .pos-search-wrap {
    position: relative;
    min-width: 0;
  }

  /* Search input */
  .search-input {
    width: 100%;
    height: 52px;
    padding: 0 14px 0 48px;
    background: #111827;
    border: 1px solid #1e293b;
    border-radius: 14px;
    color: #e2e8f0;
    font-size: 15px;
    font-family: monospace;
    outline: none;
    transition: border-color 0.2s;
  }
  .search-input:focus { border-color: #667eea; background: #131d35; }
  .search-input::placeholder { color: #4a5568; }

  /* JAMMI box — search bilan balandligi teng */
  .jammi-box {
    height: 52px;
    padding: 0 22px;
    background: #111827;
    border: 1px solid #1e293b;
    border-radius: 14px;
    font-family:  monospace;
    font-size: 17px;
    font-weight: 700;
    color: #667eea;
    white-space: nowrap;
    letter-spacing: 1px;
    display: flex;
    align-items: center;
  }

  /* Payment buttons */
  .payment-btn {
    border-radius: 14px;
    padding: 0;
    cursor: pointer;
    border: 1px solid #1e2740;
    transition: all 0.2s;
    background: #111827;
    width: 100%;
  }
  .payment-btn:hover {
    border-color: #667eea;
    background: #131d35;
    transform: translateY(-1px);
    box-shadow: 0 4px 16px rgba(102,126,234,0.12);
  }
  .payment-btn.naqd:hover    { border-color: #10b981; background: #0d1e18; }
  .payment-btn.plastik:hover { border-color: #667eea; background: #131d35; }
  .payment-btn.qarz:hover    { border-color: #f59e0b; background: #1c1508; }

  /* QR Scan block */
  .qr-scan-block {
    border-radius: 14px;
    border: 1px solid #1e2740;
    background: #111827;
    transition: all 0.2s;
    cursor: pointer;
    width: 100%;
    padding: 14px 16px;
  }
  .qr-scan-block:hover {
    border-color: #667eea;
    background: #131d35;
    transform: translateY(-1px);
    box-shadow: 0 4px 16px rgba(102,126,234,0.15);
  }
  .qr-scan-block.active {
    border-color: #667eea;
    background: #131d35;
    box-shadow: 0 0 20px rgba(102,126,234,0.2);
  }

  /* Chek button */
  .chek-btn {
    border-radius: 14px;
    border: 1px solid #1e2740;
    background: #111827;
    transition: all 0.2s;
    cursor: pointer;
    width: 100%;
    padding: 14px 16px;
    text-align: left;
  }
  .chek-btn:hover {
    border-color: #06b6d4;
    background: #0d1e22;
    transform: translateY(-1px);
    box-shadow: 0 4px 16px rgba(6,182,212,0.12);
  }

  /* Printer status satri (chek tugmasi ichida) */
  .printer-status-row {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 8px;
    padding: 6px 10px;
    border-radius: 8px;
    font-size: 11px;
    font-family: monospace;
  }
  .printer-ok  { background: rgba(16,185,129,0.08);  border: 1px solid rgba(16,185,129,0.2);  color: #10b981; }
  .printer-no  { background: rgba(239,68,68,0.08);   border: 1px solid rgba(239,68,68,0.2);   color: #ef4444; }
  .printer-chk { background: rgba(100,116,139,0.08); border: 1px solid rgba(100,116,139,0.2); color: #94a3b8; }

  /* kbd badge */
  .kbd {
    display: inline-block;
    background: #1e2740;
    color: #94a3b8;
    border-radius: 5px;
    font-size: 10px;
    font-family: monospace;
    padding: 2px 6px;
    margin-left: 4px;
    vertical-align: middle;
  }

  .cart-row:hover { background: rgba(102,126,234,0.04); }

  .qty-input {
    width: 68px;
    padding: 7px 8px;
    border-radius: 8px;
    background: #0b0f1a;
    border: 1px solid #1e2740;
    color: #e2e8f0;
    font-family: monospace;
    font-size: 13px;
    text-align: center;
    outline: none;
  }
  .qty-input:focus { border-color: #667eea; }

  /* Status block */
  .status-block {
    border-radius: 14px;
    border: 1px solid #1e2740;
    background: #111827;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px 18px;
    font-size: 14px;
    font-weight: 500;
    font-family: monospace;
    min-height: 52px;
  }
  .status-info  { border-color: rgba(102,126,234,0.3); color: #667eea; background: rgba(102,126,234,0.07); }
  .status-ok    { border-color: rgba(16,185,129,0.3);  color: #10b981; background: rgba(16,185,129,0.07); }
  .status-error { border-color: rgba(239,68,68,0.3);   color: #ef4444; background: rgba(239,68,68,0.07); }

  /* Cart card */
  .cart-card {
    background: #111827;
    border-radius: 20px;
    border: 1px solid #1e293b;
    overflow: hidden;
    box-shadow: 0 10px 30px rgba(0,0,0,0.15);
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  /* Main grid */
  .pos-main-grid {
    display: grid;
    grid-template-columns: 1fr 268px;
    gap: 16px;
    align-items: start;
  }

  /* Right column */
  .pos-right-col {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .cam-preview {
    background: #0d1220;
    border: 1px solid #1e2740;
    border-radius: 14px;
    overflow: hidden;
    position: relative;
  }

  @keyframes pulse-ring {
    0%,100% { opacity:.5; transform: scale(1); }
    50%      { opacity:1;  transform: scale(1.03); }
  }
  .scanning { animation: pulse-ring 1.5s ease-in-out infinite; }

  .divider {
    height: 1px;
    background: linear-gradient(90deg, transparent, #1e2740 20%, #1e2740 80%, transparent);
    margin: 2px 0;
  }

  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #1e2740; border-radius: 2px; }

  /* --- Mobile Bottom Bar --- */
  .mobile-bottom-bar {
    display: none;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: #0f172a;
    border-top: 1px solid #1e293b;
    padding: 12px 16px;
    padding-bottom: env(safe-area-inset-bottom, 12px);
    z-index: 1000;
    box-shadow: 0 -10px 30px rgba(0,0,0,0.4);
  }

  .bottom-bar-scroll {
    display: flex;
    gap: 10px;
    overflow-x: auto;
    padding-bottom: 8px;
    margin-bottom: 8px;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none; /* Firefox */
  }
  .bottom-bar-scroll::-webkit-scrollbar { display: none; } /* Chrome/Safari */

  .mobile-action-btn {
    flex: 0 0 auto;
    min-width: 90px;
    height: 70px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    border: none;
    border-radius: 14px;
    color: #fff;
    cursor: pointer;
    font-family: monospace ;
    transition: transform 0.1s;
  }
  .mobile-action-btn:active { transform: scale(0.95); }

  /* --- Responsive --- */
  @media (max-width: 900px) {
    .pos-search-row {
      grid-template-columns: 1fr;
    }
    .jammi-box { display: none; } /* Hide JAMMI next to search on mobile */
    .pos-main-grid {
      grid-template-columns: 1fr;
    }
    .pos-right-col {
      display: none; /* Hide right column on mobile, use bottom bar instead */
    }
    .mobile-bottom-bar {
      display: block;
    }
    .pos-root {
      padding-bottom: 160px; /* Space for bottom bar */
    }
    .cart-card {
      max-height: calc(100vh - 320px);
      overflow-y: auto;
    }
    .cart-card table {
      display: block;
      overflow-x: auto;
      white-space: nowrap;
    }
    
    /* Full screen camera on mobile */
    .cam-preview-mobile {
      position: fixed;
      inset: 0;
      z-index: 9999;
      background: #000;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .cam-preview-mobile video {
      width: 100% !important;
      height: 100% !important;
      object-fit: cover;
    }
    .cam-overlay {
      position: absolute;
      inset: 0;
      background: rgba(0,0,0,0.4);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      pointer-events: none;
    }
    .scan-square {
      width: 250px;
      height: 250px;
      border: 2px solid #667eea;
      border-radius: 20px;
      position: relative;
      background: transparent;
      box-shadow: 0 0 0 2000px rgba(0,0,0,0.5); /* Create dark overlay around square */
    }
    .scan-square::before, .scan-square::after {
      content: '';
      position: absolute;
      width: 30px;
      height: 30px;
      border: 3px solid #667eea;
    }
    .scan-square::before { top: -2px; left: -2px; border-right: 0; border-bottom: 0; border-top-left-radius: 15px; }
    .scan-square::after { bottom: -2px; right: -2px; border-left: 0; border-top: 0; border-bottom-right-radius: 15px; }
    
    .scan-line-anim {
      position: absolute;
      top: 0;
      left: 10px;
      right: 10px;
      height: 2px;
      background: #667eea;
      box-shadow: 0 0 10px #667eea;
      animation: scan-move 2s linear infinite;
    }
    @keyframes scan-move {
      0% { top: 0; }
      50% { top: 250px; }
      100% { top: 0; }
    }

    .cam-close-btn {
      position: absolute;
      top: 30px;
      right: 20px;
      z-index: 10000;
      background: rgba(255,255,255,0.2);
      backdrop-filter: blur(5px);
      color: #fff;
      border: none;
      padding: 12px;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .cam-close-btn:active { transform: scale(0.9); }
  }

  @media (max-width: 600px) {
    .pos-search-row { flex-direction: column; }
    .jammi-box { display: none; }
    .pos-search-wrap { flex: 1; width: 100%; }
    .pos-main-grid { gap: 10px; }
  }

  @media (max-width: 480px) {
    .cart-card table { min-width: 100%; }
  }
`;

function ScannerContent() {
  const { isMobile } = useResponsive();
  const { t }      = useTranslation();
  const { format } = useCurrency();
  const navigate   = useNavigate();

  const loginRef = useRef<string>(getSessionLogin() || 'unknown');
  const tRef     = useRef(t);
  useEffect(() => { tRef.current = t; }, [t]);

  const [sales,             setSales]             = useState<any[]>(
    () => JSON.parse(sessionStorage.getItem('sales') || '[]')
  );
  const [resultText,        setResultText]        = useState('Tayyor');
  const [resultStatus,      setResultStatus]      = useState<'info' | 'success' | 'error'>('info');
  const [totalPrice,        setTotalPrice]        = useState(0);
  const [cameraDevices,     setCameraDevices]     = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera,    setSelectedCamera]    = useState<string | null>(null);
  const [manualBarcode,     setManualBarcode]     = useState('');
  const [showCamera,        setShowCamera]        = useState(false);
  const [scannerActive,     setScannerActive]     = useState(false);
  const [userImage,         setUserImage]         = useState<string | null>(null);
  const [theme,             setTheme]             = useState<'dark' | 'light'>('dark');
  const [printerConnected,  setPrinterConnected]  = useState<boolean | null>(null);
  const [printerModel,      setPrinterModel]      = useState<string>('');
  const [checkingPrinter,   setCheckingPrinter]   = useState(false);

  const [idbProducts, setIdbProducts] = useState<any[]>([]);
  const idbProductsRef = useRef<any[]>([]);

  const videoRef         = useRef<HTMLVideoElement>(null);
  const codeReader       = useRef(new BrowserMultiFormatReader());
  const scannerActiveRef = useRef(scannerActive);
  const searchRef        = useRef<HTMLInputElement>(null);

  useEffect(() => { scannerActiveRef.current = scannerActive; }, [scannerActive]);
  useEffect(() => { idbProductsRef.current   = idbProducts;   }, [idbProducts]);

  const socket = getSocket();

  // --- Initial setup ---------------------------------------------------
  useEffect(() => {
    const savedImage = localStorage.getItem('userImage');
    if (savedImage) setUserImage(savedImage);
    const savedTheme = (localStorage.getItem('theme') as 'dark' | 'light') || 'dark';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
    setResultText(t('searching'));
  }, []);

  const loadIdbCache = useCallback(async () => {
    const products = await getAllFromIDB(loginRef.current);
    setIdbProducts(products);
    idbProductsRef.current = products;
  }, []);

  useEffect(() => {
    openReportsDB().catch(err => console.warn('ReportsDB ochishda xato:', err));
    loadIdbCache();
    codeReader.current.listVideoInputDevices().then(devices => {
      setCameraDevices(devices);
      if (devices.length > 0) setSelectedCamera(devices[0].deviceId);
    });
    return () => { codeReader.current.reset(); };
  }, []);

  // --- Camera -----------------------------------------------------------
  useEffect(() => {
    if (showCamera && selectedCamera) {
      setScannerActive(true);
    } else {
      setScannerActive(false);
      codeReader.current.reset();
    }
  }, [showCamera, selectedCamera]);

  useEffect(() => {
    if (scannerActive && selectedCamera && videoRef.current) {
      startScanner(selectedCamera);
    }
  }, [scannerActive, selectedCamera]);

  // --- Sales total -----------------------------------------------------
  useEffect(() => {
    sessionStorage.setItem('sales', JSON.stringify(sales));
    const total = sales.reduce((sum, item) => sum + item.count * item.price, 0);
    setTotalPrice(total);
  }, [sales]);

  // --- Socket -----------------------------------------------------------
  useEffect(() => {
    const s = getSocket();
    if (!s.connected) s.connect();
    const handlePrintSuccess = (data: any) => {
      setResultText(`Chek muvaffaqiyatli chop etildi (${data.login})`);
      setResultStatus('success');
    };
    const handlePrintError = (data: any) => {
      setResultText(`Xato: ${data.message}`);
      setResultStatus('error');
    };
    s.on('print-success', handlePrintSuccess);
    s.on('print-error',   handlePrintError);
    return () => {
      s.off('print-success', handlePrintSuccess);
      s.off('print-error',   handlePrintError);
    };
  }, []);

  // --- Printer check ----------------------------------------------------
  const checkPrinterStatus = useCallback(async () => {
    setCheckingPrinter(true);
    try {
      const res  = await fetch('/api/printer/check-printer');
      const data = await res.json();
      setPrinterConnected(data.connected);
      if (data.connected) {
        setPrinterModel(data.model || 'USB Thermal Printer');
      } else {
        setPrinterModel('');
      }
    } catch {
      setPrinterConnected(false);
      setPrinterModel('');
    } finally {
      setCheckingPrinter(false);
    }
  }, []);

  useEffect(() => {
    checkPrinterStatus();
    const interval = setInterval(checkPrinterStatus, 30000);
    return () => clearInterval(interval);
  }, [checkPrinterStatus]);

  // --- Keyboard shortcuts: F8 -> chek, F9 -> naqd, F10 -> plastik --------
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F8 --- Chek Chop Etish (printer orqali sotuv)
      if (e.key === 'F8') {
        e.preventDefault();
        // PrinterButton ichidagi logikani trigger qilish uchun custom event
        window.dispatchEvent(new CustomEvent('pos:chek'));
      }
      // F9 --- Naqd pul orqali sotuv
      if (e.key === 'F9') {
        e.preventDefault();
        finalizeSale('naqd');
      }
      // F10 --- Plastik karta orqali sotuv
      if (e.key === 'F10') {
        e.preventDefault();
        finalizeSale('plastik');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sales]); // sales dependency --- finalizeSale ichida sales ishlatiladi

  // --- Helpers ----------------------------------------------------------
  const normalizeText   = (text: string) => text.toLowerCase().trim().replace(/\s+/g, ' ');
  const isLikelyBarcode = (query: string): boolean => /^\d{4,}$/.test(query.trim());

  const getProductByBarcodeOrName = useCallback(
    async (query: string): Promise<any | null> => {
      query = query.trim();
      if (!query) return null;
      const q           = query.toLowerCase();
      const barcodeMode = isLikelyBarcode(query);
      const login       = loginRef.current;
      const cached      = idbProductsRef.current;
      const localProducts = cached.length > 0 ? cached : await getAllFromIDB(login);
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
          const res = await api(`/api/products/search?q=${encodeURIComponent(query)}&login=${encodeURIComponent(login)}`);
          if (res.ok) {
            const results = await res.json();
            if (Array.isArray(results) && results.length > 0) {
              const found = results[0];
              if (found.isGlobal) return { ...found, source: 'global' };
              await saveToIDB({ ...found, login });
              setIdbProducts(prev => {
                const exists = prev.find(p => p.barcode === found.barcode);
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

  const addToSales = useCallback(async (product: any, count = 1) => {
    const login = loginRef.current;
    if (!product) { setResultText(tRef.current('productNotFound')); setResultStatus('error'); return; }
    if (!login || login === 'unknown') { setResultText(tRef.current('loginNotFound')); setResultStatus('error'); return; }

    let productPrice = Number(product.price || 0);

    if (productPrice === 0 || product.source === 'global') {
      const userPrice = prompt(`${product.name} — narxini kiriting:`);
      if (!userPrice || isNaN(Number(userPrice)) || Number(userPrice) <= 0) {
        setResultText('Bekor qilindi'); setResultStatus('error'); return;
      }
      productPrice = Number(userPrice);
      if (navigator.onLine) {
        try {
          await api('/api/products/update-or-add-user-product', {
            method: 'POST',
            body: JSON.stringify({ login, barcode: product.barcode, name: product.name, price: productPrice, quantity: count, basePrice: 0, category: product.category || '' }),
          });
        } catch (err) { console.error('DB xato:', err); }
      }
      await saveToIDB({ ...product, price: productPrice, login, quantity: product.source === 'global' ? count : product.quantity });
      setIdbProducts(prev => {
        const exists = prev.find(p => String(p.barcode) === String(product.barcode));
        let updated;
        if (exists) {
          updated = prev.map(p => String(p.barcode) === String(product.barcode) ? { ...p, price: productPrice } : p);
        } else {
          updated = [...prev, { ...product, price: productPrice, login, quantity: product.source === 'global' ? count : product.quantity }];
        }
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
          setResultText(tRef.current('outOfStock')); setResultStatus('error'); return prev;
        }
        const updated = [...prev];
        updated[existingIndex] = { ...existing, count: newCount };
        return updated;
      } else {
        if (product.source === 'user' && count > (product.quantity || 0)) {
          setResultText(tRef.current('outOfStock')); setResultStatus('error'); return prev;
        }
        return [...prev, {
          barcode: product.barcode,
          name: product.name,
          price: productPrice,
          count,
          category: product.category || '',
          maxQuantity: product.source === 'user' ? product.quantity || 0 : Infinity,
          source: product.source,
        }];
      }
    });

    setResultText(`${product.name} — ${count} ta qo'shildi (${format(productPrice)})`);
    setResultStatus('success');
    setManualBarcode('');
  }, []);

  const updateCount = useCallback((barcode: string, value: number) => {
    setSales(prev => {
      const itemIndex = prev.findIndex(s => s.barcode === barcode);
      if (itemIndex === -1) return prev;
      if (value < 1) return prev.filter(s => s.barcode !== barcode);
      const item = prev[itemIndex];
      if (item.source === 'user' && value > (item.maxQuantity || 0)) {
        setResultText(tRef.current('outOfStock')); setResultStatus('error'); return prev;
      }
      const updated = [...prev];
      updated[itemIndex] = { ...item, count: value };
      return updated;
    });
  }, []);

  const handleSearchInput = useCallback(
    async (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && manualBarcode.trim()) {
        const query   = manualBarcode.trim();
        const product = await getProductByBarcodeOrName(isLikelyBarcode(query) ? query : normalizeText(query));
        if (product) await addToSales(product, 1);
        else { setResultText(tRef.current('productNotFound')); setResultStatus('error'); }
        setManualBarcode('');
      }
    },
    [manualBarcode, getProductByBarcodeOrName, addToSales]
  );

  const startScanner = (deviceId: string) => {
    if (!videoRef.current) return;
    codeReader.current.reset();
    codeReader.current.decodeFromVideoDevice(deviceId, videoRef.current, async (result) => {
      if (result && scannerActiveRef.current) {
        setScannerActive(false);
        codeReader.current.reset();
        const scanned = result.getText().trim();
        setResultText(`Barcode: ${scanned}`);
        setResultStatus('success');
        const product = await getProductByBarcodeOrName(scanned);
        if (product) await addToSales(product, 1);
        else { setResultText(tRef.current('productNotFound')); setResultStatus('error'); }
        setShowCamera(false);
        setTimeout(() => setScannerActive(false), 500);
      }
    });
  };

  const finalizeSale = useCallback(async (paymentMethod = 'naqd') => {
    const login = loginRef.current;
    if (!login || login === 'unknown') { alert('Login topilmadi'); return; }
    if (sales.length === 0) { alert('Savat bo\'sh'); return; }
    const hasInsufficientStock = sales.some(item => item.source === 'user' && item.count > (item.maxQuantity || 0));
    if (hasInsufficientStock) { setResultText(tRef.current('outOfStock')); setResultStatus('error'); return; }

    const timestampISO = new Date().toISOString();
    try {
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
            name: String(item.name),
            quantity: Number(item.count),
            price: Number(item.price),
            category: item.category || '',
            total: Number(item.price) * Number(item.count),
            soldAt: timestampISO,
            login,
            paymentMethod,
          });
        }
      });
      const payload = Array.from(groupedSales.values());

      if (navigator.onLine) {
        const res = await api(`/api/sell-product/${login}`, { method: 'POST', body: JSON.stringify({ sales: payload }) });
        if (!res.ok) await addReportSafe(payload, timestampISO);
      } else {
        await addReportSafe(payload, timestampISO);
      }

      const updatedIdb = [...idbProductsRef.current];
      for (const item of payload) {
        const idx = updatedIdb.findIndex(p => p.barcode === item.barcode);
        if (idx !== -1) {
          const newQty    = Math.max(0, (updatedIdb[idx].quantity || 0) - item.quantity);
          updatedIdb[idx] = { ...updatedIdb[idx], quantity: newQty };
          await saveToIDB(updatedIdb[idx]);
        }
      }
      setIdbProducts(updatedIdb);
      idbProductsRef.current = updatedIdb;

      sessionStorage.removeItem('sales');
      setSales([]);
      setResultText('Sotuv amalga oshirildi');
      setResultStatus('success');
      window.dispatchEvent(new Event('saleAdded'));
      setTimeout(() => navigate('/sales'), 1000);
    } catch (err) {
      console.error(err);
      setResultText('Sotuv amalga oshmadi');
      setResultStatus('error');
    }
  }, [sales, navigate]);

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

  // --- Status icon -----------------------------------------------------
  const StatusIcon = () => {
    if (resultStatus === 'success') return <Check size={15} />;
    if (resultStatus === 'error')   return <X     size={15} />;
    return <Search size={15} />;
  };

  // --- Printer status class ---------------------------------------------
  const printerRowClass = checkingPrinter
    ? 'printer-status-row printer-chk'
    : printerConnected
      ? 'printer-status-row printer-ok'
      : 'printer-status-row printer-no';

  const printerStatusText = checkingPrinter
    ? 'Tekshirilmoqda...'
    : printerConnected
      ? ` ${printerModel || 'Printer ulangan '}`
      : 'Printer ulanmagan';

  // ---------------------------------------------------------------------
  return (
    <>
      <style>{styles}</style>
      <div className="pos-root">
        <MainLayout
          theme={theme}
          userImage={userImage}
          handleImageUpload={handleImageUpload}
          title={t('salesTerminal')}
        >
          <div style={{ maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
            {/* --- Top row: Search input + JAMMI --------------------------- */}
            <div className="pos-search-row">
              {/* Search */}
              <div className="pos-search-wrap">
                <Search
                  size={20}
                  style={{
                    position: 'absolute', left: 16,
                    top: '50%', transform: 'translateY(-50%)',
                    color: '#64748b', pointerEvents: 'none',
                  }}
                />
                <input
                  ref={searchRef}
                  className="search-input"
                  type="text"
                  placeholder="Barkod raqamini yoki nomini kiriting"
                  value={manualBarcode}
                  onChange={e => setManualBarcode(e.target.value)}
                  onKeyDown={handleSearchInput}
                  autoFocus
                />
              </div>

              {/* JAMMI --- search bilan balandligi teng (height: 52px) */}
              <div className="jammi-box">
                JAMMI:&nbsp;<span style={{ color: '#a5b4fc' }}>{format(totalPrice)}</span>
              </div>
            </div>

            {/* --- Main grid ------------------------------------------- */}
            <div className="pos-main-grid">

              {/* LEFT: status + cart */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1, minWidth: 0 }}>

                {/* Status bar */}
                <div className={`status-block ${
                  resultStatus === 'success' ? 'status-ok'
                  : resultStatus === 'error' ? 'status-error'
                  : 'status-info'
                }`}>
                  <StatusIcon />
                  <span style={{ fontSize: 15, fontWeight: 500, fontFamily: "'Outfit', sans-serif" }}>{resultText}</span>
                </div>

                {/* Cart table */}
                <div className="cart-card">
                  <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 340px)', minHeight: '300px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 650 }}>
                      <thead>
                        <tr style={{ background: '#1e293b', position: 'sticky', top: 0, zIndex: 10 }}>
                          {['MAHSULOT NOMI', 'SHTRIX-KOD', 'SONI', 'NARXI', 'UMUMIY'].map((h, i) => (
                            <th key={h} style={{
                              padding: '16px 20px',
                              textAlign: i === 0 || i === 1 ? 'left' : 'center',
                              fontSize: 13,
                              fontWeight: 600,
                              color: '#94a3b8',
                              letterSpacing: '0.5px',
                              textTransform: 'uppercase',
                              fontFamily: "'Outfit', sans-serif",
                              background: '#1e293b'
                            }}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sales.length === 0 ? (
                          <tr>
                            <td colSpan={5} style={{
                              padding: '80px 20px',
                              textAlign: 'center',
                              color: '#4b5563',
                              fontSize: 15,
                              fontFamily: "'Outfit', sans-serif",
                            }}>
                              <Search size={40} style={{ margin: '0 auto 16px', display: 'block', opacity: 0.2 }} />
                              Savat bo'sh — mahsulot qidiring yoki barkod o'qiting
                            </td>
                          </tr>
                        ) : sales.map(item => (
                          <tr key={item.barcode} className="cart-row" style={{ transition: 'background 0.15s' }}>
                            <td style={{
                              padding: '14px 20px', borderBottom: '1px solid #1e293b',
                              fontSize: 15, color: '#e2e8f0', maxWidth: 300,
                              fontFamily: "'Outfit', sans-serif", fontWeight: 500,
                            }}>
                              {item.name}
                            </td>
                            <td style={{
                              padding: '14px 20px', borderBottom: '1px solid #1e293b',
                              fontFamily: 'monospace', fontSize: 14, color: '#6366f1', fontWeight: 600,
                            }}>
                              {item.barcode}
                            </td>
                            <td style={{ padding: '14px 20px', borderBottom: '1px solid #1e293b', textAlign: 'center' }}>
                              <input
                                className="qty-input"
                                type="number" min="0" value={item.count}
                                onChange={e => updateCount(item.barcode, Number(e.target.value))}
                              />
                            </td>
                            <td style={{
                              padding: '14px 20px', borderBottom: '1px solid #1e293b', textAlign: 'center',
                              fontFamily: "'JetBrains Mono', monospace", fontSize: 14, color: '#94a3b8',
                            }}>
                              {format(item.price)}
                            </td>
                            <td style={{
                              padding: '14px 20px', borderBottom: '1px solid #1e293b', textAlign: 'center',
                              fontFamily: "'JetBrains Mono', monospace", fontSize: 15, fontWeight: 700, color: '#f8fafc',
                            }}>
                              {format(item.count * item.price)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* RIGHT: action panel (Desktop) */}
              <div className="pos-right-col">
                {/* 1. QR Scan */}
                <button
                  className={`qr-scan-block pos-btn pos-right-full ${showCamera ? 'active' : ''}`}
                  onClick={() => setShowCamera(v => !v)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{
                      width: 42, height: 42, borderRadius: 10,
                      background: showCamera ? 'rgba(102,126,234,0.25)' : 'rgba(102,126,234,0.1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'background 0.2s', flexShrink: 0,
                    }}>
                      <ScanLine size={20} color={showCamera ? '#a5b4fc' : '#667eea'} />
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{
                        fontSize: 15, fontWeight: 700,
                        color: showCamera ? '#a5b4fc' : '#e2e8f0',
                        fontFamily: "'Outfit', sans-serif",
                      }}>
                        QR Scan
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 1, fontFamily: "'Outfit', sans-serif" }}>
                        {showCamera ? 'Kamera yoqilgan' : 'Kamerani yoqish'}
                      </div>
                    </div>
                  </div>
                </button>

                {/* Camera preview */}
                {showCamera && (
                  <div className={isMobile ? "cam-preview-mobile" : "cam-preview pos-right-full"}>
                    {isMobile && (
                      <>
                        <button className="cam-close-btn" onClick={() => setShowCamera(false)}>
                          <X size={24} />
                        </button>
                        <div className="cam-overlay">
                          <div className="scan-square">
                            <div className="scan-line-anim" />
                          </div>
                          <div style={{ marginTop: 24, color: '#fff', fontSize: 16, fontWeight: 500, fontFamily: "'Outfit', sans-serif", textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                            Barkodni kvadrat ichiga joylashtiring
                          </div>
                        </div>
                      </>
                    )}
                    <video
                      ref={videoRef}
                      autoPlay muted playsInline
                      style={{
                        width: '100%', display: 'block',
                        transform: 'scaleX(-1)',
                        borderRadius: isMobile ? 0 : 14,
                      }}
                    />
                    {!isMobile && (
                      <div style={{
                        position: 'absolute', inset: 0, pointerEvents: 'none',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <div className="scanning" style={{
                          width: 80, height: 80,
                          border: '2px solid rgba(102,126,234,0.7)', borderRadius: 8,
                        }} />
                      </div>
                    )}
                  </div>
                )}

                <div className="divider" />

                <PrinterButton
                  sales={sales}
                  totalPrice={totalPrice}
                  theme={theme}
                  t={t}
                  finalizeSale={finalizeSale}
                  setResultText={setResultText}
                  setResultStatus={setResultStatus}
                  socket={socket}
                  listenF8={true}
                  printerConnected={printerConnected}
                  printerModel={printerModel}
                  checkingPrinter={checkingPrinter}
                  customContent={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{
                        width: 42, height: 42, borderRadius: 10, flexShrink: 0,
                        background: 'rgba(6,182,212,0.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Printer size={20} color="#06b6d4" />
                      </div>
                      <div style={{ textAlign: 'left', overflow: 'hidden' }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0', fontFamily: "'Outfit', sans-serif" }}>
                          Chek Chop Etish <span className="kbd">F8</span>
                        </div>
                        <div style={{ 
                          fontSize: 11, 
                          color: printerStatusText.includes('(OK)') ? '#10b981' : '#64748b', 
                          marginTop: 1, 
                          fontFamily: "'Outfit', sans-serif",
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {printerStatusText}
                        </div>
                      </div>
                    </div>
                  }
                />

                <div className="divider" />

                <button className="payment-btn naqd pos-btn" onClick={() => finalizeSale('naqd')} style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 10, flexShrink: 0, background: 'rgba(16,185,129,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Wallet size={20} color="#10b981" />
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0', fontFamily: "'Outfit', sans-serif" }}>Naqd <span className="kbd">F9</span></div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 1, fontFamily: "'Outfit', sans-serif" }}>Naqd pul orqali sotuv</div>
                    </div>
                  </div>
                </button>

                <button className="payment-btn plastik pos-btn" onClick={() => finalizeSale('plastik')} style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 10, flexShrink: 0, background: 'rgba(102,126,234,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <CreditCard size={20} color="#667eea" />
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0', fontFamily: "'Outfit', sans-serif" }}>Plastik <span className="kbd">F10</span></div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 1, fontFamily: "'Outfit', sans-serif" }}>Karta orqali sotuv</div>
                    </div>
                  </div>
                </button>

                <button className="payment-btn qarz pos-btn" onClick={() => finalizeSale('qarz')} style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 10, flexShrink: 0, background: 'rgba(245,158,11,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <DollarSign size={20} color="#f59e0b" />
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0', fontFamily: "'Outfit', sans-serif" }}>Qarz</div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 1, fontFamily: "'Outfit', sans-serif" }}>Qarzga berish</div>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* --- Mobile Bottom Bar --- */}
            <div className="mobile-bottom-bar" style={{ display: window.innerWidth <= 900 ? 'block' : 'none' }}>
              {/* Jami Summa Row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, padding: '0 4px' }}>
                <div style={{ fontSize: 14, color: '#94a3b8', fontFamily: "'Outfit', sans-serif", fontWeight: 500 }}>Jami summa:</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#a5b4fc', fontFamily: "'JetBrains Mono', monospace" }}>{format(totalPrice)}</div>
              </div>

              {/* Scrollable Row: Qarz & Plastik (Yonga chiqsin) */}
              <div className="bottom-bar-scroll" style={{ display: 'flex', gap: 10, overflowX: 'auto', marginBottom: 12, paddingBottom: 4 }}>
                <button 
                  onClick={() => finalizeSale('plastik')} 
                  style={{ background: 'rgba(79, 70, 229, 0.2)', color: '#818cf8', border: '1px solid rgba(129, 140, 248, 0.3)', borderRadius: 10, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', flexShrink: 0 }}
                >
                  <CreditCard size={16} />
                  <span style={{ fontSize: 13, fontWeight: 600, fontFamily: "'Outfit', sans-serif" }}>Plastik</span>
                </button>
                <button 
                  onClick={() => finalizeSale('qarz')} 
                  style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', border: '1px solid rgba(251, 191, 36, 0.3)', borderRadius: 10, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', flexShrink: 0 }}
                >
                  <DollarSign size={16} />
                  <span style={{ fontSize: 13, fontWeight: 600, fontFamily: "'Outfit', sans-serif" }}>Qarz</span>
                </button>
              </div>

              {/* Main Action Row: Qr Scanner, Printer Scanner, Naqd (Asosiylari) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <button 
                  onClick={() => setShowCamera(v => !v)} 
                  style={{ 
                    background: showCamera ? '#4f46e5' : '#1e293b', 
                    color: '#fff', border: 'none', borderRadius: 14, padding: '14px 10px', 
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                  }}
                >
                  <ScanLine size={24} />
                  <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "'Outfit', sans-serif", whiteSpace: 'nowrap' }}>Qr Scanner</span>
                </button>
                
                <button 
                  onClick={() => window.dispatchEvent(new CustomEvent('pos:chek'))}
                  style={{ 
                    background: '#06b6d4', 
                    color: '#fff', border: 'none', borderRadius: 14, padding: '14px 10px', 
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(6,182,212,0.2)'
                  }}
                >
                  <Printer size={24} />
                  <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "'Outfit', sans-serif", whiteSpace: 'nowrap' }}>Printer</span>
                  <span style={{ fontSize: 9, opacity: 0.9 }}>{printerConnected ? '(OK)' : 'Yo\'q'}</span>
                </button>

                <button 
                  onClick={() => finalizeSale('naqd')} 
                  style={{ 
                    background: '#10b981', 
                    color: '#fff', border: 'none', borderRadius: 14, padding: '14px 10px', 
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(16,185,129,0.2)'
                  }}
                >
                  <Wallet size={24} />
                  <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "'Outfit', sans-serif", whiteSpace: 'nowrap' }}>Naqd</span>
                </button>
              </div>
            </div>
          </div>
        </MainLayout>
      </div>
    </>
  );
}

const Scanner: React.FC = () => (
  <TranslationProvider>
    <ScannerContent />
  </TranslationProvider>
);

export default Scanner;