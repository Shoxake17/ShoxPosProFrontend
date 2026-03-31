import React, { useState } from 'react';
import { KeyRound, Eye, EyeOff, Lock, ChevronRight } from "lucide-react";
import { useTranslation } from '../../components/languages/Settings';
import { api } from '../../utils/api';

interface ChangePasswordProps {
  theme: 'dark' | 'light';
  hoveredSetting: string | null;
  setHoveredSetting: React.Dispatch<React.SetStateAction<string | null>>;
  idx: string;
}

const ChangePassword: React.FC<ChangePasswordProps> = ({ 
  theme, 
  hoveredSetting, 
  setHoveredSetting, 
  idx 
}) => {
  const { t } = useTranslation();
  
  // Modal va Form state-lari
  const [isOpen, setIsOpen] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");

  const handleClose = () => {
    setIsOpen(false);
    setPasswordMessage("");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleSubmit = async () => {
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
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      let data: any = {};
      try { data = await res.json(); } catch { }

      if (res.ok) {
        setPasswordMessage(`success:${t('successPasswordChanged')}`);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => { handleClose(); }, 1500);
      } else {
        setPasswordMessage(`error:${data.message ?? t('errChangePasswordFailed')}`);
        if (res.status === 401) setCurrentPassword("");
      }
    } catch (err: any) {
      let errorText = t('errUnexpected');
      if (err.name === 'TypeError' && err.message?.includes('fetch')) {
        errorText = t('errNoConnection');
      }
      setPasswordMessage(`error:${errorText}`);
    } finally {
      setPasswordLoading(false);
    }
  };

return (
    <>
      {/* ─── Sozlamalar Kartasi (Tuzatilgan ko'rinish) ─── */}
      <div
        onMouseEnter={() => setHoveredSetting(idx)}
        onMouseLeave={() => setHoveredSetting(null)}
        onClick={() => setIsOpen(true)}
        style={{
          background: theme === 'dark' 
            ? 'linear-gradient(135deg, #1a1f2e 0%, #252b3d 100%)' 
            : 'linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%)',
          borderRadius: '16px', 
          padding: '32px 20px 20px 20px', // Tepadan paddingni 32px qildik (matn pastga tushishi uchun)
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          border: hoveredSetting === idx 
            ? '1px solid #667eea' 
            : `1px solid ${theme === 'dark' ? '#2a3144' : '#e2e8f0'}`,
          transform: hoveredSetting === idx ? 'translateY(-2px)' : 'translateY(0)',
          boxShadow: hoveredSetting === idx ? '0 8px 24px rgba(102,126,234,0.2)' : 'none',
          display: 'flex',
          flexDirection: 'column',
          // justifyContent: 'center' — BU OLIB TASHLANDI (o'rtada turmasligi uchun)
          minHeight: '140px', 
          boxSizing: 'border-box'
        }}
      >
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '12px',
            background: theme === 'dark' ? 'rgba(102,126,234,0.1)' : 'rgba(79,70,229,0.1)',
            color: '#667eea', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            <Lock size={22} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ 
              fontSize: '20px', // Boshqalari bilan bir xil qilish uchun biroz kattalashtirdik
              fontWeight: 700, 
              color: theme === 'dark' ? '#fff' : '#1a1f2e', 
              margin: '0 0 6px 0' 
            }}>
              {t('changePassword')}
            </h3>
            <p style={{ 
              fontSize: '14px', 
              color: theme === 'dark' ? '#8b92a7' : '#64748b', 
              margin: 0, 
              lineHeight: '1.5',
              opacity: 0.9 
            }}>
              {t('changePasswordDescription')}
            </p>
          </div>

          <ChevronRight size={20} color={theme === 'dark' ? '#8b92a7' : '#64748b'} style={{ flexShrink: 0, marginTop: '8px' }} />
        </div>
      </div>


      {/* ─── Parol Almashtirish Modali ─── */}
      {isOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(8px)' }}
          onClick={handleClose}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ 
              background: theme === 'dark' ? '#1a1f2e' : '#fff', 
              borderRadius: '24px', 
              padding: '40px', 
              width: '90%', 
              maxWidth: '480px', 
              border: `1px solid ${theme === 'dark' ? '#2a3144' : '#e2e8f0'}`, 
              boxShadow: '0 20px 60px rgba(0,0,0,0.4)' 
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '72px', height: '72px', borderRadius: '20px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', marginBottom: '20px' }}>
                <KeyRound size={36} color="#fff" />
              </div>
              <h2 style={{ fontSize: '24px', fontWeight: 700, color: theme === 'dark' ? '#fff' : '#1a1f2e' }}>
                {t('changePasswordTitle')}
              </h2>
            </div>

            {/* Inputlar qatori */}
            {[
              { label: t('currentPasswordLabel'), val: currentPassword, set: setCurrentPassword, show: showCurrent, setShow: setShowCurrent },
              { label: t('newPasswordLabel'), val: newPassword, set: setNewPassword, show: showNew, setShow: setShowNew },
              { label: t('confirmPasswordLabel'), val: confirmPassword, set: setConfirmPassword, show: showConfirm, setShow: setShowConfirm }
            ].map((input, i) => (
              <div key={i} style={{ marginBottom: '20px', position: 'relative' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '15px', color: theme === 'dark' ? '#8b92a7' : '#64748b' }}>
                  {input.label}
                </label>
                <input
                  type={input.show ? "text" : "password"}
                  value={input.val}
                  onChange={e => input.set(e.target.value)}
                  placeholder="••••••••"
                  disabled={passwordLoading}
                  style={{
                    width: '100%', padding: '16px 48px 16px 16px', borderRadius: '12px',
                    background: theme === 'dark' ? '#0f1420' : '#f8f9ff',
                    border: `1px solid ${theme === 'dark' ? '#2a3144' : '#e2e8f0'}`,
                    color: theme === 'dark' ? '#fff' : '#1a1f2e', fontSize: '15px', outline: 'none', boxSizing: 'border-box'
                  }}
                />
                <button
                  type="button"
                  onClick={() => input.setShow(!input.show)}
                  style={{ position: 'absolute', right: '16px', top: '42px', background: 'none', border: 'none', cursor: 'pointer', color: theme === 'dark' ? '#8b92a7' : '#64748b' }}
                >
                  {input.show ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            ))}

            {passwordMessage && (
              <div style={{
                padding: '12px 16px', borderRadius: '12px', marginBottom: '24px',
                background: passwordMessage.startsWith('success:') ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                color: passwordMessage.startsWith('success:') ? '#10b981' : '#ef4444',
                fontSize: '14px', border: `1px solid ${passwordMessage.startsWith('success:') ? '#10b98150' : '#ef444450'}`
              }}>
                {passwordMessage.replace(/^(success|error):/, '').trim()}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button 
                onClick={handleClose} 
                disabled={passwordLoading}
                style={{ flex: 1, padding: '16px', borderRadius: '12px', background: theme === 'dark' ? '#1a1f2e' : '#f1f5f9', color: theme === 'dark' ? '#e2e8f0' : '#1e293b', border: `1px solid ${theme === 'dark' ? '#2a3144' : '#e2e8f0'}`, cursor: 'pointer' }}
              >
                {t('cancelBtn')}
              </button>
              <button 
                onClick={handleSubmit} 
                disabled={passwordLoading || !currentPassword || !newPassword || !confirmPassword}
                style={{ flex: 2, padding: '16px', border: 'none', borderRadius: '12px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: '#fff', cursor: 'pointer', opacity: passwordLoading ? 0.7 : 1 }}
              >
                {passwordLoading ? t('savingBtn') : t('saveBtn')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ChangePassword;