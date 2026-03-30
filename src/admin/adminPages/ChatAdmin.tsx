// src/adminPages/ChatAdmin.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  Send, MessageSquare, Search, Paperclip, Smile,
  PanelLeftClose, PanelLeftOpen,
} from 'lucide-react';
import AdminLayout from "../adminComponents/AdminLayout";
import { getSessionLogin } from "../../utils/clientSession";
import { api } from "../../utils/api";
import { getSocket } from "../../utils/socket";

const EMOJIS = ['😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇','🙂','🙃','😉','😌','😍','🥰','😘','😗','😙','😚','😋','😛','😝','😜','🤪','🤨','🧐','🤓','😎','🤩','🥳','😏','😒','😞','😔','😟','😕','🙁','☹️','😣','😖','😫','😩','🥺','😢','😭','😤','😠','😡','🤬','🤯','😳','🥵','🥶','😱','😨','😰','😥','😓','🤗','🤔','🤭','🤫','🤥','😶','😐','😑','😬','🙄','😯','😦','😧','😮','😲','🥱','😴','🤤','😪','😵','🤐','🥴','🤢','🤮','🤧','😷','🤒','🤕','🤑','🤠','😈','👿','👹','👺','🤡','💩','👻','💀','☠️','👽','👾','🤖','🎃'];

interface ChatUser {
  login: string;
  name?: string;
  role: string;
  lastMessage?: string;
  unreadCount?: number;
}

interface Message {
  sender: string;
  content: string;
  timestamp: string | Date;
  isEdited?: boolean;
}

export default function ChatAdmin() {
  const login = getSessionLogin();
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

  const messagesEndRef  = useRef<HTMLDivElement>(null);
  const emojiPickerRef  = useRef<HTMLDivElement>(null);
  const socket          = getSocket();

  const addEmoji = (emoji: string) => {
    setNewMessage((prev) => prev + emoji);
    setShowEmojiPicker(false);
  };

  // Close emoji picker on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await api('/api/chat/users');
        if (res.ok) {
          const data = await res.json();
          setUsers(data.filter((u: any) => u.login !== login));
        }
      } catch (err) { console.error("Users yuklashda xato:", err); }
    };
    fetchUsers();
  }, [login]);

  // Online users
  useEffect(() => {
    if (!socket) return;
    socket.emit('getOnlineUsers');
    socket.on('onlineUsersList', (logins: string[]) => setOnlineUsers(logins));
    socket.on('userStatusChange', ({ login: l, status }: { login: string; status: 'online' | 'offline' }) => {
      setOnlineUsers((prev) =>
        status === 'online' ? (prev.includes(l) ? prev : [...prev, l]) : prev.filter((x) => x !== l)
      );
    });
    return () => { socket.off('onlineUsersList'); socket.off('userStatusChange'); };
  }, [socket]);

  // Load history
  useEffect(() => {
    if (!selectedUser) return;
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const res = await api(`/api/chat/history/${selectedUser.login}`);
        if (res.ok) setMessages(await res.json());
      } catch (err) { console.error("Tarixni yuklashda xato:", err); }
      finally { setLoading(false); }
    };
    fetchHistory();
  }, [selectedUser]);

  // Socket messages
  useEffect(() => {
    if (!socket) return;
    const handleMessage = (msg: Message) => {
      if (msg.sender === selectedUser?.login || msg.sender === login) {
        setMessages((prev) => [...prev, msg]);
      }
      setUsers((prev) =>
        prev.map((u) => {
          if (u.login === msg.sender)
            return { ...u, lastMessage: msg.content, unreadCount: u.login === selectedUser?.login ? 0 : (u.unreadCount || 0) + 1 };
          if (msg.sender === login && u.login === selectedUser?.login)
            return { ...u, lastMessage: msg.content };
          return u;
        })
      );
    };
    socket.on('privateMessage', handleMessage);

    const handleEdited = ({ sender, timestamp, newContent }: any) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.sender === sender && new Date(m.timestamp).getTime() === new Date(timestamp).getTime()
            ? { ...m, content: newContent, isEdited: true }
            : m
        )
      );
      if (selectedUser?.login === sender)
        setUsers((prev) => prev.map((u) => (u.login === sender ? { ...u, lastMessage: newContent } : u)));
    };
    socket.on('messageEdited', handleEdited);
    return () => { socket.off('privateMessage', handleMessage); socket.off('messageEdited', handleEdited); };
  }, [socket, selectedUser, login]);

  // Auto scroll
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newMessage.trim() || !selectedUser || !socket) return;

    if (editingMessage) {
      socket.emit('editMessage', { receiver: selectedUser.login, timestamp: editingMessage.timestamp, newContent: newMessage.trim() });
      setMessages((prev) =>
        prev.map((m) =>
          m.sender === login && new Date(m.timestamp).getTime() === new Date(editingMessage.timestamp).getTime()
            ? { ...m, content: newMessage.trim(), isEdited: true }
            : m
        )
      );
      setEditingMessage(null);
    } else {
      socket.emit('privateMessage', { receiver: selectedUser.login, content: newMessage.trim() });
      setMessages((prev) => [...prev, { sender: login!, content: newMessage.trim(), timestamp: new Date() }]);
    }
    setNewMessage('');
  };

  const filteredUsers = users.filter((u) =>
    (u.name || u.login).toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    // ✅ fullHeight={true} — chat sahifasi uchun padding yo'q, to'liq balandlik
    <AdminLayout title="Support Chat" fullHeight>
      {({ theme, tc }) => (
        <div style={{
          display:      'flex',
          flex:         1,
          height:       '100%',
          minHeight:    0,
          background:   theme === 'dark' ? '#0f1420' : '#f8fafc',
          overflow:     'hidden',
          position:     'relative',
        }}>

          {/* ── Users Sidebar ── */}
          <div style={{
            width:       chatSidebarOpen ? '320px' : '0px',
            borderRight: chatSidebarOpen ? `1px solid ${theme === 'dark' ? '#1e293b' : '#e2e8f0'}` : 'none',
            display:     'flex',
            flexDirection:'column',
            background:  theme === 'dark' ? '#161d2f' : '#fff',
            transition:  'width 0.3s ease',
            overflow:    'hidden',
            flexShrink:  0,
          }}>
            <div style={{ padding: '20px', minWidth: '320px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 700, color: theme === 'dark' ? '#fff' : '#1e293b', margin: 0 }}>
                  Xabarlar
                </h2>
                <button
                  onClick={() => setChatSidebarOpen(false)}
                  style={{
                    border:         'none', cursor: 'pointer',
                    color:          theme === 'dark' ? '#94a3b8' : '#64748b',
                    padding:        '6px', borderRadius: '8px', display: 'flex',
                    alignItems:     'center',
                    background:     theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                  }}
                >
                  <PanelLeftClose size={18} />
                </button>
              </div>

              <div style={{ position: 'relative' }}>
                <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} size={16} />
                <input
                  type="text"
                  placeholder="Qidirish..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width:       '100%',
                    padding:     '10px 10px 10px 38px',
                    borderRadius:'10px',
                    border:      'none',
                    background:  theme === 'dark' ? '#1e293b' : '#f1f5f9',
                    color:       theme === 'dark' ? '#fff' : '#1e293b',
                    fontSize:    '14px',
                    outline:     'none',
                    boxSizing:   'border-box',
                  }}
                />
              </div>
            </div>

            {/* User list */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 10px 10px', minWidth: '320px' }}>
              {filteredUsers.map((user) => (
                <div
                  key={user.login}
                  onClick={() => {
                    setSelectedUser(user);
                    setUsers((prev) => prev.map((u) => u.login === user.login ? { ...u, unreadCount: 0 } : u));
                  }}
                  style={{
                    display:     'flex',
                    alignItems:  'center',
                    gap:         '12px',
                    padding:     '10px',
                    borderRadius:'14px',
                    cursor:      'pointer',
                    background:  selectedUser?.login === user.login
                      ? (theme === 'dark' ? '#1e293b' : '#f1f5f9')
                      : 'transparent',
                    transition:  'background 0.2s',
                    marginBottom:'2px',
                  }}
                >
                  <div style={{ position: 'relative' }}>
                    <div style={{
                      width:          '44px', height: '44px', borderRadius: '12px',
                      background:     user.role === 'admin'
                        ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                        : 'linear-gradient(135deg, #10b981, #34d399)',
                      display:        'flex', alignItems: 'center', justifyContent: 'center',
                      color:          '#fff', fontWeight: 700, fontSize: '16px', flexShrink: 0,
                    }}>
                      {(user.name?.[0] || user.login[0]).toUpperCase()}
                    </div>
                    {onlineUsers.includes(user.login) && (
                      <div style={{
                        position:  'absolute', bottom: '-2px', right: '-2px',
                        width:     '11px', height: '11px', borderRadius: '50%',
                        background:'#10b981',
                        border:    `2px solid ${theme === 'dark' ? '#161d2f' : '#fff'}`,
                      }} />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, color: theme === 'dark' ? '#fff' : '#1e293b', fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {user.name || user.login}
                      </span>
                      {!!user.unreadCount && (
                        <span style={{ background: '#ef4444', color: '#fff', fontSize: '10px', padding: '2px 6px', borderRadius: '10px', fontWeight: 700, flexShrink: 0 }}>
                          {user.unreadCount}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {user.lastMessage || "Xabar yo'q"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Chat Area ── */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: theme === 'dark' ? '#0f1420' : '#f8fafc', minWidth: 0, position: 'relative' }}>
            {selectedUser ? (
              <>
                {/* Chat Header */}
                <div style={{
                  padding:      '14px 20px',
                  borderBottom: `1px solid ${theme === 'dark' ? '#1e293b' : '#e2e8f0'}`,
                  display:      'flex', justifyContent: 'space-between', alignItems: 'center',
                  background:   theme === 'dark' ? '#161d2f' : '#fff',
                  flexShrink:   0,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {!chatSidebarOpen && (
                      <button onClick={() => setChatSidebarOpen(true)} style={{ border: 'none', cursor: 'pointer', color: theme === 'dark' ? '#94a3b8' : '#64748b', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center', background: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                        <PanelLeftOpen size={18} />
                      </button>
                    )}
                    <div style={{ width: '38px', height: '38px', borderRadius: '11px', background: selectedUser.role === 'admin' ? '#6366f1' : '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700 }}>
                      {(selectedUser.name?.[0] || selectedUser.login[0]).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: theme === 'dark' ? '#fff' : '#1e293b', fontSize: '15px' }}>
                        {selectedUser.name || selectedUser.login}
                      </div>
                      <div style={{ fontSize: '12px', color: onlineUsers.includes(selectedUser.login) ? '#10b981' : '#64748b', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: onlineUsers.includes(selectedUser.login) ? '#10b981' : '#64748b' }} />
                        {onlineUsers.includes(selectedUser.login) ? 'Onlayn' : 'Offlayn'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', minHeight: 0 }}>
                  {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', color: '#64748b' }}>Yuklanmoqda...</div>
                  ) : (
                    <>
                      {messages.map((msg, idx) => {
                        const isMe = msg.sender === login;
                        return (
                          <div key={idx} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                            <div
                              onDoubleClick={() => { if (isMe) { setEditingMessage(msg); setNewMessage(msg.content); } }}
                              style={{
                                maxWidth:     '65%',
                                padding:      '10px 14px',
                                borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                                background:   isMe ? '#6366f1' : (theme === 'dark' ? '#1e293b' : '#fff'),
                                color:        isMe ? '#fff' : (theme === 'dark' ? '#fff' : '#1e293b'),
                                boxShadow:    isMe ? '0 4px 12px rgba(99,102,241,0.25)' : '0 2px 8px rgba(0,0,0,0.06)',
                                cursor:       isMe ? 'pointer' : 'default',
                              }}
                            >
                              <div style={{ fontSize: '14px', lineHeight: '1.5' }}>{msg.content}</div>
                              <div style={{ fontSize: '10px', marginTop: '4px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '4px', opacity: 0.7 }}>
                                {msg.isEdited && <span style={{ fontStyle: 'italic' }}>tahrirlandi</span>}
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>

                {/* Input area */}
                <div style={{ background: theme === 'dark' ? '#161d2f' : '#fff', flexShrink: 0, position: 'relative' }}>
                  {/* Emoji Picker */}
                  {showEmojiPicker && (
                    <div ref={emojiPickerRef} style={{
                      position:            'absolute', bottom: '72px', right: '20px',
                      width:               '280px', height:  '320px',
                      background:          theme === 'dark' ? '#1e293b' : '#fff',
                      border:              `1px solid ${theme === 'dark' ? '#2d3748' : '#e2e8f0'}`,
                      borderRadius:        '14px',
                      boxShadow:           '0 10px 25px rgba(0,0,0,0.2)',
                      padding:             '12px',
                      zIndex:              1000,
                      overflowY:           'auto',
                      display:             'grid',
                      gridTemplateColumns: 'repeat(7, 1fr)',
                      gap:                 '6px',
                    }}>
                      {EMOJIS.map((emoji) => (
                        <button key={emoji} onClick={() => addEmoji(emoji)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', padding: '4px', borderRadius: '6px', transition: 'background 0.15s' }}
                          onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(99,102,241,0.1)')}
                          onMouseOut={(e)  => (e.currentTarget.style.background = 'none')}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Edit indicator */}
                  {editingMessage && (
                    <div style={{ padding: '8px 20px', background: 'rgba(99,102,241,0.08)', borderTop: `1px solid ${theme === 'dark' ? '#1e293b' : '#e2e8f0'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#6366f1', fontSize: '12px' }}>Xabarni tahrirlash...</span>
                      <button onClick={() => { setEditingMessage(null); setNewMessage(''); }} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '12px' }}>
                        Bekor qilish
                      </button>
                    </div>
                  )}

                  {/* Form */}
                  <form onSubmit={handleSend} style={{
                    padding:     '16px 20px',
                    borderTop:   editingMessage ? 'none' : `1px solid ${theme === 'dark' ? '#1e293b' : '#e2e8f0'}`,
                    display:     'flex', alignItems: 'center', gap: '10px',
                  }}>
                    <Paperclip size={18} style={{ color: '#64748b', cursor: 'pointer', flexShrink: 0 }} />
                    <div style={{ flex: 1, position: 'relative' }}>
                      <input
                        type="text"
                        placeholder={editingMessage ? "Xabarni o'zgartiring..." : "Xabar yozing..."}
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        style={{
                          width:       '100%',
                          padding:     '11px 42px 11px 14px',
                          borderRadius:'12px',
                          border:      editingMessage ? '1px solid #6366f1' : 'none',
                          background:  theme === 'dark' ? '#1e293b' : '#f1f5f9',
                          color:       theme === 'dark' ? '#fff' : '#1e293b',
                          outline:     'none',
                          fontSize:    '14px',
                          boxSizing:   'border-box',
                        }}
                      />
                      <Smile size={18} onClick={() => setShowEmojiPicker((v) => !v)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', cursor: 'pointer' }} />
                    </div>
                    <button type="submit" style={{
                      width: '40px', height: '40px', borderRadius: '11px',
                      background: '#6366f1', color: '#fff', border: 'none',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, transition: 'transform 0.15s',
                    }}
                      onMouseOver={(e) => (e.currentTarget.style.transform = 'scale(1.08)')}
                      onMouseOut={(e)  => (e.currentTarget.style.transform = 'scale(1)')}
                    >
                      <Send size={18} />
                    </button>
                  </form>
                </div>
              </>
            ) : (
              /* Empty state */
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748b', gap: '16px' }}>
                {!chatSidebarOpen && (
                  <button onClick={() => setChatSidebarOpen(true)} style={{ position: 'absolute', top: '16px', left: '16px', border: 'none', cursor: 'pointer', color: theme === 'dark' ? '#94a3b8' : '#64748b', padding: '8px', borderRadius: '8px', display: 'flex', background: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                    <PanelLeftOpen size={20} />
                  </button>
                )}
                <div style={{ width: '72px', height: '72px', borderRadius: '20px', background: theme === 'dark' ? '#1e293b' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MessageSquare size={36} color="#6366f1" />
                </div>
                <div style={{ textAlign: 'center' }}>
                  <h3 style={{ color: theme === 'dark' ? '#fff' : '#1e293b', margin: '0 0 8px 0', fontSize: '22px', fontWeight: 800 }}>Support Chat</h3>
                  <p style={{ fontSize: '15px', margin: 0, color: '#64748b' }}>Muloqotni boshlash uchun foydalanuvchini tanlang</p>
                </div>
              </div>
            )}
          </div>

          <style>{`
            ::-webkit-scrollbar { width: 5px; }
            ::-webkit-scrollbar-track { background: transparent; }
            ::-webkit-scrollbar-thumb { background: ${theme === 'dark' ? '#1e293b' : '#e2e8f0'}; border-radius: 10px; }
            ::-webkit-scrollbar-thumb:hover { background: #6366f1; }
          `}</style>
        </div>
      )}
    </AdminLayout>
  );
}