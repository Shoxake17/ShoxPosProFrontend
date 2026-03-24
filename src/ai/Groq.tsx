import React, { useState, useRef, useCallback } from 'react';
import { Send, RefreshCw, Zap, ChevronDown, Check } from 'lucide-react';

// ─── ShoxAi modellari ───────────────────────────────────────────────────────────
const GROQ_MODELS = [
  { id: 'llama-3.3-70b-versatile',  label: 'LLaMA 3.3 · 70B',   badge: 'Eng kuchli',  color: '#f97316' },
  { id: 'llama-3.1-8b-instant',     label: 'LLaMA 3.1 · 8B',    badge: 'Eng tez',     color: '#22c55e' },
  { id: 'mixtral-8x7b-32768',       label: 'Mixtral · 8×7B',     badge: '32K context', color: '#a855f7' },
  { id: 'gemma2-9b-it',             label: 'Gemma 2 · 9B',       badge: 'Gemma2-9b',      color: '#3b82f6' },
] as const;

type GroqModelId = (typeof GROQ_MODELS)[number]['id'];

interface GroqMessage {
  role: 'user' | 'ai';
  content: string;
  model: GroqModelId;
  ms?: number;        // javob vaqti (ms)
  isError?: boolean;
  errorCode?: number;
  timestamp: string;
}

interface GroqPanelProps {
  login: string;
  isDark: boolean;
  buildContext: () => string;   // Ai.tsx dan context builder
}

// ─── Markdown tozalash ────────────────────────────────────────────────────────
function cleanMd(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,     '<em>$1</em>')
    .replace(/`(.+?)`/g,       '<code style="background:rgba(249,115,22,0.15);padding:2px 6px;border-radius:4px;font-family:monospace;font-size:13px;">$1</code>')
    .replace(/#{1,3}\s(.+)/g,  '<div style="font-size:15px;font-weight:700;margin:12px 0 4px;color:#fb923c;">$1</div>')
    .replace(/^[-•]\s(.+)/gm,  '<div style="padding-left:16px;margin:2px 0;">• $1</div>')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g,   '<br/>');
}

function getErrorMsg(code?: number) {
  switch (code) {
    case 429: return { icon: '⏳', title: "Limit tugadi", desc: "Bir oz kuting va qayta urinib ko'ring." };
    case 500: return { icon: '🛠️', title: "Server xatosi", desc: "ShoxAi server vaqtincha ishlamayapti." };
    default:  return { icon: '⚠️', title: "Xatolik", desc: "Qayta urinib ko'ring." };
  }
}

// ─── Komponent ────────────────────────────────────────────────────────────────
export default function GroqPanel({ login, isDark, buildContext }: GroqPanelProps) {
  const [messages, setMessages] = useState<GroqMessage[]>([]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [model, setModel]       = useState<GroqModelId>('llama-3.3-70b-versatile');
  const [dropOpen, setDropOpen] = useState(false);
  const dropRef   = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const activeModel = GROQ_MODELS.find(m => m.id === model)!;

  // ─── API chaqiruvi ─────────────────────────────────────────────────────────
  const ask = useCallback(async (text: string) => {
    const context    = buildContext();
    const systemPrompt =
      `Sen professional savdo tahlilchisi va biznes maslahatchisisisan. O'zbek tilida javob ber. Markdown formatidan foydalan.\n\n${context}`;

    const t0 = Date.now();
    const res = await fetch('/api/ask-groq-ai', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: text,
        login,
        systemOverride: systemPrompt,
        groqModel: model,          // backend ga model uzatiladi
      }),
    });
    const ms = Date.now() - t0;
    if (!res.ok) throw Object.assign(new Error(), { status: res.status });
    const data = await res.json();
    return { answer: data.answer as string, ms };
  }, [login, model, buildContext]);

  // ─── Xabar yuborish ────────────────────────────────────────────────────────
  const send = async (override?: string) => {
    const text = (override ?? input).trim();
    if (!text || loading) return;

    const userMsg: GroqMessage = { role: 'user', content: text, model, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const { answer, ms } = await ask(text);
      setMessages(prev => [...prev, { role: 'ai', content: answer, model, ms, timestamp: new Date().toISOString() }]);
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'ai', content: '', isError: true, errorCode: err?.status, model, timestamp: new Date().toISOString() }]);
    } finally {
      setLoading(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  };

  // ─── Qayta urinish ─────────────────────────────────────────────────────────
  const retry = (errIdx: number) => {
    const lastUser = [...messages.slice(0, errIdx)].reverse().find(m => m.role === 'user');
    if (!lastUser) return;
    setMessages(messages.slice(0, errIdx));
    send(lastUser.content);
  };

  // ─── Ranglar ───────────────────────────────────────────────────────────────
  const bg    = isDark ? '#0f172a' : '#f8fafc';
  const card  = isDark ? '#1e293b' : '#ffffff';
  const border = isDark ? '#334155' : '#e2e8f0';
  const text  = isDark ? '#e2e8f0' : '#1e293b';
  const sub   = isDark ? '#64748b' : '#94a3b8';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 14 }}>

      {/* ── Model selector ─────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 18px', borderRadius: 20,
        background: card, border: `1px solid ${border}`,
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
      }}>
        {/* Badge: Groq branding */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            background: 'linear-gradient(135deg,#f97316,#fb923c)',
            borderRadius: 12, padding: '6px 12px',
            fontSize: 12, fontWeight: 800, color: '#fff', letterSpacing: 1
          }}>
             ShoxAi
          </div>
        </div>

        {/* Dropdown */}
        <div style={{ position: 'relative' }} ref={dropRef}>
          <button
            onClick={() => setDropOpen(o => !o)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 16px', borderRadius: 14, border: 'none', cursor: 'pointer',
              background: isDark ? '#0f172a' : '#f1f5f9', color: text,
            }}
          >
            <span style={{
              background: activeModel.color, borderRadius: 8,
              padding: '2px 8px', fontSize: 11, fontWeight: 700, color: '#fff'
            }}>{activeModel.badge}</span>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{activeModel.label}</span>
            <ChevronDown size={14} style={{ transform: dropOpen ? 'rotate(180deg)' : 'none', transition: '.2s' }} />
          </button>

          {dropOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 6px)', right: 0,
              minWidth: 240, background: card, border: `1px solid ${border}`,
              borderRadius: 16, padding: 6, zIndex: 100,
              boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
              display: 'flex', flexDirection: 'column', gap: 4
            }}>
              {GROQ_MODELS.map(m => (
                <div
                  key={m.id}
                  onClick={() => { setModel(m.id); setDropOpen(false); }}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '9px 14px', borderRadius: 12, cursor: 'pointer',
                    background: model === m.id ? (isDark ? 'rgba(249,115,22,0.15)' : '#fff7ed') : 'transparent',
                    color: model === m.id ? '#f97316' : text,
                    transition: '.15s'
                  }}
                  onMouseEnter={e => { if (model !== m.id) (e.currentTarget as HTMLElement).style.background = isDark ? '#334155' : '#f1f5f9'; }}
                  onMouseLeave={e => { if (model !== m.id) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{m.label}</div>
                    <div style={{ fontSize: 10, color: sub }}>{m.badge}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: m.color }} />
                    {model === m.id && <Check size={14} color="#f97316" />}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Chat oynasi ─────────────────────────────────────────────────── */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: 18, borderRadius: 24,
        background: isDark ? 'rgba(15,23,42,0.4)' : '#f8fafc',
        border: `1px solid ${isDark ? '#1e293b' : '#f1f5f9'}`,
        display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        {messages.length === 0 && (
          <div style={{ margin: 'auto', textAlign: 'center', color: sub }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}></div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#f97316', marginBottom: 4 }}>ShoxAi tayyor</div>
            <div style={{ fontSize: 13 }}>Eng tez LLM inference bilan do'kon tahlili</div>
            <div style={{
              display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginTop: 20
            }}>
              {["Bugungi savdo?", "Top mahsulotlar", "Kam zaxira bor?", "Oylik foyda"].map(q => (
                <button key={q} onClick={() => send(q)} style={{
                  padding: '7px 14px', borderRadius: 12, border: `1px solid ${border}`,
                  background: 'transparent', color: text, fontSize: 12,
                  cursor: 'pointer', fontWeight: 500, transition: '.2s'
                }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = '#f97316'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = border}
                >{q}</button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            {msg.isError ? (
              <div style={{
                maxWidth: '80%', padding: '12px 16px', borderRadius: '18px 18px 18px 4px',
                background: isDark ? '#1e1215' : '#fff5f5',
                border: `1px solid ${isDark ? '#7f1d1d50' : '#fecaca'}`,
                display: 'flex', flexDirection: 'column', gap: 6
              }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#ef4444' }}>
                  {getErrorMsg(msg.errorCode).icon} {getErrorMsg(msg.errorCode).title}
                </span>
                <p style={{ fontSize: 12, color: isDark ? '#fca5a5' : '#b91c1c', margin: 0 }}>
                  {getErrorMsg(msg.errorCode).desc}
                </p>
                <button onClick={() => retry(i)} disabled={loading} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: 'transparent', border: `1px solid #ef444450`,
                  color: '#ef4444', padding: '5px 12px', borderRadius: 8,
                  fontSize: 12, fontWeight: 600, cursor: 'pointer', alignSelf: 'flex-start'
                }}>
                  <RefreshCw size={11} /> Qayta urinish
                </button>
              </div>
            ) : (
              <div style={{
                maxWidth: '80%', padding: '12px 18px',
                borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                background: msg.role === 'user'
                  ? 'linear-gradient(135deg,#f97316,#fb923c)'
                  : card,
                color: msg.role === 'user' ? '#fff' : text,
                border: msg.role === 'ai' ? `1px solid ${border}` : 'none',
                boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
              }}>
                {msg.role === 'ai' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, opacity: .6 }}>
                    <Zap size={11} color="#f97316" />
                    <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: '#f97316' }}>
                      {GROQ_MODELS.find(m => m.id === msg.model)?.label}
                    </span>
                    {msg.ms && (
                      <span style={{ fontSize: 10, color: sub, marginLeft: 'auto' }}> {msg.ms}ms</span>
                    )}
                  </div>
                )}
                <div style={{ fontSize: 14, lineHeight: 1.65 }}
                  dangerouslySetInnerHTML={{
                    __html: msg.role === 'ai' ? cleanMd(msg.content) : msg.content
                  }}
                />
                <div style={{ fontSize: 10, opacity: .4, textAlign: 'right', marginTop: 4 }}>
                  {new Date(msg.timestamp).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 16px', background: card,
            borderRadius: '18px 18px 18px 4px', width: 'fit-content',
            border: `1px solid ${border}`, color: '#f97316', fontSize: 12
          }}>
            <div style={{
              width: 14, height: 14, border: '2px solid #f97316',
              borderTopColor: 'transparent', borderRadius: '50%',
              animation: 'groqSpin .6s linear infinite'
            }} />
            ShoxAi tahlil qilyapti...
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Input ────────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', gap: 10, padding: '10px 10px 10px 18px',
        borderRadius: 22, background: card,
        border: `1px solid ${border}`,
        boxShadow: '0 8px 24px rgba(0,0,0,0.08)'
      }}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="ShoxAi ga savol bering..."
          rows={1}
          disabled={loading}
          style={{
            flex: 1, background: 'transparent', border: 'none', resize: 'none',
            color: text, outline: 'none', fontSize: 15,
            fontFamily: 'inherit', lineHeight: 1.5, maxHeight: 100, overflow: 'auto'
          }}
          onInput={e => {
            const t = e.target as HTMLTextAreaElement;
            t.style.height = 'auto';
            t.style.height = Math.min(t.scrollHeight, 100) + 'px';
          }}
        />
        <button
          onClick={() => send()}
          disabled={loading || !input.trim()}
          style={{
            background: loading || !input.trim()
              ? (isDark ? '#334155' : '#e2e8f0')
              : 'linear-gradient(135deg,#f97316,#fb923c)',
            color: loading || !input.trim() ? sub : '#fff',
            border: 'none', width: 44, height: 44, borderRadius: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
            transition: '.2s', flexShrink: 0
          }}
        >
          {loading
            ? <div style={{ width: 18, height: 18, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'groqSpin .6s linear infinite' }} />
            : <Send size={16} />
          }
        </button>
      </div>

      <style>{`
        @keyframes groqSpin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}