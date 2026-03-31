import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageSquare, Search, MoreVertical, Paperclip, Smile, PanelLeftClose, PanelLeftOpen, X, ChevronLeft } from 'lucide-react';
import MainLayout from "../components/MainLayout";
import { getSessionLogin, getSessionUserImage } from "../utils/clientSession";
import { useResponsive } from "../hooks/useResponsive";
import { api } from "../utils/api";
import { getSocket } from "../utils/socket";
import { toast } from 'sonner';
import { useTranslation } from "../components/languages/Chat";

const EMOJIS = ['😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇','🙂','🙃','😉','😌','😍','🥰','😘','😗','😙','😚','😋','😛','😝','😜','🤪','🤨','🧐','🤓','😎','🤩','🥳','😏','😒','😞','😔','😟','😕','🙁','☹️','😣','😖','😫','😩','🥺','😢','😭','😤','😠','😡','🤬','🤯','😳','🥵','🥶','😱','😨','😰','😥','😓','🤗','🤔','🤭','🤫','🤥','😶','😐','😑','😬','🙄','😯','😦','😧','😮','😲','🥱','😴','🤤','😪','😵','🤐','🥴','🤢','🤮','🤧','😷','🤒','🤕','🤑','🤠','😈','👿','👹','👺','🤡','💩','👻','💀','☠️','👽','👾','🤖','🎃'];

interface ChatUser {
  login: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  role: string;
  lastMessage?: string;
  unreadCount?: number;
  isSecret?: boolean;
  avatarUrl?: string;
  uniqueChatId?: string;
}

interface Message {
  sender: string;
  content: string;
  timestamp: string | Date;
  isEdited?: boolean;
}

export default function Chat() {
  const login     = getSessionLogin();
  const [userImage] = useState<string|null>(localStorage.getItem('userImage'));
  const { t } = useTranslation();

  // ✅ 1-FIX: useResponsive hook — MainLayout bilan bir xil manba
  const { isMobile } = useResponsive();

  // ✅ 2-FIX: theme localStorage dan o'qiladi — Ai.tsx kabi
  const [theme] = useState<'dark' | 'light'>(
    () => (localStorage.getItem('theme') as 'dark' | 'light') || 'dark'
  );

  const [users,           setUsers]           = useState<ChatUser[]>([]);
  const [selectedUser,    setSelectedUser]    = useState<ChatUser | null>(null);
  const [messages,        setMessages]        = useState<Message[]>([]);
  const [newMessage,      setNewMessage]      = useState('');
  const [searchQuery,     setSearchQuery]     = useState('');
  const [loading,         setLoading]         = useState(false);
  const [onlineUsers,     setOnlineUsers]     = useState<string[]>([]);
  const [editingMessage,  setEditingMessage]  = useState<Message | null>(null);
  const [chatSidebarOpen, setChatSidebarOpen] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMenu,        setShowMenu]        = useState(false);
  const [isSecret,        setIsSecret]        = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const menuRef        = useRef<HTMLDivElement>(null);
  const socket         = getSocket();

  // ✅ isMobile uchun alohida useEffect va window.addEventListener kerak emas — useResponsive ichida bor

  const addEmoji = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) setShowEmojiPicker(false);
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await api('/api/chat/users');
        if (res.ok) {
          const data = await res.json();
          setUsers(data);
          const admin = data.find((u: any) => u.role === 'admin' && u.login !== login);
          const me    = data.find((u: any) => u.login === login);
          if (me) setIsSecret(!!me.isSecret);
          if (!selectedUser && admin && !isMobile) setSelectedUser(admin);
        }
      } catch (err) { console.error(t('errorLoadingUsers'), err); }
    };
    fetchUsers();
  }, [login, isMobile]);

  useEffect(() => {
    if (!socket) return;
    socket.emit('getOnlineUsers');
    socket.on('onlineUsersList', (logins: string[]) => setOnlineUsers(logins));
    socket.on('userStatusChange', ({ login: l, status }: { login: string; status: 'online' | 'offline' }) => {
      setOnlineUsers(prev => status === 'online' ? (prev.includes(l) ? prev : [...prev, l]) : prev.filter(x => x !== l));
    });
    return () => { socket.off('onlineUsersList'); socket.off('userStatusChange'); };
  }, [socket]);

  useEffect(() => {
    if (!selectedUser) return;
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const res = await api(`/api/chat/history/${selectedUser.login}`);
        if (res.ok) setMessages(await res.json());
      } catch (err) { console.error(t('errorLoadingHistory'), err); }
      finally { setLoading(false); }
    };
    fetchHistory();
  }, [selectedUser]);

  useEffect(() => {
    if (!socket) return;
    const handleMessage = (msg: Message) => {
      setMessages(prev => {
        const isDuplicate = prev.some(m => m.sender === msg.sender && new Date(m.timestamp).getTime() === new Date(msg.timestamp).getTime());
        if (isDuplicate) return prev;
        if (msg.sender === selectedUser?.login || msg.sender === login) return [...prev, msg];
        return prev;
      });
      setUsers(prev => prev.map(u => {
        if (u.login === msg.sender) return { ...u, lastMessage: msg.content, unreadCount: u.login === selectedUser?.login ? 0 : (u.unreadCount || 0) + 1 };
        if (msg.sender === login && u.login === selectedUser?.login) return { ...u, lastMessage: msg.content };
        return u;
      }));
    };
    socket.on('privateMessage', handleMessage);
    const handleEdited = ({ sender, timestamp, newContent }: any) => {
      setMessages(prev => prev.map(m => (m.sender === sender && new Date(m.timestamp).getTime() === new Date(timestamp).getTime()) ? { ...m, content: newContent, isEdited: true } : m));
      setUsers(prev => prev.map(u => u.login === sender ? { ...u, lastMessage: newContent } : u));
    };
    socket.on('messageEdited', handleEdited);
    return () => { socket.off('privateMessage', handleMessage); socket.off('messageEdited', handleEdited); };
  }, [socket, selectedUser?.login, login]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSendMessage = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newMessage.trim() || !selectedUser || !socket) return;
    if (editingMessage) {
      socket.emit('editMessage', { receiver: selectedUser.login, timestamp: editingMessage.timestamp, newContent: newMessage.trim() });
      setMessages(prev => prev.map(m => (m.sender === login && new Date(m.timestamp).getTime() === new Date(editingMessage.timestamp).getTime()) ? { ...m, content: newMessage.trim(), isEdited: true } : m));
      setEditingMessage(null);
    } else {
      socket.emit('privateMessage', { receiver: selectedUser.login, content: newMessage.trim() });
      setMessages(prev => [...prev, { sender: login!, content: newMessage.trim(), timestamp: new Date() }]);
    }
    setNewMessage('');
  };

  const deleteHistory = async () => {
    if (!selectedUser || !window.confirm(t('confirmDeleteChatHistory'))) return;
    try {
      const res = await api('/api/chat/delete-history', { method: 'POST', body: JSON.stringify({ withUser: selectedUser.login }) });
      if (res.ok) { setMessages([]); setShowMenu(false); }
    } catch (err) { console.error(t('errorDeletingHistory'), err); }
  };

  const toggleSecret = async () => {
    try {
      const res = await api('/api/chat/toggle-secret', { method: 'POST' });
      if (res.ok) { setIsSecret((await res.json()).isSecret); setShowMenu(false); }
    } catch (err) { console.error(t('secretToggleError'), err); }
  };

  const filteredUsers = users
    .filter(u => u.login !== login)
    .filter(u => (u.name || u.login || '').toLowerCase().includes(searchQuery.toLowerCase()) || u.uniqueChatId === searchQuery);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const existing = users.find(u => u.uniqueChatId === searchQuery || u.login === searchQuery);
    if (existing) { setSelectedUser(existing); return; }
    try {
      const res = await api(`/api/users/search?query=${searchQuery}&searcherLogin=${login}`);
      if (res.ok) {
        const foundUsers = await res.json();
        if (foundUsers.length > 0) {
          setUsers(prev => {
            const newOnes = foundUsers.filter((f: any) => !prev.some(p => p.login === f.login));
            return [...newOnes, ...prev];
          });
          setSelectedUser(foundUsers[0]);
        } else {
          toast.error(t('userNotFound'));
        }
      }
    } catch (err) { console.error("Search error:", err); }
  };

  const sidebarW = isMobile ? (selectedUser ? '0px' : '100%') : (chatSidebarOpen ? '320px' : '80px');

  // ✅ 3-FIX: theme asosida rang o'zgaruvchilari
  const isDark    = theme === 'dark';
  const chatWrap  = isDark ? '#091020' : '#f0f4ff';
  const sidebarBg = isDark ? '#161d2f' : '#ffffff';
  const borderClr = isDark ? '#1e293b' : '#e2e8f0';
  const chatAreaB = isDark ? '#091020' : '#f8fafc';
  const inputBg   = isDark ? '#1e293b' : '#f1f5f9';
  const inputHdr  = isDark ? '#161d2f' : '#ffffff';
  const textMain  = isDark ? '#ffffff' : '#1a1f2e';
  const textSub   = isDark ? '#64748b' : '#94a3b8';
  const msgOther  = isDark ? '#1e293b' : '#e2e8f0';

  return (
    // ✅ 4-FIX: theme="dark" o'rniga theme={theme}
    <MainLayout theme={theme} userImage={userImage} title={t('messages')}>
      <div style={{
        display:      'flex',
        height:       'calc(100vh - 110px)',
        background:   chatWrap,
        borderRadius: '20px',
        overflow:     'hidden',
        border:       `1px solid ${borderClr}`,
        margin:       isMobile ? '0' : '0 10px',
      }}>

        {/* ===== SIDEBAR ===== */}
        <div style={{
          width:         sidebarW,
          minWidth:      sidebarW,
          maxWidth:      sidebarW,
          borderRight:   `1px solid ${borderClr}`,
          display:       'flex',
          flexDirection: 'column',
          background:    sidebarBg,
          transition:    'width 0.3s cubic-bezier(0.4,0,0.2,1), min-width 0.3s cubic-bezier(0.4,0,0.2,1), max-width 0.3s cubic-bezier(0.4,0,0.2,1)',
          flexShrink:    0,
          zIndex:        10,
          overflow:      'hidden',
        }}>

          <div style={{ flexShrink: 0, padding: '16px 12px 12px 16px' }}>
            <div style={{
              display:        'flex',
              alignItems:     'center',
              justifyContent: chatSidebarOpen || isMobile ? 'space-between' : 'center',
              marginBottom:   chatSidebarOpen || isMobile ? '12px' : '0',
            }}>
              {(chatSidebarOpen || isMobile) && (
                <div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: textMain, whiteSpace: 'nowrap' }}>{t('messages')}</div>
                  <div style={{ fontSize: '11px', color: '#6366f1', marginTop: '2px', whiteSpace: 'nowrap' }}>
                    {t('myId')} {users.find(u => u.login === login)?.uniqueChatId || '...'}
                  </div>
                </div>
              )}
              {!isMobile && (
                <button
                  onClick={() => setChatSidebarOpen(!chatSidebarOpen)}
                  style={{ background: 'none', border: 'none', color: textSub, cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', flexShrink: 0 }}
                >
                  {chatSidebarOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
                </button>
              )}
            </div>

            {(chatSidebarOpen || isMobile) && (
              <form onSubmit={handleSearch} style={{ position: 'relative' }}>
                <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: textSub }} size={16} />
                <input
                  type="text"
                  placeholder={t('searchById')}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '10px 10px 10px 38px', borderRadius: '10px', border: 'none', background: inputBg, color: textMain, fontSize: '14px', outline: 'none' }}
                />
              </form>
            )}
          </div>

          {/* User list */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 10px' }}>
            {filteredUsers.map(user => (
              <div
                key={user.login}
                onClick={() => {
                  setSelectedUser(user);
                  setUsers(prev => prev.map(u => u.login === user.login ? { ...u, unreadCount: 0 } : u));
                }}
                style={{
                  display:        'flex',
                  alignItems:     'center',
                  gap:            '12px',
                  padding:        '12px',
                  borderRadius:   '12px',
                  cursor:         'pointer',
                  background:     selectedUser?.login === user.login ? inputBg : 'transparent',
                  transition:     'background 0.2s',
                  marginBottom:   '2px',
                  justifyContent: (chatSidebarOpen || isMobile) ? 'flex-start' : 'center',
                }}
              >
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt="" style={{ width: '44px', height: '44px', borderRadius: '12px', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: user.role === 'admin' ? 'linear-gradient(135deg,#6366f1,#a855f7)' : 'linear-gradient(135deg,#10b981,#3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '16px' }}>
                      {user.role === 'admin' ? t('adminAvatarPlaceholder') : (user.firstName?.[0] || user.name?.[0] || user.login[0]).toUpperCase()}
                    </div>
                  )}
                  {onlineUsers.includes(user.login) && (
                    <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '12px', height: '12px', borderRadius: '50%', background: '#10b981', border: `2px solid ${sidebarBg}` }} />
                  )}
                </div>
                {(chatSidebarOpen || isMobile) && (
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, color: textMain, fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {user.role === 'admin' ? t('supportShoxPosPro') : (user.firstName ? `${user.firstName} ${user.lastName || ''}` : (user.name || user.login))}
                      </span>
                      {!!user.unreadCount && (
                        <span style={{ background: '#6366f1', color: '#fff', fontSize: '10px', padding: '2px 6px', borderRadius: '10px', fontWeight: 700, flexShrink: 0, marginLeft: '4px' }}>
                          {user.unreadCount}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '11px', color: isDark ? '#475569' : '#94a3b8', marginBottom: '2px' }}>ID: {user.uniqueChatId}</div>
                    <div style={{ fontSize: '12px', color: textSub, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {user.lastMessage || t('noMessage')}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ===== CHAT AREA ===== */}
        <div style={{
          flex:          1,
          display:       isMobile ? (selectedUser ? 'flex' : 'none') : 'flex',
          flexDirection: 'column',
          background:    chatAreaB,
          minWidth:      0,
          overflow:      'hidden',
        }}>
          {selectedUser ? (
            <>
              {/* Chat Header */}
              <div style={{ padding: '12px 20px', borderBottom: `1px solid ${borderClr}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: inputHdr, flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                  {isMobile && (
                    <button onClick={() => setSelectedUser(null)} style={{ background: 'none', border: 'none', color: textMain, cursor: 'pointer', padding: '5px', flexShrink: 0 }}>
                      <ChevronLeft size={24} />
                    </button>
                  )}
                  {selectedUser.avatarUrl ? (
                    <img src={selectedUser.avatarUrl} alt="" style={{ width: '40px', height: '40px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: selectedUser.role === 'admin' ? '#6366f1' : '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, flexShrink: 0 }}>
                      {selectedUser.role === 'admin' ? t('adminAvatarPlaceholder') : (selectedUser.firstName?.[0] || selectedUser.name?.[0] || selectedUser.login[0]).toUpperCase()}
                    </div>
                  )}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: textMain, fontSize: '15px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {selectedUser.role === 'admin' ? t('supportShoxPosPro') : (selectedUser.firstName ? `${selectedUser.firstName} ${selectedUser.lastName || ''}` : (selectedUser.name || selectedUser.login))}
                    </div>
                    <div style={{ fontSize: '11px', color: '#6366f1' }}>ID: {selectedUser.uniqueChatId}</div>
                    <div style={{ fontSize: '12px', color: onlineUsers.includes(selectedUser.login) ? '#10b981' : textSub }}>
                      {onlineUsers.includes(selectedUser.login) ? t('online') : t('offline')}
                    </div>
                  </div>
                </div>
                <div style={{ position: 'relative', flexShrink: 0 }} ref={menuRef}>
                  <button onClick={() => setShowMenu(!showMenu)} style={{ background: 'none', border: 'none', color: textSub, cursor: 'pointer', padding: '4px' }}>
                    <MoreVertical size={20} />
                  </button>
                  {showMenu && (
                    <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '8px', width: '180px', background: inputBg, borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.3)', border: `1px solid ${borderClr}`, zIndex: 100, overflow: 'hidden' }}>
                      <button onClick={toggleSecret} style={{ width: '100%', padding: '12px 16px', textAlign: 'left', background: 'none', border: 'none', color: textMain, cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: isSecret ? '#ef4444' : '#10b981', flexShrink: 0 }} />
                        {isSecret ? t('openProfile') : t('secretProfile')}
                      </button>
                      <button onClick={deleteHistory} style={{ width: '100%', padding: '12px 16px', textAlign: 'left', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <X size={14} /> Tarixni o'chirish
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {messages.map((msg, idx) => {
                  const isMe       = msg.sender === login;
                  const senderUser = isMe ? null : users.find(u => u.login === msg.sender);
                  return (
                    <div key={idx} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', gap: '8px', alignItems: 'flex-end' }}>
                      {!isMe && (
                        <div style={{ width: '28px', height: '28px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, background: inputBg }}>
                          {senderUser?.avatarUrl ? (
                            <img src={senderUser.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#fff', fontWeight: 700, background: senderUser?.role === 'admin' ? '#6366f1' : '#10b981' }}>
                              {(senderUser?.firstName?.[0] || senderUser?.login?.[0] || '?').toUpperCase()}
                            </div>
                          )}
                        </div>
                      )}
                      <div
                        onDoubleClick={() => { if (isMe) { setEditingMessage(msg); setNewMessage(msg.content); } }}
                        style={{ maxWidth: '75%', padding: '8px 12px', borderRadius: isMe ? '15px 15px 2px 15px' : '15px 15px 15px 2px', background: isMe ? '#6366f1' : msgOther, color: isMe ? '#fff' : textMain, boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}
                      >
                        <div style={{ fontSize: '14.5px', lineHeight: '1.4', wordBreak: 'break-word' }}>{msg.content}</div>
                        <div style={{ fontSize: '10px', marginTop: '4px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '4px', opacity: 0.6 }}>
                          {msg.isEdited && <i>{t('edited')}</i>}
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input area */}
              <div style={{ padding: '15px 20px', background: inputHdr, borderTop: `1px solid ${borderClr}`, flexShrink: 0 }}>
                {editingMessage && (
                  <div style={{ padding: '5px 10px', background: 'rgba(99,102,241,0.1)', borderRadius: '8px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: '#6366f1' }}>{t('editing')}</span>
                    <button onClick={() => { setEditingMessage(null); setNewMessage(''); }} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '11px', cursor: 'pointer' }}>{t('cancel')}</button>
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Paperclip size={20} style={{ color: textSub, cursor: 'pointer', flexShrink: 0 }} />
                  <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
                    <input
                      type="text"
                      placeholder={t('writeAMessage')}
                      value={newMessage}
                      onChange={e => setNewMessage(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                      style={{
                        width:        '100%',
                        boxSizing:    'border-box',
                        padding:      '11px 44px 11px 15px',
                        borderRadius: '12px',
                        border:       editingMessage ? '1px solid #6366f1' : 'none',
                        background:   inputBg,
                        color:        textMain,
                        outline:      'none',
                        fontSize:     '14px',
                      }}
                    />
                    <Smile
                      size={20}
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: textSub, cursor: 'pointer' }}
                    />
                    {showEmojiPicker && (
                      <div ref={emojiPickerRef} style={{ position: 'absolute', bottom: '55px', right: 0, width: '280px', height: '300px', background: inputBg, border: `1px solid ${borderClr}`, borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.3)', padding: '10px', zIndex: 1000, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '5px' }}>
                        {EMOJIS.map(e => (
                          <button key={e} onClick={() => addEmoji(e)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', padding: '4px' }}>{e}</button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={handleSendMessage}
                    style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#6366f1', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: textSub, gap: '15px' }}>
              <div style={{ width: '70px', height: '70px', borderRadius: '20px', background: inputBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MessageSquare size={35} color={textSub} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <h3 style={{ color: textMain, margin: '0 0 5px 0' }}>{t('startAConversation')}</h3>
                <p style={{ fontSize: '14px', margin: 0 }}>{t('selectUserToWriteMessage')}</p>
              </div>
            </div>
          )}
        </div>
      </div>
      <style>{`
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${borderClr}; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: #6366f1; }
      `}</style>
    </MainLayout>
  );
}