// src/components/Category.tsx
import React from 'react';
import { categoryTranslations } from './languages/Category';
import { getCategoriesFromIDB, saveCategoriesToIDB } from '../hooks/useProductSync';

// ─── 1. TYPES ────────────────────────────────────────────────────────────────
export interface CategoryOption {
  value: string;
  label: string;
}

// ─── 2. META ─────────────────────────────────────────────────────────────────
const CATEGORY_META: Record<string, { emoji: string; key: string }> = {
  'Don va un':                    { emoji: '🌾', key: 'grainFlour' },
  "Go'sht":                       { emoji: '🥩', key: 'meat' },
  'Sabzavot':                     { emoji: '🥬', key: 'vegetables' },
  'Mevalar':                      { emoji: '🍎', key: 'fruits' },
  'Ichimliklar':                  { emoji: '🧃', key: 'drinks' },
  "Yog'":                         { emoji: '🧈', key: 'oil' },
  'Sut mahsulotlari':             { emoji: '🥛', key: 'dairy' },
  'Qandolat mahsulotlari':        { emoji: '🍫', key: 'sweets' },
  'Kiyim':                        { emoji: '🧥', key: 'clothing' },
  'Texnika':                      { emoji: '🛠️', key: 'electronics' },
  'Avtotransport vositalari':     { emoji: '🚗', key: 'vehicles' },
  'Gigiyena vositalari':          { emoji: '🧼', key: 'hygiene' },
  'Oshxona jihozlari':            { emoji: '🍽️', key: 'kitchenware' },
  'Bolalar mahsulotlari':         { emoji: '🧸', key: 'babyProducts' },
  'Kantselyariya mahsulotlari':   { emoji: '✏️', key: 'stationery' },
  'Kanselyariya maxsulotlari':    { emoji: '✏️', key: 'stationery' },
  'Uy hayvonlari uchun tovarlar': { emoji: '🐶', key: 'petProducts' },
  'Dorilar':                      { emoji: '💊', key: 'medicine' },
  'Dori-darmonlar':               { emoji: '💊', key: 'medicine' },
  'Tamaki mahsulotlari':          { emoji: '🚬', key: 'tobacco' },
  'Moy':                          { emoji: '🫙', key: 'oilProduct' },
  "Go'zallik va Parvarish":       { emoji: '💄', key: 'beauty' },
  'Sport oziqlanishi':            { emoji: '💪', key: 'sportNutrition' },
  'Nonvoylik mahsulotlari':       { emoji: '🍞', key: 'bakery' },
  'Oziq-ovqat mahsulotlari':      { emoji: '🥗', key: 'food' },
  'Alkogol ichimliklar':          { emoji: '🍷', key: 'alcohol' },
  'Shirinliklar':                 { emoji: '🍬', key: 'candy' },
  "Go'sht mahsulotlari":          { emoji: '🥩', key: 'meatProducts' },
  'Baliq mahsulotlari':           { emoji: '🐟', key: 'fish' },
  'Konservalar':                  { emoji: '🥫', key: 'canned' },
  'Ziravorlar':                   { emoji: '🌶️', key: 'spices' },
  'Uy kimyosi':                   { emoji: '🧹', key: 'householdChem' },
  'Kiyim-kechak':                 { emoji: '👕', key: 'clothes' },
  'Poyabzal':                     { emoji: '👟', key: 'footwear' },
  'Elektronika':                  { emoji: '📱', key: 'electronicsDev' },
  'Maishiy texnika':              { emoji: '🏠', key: 'homeAppliances' },
  "Qo'shimcha oziqlanish":        { emoji: '🌿', key: 'supplements' },
  'Auto mahsulotlari':            { emoji: '🚗', key: 'autoProducts' },
  'Qurilish materiallari':        { emoji: '🧱', key: 'construction' },
  'Kitoblar':                     { emoji: '📚', key: 'books' },
  'Muz qaymoq':                   { emoji: '🍦', key: 'iceCream' },
  'general':                      { emoji: '📦', key: 'general' },
  'Boshqa':                       { emoji: '🗂️', key: 'other' },
};

function getCatEmoji(value: string): string {
  return CATEGORY_META[value]?.emoji ?? '📦';
}

function buildLabel(value: string, t: any): string {
  const meta = CATEGORY_META[value];
  if (meta) return `${meta.emoji} ${t[meta.key] || value}`;
  return value;
}

// ─── 3. UTILITY FUNKSIYALAR ───────────────────────────────────────────────────
export const getCategories = (
  lang: string = 'uz',
  userCategories: string[] = [],
): CategoryOption[] => {
  const t = (categoryTranslations as any)[lang] || categoryTranslations.uz;
  return [
    { value: '', label: t.allCategories || 'Barcha kategoriyalar' },
    ...userCategories.map(value => ({ value, label: buildLabel(value, t) })),
  ];
};

export const translateCategory = (value: string, lang: string = 'uz'): string => {
  const t = (categoryTranslations as any)[lang] || categoryTranslations.uz;
  if (!value) return t.allCategories || 'Barcha kategoriyalar';
  const meta = CATEGORY_META[value];
  return meta ? (t[meta.key] || value) : value;
};

export const getCategoryEmoji = (value: string): string => {
  if (!value) return '';
  return CATEGORY_META[value] ? `${CATEGORY_META[value].emoji} ` : '';
};

// ─── 4. INDEXEDDB ─────────────────────────────────────────────────────────────
export async function syncUserCategoriesToIDB(
  login: string,
  categories: string[],
): Promise<void> {
  if (!login || !categories) return;
  try { await saveCategoriesToIDB(login, categories); }
  catch (err) { console.error('Failed to sync categories to IDB:', err); }
}

export async function getUserShopCategoriesAsync(login: string): Promise<string[]> {
  if (!login) return [];
  try { return await getCategoriesFromIDB(login); }
  catch (err) { console.error('IDB categories error:', err); return []; }
}

// ─── 5. TEMA TOKENS ───────────────────────────────────────────────────────────
const DK = { cardB: '#1e2740', text: '#f1f5f9', muted: '#64748b' };
const LT = { cardB: '#e2e8f0', text: '#0f172a', muted: '#64748b' };

// ─── 6. CSS INJECT ────────────────────────────────────────────────────────────
const CAT_CSS = `
.cat-item{transition:background .15s ease,border-color .15s ease;}
.cat-item:hover{opacity:.88;}
.cat-item:active{transform:scale(.98);}
@keyframes catSheet{from{opacity:0;transform:translateY(100%)}to{opacity:1;transform:translateY(0)}}
@keyframes catFade{from{opacity:0}to{opacity:1}}
.cat-sheet{animation:catSheet .3s cubic-bezier(.32,.72,0,1);}
.cat-modal-overlay{animation:catFade .2s ease;}
`;

function injectCatCSS() {
  if (document.getElementById('cat-modal-styles')) return;
  const s = document.createElement('style');
  s.id = 'cat-modal-styles';
  s.textContent = CAT_CSS;
  document.head.appendChild(s);
}

// ─── 7. CategoryModal ─────────────────────────────────────────────────────────
export interface CategoryModalProps {
  cats: CategoryOption[];
  selected: string;
  onSelect: (value: string) => void;
  onClose: () => void;
  theme?: 'dark' | 'light';
  isMobile?: boolean;
}

export function CategoryModal({
  cats, selected, onSelect, onClose, theme = 'dark', isMobile = false,
}: CategoryModalProps) {
  injectCatCSS();
  const c = theme === 'dark' ? DK : LT;

  return (
    <div
      className="cat-modal-overlay"
      onClick={onClose}
      style={{
        position:'fixed',inset:0,zIndex:2000,
        background:'rgba(0,0,0,0.65)',backdropFilter:'blur(6px)',
        display:'flex',
        alignItems:isMobile?'flex-end':'center',
        justifyContent:'center',
        padding:isMobile?0:24,
      }}
    >
      <div
        className={isMobile?'cat-sheet':''}
        onClick={e=>e.stopPropagation()}
        style={{
          background:theme==='dark'?'#0d1220':'#ffffff',
          borderRadius:isMobile?'24px 24px 0 0':24,
          width:isMobile?'100%':440,
          maxHeight:isMobile?'78vh':'65vh',
          display:'flex',flexDirection:'column',
          overflow:'hidden',
          border:`1px solid ${c.cardB}`,
          boxShadow:'0 24px 64px rgba(0,0,0,0.55)',
        }}
      >
        {isMobile&&(
          <div style={{display:'flex',justifyContent:'center',paddingTop:12,paddingBottom:4,flexShrink:0}}>
            <div style={{width:40,height:4,borderRadius:2,background:theme==='dark'?'#2d3a52':'#cbd5e1'}}/>
          </div>
        )}
        <div style={{
          display:'flex',alignItems:'center',justifyContent:'space-between',
          padding:isMobile?'12px 20px 14px':'20px 20px 16px',
          borderBottom:`1px solid ${c.cardB}`,flexShrink:0,
        }}>
          <div>
            <div style={{fontSize:17,fontWeight:700,color:c.text,fontFamily:"'DM Sans',sans-serif"}}>
              Kategoriya tanlang
            </div>
            <div style={{fontSize:12,color:c.muted,marginTop:2,fontFamily:"'DM Sans',sans-serif"}}>
              {cats.length} ta kategoriya mavjud
            </div>
          </div>
          <button type="button" onClick={onClose}
            style={{
              width:34,height:34,borderRadius:'50%',
              background:theme==='dark'?'#1e2740':'#f1f5f9',
              border:'none',cursor:'pointer',
              display:'flex',alignItems:'center',justifyContent:'center',
              color:c.muted,fontSize:16,transition:'background .15s',
            }}>✕</button>
        </div>

        <div style={{overflowY:'auto',flex:1,padding:'10px 12px 20px'}}>
          {cats.map(cat=>{
            const isSel=selected===cat.value;
            const em=cat.label.match(/^(\p{Emoji_Presentation}|\p{Extended_Pictographic})\s*/u);
            const emoji=em?em[0].trim():getCatEmoji(cat.value);
            const lbl=em?cat.label.replace(em[0],'').trim():cat.label;
            return(
              <button key={cat.value||'__all__'} type="button" className="cat-item"
                onClick={()=>{onSelect(cat.value);onClose();}}
                style={{
                  width:'100%',display:'flex',alignItems:'center',justifyContent:'space-between',
                  padding:'12px 14px',borderRadius:14,
                  border:isSel?'1.5px solid #6366f1':`1.5px solid ${theme==='dark'?'#1e2740':'#e2e8f0'}`,
                  background:isSel?(theme==='dark'?'rgba(99,102,241,0.13)':'rgba(99,102,241,0.07)'):(theme==='dark'?'#111827':'#f8fafc'),
                  cursor:'pointer',marginBottom:7,textAlign:'left' as const,
                  fontFamily:"'DM Sans',sans-serif",
                }}>
                <div style={{display:'flex',alignItems:'center',gap:12}}>
                  <div style={{
                    width:42,height:42,borderRadius:12,flexShrink:0,
                    background:isSel?'rgba(99,102,241,0.2)':(theme==='dark'?'#1e2740':'#e9eef5'),
                    display:'flex',alignItems:'center',justifyContent:'center',
                    fontSize:20,transition:'background .15s',
                  }}>{emoji||'📦'}</div>
                  <div>
                    <div style={{fontSize:14,fontWeight:isSel?700:500,color:isSel?'#818cf8':c.text,lineHeight:1.3}}>
                      {lbl}
                    </div>
                    {cat.value&&<div style={{fontSize:11,color:c.muted,marginTop:2}}>{cat.value}</div>}
                  </div>
                </div>
                {isSel?(
                  <div style={{
                    width:26,height:26,borderRadius:'50%',
                    background:'linear-gradient(135deg,#6366f1,#8b5cf6)',
                    display:'flex',alignItems:'center',justifyContent:'center',
                    flexShrink:0,boxShadow:'0 2px 8px rgba(99,102,241,0.4)',
                  }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                      stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </div>
                ):(
                  <div style={{
                    width:26,height:26,borderRadius:'50%',
                    border:`1.5px solid ${theme==='dark'?'#2d3a52':'#cbd5e1'}`,
                    flexShrink:0,
                  }}/>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── 8. CategoryTrigger ───────────────────────────────────────────────────────
export interface CategoryTriggerProps {
  selectedCat?: CategoryOption;
  onClick: () => void;
  theme?: 'dark' | 'light';
  isMobile?: boolean;
  label?: string;
  fieldStyle?: React.CSSProperties;
}

export function CategoryTrigger({
  selectedCat,onClick,theme='dark',isMobile=false,label='Kategoriya',fieldStyle={},
}:CategoryTriggerProps){
  const c=theme==='dark'?DK:LT;
  const em=selectedCat?.label.match(/^(\p{Emoji_Presentation}|\p{Extended_Pictographic})\s*/u);
  const selEmoji=em?em[0].trim():(selectedCat?getCatEmoji(selectedCat.value):'📦');
  const selLabel=selectedCat?(em?selectedCat.label.replace(em[0],'').trim():selectedCat.label):'Tanlang';

  return(
    <div>
      <label style={{display:'block',marginBottom:12,fontSize:14,fontWeight:600,color:c.text,letterSpacing:'.2px'}}>
        {label}
      </label>
      <button type="button" onClick={onClick}
        style={{
          ...fieldStyle,width:'100%',display:'flex',
          alignItems:'center',justifyContent:'space-between',
          cursor:'pointer',textAlign:'left' as const,gap:8,
          height:isMobile?50:54,padding:isMobile?'0 14px':'0 16px',
        }}>
        <div style={{display:'flex',alignItems:'center',gap:10,minWidth:0}}>
          <div style={{
            width:32,height:32,borderRadius:9,flexShrink:0,
            background:theme==='dark'?'#1e2740':'#e9eef5',
            display:'flex',alignItems:'center',justifyContent:'center',fontSize:17,
          }}>{selEmoji||'📦'}</div>
          <span style={{color:c.text,fontWeight:600,fontSize:14,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
            {selLabel}
          </span>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke={c.muted} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{flexShrink:0}}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
    </div>
  );
}

export default CategoryModal;