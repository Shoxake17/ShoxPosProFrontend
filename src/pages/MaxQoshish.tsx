import React, { useState, useEffect, useRef, useCallback } from 'react';
import { QrCode, ImagePlus, ChevronDown, Plus, Check } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import axiosInstance from '../api/axiosInstance';
import { useTranslation } from 'react-i18next';
import { BrowserMultiFormatReader } from '@zxing/library';
import {
  getCategories,
  getUserShopCategoriesAsync,
  syncUserCategoriesToIDB,
} from '../components/Category';
import {
  addProductOfflineFirst,
  getAllFromIDB,
  syncPendingToMongoDB,
} from '../hooks/useProductSync';
import MobileBottomBar from '../components/layout/MobileBottomBar';

/* ── responsive ─────────────────────────────────────────────────── */
function useIsMobile() {
  const [v, setV] = useState(() => window.innerWidth <= 768);
  useEffect(() => {
    const h = () => setV(window.innerWidth <= 768);
    window.addEventListener('resize', h);
    window.addEventListener('orientationchange', h);
    return () => {
      window.removeEventListener('resize', h);
      window.removeEventListener('orientationchange', h);
    };
  }, []);
  return v;
}

/* ── CSS ─────────────────────────────────────────────────────────── */
const CSS = `
.mq-root *, .mq-root *::before, .mq-root *::after { box-sizing: border-box; }
.mq-root { font-family: 'DM Sans', sans-serif; }

.mq-f {
  width: 100%; padding: 13px 14px; border-radius: 12px;
  font-size: 15px; font-weight: 500; outline: none;
  transition: border-color .2s, box-shadow .2s;
  font-family: 'DM Sans', sans-serif;
}
.mq-f:focus { border-color: #6366f1 !important; box-shadow: 0 0 0 3px rgba(99,102,241,.2); }
.mq-f::placeholder { color: #4b5563; }

.mq-save { transition: transform .15s, box-shadow .15s; }
.mq-save:not(:disabled):hover { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(99,102,241,.42) !important; }
.mq-save:not(:disabled):active { transform: translateY(0); }

@keyframes mqUp   { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
@keyframes mqSheet { from{opacity:0;transform:translateY(100%)} to{opacity:1;transform:translateY(0)} }
@keyframes mqFade  { from{opacity:0} to{opacity:1} }
@keyframes mqMsg  { from{opacity:0;transform:translateY(-5px)} to{opacity:1;transform:translateY(0)} }
@keyframes mqSpin { to{transform:rotate(360deg)} }

.mq-card   { animation: mqUp .28s ease; }
.mq-msg    { animation: mqMsg .2s ease; }
.mq-sheet  { animation: mqSheet .3s cubic-bezier(0.32,0.72,0,1); }
.mq-modal  { animation: mqFade .2s ease; }

.mq-spin {
  width:15px; height:15px; border:2px solid rgba(255,255,255,.3);
  border-top-color:#fff; border-radius:50%;
  animation:mqSpin .65s linear infinite;
  display:inline-block; margin-right:6px; vertical-align:middle;
}

.mq-qbtn {
  width:44px; height:44px; border-radius:12px; border:none;
  font-size:22px; font-weight:700; cursor:pointer; flex-shrink:0;
  display:flex; align-items:center; justify-content:center;
  transition:transform .1s; touch-action:manipulation;
  user-select:none;
}
.mq-qbtn:active { transform:scale(.88); }

.mq-scr {
  position:fixed; inset:0; z-index:3000;
  background:#000; display:flex; flex-direction:column;
  align-items:center; justify-content:center;
}
.mq-scr video { width:100%; height:100%; object-fit:cover; position:absolute; inset:0; }
.mq-sfr {
  position:relative; z-index:10;
  width:260px; height:260px;
  border:1.5px solid rgba(255,255,255,.15); border-radius:24px;
  box-shadow:0 0 0 9999px rgba(0,0,0,.58);
}
.mq-sfr::after {
  content:''; position:absolute; inset:-2px;
  border:3px solid #6366f1; border-radius:24px;
  clip-path:polygon(0 0,28% 0,28% 9%,72% 9%,72% 0,100% 0,100% 28%,91% 28%,91% 72%,100% 72%,100% 100%,72% 100%,72% 91%,28% 91%,28% 100%,0 100%,0 72%,9% 72%,9% 28%,0 28%);
}
@keyframes scLine { 0%,100%{top:8px;opacity:.25} 50%{top:242px;opacity:1} }
.mq-sl {
  position:absolute; top:8px; left:8px; right:8px; height:2px;
  background:#6366f1; box-shadow:0 0 12px #6366f1;
  animation:scLine 2.4s ease-in-out infinite;
}

/* Category item hover */
.cat-item { transition: background .15s ease, border-color .15s ease; }
.cat-item:hover { opacity: 0.88; }
.cat-item:active { transform: scale(0.98); }
`;

function injectCSS() {
  if (document.getElementById('mq-v4')) return;
  const s = document.createElement('style');
  s.id = 'mq-v4';
  s.textContent = CSS;
  document.head.appendChild(s);
}

/* ── tokens ─────────────────────────────────────────────────────── */
const DK = {
  card: '#0d1220', cardB: '#1e2740', surf: '#111827',
  surfB: '#1e2740', text: '#f1f5f9', muted: '#64748b', label: '#cbd5e1',
};
const LT = {
  card: '#ffffff', cardB: '#e2e8f0', surf: '#f1f5f9',
  surfB: '#cbd5e1', text: '#0f172a', muted: '#64748b', label: '#1e293b',
};

type MsgT = 'success' | 'error' | 'info';
const MSGS: Record<MsgT, { bg: string; col: string; bdr: string; ico: string }> = {
  success: { bg: 'rgba(16,185,129,.1)', col: '#10b981', bdr: 'rgba(16,185,129,.3)', ico: '✅' },
  error:   { bg: 'rgba(239,68,68,.1)',  col: '#ef4444', bdr: 'rgba(239,68,68,.3)',  ico: '⚠️' },
  info:    { bg: 'rgba(99,102,241,.09)',col: '#818cf8', bdr: 'rgba(99,102,241,.28)',ico: 'ℹ️' },
};

/* ── Scanner ─────────────────────────────────────────────────────── */
// ScanOverlay ichida:
function ScanOverlay({ onResult, onClose }: { onResult: (c: string) => void; onClose: () => void }) {
  const vRef = useRef<HTMLVideoElement>(null);
  const rRef = useRef(new BrowserMultiFormatReader());
  const done = useRef(false);
  const { t } = useTranslation('products'); // ← QO'SHING

  useEffect(() => {
    (async () => {
      try {
        const devs = await rRef.current.listVideoInputDevices();
        const back = devs.find(d => /back|environment/i.test(d.label)) || devs[0];
        if (!back || !vRef.current) return;
        rRef.current.decodeFromVideoDevice(back.deviceId, vRef.current, res => {
          if (res && !done.current) {
            done.current = true;
            rRef.current.reset();
            onResult(res.getText().trim());
          }
        });
      } catch {}
    })();
    return () => { rRef.current.reset(); };
  }, [onResult]);

  return (
    <div className="mq-scr">
      <video ref={vRef} autoPlay muted playsInline />
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
        <div className="mq-sfr"><div className="mq-sl" /></div>
        <p style={{ marginTop: 28, color: '#fff', fontSize: 15, fontWeight: 500, textShadow: '0 1px 4px rgba(0,0,0,.6)', pointerEvents: 'none' }}>
          {t('alignBarcode')} {/* ← OLDIN: hardcoded string */}
        </p>
      </div>
      <button onClick={onClose} style={{ position: 'absolute', top: 40, right: 24, zIndex: 20, background: 'rgba(0,0,0,.55)', border: 'none', borderRadius: '50%', width: 44, height: 44, color: '#fff', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
    </div>
  );
}


/* ── Category Modal ──────────────────────────────────────────────── */
interface CatModalProps {
  cats: { value: string; label: string }[];
  selected: string;
  onSelect: (val: string) => void;
  onClose: () => void;
  theme: 'dark' | 'light';
  isMobile: boolean;
}

function CategoryModal({ cats, selected, onSelect, onClose, theme, isMobile }: CatModalProps) {
  const { t } = useTranslation(['products', 'common']);
  const c = theme === 'dark' ? DK : LT;

  return (
    <div
      className="mq-modal"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: isMobile ? 'flex-end' : 'center',
        justifyContent: 'center',
        padding: isMobile ? 0 : 24,
      }}
    >
      <div
        className={isMobile ? 'mq-sheet' : ''}
        onClick={e => e.stopPropagation()}
        style={{
          background: theme === 'dark' ? '#0d1220' : '#ffffff',
          borderRadius: isMobile ? '24px 24px 0 0' : 24,
          width: isMobile ? '100%' : 440,
          maxHeight: isMobile ? '78vh' : '65vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: `1px solid ${c.cardB}`,
          boxShadow: '0 24px 64px rgba(0,0,0,0.55)',
        }}
      >
        {/* Handle bar (mobile) */}
        {isMobile && (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 4, flexShrink: 0 }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: theme === 'dark' ? '#2d3a52' : '#cbd5e1' }} />
          </div>
        )}

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: isMobile ? '12px 20px 14px' : '20px 20px 16px',
          borderBottom: `1px solid ${c.cardB}`,
          flexShrink: 0,
        }}>
          <div>
         <div style={{ fontSize: 17, fontWeight: 700, color: c.text, fontFamily: "'DM Sans',sans-serif" }}>
          {t('selectCategory')}
          </div>
        <div style={{ fontSize: 12, color: c.muted, marginTop: 2, fontFamily: "'DM Sans',sans-serif" }}>
        {cats.length} {t('categoriesAvailable')} 
          </div>
</div>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 34, height: 34, borderRadius: '50%',
              background: theme === 'dark' ? '#1e2740' : '#f1f5f9',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: c.muted, fontSize: 16,
              transition: 'background .15s',
            }}
          >
            ✕
          </button>
        </div>

        {/* List */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '10px 12px 20px' }}>
          {cats.map(cat => {
            const isSelected = selected === cat.value;
            // emoji ni label boshidan ajratamiz
            const emojiMatch = cat.label.match(/^(\p{Emoji_Presentation}|\p{Extended_Pictographic})\s*/u);
            const emoji = emojiMatch ? emojiMatch[0].trim() : '📦';
            const labelText = emojiMatch ? cat.label.replace(emojiMatch[0], '').trim() : cat.label;

            return (
              <button
                key={cat.value}
                type="button"
                className="cat-item"
                onClick={() => { onSelect(cat.value); onClose(); }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  borderRadius: 14,
                  border: isSelected
                    ? '1.5px solid #6366f1'
                    : `1.5px solid ${theme === 'dark' ? '#1e2740' : '#e2e8f0'}`,
                  background: isSelected
                    ? (theme === 'dark' ? 'rgba(99,102,241,0.13)' : 'rgba(99,102,241,0.07)')
                    : (theme === 'dark' ? '#111827' : '#f8fafc'),
                  cursor: 'pointer',
                  marginBottom: 7,
                  textAlign: 'left' as const,
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {/* Left: icon + label */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                    background: isSelected
                      ? 'rgba(99,102,241,0.2)'
                      : (theme === 'dark' ? '#1e2740' : '#e9eef5'),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20,
                    transition: 'background .15s',
                  }}>
                    {emoji}
                  </div>
                  <div>
                    <div style={{
                      fontSize: 14, fontWeight: isSelected ? 700 : 500,
                      color: isSelected ? '#818cf8' : c.text,
                      lineHeight: 1.3,
                    }}>
                      {labelText}
                    </div>
                    <div style={{ fontSize: 11, color: c.muted, marginTop: 2 }}>
                      {cat.value}
                    </div>
                  </div>
                </div>

                {/* Right: radio */}
                {isSelected ? (
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: '0 2px 8px rgba(99,102,241,0.4)',
                  }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                      stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </div>
                ) : (
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%',
                    border: `1.5px solid ${theme === 'dark' ? '#2d3a52' : '#cbd5e1'}`,
                    flexShrink: 0,
                  }} />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── MAIN ────────────────────────────────────────────────────────── */
export default function MaxsulotQoshish() {
  injectCSS();
  const navigate     = useNavigate();
  const { t, i18n } = useTranslation(['products', 'common']);
  const lang         = i18n.language;
  const isMobile     = useIsMobile();

  const [userImage, setUserImage] = useState<string | null>(localStorage.getItem('userImage'));
  const [theme] = useState<'dark' | 'light'>((localStorage.getItem('theme') as any) || 'dark');
  const c = theme === 'dark' ? DK : LT;

  const [loading, setLoading]     = useState(false);
  const [scanLoad, setScanLoad]   = useState(false);
  const [message, setMessage]     = useState<{ type: MsgT; text: string } | null>(null);
  const [showScan, setShowScan]   = useState(false);
  const [showCatModal, setShowCatModal] = useState(false); // ✅ Category modal

  const [name, setName]         = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [price, setPrice]       = useState('');
  const [barcode, setBarcode]   = useState('');
  const [category, setCategory] = useState('');
  const [quantity, setQuantity] = useState('1');

  const [user]  = useState(() => JSON.parse(sessionStorage.getItem('currentUser') || '{}'));
  const [uCats, setUCats] = useState<string[]>([]);
  const login = user?.login || '';

  // ── QURT: mijoz ilovasidagi Qurt sahifasi uchun qo'shimcha maydonlar ──
  const isQurt = user?.storeCategory === 'qurt';
  const [description, setDescription] = useState('');
  const [composition, setComposition] = useState('');
  const [weight, setWeight]           = useState('');
  const [imageUrl, setImageUrl]       = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading]     = useState(false);
  // Qurt kategoriya ro'yxati: do'konning avvalgi kategoriyalari + shu yerda qo'shilganlar.
  const [available, setAvailable] = useState(true);

  // Tahrirlash rejimi: `/add-product?edit=<kalit>` — xuddi shu forma, mavjud mahsulot bilan to'ldiriladi.
  const [searchParams] = useSearchParams();
  const editBarcode = isQurt ? (searchParams.get('edit') || '') : '';
  const isEdit = editBarcode !== '';
  useEffect(() => {
    if (!isEdit) return;
    let alive = true;
    (async () => {
      const all = await getAllFromIDB(login);
      const p = all.find((x: any) => x.barcode === editBarcode);
      if (!alive) return;
      if (!p) { navigate('/products'); return; }
      setName(p.name || '');
      setPrice(String(p.price ?? ''));
      setBasePrice(p.basePrice ? String(p.basePrice) : '');
      setQuantity(p.quantity > 0 ? String(p.quantity) : '1');
      setAvailable((p.quantity ?? 0) > 0);
      setCategory(p.category || '');
      setWeight(p.weightGrams ? String(p.weightGrams) : '');
      setDescription(p.description || '');
      setComposition(p.composition || '');
      setImageUrl(p.imageUrl || '');
      setImagePreview(p.imageUrl || null);
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, editBarcode, login]);
  const [catOpen, setCatOpen] = useState(false);
  const [newCat, setNewCat]   = useState('');
  const [extraCats, setExtraCats] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(`qurtCats:${(JSON.parse(sessionStorage.getItem('currentUser') || '{}')).login || ''}`) || '[]'); }
    catch { return []; }
  });
  const addQurtCategory = () => {
    const v = newCat.trim().slice(0, 64);
    if (!v) return;
    const known = [...uCats, ...extraCats].find(x => x.toLowerCase() === v.toLowerCase());
    const final = known || v;
    if (!known) {
      const next = [...extraCats, final];
      setExtraCats(next);
      try { localStorage.setItem(`qurtCats:${login}`, JSON.stringify(next)); } catch { /* ixtiyoriy */ }
    }
    setCategory(final);
    setNewCat('');
    setCatOpen(false);
  };

  /** Rasmni OnDex omboriga yuklaydi (ShoxPos backend orqali) va manzilini saqlaydi. */
  const handleQurtImage = async (file: File | undefined) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setMessage({ type: 'error', text: "Faqat jpg, png yoki webp rasm tanlang" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: "Rasm juda katta (maks 5 MB)" });
      return;
    }
    if (!navigator.onLine) {
      setMessage({ type: 'error', text: "Rasm yuklash uchun internet kerak" });
      return;
    }
    setUploading(true); setMessage(null);
    const preview = URL.createObjectURL(file);
    try {
      const fd = new FormData();
      fd.append('file', file);
      // `Content-Type` ni ANIQ multipart qilib beramiz: `axiosInstance` ning standart
      // `application/json` sarlavhasi bilan axios FormData'ni JSON'ga aylantirib yuboradi
      // va fayl yo'qoladi ("Rasm tanlanmadi"). Brauzer chegara (boundary) qismini o'zi qo'shadi.
      const res = await axiosInstance.post('/products/qurt-image', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImageUrl(res.data.url);
      setImagePreview(preview);
    } catch (err: any) {
      URL.revokeObjectURL(preview);
      setImageUrl(''); setImagePreview(null);
      setMessage({ type: 'error', text: err?.response?.data?.message || "Rasm yuklab bo'lmadi" });
    } finally {
      setUploading(false);
    }
  };

  /* load categories */
  useEffect(() => {
    (async () => {
      const ic = await getUserShopCategoriesAsync(login);
      if (ic.length) setUCats(ic);
      if (!user.shopCategories || !ic.length) {
        try {
          const r = await axiosInstance.get('/me');
          if (r.data.success) {
            const u = r.data.user;
            sessionStorage.setItem('currentUser', JSON.stringify(u));
            setUCats(u.shopCategories || []);
            syncUserCategoriesToIDB(u.login, u.shopCategories);
          }
        } catch {}
      }
    })();
  }, [login, user.shopCategories]);

  const cats = getCategories(lang, uCats);

  useEffect(() => {
    if (cats.length > 0 && !category) {
      setCategory(cats[0].value);
    }
  }, [cats, category]);

  /* sync */
  useEffect(() => {
    const h = async () => {
      const n = await syncPendingToMongoDB(login);
      if (n > 0) {
        setMessage({ type: 'info', text: `✅ ${n} ${t('syncSuccess')}` });
        setTimeout(() => setMessage(null), 3000);
      }
    };
    window.addEventListener('online', h);
    if (navigator.onLine) syncPendingToMongoDB(login);
    return () => window.removeEventListener('online', h);
  }, [login]);

  /* price guard */
  useEffect(() => {
    const bp = Number(basePrice), sp = Number(price);
    if (bp > sp && bp > 0 && sp > 0) {
      setMessage({ type: 'error', text: "⚠️ Ulgurji narx sotuv narxidan yuqori bo'lishi mumkin emas!" });
    } else if (message?.type === 'error' && message.text.includes('Ulgurji')) {
      setMessage(null);
    }
  }, [basePrice, price]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader();
    r.onload = ev => {
      const s = ev.target?.result as string;
      setUserImage(s);
      localStorage.setItem('userImage', s);
    };
    r.readAsDataURL(f);
  };

  /* barcode lookup */
  const lookupBarcode = useCallback(async (code: string) => {
    if (!code) return;
    setScanLoad(true);
    setMessage({ type: 'info', text: `🔍 ${t('searching')}` });
    try {
      const idb = await getAllFromIDB(login);
      const localMatch = idb.find((p: any) => String(p.barcode).toLowerCase() === code.toLowerCase());

      if (localMatch) {
        setName(localMatch.name || '');
        setBasePrice(String(localMatch.basePrice || ''));
        setPrice(String(localMatch.price || ''));
        if (localMatch.category) setCategory(localMatch.category);
        setMessage({ type: 'success', text: ` ${t('foundInLocal')}: ${localMatch.name}` });
        return;
      }

      if (navigator.onLine) {
        try {
          console.log('🔍 MaxQoshish: qidiruvga kirdi, code:', code);
          const r = await axiosInstance.get(`/products/search?q=${encodeURIComponent(code)}&login=${encodeURIComponent(login)}`);
          console.log('🔍 MaxQoshish: serverdan javob:', r.data);
          const results = Array.isArray(r.data) ? r.data : [];
          console.log('🔍 MaxQoshish: resultlar soni:', results.length);
          
          if (results.length > 0) {
            let fm = results.find((p: any) => String(p.barcode).toLowerCase() === code.toLowerCase());
            
            if (!fm) {
              fm = results[0];
            }

            console.log('🔍 MaxQoshish: topilgan product:', fm);

            if (fm) {
              setName(fm.name || '');
              setBasePrice(fm.basePrice ? String(fm.basePrice) : '');
              setPrice(fm.price ? String(fm.price) : '');
              if (fm.category) setCategory(fm.category);
              
              let sourceText = t('foundInBase');
              if (fm.isGlobal) {
                sourceText = t('foundInGlobal');
              }
              
              setMessage({ type: 'success', text: ` ${sourceText} ${fm.name}` });
              return;
            }
          }
        } catch (err) {
          console.error('❌ MaxQoshish: Search error:', err);
        }
      }

      setName(''); setBasePrice(''); setPrice('');
      setMessage({ type: 'info', text: "ℹ️ Mahsulot topilmadi. Yangi ma'lumotlarni kiriting." });
    } catch (err) {
      console.error('Lookup error:', err);
      setMessage({ type: 'error', text: 'Xatolik yuz berdi.' });
    } finally {
      setScanLoad(false);
    }
  }, [login]);

  const handleBarcodeKey = useCallback(async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && barcode.trim()) {
      e.preventDefault();
      await lookupBarcode(barcode.trim());
    }
  }, [barcode, lookupBarcode]);

  const handleScanResult = useCallback(async (code: string) => {
    setShowScan(false);
    setBarcode(code);
    await lookupBarcode(code);
  }, [lookupBarcode]);

  /* submit */
  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    // Qurt sotuvchisida shtrix-kod yo'q: bo'sh qoldirsa mahsulot kaliti o'zi yaratiladi.
    // Qurt sotuvchisida shtrix-kod maydoni umuman yo'q: mahsulot kaliti har doim o'zi yaratiladi.
    const code = isEdit ? editBarcode : isQurt
      ? `QURT-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.toUpperCase()
      : barcode.trim();
    if (!name.trim())      { setMessage({ type: 'error', text: t('enterProductName') }); return; }
    if (!code)             { setMessage({ type: 'error', text: t('enterBarcode') }); return; }
    // Qurt: ulgurji narx ixtiyoriy (faqat sotuvchi ko'radi).
    if (!isQurt && !basePrice.trim()) { setMessage({ type: 'error', text: t('enterWholesalePrice') }); return; }
    if (!price.trim())     { setMessage({ type: 'error', text: t('enterSalePrice') }); return; }

    const bp = Number(basePrice || 0), sp = Number(price);
    if (bp > sp) {
      setMessage({ type: 'error', text: t('wholesaleHighError') });
      return;
    }

    // Qurt: mijoz ilovasida ko'rinishi uchun to'liq ma'lumot shart.
    let qurtFields: Record<string, unknown> = {};
    if (isQurt) {
      const grams = Math.round(Number(weight));
      if (!Number.isFinite(grams) || grams < 1 || grams > 100000) {
        setMessage({ type: 'error', text: "Nechi grammligini kiriting (1 dan 100000 gacha)" }); return;
      }
      if (!category) { setMessage({ type: 'error', text: "Kategoriyani tanlang" }); return; }
      if (available && !(Number(quantity) >= 1)) {
        setMessage({ type: 'error', text: "Mavjud mahsulot uchun miqdor kamida 1 bo'lsin (yoki «Mavjud emas» ni tanlang)" }); return;
      }
      if (uploading) { setMessage({ type: 'error', text: "Rasm yuklanishini kuting" }); return; }
      if (!imageUrl) { setMessage({ type: 'error', text: "Mahsulot rasmini tanlang" }); return; }
      qurtFields = {
        weightGrams: grams,
        description: description.trim(),
        composition: composition.trim(),
        imageUrl,
      };
    }

    setLoading(true); setMessage(null);
    try {
      const idb = await getAllFromIDB(login);
      const dup = idb.find((p: any) => String(p.barcode).toLowerCase() === code.toLowerCase());
      if (dup && !isEdit) {
        setMessage({ type: 'error', text: `⚠️ ${t('wholesaleHighError')}` });
        return;
      }
      await addProductOfflineFirst({
        name: name.trim() || code,
        price: sp || 0, basePrice: bp || 0,
        barcode: code,
        category: category || 'general',
        // Qurt: "Mavjud emas" = omborda 0 dona (OnDex'ga available=false bo'lib boradi).
        quantity: isQurt && !available ? 0 : Number(quantity),
        login,
        addedAt: new Date().toISOString(),
        ...qurtFields,
      });
      setMessage({ type: 'success', text: `✅ ${t('successMessage')}` });
      setTimeout(() => navigate('/products'), 1500);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || t('errorOccurred') });
    } finally {
      setLoading(false);
    }
  };

  /* ── styles ── */
  const fs = {
    border: `1.5px solid ${c.surfB}`,
    background: c.surf,
    color: c.text,
    padding: isMobile ? '14px 16px' : '16px 20px',
    borderRadius: 14,
    fontSize: 15,
    transition: 'all .2s ease',
  };
  const ls = {
    display: 'block' as const,
    marginBottom: 12,
    fontSize: 14,
    fontWeight: 600 as const,
    color: c.label,
    letterSpacing: '.2px',
  };

  const BB_H = isMobile ? 72 : 0;

  // Tanlangan kategoriyaning label va emoji si
  const selectedCat = cats.find(cat => cat.value === category);
  const selEmojiMatch = selectedCat?.label.match(/^(\p{Emoji_Presentation}|\p{Extended_Pictographic})\s*/u);
  const selEmoji = selEmojiMatch ? selEmojiMatch[0].trim() : '📦';
  const selLabel = selectedCat
  ? (selEmojiMatch ? selectedCat.label.replace(selEmojiMatch[0], '').trim() : selectedCat.label)
  : t('selectPlaceholder');

  return (
    <MainLayout
      theme={theme}
      userImage={userImage}
      handleImageUpload={handleImageUpload}
      title={isEdit ? 'Mahsulotni tahrirlash' : t('newProduct')}
    >
      {showScan && <ScanOverlay onResult={handleScanResult} onClose={() => setShowScan(false)} />}

      {/* ── Category Modal ── */}
      {showCatModal && (
        <CategoryModal
          cats={cats}
          selected={category}
          onSelect={setCategory}
          onClose={() => setShowCatModal(false)}
          theme={theme}
          isMobile={isMobile}
        />
      )}

      {/* ── Main content ── */}
      <div
        className="mq-root"
        style={{
          maxWidth: isMobile ? '100%' : (isQurt ? 1180 : 850),
          margin: '0 auto',
          padding: isMobile ? `60px 16px ${BB_H + 40}px` : '10px 0 80px',
          minHeight: isMobile ? 'calc(100vh - 140px)' : 'calc(100vh - 120px)',
          display: 'flex',
          alignItems: isMobile || isQurt ? 'flex-start' : 'center',
          justifyContent: 'center',
        }}
      >
        <div
          className="mq-card"
          style={isQurt ? {
            // Qurt: tashqi qobiq yo'q — ichki kartalar to'liq kenglikdan foydalanadi.
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
          } : {
            background: c.card,
            borderRadius: isMobile ? 24 : 32,
            padding: isMobile ? '32px 24px' : '60px 50px',
            border: `1px solid ${c.cardB}`,
            boxShadow: theme === 'dark' ? '0 20px 60px rgba(0,0,0,.7)' : '0 10px 40px rgba(0,0,0,.1)',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {isQurt ? (
          <form
            onSubmit={handleSubmit}
            style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
          >
            {(() => {
              const card = (title: string, children: React.ReactNode) => (
                <div style={{
                  background: c.card, border: `1px solid ${c.cardB}`, borderRadius: 18,
                  padding: isMobile ? 16 : 22, display: 'flex', flexDirection: 'column', gap: 16,
                }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: c.text }}>{title}</div>
                  {children}
                </div>
              );
              const lbl = (text: string, hint?: string) => (
                <div style={{ marginBottom: 8 }}>
                  <label style={{ ...ls, marginBottom: 0, fontSize: 13.5 }}>{text}</label>
                  {hint && <div style={{ fontSize: 12, color: c.muted, marginTop: 2 }}>{hint}</div>}
                </div>
              );
              const qfs = { ...fs, padding: '13px 14px', borderRadius: 12 };
              const suffix = (s: string) => (
                <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: c.muted, fontWeight: 700, pointerEvents: 'none' }}>{s}</span>
              );
              const cols2 = { display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 } as const;
              return (
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.5fr 1fr', gap: 20, alignItems: 'start' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {card("Asosiy ma'lumotlar", (
                      <>
                        <div style={cols2}>
                          <div>
                            {lbl('Mahsulot nomi *')}
                            <input className="mq-f" type="text" required maxLength={120} value={name}
                              onChange={e => setName(e.target.value)} placeholder="Masalan: Sho'r qurt"
                              style={qfs} />
                          </div>
                          <div style={{ position: 'relative' }}>
                            {lbl('Kategoriya *')}
                            <button
                              type="button" onClick={() => setCatOpen(o => !o)}
                              style={{
                                ...qfs, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                cursor: 'pointer', textAlign: 'left' as const, gap: 8,
                              }}
                            >
                              <span style={{ color: category ? c.text : '#4b5563', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {category || 'Kategoriyani tanlang'}
                              </span>
                              <ChevronDown size={18} color={c.muted} style={{ flexShrink: 0, transform: catOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
                            </button>
                            {catOpen && (
                              <>
                                <div onClick={() => setCatOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
                                <div style={{
                                  position: 'absolute', left: 0, right: 0, top: 'calc(100% + 6px)', zIndex: 41,
                                  background: c.card, border: `1px solid ${c.cardB}`, borderRadius: 14,
                                  boxShadow: '0 12px 32px rgba(0,0,0,.35)', padding: 8,
                                }}>
                                  <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                                    {Array.from(new Set([...uCats, ...extraCats].filter(Boolean))).length === 0 && (
                                      <div style={{ padding: '10px 12px', fontSize: 13, color: c.muted }}>
                                        Hali kategoriya yo'q — pastdan yangisini qo'shing
                                      </div>
                                    )}
                                    {Array.from(new Set([...uCats, ...extraCats].filter(Boolean))).map(cat => (
                                      <button
                                        type="button" key={cat}
                                        onClick={() => { setCategory(cat); setCatOpen(false); }}
                                        style={{
                                          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                          padding: '10px 12px', borderRadius: 10, border: 'none', cursor: 'pointer',
                                          background: category === cat ? 'rgba(99,102,241,.16)' : 'transparent',
                                          color: c.text, fontSize: 14, fontWeight: 600, textAlign: 'left' as const,
                                          fontFamily: "'DM Sans', sans-serif",
                                        }}
                                      >
                                        <span>{cat}</span>
                                        {category === cat && <Check size={16} color="#818cf8" />}
                                      </button>
                                    ))}
                                  </div>
                                  <div style={{ display: 'flex', gap: 8, marginTop: 8, paddingTop: 8, borderTop: `1px solid ${c.cardB}` }}>
                                    <input
                                      className="mq-f" type="text" maxLength={64} value={newCat}
                                      onChange={e => setNewCat(e.target.value)}
                                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addQurtCategory(); } }}
                                      placeholder="Yangi kategoriya"
                                      style={{ ...qfs, padding: '10px 12px', fontSize: 14 }}
                                    />
                                    <button
                                      type="button" onClick={addQurtCategory} disabled={!newCat.trim()}
                                      aria-label="Kategoriya qo'shish"
                                      style={{
                                        flexShrink: 0, width: 44, borderRadius: 12, border: 'none',
                                        cursor: newCat.trim() ? 'pointer' : 'not-allowed',
                                        opacity: newCat.trim() ? 1 : 0.5,
                                        background: '#6366f1', color: '#fff',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                      }}
                                    ><Plus size={20} /></button>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </>
                    ))}
                    {card('Narx va hajm', (
                      <>
                        <div style={cols2}>
                          <div>
                            {lbl('Narxi *')}
                            <div style={{ position: 'relative' }}>
                              <input className="mq-f" type="number" min="0" value={price}
                                onChange={e => setPrice(e.target.value)} placeholder="0"
                                style={{ ...qfs, paddingRight: 52 }} />
                              {suffix("so'm")}
                            </div>
                          </div>
                          <div>
                            {lbl('Ulgurji narx')}
                            <div style={{ position: 'relative' }}>
                              <input className="mq-f" type="number" min="0" value={basePrice}
                                onChange={e => setBasePrice(e.target.value)} placeholder="0"
                                style={{ ...qfs, paddingRight: 52 }} />
                              {suffix("so'm")}
                            </div>
                            <div style={{ fontSize: 12, color: c.muted, marginTop: 6 }}>Ixtiyoriy, faqat siz ko'rasiz</div>
                          </div>
                        </div>
                        <div style={cols2}>
                          <div>
                            {lbl('Nechi gramm *')}
                            <div style={{ position: 'relative' }}>
                              <input className="mq-f" type="number" min="1" max="100000" step="1" value={weight}
                                onChange={e => setWeight(e.target.value)} placeholder="Masalan: 250"
                                style={{ ...qfs, paddingRight: 40 }} />
                              {suffix('g')}
                            </div>
                          </div>
                          <div>
                            {lbl('Miqdor (ombordagi soni)')}
                            <input className="mq-f" type="number" min="0" value={quantity}
                              disabled={!available}
                              onChange={e => setQuantity(e.target.value)} style={{ ...qfs, opacity: available ? 1 : 0.5 }} />
                          </div>
                        </div>
                      </>
                    ))}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {card('Rasm *', (
                    <label
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10,
                        cursor: uploading ? 'wait' : 'pointer', textAlign: 'center',
                        minHeight: 240, padding: 16, borderRadius: 14,
                        border: `2px dashed ${imageUrl ? '#6366f1' : c.surfB}`, background: c.surf,
                      }}
                    >
                      {imagePreview ? (
                        // Cho'zinchoq 2.4:1 — mijoz ilovasida ham aynan shunday ko'rinadi.
                        <img src={imagePreview} alt="" style={{ width: '100%', maxHeight: 260, objectFit: 'contain', borderRadius: 10 }} />
                      ) : (
                        <div style={{
                          width: '100%', aspectRatio: '2.4 / 1', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: 'rgba(99,102,241,.1)',
                        }}>
                          <ImagePlus size={34} color="#818cf8" strokeWidth={1.8} />
                        </div>
                      )}
                      <div style={{ color: c.text, fontWeight: 600, fontSize: 14 }}>
                        {uploading ? 'Yuklanmoqda...' : imageUrl ? 'Almashtirish uchun bosing' : 'Rasm tanlash'}
                      </div>
                      <div style={{ color: c.muted, fontSize: 12 }}>JPG, PNG yoki WEBP, 5 MB gacha</div>
                      <input
                        type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading}
                        style={{ display: 'none' }}
                        onChange={e => { handleQurtImage(e.target.files?.[0]); e.target.value = ''; }}
                      />
                    </label>
                  ))}
                  {card('Holat', (
                    <div>
                      {lbl('Mavjudlik *', "«Mavjud emas» bo'lsa mahsulot mijozlarga ko'rinmaydi")}
                      <div style={{ display: 'flex', flexDirection: 'row', gap: 10 }}>
                        {([
                          { v: true, label: 'Mavjud' },
                          { v: false, label: 'Mavjud emas' },
                        ] as const).map(o => {
                          const sel = available === o.v;
                          return (
                            <button
                              type="button" key={o.label} role="radio" aria-checked={sel}
                              onClick={() => setAvailable(o.v)}
                              style={{
                                flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 10, padding: '12px 12px', borderRadius: 12,
                                cursor: 'pointer', textAlign: 'left' as const, whiteSpace: 'nowrap' as const,
                                border: `1.5px solid ${sel ? '#6366f1' : c.surfB}`,
                                background: sel ? 'rgba(99,102,241,.12)' : c.surf,
                                color: c.text, fontSize: 14.5, fontWeight: 600,
                                fontFamily: "'DM Sans', sans-serif",
                              }}
                            >
                              <span style={{
                                width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                                border: `2px solid ${sel ? '#6366f1' : c.muted}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}>
                                {sel && <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#6366f1' }} />}
                              </span>
                              {o.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  </div>
                </div>
              );
            })()}

            {message && (
              <div className="mq-msg" style={{
                padding: '11px 14px', borderRadius: 11,
                display: 'flex', alignItems: 'flex-start', gap: 8,
                background: MSGS[message.type].bg,
                color: MSGS[message.type].col,
                border: `1px solid ${MSGS[message.type].bdr}`,
                fontSize: 13.5, fontWeight: 500, lineHeight: 1.5,
              }}>
                <span style={{ flexShrink: 0 }}>{MSGS[message.type].ico}</span>
                <span>{message.text.replace(MSGS[message.type].ico, '').trim()}</span>
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', flexDirection: isMobile ? 'column-reverse' : 'row' }}>
              <button
                type="button" onClick={() => navigate('/products')}
                style={{
                  padding: '14px 26px', borderRadius: 14, cursor: 'pointer', fontSize: 15, fontWeight: 600,
                  background: 'transparent', color: c.text, border: `1.5px solid ${c.surfB}`,
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >Bekor qilish</button>
              <button
                type="submit" disabled={loading || uploading} className="mq-save"
                style={{
                  padding: '14px 34px', borderRadius: 14, border: 'none', color: '#fff', fontSize: 15, fontWeight: 700,
                  cursor: loading || uploading ? 'not-allowed' : 'pointer',
                  opacity: loading || uploading ? 0.7 : 1,
                  background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                  boxShadow: '0 8px 24px rgba(99,102,241,.35)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {loading ? (<><div className="mq-spin" /><span>Saqlanmoqda...</span></>) : <span>Saqlash</span>}
              </button>
            </div>
          </form>
          ) : (
          <form
            onSubmit={handleSubmit}
            style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 24 : 32, flex: 1 }}
          >

            {/* ── Row 1: Nomi + Barcode ── */}
            {/* ── Row 1: Nomi + Barcode ── */}
<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: isMobile ? 12 : 24 }}>
  <div>
    {/* ✅ Balandligi barcode label bilan bir xil bo'lsin */}
    <div style={{
      display: 'flex',
      alignItems: 'center',
      height: 28,          // ← fixed height
      marginBottom: 12,
    }}>
      <label style={{ ...ls, marginBottom: 0 }}>
        {t('productName')}
      </label>
    </div>
    <input
      className="mq-f"
      type="text"
      required
      value={name}
      onChange={e => setName(e.target.value)}
      placeholder="Enter product name..."
      style={fs}
    />
  </div>

  <div>
  <div style={{
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 28,
    marginBottom: 12,
  }}>
    <label style={{ ...ls, marginBottom: 0 }}>
      {t('barcode')}
    </label>

    {/* ✅ Mobileda ham, desktopda ham ko'rinadi */}
    <button
      type="button"
      onClick={() => setShowScan(true)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        background: 'rgba(99,102,241,0.12)',
        border: '1.5px solid rgba(99,102,241,0.3)',
        borderRadius: 10,
        padding: '4px 10px',
        cursor: 'pointer',
        color: '#818cf8',
        fontSize: 12,
        fontWeight: 600,
        fontFamily: "'DM Sans', sans-serif",
        lineHeight: 1,
      }}
    >
      <QrCode size={16} strokeWidth={2} color="#818cf8" />
      </button>
  </div>

  <input
    className="mq-f"
    type="text"
    value={barcode}
    onChange={e => setBarcode(e.target.value)}
    onKeyDown={handleBarcodeKey}
    placeholder={t('enterAutoFill')}
    style={{ ...fs, fontFamily: 'monospace' }}
  />
</div>
</div>

            {/* ── Row 2: Ulgurji + Sotuv ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: isMobile ? 12 : 24 }}>
              <div>
                <label style={ls}>{t('wholesalePrice') || 'Ulgurji narx'}</label>
                <div style={{ position: 'relative' }}>
                  <input className="mq-f" type="number" min="0" value={basePrice}
                    onChange={e => setBasePrice(e.target.value)} placeholder="0"
                    style={{ ...fs, paddingRight: 46 }} />
                  <span style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: c.muted, fontWeight: 700, pointerEvents: 'none' }}>{t('currencyUnit')}</span>
                </div>
              </div>
              <div>
                <label style={ls}>{t('salePrice') || 'Sotuv narxi'}</label>
                <div style={{ position: 'relative' }}>
                  <input className="mq-f" type="number" min="0" value={price}
                    onChange={e => setPrice(e.target.value)} placeholder="0"
                    style={{ ...fs, paddingRight: 46 }} />
                  <span style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: c.muted, fontWeight: 700, pointerEvents: 'none' }}>so'm</span>
                </div>
              </div>
            </div>

            {/* ── Row 3: Kategoriya + Miqdor ── */}
           <div style={{
  display: 'grid',
  // ✅ Mobileda 1 ustun (vertikal), desktopda 2 ustun
  gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
  gap: isMobile ? 16 : 24,
}}>
  {/* ── MIQDOR ── */}
  <div>
    <label style={ls}>{t('quantity') || 'Miqdor'}</label>
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      // ✅ Barcha inputlar bilan bir xil balandlik
      height: isMobile ? 50 : 54,
    }}>
      <button
        type="button"
        className="mq-qbtn"
        onClick={() => setQuantity(String(Math.max(0, Number(quantity) - 1)))}
        style={{
          width: isMobile ? 50 : 54,
          height: '100%',
          flexShrink: 0,
          background: theme === 'dark' ? '#1e2740' : '#e2e8f0',
          color: theme === 'dark' ? '#f1f5f9' : '#475569',
          borderRadius: 12,
          border: `1.5px solid ${c.surfB}`,
          fontSize: 22,
        }}
      >−</button>

      <input
        className="mq-f"
        type="number"
        min="0"
        value={quantity}
        onChange={e => setQuantity(e.target.value)}
        style={{
          ...fs,
          flex: 1,
          height: '100%',
          textAlign: 'center' as const,
          fontWeight: 700,
          fontSize: 18,
          padding: 0,
        }}
      />

      <button
        type="button"
        className="mq-qbtn"
        onClick={() => setQuantity(String(Number(quantity) + 1))}
        style={{
          width: isMobile ? 50 : 54,
          height: '100%',
          flexShrink: 0,
          background: '#6366f1',
          color: '#fff',
          borderRadius: 12,
          border: 'none',
          boxShadow: '0 4px 12px rgba(99,102,241,.3)',
          fontSize: 22,
        }}
      >+</button>
    </div>
  </div>

              {/* ── KATEGORIYA trigger ── */}
  {!isQurt && (<div>
    <label style={ls}>{t('category') || 'Kategoriya'}</label>
    <button
      type="button"
      onClick={() => setShowCatModal(true)}
      style={{
        ...fs,
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        cursor: 'pointer',
        textAlign: 'left' as const,
        gap: 8,
        // ✅ Barcha inputlar bilan bir xil balandlik
        height: isMobile ? 50 : 54,
        padding: isMobile ? '0 14px' : '0 16px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 9, flexShrink: 0,
          background: theme === 'dark' ? '#1e2740' : '#e9eef5',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 17,
        }}>
          {selEmoji}
        </div>
        <span style={{
          color: c.text, fontWeight: 600, fontSize: 14,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {selLabel}
        </span>
      </div>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
        stroke={c.muted} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
        style={{ flexShrink: 0 }}>
        <polyline points="6 9 12 15 18 9"/>
      </svg>
    </button>
  </div>)}


</div>

            {/* ── message ── */}
            {message && (
              <div className="mq-msg" style={{
                padding: '11px 14px', borderRadius: 11,
                display: 'flex', alignItems: 'flex-start', gap: 8,
                background: MSGS[message.type].bg,
                color: MSGS[message.type].col,
                border: `1px solid ${MSGS[message.type].bdr}`,
                fontSize: 13.5, fontWeight: 500, lineHeight: 1.5,
              }}>
                <span style={{ flexShrink: 0 }}>{MSGS[message.type].ico}</span>
                <span>{message.text.replace(MSGS[message.type].ico, '').trim()}</span>
              </div>
            )}

            {/* ── Submit ── */}
            <div style={{ marginTop: isMobile ? 8 : 16, flex: isMobile ? 1 : 'none', display: 'flex', alignItems: 'flex-end' }}>
              <button
                type="submit"
                disabled={loading || scanLoad}
                className="mq-save"
                style={{
                  width: '100%',
                  padding: isMobile ? '16px 20px' : '18px 24px',
                  borderRadius: 16,
                  background: loading || scanLoad
                    ? (theme === 'dark' ? '#1e2740' : '#94a3b8')
                    : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                  color: '#fff',
                  border: 'none',
                  fontSize: 16,
                  fontWeight: 700,
                  cursor: (loading || scanLoad) ? 'not-allowed' : 'pointer',
                  boxShadow: (loading || scanLoad) ? 'none' : '0 8px 24px rgba(99,102,241,.4)',
                  transition: 'all .2s ease',
                  opacity: (loading || scanLoad) ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {loading ? (
                  <>
                    <div className="mq-spin" />
                    <span>{t('saving') || 'Saqlanmoqda...'}</span>
                  </>
                ) : (
                 <span>{scanLoad ? t('searching') : t('saveProduct')}</span>
                )}
              </button>
            </div>

          </form>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
