import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Send, Trash2, User, ChevronDown, Check,
  Zap, AlertCircle, RefreshCw, Database,
  Bot, Layers, BrainCircuit, FlaskConical
} from 'lucide-react';
import MainLayout from "../components/MainLayout";
import { useTranslation } from '../components/languages/Ai';

const ModelIcon = ({ id, size = 16, color }: { id: string; size?: number; color?: string }) => {
  const s = { width: size, height: size, color: color || 'currentColor' };
  switch (id) {
    case 'shox-ai':       return <Bot {...s} />;
    case 'llama-3.3-70b': return <BrainCircuit {...s} />;
    case 'llama-3.1-8b':  return <Zap {...s} />;
    case 'mixtral-8x7b':  return <Layers {...s} />;
    case 'gemma2-9b':     return <FlaskConical {...s} />;
    default:              return <Bot {...s} />;
  }
};

const ALL_MODELS = [
  { id: 'shox-ai',       name: 'Shox AI',         provider: 'ShoxPosPro', endpoint: '/api/ask-deepseek', groqModel: null as string|null, color: '#6366f1', badge: 'Asosiy',     group: 'Shox AI'   },
  { id: 'llama-3.3-70b', name: 'LLaMA 3.3 · 70B', provider: 'ShaddiyAi', endpoint: '/api/ask-groq-ai',  groqModel: 'llama-3.3-70b-versatile', color: '#f97316', badge: 'Eng kuchli', group: 'ShaddiyAi' },
  { id: 'llama-3.1-8b',  name: 'LLaMA 3.1 · 8B',  provider: 'ShaddiyAi', endpoint: '/api/ask-groq-ai',  groqModel: 'llama-3.1-8b-instant',    color: '#22c55e', badge: 'Eng tez',    group: 'ShaddiyAi' },
  { id: 'mixtral-8x7b',  name: 'Mixtral · 8×7B',  provider: 'ShaddiyAi', endpoint: '/api/ask-groq-ai',  groqModel: 'mixtral-8x7b-32768',      color: '#a855f7', badge: '32K ctx',    group: 'ShaddiyAi' },
  { id: 'gemma2-9b',     name: 'Gemma 2 · 9B',    provider: 'ShaddiyAi', endpoint: '/api/ask-groq-ai',  groqModel: 'gemma2-9b-it',            color: '#3b82f6', badge: 'Gemma2',     group: 'ShaddiyAi' },
] as const;

type ModelId = (typeof ALL_MODELS)[number]['id'];

type Message = {
  role: 'user' | 'ai';
  content: string;
  timestamp: string;
  ms?: number;
  isError?: boolean;
  errorCode?: number;
  storeMode?: boolean;
};
type ChatStore = Record<ModelId, Message[]>;

interface SaleItem    { barcode?: string; name?: string; quantity?: number; price?: number; basePrice?: number; category?: string; total?: number; soldAt?: string; }
interface ProductItem { barcode?: string; name?: string; price?: number; basePrice?: number; quantity?: number; category?: string; sold?: number; }
interface DebtItem    { id?: string; name?: string; phone?: string; amount?: number; lastPayment?: string; }

function renderMd(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,     '<em>$1</em>')
    .replace(/`(.+?)`/g,       '<code style="background:rgba(99,102,241,0.15);padding:2px 6px;border-radius:4px;font-family:monospace;font-size:12px;">$1</code>')
    .replace(/#{1,3}\s(.+)/g,  '<div style="font-size:14px;font-weight:700;margin:10px 0 4px;color:#a5b4fc;">$1</div>')
    .replace(/^[-•]\s(.+)/gm,  '<div style="padding-left:14px;margin:2px 0;">• $1</div>')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g,   '<br/>');
}

const EMPTY_CHATS: ChatStore = {
  'shox-ai': [], 'llama-3.3-70b': [], 'llama-3.1-8b': [], 'mixtral-8x7b': [], 'gemma2-9b': [],
};
function loadChats(): ChatStore {
  try { return JSON.parse(localStorage.getItem('ai_chats_v3') || 'null') || EMPTY_CHATS; }
  catch { return EMPTY_CHATS; }
}
function saveChats(c: ChatStore) { localStorage.setItem('ai_chats_v3', JSON.stringify(c)); }

export default function Ai() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [chats,          setChats]          = useState<ChatStore>(loadChats);
  const [modelId,        setModelId]        = useState<ModelId>('shox-ai');
  const [input,          setInput]          = useState('');
  const [loading,        setLoading]        = useState(false);
  const [dropOpen,       setDropOpen]       = useState(false);
  const [useStore,       setUseStore]       = useState(false);
  const [dataLoading,    setDataLoading]    = useState(false);
  const [salesData,      setSalesData]      = useState<SaleItem[]>([]);
  const [productsData,   setProductsData]   = useState<ProductItem[]>([]);
  const [debtsData,      setDebtsData]      = useState<DebtItem[]>([]);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const [theme]     = useState<'dark'|'light'>(() => (localStorage.getItem('theme') as any) || 'dark');
  const [userImage] = useState<string|null>(localStorage.getItem('userImage'));

  const bottomRef   = useRef<HTMLDivElement>(null);
  const dropRef     = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputBoxRef = useRef<HTMLDivElement>(null);

  // ✅ login — bir marta o'qiladi, ref sifatida
  const loginRef = useRef<string>(
    (() => {
      const user = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
      return user?.login || localStorage.getItem('login') || localStorage.getItem('currentLogin') || '';
    })()
  );
  const login = loginRef.current;

  // ✅ navigate ref
  const navigateRef = useRef(navigate);
  useEffect(() => { navigateRef.current = navigate; }, [navigate]);

  // ✅ t ref
  const tRef = useRef(t);
  useEffect(() => { tRef.current = t; }, [t]);

  const activeModel = ALL_MODELS.find(m => m.id === modelId)!;
  const messages    = chats[modelId] || [];

  const getErrorMsg = (status?: number) => {
    const t = tRef.current;
    if (!navigator.onLine) return { icon: <AlertCircle size={13}/>, title: t('errNoInternet'),  desc: t('errNoInternetDesc') };
    switch (status) {
      case 429: return { icon: <AlertCircle size={13}/>, title: t('errLimit'),   desc: t('errLimitDesc')   };
      case 500: return { icon: <AlertCircle size={13}/>, title: t('errServer'),  desc: t('errServerDesc')  };
      case 402: return { icon: <AlertCircle size={13}/>, title: t('errBalance'), desc: t('errBalanceDesc') };
      default:  return { icon: <AlertCircle size={13}/>, title: t('errDefault'), desc: t('errDefaultDesc') };
    }
  };

  const quickQs = [t('q1'), t('q2'), t('q3'), t('q4'), t('q5'), t('q6')];

  // ✅ loadData — bo'sh dependency, ref orqali ishlaydi
  const loadData = useCallback(async () => {
    if (!loginRef.current) return;
    setDataLoading(true);
    try {
      const [s, p, d] = await Promise.allSettled([
        fetch(`/api/sales/${loginRef.current}`),
        fetch(`/api/products/user-products/${loginRef.current}`),
        fetch(`/api/debts/${loginRef.current}`),
      ]);
      if (s.status === 'fulfilled' && s.value.ok) setSalesData(await s.value.json());
      if (p.status === 'fulfilled' && p.value.ok) setProductsData(await p.value.json());
      if (d.status === 'fulfilled' && d.value.ok) { try { setDebtsData(await d.value.json()); } catch {} }
    } catch {}
    finally { setDataLoading(false); }
  }, []); // ✅ bo'sh

  // ✅ Bir marta mount
  useEffect(() => {
    if (!loginRef.current) { navigateRef.current('/'); return; }
    loadData();

    const onClick = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setDropOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []); // ✅ bo'sh — hech qanday dependency yo'q

  // ✅ Chats saqlash va scroll
  useEffect(() => {
    saveChats(chats);
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chats]);

  useEffect(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
  }, [modelId]);

  // ✅ Keyboard height — bir marta
  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<{ height: number }>;
      const h = customEvent.detail?.height ?? 0;
      setKeyboardHeight(h);
      if (h > 0) {
        setTimeout(() => {
          inputBoxRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 120);
      }
    };
    window.addEventListener('virtualKeyboardHeight', handler);
    return () => window.removeEventListener('virtualKeyboardHeight', handler);
  }, []);

  // ✅ buildContext — salesData, productsData, debtsData, login (login stable)
  const buildContext = useCallback((): string => {
    const now    = new Date();
    const todayS = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekS  = new Date(now); weekS.setDate(now.getDate() - 7);
    const monS   = new Date(now); monS.setDate(now.getDate() - 30);

    const calc = (arr: SaleItem[]) => ({
      total:  arr.reduce((s, i) => s + (i.total || 0), 0),
      profit: arr.reduce((s, i) => s + ((i.price || 0) - (i.basePrice || 0)) * (i.quantity || 1), 0),
      qty:    arr.reduce((s, i) => s + (i.quantity || 0), 0),
    });
    const tv = calc(salesData.filter(s => s.soldAt && new Date(s.soldAt) >= todayS));
    const w  = calc(salesData.filter(s => s.soldAt && new Date(s.soldAt) >= weekS));
    const m  = calc(salesData.filter(s => s.soldAt && new Date(s.soldAt) >= monS));

    const pMap = new Map<string, { name: string; total: number }>();
    salesData.forEach(s => {
      const k = s.barcode || s.name || '';
      const c = pMap.get(k) || { name: s.name || '', total: 0 };
      c.total += s.total || 0;
      pMap.set(k, c);
    });
    const top  = [...pMap.values()].sort((a, b) => b.total - a.total).slice(0, 10);
    const low  = productsData.filter(p => (p.quantity || 0) < 10).slice(0, 10);
    const loss = productsData.filter(p => (p.price || 0) < (p.basePrice || 0));

    const totalDebt = debtsData.reduce((s, d) => s + (d.amount || 0), 0);
    const top5debts = [...debtsData].sort((a, b) => (b.amount || 0) - (a.amount || 0)).slice(0, 5);
    const debtsLine = debtsData.length > 0
      ? `${debtsData.length} ta | Umumiy: ${totalDebt.toLocaleString()} so'm | ${top5debts.map(d => `${d.name}(${(d.amount||0).toLocaleString()} so'm)`).join(', ')}`
      : "Qarzdor yo'q ✅";

    return `=== ${login.toUpperCase()} DO'KONI ===
Sana: ${now.toLocaleDateString('uz-UZ')}
BUGUN: ${tv.total.toLocaleString()} so'm | Foyda ${tv.profit.toLocaleString()} so'm | ${tv.qty} dona
7 KUN: ${w.total.toLocaleString()} so'm | ${w.qty} dona
30 KUN: ${m.total.toLocaleString()} so'm | ${m.qty} dona
TOP 10: ${top.map((p, i) => `${i + 1}.${p.name} ${p.total.toLocaleString()}`).join(' | ')}
KAM ZAXIRA: ${low.length ? low.map(p => `${p.name}:${p.quantity || 0}`).join(', ') : 'Yetarli'}
ZARAR: ${loss.length ? loss.map(p => `${p.name}(sotuv:${p.price},xarid:${p.basePrice})`).join(', ') : "Yo'q"}
JAMI: ${productsData.length} mahsulot | ${salesData.length} sotuv
QARZDORLAR: ${debtsLine}`;
  }, [salesData, productsData, debtsData, login]);

  const addMsg = (id: ModelId, msg: Message) =>
    setChats(prev => ({ ...prev, [id]: [...(prev[id] || []), msg] }));

  const send = async (override?: string) => {
    const text = (override ?? input).trim();
    if (!text || loading) return;

    const currentModelId = modelId;
    addMsg(currentModelId, {
      role: 'user', content: text,
      timestamp: new Date().toISOString(), storeMode: useStore,
    });
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setLoading(true);

    try {
      const model = ALL_MODELS.find(m => m.id === currentModelId)!;
      const t0 = Date.now();
      const body: Record<string, any> = { question: text, login, useStore };
      if (model.groqModel) body.groqModel = model.groqModel;

      if (useStore) {
        const ctx = buildContext();
        body.systemOverride = `Sen professional savdo tahlilchisi va biznes maslahatchisisisan.
Faqat berilgan ma'lumotlarga asoslan, raqamlarni aniq ko'rsat, amaliy tavsiyalar ber.
O'zbek tilida javob ber. Markdown formatidan foydalan.\n\n${ctx}`;
      }

      const res = await fetch(model.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const ms = Date.now() - t0;
      if (!res.ok) throw Object.assign(new Error(), { status: res.status });
      const data = await res.json();

      addMsg(currentModelId, {
        role: 'ai', content: data.answer || tRef.current('noResponse'),
        timestamp: new Date().toISOString(), ms,
      });
    } catch (err: any) {
      addMsg(currentModelId, {
        role: 'ai', content: '', isError: true,
        errorCode: err?.status, timestamp: new Date().toISOString(),
      });
    } finally { setLoading(false); }
  };

  const retry = (idx: number) => {
    const lastUser = [...messages.slice(0, idx)].reverse().find(m => m.role === 'user');
    if (!lastUser) return;
    setChats(prev => ({ ...prev, [modelId]: prev[modelId].slice(0, idx) }));
    send(lastUser.content);
  };

  const clearChat = () => {
    if (!window.confirm(tRef.current('clearChatFull', { modelName: activeModel.name }))) return;
    setChats(prev => ({ ...prev, [modelId]: [] }));
  };

  const dark   = theme === 'dark';
  const bg     = dark ? 'rgba(30,41,59,0.65)' : 'rgba(255,255,255,0.85)';
  const chatBg = dark ? 'rgba(15,23,42,0.45)' : '#f8fafc';
  const bdr    = dark ? '#334155' : '#e2e8f0';
  const tx     = dark ? '#e2e8f0' : '#1e293b';
  const sub    = dark ? '#64748b' : '#94a3b8';
  const card   = dark ? '#1e293b' : '#ffffff';
  const groups = ['Shox AI', 'ShaddiyAi'] as const;

  return (
    <MainLayout theme={theme} userImage={userImage} title={t('aiAnalyst')}>
      <div style={{
        width: '100%',
        height: 'calc(100vh - 160px)',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        paddingBottom: keyboardHeight > 0 ? keyboardHeight : 0,
        transition: 'padding-bottom 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
      }}>

        {/* TOP BAR */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>

          {/* Model dropdown */}
          <div style={{ position: 'relative' }} ref={dropRef}>
            <button onClick={() => setDropOpen(o => !o)} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 16px', borderRadius: 16, border: 'none', cursor: 'pointer',
              background: bg, backdropFilter: 'blur(14px)',
              color: tx, boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, background: activeModel.color + '22', border: `1.5px solid ${activeModel.color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ModelIcon id={activeModel.id} size={18} color={activeModel.color} />
              </div>
              <div style={{ textAlign: 'left', minWidth: 0 }}>
                <div style={{ fontSize: 10, opacity: .5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5 }}>{t('modelDropLabel')}</div>
                <div style={{ fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap' }}>{activeModel.name}</div>
              </div>
              <span className="badge-desk" style={{ background: activeModel.color + '20', color: activeModel.color, padding: '3px 9px', borderRadius: 8, fontSize: 11, fontWeight: 700 }}>{activeModel.badge}</span>
              <ChevronDown size={15} color={sub} style={{ transform: dropOpen ? 'rotate(180deg)' : 'none', transition: '.2s', flexShrink: 0 }} />
            </button>

            {dropOpen && (
              <div style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, minWidth: 290, maxWidth: '92vw', background: card, border: `1px solid ${bdr}`, borderRadius: 20, padding: 8, zIndex: 1001, boxShadow: '0 16px 48px rgba(0,0,0,0.2)', animation: 'fadeUp .15s ease' }}>
                {groups.map(group => (
                  <div key={group}>
                    <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.2, color: sub, padding: '8px 14px 4px' }}>{group}</div>
                    {ALL_MODELS.filter(m => m.group === group).map(m => {
                      const isActive = modelId === m.id;
                      const msgCount = (chats[m.id] || []).filter(x => x.role === 'user').length;
                      return (
                        <div key={m.id} onClick={() => { setModelId(m.id); setDropOpen(false); }}
                          style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 12px', borderRadius: 13, cursor: 'pointer', background: isActive ? m.color + '18' : 'transparent', transition: '.15s' }}
                          onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = dark ? '#334155' : '#f1f5f9'; }}
                          onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                        >
                          <div style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, background: m.color + (isActive ? '28' : '15'), border: `1.5px solid ${m.color}${isActive ? '55' : '30'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <ModelIcon id={m.id} size={17} color={m.color} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: isActive ? m.color : tx }}>{m.name}</div>
                            <div style={{ fontSize: 10, color: sub, marginTop: 1 }}>
                              {m.provider}
                              {msgCount > 0 && (
                                <span style={{ marginLeft: 6, background: m.color + '22', color: m.color, padding: '0 5px', borderRadius: 5, fontSize: 9, fontWeight: 700 }}>
                                  {t('messageBadge', { count: String(msgCount) })}
                                </span>
                              )}
                            </div>
                          </div>
                          <span style={{ background: m.color + '20', color: m.color, padding: '3px 8px', borderRadius: 7, fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{m.badge}</span>
                          {isActive && <Check size={14} color={m.color} />}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* O'ng tugmalar */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <button onClick={clearChat} title={t('clearBtn')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: dark ? 'rgba(239,68,68,0.1)' : '#fff1f2', border: 'none', color: '#ef4444', padding: '9px 12px', borderRadius: 14, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
              <Trash2 size={14} />
              <span className="hide-xs">{t('clearBtn')}</span>
            </button>

            <button onClick={() => setUseStore(v => !v)} title={useStore ? t('tooltipStoreOff') : t('tooltipStoreOn')}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 16px', borderRadius: 14, border: 'none', cursor: 'pointer', transition: '.25s', background: useStore ? 'linear-gradient(135deg,#10b981,#059669)' : (dark ? '#1e293b' : '#f1f5f9'), color: useStore ? '#fff' : sub, boxShadow: useStore ? '0 4px 14px rgba(16,185,129,0.3)' : 'none', fontWeight: 600, fontSize: 13 }}
            >
              {useStore ? <Database size={14} /> : <Bot size={14} />}
              <span className="hide-sm">{useStore ? t('storeDataOn') : t('normalAi')}</span>
              <div style={{ width: 32, height: 18, borderRadius: 9, position: 'relative', flexShrink: 0, background: useStore ? 'rgba(255,255,255,0.3)' : (dark ? '#334155' : '#cbd5e1'), transition: '.25s' }}>
                <div style={{ position: 'absolute', top: 2, left: useStore ? 16 : 2, width: 14, height: 14, borderRadius: '50%', background: '#fff', transition: '.25s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
              </div>
            </button>
          </div>
        </div>

        {/* CHAT OYNASI */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', borderRadius: 24, display: 'flex', flexDirection: 'column', gap: 12, background: chatBg, border: `1px solid ${dark ? '#1e293b' : '#f1f5f9'}` }}>

          {messages.length === 0 && (
            <div style={{ margin: 'auto', textAlign: 'center', color: sub, padding: '24px 16px' }}>
              <div style={{ width: 64, height: 64, borderRadius: 20, margin: '0 auto 16px', background: activeModel.color + '18', border: `2px solid ${activeModel.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'pulse 2.5s infinite' }}>
                <ModelIcon id={activeModel.id} size={32} color={activeModel.color} />
              </div>
              <div style={{ fontSize: 13, color: sub, marginBottom: 4 }}>{t('greeting')}</div>
              <h2 style={{ margin: '0 0 4px', fontSize: 'clamp(20px,4vw,28px)', fontWeight: 800, background: `linear-gradient(135deg, ${activeModel.color}, ${activeModel.color}99)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{login}!</h2>
              <p style={{ fontSize: 12, color: sub, marginBottom: 20 }}>
                {useStore
                  ? t('storeMode', { sales: String(salesData.length), products: String(productsData.length), debts: String(debtsData.length) })
                  : t('askAnything')}
              </p>
              {useStore && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 520, margin: '0 auto' }}>
                  {quickQs.map(q => (
                    <button key={q} onClick={() => send(q)} style={{ padding: '7px 14px', borderRadius: 12, border: `1px solid ${bdr}`, background: 'transparent', color: tx, fontSize: 12, cursor: 'pointer', fontWeight: 500, transition: '.2s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = activeModel.color; (e.currentTarget as HTMLElement).style.color = activeModel.color; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = bdr; (e.currentTarget as HTMLElement).style.color = tx; }}
                    >{q}</button>
                  ))}
                </div>
              )}
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', animation: 'fadeUp .22s ease' }}>
              {msg.role === 'ai' && msg.isError ? (
                <div style={{ maxWidth: 'min(82%, 520px)', padding: '12px 16px', borderRadius: '18px 18px 18px 4px', background: dark ? '#1e1215' : '#fff5f5', border: `1px solid ${dark ? '#7f1d1d50' : '#fecaca'}`, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#ef4444' }}>
                    {getErrorMsg(msg.errorCode).icon}
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{getErrorMsg(msg.errorCode).title}</span>
                  </div>
                  <p style={{ fontSize: 12, color: dark ? '#fca5a5' : '#b91c1c', margin: 0 }}>{getErrorMsg(msg.errorCode).desc}</p>
                  <button onClick={() => retry(i)} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'transparent', border: '1px solid #ef444450', color: '#ef4444', padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', alignSelf: 'flex-start' }}>
                    <RefreshCw size={11} /> {t('retryBtn')}
                  </button>
                </div>
              ) : (
                <div style={{ maxWidth: 'min(82%, 560px)', padding: '11px 15px', borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px', background: msg.role === 'user' ? `linear-gradient(135deg, ${activeModel.color}, ${activeModel.color}bb)` : card, color: msg.role === 'user' ? '#fff' : tx, border: msg.role === 'ai' ? `1px solid ${bdr}` : 'none', boxShadow: '0 2px 10px rgba(0,0,0,0.07)' }}>
                  {msg.role === 'ai' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7, paddingBottom: 7, borderBottom: `1px solid ${bdr}` }}>
                      <div style={{ width: 22, height: 22, borderRadius: 6, flexShrink: 0, background: activeModel.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ModelIcon id={activeModel.id} size={13} color={activeModel.color} />
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: activeModel.color, letterSpacing: .5 }}>{activeModel.name}</span>
                      {msg.ms && <span style={{ marginLeft: 'auto', fontSize: 9, color: sub, display: 'flex', alignItems: 'center', gap: 3 }}><Zap size={9} color={activeModel.color} /> {msg.ms}ms</span>}
                    </div>
                  )}
                  {msg.role === 'user' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5, opacity: .7 }}>
                      <User size={11} />
                      {msg.storeMode && (
                        <span style={{ fontSize: 9, background: 'rgba(255,255,255,0.2)', padding: '1px 5px', borderRadius: 5 }}>
                          <Database size={8} style={{ display: 'inline', marginRight: 2 }} />
                          {t('storeModeBadge')}
                        </span>
                      )}
                    </div>
                  )}
                  <div style={{ fontSize: 14, lineHeight: 1.68 }} dangerouslySetInnerHTML={{ __html: msg.role === 'ai' ? renderMd(msg.content) : msg.content }} />
                  <div style={{ fontSize: 10, opacity: .4, textAlign: 'right', marginTop: 6 }}>
                    {new Date(msg.timestamp).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: card, width: 'fit-content', borderRadius: '18px 18px 18px 4px', border: `1px solid ${bdr}` }}>
              <div style={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid ${activeModel.color}`, borderTopColor: 'transparent', animation: 'spin .65s linear infinite' }} />
              <span style={{ fontSize: 12, color: sub }}>
                <span style={{ color: activeModel.color, fontWeight: 600 }}>{activeModel.name}</span>
                {' '}{t('typing')}
              </span>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* INPUT */}
        <div ref={inputBoxRef} style={{ display: 'flex', gap: 10, padding: '10px 10px 10px 18px', borderRadius: 22, background: card, border: `1px solid ${useStore ? '#10b98150' : bdr}`, boxShadow: useStore ? '0 0 0 2px rgba(16,185,129,0.07)' : '0 8px 28px rgba(0,0,0,0.1)', transition: '.3s' }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder={useStore ? t('placeholderStore', { modelName: activeModel.name }) : t('placeholderNormal', { modelName: activeModel.name })}
            rows={1}
            disabled={loading}
            style={{ flex: 1, background: 'transparent', border: 'none', resize: 'none', color: dark ? '#fff' : '#1e293b', outline: 'none', fontSize: 'clamp(13px,2vw,15px)', fontFamily: 'inherit', lineHeight: 1.55, maxHeight: 120, overflow: 'auto' }}
            onInput={e => { const el = e.target as HTMLTextAreaElement; el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 120) + 'px'; }}
          />
          <button onClick={() => send()} disabled={loading || !input.trim()}
            style={{ background: loading || !input.trim() ? (dark ? '#334155' : '#e2e8f0') : `linear-gradient(135deg, ${activeModel.color}, ${activeModel.color}bb)`, color: loading || !input.trim() ? sub : '#fff', border: 'none', width: 42, height: 42, borderRadius: 14, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: loading || !input.trim() ? 'not-allowed' : 'pointer', transition: '.2s' }}
          >
            {loading
              ? <div style={{ width: 17, height: 17, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .65s linear infinite' }} />
              : <Send size={16} />}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)} }
        @keyframes spin   { to{transform:rotate(360deg)} }
        @keyframes pulse  { 0%,100%{opacity:1}50%{opacity:.6} }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${dark ? '#1e293b' : '#e2e8f0'}; border-radius: 4px; }
        @media (min-width: 580px) { .badge-desk { display: inline-flex !important; } }
        @media (max-width: 440px) { .hide-xs { display: none !important; } }
        @media (max-width: 580px) { .hide-sm { display: none !important; } }
      `}</style>
    </MainLayout>
  );
}