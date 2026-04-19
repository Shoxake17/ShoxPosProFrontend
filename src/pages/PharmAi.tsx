import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Send, Trash2, ChevronDown, Check,
  BotMessageSquare, Zap, AlertCircle,
  Bot, Layers, BrainCircuit, FlaskConical
} from 'lucide-react';
import MainLayout from "../components/layout/MainLayout";
import { useTranslation } from 'react-i18next';
import axiosInstance from '../api/axiosInstance';
import { sanitizeAiMessageHtml } from "../utils/sanitizeHtml";
import { api } from "../utils/api";

const ModelIcon = ({ id, size = 16, color }: { id: string; size?: number; color?: string }) => {
  const s = { width: size, height: size, color: color || 'currentColor' };
  switch (id) {
    case 'shox-ai-pro':       return <Bot {...s} />;
    case 'shox-ai':           return <Zap {...s} />;
    case 'shox-ai-lite':      return <BotMessageSquare {...s} />;
    case 'shaddiy-ai-pro':    return <BrainCircuit {...s} />;
    case 'shaddiy-ai':        return <Layers {...s} />;
    case 'shaddiy-ai-lite':   return <FlaskConical {...s} />;
    default:                  return <Bot {...s} />;
  }
};

const ALL_MODELS = [
  { id: 'shox-ai-pro',      name: 'ShoxAi Pro',      provider: 'ShoxPosPro', endpoint: '/api/ask-shoxai',     groqModel: null, orModel: null, color: '#6366f1', badge: 'Asosiy',     group: 'Shox AI'    }, 
  { id: 'shox-ai',          name: 'ShoxAi',          provider: 'ShoxAi',     endpoint: '/api/shoxai',    groqModel: null, orModel: null, color: '#f97316', badge: 'Eng kuchli', group: 'Shox AI' }, 
  { id: 'shox-ai-lite',     name: 'ShoxAi Lite',     provider: 'ShoxAiLite',  endpoint: '/api/shoxai-lite',    groqModel: null, orModel: null, color: '#4285f4', badge: 'Lite', group: 'Shox AI' }, 
  { id: 'shaddiy-ai-pro',   name: 'Shaddiy Ai Pro',  provider: 'ShaddiyAiPro',  endpoint: '/api/shaddiy-ai-pro',    groqModel: 'llama-3.1-8b-instant',    orModel: null, color: '#22c55e', badge: 'Eng tez',     group: 'Shaddiy Ai' }, 
  { id: 'shaddiy-ai',       name: 'Shaddiy Ai',      provider: 'ShaddiyAi',  endpoint: '/api/shaddiy-ai', groqModel: null, orModel: 'deepseek/deepseek-chat', color: '#a855f7', badge: 'Aqlli', group: 'Shaddiy Ai' }, 
  { id: 'shaddiy-ai-lite',  name: 'Shaddiy Ai Lite', provider: 'ShaddiyAi Lite',  endpoint: '/api/shaddiy-ai-lite', groqModel: null, orModel: 'deepseek/deepseek-r1', color: '#3b82f6', badge: 'Fikrlovchi', group: 'Shaddiy Ai' }, 
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
  modelId?: string;
};

type ChatStore = Record<ModelId, Message[]>;

interface SaleItem     { barcode?: string; name?: string; quantity?: number; price?: number; basePrice?: number; category?: string; total?: number; soldAt?: string; }
interface ProductItem { barcode?: string; name?: string; price?: number; basePrice?: number; quantity?: number; category?: string; sold?: number; }

function renderMd(text: string): string {
  if (!text) return "";
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
  'shox-ai-pro': [], 'shox-ai': [], 'shox-ai-lite': [], 'shaddiy-ai-pro': [], 'shaddiy-ai': [], 'shaddiy-ai-lite': []
};

export default function PharmAi() {
  const navigate = useNavigate();
  const { t } = useTranslation(['ai', 'common']);

  const [chats,          setChats]          = useState<ChatStore>(EMPTY_CHATS);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [modelId,         setModelId]        = useState<ModelId>('shox-ai');
  const [input,           setInput]          = useState('');
  const [loading,         setLoading]        = useState(false);
  const [dropOpen,        setDropOpen]       = useState(false);
  const [useStore,        setUseStore]       = useState(true);
  const [salesData,       setSalesData]      = useState<SaleItem[]>([]);
  const [productsData,    setProductsData]   = useState<ProductItem[]>([]);
  const [pharmData,       setPharmData]      = useState<any>(null);

  const [theme]     = useState<'dark'|'light'>(() => (localStorage.getItem('theme') as any) || 'dark');
  const [userImage] = useState<string|null>(localStorage.getItem('userImage'));

  const bottomRef   = useRef<HTMLDivElement>(null);
  const dropRef     = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const loginRef = useRef<string>(
    (() => {
      try {
        const user = JSON.parse(sessionStorage.getItem("currentUser") || "{}");
        return user?.login || "";
      } catch { return ""; }
    })()
  );
  const login = loginRef.current;

  const activeModel = ALL_MODELS.find(m => m.id === modelId)!;
  const messages    = chats[modelId] || [];

  const getErrorMsg = (status?: number) => {
    if (!navigator.onLine) return { icon: <AlertCircle size={13}/>, title: t('ai:errNoInternet'),  desc: t('ai:errNoInternetDesc') };
    switch (status) {
      case 429: return { icon: <AlertCircle size={13}/>, title: t('ai:errLimit'),   desc: t('ai:errLimitDesc')   };
      case 500: return { icon: <AlertCircle size={13}/>, title: t('ai:errServer'),  desc: t('ai:errServerDesc')  };
      case 402: return { icon: <AlertCircle size={13}/>, title: t('ai:errBalance'), desc: t('ai:errBalanceDesc') };
      default:  return { icon: <AlertCircle size={13}/>, title: t('ai:errDefault'), desc: t('ai:errDefaultDesc') };
    }
  };

  const loadPharmData = useCallback(async () => {
    if (!login) return;
    try {
      const res = await axiosInstance.get(`/pharmacy/pharm-ai-data/${login}`);
      if (res.data) {
        setPharmData(res.data);
        setProductsData(res.data.products || []);
        setSalesData(res.data.sales || []);
      }
    } catch (e) { console.error(e); }
  }, [login]);

  const addMsg = (id: ModelId, msg: Message) =>
    setChats(prev => ({ ...prev, [id]: [...(prev[id] || []), msg] }));

  const loadHistory = useCallback(async () => {
    if (!login) return;
    setHistoryLoading(true);
    try {
      const res = await api(`/api/ai/history/${login}`);
      if (res.ok) {
        const history: Message[] = await res.json();
        const newChats: ChatStore = { ...EMPTY_CHATS };
        history.forEach(msg => {
          const mId = msg.modelId as any;
          const targetId = (mId === 'gemini-pro' || mId === 'gemini-2.5-flash') ? 'shox-ai-lite' : mId;
          if (newChats[targetId as ModelId]) {
            newChats[targetId as ModelId].push(msg);
          } else {
            newChats['shox-ai'].push(msg);
          }
        });
        setChats(newChats);
      }
    } catch (err) {
      console.error("History error:", err);
    } finally { setHistoryLoading(false); }
  }, [login]);

  const send = async (override?: string) => {
    const text = (override ?? input).trim();
    if (!text || loading) return;

    const currentModelId = modelId;
    const model = ALL_MODELS.find(m => m.id === currentModelId)!;

    addMsg(currentModelId, {
      role: 'user', content: text,
      timestamp: new Date().toISOString(), storeMode: useStore,
    });
    
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setLoading(true);

    try {
      const body: any = { question: text, login, useStore, modelId: currentModelId };
      if ('groqModel' in model && model.groqModel) body.groqModel = model.groqModel;
      if (model.orModel) body.orModel = model.orModel;
      if ('togetherModel' in model) body.togetherModel = (model as any).togetherModel;

      if (useStore && pharmData) {
        const now = new Date();
        body.systemOverride = `Professional dorixona tahlilchisi ShoxAi modelisan.\n\n=== ${login.toUpperCase()} DORIXONASI ===\nSana: ${now.toLocaleString('uz-UZ')}\nBUGUN SAVDO: ${pharmData.todayTotal?.toLocaleString() || 0} so'm\nJAMI DORI: ${pharmData.productCount || 0} ta\nJAMI SOTUV: ${pharmData.saleCount || 0} ta\n\nDORILAR: ${JSON.stringify(pharmData.products?.slice(0, 50) || [])}\n\nOXIRGI SOTUVLAR: ${JSON.stringify(pharmData.sales?.slice(0, 30) || [])}`;
      }

      const res = await api(model.endpoint, {
        method: 'POST',
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw Object.assign(new Error(errData.error || 'API Error'), { status: res.status });
      }
      
      const data = await res.json();
      addMsg(currentModelId, {
        role: 'ai', content: data.answer || 'Javob yo\'q',
        timestamp: new Date().toISOString(), ms: data.ms || 0,
      });
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'API xatosi';
      const errorCode = err?.status;
      addMsg(currentModelId, {
        role: 'ai', content: errorMessage, isError: true,
        errorCode, timestamp: new Date().toISOString(),
      });
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (!login) { navigate('/'); return; }
    loadPharmData();
    loadHistory();
  }, [login, navigate, loadPharmData, loadHistory]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chats, modelId]);

  const dark   = theme === 'dark';
  const bg     = dark ? 'rgba(30,41,59,0.65)' : 'rgba(255,255,255,0.85)';
  const chatBg = dark ? 'rgba(15,23,42,0.45)' : '#f8fafc';
  const bdr    = dark ? '#334155' : '#e2e8f0';
  const tx     = dark ? '#e2e8f0' : '#1e293b';
  const sub    = dark ? '#64748b' : '#94a3b8';
  const card   = dark ? '#1e293b' : '#ffffff';

  return (
    <MainLayout theme={theme} userImage={userImage} title="Dorixona AI">
      <div style={{
        width: '100%', height: 'calc(100vh - 160px)',
        display: 'flex', flexDirection: 'column', gap: 12,
      }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }} ref={dropRef}>
            <button onClick={() => setDropOpen(o => !o)} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderRadius: 16, border: 'none', cursor: 'pointer',
              background: bg, backdropFilter: 'blur(14px)', color: tx, boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, background: activeModel.color + '22', border: `1.5px solid ${activeModel.color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ModelIcon id={activeModel.id} size={18} color={activeModel.color} />
              </div>
              <div style={{ textAlign: 'left', minWidth: 0 }}>
                <div style={{ fontSize: 10, opacity: .5, fontWeight: 700, textTransform: 'uppercase' }}>Model</div>
                <div style={{ fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap' }}>{activeModel.name}</div>
              </div>
              <ChevronDown size={15} color={sub} style={{ transform: dropOpen ? 'rotate(180deg)' : 'none', transition: '.2s' }} />
            </button>

            {dropOpen && (
              <div style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, minWidth: 280, background: card, border: `1px solid ${bdr}`, borderRadius: 20, padding: 8, zIndex: 1001, boxShadow: '0 16px 48px rgba(0,0,0,0.2)' }}>
                {['Shox AI', 'Shaddiy Ai'].map(group => (
                  <div key={group}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: sub, padding: '8px 14px 4px' }}>{group}</div>
                    {ALL_MODELS.filter(m => m.group === group).map(m => (
                      <div key={m.id} onClick={() => { setModelId(m.id); setDropOpen(false); }}
                        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 12px', borderRadius: 13, cursor: 'pointer', background: modelId === m.id ? m.color + '18' : 'transparent' }}
                      >
                        <ModelIcon id={m.id} size={17} color={m.color} />
                        <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: modelId === m.id ? m.color : tx }}>{m.name}</div>
                        {modelId === m.id && <Check size={14} color={m.color} />}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            
            <button onClick={async () => { 
              if (window.confirm('Suhbatni tozalashni xohlaysizmi?')) {
                try {
                  const res = await api(`/api/ai/history/${login}`, { method: 'DELETE' });
                  if (res.ok) setChats(EMPTY_CHATS);
                } catch (err) { console.error(err); }
              }
            }} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 8 }}><Trash2 size={20}/></button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', borderRadius: 24, background: chatBg, border: `1px solid ${bdr}`, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {messages.length === 0 && !historyLoading && (
            <div style={{ margin: 'auto', textAlign: 'center', color: sub }}>
               <Bot size={48} color={activeModel.color} style={{ opacity: 0.5, marginBottom: 16 }} />
               <p>Salom {login}! Dorixonangiz haqida savol berishingiz mumkin!</p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{ 
                maxWidth: '85%', padding: '12px 16px', borderRadius: 18,
                background: msg.role === 'user' ? activeModel.color : card,
                color: msg.role === 'user' ? '#fff' : tx,
                border: msg.role === 'ai' ? `1px solid ${bdr}` : 'none',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
              }}>
                {msg.isError ? (
                   <div style={{ color: '#ef4444', fontSize: 13 }}>{msg.content || getErrorMsg(msg.errorCode).title}</div>
                ) : (
                  <div dangerouslySetInnerHTML={{ __html: msg.role === 'ai' ? sanitizeAiMessageHtml(renderMd(msg.content)) : msg.content }} />
                )}
                <div style={{ fontSize: 9, opacity: 0.5, textAlign: 'right', marginTop: 4 }}>
                  {new Date(msg.timestamp).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '12px 18px', borderRadius: 18, borderBottomLeftRadius: 6,
                background: card, border: `1px solid ${bdr}`,
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              }}>
                <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                  {[0, 1, 2].map(i => (
                    <span key={i} style={{
                      width: 7, height: 7, borderRadius: '50%',
                      background: activeModel.color,
                      display: 'inline-block',
                      animation: 'typingBounce 1.2s ease-in-out infinite',
                      animationDelay: `${i * 0.2}s`,
                      opacity: 0.85,
                    }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div style={{ display: 'flex', gap: 10, padding: 12, borderRadius: 20, background: card, border: `1px solid ${bdr}` }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder={activeModel.name + '...'}
            rows={1}
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: tx, resize: 'none' }}
          />
          <button onClick={() => send()} disabled={loading || !input.trim()} style={{ background: activeModel.color, color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 12, cursor: 'pointer' }}>
            <Send size={18} />
          </button>
        </div>
      </div>
      <style>{`
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-6px); opacity: 1; }
        }
      `}</style>
    </MainLayout>
  );
}
