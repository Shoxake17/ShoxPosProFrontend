import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import axiosInstance from '../api/axiosInstance';
import { Search, Trash2, Edit2, Filter, Plus } from 'lucide-react';

import { useTranslation } from 'react-i18next';
import { useCurrency } from '../context/CurrencyContext';
import {
  getCategories,
  getCategoryEmoji,
  translateCategory,
  getUserShopCategoriesAsync,
  syncUserCategoriesToIDB,
} from '../components/Category';

import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import {
  loadProductsOfflineFirst,
  deleteProductOfflineFirst,
  saveToIDB,
  syncPendingToMongoDB,
} from '../hooks/useProductSync';
import { api } from '../utils/api';
import QurtProducts from '../components/QurtProducts';

interface Product {
  _id?: string;
  barcode: string;
  name?: string;
  price: number;
  basePrice?: number;
  quantity?: number;
  category: string;
  login?: string;
  imageUrl?: string;
  weightGrams?: number;
}

// ─── Kartochka komponenti ─────────────────────────────────────────────────────
function ProductCard({
  product,
  index,
  theme,
  language,
  currency,
  convert,
  onDelete,
  onUpdatePrice,
}: {
  product: Product;
  index: number;
  theme: 'dark' | 'light';
  language: string;
  currency: string;
  convert: (val: number, from: string, to: string) => number;
  onDelete: (barcode: string) => void;
  onUpdatePrice: (barcode: string, price: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState('');

  const qty = product.quantity ?? 0;
  const isOut  = qty === 0;
  const isWarn = qty > 0 && qty <= 5;

  const displayPrice = convert(product.price, 'UZS', currency).toFixed(
    currency === 'UZS' ? 0 : 2
  );

  const cardBg =
    theme === 'dark'
      ? isOut
        ? 'rgba(239,68,68,0.06)'
        : '#161d2b'
      : isOut
      ? '#fff5f5'
      : isWarn
      ? '#fff7ed'
      : '#fff';

  const borderColor =
    theme === 'dark'
      ? isOut
        ? '#7f1d1d'
        : isWarn
        ? '#431407'
        : '#1e293b'
      : isOut
      ? '#fecaca'
      : isWarn
      ? '#fed7aa'
      : '#e2e8f0';

  const qtyColor = isOut ? '#ef4444' : isWarn ? '#f97316' : theme === 'dark' ? '#4ade80' : '#16a34a';
  const qtyBg   = isOut ? 'rgba(239,68,68,0.15)' : isWarn ? 'rgba(249,115,22,0.15)' : 'rgba(34,197,94,0.15)';
  const qtyDot  = isOut ? '#ef4444' : isWarn ? '#f97316' : '#22c55e';
  const catEmoji = getCategoryEmoji(product.category);
  const catLabel = translateCategory(product.category, language);

  // Narx saqlash
  const savePrice = () => {
    const parsed = parseFloat(editVal);
    if (!isNaN(parsed) && parsed >= 0) {
      onUpdatePrice(product.barcode, convert(parsed, currency, 'UZS'));
    }
    setEditing(false);
  };

  return (
    <div style={{
      background: cardBg,
      border: `1px solid ${borderColor}`,
      borderRadius: '16px',
      padding: '14px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
    }}>
      {/* Yuqori qator: nom + kategoriya badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: '15px',
            fontWeight: 600,
            color: theme === 'dark' ? '#e2e8f0' : '#1e293b',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {product.name || '—'}
          </div>
          <div style={{
            fontSize: '11px',
            color: '#4f46e5',
            fontFamily: 'monospace',
            fontWeight: 600,
            marginTop: '2px',
          }}>
            {product.barcode}
          </div>
        </div>

        {/* Kategoriya badge */}
        <span style={{
          background: 'rgba(99,102,241,0.12)',
          color: '#818cf8',
          fontSize: '11px',
          fontWeight: 600,
          padding: '4px 10px',
          borderRadius: '20px',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}>
          {catEmoji} {catLabel}
        </span>
      </div>

      {/* Pastki qator: narx + miqdor + tugmalar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        {/* Narx */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{ fontSize: '11px', color: '#64748b' }}>Narxi</span>
          {editing ? (
            <input
              autoFocus
              type="number"
              value={editVal}
              onChange={e => setEditVal(e.target.value)}
              onBlur={savePrice}
              onKeyDown={e => e.key === 'Enter' && savePrice()}
              style={{
                width: '110px',
                padding: '5px 8px',
                borderRadius: '8px',
                border: `1px solid ${theme === 'dark' ? '#334155' : '#cbd5e1'}`,
                background: theme === 'dark' ? '#0f172a' : '#f8fafc',
                color: theme === 'dark' ? '#e2e8f0' : '#1e293b',
                fontSize: '14px',
                fontWeight: 700,
              }}
            />
          ) : (
            <span style={{
              fontSize: '15px',
              fontWeight: 700,
              color: theme === 'dark' ? '#e2e8f0' : '#1e293b',
            }}>
              {Number(displayPrice).toLocaleString()} so'm
            </span>
          )}
          {currency !== 'UZS' && !editing && (
            <span style={{ fontSize: '10px', color: '#64748b' }}>
              {product.price.toLocaleString()} so'm
            </span>
          )}
        </div>

        {/* O'ng tomon: miqdor + tugmalar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {/* Miqdor badge */}
          <span style={{
            background: qtyBg,
            color: qtyColor,
            fontSize: '12px',
            fontWeight: 600,
            padding: '5px 10px',
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
          }}>
            <span style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: qtyDot,
              display: 'inline-block',
              flexShrink: 0,
            }} />
            {qty} dona
          </span>

          {/* Tahrirlash tugmasi */}
          <button
            onClick={() => {
              setEditVal(displayPrice);
              setEditing(true);
            }}
            style={{
              background: 'rgba(99,102,241,0.12)',
              border: 'none',
              borderRadius: '10px',
              padding: '8px',
              cursor: 'pointer',
              color: '#818cf8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Edit2 size={14} />
          </button>

          {/* O'chirish tugmasi */}
          <button
            onClick={() => onDelete(product.barcode)}
            style={{
              background: 'rgba(239,68,68,0.12)',
              border: 'none',
              borderRadius: '10px',
              padding: '8px',
              cursor: 'pointer',
              color: '#f87171',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Asosiy komponent ─────────────────────────────────────────────────────────
export default function MaxsulotBazasi() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation(['database', 'common']);
  const language = i18n.language;
  const { currency, convert } = useCurrency();

  const [products, setProducts]       = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [searchText, setSearchText]   = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [userImage]  = useState<string | null>(localStorage.getItem('userImage'));
  const [theme]      = useState<'dark' | 'light'>((localStorage.getItem('theme') as any) || 'dark');
  const [loading, setLoading]         = useState(true);
  const [isMobile, setIsMobile]       = useState(window.innerWidth < 768);
  const [showFilter, setShowFilter]   = useState(false);

  const [user, setUser]               = useState(() => JSON.parse(sessionStorage.getItem('currentUser') || '{}'));
  const [userCategories, setUserCategories] = useState<string[]>([]);
  const login = user?.login || '';

  // Responsive listener
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Sessiya & kategoriyalar
  useEffect(() => {
    const refreshData = async () => {
      const idbCats = await getUserShopCategoriesAsync(login);
      if (idbCats.length > 0) setUserCategories(idbCats);
      if (!user.shopCategories || idbCats.length === 0) {
        try {
          const res = await axiosInstance.get('/me');
          if (res.data.success) {
            const freshUser = res.data.user;
            sessionStorage.setItem('currentUser', JSON.stringify(freshUser));
            setUser(freshUser);
            setUserCategories(freshUser.shopCategories || []);
            syncUserCategoriesToIDB(freshUser.login, freshUser.shopCategories);
          }
        } catch (err) { console.error(err); }
      }
    };
    refreshData();
  }, [login, user.shopCategories]);

  const categoryOptions = getCategories(language, userCategories);

  // Mahsulotlarni yuklash
  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      let data = await loadProductsOfflineFirst(login);
      if (userCategories.length > 0) {
        data = data.filter(p => userCategories.includes(p.category));
      }
      setAllProducts(data);
      setProducts(data);
    } catch (err) {
      console.error('❌ Yuklash xatosi:', err);
    } finally {
      setLoading(false);
    }
  }, [login, userCategories]);

  useEffect(() => {
    if (!user?.login) { navigate('/'); return; }
    loadProducts();
  }, [login, loadProducts, navigate]);

  // Online/Offline
  useEffect(() => {
    const handleOnline = async () => {
      const count = await syncPendingToMongoDB(login);
      if (count > 0) {
        toast.success(t('syncSuccess', { count }), {
          position: 'top-right', autoClose: 4000,
          theme: theme === 'dark' ? 'dark' : 'light',
        });
      }
      await loadProducts();
    };
    const handleOffline = () => {
      toast.warning(t('offlineMode'), {
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
  }, [loadProducts, login, theme, t]);

  // Filter
  const handleSearch = (text: string, category: string) => {
    const q = text.trim().toLowerCase();
    let filtered = allProducts;
    if (q) {
      filtered = filtered.filter(p =>
        p.barcode.toLowerCase().includes(q) ||
        (p.name && p.name.toLowerCase().includes(q))
      );
    }
    if (category) filtered = filtered.filter(p => p.category === category);
    setProducts(filtered);
  };

  // Narx yangilash
  const updatePrice = async (barcode: string, newPrice: number) => {
    const updated = allProducts.map(p =>
      p.barcode === barcode ? { ...p, price: newPrice } : p
    );
    setAllProducts(updated);
    setProducts(updated.filter(p => products.some(pr => pr.barcode === p.barcode)));
    const product = allProducts.find(p => p.barcode === barcode);
    if (product) await saveToIDB({ ...product, price: newPrice, login });
    if (navigator.onLine) {
      api(`/api/products/update-price/${login}`, {
        method: 'POST',
        body: JSON.stringify({ barcode, price: newPrice }),
      }).catch(console.error);
    }
  };

  // O'chirish
  const deleteProduct = async (barcode: string) => {
    if (!confirm(t('deleteConfirm'))) return;
    try {
      await deleteProductOfflineFirst(barcode, login);
      toast.success(t('common:success'));
      loadProducts();
    } catch {
      toast.error(t('common:error'));
    }
  };

  // Statistika
  const totalCount = allProducts.length;
  const totalQty   = allProducts.reduce((s, p) => s + (p.quantity ?? 0), 0);
  const lowStock   = allProducts.filter(p => (p.quantity ?? 0) <= 5 && (p.quantity ?? 0) > 0).length;

  const isDark = theme === 'dark';
  const textPrimary   = isDark ? '#e2e8f0' : '#1e293b';
  const textSecondary = isDark ? '#94a3b8' : '#64748b';
  const bgCard        = isDark ? '#111827' : '#fff';
  const bgInput       = isDark ? '#161d2b' : '#f8fafc';
  const borderColor   = isDark ? '#1e293b' : '#e2e8f0';

  return (
    <MainLayout theme={theme} userImage={userImage} title={t('productsDatabase')}>

      {/* ── Filtr qatori ── */}
      <div style={{
        display: 'flex',
        gap: '10px',
        marginBottom: '16px',
        alignItems: 'center',
      }}>
        {/* Search */}
        <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search
            size={16}
            style={{ position: 'absolute', left: '14px', color: textSecondary, pointerEvents: 'none' }}
          />
          <input
            type="text"
            placeholder={t('searchPlaceholder', 'Barcode yoki nom...')}
            value={searchText}
            onChange={e => {
              setSearchText(e.target.value);
              handleSearch(e.target.value, selectedCategory);
            }}
            style={{
              width: '100%',
              padding: '12px 14px 12px 40px',
              borderRadius: '14px',
              border: `1px solid ${borderColor}`,
              background: bgInput,
              color: textPrimary,
              fontSize: '14px',
              outline: 'none',
            }}
          />
        </div>

        {/* Filtr toggle (mobile: category dropdown ko'rsatish) */}
        <button
          onClick={() => setShowFilter(f => !f)}
          style={{
            background: showFilter ? '#6366f1' : bgInput,
            border: `1px solid ${showFilter ? '#6366f1' : borderColor}`,
            borderRadius: '14px',
            padding: '12px 16px',
            color: showFilter ? '#fff' : textSecondary,
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            whiteSpace: 'nowrap',
          }}
        >
          <Filter size={14} />
          Filtr
        </button>

        {/* Mahsulot qo'shish — alohida sahifa (yon menyuda endi yo'q) */}
        <button
          type="button"
          onClick={() => navigate('/add-product')}
          style={{
            background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
            border: 'none',
            borderRadius: '14px',
            padding: '12px 16px',
            color: '#fff',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            whiteSpace: 'nowrap',
          }}
        >
          <Plus size={15} />
          Mahsulot qo'shish
        </button>
      </div>

      {/* Kategoriya select (filtr ochiq bo'lganda) */}
      {showFilter && (
        <select
          value={selectedCategory}
          onChange={e => {
            setSelectedCategory(e.target.value);
            handleSearch(searchText, e.target.value);
          }}
          style={{
            width: '100%',
            padding: '12px 16px',
            borderRadius: '14px',
            border: `1px solid ${borderColor}`,
            background: bgInput,
            color: textPrimary,
            fontSize: '14px',
            marginBottom: '16px',
            outline: 'none',
          }}
        >
          {categoryOptions.map(c => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      )}

      {/* ── Statistika kartochkalari ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '10px',
        marginBottom: '20px',
      }}>
        {[
          
        ].map(stat => (
          <div key={stat.label} style={{
            background: bgCard,
            border: `1px solid ${borderColor}`,
            borderRadius: '14px',
            padding: '12px 14px',
          }}>
            <div style={{ fontSize: '9px', color: textSecondary, fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '.5px' }}>
              {stat.label}
            </div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: stat.color }}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* ── Sarlavha ── */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '-20px',
      }}>
      </div>

      {/* ── MOBILE: Kartochkalar ro'yxati ── */}
      {user?.storeCategory === 'qurt' ? (
        <QurtProducts
          products={products}
          loading={loading}
          isDark={isDark}
          isMobile={isMobile}
          onDelete={deleteProduct}
        />
      ) : isMobile ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingBottom: '80px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: textSecondary }}>
              {t('loading', 'Yuklanmoqda...')}
            </div>
          ) : products.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: textSecondary }}>
              {t('noData', 'Mahsulot topilmadi')}
            </div>
          ) : (
            products.map((p, i) => (
              <ProductCard
                key={p._id || p.barcode}
                product={p}
                index={i}
                theme={theme}
                language={language}
                currency={currency}
                convert={convert}
                onDelete={deleteProduct}
                onUpdatePrice={updatePrice}
              />
            ))
          )}
        </div>
      ) : (
        /* ── DESKTOP: Jadval ── */
        <div style={{
          background: bgCard,
          borderRadius: '20px',
          border: `1px solid ${borderColor}`,
          overflow: 'hidden',
          boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
              <thead>
                <tr>
                  {[t('number','#'), t('barcode','Barkod'), t('productName','Nomi'), t('price','Narxi'), t('quantity','Soni'), t('category','Kategoriya'), t('actions','Amallar')].map(h => (
                    <th key={h} style={{
                      background: isDark ? '#1e293b' : '#f8fafc',
                      padding: '16px',
                      textAlign: 'left',
                      fontSize: '13px',
                      color: textSecondary,
                      textTransform: 'uppercase',
                      fontWeight: 600,
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: '60px', color: textSecondary }}>{t('loading')}</td></tr>
                ) : products.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: '60px', color: textSecondary }}>{t('noData')}</td></tr>
                ) : (
                  products.map((p, i) => {
                    const qty   = p.quantity ?? 0;
                    const isOut  = qty === 0;
                    const isWarn = qty > 0 && qty <= 5;
                    return (
                      <tr key={p._id || p.barcode} style={{
                        background: isOut
                          ? (isDark ? 'rgba(239,68,68,0.06)' : '#fff5f5')
                          : isWarn
                          ? (isDark ? 'rgba(249,115,22,0.04)' : '#fff7ed')
                          : 'transparent',
                      }}>
                        <td style={{ padding: '16px', borderBottom: `1px solid ${borderColor}`, textAlign: 'center' }}>{i + 1}</td>
                        <td style={{ padding: '16px', borderBottom: `1px solid ${borderColor}`, fontFamily: 'monospace', color: '#4f46e5', fontWeight: 600 }}>{p.barcode}</td>
                        <td style={{ padding: '16px', borderBottom: `1px solid ${borderColor}`, color: textPrimary }}>{p.name || '-'}</td>
                        <td style={{ padding: '16px', borderBottom: `1px solid ${borderColor}` }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <input
                              type="number"
                              style={{
                                width: '100px', padding: '8px', borderRadius: '8px',
                                border: `1px solid ${isDark ? '#334155' : '#ddd'}`,
                                textAlign: 'center', background: 'transparent', color: textPrimary,
                              }}
                              value={convert(p.price, 'UZS', currency).toFixed(currency === 'UZS' ? 0 : 2)}
                              onChange={e => updatePrice(p.barcode, convert(Number(e.target.value), currency, 'UZS'))}
                            />
                            {currency !== 'UZS' && (
                              <span style={{ fontSize: '10px', color: '#64748b' }}>{p.price.toLocaleString()} so'm</span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '16px', borderBottom: `1px solid ${borderColor}`, textAlign: 'center' }}>
                          <span style={{ color: isOut ? '#ef4444' : isWarn ? '#f97316' : 'inherit', fontWeight: isOut ? 700 : 600 }}>
                            {qty}
                          </span>
                        </td>
                        <td style={{ padding: '16px', borderBottom: `1px solid ${borderColor}` }}>
                          <span style={{ background: '#4f46e515', color: '#4f46e5', padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 600 }}>
                            {getCategoryEmoji(p.category)} {translateCategory(p.category, language)}
                          </span>
                        </td>
                        <td style={{ padding: '16px', borderBottom: `1px solid ${borderColor}`, textAlign: 'center' }}>
                          <button
                            onClick={() => deleteProduct(p.barcode)}
                            style={{ background: '#ef444415', color: '#ef4444', border: 'none', padding: '10px', borderRadius: '10px', cursor: 'pointer' }}
                          >
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
      )}

      <ToastContainer theme={isDark ? 'dark' : 'light'} />
    </MainLayout>
  );
}