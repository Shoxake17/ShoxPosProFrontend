import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bot, Send, Sparkles, Trash2, User, ChevronDown, Check,
  Zap, Orbit, AlertCircle, RefreshCw, Brain, Diamond,
  Database, MessageSquare
} from 'lucide-react';
import MainLayout from "../components/MainLayout";
import GroqPanel from '../ai/Groq';

// ─── Tiplar ───────────────────────────────────────────────────────────────────
type MessageRole = 'user' | 'ai';
type Message = {
  role: MessageRole;
  content: string;
  timestamp: string;
  modelName?: string;
  isError?: boolean;
  errorCode?: number;
  storeMode?: boolean;
};
interface SaleItem {
  barcode?: string; name?: string; quantity?: number; price?: number;
  basePrice?: number; category?: string; total?: number; soldAt?: string;
}
interface ProductItem {
  barcode?: string; name?: string; price?: number; basePrice?: number;
  quantity?: number; category?: string; sold?: number;
}

// ─── Model ma'lumotlari ───────────────────────────────────────────────────────
const AI_MODELS = [
  { id: 'deepseek', name: 'Shox AI',    provider: 'ShoxPosPro', icon: <Bot size={18} />,      color: '#4f46e5' },
] as const;

// ─── Tablar ───────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'chat', label: 'AI Chat', icon: <Brain size={15} /> },
  { id: 'groq', label: ' ShoxAi',  icon: <Zap size={15} />  },
] as const;
type TabId = (typeof TABS)[number]['id'];

// ─── Xato xabarlari ───────────────────────────────────────────────────────────
const getErrorMessage = (status?: number) => {
  if (!navigator.onLine) return { icon: '📵', title: "Internet aloqasi yo'q", desc: "Tarmoqni tekshiring." };
  switch (status) {
    case 429: return { icon: '⏳', title: "Juda ko'p so'rov",   desc: "Bir oz kuting." };
    case 500: return { icon: '🛠️', title: 'Server xatosi',      desc: 'Server vaqtincha ishlamayapti.' };
    case 402: return { icon: '💳', title: 'Balans tugagan',      desc: "Hisobingizni to'ldiring." };
    default:  return { icon: '⚠️', title: 'Kutilmagan xatolik', desc: "Qayta urinib ko'ring." };
  }
};

// ─── Markdown tozalash ────────────────────────────────────────────────────────
function cleanMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,     '<em>$1</em>')
    .replace(/`(.+?)`/g,       '<code style="background:rgba(79,70,229,0.15);padding:2px 6px;border-radius:4px;font-family:monospace;font-size:13px;">$1</code>')
    .replace(/#{1,3}\s(.+)/g,  '<div style="font-size:15px;font-weight:700;margin:12px 0 4px;color:#a5b4fc;">$1</div>')
    .replace(/^[-•]\s(.+)/gm,  '<div style="padding-left:16px;margin:2px 0;">• $1</div>')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g,   '<br/>');
}

// ─── Asosiy komponent ─────────────────────────────────────────────────────────
export default function Ai() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>('chat');

  // 🔑 Do'kon rejimi: false = oddiy AI (bazasiz), true = do'kon tahlili
  const [useStore, setUseStore] = useState(false);

  const [messages, setMessages] = useState<Message[]>(() => {
    try { return JSON.parse(localStorage.getItem('ai_chat_history') || '[]'); } catch { return []; }
  });
  const [input, setInput]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [selectedAI, setSelectedAI] = useState<'deepseek' | 'gemini' | 'grok' | 'openai'>('deepseek');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [theme]     = useState<'dark' | 'light'>(() => (localStorage.getItem('theme') as any) || 'dark');
  const [userImage] = useState<string | null>(localStorage.getItem('userImage'));

  const [salesData, setSalesData]       = useState<SaleItem[]>([]);
  const [productsData, setProductsData] = useState<ProductItem[]>([]);
  const [dataLoading, setDataLoading]   = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const dropdownRef    = useRef<HTMLDivElement | null>(null);
  const isInitialMount = useRef(true);

  const user  = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
  const login = user?.login || localStorage.getItem('login') || localStorage.getItem('currentLogin') || '';

  useEffect(() => {
    if (!login) { navigate('/'); return; }
    loadAllData();
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setIsDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [login]);

  useEffect(() => {
    localStorage.setItem('ai_chat_history', JSON.stringify(messages));
    if (!isInitialMount.current && messages.length > 0)
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    isInitialMount.current = false;
  }, [messages]);

  // ─── Ma'lumotlarni yuklash ─────────────────────────────────────────────────
  const loadAllData = async () => {
    if (!login) return;
    setDataLoading(true);
    try {
      const [sRes, pRes] = await Promise.allSettled([
        fetch(`/api/sales/${login}`),
        fetch(`/api/products/user-products/${login}`),
      ]);
      if (sRes.status === 'fulfilled' && sRes.value.ok) setSalesData(await sRes.value.json());
      if (pRes.status === 'fulfilled' && pRes.value.ok) setProductsData(await pRes.value.json());
    } catch (e) { console.error(e); }
    finally { setDataLoading(false); }
  };

  // ─── Kontekst ─────────────────────────────────────────────────────────────
  const buildContext = useCallback((): string => {
    const now        = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart  = new Date(now); weekStart.setDate(now.getDate() - 7);
    const monthStart = new Date(now); monthStart.setDate(now.getDate() - 30);

    const calc = (arr: SaleItem[]) => ({
      total:  arr.reduce((s, i) => s + (i.total  || 0), 0),
      profit: arr.reduce((s, i) => s + ((i.price || 0) - (i.basePrice || 0)) * (i.quantity || 1), 0),
      qty:    arr.reduce((s, i) => s + (i.quantity || 0), 0),
      count:  arr.length,
    });
    const t = calc(salesData.filter(s => s.soldAt && new Date(s.soldAt) >= todayStart));
    const w = calc(salesData.filter(s => s.soldAt && new Date(s.soldAt) >= weekStart));
    const m = calc(salesData.filter(s => s.soldAt && new Date(s.soldAt) >= monthStart));

    const pMap = new Map<string, { name: string; qty: number; total: number; profit: number }>();
    salesData.forEach(s => {
      const k = s.barcode || s.name || '';
      const c = pMap.get(k) || { name: s.name || '', qty: 0, total: 0, profit: 0 };
      c.qty += s.quantity || 0; c.total += s.total || 0;
      c.profit += ((s.price || 0) - (s.basePrice || 0)) * (s.quantity || 1);
      pMap.set(k, c);
    });
    const top10 = [...pMap.values()].sort((a, b) => b.total - a.total).slice(0, 10);

    const cMap = new Map<string, { total: number; qty: number }>();
    salesData.forEach(s => {
      const cat = s.category || "Noma'lum";
      const c = cMap.get(cat) || { total: 0, qty: 0 };
      c.total += s.total || 0; c.qty += s.quantity || 0; cMap.set(cat, c);
    });

    const lowStock = productsData.filter(p => (p.quantity || 0) < 10).sort((a, b) => (a.quantity||0)-(b.quantity||0)).slice(0, 15);
    const lossP    = productsData.filter(p => (p.price || 0) < (p.basePrice || 0));

    return `
=== ${login.toUpperCase()} DO'KONI — REAL MA'LUMOTLAR ===
Sana: ${now.toLocaleDateString('uz-UZ')} ${now.toLocaleTimeString('uz-UZ')}

BUGUN: Savdo ${t.total.toLocaleString()} so'm | Foyda ${t.profit.toLocaleString()} so'm | ${t.qty} dona | ${t.count} op.
7 KUN: Savdo ${w.total.toLocaleString()} so'm | Foyda ${w.profit.toLocaleString()} so'm | ${w.qty} dona
30 KUN: Savdo ${m.total.toLocaleString()} so'm | Foyda ${m.profit.toLocaleString()} so'm | ${m.qty} dona

TOP 10: ${top10.map((p,i)=>`${i+1}. ${p.name}: ${p.total.toLocaleString()} so'm`).join(' | ')}
KATEGORIYALAR: ${[...cMap.entries()].sort((a,b)=>b[1].total-a[1].total).map(([c,s])=>`${c}: ${s.total.toLocaleString()} so'm`).join(' | ')}
KAM ZAXIRA: ${lowStock.length > 0 ? lowStock.map(p=>`${p.name}: ${p.quantity||0} dona`).join(', ') : 'Yetarli'}
ZARAR: ${lossP.length > 0 ? lossP.map(p=>`${p.name} (sotuv:${p.price}, xarid:${p.basePrice})`).join(', ') : "Yo'q"}
JAMI: ${productsData.length} mahsulot | ${salesData.length} sotuv
`;
  }, [salesData, productsData, login]);

  // ─── API chaqiruvi ────────────────────────────────────────────────────────
  const callAPI = async (modelId: string, question: string): Promise<string> => {
    const endpoints: Record<string, string> = {
      deepseek: '/api/ask-deepseek',
    };
    const res = await fetch(endpoints[modelId], {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, login, useStore }),
    });
    if (!res.ok) throw Object.assign(new Error(), { status: res.status });
    const data = await res.json();
    return data.answer || "Javob olinmadi";
  };

  // ─── Xabar yuborish ───────────────────────────────────────────────────────
  const sendMessage = async (overrideInput?: string) => {
    const text = (overrideInput ?? input).trim();
    if (!text || loading) return;
    setMessages(prev => [...prev, { role: 'user', content: text, timestamp: new Date().toISOString(), storeMode: useStore }]);
    setInput('');
    setLoading(true);
    try {
      const answer = await callAPI(selectedAI, text);
      setMessages(prev => [...prev, { role: 'ai', content: answer, timestamp: new Date().toISOString(), modelName: selectedAI, storeMode: useStore }]);
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'ai', content: '', isError: true, errorCode: err?.status, timestamp: new Date().toISOString(), modelName: selectedAI }]);
    } finally { setLoading(false); }
  };

  const handleRetry = (errorIndex: number) => {
    const prev = messages.slice(0, errorIndex);
    const lastUser = [...prev].reverse().find(m => m.role === 'user');
    if (!lastUser) return;
    setMessages(prev);
    sendMessage(lastUser.content);
  };

  const clearChat = () => {
    if (window.confirm("Suhbatni tozalashni xohlaysizmi?")) {
      setMessages([]);
      localStorage.removeItem('ai_chat_history');
    }
  };

  const activeModel = AI_MODELS.find(m => m.id === selectedAI) || AI_MODELS[0];
  const isDark  = theme === 'dark';
  const card    = isDark ? 'rgba(30,41,59,0.6)' : 'rgba(255,255,255,0.8)';
  const border  = isDark ? '#334155' : '#e2e8f0';
  const txColor = isDark ? '#e2e8f0' : '#1e293b';

  return (
    <MainLayout theme={theme} userImage={userImage} title="AI Tahlilchi">
      <div style={{ width: '100%', height: 'calc(100vh - 160px)', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* ── Top bar: Tablar + Toggle ──────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>

          {/* Tablar */}
          <div style={{
            display: 'flex', gap: 6, padding: 6,
            background: card, backdropFilter: 'blur(15px)',
            borderRadius: 18, border: `1px solid ${border}`,
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
          }}>
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '8px 18px', borderRadius: 12, border: 'none', cursor: 'pointer',
                fontWeight: 600, fontSize: 13, transition: '.2s',
                background: activeTab === tab.id
                  ? (tab.id === 'groq' ? 'linear-gradient(135deg,#f97316,#fb923c)' : 'linear-gradient(135deg,#6366f1,#a855f7)')
                  : 'transparent',
                color: activeTab === tab.id ? '#fff' : (isDark ? '#64748b' : '#94a3b8'),
              }}>
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* 🔑 Do'kon rejimi toggle */}
          <button
            onClick={() => setUseStore(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 18px', borderRadius: 16, border: 'none', cursor: 'pointer',
              transition: '.25s',
              background: useStore
                ? 'linear-gradient(135deg,#10b981,#059669)'
                : (isDark ? '#1e293b' : '#f1f5f9'),
              color: useStore ? '#fff' : (isDark ? '#64748b' : '#94a3b8'),
              boxShadow: useStore ? '0 4px 16px rgba(16,185,129,0.35)' : 'none',
              fontWeight: 600, fontSize: 13,
            }}
          >
            {useStore
              ? <><Database size={15} /> Do'kon ma'lumotlari</>
              : <><MessageSquare size={15} /> Oddiy AI rejimi</>
            }
            {/* Pill */}
            <div style={{ width: 36, height: 20, borderRadius: 10, position: 'relative', background: useStore ? 'rgba(255,255,255,0.3)' : (isDark ? '#334155' : '#cbd5e1'), transition: '.25s' }}>
              <div style={{ position: 'absolute', top: 3, left: useStore ? 18 : 3, width: 14, height: 14, borderRadius: '50%', background: '#fff', transition: '.25s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
            </div>
          </button>
        </div>

        

        {/* ── TAB: Groq ─────────────────────────────────────────────────────── */}
        {activeTab === 'groq' && (
          <div style={{ flex: 1, minHeight: 0 }}>
            <GroqPanel login={login} isDark={isDark} buildContext={buildContext} useStore={useStore} />
          </div>
        )}

        {/* ── TAB: Chat ─────────────────────────────────────────────────────── */}
        {activeTab === 'chat' && (
          <>
            {/* Model header */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '12px 20px', borderRadius: 22, zIndex: 1000, position: 'relative',
              background: card, backdropFilter: 'blur(15px)',
              border: `1px solid ${border}`, boxShadow: '0 8px 30px rgba(0,0,0,0.1)'
            }}>
              <div ref={dropdownRef} style={{ position: 'relative' }}>
                <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} style={{
                  display: 'flex', alignItems: 'center', gap: 12, border: 'none',
                  padding: '10px 18px', borderRadius: 16, cursor: 'pointer',
                  background: isDark ? '#1e293b' : '#f1f5f9', color: isDark ? '#f8fafc' : '#1e293b', transition: '.2s'
                }}>
                  <div style={{ background: activeModel.color, padding: 7, borderRadius: 10, display: 'flex', color: '#fff' }}>{activeModel.icon}</div>
                  <div style={{ textAlign: 'left' }}>
                    <span style={{ display: 'block', fontSize: 10, opacity: .6, fontWeight: 800, textTransform: 'uppercase' }}>Model</span>
                    <span style={{ display: 'block', fontSize: 14, fontWeight: 600 }}>{activeModel.name}</span>
                  </div>
                  <ChevronDown size={16} style={{ transform: isDropdownOpen ? 'rotate(180deg)' : 'none', transition: '.3s' }} />
                </button>

                {isDropdownOpen && (
                  <div style={{
                    position: 'absolute', top: 'calc(100% + 8px)', left: 0, minWidth: 240,
                    background: isDark ? '#1e293b' : '#fff', borderRadius: 18, padding: 6,
                    zIndex: 1001, boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                    border: `1px solid ${border}`, display: 'flex', flexDirection: 'column', gap: 4,
                    animation: 'slideIn .2s ease-out'
                  }}>
                    {AI_MODELS.map(model => (
                      <div key={model.id}
                        onClick={() => { setSelectedAI(model.id as any); setIsDropdownOpen(false); }}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '10px 14px', borderRadius: 12, cursor: 'pointer', transition: '.15s',
                          background: selectedAI === model.id ? (isDark ? 'rgba(99,102,241,0.2)' : '#eef2ff') : 'transparent',
                          color: selectedAI === model.id ? '#6366f1' : txColor,
                        }}
                        onMouseEnter={e => { if (selectedAI !== model.id) (e.currentTarget as HTMLElement).style.background = isDark ? '#334155' : '#f1f5f9'; }}
                        onMouseLeave={e => { if (selectedAI !== model.id) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span style={{ color: model.color, display: 'flex' }}>{model.icon}</span>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 600 }}>{model.name}</div>
                            <div style={{ fontSize: 10, opacity: .5 }}>{model.provider}</div>
                          </div>
                        </div>
                        {selectedAI === model.id && <Check size={16} color="#6366f1" />}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={loadAllData} disabled={dataLoading} style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 14, border: 'none',
                  background: isDark ? '#0f172a' : '#e2e8f0', color: isDark ? '#94a3b8' : '#64748b', fontSize: 13, cursor: 'pointer', fontWeight: 500
                }}>
                  <RefreshCw size={14} style={{ animation: dataLoading ? 'spin 1s linear infinite' : 'none' }} /> Yangilash
                </button>
                <button onClick={clearChat} style={{
                  background: isDark ? 'rgba(239,68,68,0.1)' : '#fff1f2', border: 'none',
                  color: '#ef4444', padding: '9px 12px', borderRadius: 14, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500
                }}>
                  <Trash2 size={14} /> Tozalash
                </button>
              </div>
            </div>

            {/* Chat */}
            <div style={{
              flex: 1, overflowY: 'auto', padding: 20, borderRadius: 28,
              display: 'flex', flexDirection: 'column', gap: 14,
              background: isDark ? 'rgba(15,23,42,0.4)' : '#f8fafc',
              border: `1px solid ${isDark ? '#1e293b' : '#f1f5f9'}`,
            }}>
              {messages.length === 0 && (
                <div style={{ margin: 'auto', textAlign: 'center', color: '#64748b' }}>
                  <div style={{ animation: 'pulse 2s infinite' }}><Bot size={56} style={{ opacity: .2 }} /></div>
                  <div style={{ marginTop: 16, marginBottom: 4, fontSize: 14, color: isDark ? '#64748b' : '#94a3b8', fontWeight: 500 }}>Assalomu alaykum,</div>
                  <h2 style={{ margin: '0 0 8px', fontSize: 28, fontWeight: 800, background: 'linear-gradient(135deg,#6366f1,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    {login}
                  </h2>
                  <p style={{ fontSize: 14, color: isDark ? '#475569' : '#94a3b8' }}>
                    {useStore ? "📊 Do'kon tahlil rejimi yoqilgan" : '💬 Istalgan savol bering'}
                  </p>
                </div>
              )}

              {messages.map((msg, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', animation: 'slideIn .3s ease' }}>
                  {msg.role === 'ai' && msg.isError ? (
                    <div style={{ maxWidth: '80%', padding: '14px 18px', borderRadius: '22px 22px 22px 4px', background: isDark ? '#1e1215' : '#fff5f5', border: `1px solid ${isDark ? '#7f1d1d50' : '#fecaca'}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <AlertCircle size={15} color="#ef4444" />
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#ef4444' }}>{getErrorMessage(msg.errorCode).icon} {getErrorMessage(msg.errorCode).title}</span>
                      </div>
                      <p style={{ fontSize: 13, color: isDark ? '#fca5a5' : '#b91c1c', margin: 0 }}>{getErrorMessage(msg.errorCode).desc}</p>
                      <button onClick={() => handleRetry(i)} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: `1px solid ${isDark ? '#7f1d1d' : '#fca5a5'}`, color: '#ef4444', padding: '6px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', alignSelf: 'flex-start' }}>
                        <RefreshCw size={13} /> Qayta urinish
                      </button>
                    </div>
                  ) : (
                    <div style={{
                      maxWidth: '80%', padding: '14px 20px',
                      borderRadius: msg.role === 'user' ? '22px 22px 4px 22px' : '22px 22px 22px 4px',
                      background: msg.role === 'user' ? 'linear-gradient(135deg,#6366f1,#4f46e5)' : (isDark ? '#1e293b' : '#fff'),
                      color: msg.role === 'user' ? '#fff' : txColor,
                      border: msg.role === 'ai' ? `1px solid ${border}` : 'none',
                      boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
                      display: 'flex', flexDirection: 'column', gap: 6
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, opacity: .7 }}>
                        {msg.role === 'user'
                          ? <><User size={13} />{msg.storeMode && <span style={{ fontSize: 9, background: 'rgba(255,255,255,0.25)', padding: '1px 5px', borderRadius: 5 }}>📊</span>}</>
                          : <span style={{ color: AI_MODELS.find(m => m.id === msg.modelName)?.color }}>{AI_MODELS.find(m => m.id === msg.modelName)?.icon}</span>
                        }
                        <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase' }}>
                          {msg.role === 'ai' ? AI_MODELS.find(m => m.id === msg.modelName)?.name : ''}
                        </span>
                      </div>
                      <div style={{ fontSize: 14, lineHeight: 1.65 }} dangerouslySetInnerHTML={{ __html: msg.role === 'ai' ? cleanMarkdown(msg.content) : msg.content }} />
                      <span style={{ fontSize: 10, opacity: .5, alignSelf: 'flex-end', marginTop: 4 }}>
                        {new Date(msg.timestamp).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div style={{ display: 'flex', gap: 5, padding: '12px 16px', background: isDark ? '#1e293b' : '#fff', borderRadius: '22px 22px 22px 4px', width: 'fit-content', border: `1px solid ${border}` }}>
                  {[0,1,2].map(i => <span key={i} style={{ width: 7, height: 7, background: '#6366f1', borderRadius: '50%', display: 'block', animation: `bounce 1.4s ${i*.2}s infinite` }} />)}
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div style={{
              display: 'flex', gap: 12, padding: '10px 10px 10px 20px', borderRadius: 24,
              background: isDark ? '#1e293b' : '#fff',
              border: `1px solid ${useStore ? 'rgba(16,185,129,0.4)' : border}`,
              boxShadow: useStore ? '0 0 0 2px rgba(16,185,129,0.08)' : '0 10px 30px rgba(0,0,0,0.1)',
              transition: '.3s'
            }}>
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder={useStore ? `${activeModel.name} ga do'kon haqida so'rang...` : `${activeModel.name} ga istalgan savol bering...`}
                rows={1} disabled={loading}
                style={{ flex: 1, background: 'transparent', border: 'none', resize: 'none', color: isDark ? '#fff' : '#1e293b', outline: 'none', fontSize: 15, fontFamily: 'inherit', lineHeight: 1.5, maxHeight: 100, overflow: 'auto' }}
                onInput={e => { const t = e.target as HTMLTextAreaElement; t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 100) + 'px'; }}
              />
              <button onClick={() => sendMessage()} disabled={loading || !input.trim()} style={{
                background: loading || !input.trim() ? (isDark ? '#334155' : '#e2e8f0') : useStore ? 'linear-gradient(135deg,#10b981,#059669)' : 'linear-gradient(135deg,#6366f1,#a855f7)',
                color: loading || !input.trim() ? (isDark ? '#64748b' : '#94a3b8') : '#fff',
                border: 'none', width: 46, height: 46, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: loading || !input.trim() ? 'not-allowed' : 'pointer', transition: '.2s', flexShrink: 0
              }}>
                {loading ? <div style={{ width: 20, height: 20, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .8s linear infinite' }} /> : <Send size={18} />}
              </button>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes slideIn { from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)} }
        @keyframes bounce  { 0%,80%,100%{transform:scale(0);opacity:.3}40%{transform:scale(1);opacity:1} }
        @keyframes spin    { to{transform:rotate(360deg)} }
        @keyframes pulse   { 0%,100%{transform:scale(1)}50%{transform:scale(1.05)} }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${isDark ? '#1e293b' : '#e2e8f0'}; border-radius: 4px; }
      `}</style>
    </MainLayout>
  );
}