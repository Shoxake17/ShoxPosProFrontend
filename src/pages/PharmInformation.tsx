import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BrowserMultiFormatReader } from '@zxing/library';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import axiosInstance from '../api/axiosInstance';
import { Search, QrCode, Save, Edit3, X, Package, Pill, TrendingUp, MapPin, Calendar, FileText } from 'lucide-react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const DK = { 
  card: '#0d1220', cardB: '#1e2740', surf: '#111827', 
  text: '#f1f5f9', muted: '#64748b', label: '#cbd5e1',
  accent: '#6366f1', accent2: '#10b981'
};
const LT = { 
  card: '#ffffff', cardB: '#e2e8f0', surf: '#f1f5f9', 
  text: '#0f172a', muted: '#64748b', label: '#1e293b',
  accent: '#4f46e5', accent2: '#059669'
};

const CSS = `
.pharm-root *, .pharm-root *::before, .pharm-root *::after { box-sizing: border-box; }
.pharm-root { font-family: 'DM Sans', sans-serif; }
.pharm-scr {
  position:fixed; inset:0; z-index:3000;
  background:#000; display:flex; flex-direction:column;
  align-items:center; justify-content:center;
}
.pharm-scr video { width:100%; height:100%; object-fit:cover; position:absolute; inset:0; }
.pharm-sfr {
  position:relative; z-index:10;
  width:260px; height:260px;
  border:1.5px solid rgba(255,255,255,.15); border-radius:24px;
  box-shadow:0 0 0 9999px rgba(0,0,0,.58);
}
.pharm-sfr::after {
  content:''; position:absolute; inset:-2px;
  border:3px solid #6366f1; border-radius:24px;
  clip-path:polygon(0 0,28% 0,28% 9%,72% 9%,72% 0,100% 0,100% 28%,91% 28%,91% 72%,100% 72%,100% 100%,72% 100%,72% 91%,28% 91%,28% 100%,0 100%,0 72%,9% 72%,9% 28%,0 28%);
}
@keyframes scLine { 0%,100%{top:8px;opacity:.25} 50%{top:242px;opacity:1} }
.pharm-sl {
  position:absolute; top:8px; left:8px; right:8px; height:2px;
  background:#6366f1; box-shadow:0 0 12px #6366f1;
  animation:scLine 2.4s ease-in-out infinite;
}
`;

function injectCSS() {
  if (document.getElementById('pharm-info-css')) return;
  const s = document.createElement('style');
  s.id = 'pharm-info-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}

function useIsMobile() {
  const [v, setV] = useState(() => window.innerWidth <= 768);
  useEffect(() => {
    const h = () => setV(window.innerWidth <= 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return v;
}

function ScanOverlay({ onResult, onClose }: { onResult: (c: string) => void; onClose: () => void }) {
  const vRef = useRef<HTMLVideoElement>(null);
  const rRef = useRef(new BrowserMultiFormatReader());
  const done = useRef(false);

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
    <div className="pharm-scr">
      <video ref={vRef} autoPlay muted playsInline />
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
        <div className="pharm-sfr"><div className="pharm-sl" /></div>
        <p style={{ marginTop: 28, color: '#fff', fontSize: 15, fontWeight: 500, textShadow: '0 1px 4px rgba(0,0,0,.6)' }}>
          Barcodeni skanerlang
        </p>
      </div>
      <button onClick={onClose} style={{ position: 'absolute', top: 40, right: 24, zIndex: 20, background: 'rgba(0,0,0,.55)', border: 'none', borderRadius: '50%', width: 44, height: 44, color: '#fff', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
    </div>
  );
}

export default function PharmInformation() {
  injectCSS();
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  const [userImage, setUserImage] = useState<string | null>(localStorage.getItem('userImage'));
  const [theme] = useState<'dark' | 'light'>((localStorage.getItem('theme') as any) || 'dark');
  const c = theme === 'dark' ? DK : LT;

  const [query, setQuery] = useState('');
  const [product, setProduct] = useState<any>(null);
  const [editableProduct, setEditableProduct] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showCamera, setShowCamera] = useState(false);

  const [user] = useState(() => JSON.parse(sessionStorage.getItem('currentUser') || '{}'));
  const login = user?.login || '';

  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReader = useRef(new BrowserMultiFormatReader());
  const scannerRunning = useRef(false);

  useEffect(() => {
    const savedTheme = (localStorage.getItem('theme') as 'dark' | 'light') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    const savedImage = localStorage.getItem('userImage');
    if (savedImage) setUserImage(savedImage);
  }, []);

  const searchProduct = useCallback(async (q: string) => {
    q = q.trim();
    if (!q) { toast.info('Qidirish uchun ma\'lumot kiriting!'); return; }
    setLoading(true);
    try {
      const res = await axiosInstance.get(`/pharmacy/pharm-info/${encodeURIComponent(login)}?q=${encodeURIComponent(q)}`);
      setProduct(res.data);
      setEditableProduct({ ...res.data });
      setIsEditing(false);
      toast.success('Dori topildi!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Dori topilmadi!');
      setProduct(null);
      setEditableProduct(null);
    } finally {
      setLoading(false);
    }
  }, [login]);

  const saveProduct = useCallback(async () => {
    if (!editableProduct || !product) return;
    setSaving(true);
    try {
      const payload = {
        barcode: product.barcode,
        login,
        name: editableProduct.name,
        category: editableProduct.category,
        dosage: editableProduct.dosage,
        manufacturer: editableProduct.manufacturer,
        price: editableProduct.price,
        basePrice: editableProduct.basePrice,
        quantity: editableProduct.quantity,
        expiryDate: editableProduct.expiryDate,
        shelfNumber: editableProduct.shelfNumber,
        rowNumber: editableProduct.rowNumber,
        description: editableProduct.description
      };
      
      const res = await axiosInstance.post('/pharmacy/update-pharm-product-info', payload);
      setProduct(res.data.product);
      setEditableProduct({ ...res.data.product });
      setIsEditing(false);
      toast.success('Ma\'lumotlar saqlandi!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Xatolik yuz berdi!');
      setEditableProduct({ ...product });
    } finally {
      setSaving(false);
    }
  }, [editableProduct, product, login]);

  const cancelEdit = () => {
    setEditableProduct({ ...product });
    setIsEditing(false);
  };

  const handleSearchInput = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && query.trim()) {
      searchProduct(query.trim());
    }
  }, [query, searchProduct]);

  const handleScanResult = async (code: string) => {
    setShowCamera(false);
    setQuery(code);
    await searchProduct(code);
  };

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

  const currentData = isEditing ? editableProduct : product;

  return (
    <MainLayout
      theme={theme}
      userImage={userImage}
      handleImageUpload={handleImageUpload}
      title="Dori ma'lumotlar"
    >
      {showCamera && <ScanOverlay onResult={handleScanResult} onClose={() => setShowCamera(false)} />}

      <div style={{
        maxWidth: isMobile ? '100%' : 950,
        margin: '0 auto',
        padding: isMobile ? `${60}px 16px 140px` : '10px 0 80px',
        boxSizing: 'border-box',
        width: '100%'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, boxSizing: 'border-box', width: '100%' }}>
          
          {/* Search & Scannero */}
          <div style={{ display: 'flex', alignItems: 'center', height: 56, gap: 12, boxSizing: 'border-box', width: '100%' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={20} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: c.muted, pointerEvents: 'none' }} />
              <input
                type="text"
                placeholder="Barcode, nomi yoki partiya raqamini kiriting..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleSearchInput}
                style={{
                  width: '90%', height: 56, padding: '0 14px 0 52px',
                  background: c.surf, border: `1px solid ${c.cardB}`, borderRadius: 16,
                  color: c.text, fontSize: 15, outline: 'none',
                  transition: 'all 0.2s'
                }}
                onFocus={e => {
                  e.target.style.borderColor = c.accent;
                  e.target.style.boxShadow = `0 0 0 3px ${c.accent}20`;
                }}
                onBlur={e => {
                  e.target.style.borderColor = c.cardB;
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            <button
              type="button"
              onClick={() => setShowCamera(true)}
              style={{ 
                display: 'flex', alignItems: 'center', gap: 6, 
                background: 'rgba(99,102,241,0.12)', 
                border: '1.5px solid rgba(99,102,241,0.3)', 
                borderRadius: 12, 
                padding: '12px 14px', 
                cursor: 'pointer', 
                color: '#818cf8', 
                fontSize: 12, 
                fontWeight: 600,
                height: 56
              }}
            >
              <QrCode size={22} strokeWidth={2} color="#818cf8" />
            </button>
          </div>

          {loading && (
            <div style={{ padding: '60px', textAlign: 'center', color: c.muted, fontSize: 15 }}>
              <div style={{
                display: 'inline-block', width: 24, height: 24, border: `3px solid ${c.accent}30`,
                borderTopColor: c.accent, borderRadius: '50%', animation: 'spin 1s linear infinite'
              }} />
              <div style={{ marginTop: 12 }}>Qidirilmoqda...</div>
            </div>
          )}

          {currentData && (
            <div style={{
              background: c.card, borderRadius: 24,
              border: `1px solid ${c.cardB}`, padding: isMobile ? '24px' : '36px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
              overflow: 'hidden',
              boxSizing: 'border-box',
              width: '100%'
            }}>
              {/* Header */}
              <div style={{ 
                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                marginBottom: 28, gap: 16, flexWrap: 'wrap'
              }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editableProduct.name || ''}
                      onChange={(e) => setEditableProduct({ ...editableProduct, name: e.target.value })}
                      style={{
                        width: '100%',
                        background: c.surf,
                        border: `1px solid ${c.cardB}`,
                        borderRadius: 12,
                        padding: '10px 14px',
                        fontSize: 20,
                        fontWeight: 700,
                        color: c.text,
                        outline: 'none'
                      }}
                    />
                  ) : (
                    <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: c.text }}>
                      {currentData.name}
                    </h2>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  {!isEditing ? (
                    <button
                      onClick={() => setIsEditing(true)}
                      style={{
                        background: c.accent,
                        color: '#fff',
                        border: 'none',
                        borderRadius: 12,
                        padding: '10px 18px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        fontWeight: 600,
                        fontSize: 14,
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      <Edit3 size={18} />
                      Tahrirlash
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={cancelEdit}
                        style={{
                          background: c.cardB,
                          color: c.text,
                          border: 'none',
                          borderRadius: 12,
                          padding: '10px 18px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          fontWeight: 600,
                          fontSize: 14,
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        <X size={18} />
                        Bekor
                      </button>
                      <button
                        onClick={saveProduct}
                        disabled={saving}
                        style={{
                          background: c.accent2,
                          color: '#fff',
                          border: 'none',
                          borderRadius: 12,
                          padding: '10px 18px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          fontWeight: 600,
                          fontSize: 14,
                          cursor: saving ? 'not-allowed' : 'pointer',
                          opacity: saving ? 0.7 : 1,
                          transition: 'all 0.2s'
                        }}
                      >
                        <Save size={18} />
                        {saving ? 'Saqlanmoqda...' : 'Saqlash'}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Read-only badges */}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 28 }}>
                <div style={{
                  background: `${c.accent}15`, border: `1px solid ${c.accent}25`,
                  padding: '8px 14px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 8
                }}>
                  <span style={{ color: c.muted, fontSize: 12, fontWeight: 600 }}>Barcode:</span>
                  <span style={{ color: c.accent, fontWeight: 800, fontFamily: 'monospace', fontSize: 14 }}>
                    {currentData.barcode}
                  </span>
                </div>
                {currentData.batchNumber && (
                  <div style={{
                    background: `${c.accent2}15`, border: `1px solid ${c.accent2}25`,
                    padding: '8px 14px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 8
                  }}>
                    <span style={{ color: c.muted, fontSize: 12, fontWeight: 600 }}>Partiya:</span>
                    <span style={{ color: c.accent2, fontWeight: 800, fontSize: 14 }}>
                      {currentData.batchNumber}
                    </span>
                  </div>
                )}
                <div style={{
                  background: currentData.isPrescriptionRequired ? '#f9731615' : `${c.cardB}50`,
                  border: `1px solid ${currentData.isPrescriptionRequired ? '#f9731625' : c.cardB}`,
                  padding: '8px 14px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 8
                }}>
                  <span style={{ color: c.muted, fontSize: 12, fontWeight: 600 }}>Retsept:</span>
                  <span style={{ 
                    color: currentData.isPrescriptionRequired ? '#f97316' : c.muted, 
                    fontWeight: 800, fontSize: 14 
                  }}>
                    {currentData.isPrescriptionRequired ? 'Talab qilinadi' : 'Talab qilinmaydi'}
                  </span>
                </div>
              </div>

              {/* Main grid */}
              <div style={{ 
                display: 'grid', gridTemplateColumns: '1fr 1fr', 
                gap: 12, marginBottom: 24 
              }}>
                {/* Left column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <FieldRow
                    label="Kategoriya"
                    icon={<Package size={16} color={c.muted} />}
                    isEditing={isEditing}
                    value={currentData.category}
                    onChange={(val) => setEditableProduct({ ...editableProduct, category: val })}
                    theme={c}
                  />
                  <FieldRow
                    label="Doza"
                    icon={<Pill size={16} color={c.muted} />}
                    isEditing={isEditing}
                    value={currentData.dosage}
                    onChange={(val) => setEditableProduct({ ...editableProduct, dosage: val })}
                    theme={c}
                  />
                  <FieldRow
                    label="Ishlab chiqaruvchi"
                    icon={<FileText size={16} color={c.muted} />}
                    isEditing={isEditing}
                    value={currentData.manufacturer}
                    onChange={(val) => setEditableProduct({ ...editableProduct, manufacturer: val })}
                    theme={c}
                  />
                  <FieldRow
                    label="Yaroqlilik muddati"
                    icon={<Calendar size={16} color={c.muted} />}
                    isEditing={isEditing}
                    value={
                      isEditing 
                        ? (currentData.expiryDate ? new Date(currentData.expiryDate).toISOString().split('T')[0] : '')
                        : (currentData.expiryDate ? new Date(currentData.expiryDate).toLocaleDateString('uz-UZ') : '-')
                    }
                    type="date"
                    onChange={(val) => setEditableProduct({ ...editableProduct, expiryDate: val })}
                    theme={c}
                  />
                </div>

                {/* Right column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <FieldRow
                    label="Asosiy (chiqim) narx"
                    icon={<TrendingUp size={16} color={c.muted} />}
                    isEditing={isEditing}
                    value={currentData.basePrice}
                    type="number"
                    min={0}
                    suffix="so'm"
                    onChange={(val) => setEditableProduct({ ...editableProduct, basePrice: Number(val) })}
                    theme={c}
                  />
                  <FieldRow
                    label="Sotish narxi"
                    icon={<TrendingUp size={16} color={c.accent2} />}
                    isEditing={isEditing}
                    value={currentData.price}
                    type="number"
                    min={0}
                    suffix="so'm"
                    onChange={(val) => setEditableProduct({ ...editableProduct, price: Number(val) })}
                    theme={c}
                  />
                  <FieldRow
                    label="Miqdor"
                    icon={<Package size={16} color={c.muted} />}
                    isEditing={isEditing}
                    value={currentData.quantity}
                    type="number"
                    min={0}
                    suffix="ta"
                    onChange={(val) => setEditableProduct({ ...editableProduct, quantity: Number(val) })}
                    theme={c}
                  />
                  <FieldRow
                    label="Shkaf va qator"
                    icon={<MapPin size={16} color={c.muted} />}
                    isEditing={isEditing}
                    twoFields
                    value1={currentData.shelfNumber}
                    value2={currentData.rowNumber}
                    onChange1={(val) => setEditableProduct({ ...editableProduct, shelfNumber: val })}
                    onChange2={(val) => setEditableProduct({ ...editableProduct, rowNumber: val })}
                    theme={c}
                  />
                </div>
              </div>

              {/* Description */}
              <div style={{ marginTop: 8 }}>
                <div style={{ 
                  color: c.muted, fontSize: 12, fontWeight: 700, 
                  marginBottom: 8, letterSpacing: 0.3 
                }}>
                  Tavsif
                </div>
                {isEditing ? (
                  <textarea
                    value={editableProduct.description || ''}
                    onChange={(e) => setEditableProduct({ ...editableProduct, description: e.target.value })}
                    placeholder="Tavsif yozing..."
                    rows={4}
                    style={{
                      width: '100%',
                      background: c.surf,
                      border: `1px solid ${c.cardB}`,
                      borderRadius: 14,
                      padding: '14px',
                      fontSize: 14,
                      color: c.text,
                      outline: 'none',
                      resize: 'vertical',
                      fontFamily: 'inherit'
                    }}
                  />
                ) : (
                  <div style={{
                    background: c.surf,
                    border: `1px solid ${c.cardB}`,
                    borderRadius: 14,
                    padding: '16px',
                    color: c.text,
                    fontSize: 14,
                    lineHeight: 1.6,
                    whiteSpace: 'pre-wrap'
                  }}>
                    {currentData.description || 'Tavsif berilmagan'}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      <ToastContainer theme={theme === 'dark' ? 'dark' : 'light'} position="bottom-center" autoClose={2500} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </MainLayout>
  );
}

function FieldRow({ 
  label, icon, isEditing, value, onChange, type = 'text', min, 
  suffix, twoFields, value1, value2, onChange1, onChange2, theme 
}: any) {
  return (
    <div style={{
      background: theme.surf,
      border: `1px solid ${theme.cardB}`,
      borderRadius: 16,
      padding: '12px 14px',
      overflow: 'hidden',
      width: '100%',
      boxSizing: 'border-box'
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8
      }}>
        {icon}
        <span style={{
          color: theme.muted, fontSize: 12, fontWeight: 700, letterSpacing: 0.3
        }}>
          {label}
        </span>
      </div>
      {twoFields ? (
        <div style={{ display: 'flex', gap: 10, width: '100%', boxSizing: 'border-box' }}>
          <input
            type="text"
            value={isEditing ? value1 || '' : value1 || '-'}
            disabled={!isEditing}
            onChange={(e) => isEditing && onChange1(e.target.value)}
            style={{
              flex: 1,
              minWidth: 0,
              background: isEditing ? theme.card : 'transparent',
              border: isEditing ? `1px solid ${theme.cardB}` : 'none',
              borderRadius: 10,
              padding: '8px 10px',
              fontSize: 14,
              fontWeight: 600,
              color: theme.text,
              outline: 'none',
              cursor: isEditing ? 'text' : 'default',
              boxSizing: 'border-box'
            }}
          />
          <input
            type="text"
            value={isEditing ? value2 || '' : value2 || '-'}
            disabled={!isEditing}
            onChange={(e) => isEditing && onChange2(e.target.value)}
            style={{
              flex: 1,
              minWidth: 0,
              background: isEditing ? theme.card : 'transparent',
              border: isEditing ? `1px solid ${theme.cardB}` : 'none',
              borderRadius: 10,
              padding: '8px 10px',
              fontSize: 14,
              fontWeight: 600,
              color: theme.text,
              outline: 'none',
              cursor: isEditing ? 'text' : 'default',
              boxSizing: 'border-box'
            }}
          />
        </div>
      ) : (
        <div style={{ position: 'relative', width: '100%', boxSizing: 'border-box' }}>
          <input
            type={type}
            min={min}
            value={isEditing ? (value || '') : (value || '-')}
            disabled={!isEditing}
            onChange={(e) => isEditing && onChange(e.target.value)}
            style={{
              width: suffix ? `calc(100% - ${String(suffix).length * 8 + 30}px)` : '100%',
              background: isEditing ? theme.card : 'transparent',
              border: isEditing ? `1px solid ${theme.cardB}` : 'none',
              borderRadius: 10,
              padding: '8px 10px',
              fontSize: 15,
              fontWeight: 700,
              color: theme.text,
              outline: 'none',
              cursor: isEditing ? 'text' : 'default',
              boxSizing: 'border-box'
            }}
          />
          {suffix && !isEditing && value !== undefined && value !== null && (
            <span style={{
              position: 'absolute',
              right: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              color: theme.muted,
              fontSize: 13,
              fontWeight: 600
            }}>
              {suffix}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
