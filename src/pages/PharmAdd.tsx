import React, { useState, useEffect, useRef } from 'react';
import { QrCode } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import axiosInstance from '../api/axiosInstance';
import { BrowserMultiFormatReader } from '@zxing/library';
import { useTranslation } from 'react-i18next';

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

const CSS = `
.pharm-root *, .pharm-root *::before, .pharm-root *::after { box-sizing: border-box; }
.pharm-root { font-family: 'DM Sans', sans-serif; }
.pharm-f {
  width: 100%; padding: 13px 14px; border-radius: 12px;
  font-size: 15px; font-weight: 500; outline: none;
  transition: border-color .2s, box-shadow .2s;
  font-family: 'DM Sans', sans-serif;
}
.pharm-f:focus { border-color: #6366f1 !important; box-shadow: 0 0 0 3px rgba(99,102,241,.2); }
.pharm-f::placeholder { color: #4b5563; }
.pharm-save { transition: transform .15s, box-shadow .15s; }
.pharm-save:not(:disabled):hover { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(99,102,241,.42) !important; }
.pharm-save:not(:disabled):active { transform: translateY(0); }
@keyframes pharmUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
@keyframes pharmFade { from{opacity:0} to{opacity:1} }
.pharm-card { animation: pharmUp .28s ease; }
.pharm-spin {
  width:15px; height:15px; border:2px solid rgba(255,255,255,.3);
  border-top-color:#fff; border-radius:50%;
  animation:pharmSpin .65s linear infinite;
  display:inline-block; margin-right:6px; vertical-align:middle;
}
@keyframes pharmSpin { to{transform:rotate(360deg)} }
.pharm-qbtn {
  width:44px; height:44px; border-radius:12px; border:none;
  font-size:22px; font-weight:700; cursor:pointer; flex-shrink:0;
  display:flex; align-items:center; justify-content:center;
  transition:transform .1s; touch-action:manipulation;
  user-select:none;
}
.pharm-qbtn:active { transform:scale(.88); }
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
  if (document.getElementById('pharm-css')) return;
  const s = document.createElement('style');
  s.id = 'pharm-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}

const DK = { card: '#0d1220', cardB: '#1e2740', surf: '#111827', text: '#f1f5f9', muted: '#64748b', label: '#cbd5e1' };
const LT = { card: '#ffffff', cardB: '#e2e8f0', surf: '#f1f5f9', text: '#0f172a', muted: '#64748b', label: '#1e293b' };

type MsgT = 'success' | 'error' | 'info';
const MSGS: Record<MsgT, { bg: string; col: string; bdr: string; ico: string }> = {
  success: { bg: 'rgba(16,185,129,.1)', col: '#10b981', bdr: 'rgba(16,185,129,.3)', ico: '✅' },
  error:   { bg: 'rgba(239,68,68,.1)', col: '#ef4444', bdr: 'rgba(239,68,68,.3)', ico: '⚠️' },
  info:    { bg: 'rgba(99,102,241,.09)', col: '#818cf8', bdr: 'rgba(99,102,241,.28)', ico: 'ℹ️' },
};

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

export default function PharmAdd() {
  injectCSS();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { t } = useTranslation();

  const [userImage, setUserImage] = useState<string | null>(localStorage.getItem('userImage'));
  const [theme] = useState<'dark' | 'light'>((localStorage.getItem('theme') as any) || 'dark');
  const c = theme === 'dark' ? DK : LT;

  const [loading, setLoading] = useState(false);
  const [scanLoad, setScanLoad] = useState(false);
  const [message, setMessage] = useState<{ type: MsgT; text: string } | null>(null);
  const [showScan, setShowScan] = useState(false);

  const [name, setName] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [price, setPrice] = useState('');
  const [barcode, setBarcode] = useState('');
  const [category, setCategory] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [dosage, setDosage] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [isPrescriptionRequired, setIsPrescriptionRequired] = useState(false);
  const [storageCondition, setStorageCondition] = useState('');
  const [description, setDescription] = useState('');
  const [dosageForm, setDosageForm] = useState('');
  const [shelfNumber, setShelfNumber] = useState('');
  const [rowNumber, setRowNumber] = useState('');

  const [user] = useState(() => JSON.parse(sessionStorage.getItem('currentUser') || '{}'));
  const login = user?.login || '';

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

  const lookupBarcode = async (code: string) => {
    if (!code) return;
    setScanLoad(true);
    setMessage({ type: 'info', text: '🔍 Qidirilmoqda...' });
    try {
      const r = await axiosInstance.get(`/pharmacy/search?q=${encodeURIComponent(code)}&login=${encodeURIComponent(login)}`);
      const results = Array.isArray(r.data) ? r.data : [];
      if (results.length > 0) {
        const fm = results.find((p: any) => String(p.barcode).toLowerCase() === code.toLowerCase()) || results[0];
        if (fm) {
          setName(fm.name || '');
          setBasePrice(String(fm.basePrice || ''));
          setPrice(String(fm.price || ''));
          if (fm.category) setCategory(fm.category);
          setDosage(fm.dosage || '');
          setManufacturer(fm.manufacturer || '');
          setStorageCondition(fm.storageCondition || '');
          setDescription(fm.description || '');
          setDosageForm(fm.dosageForm || '');
          setShelfNumber(fm.shelfNumber || '');
          setRowNumber(fm.rowNumber || '');
          setIsPrescriptionRequired(fm.isPrescriptionRequired || false);
          setMessage({ type: 'success', text: `✅ Topildi: ${fm.name}` });
          return;
        }
      }
      setName(''); setBasePrice(''); setPrice('');
      setMessage({ type: 'info', text: 'ℹ️ Dori topilmadi. Yangi ma\'lumotlarni kiriting.' });
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setScanLoad(false);
    }
  };

  const handleBarcodeKey = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && barcode.trim()) {
      e.preventDefault();
      await lookupBarcode(barcode.trim());
    }
  };

  const handleScanResult = async (code: string) => {
    setShowScan(false);
    setBarcode(code);
    await lookupBarcode(code);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!name.trim()) { setMessage({ type: 'error', text: 'Dori nomini kiriting' }); return; }
    if (!barcode.trim()) { setMessage({ type: 'error', text: 'Barcodeni kiriting' }); return; }
    if (!basePrice.trim()) { setMessage({ type: 'error', text: 'Ulgurji narxini kiriting' }); return; }
    if (!price.trim()) { setMessage({ type: 'error', text: 'Sotuv narxini kiriting' }); return; }

    const bp = Number(basePrice), sp = Number(price);
    if (bp > sp) { setMessage({ type: 'error', text: 'Ulgurji narx sotuv narxidan yuqori bo\'lishi mumkin emas!' }); return; }

    setLoading(true); setMessage(null);
    try {
      await axiosInstance.post('/pharmacy/add-pharm', {
        name: name.trim() || barcode.trim(),
        price: sp || 0,
        basePrice: bp || 0,
        barcode: barcode.trim(),
        category: category || 'Dorilar',
        quantity: Number(quantity),
        login,
        dosage,
        manufacturer,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        batchNumber,
        isPrescriptionRequired,
        storageCondition,
        description,
        dosageForm,
        shelfNumber,
        rowNumber,
        addedAt: new Date().toISOString(),
      });
      setMessage({ type: 'success', text: '✅ Dori muvaffaqiyatli qo\'shildi!' });
      setTimeout(() => navigate('/pharm-base'), 1500);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Xatolik yuz berdi' });
    } finally {
      setLoading(false);
    }
  };

  const fs = {
    border: `1.5px solid ${c.cardB}`,
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

  return (
    <MainLayout
      theme={theme}
      userImage={userImage}
      handleImageUpload={handleImageUpload}
      title="Dori qo'shish"
    >
      {showScan && <ScanOverlay onResult={handleScanResult} onClose={() => setShowScan(false)} />}

      <div
        className="pharm-root"
        style={{
          maxWidth: isMobile ? '100%' : 950,
          margin: '0 auto',
          padding: isMobile ? `${60}px 16px ${BB_H + 40}px` : '10px 0 80px',
          minHeight: isMobile ? 'calc(100vh - 140px)' : 'calc(100vh - 120px)',
        }}
      >
        <div
          className="pharm-card"
          style={{
            background: c.card,
            borderRadius: isMobile ? 24 : 32,
            padding: isMobile ? '32px 24px' : '60px 50px',
            border: `1px solid ${c.cardB}`,
            boxShadow: theme === 'dark' ? '0 20px 60px rgba(0,0,0,.7)' : '0 10px 40px rgba(0,0,0,.1)',
          }}
        >
          <form
            onSubmit={handleSubmit}
            style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 20 : 24 }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 12 : 24 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', height: 28, marginBottom: 12 }}>
                  <label style={{ ...ls, marginBottom: 0 }}>Dori nomi</label>
                </div>
                <input className="pharm-f" type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="Dori nomi..." style={fs} />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 28, marginBottom: 12 }}>
                  <label style={{ ...ls, marginBottom: 0 }}>Barcode</label>
                  <button type="button" onClick={() => setShowScan(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(99,102,241,0.12)', border: '1.5px solid rgba(99,102,241,0.3)', borderRadius: 10, padding: '4px 10px', cursor: 'pointer', color: '#818cf8', fontSize: 12, fontWeight: 600 }}>
                    <QrCode size={16} strokeWidth={2} color="#818cf8" />
                  </button>
                </div>
                <input className="pharm-f" type="text" value={barcode} onChange={e => setBarcode(e.target.value)} onKeyDown={handleBarcodeKey} placeholder="Barcode..." style={{ ...fs, fontFamily: 'monospace' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 12 : 24 }}>
              <div>
                <label style={ls}>Ulgurji narx</label>
                <div style={{ position: 'relative' }}>
                  <input className="pharm-f" type="number" min="0" value={basePrice} onChange={e => setBasePrice(e.target.value)} placeholder="0" style={{ ...fs, paddingRight: 46 }} />
                  <span style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: c.muted, fontWeight: 700, pointerEvents: 'none' }}>so'm</span>
                </div>
              </div>
              <div>
                <label style={ls}>Sotuv narxi</label>
                <div style={{ position: 'relative' }}>
                  <input className="pharm-f" type="number" min="0" value={price} onChange={e => setPrice(e.target.value)} placeholder="0" style={{ ...fs, paddingRight: 46 }} />
                  <span style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: c.muted, fontWeight: 700, pointerEvents: 'none' }}>so'm</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 12 : 24 }}>
              <div>
                <label style={ls}>Kategoriya</label>
                <input className="pharm-f" type="text" value={category} onChange={e => setCategory(e.target.value)} placeholder="Kategoriya..." style={fs} />
              </div>
              <div>
                <label style={ls}>Miqdor</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: isMobile ? 50 : 54 }}>
                  <button type="button" className="pharm-qbtn" onClick={() => setQuantity(String(Math.max(0, Number(quantity) - 1)))} style={{ width: isMobile ? 50 : 54, height: '100%', flexShrink: 0, background: theme === 'dark' ? '#1e2740' : '#e2e8f0', color: theme === 'dark' ? '#f1f5f9' : '#475569', borderRadius: 12, border: `1.5px solid ${c.cardB}`, fontSize: 22 }}>−</button>
                  <input className="pharm-f" type="number" min="0" value={quantity} onChange={e => setQuantity(e.target.value)} style={{ ...fs, flex: 1, height: '100%', textAlign: 'center' as const, fontWeight: 700, fontSize: 18, padding: 0 }} />
                  <button type="button" className="pharm-qbtn" onClick={() => setQuantity(String(Number(quantity) + 1))} style={{ width: isMobile ? 50 : 54, height: '100%', flexShrink: 0, background: '#6366f1', color: '#fff', borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(99,102,241,.3)', fontSize: 22 }}>+</button>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 12 : 24 }}>
              <div>
                <label style={ls}>Doza</label>
                <input className="pharm-f" type="text" value={dosage} onChange={e => setDosage(e.target.value)} placeholder="Doza (masalan: 500mg)..." style={fs} />
              </div>
              <div>
                <label style={ls}>Ishlab chiqaruvchi</label>
                <input className="pharm-f" type="text" value={manufacturer} onChange={e => setManufacturer(e.target.value)} placeholder="Ishlab chiqaruvchi..." style={fs} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 12 : 24 }}>
              <div>
                <label style={ls}>Yaroqlilik muddati</label>
                <input className="pharm-f" type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} style={fs} />
              </div>
              <div>
                <label style={ls}>Partiya raqami</label>
                <input className="pharm-f" type="text" value={batchNumber} onChange={e => setBatchNumber(e.target.value)} placeholder="Partiya raqami..." style={fs} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 12 : 24 }}>
              <div>
                <label style={ls}>Saqlash sharti</label>
                <input className="pharm-f" type="text" value={storageCondition} onChange={e => setStorageCondition(e.target.value)} placeholder="Saqlash sharti (masalan: 2-8°C)..." style={fs} />
              </div>
              <div>
                <label style={ls}>Dori shakli</label>
                <input className="pharm-f" type="text" value={dosageForm} onChange={e => setDosageForm(e.target.value)} placeholder="Tabletka, sirop, vial..." style={fs} />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <label style={{ ...ls, marginBottom: 0 }}>Retsept talab qilinadimi?</label>
              <button
                type="button"
                onClick={() => setIsPrescriptionRequired(!isPrescriptionRequired)}
                style={{
                  width: 50,
                  height: 28,
                  borderRadius: 14,
                  background: isPrescriptionRequired ? '#6366f1' : c.cardB,
                  border: 'none',
                  cursor: 'pointer',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  padding: 2,
                  transition: 'background 0.2s',
                }}
              >
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: '#fff',
                    transform: isPrescriptionRequired ? 'translateX(22px)' : 'translateX(0)',
                    transition: 'transform 0.2s',
                  }}
                />
              </button>
              <span style={{ color: c.text, fontSize: 14 }}>{isPrescriptionRequired ? 'Ha' : 'Yo\'q'}</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 12 : 24 }}>
              <div>
                <label style={ls}>Shkaf raqami</label>
                <input className="pharm-f" type="text" value={shelfNumber} onChange={e => setShelfNumber(e.target.value)} placeholder="Shkaf raqami (masalan: A1)..." style={fs} />
              </div>
              <div>
                <label style={ls}>Qator raqami</label>
                <input className="pharm-f" type="text" value={rowNumber} onChange={e => setRowNumber(e.target.value)} placeholder="Qator raqami (masalan: 3)..." style={fs} />
              </div>
            </div>

            <div>
              <label style={ls}>Tavsifi</label>
              <textarea className="pharm-f" value={description} onChange={e => setDescription(e.target.value)} placeholder="Tavsif..." style={{ ...fs, minHeight: 80 }} />
            </div>

            {message && (
              <div style={{ padding: '11px 14px', borderRadius: 11, display: 'flex', alignItems: 'flex-start', gap: 8, background: MSGS[message.type].bg, color: MSGS[message.type].col, border: `1px solid ${MSGS[message.type].bdr}`, fontSize: 13.5, fontWeight: 500 }}>
                <span style={{ flexShrink: 0 }}>{MSGS[message.type].ico}</span>
                <span>{message.text}</span>
              </div>
            )}

            <div style={{ marginTop: isMobile ? 8 : 16 }}>
              <button
                type="submit"
                disabled={loading || scanLoad}
                className="pharm-save"
                style={{
                  width: '100%',
                  padding: isMobile ? '16px 20px' : '18px 24px',
                  borderRadius: 16,
                  background: loading || scanLoad ? (theme === 'dark' ? '#1e2740' : '#94a3b8') : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
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
                }}
              >
                {loading ? (
                  <>
                    <div className="pharm-spin" />
                    <span>Saqlanmoqda...</span>
                  </>
                ) : (
                  <span>{scanLoad ? 'Qidirilmoqda' : 'Saqlash'}</span>
                )}
              </button>
            </div>
          </form>
        </div>
        </div>
    </MainLayout>
  );
}
