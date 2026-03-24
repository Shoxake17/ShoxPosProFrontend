import React, { useState, useEffect, useRef } from 'react';
import {
  Send, Search, Trash2,
  AlertCircle, RefreshCw, MoreVertical,
  Phone, Video, PanelRightClose
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import { useResponsive } from '../hooks/useResponsive';
import {
  User, Wifi, WifiOff,
  BatteryLow, BatteryMedium, BatteryFull, BatteryCharging
} from 'lucide-react';
import Notification from '../components/NotificationBar';

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

const CHATS = [
  { id: 'openai' as ModelId, name: 'ShoxAI Pro',  avatar: '🤖', color: '#2CA5E0', lastMsg: 'Salom! Qanday yordam bera olaman?' },
  { id: 'gemini' as ModelId, name: 'Gemini Pro',  avatar: '✨', color: '#4285F4', lastMsg: 'Savollaringizga javob berishga tayyorman.' },
  { id: 'grok'   as ModelId, name: 'Grok AI',     avatar: '⚡', color: '#9CA3AF', lastMsg: 'Muammolaringizni hal qilishga yordam beraman.' },
];

const getError = (status?: number) => {
  if (!navigator.onLine) return { title: "Internet yo'q", desc: "Tarmoqni tekshirib qayta urinib ko'ring." };
  const m: Record<number,{title:string;desc:string}> = {
    400:{title:"Noto'g'ri so'rov",  desc:"Xabaringizni o'zgartirib yuboring."},
    401:{title:"API kalit xato",    desc:".env da VITE_ANTHROPIC_KEY ni tekshiring."},
    429:{title:"Juda ko'p so'rov",  desc:"30 soniya kuting va qayta urinib ko'ring."},
    500:{title:"Server xatosi",     desc:"1-2 daqiqadan so'ng qayta urinib ko'ring."},
    503:{title:"Xizmat band",       desc:"Keyinroq urinib ko'ring."},
  };
  return m[status??0]??{title:"Kutilmagan xatolik",desc:"Sahifani yangilab ko'ring."};
};

// ─── API ──────────────────────────────────────────────────────────────────
async function callAnthropic(msgs: Message[]): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method:'POST',
    headers:{'Content-Type':'application/json','x-api-key':import.meta.env.VITE_ANTHROPIC_KEY,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
    body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:1024,system:"Siz ShoxPOS tizimining AI assistentisiz. Savdo va do'kon boshqaruvi haqida yordam bering. Qisqa va aniq javob bering. O'zbek tilida javob bering.",messages:msgs.filter(m=>!m.isError).map(m=>({role:m.role==='user'?'user':'assistant',content:m.content}))}),
  });
  if(!res.ok) throw Object.assign(new Error(),{status:res.status});
  return (await res.json()).content?.[0]?.text??'';
}
async function callGemini(msgs: Message[]): Promise<string> {
  const last=[...msgs].reverse().find(m=>m.role==='user');
  const res=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${import.meta.env.VITE_GEMINI_KEY}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contents:[{parts:[{text:last?.content??''}]}]})});
  if(!res.ok) throw Object.assign(new Error(),{status:res.status});
  return (await res.json()).candidates?.[0]?.content?.parts?.[0]?.text??'';
}
async function callGrok(msgs: Message[]): Promise<string> {
  const res=await fetch('https://api.x.ai/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${import.meta.env.VITE_GROK_KEY}`},body:JSON.stringify({model:'grok-3-fast',messages:msgs.filter(m=>!m.isError).map(m=>({role:m.role==='user'?'user':'assistant',content:m.content})),max_tokens:1024})});
  if(!res.ok) throw Object.assign(new Error(),{status:res.status});
  return (await res.json()).choices?.[0]?.message?.content??'';
}
async function callModel(id:ModelId,msgs:Message[]): Promise<string> {
  if(id==='openai') return callAnthropic(msgs);
  if(id==='gemini') return callGemini(msgs);
  return callGrok(msgs);
}

const fmtTime=(iso:string)=>iso?new Date(iso).toLocaleTimeString('uz-UZ',{hour:'2-digit',minute:'2-digit'}):'';
const cleanMd=(t:string)=>t.replace(/\*\*(.+?)\*\*/g,'$1').replace(/\*(.+?)\*/g,'$1').replace(/`(.+?)`/g,'$1').replace(/#{1,6}\s/g,'').replace(/\[(.+?)\]\(.+?\)/g,'$1').replace(/^\s*[-*+]\s/gm,'• ').replace(/^\s*\d+\.\s/gm,'').trim();

// ═══════════════════════════════════════════════════════════════════════════
export default function Chat() {
  const { isMobile, sidebarOpen, setSidebarOpen } = useResponsive();

  // ── theme: localStorage + real-time polling ────────────────────────────
  const [theme, setTheme] = useState<'dark'|'light'>(
    () => (localStorage.getItem('theme') as 'dark'|'light') || 'dark'
  );
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'theme' && e.newValue) setTheme(e.newValue as 'dark'|'light');
    };
    window.addEventListener('storage', onStorage);
    const id = setInterval(() => {
      const t = localStorage.getItem('theme') as 'dark'|'light';
      if (t) setTheme(prev => prev !== t ? t : prev);
    }, 300);
    return () => { window.removeEventListener('storage', onStorage); clearInterval(id); };
  }, []);

  const isDark = theme === 'dark';
  const [userImage] = useState<string|null>(localStorage.getItem('userImage'));

  // ══════════════════════════════════════════════════════════════════════
  // RANGLAR — Sidebar.tsx va MainLayout.tsx bilan TO'LIQ UYGUN
  // Sidebar.tsx:   background: dark="#0f1420" light="#ffffff"
  //                borderRight: dark="#1a1f2e" light="#e2e8f0"
  //                hover:       dark="#1a1f2e" light="#f1f5f9"
  //                icon color:  dark="#8b92a7" light="#64748b"
  // MainLayout.tsx: background: dark="#0a0e1a" light="#f8f9ff"
  //                 color:      dark="#fff"    light="#1a1f2e"
  // ══════════════════════════════════════════════════════════════════════
  const MAIN_BG      = isDark ? '#0a0e1a' : '#f8f9ff';  // MainLayout.tsx bg
  const SIDEBAR_BG   = isDark ? '#0f1420' : '#ffffff';  // Sidebar.tsx bg
  const BORDER_COLOR = isDark ? '#1a1f2e' : '#e2e8f0';  // Sidebar.tsx border
  const TEXT_PRIMARY = isDark ? '#ffffff' : '#1a1f2e';  // MainLayout.tsx color
  const TEXT_SUB     = isDark ? '#8b92a7' : '#64748b';  // Sidebar.tsx icon
  const HOVER_BG     = isDark ? '#1a1f2e' : '#f1f5f9';  // Sidebar.tsx hover
  const ACTIVE_BORDER = '#667eea';                       // Sidebar active gradient start

  const c = {
    sidebarBg:       SIDEBAR_BG,
    sidebarBorder:   BORDER_COLOR,
    searchBg:        HOVER_BG,
    itemHover:       HOVER_BG,
    itemActive:      isDark ? '#1a2744' : '#ede9fe',
    itemActiveBorder: ACTIVE_BORDER,
    nameColor:       TEXT_PRIMARY,
    subColor:        TEXT_SUB,
    timeColor:       TEXT_SUB,
    divider:         BORDER_COLOR,
    chatBg:          isDark ? '#0d1117' : '#f0f4ff',
    headerBg:        SIDEBAR_BG,
    headerBorder:    BORDER_COLOR,
    bubbleOut:       isDark ? '#1a2744' : '#ddd6fe',
    bubbleIn:        isDark ? '#161c27' : '#ffffff',
    bubbleInBorder:  BORDER_COLOR,
    textOut:         TEXT_PRIMARY,
    textIn:          TEXT_PRIMARY,
    inputAreaBg:     SIDEBAR_BG,
    inputAreaBorder: BORDER_COLOR,
    inputFieldBg:    HOVER_BG,
    inputText:       TEXT_PRIMARY,
    sendActive:      '#667eea',
    online:          '#22c55e',
    iconColor:       TEXT_SUB,
    emptyText:       TEXT_SUB,
    emptyCardBg:     SIDEBAR_BG,
    iconBtnHover:    HOVER_BG,
  };

  // ── Battery & network ─────────────────────────────────────────────────
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [batteryLevel, setBatteryLevel] = useState<number>(100);
  const [isCharging, setIsCharging] = useState<boolean>(false);

  useEffect(() => {
    const onOnline  = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    let battery: any;
    const upd = (bat: any) => { setBatteryLevel(Math.round(bat.level*100)); setIsCharging(bat.charging); };
    if ((navigator as any).getBattery) {
      (navigator as any).getBattery().then((bat: any) => {
        battery = bat; upd(battery);
        battery.addEventListener('levelchange',    () => upd(battery));
        battery.addEventListener('chargingchange', () => upd(battery));
      });
    }
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const batteryColor = isCharging ? '#22c55e' : batteryLevel > 50 ? '#22c55e' : batteryLevel > 20 ? '#eab308' : '#ef4444';
  const BatteryIcon = () => {
    const sz = isMobile ? 18 : 23;
    if (isCharging)        return <BatteryCharging size={sz} strokeWidth={2.5}/>;
    if (batteryLevel > 80) return <BatteryFull     size={sz} strokeWidth={2.5}/>;
    if (batteryLevel > 20) return <BatteryMedium   size={sz} strokeWidth={2.5}/>;
    return <BatteryLow size={sz} strokeWidth={2.5}/>;
  };

  // ── Chat state ────────────────────────────────────────────────────────
  const [histories,setHistories] = useState<Record<ModelId,Message[]>>(()=>{
    try{return JSON.parse(localStorage.getItem('chat_histories')||'{}');}catch{return {} as any;}
  });
  const [activeId, setActiveId] = useState<ModelId|null>(null);
  const [input,    setInput]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [search,   setSearch]   = useState('');
  const [showMenu, setShowMenu] = useState(false);

  const bottomRef   = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isFirstRef  = useRef(true);

  const activeChat = CHATS.find(ch=>ch.id===activeId);
  const messages   = activeId ? (histories[activeId]??[]) : [];

  const showChatList    = !sidebarOpen;
  const CHAT_LIST_WIDTH = 300;

  useEffect(()=>{localStorage.setItem('chat_histories',JSON.stringify(histories));},[histories]);
  useEffect(()=>{if(!isFirstRef.current) bottomRef.current?.scrollIntoView({behavior:'smooth'});isFirstRef.current=false;},[messages,loading]);
  useEffect(()=>{isFirstRef.current=true;},[activeId]);

  // ── Send ──────────────────────────────────────────────────────────────
  const send = async (override?: string) => {
    if(!activeId) return;
    const text=(override??input).trim();
    if(!text||loading) return;
    const userMsg:Message={role:'user',content:text,timestamp:new Date().toISOString()};
    const prev=histories[activeId]??[];
    const next=[...prev,userMsg];
    setHistories(h=>({...h,[activeId]:next}));
    setInput('');
    if(textareaRef.current) textareaRef.current.style.height='auto';
    setLoading(true);
    try {
      const raw=await callModel(activeId,next);
      setHistories(h=>({...h,[activeId]:[...next,{role:'ai',content:cleanMd(raw)||'Javob olinmadi.',timestamp:new Date().toISOString(),modelName:activeId}]}));
    } catch(err:any) {
      setHistories(h=>({...h,[activeId]:[...next,{role:'ai',content:'',isError:true,errorCode:err?.status,timestamp:new Date().toISOString()}]}));
    } finally { setLoading(false); }
  };

  const retry=(idx:number)=>{
    if(!activeId) return;
    const prev=messages.slice(0,idx);
    const lastUser=[...prev].reverse().find(m=>m.role==='user');
    if(!lastUser) return;
    setHistories(h=>({...h,[activeId]:prev}));
    send(lastUser.content);
  };
  const clearChat=()=>{if(!activeId||!confirm("Bu chatni tozalashni xohlaysizmi?")) return;setHistories(h=>({...h,[activeId]:[]}));};
  const onKey=(e:React.KeyboardEvent<HTMLTextAreaElement>)=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}};
  const onInput=(e:React.ChangeEvent<HTMLTextAreaElement>)=>{setInput(e.target.value);e.target.style.height='auto';e.target.style.height=Math.min(e.target.scrollHeight,140)+'px';};

  const Btn=({onClick,title,children}:{onClick:()=>void;title:string;children:React.ReactNode})=>(
    <button onClick={onClick} title={title}
      style={{background:'none',border:'none',cursor:'pointer',color:c.iconColor,padding:7,borderRadius:8,display:'flex',alignItems:'center',transition:'.15s'}}
      onMouseEnter={e=>{e.currentTarget.style.background=c.iconBtnHover;e.currentTarget.style.color=TEXT_PRIMARY;}}
      onMouseLeave={e=>{e.currentTarget.style.background='none';e.currentTarget.style.color=c.iconColor;}}>
      {children}
    </button>
  );

  const filteredChats = CHATS.filter(ch=>ch.name.toLowerCase().includes(search.toLowerCase()));
  const mainSidebarWidth = isMobile ? 0 : (sidebarOpen ? 280 : 80);

  // ══════════════════════════════════════════════════════════════════════
  return (
    <div style={{
      background: MAIN_BG,       // ← MainLayout.tsx bilan bir xil
      minHeight: '100vh',
      margin: -8,
      color: TEXT_PRIMARY,       // ← MainLayout.tsx bilan bir xil
      transition: 'all 0.3s ease',
      overflowX: 'hidden',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
    }}>

      {/* Asosiy Sidebar */}
      <Sidebar theme={theme} isOpen={sidebarOpen} setIsOpen={setSidebarOpen}/>

      {/* Chat ro'yxati — Sidebar yopiq bo'lganda fixed chap panel */}
      {!isMobile && (
        <div style={{
          position: 'fixed',
          left: mainSidebarWidth,
          top: 0,
          width: showChatList ? CHAT_LIST_WIDTH : 0,
          height: '100vh',
          overflow: 'hidden',
          background: SIDEBAR_BG,          // ← Sidebar.tsx bilan bir xil
          borderRight: showChatList ? `1px solid ${BORDER_COLOR}` : 'none',
          display: 'flex',
          flexDirection: 'column',
          transition: 'width 0.25s ease, left 0.3s ease',
          zIndex: 50,
        }}>
          <div style={{
            padding: '28px 12px 12px',
            borderBottom: `1px solid ${BORDER_COLOR}`,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            flexShrink: 0,
          }}>
            
            <div style={{flex:1,display:'flex',alignItems:'center',gap:7,background:c.searchBg,borderRadius:18,padding:'7px 12px'}}>
              <Search size={14} color={TEXT_SUB}/>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Qidirish..."
                style={{flex:1,background:'none',border:'none',outline:'none',color:TEXT_PRIMARY,fontSize:13,fontFamily:'inherit'}}/>
            </div>
          </div>

          <div style={{flex:1,overflowY:'auto',paddingTop:8}}>
            {filteredChats.map(chat=>{
              const chatMsgs=histories[chat.id]??[];
              const last=chatMsgs[chatMsgs.length-1];
              const lastText=last?.content||chat.lastMsg;
              const lastTime=last?.timestamp?fmtTime(last.timestamp):'';
              const isActive=activeId===chat.id;
              return (
                <div key={chat.id} onClick={()=>{setActiveId(chat.id);setShowMenu(false);}}
                  style={{
                    display:'flex',alignItems:'center',gap:12,
                    padding:'12px 15px',
                    background: isActive ? c.itemActive : 'transparent',
                    borderLeft: `3px solid ${isActive ? c.itemActiveBorder : 'transparent'}`,
                    borderRadius: 12,
                    margin: '2px 8px',
                    cursor:'pointer',
                    transition:'.15s',
                  }}
                  onMouseEnter={e=>{if(!isActive)e.currentTarget.style.background=HOVER_BG;}}
                  onMouseLeave={e=>{e.currentTarget.style.background=isActive?c.itemActive:'transparent';}}>
                  <div style={{position:'relative',flexShrink:0}}>
                    <div style={{width:44,height:44,borderRadius:'50%',
                      background:`linear-gradient(135deg,${chat.color}33,${chat.color}66)`,
                      border:`2px solid ${chat.color}44`,
                      display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>
                      {chat.avatar}
                    </div>
                    <div style={{position:'absolute',bottom:1,right:1,width:10,height:10,borderRadius:'50%',
                      background:c.online,border:`2px solid ${SIDEBAR_BG}`}}/>
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:2}}>
                      <span style={{fontWeight:600,fontSize:14,color:TEXT_PRIMARY,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                        {chat.name}
                      </span>
                      <span style={{fontSize:11,color:TEXT_SUB,flexShrink:0,marginLeft:4}}>{lastTime}</span>
                    </div>
                    <div style={{fontSize:12,color:TEXT_SUB,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                      {lastText.length>36?lastText.slice(0,36)+'…':lastText}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Asosiy kontent */}
      <main style={{
        marginLeft: isMobile ? 0 : (sidebarOpen ? 280 : (80 + (showChatList ? CHAT_LIST_WIDTH : 0))),
        padding: isMobile ? '15px' : '30px',
        transition: 'margin-left 0.3s ease',
        minHeight: '100vh',
        boxSizing: 'border-box' as const,
      }}>

        {/* Header — MainLayout.tsx bilan bir xil tuzilma */}
        <header style={{
          display:'flex',
          justifyContent:'space-between',
          alignItems:'center',
          marginBottom:32,
          gap: isMobile ? 12 : 16,
          width:'100%',
          paddingLeft: isMobile && !sidebarOpen ? '48px' : '0px',
          transition:'padding-left 0.3s ease',
        }}>
          <div style={{display:'flex',alignItems:'center',minWidth:0,flexShrink:1}}>
            {isMobile && (
              <Btn title="Chatlar" onClick={()=>setSidebarOpen(v=>!v)}>
                <PanelRightClose size={20}/>
              </Btn>
            )}
            <h1 style={{
              fontSize: isMobile?'22px':'42px',
              fontWeight:700,
              background:'linear-gradient(90deg,#3b82f6,#8b5cf6)',
              WebkitBackgroundClip:'text',
              WebkitTextFillColor:'transparent',
              margin:0,
              whiteSpace:'nowrap',
              overflow:'hidden',
              textOverflow:'ellipsis',
              lineHeight: isMobile?'1.2':'normal',
            }}>
              Chat Xabarlar
            </h1>
          </div>

          <div style={{display:'flex',gap:isMobile?'8px':'16px',alignItems:'center',flexShrink:0}}>
            {/* Batareya */}
            <div style={{
              display:'flex',alignItems:'center',
              padding:isMobile?'5px 10px':'10px',
              borderRadius:'50px',
              background:isDark?'rgba(255,255,255,0.05)':'rgba(0,0,0,0.05)',
              color:batteryColor,
              gap:isMobile?'4px':'8px',
              fontWeight:'bold',
              fontSize:isMobile?'12px':'14px',
            }}>
              <BatteryIcon/>
              <span>{batteryLevel}%</span>
            </div>
            {/* Network */}
            <div style={{
              display:'flex',
              padding:isMobile?'7px':'10px',
              borderRadius:'50px',
              background:isOnline?'rgba(34,197,94,0.1)':'rgba(239,68,68,0.1)',
              color:isOnline?'#22c55e':'#ef4444',
            }}>
              {isOnline?<Wifi size={isMobile?18:23} strokeWidth={2.5}/>:<WifiOff size={isMobile?18:23} strokeWidth={2.5}/>}
            </div>
            <Notification theme={theme}/>
            {/* Avatar */}
            <div style={{
              width:isMobile?36:44,height:isMobile?36:44,
              borderRadius:'50%',
              background:'linear-gradient(135deg, #667eea, #764ba2)',
              display:'flex',alignItems:'center',justifyContent:'center',
              cursor:isMobile?'default':'pointer',
              overflow:'hidden',
              border:`2px solid ${BORDER_COLOR}`,
              flexShrink:0,
              opacity:isMobile?0:1,
              visibility:isMobile?'hidden':'visible',
              pointerEvents:isMobile?'none':'auto',
              transition:'all 0.3s ease',
            }}>
              {userImage
                ?<img src={userImage} alt="User" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                :<User size={isMobile?18:20} color="#fff"/>}
            </div>
          </div>
        </header>

        {/* Chat panel */}
        <div style={{
          display:'flex',
          height:'calc(100vh - 130px)',
          overflow:'hidden',
          borderRadius:16,
          border:`1px solid ${BORDER_COLOR}`,
          background:c.chatBg,
          fontSize:14,
          boxShadow:isDark?'0 4px 24px rgba(0,0,0,0.4)':'0 4px 24px rgba(0,0,0,0.06)',
        }}>

          {/* Mobile chat list overlay */}
          {isMobile && (
            <div style={{
              position:'fixed',
              left: sidebarOpen ? 280 : 0,
              top:0,
              width: sidebarOpen ? 0 : '80vw',
              maxWidth:300,
              height:'100vh',
              overflow:'hidden',
              background:SIDEBAR_BG,
              borderRight:`1px solid ${BORDER_COLOR}`,
              display:'flex',flexDirection:'column',
              transition:'width 0.25s ease, left 0.3s ease',
              zIndex:50,
            }}>
              <div style={{padding:'16px 12px 10px',borderBottom:`1px solid ${BORDER_COLOR}`,display:'flex',alignItems:'center',gap:6,flexShrink:0}}>
                <Btn title="Yopish" onClick={()=>setSidebarOpen(false)}><PanelRightClose size={18}/></Btn>
                <div style={{flex:1,display:'flex',alignItems:'center',gap:7,background:HOVER_BG,borderRadius:18,padding:'7px 12px'}}>
                  <Search size={14} color={TEXT_SUB}/>
                  <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Qidirish..."
                    style={{flex:1,background:'none',border:'none',outline:'none',color:TEXT_PRIMARY,fontSize:13,fontFamily:'inherit'}}/>
                </div>
              </div>
              <div style={{flex:1,overflowY:'auto',paddingTop:8}}>
                {filteredChats.map(chat=>{
                  const chatMsgs=histories[chat.id]??[];
                  const last=chatMsgs[chatMsgs.length-1];
                  const lastText=last?.content||chat.lastMsg;
                  const isActive=activeId===chat.id;
                  return (
                    <div key={chat.id} onClick={()=>{setActiveId(chat.id);setSidebarOpen(false);}}
                      style={{display:'flex',alignItems:'center',gap:12,padding:'12px 15px',
                        background:isActive?c.itemActive:'transparent',
                        borderLeft:`3px solid ${isActive?c.itemActiveBorder:'transparent'}`,
                        borderRadius:12,margin:'2px 8px',cursor:'pointer',transition:'.15s'}}
                      onMouseEnter={e=>{if(!isActive)e.currentTarget.style.background=HOVER_BG;}}
                      onMouseLeave={e=>{e.currentTarget.style.background=isActive?c.itemActive:'transparent';}}>
                      <div style={{position:'relative',flexShrink:0}}>
                        <div style={{width:44,height:44,borderRadius:'50%',background:`linear-gradient(135deg,${chat.color}33,${chat.color}66)`,border:`2px solid ${chat.color}44`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>{chat.avatar}</div>
                        <div style={{position:'absolute',bottom:1,right:1,width:10,height:10,borderRadius:'50%',background:c.online,border:`2px solid ${SIDEBAR_BG}`}}/>
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <span style={{fontWeight:600,fontSize:14,color:TEXT_PRIMARY}}>{chat.name}</span>
                        <div style={{fontSize:12,color:TEXT_SUB,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{lastText.length>36?lastText.slice(0,36)+'…':lastText}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Chat maydoni */}
          <div style={{flex:1,display:'flex',flexDirection:'column',minWidth:0}}>
            {activeChat ? (
              <>
                {/* Chat header */}
                <div style={{height:56,flexShrink:0,background:SIDEBAR_BG,borderBottom:`1px solid ${BORDER_COLOR}`,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 14px'}}>
                  <div style={{display:'flex',alignItems:'center',gap:10}}>
                    {isMobile && (
                      <Btn title="Chatlar" onClick={()=>setSidebarOpen(false)}>
                        <PanelRightClose size={18}/>
                      </Btn>
                    )}
                    <div style={{width:38,height:38,borderRadius:'50%',
                      background:`linear-gradient(135deg,${activeChat.color}33,${activeChat.color}66)`,
                      border:`2px solid ${activeChat.color}44`,
                      display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>
                      {activeChat.avatar}
                    </div>
                    <div>
                      <div style={{fontWeight:600,fontSize:14,color:TEXT_PRIMARY}}>{activeChat.name}</div>
                      <div style={{fontSize:11,color:c.online}}>online</div>
                    </div>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:2}}>
                    <Btn title="Qidirish"   onClick={()=>{}}><Search size={17}/></Btn>
                    <Btn title="Qo'ng'iroq" onClick={()=>{}}><Phone  size={17}/></Btn>
                    <Btn title="Video"      onClick={()=>{}}><Video  size={17}/></Btn>
                    <div style={{position:'relative'}}>
                      <Btn title="Ko'proq" onClick={()=>setShowMenu(v=>!v)}><MoreVertical size={17}/></Btn>
                      {showMenu&&(
                        <div style={{position:'absolute',top:40,right:0,zIndex:100,
                          background:SIDEBAR_BG,border:`1px solid ${BORDER_COLOR}`,
                          borderRadius:12,overflow:'hidden',
                          boxShadow:`0 8px 32px ${isDark?'rgba(0,0,0,0.5)':'rgba(0,0,0,0.12)'}`,
                          minWidth:180}}>
                          <div onClick={()=>{clearChat();setShowMenu(false);}}
                            style={{padding:'12px 16px',cursor:'pointer',color:'#ef4444',display:'flex',alignItems:'center',gap:10,transition:'.12s',fontSize:14}}
                            onMouseEnter={e=>e.currentTarget.style.background=HOVER_BG}
                            onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                            <Trash2 size={15}/> Chatni tozalash
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Xabarlar */}
                <div onClick={()=>setShowMenu(false)}
                  style={{flex:1,overflowY:'auto',background:c.chatBg,padding:'12px 0',display:'flex',flexDirection:'column'}}>
                  {messages.length===0&&(
                    <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center'}}>
                      <div style={{background:SIDEBAR_BG,borderRadius:16,padding:'10px 22px',fontSize:13,color:TEXT_SUB,
                        border:`1px solid ${BORDER_COLOR}`,
                        boxShadow:`0 2px 8px ${isDark?'rgba(0,0,0,0.3)':'rgba(0,0,0,0.08)'}`}}>
                        Suhbatni boshlang
                      </div>
                    </div>
                  )}
                  <div style={{display:'flex',flexDirection:'column',gap:2,padding:'0 40px'}}>
                    {messages.map((msg,i)=>{
                      const isUser=msg.role==='user';
                      const isGF=i===0||messages[i-1].role!==msg.role;
                      return (
                        <div key={i} style={{display:'flex',justifyContent:isUser?'flex-end':'flex-start',marginTop:isGF&&i>0?8:1,animation:'fadeUp .15s ease'}}>
                          {msg.isError?(
                            <div style={{maxWidth:'68%',background:isDark?'#2d1515':'#fef2f2',
                              border:`1px solid ${isDark?'#7f1d1d40':'#fecaca'}`,
                              borderRadius:'12px 12px 12px 3px',padding:'10px 14px'}}>
                              <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:4}}>
                                <AlertCircle size={13} color="#ef4444"/>
                                <span style={{fontSize:12,fontWeight:700,color:'#ef4444'}}>{getError(msg.errorCode).title}</span>
                              </div>
                              <p style={{fontSize:12,color:isDark?'#fca5a5':'#b91c1c',margin:'0 0 8px',lineHeight:1.5}}>
                                {getError(msg.errorCode).desc}
                              </p>
                              <button onClick={()=>retry(i)} disabled={loading}
                                style={{display:'flex',alignItems:'center',gap:4,background:'none',border:'1px solid #ef444450',color:'#ef4444',padding:'4px 10px',borderRadius:8,fontSize:12,fontWeight:600,cursor:'pointer'}}>
                                <RefreshCw size={10}/> Qayta urinish
                              </button>
                            </div>
                          ):(
                            <div style={{
                              maxWidth:'68%',
                              background:isUser?c.bubbleOut:c.bubbleIn,
                              border:isUser?'none':`1px solid ${c.bubbleInBorder}`,
                              borderRadius:isUser
                                ?(isGF?'16px 16px 4px 16px':'16px 4px 4px 16px')
                                :(isGF?'4px 16px 16px 16px':'4px 16px 16px 16px'),
                              padding:'8px 12px 6px',
                              boxShadow:`0 1px 3px ${isDark?'rgba(0,0,0,0.3)':'rgba(0,0,0,0.06)'}`,
                            }}>
                              {!isUser&&isGF&&(
                                <div style={{fontSize:11,fontWeight:700,color:activeChat.color,marginBottom:3}}>
                                  {activeChat.name}
                                </div>
                              )}
                              <div style={{color:TEXT_PRIMARY,lineHeight:1.6,whiteSpace:'pre-wrap',wordBreak:'break-word',fontSize:14}}>
                                {msg.content}
                              </div>
                              <div style={{display:'flex',justifyContent:'flex-end',alignItems:'center',gap:3,marginTop:3}}>
                                <span style={{fontSize:10,color:TEXT_SUB}}>{fmtTime(msg.timestamp)}</span>
                                {isUser&&(
                                  <svg width="15" height="10" viewBox="0 0 15 10" fill="none">
                                    <path d="M1 5L4.5 8.5L9 2" stroke="#667eea" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                                    <path d="M5.5 5L9 8.5L13.5 2" stroke="#667eea" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {loading&&(
                      <div style={{display:'flex',justifyContent:'flex-start',marginTop:4}}>
                        <div style={{background:c.bubbleIn,border:`1px solid ${BORDER_COLOR}`,
                          borderRadius:'4px 16px 16px 16px',padding:'10px 16px',
                          boxShadow:`0 1px 3px ${isDark?'rgba(0,0,0,0.3)':'rgba(0,0,0,0.06)'}`}}>
                          <div style={{display:'flex',gap:5,alignItems:'center',height:14}}>
                            {[0,0.22,0.44].map((d,i)=>(
                              <span key={i} style={{display:'block',width:6,height:6,borderRadius:'50%',background:TEXT_SUB,animation:`dot 1.2s ${d}s ease-in-out infinite`}}/>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div ref={bottomRef} style={{height:6}}/>
                </div>

                {/* Input */}
                <div style={{flexShrink:0,background:SIDEBAR_BG,borderTop:`1px solid ${BORDER_COLOR}`,padding:'10px 14px',display:'flex',alignItems:'flex-end',gap:10}}>
                  <div style={{flex:1,background:HOVER_BG,borderRadius:22,padding:'10px 16px',display:'flex',alignItems:'flex-end'}}>
                    <textarea ref={textareaRef} rows={1} value={input} onChange={onInput} onKeyDown={onKey} placeholder="Xabar yozing..."
                      style={{flex:1,background:'none',border:'none',outline:'none',resize:'none',fontFamily:'inherit',fontSize:14,lineHeight:1.5,color:TEXT_PRIMARY,maxHeight:120,overflow:'auto'}}/>
                  </div>
                  <button onClick={()=>send()} disabled={loading||!input.trim()}
                    style={{
                      width:44,height:44,borderRadius:'50%',flexShrink:0,
                      background: input.trim()&&!loading
                        ? 'linear-gradient(135deg,#667eea,#764ba2)'
                        : HOVER_BG,
                      border:'none',
                      cursor: input.trim()&&!loading?'pointer':'default',
                      display:'flex',alignItems:'center',justifyContent:'center',
                      color: input.trim()&&!loading?'#fff':TEXT_SUB,
                      transition:'all .2s',
                      boxShadow: input.trim()&&!loading?'0 4px 12px rgba(102,126,234,0.4)':'none',
                    }}>
                    {loading
                      ?<div style={{width:18,height:18,border:`2px solid ${TEXT_SUB}`,borderTopColor:'transparent',borderRadius:'50%',animation:'spin .8s linear infinite'}}/>
                      :<Send size={16} style={{transform:'translateX(1px)'}}/>}
                  </button>
                </div>
              </>
            ) : (
              /* Hech narsa tanlanmagan */
              <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:c.chatBg,color:TEXT_SUB}}>
                <div style={{
                  width:72,height:72,borderRadius:'50%',
                  background:HOVER_BG,
                  display:'flex',alignItems:'center',justifyContent:'center',fontSize:32,marginBottom:18,
                  boxShadow:`0 4px 16px ${isDark?'rgba(0,0,0,0.3)':'rgba(102,126,234,0.12)'}`,
                }}>
                  💬
                </div>
                <div style={{fontSize:20,fontWeight:600,color:TEXT_PRIMARY,marginBottom:10}}>ShoxAI Chat</div>
                <div style={{
                  background:SIDEBAR_BG,
                  borderRadius:14,padding:'10px 22px',fontSize:13,color:TEXT_SUB,
                  border:`1px solid ${BORDER_COLOR}`,
                  boxShadow:`0 2px 8px ${isDark?'rgba(0,0,0,0.3)':'rgba(0,0,0,0.06)'}`,
                }}>
                  Chatni tanlang va xabar yozing
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:translateY(0);}}
        @keyframes dot{0%,100%{transform:translateY(0);opacity:.35;}50%{transform:translateY(-5px);opacity:1;}}
        @keyframes spin{to{transform:rotate(360deg);}}
        *::-webkit-scrollbar{width:4px;}
        *::-webkit-scrollbar-thumb{background:${BORDER_COLOR};border-radius:4px;}
        *::-webkit-scrollbar-track{background:transparent;}
        textarea{scrollbar-width:none;}
        textarea::-webkit-scrollbar{display:none;}
      `}</style>
    </div>
  );
}