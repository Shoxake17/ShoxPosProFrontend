import React, { useState, useEffect, useRef } from 'react';
import { Send, User as UserIcon, MessageSquare, Search, Phone, Video, MoreVertical, Paperclip, Smile, PanelLeftClose, PanelLeftOpen, X } from 'lucide-react';
import MainLayout from "../components/MainLayout";
import { getSessionLogin, getSessionUserImage } from "../utils/clientSession";
import { api } from "../utils/api";
import { getSocket } from "../utils/socket";

const EMOJIS = ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '😈', '👿', '👹', '👺', '🤡', '💩', '👻', '💀', '☠️', '👽', '👾', '🤖', '🎃', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾'];

interface ChatUser {
  login: string;
  name?: string;
  role: string;
  lastMessage?: string;
  unreadCount?: number;
  isSecret?: boolean;
}

interface Message {
  sender: string;
  content: string;
  timestamp: string | Date;
  isEdited?: boolean;
}

export default function Chat() {
  const login = getSessionLogin();
  const userImage = getSessionUserImage();
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [chatSidebarOpen, setChatSidebarOpen] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isSecret, setIsSecret] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const socket = getSocket();

  // Emojini tanlash
  const addEmoji = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  // Tashqariga bosilganda yopish
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Foydalanuvchilarni yuklash
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await api('/api/chat/users');
        if (res.ok) {
          const data = await res.json();
          // Admin (Support) ni doim birinchi qilish va joriy foydalanuvchini olib tashlash
          const admin = data.find((u: any) => u.role === 'admin' && u.login !== login);
          const others = data.filter((u: any) => u.login !== login && (u.role !== 'admin' || u.login === admin?.login));
          
          const sortedUsers = admin ? [admin, ...others.filter((u: any) => u.login !== admin.login)] : others;
          setUsers(sortedUsers);
          
          // O'zining secret holatini tekshirish
          const me = data.find((u: any) => u.login === login);
          if (me) setIsSecret(!!me.isSecret);

          // Agar tanlanmagan bo'lsa, default admin (Support) ni tanlash
          if (!selectedUser && admin) {
            setSelectedUser(admin);
          }
        }
      } catch (err) {
        console.error("Foydalanuvchilarni yuklashda xato:", err);
      }
    };
    fetchUsers();
  }, [login]);

  // Secret holatini o'zgartirish
  const toggleSecret = async () => {
    try {
      const res = await api('/api/chat/toggle-secret', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setIsSecret(data.isSecret);
        setShowMenu(false);
      }
    } catch (err) {
      console.error("Secret toggle xatosi:", err);
    }
  };

  // Chat tarixini o'chirish
  const deleteHistory = async () => {
    if (!selectedUser || !window.confirm("Haqiqatan ham ushbu chat tarixini butunlay o'chirib tashlamoqchimisiz?")) return;
    
    try {
      const res = await api('/api/chat/delete-history', {
        method: 'POST',
        body: JSON.stringify({ withUser: selectedUser.login })
      });
      if (res.ok) {
        setMessages([]);
        setShowMenu(false);
      }
    } catch (err) {
      console.error("Tarixni o'chirishda xato:", err);
    }
  };

  // Onlayn foydalanuvchilarni boshqarish
  useEffect(() => {
    if (!socket) return;

    socket.emit('getOnlineUsers');
    
    socket.on('onlineUsersList', (logins: string[]) => {
      setOnlineUsers(logins);
    });

    socket.on('userStatusChange', ({ login: changedLogin, status }: { login: string, status: 'online' | 'offline' }) => {
      setOnlineUsers(prev => {
        if (status === 'online') {
          return prev.includes(changedLogin) ? prev : [...prev, changedLogin];
        } else {
          return prev.filter(l => l !== changedLogin);
        }
      });
    });

    return () => {
      socket.off('onlineUsersList');
      socket.off('userStatusChange');
    };
  }, [socket]);

  // Tanlangan foydalanuvchi o'zgarganda tarixni yuklash
  useEffect(() => {
    if (!selectedUser) return;

    const fetchHistory = async () => {
      setLoading(true);
      try {
        const res = await api(`/api/chat/history/${selectedUser.login}`);
        if (res.ok) {
          const data = await res.json();
          setMessages(data);
        }
      } catch (err) {
        console.error("Tarixni yuklashda xato:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [selectedUser]);

  // Socket orqali yangi xabarlarni qabul qilish
  useEffect(() => {
    if (!socket) return;

    const handleMessage = (msg: Message) => {
      // Agar xabar hozirgi ochiq chatdan bo'lsa yoki men yuborgan bo'lsam
      if (msg.sender === selectedUser?.login || msg.sender === login) {
        setMessages(prev => [...prev, msg]);
      }
      
      // Ro'yxatdagi lastMessage va unreadCount ni yangilash
      setUsers(prev => prev.map(u => {
        if (u.login === msg.sender) {
          return { 
            ...u, 
            lastMessage: msg.content, 
            unreadCount: (u.login === selectedUser?.login) ? 0 : (u.unreadCount || 0) + 1 
          };
        }
        if (msg.sender === login && u.login === selectedUser?.login) {
          return { ...u, lastMessage: msg.content };
        }
        return u;
      }));
    };

    socket.on('privateMessage', handleMessage);

    const handleMessageEdited = ({ sender, timestamp, newContent }: any) => {
      setMessages(prev => prev.map(m => 
        (m.sender === sender && new Date(m.timestamp).getTime() === new Date(timestamp).getTime())
          ? { ...m, content: newContent, isEdited: true }
          : m
      ));
      
      if (selectedUser?.login === sender) {
        setUsers(prev => prev.map(u => 
          u.login === sender ? { ...u, lastMessage: newContent } : u
        ));
      }
    };

    socket.on('messageEdited', handleMessageEdited);

    return () => {
      socket.off('privateMessage', handleMessage);
      socket.off('messageEdited', handleMessageEdited);
    };
  }, [socket, selectedUser, login]);

  // Avtomatik scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newMessage.trim() || !selectedUser || !socket) return;

    if (editingMessage) {
      // Tahrirlash
      socket.emit('editMessage', {
        receiver: selectedUser.login,
        timestamp: editingMessage.timestamp,
        newContent: newMessage.trim()
      });

      setMessages(prev => prev.map(m => 
        (m.sender === login && new Date(m.timestamp).getTime() === new Date(editingMessage.timestamp).getTime())
          ? { ...m, content: newMessage.trim(), isEdited: true }
          : m
      ));
      setEditingMessage(null);
    } else {
      // Yangi xabar
      const msgData = {
        receiver: selectedUser.login,
        content: newMessage.trim()
      };

      socket.emit('privateMessage', msgData);

      const myMsg: Message = {
        sender: login!,
        content: newMessage.trim(),
        timestamp: new Date()
      };
      setMessages(prev => [...prev, myMsg]);
    }
    
    setNewMessage('');
  };

  const filteredUsers = users.filter(u => 
    (u.name || u.login).toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <MainLayout theme={theme} userImage={userImage} title="Xabarlar">
      <div style={{
        display: 'flex',
        height: 'calc(100vh - 100px)',
        background: theme === 'dark' ? '#0f1420' : '#f8fafc',
        borderRadius: '24px',
        overflow: 'hidden',
        border: `1px solid ${theme === 'dark' ? '#1e293b' : '#e2e8f0'}`,
        boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
        position: 'relative'
      }}>
        {/* Sidebar - Foydalanuvchilar ro'yxati */}
        <div style={{
          width: chatSidebarOpen ? '350px' : '0px',
          borderRight: chatSidebarOpen ? `1px solid ${theme === 'dark' ? '#1e293b' : '#e2e8f0'}` : 'none',
          display: 'flex',
          flexDirection: 'column',
          background: theme === 'dark' ? '#161d2f' : '#fff',
          transition: 'all 0.3s ease',
          overflow: 'hidden',
          position: 'relative',
          zIndex: 10
        }}>
          <div style={{ padding: '24px', minWidth: '350px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 700, color: theme === 'dark' ? '#fff' : '#1e293b', margin: 0 }}>Xabarlar</h2>
              <button 
                onClick={() => setChatSidebarOpen(!chatSidebarOpen)}
                style={{
                  border: 'none',
                  cursor: 'pointer',
                  color: theme === 'dark' ? '#fff' : '#1e293b',
                  padding: '8px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
                }}
              >
                {chatSidebarOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
              </button>
            </div>
            <div style={{ position: 'relative' }}>
              <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} size={18} />
              <input
                type="text"
                placeholder="Qidirish..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 12px 12px 40px',
                  borderRadius: '12px',
                  border: 'none',
                  background: theme === 'dark' ? '#1e293b' : '#f1f5f9',
                  color: theme === 'dark' ? '#fff' : '#1e293b',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px 12px', minWidth: '350px' }}>
            {filteredUsers.map(user => (
              <div
                key={user.login}
                onClick={() => {
                  setSelectedUser(user);
                  setUsers(prev => prev.map(u => u.login === user.login ? { ...u, unreadCount: 0 } : u));
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  borderRadius: '16px',
                  cursor: 'pointer',
                  background: selectedUser?.login === user.login 
                    ? (theme === 'dark' ? '#1e293b' : '#f1f5f9') 
                    : 'transparent',
                  transition: 'all 0.2s',
                  marginBottom: '4px'
                }}
              >
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '14px',
                  background: user.role === 'admin' ? '#6366f1' : '#10b981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '18px',
                  flexShrink: 0
                }}>
                  {user.role === 'admin' ? 'S' : (user.name?.[0] || user.login[0]).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                      <span style={{ fontWeight: 600, color: theme === 'dark' ? '#fff' : '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {user.role === 'admin' ? 'Support Chat' : (user.name || user.login)}
                      </span>
                      {onlineUsers.includes(user.login) && (
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', flexShrink: 0 }} />
                      )}
                    </div>
                    {user.unreadCount ? (
                      <span style={{ background: '#ef4444', color: '#fff', fontSize: '10px', padding: '2px 6px', borderRadius: '10px', fontWeight: 700, flexShrink: 0 }}>
                        {user.unreadCount}
                      </span>
                    ) : null}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {user.lastMessage || (user.role === 'admin' ? 'Admin bilan bog\'lanish' : 'Xabar yo\'q')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: theme === 'dark' ? '#0f1420' : '#f8fafc', position: 'relative' }}>
          {selectedUser ? (
            <>
              {/* Chat Header */}
              <div style={{
                padding: '16px 24px',
                borderBottom: `1px solid ${theme === 'dark' ? '#1e293b' : '#e2e8f0'}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: theme === 'dark' ? '#161d2f' : '#fff'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {!chatSidebarOpen && (
                    <button 
                      onClick={() => setChatSidebarOpen(true)}
                      style={{
                        border: 'none',
                        cursor: 'pointer',
                        color: theme === 'dark' ? '#fff' : '#1e293b',
                        padding: '8px',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
                      }}
                    >
                      <PanelLeftOpen size={20} />
                    </button>
                  )}
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '12px',
                    background: selectedUser.role === 'admin' ? '#6366f1' : '#10b981',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700
                  }}>
                    {selectedUser.role === 'admin' ? 'S' : (selectedUser.name?.[0] || selectedUser.login[0]).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, color: theme === 'dark' ? '#fff' : '#1e293b' }}>
                      {selectedUser.role === 'admin' ? 'Support Chat' : (selectedUser.name || selectedUser.login)}
                    </div>
                    <div style={{ fontSize: '12px', color: onlineUsers.includes(selectedUser.login) ? '#10b981' : '#64748b' }}>
                      {onlineUsers.includes(selectedUser.login) ? 'Onlayn' : 'Offlayn'}
                    </div>
                  </div>
                </div>

                <div style={{ position: 'relative' }} ref={menuRef}>
                  <button 
                    onClick={() => setShowMenu(!showMenu)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#64748b',
                      padding: '8px',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'none'}
                  >
                    <MoreVertical size={20} />
                  </button>

                  {showMenu && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      right: 0,
                      marginTop: '8px',
                      width: '200px',
                      background: theme === 'dark' ? '#1e293b' : '#fff',
                      borderRadius: '12px',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                      border: `1px solid ${theme === 'dark' ? '#2d3748' : '#e2e8f0'}`,
                      zIndex: 100,
                      overflow: 'hidden'
                    }}>
                      <button
                        onClick={toggleSecret}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          textAlign: 'left',
                          background: 'none',
                          border: 'none',
                          color: theme === 'dark' ? '#fff' : '#1e293b',
                          cursor: 'pointer',
                          fontSize: '14px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)'}
                        onMouseOut={(e) => e.currentTarget.style.background = 'none'}
                      >
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: isSecret ? '#ef4444' : '#10b981' }} />
                        {isSecret ? "Profilni ochish" : "Secret Profile"}
                      </button>
                      <button
                        onClick={deleteHistory}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          textAlign: 'left',
                          background: 'none',
                          border: 'none',
                          color: '#ef4444',
                          cursor: 'pointer',
                          fontSize: '14px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                        onMouseOut={(e) => e.currentTarget.style.background = 'none'}
                      >
                        <X size={16} />
                        Chatni o'chirish
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Messages Container */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {loading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', color: '#64748b' }}>Yuklanmoqda...</div>
                ) : (
                  <>
                    {messages.map((msg, idx) => {
                      const isMe = msg.sender === login;
                      return (
                        <div key={idx} style={{
                          display: 'flex',
                          justifyContent: isMe ? 'flex-end' : 'flex-start',
                          marginBottom: '4px'
                        }}>
                          <div 
                            onDoubleClick={() => {
                              if (isMe) {
                                setEditingMessage(msg);
                                setNewMessage(msg.content);
                              }
                            }}
                            style={{
                              maxWidth: '70%',
                              padding: '12px 16px',
                              borderRadius: isMe ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                              background: isMe ? '#6366f1' : (theme === 'dark' ? '#1e293b' : '#fff'),
                              color: isMe ? '#fff' : (theme === 'dark' ? '#fff' : '#1e293b'),
                              boxShadow: isMe ? '0 4px 12px rgba(99, 102, 241, 0.3)' : '0 4px 12px rgba(0,0,0,0.05)',
                              position: 'relative',
                              cursor: isMe ? 'pointer' : 'default'
                            }}
                          >
                            <div style={{ fontSize: '14px', lineHeight: '1.5' }}>{msg.content}</div>
                            <div style={{ 
                              fontSize: '10px', 
                              marginTop: '4px', 
                              display: 'flex',
                              justifyContent: 'flex-end',
                              alignItems: 'center',
                              gap: '4px',
                              opacity: 0.7 
                            }}>
                              {msg.isEdited && <span style={{ fontStyle: 'italic', fontSize: '9px' }}>tahrirlandi</span>}
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

              {/* Chat Input */}
              <div style={{ background: theme === 'dark' ? '#161d2f' : '#fff', position: 'relative' }}>
                {/* Emoji Picker */}
                {showEmojiPicker && (
                  <div 
                    ref={emojiPickerRef}
                    style={{
                      position: 'absolute',
                      bottom: '80px',
                      right: '24px',
                      width: '300px',
                      height: '350px',
                      background: theme === 'dark' ? '#1e293b' : '#fff',
                      border: `1px solid ${theme === 'dark' ? '#2d3748' : '#e2e8f0'}`,
                      borderRadius: '16px',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                      padding: '16px',
                      zIndex: 1000,
                      overflowY: 'auto',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(7, 1fr)',
                      gap: '8px'
                    }}
                  >
                    {EMOJIS.map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => addEmoji(emoji)}
                        style={{
                          background: 'none',
                          border: 'none',
                          fontSize: '20px',
                          cursor: 'pointer',
                          padding: '4px',
                          borderRadius: '8px',
                          transition: 'background 0.2s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = 'rgba(102, 126, 234, 0.1)'}
                        onMouseOut={(e) => e.currentTarget.style.background = 'none'}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}

                {editingMessage && (
                  <div style={{
                    padding: '8px 24px',
                    background: 'rgba(99, 102, 241, 0.1)',
                    borderTop: `1px solid ${theme === 'dark' ? '#1e293b' : '#e2e8f0'}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '12px'
                  }}>
                    <span style={{ color: '#6366f1' }}>Xabarni tahrirlash...</span>
                    <button 
                      onClick={() => { setEditingMessage(null); setNewMessage(''); }}
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '11px' }}
                    >
                      Bekor qilish
                    </button>
                  </div>
                )}
                <form onSubmit={handleSendMessage} style={{
                  padding: '20px 24px',
                  background: theme === 'dark' ? '#161d2f' : '#fff',
                  borderTop: editingMessage ? 'none' : `1px solid ${theme === 'dark' ? '#1e293b' : '#e2e8f0'}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <Paperclip size={20} style={{ color: '#64748b', cursor: 'pointer' }} />
                  <div style={{ flex: 1, position: 'relative' }}>
                    <input
                      type="text"
                      placeholder={editingMessage ? "Xabarni o'zgartiring..." : "Xabar yozing..."}
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px 45px 12px 16px',
                        borderRadius: '14px',
                        border: editingMessage ? '1px solid #6366f1' : 'none',
                        background: theme === 'dark' ? '#1e293b' : '#f1f5f9',
                        color: theme === 'dark' ? '#fff' : '#1e293b',
                        outline: 'none',
                        fontSize: '14px',
                        boxSizing: 'border-box'
                      }}
                    />
                    <Smile 
                      size={20} 
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', cursor: 'pointer' }} 
                    />
                  </div>
                  <button
                    type="submit"
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '12px',
                      background: '#6366f1',
                      color: '#fff',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s',
                      flexShrink: 0
                    }}
                    onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    <Send size={20} />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748b', gap: '16px' }}>
              {!chatSidebarOpen && (
                <button 
                  onClick={() => setChatSidebarOpen(true)}
                  style={{
                    position: 'absolute',
                    top: '16px',
                    left: '16px',
                    border: 'none',
                    cursor: 'pointer',
                    color: theme === 'dark' ? '#fff' : '#1e293b',
                    padding: '8px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
                  }}
                >
                  <PanelLeftOpen size={20} />
                </button>
              )}
              <div style={{ width: '80px', height: '80px', borderRadius: '24px', background: theme === 'dark' ? '#1e293b' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MessageSquare size={40} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <h3 style={{ color: theme === 'dark' ? '#fff' : '#1e293b', margin: '0 0 8px 0' }}>Chatni boshlang</h3>
                <p style={{ fontSize: '14px', margin: 0 }}>Foydalanuvchilardan birini tanlang</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
