import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import MainLayout from '../components/layout/MainLayout';
import { useTranslation } from 'react-i18next';
import {
  getCategories, getCategoryEmoji,
  getUserShopCategoriesAsync, syncUserCategoriesToIDB,
} from '../components/Category';
import { Search, TrendingUp, TrendingDown, Package, DollarSign } from 'lucide-react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import axiosInstance from '../api/axiosInstance';
import { getSessionLogin } from '../utils/clientSession';
import { useCurrency } from '../context/CurrencyContext';

// ─── CSS ─────────────────────────────────────────────────────────────────────
const STYLES = (isDark: boolean) => `
  /* ── Variables ── */
  :root {
    --kb-card:     ${isDark ? '#111827' : '#ffffff'};
    --kb-card2:    ${isDark ? '#1a1f2e' : '#ffffff'};
    --kb-bdr:      ${isDark ? '#1e293b' : '#e2e8f0'};
    --kb-bdr2:     ${isDark ? '#2a3144' : '#cbd5e1'};
    --kb-sub:      #64748b;
    --kb-text:     ${isDark ? '#e2e8f0' : '#1e293b'};
    --kb-input:    ${isDark ? '#0f1420' : '#f4f6fb'};
    --kb-hover:    ${isDark ? 'rgba(255,255,255,.03)' : 'rgba(0,0,0,.02)'};
    --kb-thead:    ${isDark ? '#1e293b' : '#f8fafc'};
  }

  .kb-root { width: 100%; }

  /* ── Search + Category row ── */
  .kb-filter-row {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 14px;
    margin-bottom: 24px;
    align-items: center;
  }
  .kb-search-wrap { position: relative; }
  .kb-search-icon {
    position: absolute; left: 14px; top: 50%;
    transform: translateY(-50%); pointer-events: none;
  }
  .kb-search-input {
    width: 100%; padding: 13px 14px 13px 44px;
    border-radius: 14px;
    border: 1px solid var(--kb-bdr);
    background: var(--kb-card);
    color: var(--kb-text); font-size: 15px; outline: none;
    transition: border-color .2s;
    box-sizing: border-box;
  }
  .kb-search-input:focus { border-color: #667eea; }
  .kb-search-input::placeholder { color: var(--kb-sub); }
  .kb-cat-select {
    padding: 13px 16px; border-radius: 14px;
    border: 1px solid var(--kb-bdr);
    background: var(--kb-card);
    color: var(--kb-text); font-size: 14px; cursor: pointer; outline: none;
    white-space: nowrap;
    transition: border-color .2s;
  }
  .kb-cat-select:focus { border-color: #667eea; }

  /* ── Stat cards ── */
  .kb-stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    margin-bottom: 28px;
  }
  .kb-stat {
    background: var(--kb-card2);
    border-radius: 16px;
    padding: 20px;
    border: 1px solid var(--kb-bdr);
    transition: border-color .2s;
  }
  .kb-stat:hover { border-color: var(--kb-bdr2); }
  .kb-stat-top {
    display: flex; align-items: center;
    gap: 10px; margin-bottom: 10px;
  }
  .kb-stat-icon {
    width: 36px; height: 36px; border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .kb-stat-lbl { font-size: 13px; color: var(--kb-sub); }
  .kb-stat-val { font-size: 26px; font-weight: 700; line-height: 1.2; }

  /* ── Desktop table ── */
  .kb-table-card {
    background: var(--kb-card);
    border-radius: 20px;
    border: 1px solid var(--kb-bdr);
    overflow: hidden;
    box-shadow: 0 10px 30px rgba(0,0,0,.08);
  }
  .kb-table-scroll { overflow-x: auto; }
  .kb-table {
    width: 100%; border-collapse: collapse; min-width: 860px;
  }
  .kb-table thead tr { background: var(--kb-thead); }
  .kb-table th {
    padding: 15px 16px; text-align: left;
    font-size: 12px; color: var(--kb-sub);
    text-transform: uppercase; font-weight: 700;
    letter-spacing: .5px; white-space: nowrap;
  }
  .kb-table tbody tr {
    border-bottom: 1px solid var(--kb-bdr);
    transition: background .15s;
  }
  .kb-table tbody tr:last-child { border-bottom: none; }
  .kb-table tbody tr:hover { background: var(--kb-hover); }
  .kb-table td { padding: 14px 16px; font-size: 14px; color: var(--kb-text); }
  .kb-barcode { font-family: monospace; color: #6366f1; font-weight: 600; font-size: 13px; }
  .kb-table-input {
    width: 100px; padding: 8px 10px; border-radius: 8px;
    border: 1px solid var(--kb-bdr);
    background: var(--kb-input);
    color: var(--kb-text); text-align: center; font-size: 13px; outline: none;
    transition: border-color .2s;
  }
  .kb-table-input:focus { border-color: #667eea; }
  .kb-cat-badge {
    padding: 5px 12px; border-radius: 20px;
    font-size: 12px; font-weight: 600;
    background: rgba(99,102,241,.12); color: #818cf8;
    white-space: nowrap;
  }
  .kb-empty {
    text-align: center; padding: 60px 20px;
    color: var(--kb-sub); font-size: 15px;
  }

  /* ── Mobile: product card ── */
  .kb-mobile-list { display: none; }
  .kb-prod-card {
    background: var(--kb-card);
    border-radius: 14px;
    border: 1px solid var(--kb-bdr);
    padding: 13px;
    margin-bottom: 8px;
    transition: border-color .2s;
  }
  .kb-pc-top {
    display: flex; align-items: flex-start;
    gap: 8px; margin-bottom: 8px;
  }
  .kb-pc-num {
    width: 22px; height: 22px; border-radius: 7px;
    background: var(--kb-input);
    display: flex; align-items: center; justify-content: center;
    font-size: 10px; font-weight: 800; color: var(--kb-sub);
    flex-shrink: 0; margin-top: 1px;
  }
  .kb-pc-name {
    font-size: 13px; font-weight: 700;
    color: var(--kb-text); flex: 1; line-height: 1.35;
  }
  .kb-pc-badge {
    padding: 3px 8px; border-radius: 7px;
    font-size: 9px; font-weight: 700;
    white-space: nowrap; flex-shrink: 0;
  }
  .kb-pc-barcode {
    font-size: 10px; color: #6366f1;
    font-family: monospace; font-weight: 600;
    margin-bottom: 10px; padding-left: 30px;
  }
  .kb-pc-inputs {
    display: grid; grid-template-columns: 1fr 1fr;
    gap: 7px; margin-bottom: 10px;
  }
  .kb-inp-block {
    background: var(--kb-input);
    border: 1px solid var(--kb-bdr);
    border-radius: 9px; padding: 8px 10px;
  }
  .kb-inp-lbl {
    font-size: 9px; font-weight: 700;
    color: var(--kb-sub);
    text-transform: uppercase; letter-spacing: .4px; margin-bottom: 4px;
  }
  .kb-inp-field {
    width: 100%; background: transparent; border: none; outline: none;
    color: var(--kb-text); font-size: 14px; font-weight: 700;
    font-family: monospace;
    -moz-appearance: textfield;
  }
  .kb-inp-field::-webkit-outer-spin-button,
  .kb-inp-field::-webkit-inner-spin-button { -webkit-appearance: none; }
  .kb-pc-footer {
    display: flex; justify-content: space-between; align-items: center;
  }
  .kb-pc-total { font-size: 14px; font-weight: 800; color: #10b981; font-family: monospace; }
  .kb-pc-total-lbl { font-size: 10px; color: var(--kb-sub); margin-top: 1px; }

  /* ── Mobile skeleton ── */
  .kb-skeleton {
    background: var(--kb-input); border-radius: 12px;
    height: 120px; margin-bottom: 8px;
    animation: kb-pulse 1.4s ease-in-out infinite;
  }
  @keyframes kb-pulse { 0%,100%{opacity:.5} 50%{opacity:1} }

  /* ── Mobile summary mini bar ── */
  .kb-mini-bar {
    display: none;
    background: var(--kb-card); border: 1px solid var(--kb-bdr);
    border-radius: 14px; padding: 10px 8px;
    margin-bottom: 12px;
    align-items: center; justify-content: space-around;
  }
  .kb-mb-item { display: flex; flex-direction: column; align-items: center; gap: 2px; }
  .kb-mb-lbl  { font-size: 9px; font-weight: 700; color: var(--kb-sub); text-transform: uppercase; letter-spacing: .4px; }
  .kb-mb-val  { font-size: 12px; font-weight: 800; font-family: monospace; }
  .kb-mb-div  { width: 1px; height: 26px; background: var(--kb-bdr); }

  /* ════════════════════════════
     MOBILE ≤900px
  ════════════════════════════ */
  @media (max-width: 900px) {
    /* filter row: search full width + category compact */
    .kb-filter-row {
      grid-template-columns: 1fr auto;
      gap: 8px;
      margin-bottom: 12px;
    }
    .kb-search-input { padding: 11px 12px 11px 38px; font-size: 13px; border-radius: 12px; }
    .kb-cat-select   { padding: 11px 10px; font-size: 12px; border-radius: 12px; }

    /* Stats: 2×2 grid — barcha 4 karta teng ikkitadan */
    .kb-stats {
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-bottom: 12px;
    }
    .kb-stats .kb-stat:first-child { grid-column: auto; }
    .kb-stat       { padding: 12px 13px; border-radius: 12px; }
    .kb-stat-icon  { width: 28px; height: 28px; border-radius: 8px; }
    .kb-stat-lbl   { font-size: 10px; }
    .kb-stat-val   { font-size: 15px; }

    /* Show mobile blocks */
    .kb-mini-bar    { display: flex; }
    .kb-mobile-list { display: block; }

    /* Hide desktop table */
    .kb-table-card  { display: none; }
  }
`;

// ─── Types ────────────────────────────────────────────────────────────────────
interface Product {
  _id?: string;
  barcode: string;
  name?: string;
  basePrice: number;
  price: number;
  quantity?: number;
  category: string;
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

// ─── Category badge colors ────────────────────────────────────────────────────
const CAT_COLORS: Record<string, { bg: string; color: string }> = {
  'Kanselyariya maxsulotlari': { bg: 'rgba(99,102,241,.15)',  color: '#818cf8' },
  'Gigiyena vositalari':       { bg: 'rgba(236,72,153,.15)',  color: '#ec4899' },
  'Tamaki mahsulotlari':       { bg: 'rgba(16,185,129,.15)',  color: '#10b981' },
  'Moy':                       { bg: 'rgba(245,158,11,.15)',  color: '#f59e0b' },
  "Go'zallik va Parvarish":    { bg: 'rgba(168,85,247,.15)',  color: '#a855f7' },
  'Sport oziqlanishi':         { bg: 'rgba(6,182,212,.15)',   color: '#06b6d4' },
};
function catStyle(cat: string) {
  return CAT_COLORS[cat] || { bg: 'rgba(100,116,139,.15)', color: '#94a3b8' };
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function PharmKirimBase() {
  const { t, i18n }      = useTranslation(['kirim', 'categories', 'common']);
  const { currency, convert, format } = useCurrency();
  const navigate          = useNavigate();

  const [products,         setProducts]        = useState<Product[]>([]);
  const [filteredProducts, setFiltered]        = useState<Product[]>([]);
  const [soldProducts,     setSoldProducts]    = useState<SoldProduct[]>([]);
  const [searchText,       setSearchText]      = useState('');
  const [selectedCategory, setSelectedCategory]= useState('');
  const [loading,          setLoading]         = useState(true);
  const [userImage,        setUserImage]       = useState<string | null>(null);
  const [userCategories,   setUserCategories]  = useState<string[]>([]);
  const [theme,            setTheme]           = useState<'dark'|'light'>(
    () => (localStorage.getItem('theme') as any) || 'dark',
  );

  const login = getSessionLogin();
  const isDark = theme === 'dark';

  // categories
  useEffect(() => {
    const refresh = async () => {
      if (!login) return;
      const idbCats = await getUserShopCategoriesAsync(login);
      if (idbCats.length > 0) { setUserCategories(idbCats); return; }
      if (navigator.onLine) {
        try {
          const res = await axiosInstance.get('/me');
          if (res.data.success) {
            const u = res.data.user;
            setUserCategories(u.shopCategories || []);
            syncUserCategoriesToIDB(u.login, u.shopCategories);
          }
        } catch (e) { console.error(e); }
      }
    };
    refresh();
  }, [login]);

  const categories = getCategories(i18n.language, userCategories);

  useEffect(() => {
    if (!login) navigate('/login', { replace: true });
  }, [login, navigate]);

  // Load products
  const loadProducts = useCallback(async () => {
    if (!login) return;
    setLoading(true);
    try {
      const res = await axiosInstance.get(`/pharmacy/pharm-kirim/${login}`);
      if (Array.isArray(res.data)) {
        const norm = res.data.map((p: any) => ({ ...p, basePrice: p.basePrice || 0 }));
        setProducts(norm); setFiltered(norm);
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [login]);

  const fetchSold = async () => {
    if (!navigator.onLine || !login) return;
    try {
      const res = await axiosInstance.get(`/pharmacy/pharm-sales/${login}`);
      const d = res.data; 
      const allItems: any[] = [];
      d.forEach((sale: any) => {
        if (sale.items && Array.isArray(sale.items)) {
          allItems.push(...sale.items);
        }
      });
      setSoldProducts(allItems); 
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    const img = localStorage.getItem('userImage');
    if (img) setUserImage(img);
    const savedTheme = (localStorage.getItem('theme') as 'dark'|'light') || 'dark';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
    loadProducts();
    fetchSold();
  }, [login, loadProducts]);



  // Filter
  useEffect(() => {
    let f = products;
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      f = f.filter(p => p.barcode.toLowerCase().includes(q) || p.name?.toLowerCase().includes(q));
    }
    if (selectedCategory) f = f.filter(p => p.category === selectedCategory);
    setFiltered(f);
  }, [searchText, selectedCategory, products]);

  // Stats
  // Umumiy kirim: faqat sotilgan maxsulotlar narx × miqdori
  const totalSoldKirim = soldProducts.reduce((s, i) => s + (i.price    || 0) * (i.quantity || 1), 0);
  // Umumiy chiqim: faqat sotilgan maxsulotlar asosiy narx × miqdori
  const totalSoldChiqim = soldProducts.reduce((s, i) => s + (i.basePrice || 0) * (i.quantity || 1), 0);
  // Daromad: Sotilgan kirim - sotilgan chiqim
  const totalDaromad  = totalSoldKirim - totalSoldChiqim;
  // Sotilgan maxsulotlar soni
  const totalQty      = soldProducts.reduce((s, i) => s + (i.quantity || 1), 0);
  const daromadColor  = totalDaromad >= 0 ? '#22c55e' : '#ef4444';

  const STATS = [
    { icon: <TrendingUp  size={16} color="#10b981" />, iconBg: 'rgba(16,185,129,.15)',  lbl: 'Umumiy kirim',  val: format(totalSoldKirim),  color: '#10b981' },
    { icon: <TrendingDown size={16} color="#ef4444" />, iconBg: 'rgba(239,68,68,.15)',   lbl: 'Umumiy chiqim', val: format(totalSoldChiqim), color: '#ef4444' },
    { icon: <DollarSign  size={16} color={daromadColor} />, iconBg: `${daromadColor}25`, lbl: 'Daromad',           val: format(totalDaromad), color: daromadColor },
    { icon: <Package     size={16} color="#f59e0b" />, iconBg: 'rgba(245,158,11,.15)',  lbl: 'Sotilgan miqdor', val: totalQty.toLocaleString(), color: '#f59e0b' },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{STYLES(isDark)}</style>
      <MainLayout
        theme={theme}
        userImage={userImage}
        handleImageUpload={e => {
          const file = e.target.files?.[0]; if (!file) return;
          const r = new FileReader();
          r.onload = ev => { const s = ev.target?.result as string; setUserImage(s); localStorage.setItem('userImage', s); };
          r.readAsDataURL(file);
        }}
        title="Kirim Bazasi"
      >
        <div className="kb-root">
          {/* ── Search + Category ── */}
          <div className="kb-filter-row">
            <div className="kb-search-wrap">
              <Search size={16} color="var(--kb-sub)" className="kb-search-icon" />
              <input
                type="text"
                className="kb-search-input"
                placeholder="Barcode yoki nom..."
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
              />
            </div>
            <select
              className="kb-cat-select"
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
            >
              {categories.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* ── Stat cards ── */}
          <div className="kb-stats">
            {STATS.map((s, i) => (
              <div key={i} className="kb-stat">
                <div className="kb-stat-top">
                  <div className="kb-stat-icon" style={{ background: s.iconBg }}>{s.icon}</div>
                  <span className="kb-stat-lbl">{s.lbl}</span>
                </div>
                <div className="kb-stat-val" style={{ color: s.color }}>{s.val}</div>
              </div>
            ))}
          </div>

          {/* ══════════════════════════════════════
              DESKTOP TABLE
          ══════════════════════════════════════ */}
          <div className="kb-table-card">
            <div className="kb-table-scroll">
              <table className="kb-table">
                <thead>
                  <tr>
                    <th style={{ textAlign: 'center' }}>№</th>
                    <th>Barcode</th>
                    <th>Mahsulot nomi</th>
                    <th>Chiqim narx</th>
                    <th>Miqdori</th>
                    <th>Umumiy chiqim</th>
                    <th>Kategoriya</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={7} className="kb-empty">Yuklanmoqda...</td></tr>
                  ) : filteredProducts.length === 0 ? (
                    <tr><td colSpan={7} className="kb-empty">Ma'lumot topilmadi</td></tr>
                  ) : filteredProducts.map((p, i) => {
                    const { bg, color } = catStyle(p.category);
                    return (
                      <tr key={p.barcode}>
                        <td style={{ textAlign: 'center', color: 'var(--kb-sub)', fontWeight: 600 }}>{i + 1}</td>
                        <td><span className="kb-barcode">{p.barcode}</span></td>
                        <td style={{ fontWeight: 500 }}>{p.name || '—'}</td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--kb-text)' }}>{p.basePrice.toLocaleString()} so'm</span>
                            {currency !== 'UZS' && (
                              <span style={{ fontSize: 10, color: 'var(--kb-sub)' }}>{p.basePrice.toLocaleString()} so'm</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--kb-text)' }}>{p.quantity || 0} ta</span>
                        </td>
                        <td style={{ fontWeight: 700, color: '#10b981' }}>
                          {format(p.basePrice * (p.quantity || 1))}
                        </td>
                        <td>
                          <span className="kb-cat-badge" style={{ background: bg, color }}>
                            {getCategoryEmoji(p.category)} {t(`categories:${p.category}`, p.category)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ══════════════════════════════════════
              MOBILE CARDS
          ══════════════════════════════════════ */}
          <div className="kb-mobile-list">
            {loading ? (
              <>{[1,2,3].map(i => <div key={i} className="kb-skeleton" />)}</>
            ) : filteredProducts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--kb-sub)', fontSize: 14 }}>
                Ma'lumot topilmadi
              </div>
            ) : filteredProducts.map((p, i) => {
              const { bg, color } = catStyle(p.category);
              const total = p.basePrice * (p.quantity || 1);
              return (
                <div key={p.barcode} className="kb-prod-card">
                  {/* Top: num + name + category badge */}
                  <div className="kb-pc-top">
                    <div className="kb-pc-num">{i + 1}</div>
                    <div className="kb-pc-name">{p.name || '—'}</div>
                    <div className="kb-pc-badge" style={{ background: bg, color }}>
                      {getCategoryEmoji(p.category)} {t(`categories:${p.category}`, p.category)}
                    </div>
                  </div>

                  {/* Barcode */}
                  <div className="kb-pc-barcode">{p.barcode}</div>

                  {/* Inputs */}
                  <div className="kb-pc-inputs">
                    <div className="kb-inp-block">
                      <div className="kb-inp-lbl">Chiqim narx</div>
                      <span style={{
                        fontSize: 15, fontWeight: 600, color: 'var(--kb-text)'
                      }}>{p.basePrice.toLocaleString()} so'm</span>
                    </div>
                    <div className="kb-inp-block">
                      <div className="kb-inp-lbl">Miqdori</div>
                      <span style={{
                        fontSize: 15, fontWeight: 600, color: 'var(--kb-text)'
                      }}>{p.quantity || 0} ta</span>
                    </div>
                  </div>

                  {/* Footer: total */}
                  <div className="kb-pc-footer">
                    <div>
                      <div className="kb-pc-total">{format(total)}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {/* Narx ko'rsatgich */}
                      {currency !== 'UZS' && (
                        <span style={{ fontSize: 10, color: 'var(--kb-sub)', alignSelf: 'center' }}>
                          {p.basePrice.toLocaleString()} so'm
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </MainLayout>

      <ToastContainer theme={isDark ? 'dark' : 'light'} position="bottom-center" />

      {/* spin animation */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
