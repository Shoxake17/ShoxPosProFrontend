import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BrowserMultiFormatReader } from '@zxing/library';
import { useNavigate } from 'react-router-dom';
import {
  Search, Check, X,
  CreditCard, Wallet, Printer, ScanLine,
  Package,
} from 'lucide-react';

import { useTranslation } from 'react-i18next';

import {
  getAllFromIDB,
  saveToIDB,
  openReportsDB,
} from '../hooks/useProductSync';

import { api } from '../utils/api';
import axiosInstance from '../api/axiosInstance';
import MainLayout from '../components/layout/MainLayout';
import { useCurrency } from '../context/CurrencyContext';
import { getSocket } from '../utils/socket';
import { getSessionLogin } from '../utils/clientSession';
import PrinterButton from '../components/PrinterButton';

import ScannerMobileBar, { mobileBottomBarStyles } from '../components/scanner/mobile/ScannerMobileBar';
import ScannerMobileCamera, { mobileCameraStyles } from '../components/scanner/mobile/ScannerMobileCamera';
import ScannerMobileCart, { mobileCartStyles } from '../components/scanner/mobile/ScannerMobileCart';

// ─── IndexedDB Reports yordamchi ──────────────────────────────────────────────
const REPORTS_STORE = 'reports';

async function addReportSafe(items: any[], soldAt: string): Promise<void> {
  try {
    const db = await openReportsDB();
    if (!db.objectStoreNames.contains(REPORTS_STORE)) {
      db.close();
      console.warn('reports store topilmadi');
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

// ─── useResponsive hook ───────────────────────────────────────────────────────
function useResponsive() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 900);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 900);
    window.addEventListener('resize', handler);
    window.addEventListener('orientationchange', handler);
    return () => {
      window.removeEventListener('resize', handler);
      window.removeEventListener('orientationchange', handler);
    };
  }, []);
  return { isMobile };
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = `
  .pos-root {
    display: flex;
    flex-direction: column;
    width: 100%;
    align-items: stretch;
    justify-content: flex-start;
    padding-top: 5px;
    padding-left: 0;
    padding-right: 0;
    margin: 0;
  }

  .pos-root > div {
    width: 100%;
    max-width: 100% !important;
    margin: 0 auto;
  }

  .pos-main-grid {
    display: grid;
    grid-template-columns: 1fr 268px;
    gap: 16px;
    align-items: start;
    width: 100%;
    padding: 0 10px;
  }

  .pos-right-col {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .desktop-cart-col {
    display: flex;
    flex-direction: column;
    gap: 12px;
    flex: 1;
    min-width: 0;
  }

  .switch { position: relative; display: inline-block; width: 46px; height: 24px; }
  .switch input { opacity: 0; width: 0; height: 0; }
  .slider { position: absolute; cursor: pointer; inset: 0; background: #2a3144; transition: .3s; border-radius: 24px; }
  .slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px; background: white; transition: .3s; border-radius: 50%; }
  input:checked + .slider { background: #667eea; }
  input:checked + .slider:before { transform: translateX(22px); }

  .pos-btn { cursor: pointer; border: none; outline: none; transition: all 0.2s ease; }
  .pos-btn:hover  { transform: translateY(-1px); }
  .pos-btn:active { transform: translateY(0); }

  .pos-search-row { display: grid; grid-template-columns: 1fr 268px; gap: 16px; margin-bottom: 16px; }
  .pos-search-wrap {
    position: relative;
    min-width: 0;
    overflow: hidden;
    width: 100%;
}

  .search-input {
    width: 100%;
    box-sizing: border-box;
    height: 52px;
    padding: 0 14px 0 48px;
    background: #111827;
    border: 1px solid #1e293b;
    border-radius: 14px;
    color: #e2e8f0;
    font-size: 15px;
    font-family: monospace;
    outline: none;
    transition: border-color 0.2s, background 0.2s, color 0.2s;
}

  .search-input:focus { border-color: #667eea; background: #131d35; }
  .search-input::placeholder { color: #4b5563; }

  .jammi-box {
    height: 52px; padding: 0 22px; background: #111827; border: 1px solid #1e293b;
    border-radius: 14px; font-family: 'JetBrains Mono', monospace; font-size: 17px;
    font-weight: 700; color: #667eea; white-space: nowrap; letter-spacing: 1px;
    display: flex; align-items: center;
    transition: background 0.2s, border-color 0.2s, color 0.2s;
  }

  .payment-btn {
    border-radius: 14px; padding: 0; cursor: pointer;
    border: 1px solid #1e2740; transition: all 0.2s;
    background: #111827; width: 100%;
  }
  .payment-btn:hover          { border-color: #667eea; background: #131d35; transform: translateY(-1px); box-shadow: 0 4px 16px rgba(102,126,234,0.12); }
  .payment-btn.naqd:hover     { border-color: #10b981; background: #0d1e18; }
  .payment-btn.plastik:hover  { border-color: #667eea; background: #131d35; }
  .payment-btn.qarz:hover     { border-color: #f59e0b; background: #1c1508; }

  .qr-scan-block {
    border-radius: 14px; border: 1px solid #1e2740; background: #111827;
    transition: all 0.2s; cursor: pointer; width: 100%; padding: 14px 16px;
  }
  .qr-scan-block:hover  { border-color: #667eea; background: #131d35; transform: translateY(-1px); box-shadow: 0 4px 16px rgba(102,126,234,0.15); }
  .qr-scan-block.active { border-color: #667eea; background: #131d35; box-shadow: 0 0 20px rgba(102,126,234,0.2); }

  .kbd {
    display: inline-block; background: #1e2740; color: #94a3b8;
    border-radius: 5px; font-size: 10px; font-family: monospace;
    padding: 2px 6px; margin-left: 4px; vertical-align: middle;
  }

  .qty-input {
    width: 68px; padding: 7px 8px; border-radius: 8px;
    background: #0b0f1a; border: 1px solid #1e2740;
    color: #e2e8f0; font-family: monospace; font-size: 13px;
    text-align: center; outline: none;
    transition: background 0.2s, border-color 0.2s, color 0.2s;
  }

  .status-block {
    border-radius: 14px; border: 1px solid #1e2740; background: #111827;
    display: flex; align-items: center; gap: 10px; padding: 14px 18px;
    font-size: 14px; font-weight: 500; min-height: 0px;
    transition: background 0.2s, border-color 0.2s;
  }
  .status-info  { border-color: rgba(102,126,234,0.3); color: #667eea; background: rgba(102,126,234,0.07); }
  .status-ok    { border-color: rgba(16,185,129,0.3);  color: #10b981; background: rgba(16,185,129,0.07); }
  .status-error { border-color: rgba(239,68,68,0.3);   color: #ef4444; background: rgba(239,68,68,0.07); }

  .cart-card {
    background: #111827; border-radius: 20px; border: 1px solid #1e293b;
    overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.15);
    flex: 1; display: flex; flex-direction: column;
    transition: background 0.2s, border-color 0.2s;
  }

  .cart-table-head { background: #1e293b; }
  .cart-table-head th {
    padding: 16px 20px; font-size: 13px; font-weight: 600; color: #94a3b8;
    letter-spacing: 0.5px; text-transform: uppercase;
    font-family: 'Outfit', sans-serif; background: #1e293b;
    white-space: nowrap; transition: background 0.2s, color 0.2s;
  }

  .cart-row-cell-name {
    padding: 14px 20px; border-bottom: 1px solid #1e293b;
    font-size: 15px; color: #e2e8f0; max-width: 200px;
    font-family: 'Outfit', sans-serif; font-weight: 500;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    transition: color 0.2s, border-color 0.2s;
  }
  .cart-row-cell-barcode {
    padding: 14px 20px; border-bottom: 1px solid #1e293b;
    font-family: monospace; font-size: 14px; color: #6366f1; font-weight: 600;
    transition: border-color 0.2s;
  }
  .cart-row-cell-qty {
    padding: 14px 20px; border-bottom: 1px solid #1e293b; text-align: center;
    transition: border-color 0.2s;
  }
  .cart-row-cell-price {
    padding: 14px 20px; border-bottom: 1px solid #1e293b; text-align: center;
    font-family: 'JetBrains Mono', monospace; font-size: 14px; color: #94a3b8;
    white-space: nowrap; transition: color 0.2s, border-color 0.2s;
  }
  .cart-row-cell-subtotal {
    padding: 14px 20px; border-bottom: 1px solid #1e293b; text-align: center;
    font-family: 'JetBrains Mono', monospace; font-size: 15px; font-weight: 700;
    color: #f8fafc; white-space: nowrap; transition: color 0.2s, border-color 0.2s;
  }
  .cart-empty-cell {
    padding: 80px 20px; text-align: center;
    color: #4b5563; font-size: 15px; font-family: 'Outfit', sans-serif;
  }

  .cam-preview {
    background: #0d1220; border: 1px solid #1e2740;
    border-radius: 14px; overflow: hidden; position: relative;
  }
  .cam-preview video { width: 100%; display: block; border-radius: 14px; }

  @keyframes pulse-ring {
    0%,100% { opacity: .5; transform: scale(1); }
    50%      { opacity: 1;  transform: scale(1.03); }
  }
  .scanning { animation: pulse-ring 1.5s ease-in-out infinite; }

  .divider {
    height: 1px;
    background: linear-gradient(90deg, transparent, #1e2740 20%, #1e2740 80%, transparent);
    margin: 2px 0;
  }

  /* ── Light theme ── */
  [data-theme="light"] .search-input {
    background: #ffffff; border: 1px solid #d1d5db; color: #111827;
  }
  [data-theme="light"] .search-input:focus  { border-color: #667eea; background: #f5f7ff; }
  [data-theme="light"] .search-input::placeholder { color: #9ca3af; }
  [data-theme="light"] .jammi-box { background: #ffffff; border: 1px solid #d1d5db; color: #4f46e5; }
  [data-theme="light"] .payment-btn { background: #ffffff; border: 1px solid #e5e7eb; }
  [data-theme="light"] .payment-btn:hover         { background: #f5f7ff; border-color: #667eea; }
  [data-theme="light"] .payment-btn.naqd:hover    { background: #f0fdf4; border-color: #10b981; }
  [data-theme="light"] .payment-btn.plastik:hover { background: #f5f7ff; border-color: #667eea; }
  [data-theme="light"] .payment-btn.qarz:hover    { background: #fffbeb; border-color: #f59e0b; }
  [data-theme="light"] .qr-scan-block { background: #ffffff; border: 1px solid #e5e7eb; }
  [data-theme="light"] .qr-scan-block:hover  { background: #f5f7ff; border-color: #667eea; }
  [data-theme="light"] .qr-scan-block.active { background: #f5f7ff; border-color: #667eea; }
  [data-theme="light"] .kbd { background: #e5e7eb; color: #6b7280; }
  [data-theme="light"] .qty-input { background: #f9fafb; border: 1px solid #d1d5db; color: #111827; }
  [data-theme="light"] .status-block { background: #f9fafb; border: 1px solid #e5e7eb; }
  [data-theme="light"] .status-info  { border-color: rgba(102,126,234,0.4); color: #4f46e5; background: rgba(102,126,234,0.06); }
  [data-theme="light"] .status-ok    { border-color: rgba(16,185,129,0.4);  color: #059669; background: rgba(16,185,129,0.06); }
  [data-theme="light"] .status-error { border-color: rgba(239,68,68,0.4);   color: #dc2626; background: rgba(239,68,68,0.06); }
  [data-theme="light"] .cart-card { background: #ffffff; border: 1px solid #e5e7eb; box-shadow: 0 4px 16px rgba(0,0,0,0.06); }
  [data-theme="light"] .cart-table-head    { background: #f3f4f6; }
  [data-theme="light"] .cart-table-head th { background: #f3f4f6; color: #6b7280; }
  [data-theme="light"] .cart-row-cell-name     { border-bottom: 1px solid #f3f4f6; color: #111827; }
  [data-theme="light"] .cart-row-cell-barcode  { border-bottom: 1px solid #f3f4f6; color: #4f46e5; }
  [data-theme="light"] .cart-row-cell-qty      { border-bottom: 1px solid #f3f4f6; }
  [data-theme="light"] .cart-row-cell-price    { border-bottom: 1px solid #f3f4f6; color: #6b7280; }
  [data-theme="light"] .cart-row-cell-subtotal { border-bottom: 1px solid #f3f4f6; color: #111827; }
  [data-theme="light"] .cart-empty-cell        { color: #9ca3af; }
  [data-theme="light"] .divider {
    background: linear-gradient(90deg, transparent, #e5e7eb 20%, #e5e7eb 80%, transparent);
  }

  /* ── Media query ── */
  @media (max-width: 900px) {
    .pos-root > div      { max-width: 100%; }
    .pos-search-row      { grid-template-columns: 1fr; }
    .jammi-box           { display: none; }
    .pos-main-grid       { grid-template-columns: 1fr; padding: 0 6px; }
    .pos-right-col       { display: none !important; }
    .desktop-cart-col    { display: none !important; }
  }
`;

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
function ScannerContent() {
  const { isMobile } = useResponsive();
  const { t } = useTranslation(['scanner', 'common']);
  const { format } = useCurrency();
  const navigate = useNavigate();

  const loginRef = useRef<string>(getSessionLogin() || 'unknown');
  const tRef     = useRef(t);
  useEffect(() => { tRef.current = t; }, [t]);

  // ── State ──────────────────────────────────────────────────────────────────
  const [sales, setSales] = useState<any[]>(
    () => JSON.parse(sessionStorage.getItem('pharmSales') || '[]'),
  );
  const [resultText, setResultText]     = useState(t('ready') || 'Tayyor');
  const [resultStatus, setResultStatus] = useState<'info' | 'success' | 'error'>('info');
  const [totalPrice, setTotalPrice]     = useState(0);

  const [cameraDevices, setCameraDevices]   = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string | null>(null);
  const selectedCameraRef = useRef<string | null>(null);
  useEffect(() => { selectedCameraRef.current = selectedCamera; }, [selectedCamera]);

  const [manualBarcode, setManualBarcode] = useState('');
  const [showCamera, setShowCamera]       = useState(false);
  const [userImage, setUserImage]         = useState<string | null>(null);
  const [theme, setTheme]                 = useState<'dark' | 'light'>('dark');

  const [printerConnected, setPrinterConnected] = useState<boolean | null>(null);
  const [printerModel, setPrinterModel]         = useState<string>('');
  const [checkingPrinter, setCheckingPrinter]   = useState(false);

  const [idbProducts, setIdbProducts] = useState<any[]>([]);
  const idbProductsRef = useRef<any[]>([]);

  // ── Refs ───────────────────────────────────────────────────────────────────
  const videoRef         = useRef<HTMLVideoElement>(null);
  const codeReader       = useRef(new BrowserMultiFormatReader());
  const scannerRunning   = useRef(false);
  const searchRef        = useRef<HTMLInputElement>(null);

  const socket = getSocket();

  // ── idbProducts ref sync ───────────────────────────────────────────────────
  useEffect(() => { idbProductsRef.current = idbProducts; }, [idbProducts]);

  // ── Theme & userImage (bir marta mount'da) ────────────────────────────────
  useEffect(() => {
    const savedImage = localStorage.getItem('userImage');
    if (savedImage) setUserImage(savedImage);

    const savedTheme = (localStorage.getItem('theme') as 'dark' | 'light') || 'dark';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);

    setResultText(t('ready'));
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // ── IDB cache ─────────────────────────────────────────────────────────────
  const loadIdbCache = useCallback(async () => {
    const products = await getAllFromIDB(loginRef.current);
    setIdbProducts(products);
    idbProductsRef.current = products;
  }, []);

  // ── Kamera qurilmalarini aniqlash ─────────────────────────────────────────
  useEffect(() => {
    openReportsDB().catch(err => console.warn('ReportsDB ochishda xato:', err));
    loadIdbCache();

    return () => {
      codeReader.current.reset();
    };
  }, [loadIdbCache]);

  // ── startScanner ────────────────────────────────────────────────────────────
  const startScanner = useCallback((deviceId: string) => {
    if (!videoRef.current) return;
    if (scannerRunning.current) return;

    codeReader.current.reset();
    scannerRunning.current = true;

    codeReader.current.decodeFromVideoDevice(
      deviceId,
      videoRef.current,
      async (result) => {
        if (result && scannerRunning.current) {
          scannerRunning.current = false;
          codeReader.current.reset();

          const scanned = result.getText().trim();
          setResultText(`Barcode: ${scanned}`);
          setResultStatus('info');

          const product = await getProductByBarcodeOrName(scanned);
          if (product) {
            await addToSales(product, 1);
          } else {
            setResultText(tRef.current('productNotFound'));
            setResultStatus('error');
          }
          setShowCamera(false);
        }
      },
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ INSTANT CAMERA TOGGLE
  useEffect(() => {
  if (showCamera) {
    const deviceId = selectedCameraRef.current;
    if (deviceId && videoRef.current) {
      scannerRunning.current = false;
      codeReader.current.reset();
      startScanner(deviceId);
    }
  }
}, [showCamera]);

  // ── Sales → sessionStorage & total ───────────────────────────────────────
  useEffect(() => {
    sessionStorage.setItem('pharmSales', JSON.stringify(sales));
    const total = sales.reduce((sum, item) => sum + item.count * item.price, 0);
    setTotalPrice(total);
  }, [sales]);

  // ── Socket ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const s = getSocket();
    if (!s.connected) s.connect();

    const handlePrintSuccess = (data: any) => {
      setResultText(`${tRef.current('checkPrintedSuccessfully')} (${data.login})`);
      setResultStatus('success');
    };
    const handlePrintError = (data: any) => {
      setResultText(`${tRef.current('errorPrefix')}: ${data.message}`);
      setResultStatus('error');
    };
    s.on('print-success', handlePrintSuccess);
    s.on('print-error',   handlePrintError);
    return () => {
      s.off('print-success', handlePrintSuccess);
      s.off('print-error',   handlePrintError);
    };
  }, []);

  // ── stopCamera helper ────────────────────────────────────────────────────
const stopCamera = useCallback(() => {
  scannerRunning.current = false;
  codeReader.current.reset();

  if (videoRef.current?.srcObject) {
    const stream = videoRef.current.srcObject as MediaStream;
    stream.getTracks().forEach(track => {
      track.enabled = false;
      track.stop();
    });
    videoRef.current.srcObject = null;
  }

  navigator.mediaDevices?.getUserMedia({ video: false }).catch(() => {});
}, []);

  // ── Printer status ────────────────────────────────────────────────────────
  const checkPrinterStatus = useCallback(async () => {
    setCheckingPrinter(true);
    try {
      const res  = await fetch('/api/printer/check-printer');
      const data = await res.json();
      setPrinterConnected(data.connected);
      setPrinterModel(data.connected ? (data.model || 'USB Thermal Printer') : '');
    } catch {
      setPrinterConnected(false);
      setPrinterModel('');
    } finally {
      setCheckingPrinter(false);
    }
  }, []);

  useEffect(() => {
    checkPrinterStatus();
    const interval = setInterval(checkPrinterStatus, 60000);
    return () => clearInterval(interval);
  }, [checkPrinterStatus]);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F8')  { e.preventDefault(); window.dispatchEvent(new CustomEvent('pos:chek')); }
      if (e.key === 'F9')  { e.preventDefault(); finalizeSale('naqd'); }
      if (e.key === 'F10') { e.preventDefault(); finalizeSale('plastik'); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sales]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const normalizeText   = (text: string) => text.toLowerCase().trim().replace(/\s+/g, ' ');
  const isLikelyBarcode = (query: string): boolean => /^\d{4,}$/.test(query.trim());

  // ── getProductByBarcodeOrName ─────────────────────────────────────────────
  const getProductByBarcodeOrName = useCallback(
    async (query: string): Promise<any | null> => {
      query = query.trim();
      if (!query) return null;

      const q          = query.toLowerCase();
      const login      = loginRef.current;
      const barcodeMode = isLikelyBarcode(query);

      const localProducts = idbProductsRef.current.length > 0
        ? idbProductsRef.current
        : await getAllFromIDB(login);

      const foundLocal = localProducts.find((p: any) => {
        const barcodeMatch = String(p.barcode).toLowerCase() === q;
        const nameMatch    = !barcodeMode && p.name && p.name.toLowerCase().includes(q);
        return barcodeMatch || nameMatch;
      });
      if (foundLocal) return { ...foundLocal, source: 'user' };

      if (navigator.onLine) {
        try {
          const res = await fetch(
            `/api/pharmacy/search?q=${encodeURIComponent(query)}&login=${encodeURIComponent(login)}`,
          );
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
        } catch (err) { console.warn('Qidiruv xatosi:', err); }
      }
      return null;
    },
    [],
  );

  // ── addToSales ────────────────────────────────────────────────────────────
  const addToSales = useCallback(async (product: any, count = 1) => {
    const login = loginRef.current;
    if (!product) {
      setResultText(tRef.current('productNotFound')); setResultStatus('error'); return;
    }
    if (!login || login === 'unknown') {
      setResultText(tRef.current('loginNotFound')); setResultStatus('error'); return;
    }

    let productPrice = Number(product.price || 0);

    if (productPrice === 0 || product.source === 'global') {
      const userPrice = prompt(`${product.name} — ${tRef.current('enterPrice')}:`);
      if (!userPrice || isNaN(Number(userPrice)) || Number(userPrice) <= 0) {
        setResultText(tRef.current('canceled')); setResultStatus('error'); return;
      }
      productPrice = Number(userPrice);

      if (navigator.onLine) {
        try {
          await axiosInstance.post('/pharmacy/add-pharm', {
            login, barcode: product.barcode, name: product.name,
            price: productPrice, quantity: count, basePrice: 0,
            category: product.category || 'Dorilar',
            dosage: product.dosage || '',
            manufacturer: product.manufacturer || '',
          });
        } catch (err) { console.error('DB xato:', err); }
      }

      await saveToIDB({
        ...product, price: productPrice, login,
        quantity: product.source === 'global' ? count : product.quantity,
      });
      setIdbProducts(prev => {
        const exists = prev.find(p => String(p.barcode) === String(product.barcode));
        const updated = exists
          ? prev.map(p =>
              String(p.barcode) === String(product.barcode)
                ? { ...p, price: productPrice }
                : p,
            )
          : [
              ...prev,
              {
                ...product, price: productPrice, login,
                quantity: product.source === 'global' ? count : product.quantity,
              },
            ];
        idbProductsRef.current = updated;
        return updated;
      });
    }

    setSales(prev => {
      const existingIndex = prev.findIndex(s => s.barcode === product.barcode);
      if (existingIndex !== -1) {
        const existing  = prev[existingIndex];
        const newCount  = existing.count + count;
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
        return [
          ...prev,
          {
            barcode: product.barcode, name: product.name, price: productPrice,
            count, category: product.category || '',
            maxQuantity: product.source === 'user' ? product.quantity || 0 : Infinity,
            source: product.source,
          },
        ];
      }
    });

    setResultText(`${product.name} — ${count} ${tRef.current('added')} (${format(productPrice)})`);
    setResultStatus('success');
    setManualBarcode('');
  }, [format]);

  // ── updateCount ───────────────────────────────────────────────────────────
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

  // ── handleSearchInput ─────────────────────────────────────────────────────
  const handleSearchInput = useCallback(
    async (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && manualBarcode.trim()) {
        const query   = manualBarcode.trim();
        const product = await getProductByBarcodeOrName(
          isLikelyBarcode(query) ? query : normalizeText(query),
        );
        if (product) await addToSales(product, 1);
        else {
          setResultText(tRef.current('productNotFound'));
          setResultStatus('error');
        }
        setManualBarcode('');
      }
    },
    [manualBarcode, getProductByBarcodeOrName, addToSales],
  );

  // ── toggleCamera (oldingi/keyingi kamera) ─────────────────────────────────
  const toggleCamera = useCallback(() => {
    if (cameraDevices.length < 2) return;
    const currentIndex = cameraDevices.findIndex(d => d.deviceId === selectedCameraRef.current);
    const nextIndex    = (currentIndex + 1) % cameraDevices.length;
    const nextDeviceId = cameraDevices[nextIndex].deviceId;

    scannerRunning.current = false;
    codeReader.current.reset();
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }

    setSelectedCamera(nextDeviceId);
    selectedCameraRef.current = nextDeviceId;

    if (showCamera) {
      startScanner(nextDeviceId);
    }
  }, [cameraDevices, showCamera, startScanner]);

  // ── handleCameraToggle ────────────────────────────────────────────────────
  const handleCameraToggle = useCallback(async () => {
  if (!showCamera) {
    try {
      await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });

      if (cameraDevices.length === 0) {
        const devices = await codeReader.current.listVideoInputDevices();
        setCameraDevices(devices);
        if (devices.length > 0) {
          const backCamera = devices.find(d =>
            d.label.toLowerCase().includes('back') ||
            d.label.toLowerCase().includes('environment'),
          );
          const chosen = backCamera ? backCamera.deviceId : devices[0].deviceId;
          setSelectedCamera(chosen);
          selectedCameraRef.current = chosen;
        }
      }
      setShowCamera(true);
    } catch {
      setResultText(tRef.current('cameraError') || 'Kamera ruxsati rad etildi');
      setResultStatus('error');
    }
  } else {
    stopCamera();
    setShowCamera(false);
  }
}, [showCamera, cameraDevices, stopCamera]);

  // ── finalizeSale ──────────────────────────────────────────────────────────
  const finalizeSale = useCallback(async (paymentMethod = 'naqd') => {
    const login = loginRef.current;
    if (!login || login === 'unknown') { alert(tRef.current('loginNotFound')); return; }
    if (sales.length === 0)            { alert(tRef.current('cartEmpty'));      return; }

    const hasInsufficient = sales.some(
      item => item.source === 'user' && item.count > (item.maxQuantity || 0),
    );
    if (hasInsufficient) {
      setResultText(tRef.current('outOfStock')); setResultStatus('error'); return;
    }

    const timestampISO = new Date().toISOString();
    try {
      const payload = {
        login,
        items: sales.map(item => ({
          barcode: item.barcode,
          name: item.name,
          quantity: item.count,
          price: item.price,
          total: item.count * item.price,
        })),
        paymentMethod,
      };

      console.log("📤 [finalizeSale] payload:", payload);
      if (navigator.onLine) {
        try {
          const res = await axiosInstance.post('/pharmacy/sell-pharm', payload);
          console.log("✅ [finalizeSale] response:", res.data);
        } catch (err) {
          console.error('❌ [finalizeSale] xato:', err);
          await addReportSafe(payload.items, timestampISO);
        }
      } else {
        console.log("📴 [finalizeSale] Offline, addReportSafe");
        await addReportSafe(payload.items, timestampISO);
      }

      const updatedIdb = [...idbProductsRef.current];
      for (const item of payload.items) {
        const idx = updatedIdb.findIndex(p => p.barcode === item.barcode);
        if (idx !== -1) {
          const newQty = Math.max(0, (updatedIdb[idx].quantity || 0) - item.quantity);
          updatedIdb[idx] = { ...updatedIdb[idx], quantity: newQty };
          await saveToIDB(updatedIdb[idx]);
        }
      }
      setIdbProducts(updatedIdb);
      idbProductsRef.current = updatedIdb;

      sessionStorage.removeItem('pharmSales');
      setSales([]);
      setResultText(tRef.current('saleSuccess') || 'Sotuv amalga oshirildi');
      setResultStatus('success');
      window.dispatchEvent(new Event('saleAdded'));
      setTimeout(() => navigate('/pharm-sale'), 1000);
    } catch (err) {
      console.error(err);
      setResultText(tRef.current('saleFailed'));
      setResultStatus('error');
    }
  }, [sales, navigate]);

  // ── handleImageUpload ─────────────────────────────────────────────────────
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

  // ── Derived values ────────────────────────────────────────────────────────
  const printerStatusText = checkingPrinter
    ? t('checkingPrinter')
    : printerConnected
      ? `${printerModel || t('printerConnected')}`
      : t('printerNotConnected');

  const isLight = theme === 'light';
  const clr = {
    text:       isLight ? '#111827' : '#e2e8f0',
    subtext:    isLight ? '#6b7280' : '#64748b',
    textMuted:  isLight ? '#9ca3af' : '#94a3b8',
    totalColor: isLight ? '#4f46e5' : '#a5b4fc',
  };

  const StatusIcon = () => {
    if (resultStatus === 'success') return <Check size={15} />;
    if (resultStatus === 'error')   return <X size={15} />;
    return <Search size={15} />;
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{styles}</style>
      <style>{mobileBottomBarStyles}</style>
      <style>{mobileCameraStyles}</style>
      <style>{mobileCartStyles}</style>

      <div className="pos-root">
        <MainLayout
          theme={theme}
          userImage={userImage}
          handleImageUpload={handleImageUpload}
          title={t('salesTerminal')}
        >
          <div style={{ maxWidth: '1400px', margin: '0 auto', width: '100%' }}>

            {/* Search + Jammi */}
            <div className="pos-search-row">
              <div className="pos-search-wrap">
                <Search
                  size={20}
                  style={{
                    position: 'absolute', left: 16,
                    top: '50%', transform: 'translateY(-50%)',
                    color: clr.subtext, pointerEvents: 'none',
                  }}
                />
                <input
                  ref={searchRef}
                  className="search-input"
                  type="text"
                  placeholder={t('enterBarcodeOrName') || 'Barkod raqamini yoki nomini kiriting'}
                  value={manualBarcode}
                  onChange={e => setManualBarcode(e.target.value)}
                  onKeyDown={handleSearchInput}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  inputMode="text"
                  enterKeyHint="search"
                />
              </div>
              <div className="jammi-box">
                {t('total')}:&nbsp;<span style={{ color: clr.totalColor }}>{format(totalPrice)}</span>
              </div>
            </div>

            {/* Mobile savat */}
            <ScannerMobileCart
              sales={sales}
              resultText={resultText}
              resultStatus={resultStatus}
              format={format}
              updateCount={updateCount}
              t={t}
            />

            <div className="pos-main-grid">

              {/* Desktop: status + cart table */}
              <div className="desktop-cart-col">
                <div className={`status-block ${
                  resultStatus === 'success' ? 'status-ok'
                  : resultStatus === 'error'  ? 'status-error'
                  : 'status-info'
                }`}>
                  <StatusIcon />
                  <span style={{ fontSize: 15, fontWeight: 500, fontFamily: "'Outfit', sans-serif" }}>
                    {resultText}
                  </span>
                </div>

                <div className="cart-card">
                  <div style={{
                    overflowX: 'auto', overflowY: 'auto',
                    maxHeight: 'calc(100vh - 340px)', minHeight: '200px',
                  }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 500 }}>
                      <thead>
                        <tr className="cart-table-head" style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                          {[t('productName'), t('barcode'), t('quantity'), t('price'), t('subtotal')].map((h, i) => (
                            <th key={h} style={{ textAlign: i === 0 || i === 1 ? 'left' : 'center', whiteSpace: 'nowrap' }}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sales.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="cart-empty-cell">
                              <Search size={40} style={{ margin: '0 auto 16px', display: 'block', opacity: 0.2 }} />
                              {t('cartEmpty')}
                            </td>
                          </tr>
                        ) : sales.map(item => (
                          <tr key={item.barcode}>
                            <td className="cart-row-cell-name">{item.name}</td>
                            <td className="cart-row-cell-barcode">{item.barcode}</td>
                            <td className="cart-row-cell-qty">
                              <input
                                className="qty-input"
                                type="number" min="0" value={item.count}
                                onChange={e => updateCount(item.barcode, Number(e.target.value))}
                              />
                            </td>
                            <td className="cart-row-cell-price">{format(item.price)}</td>
                            <td className="cart-row-cell-subtotal">{format(item.count * item.price)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Desktop: right action panel */}
              <div className="pos-right-col">
                <button
                  className={`qr-scan-block pos-btn ${showCamera ? 'active' : ''}`}
                  onClick={handleCameraToggle}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{
                      width: 42, height: 42, borderRadius: 10, flexShrink: 0,
                      background: showCamera ? 'rgba(102,126,234,0.25)' : 'rgba(102,126,234,0.1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <ScanLine size={20} color={showCamera ? '#a5b4fc' : '#667eea'} />
                    </div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: clr.text, fontFamily: "'Outfit', sans-serif" }}>
                        {t('qrBarcode')}
                      </div>
                      <div style={{ fontSize: 12, color: clr.subtext, marginTop: 1, fontFamily: "'Outfit', sans-serif" }}>
                        {showCamera ? t('camera') : t('sellViaQrCode')}
                      </div>
                    </div>
                  </div>
                </button>

                {/* Desktop camera preview */}
                {showCamera && !isMobile && (
                  <div className="cam-preview">
                    <video ref={videoRef} autoPlay muted playsInline />
                    <div style={{
                      position: 'absolute', inset: 0, pointerEvents: 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <div className="scanning" style={{
                        width: 80, height: 80,
                        border: '2px solid rgba(102,126,234,0.7)', borderRadius: 8,
                      }} />
                    </div>
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
                        <div style={{ fontSize: 15, fontWeight: 700, color: clr.text, fontFamily: "'Outfit', sans-serif" }}>
                          {t('printReceiptTitle')} <span className="kbd">F8</span>
                        </div>
                        <div style={{
                          fontSize: 11,
                          color: printerConnected ? '#10b981' : clr.subtext,
                          marginTop: 1, fontFamily: "'Outfit', sans-serif",
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
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
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: clr.text, fontFamily: "'Outfit', sans-serif" }}>
                        {t('naqd')} <span className="kbd">F9</span>
                      </div>
                      <div style={{ fontSize: 12, color: clr.subtext, marginTop: 1, fontFamily: "'Outfit', sans-serif" }}>
                        {t('naqd')} {t('sell')}
                      </div>
                    </div>
                  </div>
                </button>

                <button className="payment-btn plastik pos-btn" onClick={() => finalizeSale('plastik')} style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 10, flexShrink: 0, background: 'rgba(102,126,234,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <CreditCard size={20} color="#667eea" />
                    </div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: clr.text, fontFamily: "'Outfit', sans-serif" }}>
                        {t('plastik')} <span className="kbd">F10</span>
                      </div>
                      <div style={{ fontSize: 12, color: clr.subtext, marginTop: 1, fontFamily: "'Outfit', sans-serif" }}>
                        {t('plastik')} {t('sell')}
                      </div>
                    </div>
                  </div>
                </button>

                <button className="payment-btn qarz pos-btn" onClick={() => finalizeSale('qarz')} style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 10, flexShrink: 0, background: 'rgba(245,158,11,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Package size={20} color="#f59e0b" />
                    </div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: clr.text, fontFamily: "'Outfit', sans-serif" }}>
                        {t('qarz')}
                      </div>
                      <div style={{ fontSize: 12, color: clr.subtext, marginTop: 1, fontFamily: "'Outfit', sans-serif" }}>
                        {t('qarz')} {t('sell')}
                      </div>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            <ScannerMobileBar
              totalPrice={totalPrice}
              format={format}
              showCamera={showCamera}
              clr={{ textMuted: clr.textMuted, totalColor: clr.totalColor }}
              t={t}
              finalizeSale={finalizeSale}
              handleCameraToggle={handleCameraToggle}
              addToSales={addToSales}
            />

          </div>
        </MainLayout>
      </div>

      {/* Mobile kamera — to'liq ekran */}
      {showCamera && isMobile && (
        <ScannerMobileCamera
          videoRef={videoRef}
          cameraDevices={cameraDevices}
          t={t}
          onClose={() => setShowCamera(false)}
          onToggleCamera={toggleCamera}
        />
      )}
    </>
  );
}

const PharmScanner: React.FC = () => <ScannerContent />;

export default PharmScanner;
