// src/pages/Login.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowRight, LogIn } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Login() {
  const navigate = useNavigate();

  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hoveredCard, setHoveredCard] = useState(false);

  useEffect(() => {
    const savedTheme = (localStorage.getItem('theme') as 'dark' | 'light') || 'dark';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/menu`,
        },
      });

      if (error) {
        console.error('Google OAuth xatosi:', error);
        alert('Google bilan kirishda xato: ' + error.message);
        setLoading(false);
      }
    } catch (err: any) {
      console.error('Kutilmagan xato:', err);
      alert('Google bilan kirishda xato: ' + (err.message || 'Noma\'lum xato'));
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      alert('Xato: ' + error.message);
      setLoading(false);
    } else {
      alert('Muvaffaqiyatli kirildi!');
      navigate('/menu');
    }
  };

  return (
    <div
      className="min-h-screen overflow-x-hidden font-sans"
      style={{
        background: theme === 'dark' ? '#0a0e1a' : '#f8f9ff',
        minHeight: '100vh',
        margin: '-8px',
        color: theme === 'dark' ? '#fff' : '#1a1f2e',
        transition: 'background 0.3s ease, color 0.3s ease',
      }}
    >
      <main style={{ minHeight: '100vh', paddingTop: '20px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', padding: '0 20px' }}>
          <div
            onMouseEnter={() => setHoveredCard(true)}
            onMouseLeave={() => setHoveredCard(false)}
            style={{
              background:
                theme === 'dark'
                  ? 'linear-gradient(135deg, #1a1f2e 0%, #252b3d 100%)'
                  : 'linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%)',
              borderRadius: '20px',
              padding: '40px',
              border: hoveredCard
                ? '1px solid #667eea'
                : `1px solid ${theme === 'dark' ? '#2a3144' : '#e2e8f0'}`,
              transition: 'all 0.3s ease',
              transform: hoveredCard ? 'translateY(-4px)' : 'translateY(0)',
              boxShadow: hoveredCard ? '0 12px 32px rgba(102,126,234,0.25)' : 'none',
            }}
          >
            {/* Sarlavha */}
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '64px',
                  height: '64px',
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  marginBottom: '16px',
                }}
              >
                <LogIn size={32} color="#fff" />
              </div>
              <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '8px' }}>
                Xush kelibsiz!
              </h2>
              <p style={{ color: theme === 'dark' ? '#8b92a7' : '#64748b', fontSize: '15px' }}>
                Davom etish uchun hisobingizga kiring
              </p>
            </div>

            {/* Email forma */}
            <form onSubmit={handleEmailLogin} style={{ display: 'grid', gap: '24px' }}>
              {/* Email */}
              <div>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '12px',
                    fontSize: '15px',
                    color: theme === 'dark' ? '#8b92a7' : '#64748b',
                  }}
                >
                  Email
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail
                    style={{
                      position: 'absolute',
                      left: '16px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#667eea',
                    }}
                    size={20}
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email manzilingiz"
                    required
                    autoComplete="email"
                    style={{
                      width: '100%',
                      padding: '16px 16px 16px 48px',
                      background: theme === 'dark' ? '#0f1420' : '#f8f9ff',
                      border: `1px solid ${theme === 'dark' ? '#2a3144' : '#e2e8f0'}`,
                      borderRadius: '12px',
                      color: theme === 'dark' ? '#fff' : '#1a1f2e',
                      fontSize: '15px',
                      boxSizing: 'border-box',
                      outline: 'none',
                      transition: 'border-color 0.2s ease',
                    }}
                    onFocus={(e) => (e.target.style.borderColor = '#667eea')}
                    onBlur={(e) =>
                      (e.target.style.borderColor = theme === 'dark' ? '#2a3144' : '#e2e8f0')
                    }
                  />
                </div>
              </div>

              {/* Parol */}
              <div>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '12px',
                    fontSize: '15px',
                    color: theme === 'dark' ? '#8b92a7' : '#64748b',
                  }}
                >
                  Parol
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock
                    style={{
                      position: 'absolute',
                      left: '16px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#667eea',
                    }}
                    size={20}
                  />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                    required
                    autoComplete="current-password"
                    style={{
                      width: '100%',
                      padding: '16px 48px 16px 48px',
                      background: theme === 'dark' ? '#0f1420' : '#f8f9ff',
                      border: `1px solid ${theme === 'dark' ? '#2a3144' : '#e2e8f0'}`,
                      borderRadius: '12px',
                      color: theme === 'dark' ? '#fff' : '#1a1f2e',
                      fontSize: '15px',
                      boxSizing: 'border-box',
                      outline: 'none',
                      transition: 'border-color 0.2s ease',
                    }}
                    onFocus={(e) => (e.target.style.borderColor = '#667eea')}
                    onBlur={(e) =>
                      (e.target.style.borderColor = theme === 'dark' ? '#2a3144' : '#e2e8f0')
                    }
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '16px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '4px',
                    }}
                  >
                    {showPassword ? (
                      <EyeOff size={20} color="#8b92a7" />
                    ) : (
                      <Eye size={20} color="#8b92a7" />
                    )}
                  </button>
                </div>
              </div>

              {/* Parolni unutdingizmi? */}
              <div style={{ textAlign: 'right' }}>
                <button
                  type="button"
                  onClick={() => navigate('/forgot-password')}
                  style={{
                    color: '#667eea',
                    fontSize: '14px',
                    fontWeight: 500,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    textDecoration: 'none',
                  }}
                >
                  Parolni unutdingizmi?
                </button>
              </div>

              {/* Kirish tugmasi */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '16px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.8 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  transition: 'opacity 0.2s ease, transform 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  if (!loading) e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {loading ? 'Kirilmoqda...' : 'Kirish'}
                <ArrowRight size={20} />
              </button>
            </form>

            {/* Yoki */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                marginTop: '24px',
                marginBottom: '24px',
              }}
            >
              <div
                style={{
                  flex: 1,
                  height: '1px',
                  background: theme === 'dark' ? '#2a3144' : '#e2e8f0',
                }}
              />
              <span style={{ color: theme === 'dark' ? '#8b92a7' : '#64748b', fontSize: '14px' }}>
                yoki
              </span>
              <div
                style={{
                  flex: 1,
                  height: '1px',
                  background: theme === 'dark' ? '#2a3144' : '#e2e8f0',
                }}
              />
            </div>

            {/* Google tugmasi */}
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              style={{
                width: '100%',
                padding: '14px',
                background: theme === 'dark' ? '#0f1420' : '#f8f9ff',
                border: `1px solid ${theme === 'dark' ? '#2a3144' : '#e2e8f0'}`,
                borderRadius: '12px',
                color: theme === 'dark' ? '#fff' : '#1a1f2e',
                fontSize: '15px',
                fontWeight: 500,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                opacity: loading ? 0.7 : 1,
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.borderColor = '#667eea';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = theme === 'dark' ? '#2a3144' : '#e2e8f0';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Google bilan kirish
            </button>
            {/* ShoxPosPro tugmasi */}
{/* ShoxPosPro tugmasi */}
<button
  onClick={() => navigate('/login')}
  disabled={loading}
  style={{
    width: '100%',
    padding: '6px',
    marginTop: '10px',
    background: theme === 'dark' ? '#0f1420' : '#f8f9ff',
    border: `1px solid ${theme === 'dark' ? '#2a3144' : '#e2e8f0'}`,
    borderRadius: '12px',
    color: theme === 'dark' ? '#fff' : '#1a1f2e',
    fontSize: '14px',
    fontWeight: 400,
    cursor: loading ? 'not-allowed' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: loading ? 0.7 : 1,
    transition: 'all 0.2s ease',
  }}
  onMouseEnter={(e) => {
    if (!loading) {
      e.currentTarget.style.borderColor = '#667eea';
      e.currentTarget.style.transform = 'translateY(-2px)';
    }
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.borderColor = theme === 'dark' ? '#2a3144' : '#e2e8f0';
    e.currentTarget.style.transform = 'translateY(0)';
  }}
>
  <img 
    src="/ShoxPosProLogo.png" 
    alt="ShoxPosPro Logo" 
    style={{
      width: '40px',
      height: '40px',
      objectFit: 'contain'
    }}
  />
  ShoxPosPro bilan kirish
</button>
            {/* Ro'yxatdan o'tish havolasi */}
            <div style={{ textAlign: 'center', marginTop: '24px' }}>
              <span style={{ color: theme === 'dark' ? '#8b92a7' : '#64748b' }}>
                Hisobingiz yo'qmi?{' '}
              </span>
              <button
                onClick={() => navigate('/signup')}
                style={{
                  color: '#667eea',
                  fontWeight: 600,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  textDecoration: 'none',
                }}
              >
                Ro'yxatdan o'tish
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}