import React, { useState } from 'react';
import { KeyRound, Eye, EyeOff } from "lucide-react";
import { useTranslation } from '../../components/languages/Settings';
import { api } from '../../utils/api';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: 'dark' | 'light';
  currentPassword: string;
  setCurrentPassword: React.Dispatch<React.SetStateAction<string>>;
  newPassword: string;
  setNewPassword: React.Dispatch<React.SetStateAction<string>>;
  confirmPassword: string;
  setConfirmPassword: React.Dispatch<React.SetStateAction<string>>;
  passwordLoading: boolean;
  setPasswordLoading: React.Dispatch<React.SetStateAction<boolean>>;
  passwordMessage: string;
  setPasswordMessage: React.Dispatch<React.SetStateAction<string>>;
  csrfToken?: string;           // Backenddan olingan token (muhim!)
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
  theme,
  currentPassword,
  setCurrentPassword,
  newPassword,
  setNewPassword,
  confirmPassword,
  setConfirmPassword,
  passwordLoading,
  setPasswordLoading,
  passwordMessage,
  setPasswordMessage,
  csrfToken,                    // ← bu prop endi ishlatiladi
}) => {
  const { t } = useTranslation();

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  if (!isOpen) return null;

  const getLoginFromStorage = (): string | null => {
    let login = localStorage.getItem('currentLogin');
    if (login) return login;

    login = localStorage.getItem('activeUser');
    if (login) return login;

    try {
      const currentUserStr = sessionStorage.getItem('currentUser');
      if (currentUserStr) {
        const user = JSON.parse(currentUserStr);
        if (user?.login) return user.login;
      }
    } catch (e) {
      console.warn('currentUser parse xatosi:', e);
    }

    login = localStorage.getItem('login');
    if (login) return login;

    return null;
  };

  const handleSubmit = async () => {
    // 1. Frontend validatsiyalari
    if (newPassword !== confirmPassword) {
      setPasswordMessage(t("error:Yangi parollar mos emas"));
      return;
    }

    if (newPassword.length < 6) {
      setPasswordMessage(t("error:Parol kamida 6 belgidan iborat bo'lishi kerak"));
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordMessage(t("error:Yangi parol joriy paroldan farq qilishi kerak"));
      return;
    }

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordMessage(t("error:Barcha maydonlarni to'ldiring"));
      return;
    }

    const rawLogin = getLoginFromStorage();

    if (!rawLogin) {
      setPasswordMessage(t("error:Foydalanuvchi ma'lumotlari topilmadi. Qayta kirish kerak"));
      console.error('Login topilmadi. Storage holati:', {
        currentLogin: localStorage.getItem('currentLogin'),
        activeUser: localStorage.getItem('activeUser'),
        login: localStorage.getItem('login'),
        currentUser: sessionStorage.getItem('currentUser')
      });
      return;
    }

    const login = rawLogin.trim().toLowerCase();

    // 3. So'rovni yuborish
    setPasswordLoading(true);
    setPasswordMessage("");

    try {
      console.log(`🔄 Parol o'zgartirish so'rovi: ${login}`);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // CSRF tokenni header'ga qo'shamiz (agar mavjud bo'lsa)
      if (csrfToken) {
        headers['X-CSRF-Token'] = csrfToken;
      } else {
        // Fallback: localStorage'dan olish (masalan global saqlangan bo'lsa)
        const fallbackToken = localStorage.getItem('csrfToken');
        if (fallbackToken) {
          headers['X-CSRF-Token'] = fallbackToken;
        }
      }

      const res = await api('/api/change-password', {
        method: 'POST',
        credentials: 'include',           // Cookie va session uchun muhim
        headers,
        body: JSON.stringify({
          login,
          currentPassword,
          newPassword
        })
      });

      const data = await res.json();

      if (res.ok) {
        setPasswordMessage(t("success:Parol muvaffaqiyatli o'zgartirildi!"));

        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");

        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        const errMsg = data.message || t("Parolni o'zgartirishda xato yuz berdi");
        setPasswordMessage(`error:${errMsg}`);

        if (res.status === 401 || errMsg.toLowerCase().includes('joriy parol') || errMsg.toLowerCase().includes('notoʻgʻri')) {
          setCurrentPassword("");
        }

        // Agar CSRF xatosi bo'lsa, log qilish
        if (data.message?.includes('CSRF') || res.status === 403) {
          console.warn('CSRF token muammosi aniqlandi. Token:', csrfToken);
        }
      }
    } catch (err: any) {
      console.error('❌ Parol o\'zgartirish xatosi:', err);

      let errorText = t("Kutilmagan xato yuz berdi");

      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        errorText = t("Server bilan aloqa yo'q. Internetni tekshiring");
      } else if (err.name === 'AbortError') {
        errorText = t("So'rov vaqti tugadi");
      }

      setPasswordMessage(`error:${errorText}`);
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        backdropFilter: 'blur(8px)'
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: theme === 'dark'
            ? 'linear-gradient(135deg, #1a1f2e 0%, #252b3d 100%)'
            : 'linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%)',
          borderRadius: '24px',
          padding: '40px',
          width: '90%',
          maxWidth: '480px',
          border: `1px solid ${theme === 'dark' ? '#2a3144' : '#e2e8f0'}`,
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)'
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '72px',
            height: '72px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            marginBottom: '20px'
          }}>
            <KeyRound size={36} color="#fff" />
          </div>
          <h2 style={{
            fontSize: '24px',
            fontWeight: 700,
            color: theme === 'dark' ? '#fff' : '#1a1f2e'
          }}>
            {t('Parolni o\'zgartirish')}
          </h2>
        </div>

        {/* Joriy parol */}
        <div style={{ marginBottom: '20px', position: 'relative' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontSize: '15px',
            color: theme === 'dark' ? '#8b92a7' : '#64748b'
          }}>
            {t('Joriy parol')}
          </label>
          <input
            type={showCurrent ? "text" : "password"}
            value={currentPassword}
            onChange={e => setCurrentPassword(e.target.value)}
            placeholder="••••••••"
            disabled={passwordLoading}
            style={{
              width: '87%',
              padding: '16px 48px 16px 16px',
              borderRadius: '12px',
              border: `1px solid ${theme === 'dark' ? '#2a3144' : '#e2e8f0'}`,
              background: theme === 'dark' ? '#0f1420' : '#f8f9ff',
              color: theme === 'dark' ? '#fff' : '#1a1f2e',
              fontSize: '15px',
              outline: 'none'
            }}
          />
          <button
            type="button"
            onClick={() => setShowCurrent(!showCurrent)}
            disabled={passwordLoading}
            style={{
              position: 'absolute',
              right: '16px',
              top: '38px',
              background: 'none',
              border: 'none',
              cursor: passwordLoading ? 'not-allowed' : 'pointer',
              color: theme === 'dark' ? '#8b92a7' : '#64748b'
            }}
          >
            {showCurrent ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>

        {/* Yangi parol */}
        <div style={{ marginBottom: '20px', position: 'relative' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontSize: '15px',
            color: theme === 'dark' ? '#8b92a7' : '#64748b'
          }}>
            {t('Yangi parol')}
          </label>
          <input
            type={showNew ? "text" : "password"}
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            placeholder="••••••••"
            disabled={passwordLoading}
            style={{
              width: '87%',
              padding: '16px 48px 16px 16px',
              borderRadius: '12px',
              border: `1px solid ${theme === 'dark' ? '#2a3144' : '#e2e8f0'}`,
              background: theme === 'dark' ? '#0f1420' : '#f8f9ff',
              color: theme === 'dark' ? '#fff' : '#1a1f2e',
              fontSize: '15px',
              outline: 'none'
            }}
          />
          <button
            type="button"
            onClick={() => setShowNew(!showNew)}
            disabled={passwordLoading}
            style={{
              position: 'absolute',
              right: '16px',
              top: '38px',
              background: 'none',
              border: 'none',
              cursor: passwordLoading ? 'not-allowed' : 'pointer',
              color: theme === 'dark' ? '#8b92a7' : '#64748b'
            }}
          >
            {showNew ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>

        {/* Tasdiqlash paroli */}
        <div style={{ marginBottom: '24px', position: 'relative' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontSize: '15px',
            color: theme === 'dark' ? '#8b92a7' : '#64748b'
          }}>
            {t('Yangi parolni tasdiqlang')}
          </label>
          <input
            type={showConfirm ? "text" : "password"}
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            disabled={passwordLoading}
            style={{
              width: '87%',
              padding: '16px 48px 16px 16px',
              borderRadius: '12px',
              border: `1px solid ${theme === 'dark' ? '#2a3144' : '#e2e8f0'}`,
              background: theme === 'dark' ? '#0f1420' : '#f8f9ff',
              color: theme === 'dark' ? '#fff' : '#1a1f2e',
              fontSize: '15px',
              outline: 'none'
            }}
          />
          <button
            type="button"
            onClick={() => setShowConfirm(!showConfirm)}
            disabled={passwordLoading}
            style={{
              position: 'absolute',
              right: '16px',
              top: '38px',
              background: 'none',
              border: 'none',
              cursor: passwordLoading ? 'not-allowed' : 'pointer',
              color: theme === 'dark' ? '#8b92a7' : '#64748b'
            }}
          >
            {showConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>

        {/* Xabar ko'rsatish */}
        {passwordMessage && (
          <div style={{
            padding: '12px 16px',
            borderRadius: '12px',
            marginBottom: '24px',
            background: passwordMessage.startsWith('success:')
              ? 'rgba(16,185,129,0.1)'
              : 'rgba(239,68,68,0.1)',
            border: `1px solid ${passwordMessage.startsWith('success:')
                ? 'rgba(16,185,129,0.3)'
                : 'rgba(239,68,68,0.3)'}`,
            color: passwordMessage.startsWith('success:') ? '#10b981' : '#ef4444',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            {passwordMessage.replace(/^(success|error):/, '').trim()}
          </div>
        )}

        {/* Tugmalar */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={onClose}
            disabled={passwordLoading}
            style={{
              flex: 1,
              padding: '16px',
              background: theme === 'dark' ? '#1a1f2e' : '#f1f5f9',
              color: theme === 'dark' ? '#e2e8f0' : '#1e293b',
              border: `1px solid ${theme === 'dark' ? '#2a3144' : '#e2e8f0'}`,
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: 600,
              cursor: passwordLoading ? 'not-allowed' : 'pointer',
              opacity: passwordLoading ? 0.7 : 1
            }}
          >
            {t('Bekor qilish')}
          </button>

          <button
            onClick={handleSubmit}
            disabled={passwordLoading || !currentPassword || !newPassword || !confirmPassword}
            style={{
              flex: 2,
              padding: '16px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: 600,
              cursor: (passwordLoading || !currentPassword || !newPassword || !confirmPassword)
                ? 'not-allowed'
                : 'pointer',
              opacity: (passwordLoading || !currentPassword || !newPassword || !confirmPassword)
                ? 0.7
                : 1
            }}
          >
            {passwordLoading ? t('Saqlanmoqda...') : t("O'zgartirish")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChangePasswordModal;