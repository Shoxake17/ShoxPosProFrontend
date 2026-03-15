import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  Send, 
  Sparkles, 
  Trash2, 
  User, 
  ChevronDown, 
  Check, 
  Zap, 
  Orbit 
} from 'lucide-react';
import MainLayout from "../components/MainLayout";
import { useTranslation, TranslationProvider } from '../components/languages/Ai';
import { useResponsive } from '../hooks/useResponsive';

type MessageRole = 'user' | 'ai';
type Message = { 
  role: MessageRole; 
  content: string; 
  timestamp: string; 
  modelName?: string; 
};

// Model ma'lumotlari
const AI_MODELS = [
  { id: 'openai', name: 'ShoxAI Pro', provider: 'ShoxAI', icon: <Sparkles size={18} />, color: '#10a37f' },
  { id: 'gemini', name: 'Gemini Pro', provider: 'Google', icon: <Zap size={18} />, color: '#4285f4' },
  { id: 'grok', name: 'Grok AI', provider: 'xAI', icon: <Orbit size={18} />, color: '#807b7b' },
] as const;

function AiContent() {
  const { t } = useTranslation();
  const { sidebarOpen } = useResponsive(); // ← QO'SHILDI
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedAI, setSelectedAI] = useState<'openai' | 'gemini' | 'grok'>('openai');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [theme] = useState<'dark' | 'light'>(() => (localStorage.getItem('theme') as any) || 'dark');
  
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const isInitialMount = useRef(true);

  useEffect(() => {
    const saved = localStorage.getItem('ai_chat_history');
    if (saved) setMessages(JSON.parse(saved));
    
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    localStorage.setItem('ai_chat_history', JSON.stringify(messages));
    
    // Faqat yangi xabar qo'shilganda scroll qilish, yuklanishda emas
    if (!isInitialMount.current && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    isInitialMount.current = false;
  }, [messages]);

  const activeModel = AI_MODELS.find(m => m.id === selectedAI) || AI_MODELS[0];

  // Markdown formatlashni tozalash funksiyasi
  const cleanMarkdown = (text: string): string => {
    return text
      .replace(/\*\*(.+?)\*\*/g, '$1')       // **qalin** → qalin
      .replace(/\*(.+?)\*/g, '$1')           // *kursiv* → kursiv
      .replace(/`(.+?)`/g, '$1')             // `kod` → kod
      .replace(/#{1,6}\s/g, '')              // ### Sarlavha → Sarlavha
      .replace(/\[(.+?)\]\(.+?\)/g, '$1')   // [link](url) → link
      .replace(/^\s*[-*+]\s/gm, '• ')       // - element → • element
      .replace(/^\s*\d+\.\s/gm, '')         // 1. element → element
      .trim();
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || loading) return;

    const currentModel = selectedAI;
    const userMsg: Message = { 
      role: 'user', 
      content: input, 
      timestamp: new Date().toISOString() 
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const API_BASE = import.meta.env.VITE_API_BASE || '';
      const user = JSON.parse(sessionStorage.getItem("currentUser") || '{}');
      const login = user?.login || localStorage.getItem('login') || '';

      const response = await fetch(`${API_BASE}/api/ask-${currentModel}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: userMsg.content, login }),
      });

      if (!response.ok) throw new Error(`Server xatosi: ${response.status}`);

      const data = await response.json();
      
      // Javobni tozalash
      const rawContent = data.answer || data.content || t("noResponse");
      const cleanedContent = cleanMarkdown(rawContent);
      
      const aiMsg: Message = { 
        role: 'ai', 
        content: cleanedContent, 
        timestamp: new Date().toISOString(),
        modelName: currentModel 
      };
      
      setMessages(prev => [...prev, aiMsg]);
    } catch (err: any) {
      setMessages(prev => [...prev, { 
        role: 'ai', 
        content: t("error", { message: err.message }), 
        timestamp: new Date().toISOString(),
        modelName: 'error'
      }]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    if (window.confirm(t("clearChatConfirm"))) {
      setMessages([]);
      localStorage.removeItem('ai_chat_history');
    }
  };

  return (
    <MainLayout theme={theme} title={t("title")}>
      <div style={{ 
        width: '100%',
        maxWidth: '100%',
        margin: '0 auto', 
        height: 'calc(100vh - 160px)', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '15px',
        padding: '0 20px'
      }}>
        
        {/* Header Panel */}
        <div style={{
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          padding: '12px 20px', 
          borderRadius: '24px', 
          zIndex: 1000, 
          position: 'relative',
          background: theme === 'dark' ? 'rgba(30, 41, 59, 0.6)' : 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(15px)', 
          border: `1px solid ${theme === 'dark' ? '#334155' : '#e2e8f0'}`,
          boxShadow: '0 8px 30px rgba(0,0,0,0.1)'
        }}>
          
          {/* Model Selector */}
          <div style={{ position: 'relative' }} ref={dropdownRef}>
            <button 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              style={{
                display: 'flex', 
                alignItems: 'center', 
                gap: '12px', 
                border: 'none',
                padding: '10px 18px', 
                borderRadius: '16px', 
                cursor: 'pointer',
                background: theme === 'dark' ? '#1e293b' : '#f1f5f9',
                color: theme === 'dark' ? '#f8fafc' : '#1e293b',
                transition: '0.2s'
              }}
            >
              <div style={{ 
                background: selectedAI === 'grok' && theme === 'light' ? '#000' : activeModel.color, 
                padding: '7px', 
                borderRadius: '10px', 
                display: 'flex', 
                color: 'white',
                boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
              }}>
                {activeModel.icon}
              </div>
              <div style={{ textAlign: 'left' }}>
                <span style={{ 
                  display: 'block', 
                  fontSize: '10px', 
                  opacity: 0.6, 
                  fontWeight: 800 
                }}>
                  {t("modelLabel")}
                </span>
                <span style={{ 
                  display: 'block', 
                  fontSize: '14px', 
                  fontWeight: 600 
                }}>
                  {activeModel.name}
                </span>
              </div>
              <ChevronDown 
                size={16} 
                style={{ 
                  transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', 
                  transition: '0.3s' 
                }} 
              />
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="dropdown-menu">
                {AI_MODELS.map((model) => (
                  <div
                    key={model.id}
                    className={`dropdown-item ${selectedAI === model.id ? 'active' : ''}`}
                    onClick={() => { 
                      setSelectedAI(model.id); 
                      setIsDropdownOpen(false); 
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ 
                        color: model.id === 'grok' && theme === 'light' ? '#000' : model.color, 
                        display: 'flex' 
                      }}>
                        {model.icon}
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '14px', fontWeight: 600 }}>
                          {model.name}
                        </span>
                        <span style={{ fontSize: '10px', opacity: 0.5 }}>
                          {model.provider}
                        </span>
                      </div>
                    </div>
                    {selectedAI === model.id && <Check size={16} color="#6366f1" />}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <button onClick={clearChat} className="clear-btn">
            <Trash2 size={20} />
          </button>
        </div>

        {/* Chat Window */}
        <div className="chat-window" style={{
          flex: 1, 
          overflowY: 'auto', 
          padding: '20px', 
          borderRadius: '28px',
          display: 'flex', 
          flexDirection: 'column', 
          gap: '15px',
          background: theme === 'dark' ? 'rgba(15, 23, 42, 0.4)' : '#f8fafc',
          border: `1px solid ${theme === 'dark' ? '#1e293b' : '#f1f5f9'}`
        }}>
          {messages.length === 0 && (
            <div style={{ 
              margin: 'auto', 
              textAlign: 'center', 
              color: '#64748b' 
            }}>
              <div className="pulse-icon">
                <Bot size={64} style={{ opacity: 0.4 }} />
              </div>
              <h3 style={{ marginTop: '15px' }}>{t("helpNeeded")}</h3>
              <p style={{ fontSize: '14px' }}>{t("selectModel")}</p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div 
              key={i} 
              style={{ 
                display: 'flex', 
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', 
                animation: 'slideIn 0.3s ease' 
              }}
            >
              <div style={{
                maxWidth: '85%', 
                padding: '14px 20px',
                borderRadius: msg.role === 'user' ? '22px 22px 4px 22px' : '22px 22px 22px 4px',
                background: msg.role === 'user' 
                  ? 'linear-gradient(135deg, #6366f1, #4f46e5)' 
                  : (theme === 'dark' ? '#1e293b' : '#ffffff'),
                color: msg.role === 'user' 
                  ? '#fff' 
                  : (theme === 'dark' ? '#e2e8f0' : '#1e293b'),
                border: msg.role === 'ai' 
                  ? `1px solid ${theme === 'dark' ? '#334155' : '#f1f5f9'}` 
                  : 'none'
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  marginBottom: '6px', 
                  opacity: 0.8 
                }}>
                  {msg.role === 'user' 
                    ? <User size={14} /> 
                    : <Sparkles size={14} color="#a855f7" />
                  }
                  <span style={{ fontSize: '10px', fontWeight: 800 }}>
                    {msg.role === 'user' 
                      ? '' 
                      : (AI_MODELS.find(m => m.id === msg.modelName)?.name.toUpperCase() || 'AI')
                    }
                  </span>
                </div>
                <div style={{ fontSize: '15px', whiteSpace: 'pre-wrap' }}>
                  {msg.content}
                </div>
              </div>
            </div>
          ))}
          
          {loading && (
            <div className="typing-indicator">
              <span></span><span></span><span></span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Form */}
        <form onSubmit={handleSend} style={{
          display: 'flex', 
          gap: '12px', 
          padding: '8px 8px 8px 18px', 
          borderRadius: '24px',
          background: theme === 'dark' ? '#1e293b' : '#fff',
          border: `1px solid ${theme === 'dark' ? '#334155' : '#e2e8f0'}`,
          boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
        }}>
          <input
            value={input} 
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("placeholder", { modelName: activeModel.name })}
            style={{ 
              flex: 1, 
              background: 'transparent', 
              border: 'none', 
              color: theme === 'dark' ? '#fff' : '#000', 
              outline: 'none', 
              fontSize: '16px' 
            }}
          />
          <button 
            type="submit" 
            disabled={loading || !input.trim()} 
            className="send-btn"
          >
            {loading ? <div className="spinner" /> : <Send size={20} />}
          </button>
        </form>
      </div>

      <style>{`
        .dropdown-menu {
          position: absolute; 
          top: calc(100% + 8px); 
          left: 0; 
          min-width: 240px;
          background: ${theme === 'dark' ? '#1e293b' : '#ffffff'};
          border-radius: 18px; 
          padding: 6px; 
          z-index: 1001;
          box-shadow: 0 10px 25px rgba(0,0,0,0.2);
          border: 1px solid ${theme === 'dark' ? '#334155' : '#e2e8f0'};
          display: flex; 
          flex-direction: column; 
          gap: 4px;
          animation: slideIn 0.2s ease-out;
        }
        
        .dropdown-item {
          display: flex; 
          align-items: center; 
          justify-content: space-between;
          padding: 10px 14px; 
          border-radius: 12px; 
          cursor: pointer; 
          transition: 0.2s;
          color: ${theme === 'dark' ? '#e2e8f0' : '#1e293b'};
        }
        
        .dropdown-item:hover { 
          background: ${theme === 'dark' ? '#334155' : '#f1f5f9'}; 
        }
        
        .dropdown-item.active { 
          background: ${theme === 'dark' ? 'rgba(99, 102, 241, 0.2)' : '#eef2ff'}; 
          color: #6366f1; 
        }
        
        .clear-btn { 
          background: ${theme === 'dark' ? 'rgba(239, 68, 68, 0.1)' : '#fff1f2'}; 
          border: none; 
          color: #ef4444; 
          padding: 10px; 
          border-radius: 14px; 
          cursor: pointer; 
          transition: 0.2s; 
        }
        
        .clear-btn:hover { 
          transform: scale(1.05); 
          background: #ef4444; 
          color: white; 
        }
        
        .send-btn { 
          background: linear-gradient(135deg, #6366f1, #a855f7); 
          color: white; 
          border: none; 
          width: 44px; 
          height: 44px; 
          border-radius: 16px; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          cursor: pointer; 
          transition: 0.2s;
        }
        
        .send-btn:disabled { 
          opacity: 0.5; 
          cursor: not-allowed; 
        }
        
        @keyframes slideIn { 
          from { opacity: 0; transform: translateY(10px); } 
          to { opacity: 1; transform: translateY(0); } 
        }
        
        .typing-indicator { 
          display: flex; 
          gap: 4px; 
          padding: 12px; 
        }
        
        .typing-indicator span { 
          width: 6px; 
          height: 6px; 
          background: #6366f1; 
          border-radius: 50%; 
          animation: bounce 1.4s infinite; 
          opacity: 0.6; 
        }
        
        .typing-indicator span:nth-child(2) { 
          animation-delay: 0.2s; 
        }
        
        .typing-indicator span:nth-child(3) { 
          animation-delay: 0.4s; 
        }
        
        @keyframes bounce { 
          0%, 80%, 100% { transform: scale(0); } 
          40% { transform: scale(1); } 
        }
        
        .spinner { 
          width: 20px; 
          height: 20px; 
          border: 2px solid #fff; 
          border-top-color: transparent; 
          border-radius: 50%; 
          animation: spin 0.8s linear infinite; 
        }
        
        @keyframes spin { 
          to { transform: rotate(360deg); } 
        }
        
        .pulse-icon { 
          animation: pulse 2s infinite; 
        }
        
        @keyframes pulse { 
          0% { transform: scale(1); } 
          50% { transform: scale(1.05); } 
          100% { transform: scale(1); } 
        }
      `}</style>
    </MainLayout>
  );
}

export default function Ai() {
  return (
    <TranslationProvider>
      <AiContent />
    </TranslationProvider>
  );
}