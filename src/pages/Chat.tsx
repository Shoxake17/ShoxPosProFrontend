import React, { useState, useEffect, useRef } from 'react';
import {
  Send, Search, Trash2, Check,
  AlertCircle, RefreshCw, MoreVertical,
  Phone, Video
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/MainLayout';
import { useResponsive } from '../hooks/useResponsive';

// ─── Tiplar ───────────────────────────────────────────────────────────────
type ModelId = 'openai' | 'gemini' | 'grok';
type MessageRole = 'user' | 'ai';
type Message = {
  role: MessageRole;
  content: string;
  timestamp: string;
  modelName?: string;
  isError?: boolean;
  errorCode?: number;
};

// ─── Chat ro'yxati ────────────────────────────────────────────────────────
const CHATS = [
  {
    id: 'openai' as ModelId,
    name: 'ShoxAI Pro',
    provider: 'Anthropic · Claude',
    avatar: '🤖',
    color: '#2CA5E0',
    lastMsg: 'Salom! Qanday yordam bera olaman?',
  },
  {
    id: 'gemini' as ModelId,
    name: 'Gemini Pro',
    provider: 'Google AI',
    avatar: '✨',
    color: '#4285F4',
    lastMsg: 'Savollaringizga javob berishga tayyorman.',
  },
  {
    id: 'grok' as ModelId,
    name: 'Grok AI',
    provider: 'xAI',
    avatar: '⚡',
    color: '#9CA3AF',
    lastMsg: 'Muammolaringizni hal qilishga yordam beraman.',
  },
];

// ─── Xato xabarlari ───────────────────────────────────────────────────────
const getError = (status?: number) => {
  if (!navigator.onLine) return { title: "Internet yo'q", desc: "Tarmoqni tekshirib qayta urinib ko'ring." };
  const map: Record<number, { title: string; desc: string }> = {
    400: { title: "Noto'g'ri so'rov",  desc: "Xabaringizni o'zgartirib yuboring." },
    401: { title: "API kalit xato",    desc: ".env da VITE_ANTHROPIC_KEY ni tekshiring." },
    429: { title: "Juda ko'p so'rov",  desc: "30 soniya kuting va qayta urinib ko'ring." },
    500: { title: "Server xatosi",     desc: "1-2 daqiqadan so'ng qayta urinib ko'ring." },
    503: { title: "Xizmat band",       desc: "Keyinroq urinib ko'ring." },
  };
  return map[status ?? 0] ?? { title: "Kutilmagan xatolik", desc: "Sahifani yangilab ko'ring." };
};

// ─── API chaqiruvlari ─────────────────────────────────────────────────────
async function callAnthropic(msgs: Message[]): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': import.meta.env.VITE_ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: "Siz ShoxPOS tizimining AI assistentisiz. Savdo va do'kon boshqaruvi haqida yordam bering. Qisqa va aniq javob bering. O'zbek tilida javob bering.",
      messages: msgs.filter(m => !m.isError).map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
      })),
    }),
  });
  if (!res.ok) throw Object.assign(new Error(), { status: res.status });
  return (await res.json()).content?.[0]?.text ?? '';
}

async function callGemini(msgs: Message[]): Promise<string> {
  const lastUser = [...msgs].reverse().find(m => m.role === 'user');
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${import.meta.env.VITE_GEMINI_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: lastUser?.content ?? '' }] }] }),
    }
  );
  if (!res.ok) throw Object.assign(new Error(), { status: res.status });
  return (await res.json()).candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

async function callGrok(msgs: Message[]): Promise<string> {
  const res = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${import.meta.env.VITE_GROK_KEY}`,
    },
    body: JSON.stringify({
      model: 'grok-3-fast',
      messages: msgs.filter(m => !m.isError).map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
      })),
      max_tokens: 1024,
    }),
  });
  if (!res.ok) throw Object.assign(new Error(), { status: res.status });
  return (await res.json()).choices?.[0]?.message?.content ?? '';
}

async function callModel(id: ModelId, msgs: Message[]): Promise<string> {
  if (id === 'openai') return callAnthropic(msgs);
  if (id === 'gemini') return callGemini(msgs);
  return callGrok(msgs);
}

// ─── Yordamchi ────────────────────────────────────────────────────────────
const fmtTime = (iso: string) =>
  iso ? new Date(iso).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }) : '';

const cleanMd = (t: string) =>
  t.replace(/\*\*(.+?)\*\*/g, '$1')
   .replace(/\*(.+?)\*/g, '$1')
   .replace(/`(.+?)`/g, '$1')
   .replace(/#{1,6}\s/g, '')
   .replace(/\[(.+?)\]\(.+?\)/g, '$1')
   .replace(/^\s*[-*+]\s/gm, '• ')
   .replace(/^\s*\d+\.\s/gm, '')
   .trim();

// ═══════════════════════════════════════════════════════════════════════════
export default function Chat() {
  const navigate = useNavigate();
  const [theme] = useState<'dark' | 'light'>(() => (localStorage.getItem('theme') as any) || 'dark');
  const isDark = theme === 'dark';
  const [userImage] = useState<string | null>(localStorage.getItem('userImage'));

  const [histories, setHistories] = useState<Record<ModelId, Message[]>>(() => {
    try { return JSON.parse(localStorage.getItem('chat_histories') || '{}'); }
    catch { return {} as Record<ModelId, Message[]>; }
  });

  const [activeId, setActiveId] = useState<ModelId | null>(null);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [search, setSearch]     = useState('');
  const [showMenu, setShowMenu] = useState(false);

  const bottomRef   = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isFirstRef  = useRef(true);

  const activeChat = CHATS.find(c => c.id === activeId);
  const messages   = activeId ? (histories[activeId] ?? []) : [];

  useEffect(() => {
    localStorage.setItem('chat_histories', JSON.stringify(histories));
  }, [histories]);

  useEffect(() => {
    if (!isFirstRef.current) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    isFirstRef.current = false;
  }, [messages, loading]);

  useEffect(() => { isFirstRef.current = true; }, [activeId]);

  // ─── Yuborish ─────────────────────────────────────────────────────────
  const send = async (override?: string) => {
    if (!activeId) return;
    const text = (override ?? input).trim();
    if (!text || loading) return;

    const userMsg: Message = { role: 'user', content: text, timestamp: new Date().toISOString() };
    const prev = histories[activeId] ?? [];
    const next = [...prev, userMsg];

    setHistories(h => ({ ...h, [activeId]: next }));
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setLoading(true);

    try {
      const raw = await callModel(activeId, next);
      setHistories(h => ({
        ...h,
        [activeId]: [...next, {
          role: 'ai',
          content: cleanMd(raw) || 'Javob olinmadi.',
          timestamp: new Date().toISOString(),
          modelName: activeId,
        }],
      }));
    } catch (err: any) {
      setHistories(h => ({
        ...h,
        [activeId]: [...next, {
          role: 'ai', content: '', isError: true,
          errorCode: err?.status, timestamp: new Date().toISOString(),
        }],
      }));
    } finally {
      setLoading(false);
    }
  };

  const retry = (idx: number) => {
    if (!activeId) return;
    const prev = messages.slice(0, idx);
    const lastUser = [...prev].reverse().find(m => m.role === 'user');
    if (!lastUser) return;
    setHistories(h => ({ ...h, [activeId]: prev }));
    send(lastUser.content);
  };

  const clearChat = () => {
    if (!activeId || !confirm("Bu chatni tozalashni xohlaysizmi?")) return;
    setHistories(h => ({ ...h, [activeId]: [] }));
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const onInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px';
  };

  // ─── Ranglar ──────────────────────────────────────────────────────────
  const c = {
    sidebarBg:        isDark ? '#1A2535' : '#FFFFFF',
    sidebarBorder:    isDark ? '#263547' : '#E2E8F0',
    searchBg:         isDark ? '#111E2C' : '#F0F2F5',
    itemHover:        isDark ? '#263547' : '#F5F6F6',
    itemActive:       isDark ? '#1E3A52' : '#E8F4FD',
    itemActiveBorder: isDark ? '#2CA5E0' : '#2CA5E0',
    nameColor:        isDark ? '#E9EDEF' : '#111B21',
    subColor:         isDark ? '#8696A0' : '#667781',
    timeColor:        isDark ? '#8696A0' : '#667781',
    divider:          isDark ? '#263547' : '#F0F2F5',
    chatBg:           isDark ? '#0B1622' : '#EBF2FB',
    headerBg:         isDark ? '#182533' : '#FFFFFF',
    headerBorder:     isDark ? '#263547' : '#E2E8F0',
    bubbleOut:        isDark ? '#005C4B' : '#D9FDD3',
    bubbleIn:         isDark ? '#182533' : '#FFFFFF',
    bubbleInBorder:   isDark ? '#263547' : '#E8E8E8',
    textOut:          isDark ? '#E9EDEF' : '#111B21',
    textIn:           isDark ? '#E9EDEF' : '#111B21',
    timeMsg:          isDark ? '#8696A0' : '#667781',
    inputAreaBg:      isDark ? '#182533' : '#FFFFFF',
    inputAreaBorder:  isDark ? '#263547' : '#E2E8F0',
    inputFieldBg:     isDark ? '#263547' : '#F0F2F5',
    inputText:        isDark ? '#D1D7DB' : '#111B21',
    sendActive:       '#00A884',
    online:           '#00A884',
    iconColor:        isDark ? '#8696A0' : '#54656F',
    emptyText:        isDark ? '#8696A0' : '#667781',
    emptyCardBg:      isDark ? '#182533' : '#FFFFFF',
    scrollThumb:      isDark ? '#263547' : '#D1D5DB',
  };

  const filteredChats = CHATS.filter(ch =>
    ch.name.toLowerCase().includes(search.toLowerCase())
  );

  // ─── Chat panel ichidagi layout ───────────────────────────────────────
  const chatPanel = (
    <div style={{
      display: 'flex',
      height: 'calc(100vh - 70px)', // MainLayout header height
      overflow: 'hidden',
      borderRadius: 12,
      border: `1px solid ${c.sidebarBorder}`,
      background: c.chatBg,
    }}>

      {/* ── Sol: Chat ro'yxati ── */}
      <div style={{
        width: 320,
        minWidth: 260,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        background: c.sidebarBg,
        borderRight: `1px solid ${c.sidebarBorder}`,
      }}>
        {/* Search */}
        <div style={{
          padding: '10px 12px',
          borderBottom: `1px solid ${c.divider}`,
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: c.searchBg, borderRadius: 20, padding: '8px 14px',
          }}>
            <Search size={15} color={c.iconColor} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Qidirish..."
              style={{
                flex: 1, background: 'none', border: 'none', outline: 'none',
                color: isDark ? '#D1D7DB' : '#111B21',
                fontSize: 13, fontFamily: 'inherit',
              }}
            />
          </div>
        </div>

        {/* Ro'yxat */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filteredChats.map(chat => {
            const chatMsgs = histories[chat.id] ?? [];
            const last     = chatMsgs[chatMsgs.length - 1];
            const lastText = last?.content || chat.lastMsg;
            const lastTime = last?.timestamp ? fmtTime(last.timestamp) : '';
            const isActive = activeId === chat.id;
            const unread   = 0; // kelajakda qo'shish mumkin

            return (
              <div
                key={chat.id}
                onClick={() => { setActiveId(chat.id); setShowMenu(false); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px',
                  background: isActive ? c.itemActive : 'transparent',
                  borderLeft: `3px solid ${isActive ? c.itemActiveBorder : 'transparent'}`,
                  cursor: 'pointer', transition: '.12s',
                  borderBottom: `1px solid ${c.divider}`,
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = c.itemHover; }}
                onMouseLeave={e => { e.currentTarget.style.background = isActive ? c.itemActive : 'transparent'; }}
              >
                {/* Avatar */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div style={{
                    width: 46, height: 46, borderRadius: '50%',
                    background: `linear-gradient(135deg, ${chat.color}44, ${chat.color}88)`,
                    border: `2px solid ${chat.color}44`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 22,
                  }}>
                    {chat.avatar}
                  </div>
                  <div style={{
                    position: 'absolute', bottom: 1, right: 1,
                    width: 11, height: 11, borderRadius: '50%',
                    background: c.online, border: `2px solid ${c.sidebarBg}`,
                  }} />
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'baseline', marginBottom: 2,
                  }}>
                    <span style={{
                      fontWeight: 600, fontSize: 14, color: c.nameColor,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {chat.name}
                    </span>
                    <span style={{ fontSize: 11, color: c.timeColor, flexShrink: 0, marginLeft: 4 }}>
                      {lastTime}
                    </span>
                  </div>
                  <div style={{
                    fontSize: 12, color: c.subColor,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {lastText.length > 38 ? lastText.slice(0, 38) + '…' : lastText}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── O'ng: Chat maydoni ── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0,
      }}>
        {activeChat ? (
          <>
            {/* Header */}
            <div style={{
              height: 54, flexShrink: 0,
              background: c.headerBg,
              borderBottom: `1px solid ${c.headerBorder}`,
              display: 'flex', alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 14px',
            }}>
              {/* Chap: avatar + ism */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: `linear-gradient(135deg, ${activeChat.color}44, ${activeChat.color}88)`,
                  border: `2px solid ${activeChat.color}44`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                }}>
                  {activeChat.avatar}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: c.nameColor }}>{activeChat.name}</div>
                  <div style={{ fontSize: 11, color: c.online }}>online</div>
                </div>
              </div>

              {/* O'ng: tugmalar */}
              <div style={{ display: 'flex', gap: 2 }}>
                {[
                  { icon: <Search size={17} />, title: "Qidirish" },
                  { icon: <Phone size={17} />,  title: "Qo'ng'iroq" },
                  { icon: <Video size={17} />,  title: "Video" },
                ].map((btn, i) => (
                  <button key={i} title={btn.title} style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: c.iconColor, padding: 8, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', transition: '.15s',
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = c.itemHover}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    {btn.icon}
                  </button>
                ))}

                {/* 3 nuqta menyu */}
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setShowMenu(v => !v)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: c.iconColor, padding: 8, borderRadius: '50%',
                      display: 'flex', alignItems: 'center', transition: '.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = c.itemHover}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    <MoreVertical size={17} />
                  </button>
                  {showMenu && (
                    <div style={{
                      position: 'absolute', top: 42, right: 0, zIndex: 100,
                      background: isDark ? '#1A2B3C' : '#FFFFFF',
                      border: `1px solid ${c.divider}`,
                      borderRadius: 10, overflow: 'hidden',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                      minWidth: 180,
                    }}>
                      <div
                        onClick={() => { clearChat(); setShowMenu(false); }}
                        style={{
                          padding: '11px 16px', cursor: 'pointer',
                          color: '#EF4444',
                          display: 'flex', alignItems: 'center', gap: 10,
                          transition: '.12s', fontSize: 14,
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = isDark ? '#263547' : '#FFF5F5'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <Trash2 size={15} /> Chatni tozalash
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Xabarlar maydoni */}
            <div
              onClick={() => setShowMenu(false)}
              style={{
                flex: 1, overflowY: 'auto',
                background: c.chatBg,
                padding: '10px 0',
                display: 'flex', flexDirection: 'column',
              }}
            >
              {messages.length === 0 && (
                <div style={{
                  flex: 1, display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <div style={{
                    background: c.emptyCardBg, borderRadius: 16,
                    padding: '10px 22px', fontSize: 13,
                    color: c.emptyText, boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
                  }}>
                    Suhbatni boshlang
                  </div>
                </div>
              )}

              <div style={{
                display: 'flex', flexDirection: 'column',
                gap: 2, padding: '0 50px',
              }}>
                {messages.map((msg, i) => {
                  const isUser    = msg.role === 'user';
                  const isGrpFirst = i === 0 || messages[i - 1].role !== msg.role;

                  return (
                    <div key={i} style={{
                      display: 'flex',
                      justifyContent: isUser ? 'flex-end' : 'flex-start',
                      marginTop: isGrpFirst && i > 0 ? 8 : 1,
                      animation: 'fadeUp .15s ease',
                    }}>
                      {msg.isError ? (
                        /* Xato pufakcha */
                        <div style={{
                          maxWidth: '68%',
                          background: isDark ? '#2D1515' : '#FEF2F2',
                          border: `1px solid ${isDark ? '#7f1d1d40' : '#FECACA'}`,
                          borderRadius: '12px 12px 12px 3px',
                          padding: '10px 14px',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            <AlertCircle size={13} color="#EF4444" />
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#EF4444' }}>
                              {getError(msg.errorCode).title}
                            </span>
                          </div>
                          <p style={{ fontSize: 12, color: isDark ? '#FCA5A5' : '#B91C1C', margin: '0 0 8px', lineHeight: 1.5 }}>
                            {getError(msg.errorCode).desc}
                          </p>
                          <button
                            onClick={() => retry(i)} disabled={loading}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 4,
                              background: 'none', border: '1px solid #EF444450',
                              color: '#EF4444', padding: '4px 10px',
                              borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                            }}
                          >
                            <RefreshCw size={10} /> Qayta urinish
                          </button>
                        </div>
                      ) : (
                        /* Oddiy pufakcha */
                        <div style={{
                          maxWidth: '68%',
                          background: isUser ? c.bubbleOut : c.bubbleIn,
                          border: isUser ? 'none' : `1px solid ${c.bubbleInBorder}`,
                          borderRadius: isUser
                            ? (isGrpFirst ? '12px 12px 3px 12px' : '12px 3px 3px 12px')
                            : (isGrpFirst ? '3px 12px 12px 12px' : '3px 12px 12px 12px'),
                          padding: '7px 11px 5px',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                        }}>
                          {!isUser && isGrpFirst && (
                            <div style={{ fontSize: 11, fontWeight: 700, color: activeChat.color, marginBottom: 2 }}>
                              {activeChat.name}
                            </div>
                          )}
                          <div style={{
                            color: isUser ? c.textOut : c.textIn,
                            lineHeight: 1.55, whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word', fontSize: 14,
                          }}>
                            {msg.content}
                          </div>
                          {/* Vaqt + chek */}
                          <div style={{
                            display: 'flex', justifyContent: 'flex-end',
                            alignItems: 'center', gap: 3, marginTop: 2,
                          }}>
                            <span style={{ fontSize: 10, color: c.timeMsg }}>
                              {fmtTime(msg.timestamp)}
                            </span>
                            {isUser && (
                              <svg width="15" height="10" viewBox="0 0 15 10" fill="none">
                                <path d="M1 5L4.5 8.5L9 2" stroke="#53BDEB" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M5.5 5L9 8.5L13.5 2" stroke="#53BDEB" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Typing indicator */}
                {loading && (
                  <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: 4 }}>
                    <div style={{
                      background: c.bubbleIn, border: `1px solid ${c.bubbleInBorder}`,
                      borderRadius: '3px 12px 12px 12px',
                      padding: '10px 14px',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                    }}>
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center', height: 14 }}>
                        {[0, 0.22, 0.44].map((d, i) => (
                          <span key={i} style={{
                            display: 'block', width: 6, height: 6, borderRadius: '50%',
                            background: c.iconColor,
                            animation: `dot 1.2s ${d}s ease-in-out infinite`,
                          }} />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div ref={bottomRef} style={{ height: 6 }} />
            </div>

            {/* Input */}
            <div style={{
              flexShrink: 0,
              background: c.inputAreaBg,
              borderTop: `1px solid ${c.inputAreaBorder}`,
              padding: '8px 12px',
              display: 'flex', alignItems: 'flex-end', gap: 8,
            }}>
              <div style={{
                flex: 1, background: c.inputFieldBg,
                borderRadius: 20, padding: '9px 14px',
                display: 'flex', alignItems: 'flex-end',
              }}>
                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={input}
                  onChange={onInput}
                  onKeyDown={onKey}
                  placeholder="Xabar yozing..."
                  style={{
                    flex: 1, background: 'none', border: 'none', outline: 'none',
                    resize: 'none', fontFamily: 'inherit',
                    fontSize: 14, lineHeight: 1.5,
                    color: c.inputText, maxHeight: 120, overflow: 'auto',
                  }}
                />
              </div>
              <button
                onClick={() => send()}
                disabled={loading || !input.trim()}
                style={{
                  width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
                  background: input.trim() && !loading ? c.sendActive : (isDark ? '#263547' : '#E2E8F0'),
                  border: 'none',
                  cursor: input.trim() && !loading ? 'pointer' : 'default',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: input.trim() && !loading ? '#fff' : c.iconColor,
                  transition: 'all .2s',
                }}
              >
                {loading
                  ? <div style={{ width: 18, height: 18, border: `2px solid ${c.iconColor}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
                  : <Send size={16} style={{ transform: 'translateX(1px)' }} />
                }
              </button>
            </div>
          </>
        ) : (
          /* Hech narsa tanlanmagan */
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            background: c.chatBg, color: c.emptyText,
          }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: isDark ? '#182533' : '#DFE5E7',
              display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 32, marginBottom: 18,
            }}>
              💬
            </div>
            <div style={{ fontSize: 20, fontWeight: 500, color: c.nameColor, marginBottom: 8 }}>
              ShoxAI Chat
            </div>
            <div style={{
              background: c.emptyCardBg, borderRadius: 14,
              padding: '9px 20px', fontSize: 13, color: c.emptyText,
              boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
            }}>
              Chatni tanlang va xabar yozing
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(6px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes dot {
          0%,100% { transform:translateY(0); opacity:.35; }
          50%      { transform:translateY(-5px); opacity:1; }
        }
        @keyframes spin { to { transform:rotate(360deg); } }
        .chat-scroll::-webkit-scrollbar { width:3px; }
        .chat-scroll::-webkit-scrollbar-thumb { background:${c.scrollThumb}; border-radius:4px; }
        .chat-scroll::-webkit-scrollbar-track { background:transparent; }
      `}</style>
    </div>
  );

  // ─── MainLayout ichida render ─────────────────────────────────────────
  return (
    <MainLayout theme={theme} userImage={userImage} title="Chat">
      {chatPanel}
    </MainLayout>
  );
}