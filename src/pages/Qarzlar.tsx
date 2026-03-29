import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from "../components/MainLayout";
import { useResponsive } from "../hooks/useResponsive";
import { useTranslation, TranslationProvider } from '../components/languages/Qarzlar';
import { Plus, X, TrendingUp, Users, DollarSign, CheckCircle, AlertTriangle } from 'lucide-react';

interface Qarz {
  id: string;
  name: string;
  phone: string;
  amount: number;
  lastPayment: string;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '--.--.----';
  const [year, month, day] = dateStr.split('-');
  return `${day}.${month}.${year}`;
}

function QarzlarContent() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isMobile } = useResponsive();

  const [qarzlar, setQarzlar] = useState<Qarz[]>([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+');
  const [amount, setAmount] = useState('');
  const [userImage, setUserImage] = useState<string | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [loading, setLoading] = useState(true);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<Qarz | null>(null);
  const [paymentAmountInput, setPaymentAmountInput] = useState('');
  const [modalType, setModalType] = useState<'input' | 'success' | 'error' | null>(null);
  const [modalMessage, setModalMessage] = useState<string | null>(null);

  // ✅ login — bir marta o'qiladi, ref sifatida saqlanadi
  const loginRef = useRef<string>(
    localStorage.getItem('currentLogin') || ''
  );
  const login = loginRef.current;

  // ✅ navigate ref
  const navigateRef = useRef(navigate);
  useEffect(() => { navigateRef.current = navigate; }, [navigate]);

  // ✅ Auth check — bir marta
  useEffect(() => {
    if (!login) navigateRef.current('/login');
  }, []); // bo'sh — faqat mount

  // ✅ Theme & image — bir marta
  useEffect(() => {
    const savedTheme = (localStorage.getItem('theme') as 'dark' | 'light') || 'dark';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
    const savedImage = localStorage.getItem('userImage');
    if (savedImage) setUserImage(savedImage);
  }, []);

  // ✅ fetchDebts — bo'sh dependency (login ref orqali, navigate ref orqali)
  const fetchDebts = useCallback(async () => {
    if (!loginRef.current) return;
    try {
      const res = await fetch(`/api/debts/${loginRef.current}`);
      if (res.ok) {
        const data = await res.json();
        setQarzlar(data);
      } else if (res.status === 401 || res.status === 403) {
        localStorage.removeItem('currentLogin');
        navigateRef.current('/login');
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []); // ✅ bo'sh — login/navigate ref orqali, hech qachon qayta yaratilmaydi

  // ✅ Bir marta yuklash
  useEffect(() => {
    fetchDebts();
  }, []); // ✅ bo'sh — fetchDebts endi o'zgarmaydi

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = ev.target?.result as string;
      setUserImage(img);
      localStorage.setItem('userImage', img);
    };
    reader.readAsDataURL(file);
  };

  const openPaymentModal = (qarz: Qarz) => {
    setSelectedDebt(qarz);
    setPaymentAmountInput('');
    setModalType('input');
    setShowPaymentModal(true);
  };

  const closeModal = () => {
    setShowPaymentModal(false);
    setModalType(null);
    setModalMessage(null);
    setSelectedDebt(null);
    setPaymentAmountInput('');
  };

  const handlePaymentConfirm = async () => {
    if (!selectedDebt) return;

    const tolov = Number(paymentAmountInput);
    if (isNaN(tolov) || tolov <= 0) {
      setModalType('error');
      setModalMessage(t('invalidAmountEntered'));
      return;
    }

    try {
      const res = await fetch(`/api/debts/pay/${login}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ debtId: selectedDebt.id, paymentAmount: tolov })
      });

      if (res.ok) {
        const result = await res.json();
        if (result.action === "fully_paid") {
          setModalType('success');
          setModalMessage(t('debtFullyPaid'));
          setQarzlar(prev => prev.filter(q => q.id !== selectedDebt.id));
        } else {
          setModalType('success');
          setModalMessage(t('partialPayment', { remainder: result.amount.toLocaleString() }));
          setQarzlar(prev => prev.map(q =>
            q.id === selectedDebt.id
              ? { ...q, amount: result.amount, lastPayment: result.lastPayment }
              : q
          ));
        }
      } else {
        setModalType('error');
        setModalMessage(t('paymentError'));
      }
    } catch {
      setModalType('error');
      setModalMessage(t('serverConnectionError'));
    }
  };

  const qarzQoshish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.startsWith('+') || !amount || Number(amount) <= 0) {
      setModalType('error');
      setModalMessage(t('fillAllFieldsCorrectly'));
      setShowPaymentModal(true);
      return;
    }

    try {
      const res = await fetch(`/api/debts/${login}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), phone, amount: Number(amount) })
      });

      if (res.ok) {
        const newDebt = await res.json();
        setQarzlar(prev => [...prev, newDebt]);
        setName('');
        setPhone('+');
        setAmount('');
      } else {
        setModalType('error');
        setModalMessage(t('addDebtError'));
        setShowPaymentModal(true);
      }
    } catch {
      setModalType('error');
      setModalMessage(t('serverConnectionError'));
      setShowPaymentModal(true);
    }
  };

  const umumiyQarz = qarzlar.reduce((sum, q) => sum + q.amount, 0);

  if (loading) {
    return (
      <MainLayout theme={theme} userImage={userImage} handleImageUpload={handleImageUpload} title={t("debts")}>
        <div style={{ textAlign: 'center', padding: '60px 20px', color: theme === 'dark' ? '#8b92a7' : '#64748b' }}>
          <p style={{ fontSize: '18px', fontWeight: 500 }}>{t("loading")}</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout theme={theme} userImage={userImage} handleImageUpload={handleImageUpload} title={t("debts")}>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <StatCard icon={<TrendingUp size={20} color="#ef4444" />} title={t("totalDebt")} value={`${umumiyQarz.toLocaleString()} ${t('currencyUnit')}`} color="#ef4444" theme={theme} />
        <StatCard icon={<Users size={20} color="#667eea" />} title={t("debtorsCount")} value={qarzlar.length.toString()} color="#667eea" theme={theme} />
      </div>

      {/* Form */}
      <div style={{ background: theme === 'dark' ? '#1a1f2e' : '#fff', borderRadius: '16px', padding: '28px', marginBottom: '32px', border: `1px solid ${theme === 'dark' ? '#2a3144' : '#e2e8f0'}` }}>
        <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '24px', color: theme === 'dark' ? '#e2e8f0' : '#1e293b' }}>{t("addNewDebt")}</h3>
        <form onSubmit={qarzQoshish}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
            <InputGroup label={t("name")} value={name} onChange={setName} placeholder={t("enterDebtorName")} theme={theme} />
            <InputGroup label={t("phone")} value={phone} onChange={(val) => {
              const formatted = val.replace(/[^\d+]/g, '');
              setPhone(formatted.startsWith('+') ? formatted : '+' + formatted);
            }} placeholder="+998..." type="tel" theme={theme} />
            <InputGroup label={t("debtAmount")} value={amount} onChange={setAmount} placeholder={`0 ${t('currencyUnit')}`} type="number" theme={theme} />
          </div>
          <button type="submit" className="add-btn">
            <Plus size={18} /> {t("add")}
          </button>
        </form>
      </div>

      {/* Table */}
      <div style={{ background: theme === 'dark' ? '#1a1f2e' : '#fff', borderRadius: '16px', padding: '28px', border: `1px solid ${theme === 'dark' ? '#2a3144' : '#e2e8f0'}` }}>
        <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '24px', color: theme === 'dark' ? '#e2e8f0' : '#1e293b' }}>{t("debtorsList")}</h3>
        {qarzlar.length === 0 ? (
          <EmptyState theme={theme} text={t("noDebtsYet")} />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
              <thead>
                <tr style={{ background: theme === 'dark' ? '#0f1420' : '#f8f9ff' }}>
                  <Th label={t('number')} theme={theme} align="left" isFirst />
                  <Th label={t("nameHeader")} theme={theme} align="left" />
                  <Th label={t("phoneHeader")} theme={theme} align="left" />
                  <Th label={t("amountHeader")} theme={theme} align="right" />
                  <Th label={t("date")} theme={theme} align="center" />
                  <Th label={t("action")} theme={theme} align="center" isLast />
                </tr>
              </thead>
              <tbody>
                {qarzlar.map((qarz, index) => (
                  <tr key={qarz.id} style={{ background: theme === 'dark' ? '#0f1420' : '#f8f9ff' }}>
                    <td style={{ padding: '16px', borderRadius: '12px 0 0 12px', fontSize: '14px', color: theme === 'dark' ? '#8b92a7' : '#64748b' }}>{index + 1}</td>
                    <td style={{ padding: '16px', fontSize: '15px', fontWeight: 500, color: theme === 'dark' ? '#e2e8f0' : '#1e293b' }}>{qarz.name}</td>
                    <td style={{ padding: '16px', fontSize: '14px', color: theme === 'dark' ? '#8b92a7' : '#64748b' }}>{qarz.phone}</td>
                    <td style={{ padding: '16px', textAlign: 'right', fontSize: '15px', fontWeight: 600, color: '#ef4444' }}>{qarz.amount.toLocaleString()} {t('currencyUnit')}</td>
                    <td style={{ padding: '16px', textAlign: 'center', fontSize: '13px', color: theme === 'dark' ? '#8b92a7' : '#64748b' }}>{formatDate(qarz.lastPayment)}</td>
                    <td style={{ padding: '16px', textAlign: 'center', borderRadius: '0 12px 12px 0' }}>
                      <button onClick={() => openPaymentModal(qarz)} className="pay-btn">{t("pay")}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showPaymentModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ background: theme === 'dark' ? '#1a1f2e' : '#ffffff', color: theme === 'dark' ? '#e2e8f0' : '#1e293b' }}>
            <div className="modal-header">
              <h2>
                {modalType === 'input'
                  ? t('paymentPrompt', { name: selectedDebt?.name || '', amount: selectedDebt?.amount.toLocaleString() || '' })
                  : modalType === 'success' ? t('success') : t('error')}
              </h2>
              <button onClick={closeModal} className="close-btn"><X size={24} /></button>
            </div>
            <div className="modal-body">
              {modalType === 'input' ? (
                <>
                  <input
                    type="number"
                    value={paymentAmountInput}
                    onChange={(e) => setPaymentAmountInput(e.target.value)}
                    placeholder={t('enterAmount')}
                    className="modal-input"
                    style={{ background: theme === 'dark' ? '#0f1420' : '#f8f9ff', color: theme === 'dark' ? '#fff' : '#000', border: `1px solid ${theme === 'dark' ? '#334155' : '#e2e8f0'}` }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                    <button onClick={closeModal} className="btn-cancel">{t('cancel')}</button>
                    <button onClick={handlePaymentConfirm} className="btn-confirm">{t('confirm')}</button>
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                  {modalType === 'success' ? <CheckCircle size={64} color="#10b981" /> : <AlertTriangle size={64} color="#ef4444" />}
                  <p style={{ fontSize: '18px', margin: '20px 0' }}>{modalMessage}</p>
                  <button onClick={closeModal} className="btn-ok">{t('ok')}</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(4px); }
        .modal-content { width: 90%; max-width: 450px; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.5); }
        .modal-header { padding: 20px; border-bottom: 1px solid #33415520; display: flex; justify-content: space-between; align-items: center; }
        .modal-body { padding: 24px; }
        .modal-input { width: 100%; padding: 14px; margin-bottom: 20px; border-radius: 12px; outline: none; font-size: 16px; box-sizing: border-box; }
        .add-btn { background: #10b98115; color: #10b981; border: none; padding: 14px 28px; border-radius: 14px; cursor: pointer; font-weight: 600; display: flex; align-items: center; gap: 8px; transition: 0.3s; }
        .add-btn:hover { background: #10b981; color: #fff; }
        .pay-btn { background: #10b98115; color: #10b981; border: none; padding: 8px 20px; border-radius: 10px; cursor: pointer; font-weight: 500; transition: 0.3s; }
        .pay-btn:hover { background: #10b981; color: #fff; }
        .btn-confirm { background: #10b981; color: white; padding: 12px 24px; border-radius: 12px; border: none; cursor: pointer; font-weight: 600; }
        .btn-cancel { background: #ef444415; color: #ef4444; padding: 12px 24px; border-radius: 12px; border: none; cursor: pointer; font-weight: 600; }
        .btn-ok { background: #6366f1; color: white; padding: 12px 30px; border-radius: 12px; border: none; cursor: pointer; font-weight: 600; }
        .close-btn { background: none; border: none; color: #8b92a7; cursor: pointer; }
      `}</style>
    </MainLayout>
  );
}

const StatCard = ({ icon, title, value, color, theme }: any) => (
  <div style={{ background: theme === 'dark' ? 'linear-gradient(135deg, #1a1f2e 0%, #252b3d 100%)' : '#fff', borderRadius: '16px', padding: '24px', border: `1px solid ${theme === 'dark' ? '#2a3144' : '#e2e8f0'}` }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
      <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
      <span style={{ fontSize: '14px', color: theme === 'dark' ? '#8b92a7' : '#64748b' }}>{title}</span>
    </div>
    <div style={{ fontSize: '24px', fontWeight: 700, color }}>{value}</div>
  </div>
);

const InputGroup = ({ label, value, onChange, placeholder, type = "text", theme }: any) => (
  <div>
    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500, color: theme === 'dark' ? '#8b92a7' : '#64748b' }}>{label}</label>
    <input
      type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={{ width: '100%', padding: '12px 16px', background: theme === 'dark' ? '#0f1420' : '#f8f9ff', border: `1px solid ${theme === 'dark' ? '#2a3144' : '#e2e8f0'}`, borderRadius: '12px', color: theme === 'dark' ? '#fff' : '#1a1f2e', outline: 'none', boxSizing: 'border-box' }}
    />
  </div>
);

const Th = ({ label, align, theme, isFirst, isLast }: any) => (
  <th style={{ padding: '14px 16px', textAlign: align, fontSize: '13px', fontWeight: 600, color: theme === 'dark' ? '#8b92a7' : '#64748b', borderRadius: isFirst ? '12px 0 0 12px' : isLast ? '0 12px 12px 0' : '0' }}>{label}</th>
);

const EmptyState = ({ theme, text }: any) => (
  <div style={{ textAlign: 'center', padding: '60px 20px' }}>
    <div style={{ width: '80px', height: '80px', margin: '0 auto 20px', borderRadius: '50%', background: 'rgba(102, 126, 234, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Users size={36} color="#667eea" />
    </div>
    <p style={{ fontSize: '16px', color: theme === 'dark' ? '#8b92a7' : '#64748b' }}>{text}</p>
  </div>
);

export default function Qarzlar() {
  return (
    <TranslationProvider>
      <QarzlarContent />
    </TranslationProvider>
  );
}