import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/MainLayout';
import axiosInstance from '../api/axiosInstance';

import { useTranslation } from '@/components/languages/MaxsulotQoshish';
import { getCategories, getUserShopCategoriesAsync, syncUserCategoriesToIDB } from '@/components/Category';
import {
  addProductOfflineFirst,
  fetchFromMongoDB,
  getAllFromIDB,
  syncPendingToMongoDB,
} from '../hooks/useProductSync';

export default function MaxsulotQoshish() {
  const navigate = useNavigate();
  const { t, language } = useTranslation();

  const [userImage, setUserImage] = useState<string | null>(localStorage.getItem('userImage'));
  const [theme] = useState<'dark' | 'light'>((localStorage.getItem('theme') as any) || 'dark');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const [name, setName] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [price, setPrice] = useState('');
  const [barcode, setBarcode] = useState('');
  const [category, setCategory] = useState('');
  const [quantity, setQuantity] = useState('0');

  const [user, setUser] = useState(() => JSON.parse(sessionStorage.getItem('currentUser') || '{}'));
  const [userCategories, setUserCategories] = useState<string[]>([]);
  const login = user?.login || "";

  // 🛡️ Sessiyani va IndexedDB kategoriyalarini yangilash
  useEffect(() => {
    const refreshData = async () => {
      // 1. IndexedDB dan ol
      const idbCats = await getUserShopCategoriesAsync(login);
      if (idbCats.length > 0) {
        setUserCategories(idbCats);
      }

      // 2. Agar sessiyada yo'q bo'lsa yoki IDB bo'sh bo'lsa, API dan ol
      if (!user.shopCategories || idbCats.length === 0) {
        try {
          const res = await axiosInstance.get("/me");
          if (res.data.success) {
            const freshUser = res.data.user;
            sessionStorage.setItem("currentUser", JSON.stringify(freshUser));
            setUser(freshUser);
            setUserCategories(freshUser.shopCategories || []);
            // IndexedDB ga saqlash
            syncUserCategoriesToIDB(freshUser.login, freshUser.shopCategories);
          }
        } catch (err) {
          console.error("User refresh error:", err);
        }
      }
    };
    refreshData();
  }, [login]);

  // ─── Foydalanuvchi kategoriyalari ────────────────────────────────────────
  const categories = getCategories(language, userCategories);

  // Birinchi mavjud kategoriyani default tanlash
  useEffect(() => {
    const first = categories.find(c => c.value !== '');
    if (first && !category) setCategory(first.value);
  }, [categories, category]);

  // ─── Online/Offline ───────────────────────────────────────────────────────
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      const count = await syncPendingToMongoDB(login);
      if (count > 0) {
        setMessage({ type: 'info', text: `✅ ${count} ta mahsulot MongoDB ga sync bo'ldi` });
        setTimeout(() => setMessage(null), 3000);
      }
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

  // ─── Auth ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user || !user.login) navigate('/');
  }, [navigate]);

  // ─── Narx validatsiya ─────────────────────────────────────────────────────
  useEffect(() => {
    const bp = Number(basePrice);
    const sp = Number(price);
    if (bp > sp && bp > 0 && sp > 0) {
      setMessage({ type: 'error', text: "⚠️ Ulgurji narx sotuv narxidan yuqori bo'lishi mumkin emas!" });
    } else if (message?.type === 'error' && message.text.includes('Ulgurji')) {
      setMessage(null);
    }
  }, [basePrice, price]);

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

  // ─── Barcode tekshirish ───────────────────────────────────────────────────
  const checkBarcodeExists = async (bc: string): Promise<string | null> => {
    const idbProducts = await getAllFromIDB(login);
    const existIDB = idbProducts.find((p: any) => p.barcode.toLowerCase() === bc.toLowerCase());
    if (existIDB) return `⚠️ Bu barcode IndexedDB da allaqachon mavjud: ${existIDB.barcode} — ${existIDB.name || '-'}`;

    if (navigator.onLine) {
      try {
        const userProducts = await fetchFromMongoDB(login);
        const existMongo = userProducts.find((p: any) => p.barcode.toLowerCase() === bc.toLowerCase());
        if (existMongo) return `⚠️ Bu barcode MongoDB da allaqachon mavjud: ${existMongo.barcode} — ${existMongo.name || '-'}`;

        const globalRes = await fetch(`/api/products/search?q=${encodeURIComponent(bc)}`);
        if (globalRes.ok) {
          const globalData = await globalRes.json();
          if (Array.isArray(globalData) && globalData.length > 0) {
            return `⚠️ Bu barcode umumiy bazada mavjud: ${globalData[0].barcode} — ${globalData[0].name || '-'}`;
          }
        }
      } catch { /* davom etamiz */ }
    }
    return null;
  };

  // ─── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !barcode.trim() || !category) {
      setMessage({ type: 'error', text: t('errorRequired') || "Barcha majburiy maydonlarni to'ldiring" });
      return;
    }

    // ✅ Kategoriya ruxsat tekshiruvi
    if (userCategories.length > 0 && !userCategories.includes(category)) {
      setMessage({
        type: 'error',
        text: "⚠️ Siz ushbu kategoriyaga mahsulot qo'sha olmaysiz. Faqat do'koningizga biriktirilgan kategoriyalar ruxsat etilgan.",
      });
      return;
    }

    const bp = Number(basePrice);
    const sp = Number(price);
    if (isNaN(bp) || isNaN(sp)) { setMessage({ type: 'error', text: "Narxlar son bo'lishi kerak" }); return; }
    if (bp < 0 || sp < 0) { setMessage({ type: 'error', text: "Narxlar musbat son bo'lishi kerak" }); return; }
    if (bp > sp) { setMessage({ type: 'error', text: "⚠️ Ulgurji narx sotuv narxidan yuqori bo'lishi mumkin emas!" }); return; }

    setLoading(true);
    setMessage(null);

    try {
      const barcodeError = await checkBarcodeExists(barcode.trim());
      if (barcodeError) { setMessage({ type: 'error', text: barcodeError }); setLoading(false); return; }

      const productData = {
        name: name.trim(),
        price: sp,
        basePrice: bp,
        barcode: barcode.trim(),
        category,
        quantity: Number(quantity),
        login,
        addedAt: new Date().toISOString(),
      };

      await addProductOfflineFirst(productData);
      setMessage({ type: 'success', text: `✅ ${t('successMessage') || "Mahsulot muvaffaqiyatli qo'shildi"}` });
      setTimeout(() => navigate('/products'), 2000);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Xatolik yuz berdi' });
    } finally {
      setLoading(false);
    }
  };

  const msgColors = {
    success: { bg: theme === 'dark' ? '#10b98125' : '#10b98115', color: '#10b981', border: '#10b98144' },
    error:   { bg: theme === 'dark' ? '#ef444425' : '#ef444415', color: '#ef4444', border: '#ef444444' },
    info:    { bg: theme === 'dark' ? '#3b82f625' : '#3b82f615', color: '#3b82f6', border: '#3b82f644' },
  };

  return (
    <MainLayout theme={theme} userImage={userImage} handleImageUpload={handleImageUpload} title={t('newProduct')}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div style={{
          background: theme === 'dark' ? '#0f172a' : '#ffffff',
          borderRadius: '24px', padding: '32px',
          boxShadow: theme === 'dark' ? '0 10px 30px rgba(0,0,0,0.5)' : '0 10px 30px rgba(0,0,0,0.05)',
          border: `1px solid ${theme === 'dark' ? '#1e293b' : '#f1f5f9'}`
        }}>
          <form onSubmit={handleSubmit}>

            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle(theme)}>{t('productName')} <span style={{ color: '#ef4444' }}>{t('required')}</span></label>
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                placeholder={t('productNamePlaceholder')} style={inputStyle(theme)} required />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '20px' }}>
              <div>
                <label style={labelStyle(theme)}>{t('wholesalePrice')} <span style={{ color: '#ef4444' }}>{t('required')}</span></label>
                <input type="number" value={basePrice} onChange={e => setBasePrice(e.target.value)} style={inputStyle(theme)} required />
              </div>
              <div>
                <label style={labelStyle(theme)}>{t('salePrice')} <span style={{ color: '#ef4444' }}>{t('required')}</span></label>
                <input type="number" value={price} onChange={e => setPrice(e.target.value)} style={inputStyle(theme)} required />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '20px' }}>
              <div>
                <label style={labelStyle(theme)}>{t('barcode')} <span style={{ color: '#ef4444' }}>{t('required')}</span></label>
                <input type="text" value={barcode} onChange={e => setBarcode(e.target.value)} style={inputStyle(theme)} required />
              </div>
              <div>
                <label style={labelStyle(theme)}>{t('quantity')}</label>
                <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} style={inputStyle(theme)} />
              </div>
            </div>

            <div style={{ marginBottom: '30px' }}>
              <label style={labelStyle(theme)}>
                {t('category')} <span style={{ color: '#ef4444' }}>{t('required')}</span>
              </label>
              <select value={category} onChange={e => setCategory(e.target.value)}
                style={{ ...inputStyle(theme), cursor: 'pointer' }} required>
                {categories.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
              
            </div>

            {message && (
              <div style={{
                padding: '16px 20px', borderRadius: '12px', marginBottom: '20px',
                background: msgColors[message.type].bg,
                color: msgColors[message.type].color,
                border: `1px solid ${msgColors[message.type].border}`,
                fontSize: '15px', fontWeight: 500,
              }}>
                {message.text}
              </div>
            )}

            <button
              type="submit" disabled={loading}
              style={{
                width: '100%', padding: '16px', borderRadius: '14px', border: 'none',
                background: loading ? '#64748b' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: '#fff', fontSize: '18px', fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: loading ? 'none' : '0 4px 20px rgba(102,126,234,0.35)',
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { if (!loading) e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              {loading ? t('saving') : t('saveProduct')}
            </button>
          </form>
        </div>
      </div>
    </MainLayout>
  );
}

const labelStyle = (theme: string) => ({
  display: 'block', marginBottom: '10px',
  fontWeight: 600 as const,
  color: theme === 'dark' ? '#f8fafc' : '#0f172a',
  fontSize: '15px',
});

const inputStyle = (theme: string) => ({
  width: '100%', padding: '14px 18px', borderRadius: '12px',
  border: `1px solid ${theme === 'dark' ? '#334155' : '#e2e8f0'}`,
  background: theme === 'dark' ? '#1e293b' : '#f8fafc',
  color: theme === 'dark' ? '#f8fafc' : '#0f172a',
  fontSize: '16px', outline: 'none',
  boxSizing: 'border-box' as const,
  transition: 'all 0.2s ease', fontWeight: '500',
});