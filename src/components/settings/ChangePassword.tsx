import React, { useState } from 'react';
import { KeyRound, Eye, EyeOff } from "lucide-react";
import { useTranslation } from '../../components/languages/Settings';
import { api } from '../../utils/api';
import { getMemoryCsrfToken } from '../../api/axiosInstance'; // ✅ memory dan CSRF

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
}) => {
  const { t } = useTranslation();
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew]         = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  if (!isOpen) return null;

  // ✅ getLoginFromStorage() — BUTUNLAY O'CHIRILDI
  // ✅ login body dan o'chirildi — server req.user.login ishlatadi

  const handleSubmit = async () => {
    // ✅ Validatsiya — avval bo'sh tekshiruv, keyin qolganlari
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordMessage(`error:${t('errFillAll')}`);
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMessage(`error:${t('errPasswordShort')}`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage(`error:${t('errPasswordsNotMatch')}`);
      return;
    }
    if (currentPassword === newPassword) {
      setPasswordMessage(`error:${t('errPasswordSame')}`);
      return;
    }

    setPasswordLoading(true);
    setPasswordMessage("");

    try {
      const res = await api('/api/change-password', {
        method: 'POST',
        // ✅ api.ts endi avtomatik CSRF qo'shadi
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      // ✅ res.json() try-catch ichida — parse xatosi crash qilmasin
      let data: any = {};
      try {
        data = await res.json();
      } catch {
        // JSON parse xatosi — bo'sh qoladi
      }

      if (res.ok) {
        setPasswordMessage(`success:${t('successPasswordChanged')}`);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => { onClose(); }, 1500);
      } else {
        // ✅ null coalescing
        setPasswordMessage(`error:${data.message ?? t('errChangePasswordFailed')}`);
        if (res.status === 401) setCurrentPassword("");
      }
    } catch (err: any) {
      // ✅ console.error O'CHIRILDI — stack trace tashqariga chiqmasin
      let errorText = t('errUnexpected');
      if (err.name === 'TypeError' && err.message?.includes('fetch')) {
        errorText = t('errNoConnection');
      } else if (err.name === 'AbortError') {
        errorText = t('errTimeout');
      }
      setPasswordMessage(`error:${errorText}`);
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, backdropFilter: 'blur(8px)'
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: theme === 'dark'
            ? 'linear-gradient(135deg, #1a1f2e 0%, #252b3d 100%)'
            : 'linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%)',
          borderRadius: '24px', padding: '40px', width: '90%', maxWidth: '480px',
          border: `1px solid ${theme === 'dark' ? '#2a3144' : '#e2e8f0'}`,
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)'
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '72px', height: '72px', borderRadius: '20px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', marginBottom: '20px'
          }}>
            <KeyRound size={36} color="#fff" />
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 700, color: theme === 'dark' ? '#fff' : '#1a1f2e' }}>
            {t('changePasswordTitle')}
          </h2>
        </div>

        {/* Joriy parol */}
        <div style={{ marginBottom: '20px', position: 'relative' }}>
          <label style={{
            display: 'block', marginBottom: '8px', fontSize: '15px',
            color: theme === 'dark' ? '#8b92a7' : '#64748b'
          }}>
            {t('currentPasswordLabel')}
          </label>
          <input
            type={showCurrent ? "text" : "password"}
            value={currentPassword}
            onChange={e => setCurrentPassword(e.target.value)}
            placeholder="••••••••"
            disabled={passwordLoading}
            style={{
              width: '100%', padding: '16px 48px 16px 16px',
              borderRadius: '12px', boxSizing: 'border-box',
              border: `1px solid ${theme === 'dark' ? '#2a3144' : '#e2e8f0'}`,
              background: theme === 'dark' ? '#0f1420' : '#f8f9ff',
              color: theme === 'dark' ? '#fff' : '#1a1f2e',
              fontSize: '15px', outline: 'none'
            }}
          />
          <button
            type="button"
            onClick={() => setShowCurrent(!showCurrent)}
            style={{
              position: 'absolute', right: '16px', top: '42px',
              background: 'none', border: 'none', cursor: 'pointer',
              color: theme === 'dark' ? '#8b92a7' : '#64748b', padding: 0
            }}
          >
            {showCurrent ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>

        {/* Yangi parol */}
        <div style={{ marginBottom: '20px', position: 'relative' }}>
          <label style={{
            display: 'block', marginBottom: '8px', fontSize: '15px',
            color: theme === 'dark' ? '#8b92a7' : '#64748b'
          }}>
            {t('newPasswordLabel')}
          </label>
          <input
            type={showNew ? "text" : "password"}
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            placeholder="••••••••"
            disabled={passwordLoading}
            style={{
              width: '100%', padding: '16px 48px 16px 16px',
              borderRadius: '12px', boxSizing: 'border-box',
              border: `1px solid ${theme === 'dark' ? '#2a3144' : '#e2e8f0'}`,
              background: theme === 'dark' ? '#0f1420' : '#f8f9ff',
              color: theme === 'dark' ? '#fff' : '#1a1f2e',
              fontSize: '15px', outline: 'none'
            }}
          />
          <button
            type="button"
            onClick={() => setShowNew(!showNew)}
            style={{
              position: 'absolute', right: '16px', top: '42px',
              background: 'none', border: 'none', cursor: 'pointer',
              color: theme === 'dark' ? '#8b92a7' : '#64748b', padding: 0
            }}
          >
            {showNew ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>

        {/* Tasdiqlash paroli */}
        <div style={{ marginBottom: '24px', position: 'relative' }}>
          <label style={{
            display: 'block', marginBottom: '8px', fontSize: '15px',
            color: theme === 'dark' ? '#8b92a7' : '#64748b'
          }}>
            {t('confirmPasswordLabel')}
          </label>
          <input
            type={showConfirm ? "text" : "password"}
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            disabled={passwordLoading}
            style={{
              width: '100%', padding: '16px 48px 16px 16px',
              borderRadius: '12px', boxSizing: 'border-box',
              border: `1px solid ${theme === 'dark' ? '#2a3144' : '#e2e8f0'}`,
              background: theme === 'dark' ? '#0f1420' : '#f8f9ff',
              color: theme === 'dark' ? '#fff' : '#1a1f2e',
              fontSize: '15px', outline: 'none'
            }}
          />
          <button
            type="button"
            onClick={() => setShowConfirm(!showConfirm)}
            style={{
              position: 'absolute', right: '16px', top: '42px',
              background: 'none', border: 'none', cursor: 'pointer',
              color: theme === 'dark' ? '#8b92a7' : '#64748b', padding: 0
            }}
          >
            {showConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>

        {/* Xabar */}
        {passwordMessage && (
          <div style={{
            padding: '12px 16px', borderRadius: '12px', marginBottom: '24px',
            background: passwordMessage.startsWith('success:')
              ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
            border: `1px solid ${passwordMessage.startsWith('success:')
              ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
            color: passwordMessage.startsWith('success:') ? '#10b981' : '#ef4444',
            fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px'
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
              flex: 1, padding: '16px', borderRadius: '12px',
              fontSize: '16px', fontWeight: 600,
              background: theme === 'dark' ? '#1a1f2e' : '#f1f5f9',
              color: theme === 'dark' ? '#e2e8f0' : '#1e293b',
              border: `1px solid ${theme === 'dark' ? '#2a3144' : '#e2e8f0'}`,
              cursor: passwordLoading ? 'not-allowed' : 'pointer',
              opacity: passwordLoading ? 0.7 : 1
            }}
          >
            {t('cancelBtn')}
          </button>

          <button
            onClick={handleSubmit}
            disabled={passwordLoading || !currentPassword || !newPassword || !confirmPassword}
            style={{
              flex: 2, padding: '16px', border: 'none', borderRadius: '12px',
              fontSize: '16px', fontWeight: 600,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: '#fff',
              cursor: (passwordLoading || !currentPassword || !newPassword || !confirmPassword)
                ? 'not-allowed' : 'pointer',
              opacity: passwordLoading ? 0.7 : 1
            }}
          >
            {passwordLoading ? t('savingBtn') : t('saveBtn')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChangePasswordModal;