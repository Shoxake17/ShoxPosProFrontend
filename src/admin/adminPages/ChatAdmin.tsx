// src/admin/adminPages/ChatAdmin.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageSquare, Search, Paperclip, Smile, PanelLeftClose, PanelLeftOpen, ChevronLeft } from 'lucide-react';
import AdminLayout from "../adminComponents/AdminLayout";
import { getSessionLogin } from "../../utils/clientSession";
import { api } from "../../utils/api";
import { getSocket } from "../../utils/socket";
import { useTranslation } from "react-i18next";
import { toast } from "sonner"; // ✅ toast import qilindi

const EMOJIS = ['😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇','🙂','🙃','😉','😌','😍','🥰','😘','😗','😙','😚','😋','😛','😝','😜','🤪','🤨','🧐','🤓','😎','🤩','🥳','😏','😒','😞','😔','😟','😕','🙁','☹️','😣','😖','😫','😩','🥺','😢','😭','😤','😠','😡','🤬','🤯','😳','🥵','🥶','😱','😨','😰','😥','😓','🤗','🤔','🤭','🤫','🤥','😶','😐','😑','😬','🙄','😯','😦','😧','😮','😲','🥱','😴','🤤','😪','😵','🤐','🥴','🤢','🤮','🤧','😷','🤒','🤕','🤑','🤠','😈','👿','👹','👺','🤡','💩','👻','💀','☠️','👽','👾','🤖','🎃'];

interface ChatUser {
  login: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  role: string;
  lastMessage?: string;
  unreadCount?: number;
  avatarUrl?: string;
  uniqueChatId?: string;
}

interface Message {
  sender: string;
  content: string;
  timestamp: string | Date;
  isEdited?: boolean;
}

export default function ChatAdmin() {
  const login = getSessionLogin();
  const { t } = useTranslation(); // ✅ i18next hook
  
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
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const socket = getSocket();

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const addEmoji = (emoji: string) => {
    setNewMessage((prev) => prev + emoji);
    setShowEmojiPicker(false);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
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
        }
      } catch (err) { 
        console.error(t("errorLoadingUsers"), err); 
      }
    };
    fetchUsers();
  }, [login, t]);

  useEffect(() => {
    if (!socket) return;
    socket.emit('getOnlineUsers');
    socket.on('onlineUsersList', (logins: string[]) => setOnlineUsers(logins));
    socket.on('userStatusChange', ({ login: l, status }: { login: string; status: 'online' | 'offline' }) => {
      setOnlineUsers((prev) => status === 'online' ? (prev.includes(l) ? prev : [...prev, l]) : prev.filter((x) => x !== l));
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
      } catch (err) { 
        console.error(t("errorLoadingHistory"), err); 
      }
      finally { setLoading(false); }
    };
    fetchHistory();
  }, [selectedUser, t]);

  useEffect(() => {
    if (!socket) return;
    const handleMessage = (msg: Message) => {
      setMessages((prev) => {
        const isDuplicate = prev.some(m => m.sender === msg.sender && new Date(m.timestamp).getTime() === new Date(msg.timestamp).getTime());
        if (isDuplicate) return prev;
        if (msg.sender === selectedUser?.login || msg.sender === login) return [...prev, msg];
        return prev;
      });
      setUsers((prev) => prev.map((u) => {
        if (u.login === msg.sender) return { ...u, lastMessage: msg.content, unreadCount: u.login === selectedUser?.login ? 0 : (u.unreadCount || 0) + 1 };
        if (msg.sender === login && u.login === selectedUser?.login) return { ...u, lastMessage: msg.content };
        return u;
      }));
    };
    socket.on('privateMessage', handleMessage);
    const handleEdited = ({ sender, timestamp, newContent }: any) => {
      setMessages((prev) => prev.map((m) => (m.sender === sender && new Date(m.timestamp).getTime() === new Date(timestamp).getTime()) ? { ...m, content: newContent, isEdited: true } : m));
      setUsers((prev) => prev.map((u) => (u.login === sender ? { ...u, lastMessage: newContent } : u)));
    };
    socket.on('messageEdited', handleEdited);
    return () => { socket.off('privateMessage', handleMessage); socket.off('messageEdited', handleEdited); };
  }, [socket, selectedUser?.login, login]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newMessage.trim() || !selectedUser || !socket) return;
    if (editingMessage) {
      socket.emit('editMessage', { receiver: selectedUser.login, timestamp: editingMessage.timestamp, newContent: newMessage.trim() });
      setMessages((prev) => prev.map((m) => (m.sender === login && new Date(m.timestamp).getTime() === new Date(editingMessage.timestamp).getTime()) ? { ...m, content: newMessage.trim(), isEdited: true } : m));
      setEditingMessage(null);
    } else {
      socket.emit('privateMessage', { receiver: selectedUser.login, content: newMessage.trim() });
      setMessages((prev) => [...prev, { sender: login!, content: newMessage.trim(), timestamp: new Date() }]);
    }
    setNewMessage('');
  };

  const filteredUsers = users
    .filter(u => u.login !== login)
    .filter((u) => (u.firstName || u.login || '').toLowerCase().includes(searchQuery.toLowerCase()) || (u.uniqueChatId === searchQuery));

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
          toast.error(t("userNotFound")); 
        }
      }
    } catch (err) { 
      console.error("Search error:", err); 
    }
  };

  return (
    <AdminLayout title={t("supportChatTitle")} fullHeight>
      {({ theme }) => (
        <div style={{
          display: 'flex',
          flex: 1,
          height: 'calc(100vh - 110px)',
          background: '#091020',
          borderRadius: '20px',
          overflow: 'hidden',
          border: '1px solid #1e293b',
          position: 'relative',
          margin: isMobile ? '0' : '0 10px'
        }}>
          {/* Sidebar */}
          <div style={{
            width: isMobile ? (selectedUser ? '0' : '100%') : (chatSidebarOpen ? '320px' : '80px'),
            borderRight: '1px solid #1e293b',
            display: 'flex',
            flexDirection:'column',
            background: '#161d2f',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            overflow: 'hidden',
            flexShrink: 0,
            zIndex: 10
          }}>
            <div style={{ padding: '20px', minWidth: isMobile ? '100%' : '320px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                {(chatSidebarOpen || isMobile) && (
                  <div>
                    <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#fff', margin: 0 }}>{t("messages")}</h2>
                    <div style={{ fontSize: '11px', color: '#6366f1', marginTop: '2px' }}>
                      {t("myId")} {users.find(u => u.login === login)?.uniqueChatId || ''}
                    </div>
                  </div>
                )}
                {!isMobile && (
                  <button onClick={() => setChatSidebarOpen(!chatSidebarOpen)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '5px' }}>
                    {chatSidebarOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
                  </button>
                )}
              </div>
              {(chatSidebarOpen || isMobile) && (
                <form onSubmit={handleSearch} style={{ position: 'relative' }}>
                  <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} size={16} />
                  <input type="text" placeholder={t("searchById")} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ width: '100%', padding: '10px 10px 10px 38px', borderRadius: '10px', border: 'none', background: '#1e293b', color: '#fff', fontSize: '14px', outline: 'none' }} />
                </form>
              )}
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 10px' }}>
              {filteredUsers.map((user) => (
                <div key={user.login} onClick={() => { setSelectedUser(user); setUsers((prev) => prev.map((u) => u.login === user.login ? { ...u, unreadCount: 0 } : u)); }} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '12px', cursor: 'pointer', background: selectedUser?.login === user.login ? '#1e293b' : 'transparent', transition: 'background 0.2s', marginBottom: '2px', justifyContent: (chatSidebarOpen || isMobile) ? 'flex-start' : 'center' }}>
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt={t("userAvatarAlt")} style={{ width: '44px', height: '44px', borderRadius: '12px', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'linear-gradient(135deg, #10b981, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '16px' }}>{(user.firstName?.[0] || user.login[0]).toUpperCase()}</div>
                    )}
                    {onlineUsers.includes(user.login) && <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '12px', height: '12px', borderRadius: '50%', background: '#10b981', border: '2px solid #161d2f' }} />}
                  </div>
                  {(chatSidebarOpen || isMobile) && (
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 600, color: '#fff', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.firstName ? `${user.firstName} ${user.lastName || ''}` : user.login}</span>
                        {!!user.unreadCount && <span style={{ background: '#6366f1', color: '#fff', fontSize: '10px', padding: '2px 6px', borderRadius: '10px', fontWeight: 700 }}>{user.unreadCount}</span>}
                      </div>
                      <div style={{ fontSize: '11px', color: '#475569', marginBottom: '2px' }}>ID: {user.uniqueChatId}</div>
                      <div style={{ fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.lastMessage || t("noMessage")}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Chat Area */}
          <div style={{ flex: 1, display: isMobile ? (selectedUser ? 'flex' : 'none') : 'flex', flexDirection: 'column', background: '#091020', position: 'relative', width: '100%' }}>
            {selectedUser ? (
              <>
                {/* Header */}
                <div style={{ padding: '12px 20px', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#161d2f', zIndex: 5 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {isMobile && <button onClick={() => setSelectedUser(null)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '5px' }}><ChevronLeft size={24} /></button>}
                    {selectedUser.avatarUrl ? (
                      <img src={selectedUser.avatarUrl} alt={t("selectedUserAvatarAlt")} style={{ width: '40px', height: '40px', borderRadius: '10px', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700 }}>{(selectedUser.firstName?.[0] || selectedUser.login[0]).toUpperCase()}</div>
                    )}
                    <div>
                      <div style={{ fontWeight: 600, color: '#fff', fontSize: '15px' }}>{selectedUser.firstName ? `${selectedUser.firstName} ${selectedUser.lastName || ''}` : selectedUser.login}</div>
                      <div style={{ fontSize: '11px', color: '#6366f1', marginBottom: '2px' }}>ID: {selectedUser.uniqueChatId}</div>
                      <div style={{ fontSize: '12px', color: onlineUsers.includes(selectedUser.login) ? '#10b981' : '#64748b' }}>{onlineUsers.includes(selectedUser.login) ? t("online") : t("offline")}</div>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px', background: '#091020' }}>
                  {messages.map((msg, idx) => {
                    const isMe = msg.sender === login;
                    const senderUser = isMe ? null : users.find(u => u.login === msg.sender);

                    return (
                      <div key={idx} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', gap: '8px', alignItems: 'flex-end' }}>
                        {!isMe && (
                          <div style={{ width: '28px', height: '28px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, background: '#1e293b' }}>
                            {senderUser?.avatarUrl ? (
                              <img src={senderUser.avatarUrl} alt={t("senderUserAvatarAlt")} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#fff', fontWeight: 700, background: '#10b981' }}>
                                {(senderUser?.firstName?.[0] || senderUser?.login?.[0] || '?').toUpperCase()}
                              </div>
                            )}
                          </div>
                        )}
                        <div onDoubleClick={() => { if (isMe) { setEditingMessage(msg); setNewMessage(msg.content); } }} style={{ maxWidth: '75%', padding: '8px 12px', borderRadius: isMe ? '15px 15px 2px 15px' : '15px 15px 15px 2px', background: isMe ? '#6366f1' : '#1e293b', color: '#fff', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', position: 'relative' }}>
                          <div style={{ fontSize: '14.5px', lineHeight: '1.4' }}>{msg.content}</div>
                          <div style={{ fontSize: '10px', marginTop: '4px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '4px', opacity: 0.6 }}>
                            {msg.isEdited && <i>{t("edited")}</i>}
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div style={{ padding: '15px 20px', background: '#161d2f', borderTop: '1px solid #1e293b' }}>
                  {editingMessage && (
                    <div style={{ padding: '5px 10px', background: 'rgba(99,102,241,0.1)', borderRadius: '8px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', color: '#6366f1' }}>{t("editing")}</span>
                      <button onClick={() => { setEditingMessage(null); setNewMessage(''); }} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '11px', cursor: 'pointer' }}>{t("cancel")}</button>
                    </div>
                  )}
                  <form onSubmit={handleSend} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Paperclip size={20} style={{ color: '#64748b', cursor: 'pointer' }} />
                    <div style={{ flex: 1, position: 'relative' }}>
                      <input type="text" placeholder={t("writeAMessage")} value={newMessage} onChange={(e) => setNewMessage(e.target.value)} style={{ width: '100%', padding: '11px 40px 11px 15px', borderRadius: '12px', border: editingMessage ? '1px solid #6366f1' : 'none', background: '#1e293b', color: '#fff', outline: 'none', fontSize: '14px' }} />
                      <Smile size={20} onClick={() => setShowEmojiPicker(!showEmojiPicker)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', cursor: 'pointer' }} />
                      {showEmojiPicker && (
                        <div ref={emojiPickerRef} style={{ position: 'absolute', bottom: '60px', right: 0, width: '280px', height: '300px', background: '#1e293b', border: '1px solid #2d3748', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.3)', padding: '10px', zIndex: 1000, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '5px' }}>
                          {EMOJIS.map(e => <button key={e} type="button" onClick={() => addEmoji(e)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', padding: '4px' }}>{e}</button>)}
                        </div>
                      )}
                    </div>
                    <button type="submit" style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#6366f1', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Send size={20} /></button>
                  </form>
                </div>
              </>
            ) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748b', gap: '15px' }}>
                <div style={{ width: '70px', height: '70px', borderRadius: '20px', background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><MessageSquare size={35} /></div>
                <div style={{ textAlign: 'center' }}>
                  <h3 style={{ color: '#fff', margin: '0 0 5px 0' }}>{t("supportChatTitle")}</h3>
                  <p style={{ fontSize: '14px', margin: 0 }}>{t("selectUserToStart")}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}