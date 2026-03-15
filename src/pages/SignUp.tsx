// src/pages/SignUp.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Eye, EyeOff, Bell, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function SignUp() {
  const navigate = useNavigate();

  const [userImage, setUserImage] = useState<string | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hoveredCard, setHoveredCard] = useState(false);

  useEffect(() => {
    const savedImage = localStorage.getItem('userImage');
    if (savedImage) setUserImage(savedImage);

    const savedTheme = (localStorage.getItem('theme') as 'dark' | 'light') || 'dark';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const src = ev.target?.result as string;
        setUserImage(src);
        localStorage.setItem('userImage', src);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGoogleSignUp = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin + '/menu' },
      });
      if (error) throw error;
    } catch (error: any) {
      alert('Google bilan ro‘yxatdan o‘tishda xato: ' + error.message);
      setLoading(false);
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!fullName.trim() || !email.includes('@') || password.length < 8) {
      alert('Iltimos, barcha maydonlarni to‘g‘ri to‘ldiring. Parol kamida 8 belgi bo‘lishi kerak.');
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: window.location.origin + '/menu',
      },
    });

    if (error) {
      alert('Xato: ' + error.message);
    } else if (data.user && !data.session) {
      alert('Ro‘yxatdan o‘tdingiz! Emailingizni tasdiqlang.');
    } else {
      alert('Hisob muvaffaqiyatli yaratildi!');
      navigate('/menu');
    }
    setLoading(false);
  };
  return (
    <div className="min-h-screen overflow-x-hidden font-sans" style={{
      background: theme === 'dark' ? '#0a0e1a' : '#f8f9ff',
      color: theme === 'dark' ? '#fff' : '#1a1f2e',
      margin: '-8px'
    }}>
     

      <main style={{minHeight: '100vh' , paddingTop: '20px' }}>
       

        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div
            onMouseEnter={() => setHoveredCard(true)}
            onMouseLeave={() => setHoveredCard(false)}
            style={{
              background: theme === 'dark' ? 'linear-gradient(135deg, #1a1f2e 0%, #252b3d 100%)' : 'linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%)',
              borderRadius: '20px', padding: '40px',
              border: hoveredCard ? '1px solid #667eea' : `1px solid ${theme === 'dark' ? '#2a3144' : '#e2e8f0'}`,
              transition: 'all 0.3s ease',
              transform: hoveredCard ? 'translateY(-4px)' : 'translateY(0)',
              boxShadow: hoveredCard ? '0 12px 32px rgba(102,126,234,0.25)' : 'none'
            }}
          >
            <h2 style={{ fontSize: '24px', fontWeight: 600, textAlign: 'center', marginBottom: '32px' }}>
              Yangi hisob yarating
            </h2>

           

            

            <form onSubmit={handleEmailSignUp} style={{ display: 'grid', gap: '24px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '12px', fontSize: '15px', color: theme === 'dark' ? '#8b92a7' : '#64748b' }}>To'liq ism</label>
                <div style={{ position: 'relative' }}>
                  <User style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#667eea' }} size={20} />
                  <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Ismingiz Familiyangiz" required style={{
                    width: '90%', padding: '16px 16px 16px 48px',
                    background: theme === 'dark' ? '#0f1420' : '#f8f9ff',
                    border: `1px solid ${theme === 'dark' ? '#2a3144' : '#e2e8f0'}`,
                    borderRadius: '12px', color: theme === 'dark' ? '#fff' : '#1a1f2e', fontSize: '15px'
                  }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '12px', fontSize: '15px', color: theme === 'dark' ? '#8b92a7' : '#64748b' }}>Email</label>
                <div style={{ position: 'relative' }}>
                  <Mail style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#667eea' }} size={20} />
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email manzilingiz" required autoComplete="email" style={{
                    width: '90%', padding: '16px 16px 16px 48px',
                    background: theme === 'dark' ? '#0f1420' : '#f8f9ff',
                    border: `1px solid ${theme === 'dark' ? '#2a3144' : '#e2e8f0'}`,
                    borderRadius: '12px', color: theme === 'dark' ? '#fff' : '#1a1f2e', fontSize: '15px'
                  }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '12px', fontSize: '15px', color: theme === 'dark' ? '#8b92a7' : '#64748b' }}>Parol</label>
                <div style={{ position: 'relative' }}>
                  <Lock style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#667eea' }} size={20} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    style={{
                      width: '83%', padding: '16px 48px 16px 48px',
                      background: theme === 'dark' ? '#0f1420' : '#f8f9ff',
                      border: `1px solid ${theme === 'dark' ? '#2a3144' : '#e2e8f0'}`,
                      borderRadius: '12px', color: theme === 'dark' ? '#fff' : '#1a1f2e', fontSize: '15px'
                    }}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer' }}>
                    {showPassword ? <EyeOff size={20} color="#8b92a7" /> : <Eye size={20} color="#8b92a7" />}
                  </button>
                </div>
                <p style={{ fontSize: '13px', color: theme === 'dark' ? '#8b92a7' : '#64748b', marginTop: '8px' }}>Kamida 8 belgi bo‘lishi kerak</p>
              </div>

              <button type="submit" disabled={loading} style={{
                width: '100%', padding: '16px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: '#fff', border: 'none', borderRadius: '12px',
                fontSize: '16px', fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.8 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px'
              }}>
                {loading ? 'Yaratilmoqda...' : 'Hisob yaratish'}
                <ArrowRight size={20} />
              </button>
            </form>

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
 <button
              onClick={handleGoogleSignUp}
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
            <div style={{ marginTop: '28px', textAlign: 'center', }}>
              <span style={{  color: theme === 'dark' ? '#8b92a7' : '#64748b' }}>Allaqachon hisobingiz bormi? </span>
              <button onClick={() => navigate('/signin')} style={{ color: '#667eea', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Kirish
              </button>
              
            </div>
          </div>
        </div>
      </main> 
    </div>
  );
}