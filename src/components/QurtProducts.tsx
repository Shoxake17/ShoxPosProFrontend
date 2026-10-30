import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil, Trash2, ImagePlus } from 'lucide-react';

/**
 * Qurt do'koni mahsulotlari: ro'yxat (№, rasm, nomi, narxi, miqdori, kategoriya, holat,
 * amallar) va tahrirlash oynasi. Holat alohida maydon emas — omborda 0 dona = "Mavjud emas"
 * (OnDex'ga `available=false` bo'lib boradi, `services/qurtSync.js`).
 */
export interface QurtProduct {
  _id?: string;
  barcode: string;
  name?: string;
  price: number;
  basePrice?: number;
  quantity?: number;
  category: string;
  imageUrl?: string;
  weightGrams?: number;
  login?: string;
}

interface Props {
  products: QurtProduct[];
  loading: boolean;
  isDark: boolean;
  isMobile: boolean;
  onDelete: (barcode: string) => void;
}

export default function QurtProducts({ products, loading, isDark, isMobile, onDelete }: Props) {
  const navigate = useNavigate();

  const textPrimary = isDark ? '#e2e8f0' : '#1e293b';
  const textSecondary = isDark ? '#94a3b8' : '#64748b';
  const bgCard = isDark ? '#111827' : '#fff';
  const borderColor = isDark ? '#1e293b' : '#e2e8f0';

  const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean)));

  // Cho'zinchoq (2.4 : 1) — mijoz ilovasidagi kartochka bilan bir xil nisbat. `h` — balandlik.
  const thumb = (p: QurtProduct, h = 40) => (
    <div style={{
      width: Math.round(h * 2.4), height: h, borderRadius: 10, overflow: 'hidden', flexShrink: 0,
      background: isDark ? '#1e293b' : '#eef2f7', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {p.imageUrl
        ? <img src={p.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        : <ImagePlus size={Math.round(h / 2)} color={textSecondary} />}
    </div>
  );

  const badge = (available: boolean) => (
    <span style={{
      display: 'inline-block', padding: '5px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap',
      background: available ? 'rgba(16,185,129,.14)' : 'rgba(239,68,68,.14)',
      color: available ? '#10b981' : '#ef4444',
    }}>{available ? 'Mavjud' : 'Mavjud emas'}</span>
  );

  const iconBtn = (color: string, label: string, onClick: () => void, icon: React.ReactNode) => (
    <button
      type="button" onClick={onClick} aria-label={label} title={label}
      style={{ background: `${color}15`, color, border: 'none', padding: 10, borderRadius: 10, cursor: 'pointer', display: 'flex' }}
    >{icon}</button>
  );

  const actions = (p: QurtProduct) => (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
      {iconBtn('#6366f1', 'Tahrirlash', () => navigate(`/add-product?edit=${encodeURIComponent(p.barcode)}`), <Pencil size={16} />)}
      {iconBtn('#ef4444', "O'chirish", () => onDelete(p.barcode), <Trash2 size={16} />)}
    </div>
  );

  const empty = (
    <div style={{ textAlign: 'center', padding: '60px 0', color: textSecondary }}>
      {loading ? 'Yuklanmoqda...' : 'Mahsulot topilmadi'}
    </div>
  );

  return (
    <>
      {products.length === 0 ? empty : isMobile ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 80 }}>
          {products.map((p, i) => {
            const qty = p.quantity ?? 0;
            return (
              <div key={p._id || p.barcode} style={{
                background: bgCard, border: `1px solid ${borderColor}`, borderRadius: 16, padding: 12,
                display: 'flex', flexDirection: 'column', gap: 12,
              }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <span style={{ color: textSecondary, fontSize: 12, fontWeight: 700, width: 18 }}>{i + 1}</span>
                  {thumb(p, 40)}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ color: textPrimary, fontWeight: 700, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name || '-'}</div>
                    <div style={{ color: textSecondary, fontSize: 12, marginTop: 2 }}>{p.category}</div>
                  </div>
                  {badge(qty > 0)}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ color: textPrimary, fontSize: 13.5 }}>
                    <b>{Number(p.price).toLocaleString()} so'm</b>
                    <span style={{ color: textSecondary }}> · {qty} dona</span>
                  </div>
                  {actions(p)}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{
          background: bgCard, borderRadius: 20, border: `1px solid ${borderColor}`, overflow: 'hidden',
          boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 860 }}>
              <thead>
                <tr>
                  {['№', 'Rasm', 'Nomi', 'Narxi', 'Miqdori', 'Kategoriya', 'Holati', 'Amallar'].map(h => (
                    <th key={h} style={{
                      background: isDark ? '#1e293b' : '#f8fafc', padding: 16, textAlign: 'left',
                      fontSize: 13, color: textSecondary, textTransform: 'uppercase', fontWeight: 600,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {products.map((p, i) => {
                  const qty = p.quantity ?? 0;
                  const td = { padding: '12px 16px', borderBottom: `1px solid ${borderColor}`, color: textPrimary } as const;
                  return (
                    <tr key={p._id || p.barcode}>
                      <td style={{ ...td, color: textSecondary }}>{i + 1}</td>
                      <td style={td}>{thumb(p)}</td>
                      <td style={{ ...td, fontWeight: 600 }}>{p.name || '-'}</td>
                      <td style={td}>{Number(p.price).toLocaleString()} so'm</td>
                      <td style={{ ...td, fontWeight: 600 }}>{qty}</td>
                      <td style={td}>
                        <span style={{ background: '#4f46e515', color: '#818cf8', padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{p.category}</span>
                      </td>
                      <td style={td}>{badge(qty > 0)}</td>
                      <td style={td}>{actions(p)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </>
  );
}
