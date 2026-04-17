import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import MainLayout from '../components/layout/MainLayout';
import { useTranslation } from 'react-i18next';
import { useCurrency } from '../context/CurrencyContext';
import { Plus, X, TrendingUp, Users, CheckCircle, AlertTriangle } from 'lucide-react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const STYLES = (isDark: boolean) => `
  :root {
    --qz-card:    ${isDark ? '#111827' : '#ffffff'};
    --qz-card2:   ${isDark ? '#1a1f2e' : '#ffffff'};
    --qz-bdr:     ${isDark ? '#1e293b' : '#e2e8f0'};
    --qz-bdr2:    ${isDark ? '#2a3144' : '#cbd5e1'};
    --qz-sub:     ${isDark ? '#64748b' : '#64748b'};
    --qz-text:    ${isDark ? '#e2e8f0' : '#1e293b'};
    --qz-input:   ${isDark ? '#0f1420' : '#f4f6fb'};
    --qz-row:     ${isDark ? '#0f1420' : '#f8f9ff'};
    --qz-hover:   ${isDark ? 'rgba(255,255,255,.03)' : 'rgba(0,0,0,.02)'};
  }

  .qz-root { width: 100%; }

  .qz-stats {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
    margin-bottom: 28px;
  }
  .qz-stat {
    background: var(--qz-card2);
    border-radius: 16px; padding: 22px 24px;
    border: 1px solid var(--qz-bdr);
    transition: border-color .2s;
  }
  .qz-stat:hover { border-color: var(--qz-bdr2); }
  .qz-stat-top {
    display: flex; align-items: center;
    gap: 12px; margin-bottom: 12px;
  }
  .qz-stat-icon {
    width: 40px; height: 40px; border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .qz-stat-lbl { font-size: 14px; color: var(--qz-sub); }
  .qz-stat-val { font-size: 26px; font-weight: 700; line-height: 1.2; }

  .qz-form-card {
    background: var(--qz-card2);
    border-radius: 16px; padding: 28px;
    border: 1px solid var(--qz-bdr);
    margin-bottom: 24px;
  }
  .qz-form-title {
    font-size: 18px; font-weight: 700;
    color: var(--qz-text); margin-bottom: 22px;
  }
  .qz-form-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px; margin-bottom: 20px;
  }
  .qz-inp-lbl {
    display: block; margin-bottom: 8px;
    font-size: 13px; font-weight: 600;
    color: var(--qz-sub);
  }
  .qz-inp {
    width: 100%; padding: 12px 14px;
    background: var(--qz-input);
    border: 1px solid var(--qz-bdr);
    border-radius: 12px;
    color: var(--qz-text); font-size: 14px; outline: none;
    box-sizing: border-box; transition: border-color .2s;
  }
  .qz-inp:focus { border-color: #667eea; }
  .qz-inp::placeholder { color: var(--qz-sub); }
  .qz-add-btn {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 12px 26px; border-radius: 12px; border: none;
    background: rgba(16,185,129,.12); color: #10b981;
    font-size: 14px; font-weight: 700; cursor: pointer;
    transition: all .2s;
  }
  .qz-add-btn:hover { background: #10b981; color: #fff; }

  .qz-list-card {
    background: var(--qz-card2);
    border-radius: 16px; padding: 28px;
    border: 1px solid var(--qz-bdr);
  }
  .qz-list-title {
    font-size: 18px; font-weight: 700;
    color: var(--qz-text); margin-bottom: 22px;
    display: flex; align-items: center;
    justify-content: space-between;
  }
  .qz-count-badge {
    background: var(--qz-input);
    border-radius: 8px; padding: 3px 10px;
    font-size: 12px; color: var(--qz-sub); font-weight: 700;
  }

  .qz-table-wrap { overflow-x: auto; }
  .qz-table {
    width: 100%; border-collapse: separate;
    border-spacing: 0 8px;
  }
  .qz-table thead tr { background: var(--qz-row); }
  .qz-table th {
    padding: 13px 16px;
    font-size: 12px; color: var(--qz-sub);
    font-weight: 700; text-transform: uppercase;
    letter-spacing: .5px; white-space: nowrap;
  }
  .qz-table th:first-child { border-radius: 10px 0 0 10px; }
  .qz-table th:last-child  { border-radius: 0 10px 10px 0; }
  .qz-table tbody tr { background: var(--qz-row); }
  .qz-table tbody tr:hover { background: var(--qz-hover); }
  .qz-table td { padding: 15px 16px; font-size: 14px; color: var(--qz-text); }
  .qz-table td:first-child { border-radius: 12px 0 0 12px; }
  .qz-table td:last-child  { border-radius: 0 12px 12px 0; }
  .qz-pay-btn {
    background: rgba(16,185,129,.12); color: #10b981;
    border: none; padding: 8px 18px; border-radius: 10px;
    cursor: pointer; font-weight: 600; font-size: 13px;
    transition: all .2s; white-space: nowrap;
  }
  .qz-pay-btn:hover { background: #10b981; color: #fff; }

  .qz-empty {
    text-align: center; padding: 60px 20px;
  }
  .qz-empty-icon {
    width: 72px; height: 72px; margin: 0 auto 16px;
    border-radius: 50%;
    background: rgba(102,126,234,.1);
    display: flex; align-items: center; justify-content: center;
  }
  .qz-empty p { font-size: 15px; color: var(--qz-sub); }

  .qz-mobile-list { display: none; }
  .qz-debt-card {
    background: var(--qz-row);
    border-radius: 14px;
    border: 1px solid var(--qz-bdr);
    padding: 14px;
    margin-bottom: 9px;
    transition: border-color .2s;
  }
  .qz-dc-top {
    display: flex; justify-content: space-between;
    align-items: flex-start; margin-bottom: 10px; gap: 8px;
  }
  .qz-dc-left { display: flex; align-items: flex-start; gap: 9px; flex: 1; min-width: 0; }
  .qz-dc-num {
    width: 22px; height: 22px; border-radius: 7px;
    background: var(--qz-input);
    display: flex; align-items: center; justify-content: center;
    font-size: 10px; font-weight: 800; color: var(--qz-sub);
    flex-shrink: 0; margin-top: 1px;
  }
  .qz-dc-info { min-width: 0; }
  .qz-dc-name {
    font-size: 14px; font-weight: 700;
    color: var(--qz-text); margin-bottom: 3px;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .qz-dc-phone {
    font-size: 11px; color: var(--qz-sub);
    font-family: monospace;
  }
  .qz-dc-amount {
    font-size: 15px; font-weight: 800;
    color: #ef4444; font-family: monospace;
    white-space: nowrap; flex-shrink: 0;
  }
  .qz-dc-footer {
    display: flex; justify-content: space-between;
    align-items: center;
  }
  .qz-dc-date {
    display: flex; align-items: center; gap: 5px;
    font-size: 11px; color: var(--qz-sub);
  }
  .qz-dc-date-dot {
    width: 6px; height: 6px; border-radius: 50%;
    background: var(--qz-bdr2); flex-shrink: 0;
  }
  .qz-dc-pay-btn {
    background: rgba(16,185,129,.12); color: #10b981;
    border: none; padding: 7px 16px; border-radius: 9px;
    cursor: pointer; font-weight: 700; font-size: 12px;
    transition: all .2s;
  }
  .qz-dc-pay-btn:active { background: #10b981; color: #fff; }

  .qz-mini-bar {
    display: none;
    background: var(--qz-card);
    border: 1px solid var(--qz-bdr);
    border-radius: 14px; padding: 10px 8px;
    margin-bottom: 12px;
    align-items: center; justify-content: space-around;
  }
  .qz-mb-item { display: flex; flex-direction: column; align-items: center; gap: 2px; }
  .qz-mb-lbl  { font-size: 9px; font-weight: 700; color: var(--qz-sub); text-transform: uppercase; letter-spacing: .4px; }
  .qz-mb-val  { font-size: 13px; font-weight: 800; font-family: monospace; }
  .qz-mb-div  { width: 1px; height: 26px; background: var(--qz-bdr); }

  .qz-modal-overlay {
    position: fixed; inset: 0;
    background: rgba(0,0,0,.75);
    display: flex; align-items: center; justify-content: center;
    z-index: 1000; backdrop-filter: blur(4px);
    padding: 16px;
  }
  .qz-modal {
    width: 100%; max-width: 440px;
    background: var(--qz-card2);
    border-radius: 22px; overflow: hidden;
    box-shadow: 0 20px 60px rgba(0,0,0,.5);
    border: 1px solid var(--qz-bdr);
  }
  .qz-modal-head {
    padding: 20px 22px; border-bottom: 1px solid var(--qz-bdr);
    display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;
  }
  .qz-modal-head h2 { font-size: 16px; font-weight: 700; color: var(--qz-text); line-height: 1.4; }
  .qz-modal-close {
    background: var(--qz-input); border: none; border-radius: 8px;
    width: 32px; height: 32px;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; color: var(--qz-sub); flex-shrink: 0;
    transition: background .2s;
  }
  .qz-modal-close:hover { background: var(--qz-bdr2); }
  .qz-modal-body { padding: 22px; }
  .qz-modal-input {
    width: 100%; padding: 13px 14px; margin-bottom: 18px;
    background: var(--qz-input); border: 1px solid var(--qz-bdr);
    border-radius: 12px; color: var(--qz-text);
    font-size: 15px; outline: none; box-sizing: border-box;
    transition: border-color .2s;
  }
  .qz-modal-input:focus { border-color: #667eea; }
  .qz-modal-actions { display: flex; justify-content: flex-end; gap: 10px; }
  .qz-btn-cancel {
    padding: 11px 22px; border-radius: 11px; border: none;
    background: rgba(239,68,68,.1); color: #ef4444;
    font-weight: 700; cursor: pointer; font-size: 14px;
    transition: all .2s;
  }
  .qz-btn-cancel:hover { background: rgba(239,68,68,.2); }
  .qz-btn-confirm {
    padding: 11px 22px; border-radius: 11px; border: none;
    background: #10b981; color: #fff;
    font-weight: 700; cursor: pointer; font-size: 14px;
    transition: all .2s;
  }
  .qz-btn-confirm:hover { background: #059669; }
  .qz-modal-result {
    text-align: center; padding: 10px 0 6px;
  }
  .qz-modal-result p {
    font-size: 16px; color: var(--qz-text);
    margin: 16px 0 22px; line-height: 1.5;
  }
  .qz-btn-ok {
    padding: 12px 36px; border-radius: 12px; border: none;
    background: #6366f1; color: #fff;
    font-weight: 700; cursor: pointer; font-size: 15px;
    transition: background .2s;
  }
  .qz-btn-ok:hover { background: #4f46e5; }

  .qz-skeleton {
    background: var(--qz-input); border-radius: 12px;
    height: 86px; margin-bottom: 9px;
    animation: qz-pulse 1.4s ease-in-out infinite;
  }
  @keyframes qz-pulse { 0%,100%{opacity:.5} 50%{opacity:1} }

  @media (max-width: 900px) {
    .qz-stats {
      grid-template-columns: 1fr 1fr;
      gap: 8px; margin-bottom: 12px;
    }
    .qz-stat      { padding: 12px 13px; border-radius: 12px; }
    .qz-stat-icon { width: 30px; height: 30px; border-radius: 8px; }
    .qz-stat-lbl  { font-size: 11px; }
    .qz-stat-val  { font-size: 18px; }

    .qz-mini-bar { display: flex; }

    .qz-form-card {
      padding: 14px 13px; border-radius: 14px; margin-bottom: 12px;
    }
    .qz-form-title { font-size: 15px; margin-bottom: 14px; }
    .qz-form-grid  { grid-template-columns: 1fr; gap: 10px; margin-bottom: 14px; }
    .qz-inp        { padding: 11px 12px; font-size: 13px; border-radius: 10px; }
    .qz-inp-lbl    { font-size: 12px; margin-bottom: 5px; }
    .qz-add-btn    { width: 100%; justify-content: center; padding: 12px; border-radius: 11px; }

    .qz-list-card  { padding: 14px 13px; border-radius: 14px; }
    .qz-list-title { font-size: 15px; margin-bottom: 12px; }

    .qz-table-wrap  { display: none; }
    .qz-mobile-list { display: block; }
  }
`;

interface Qarz {
  id: string;
  name: string;
  phone: string;
  amount: number;
  lastPayment: string;
}

function formatDate(d: string) {
  if (!d) return '--.--.----';
  const [y, m, day] = d.split('-');
  return `${day}.${m}.${y}`;
}

function PharmQarzlarContent() {
  const { t }      = useTranslation(['qarzlar', 'common']);
  const { format } = useCurrency();
  const navigate   = useNavigate();

  const [qarzlar,  setQarzlar]  = useState<Qarz[]>([]);
  const [name,     setName]     = useState('');
  const [phone,    setPhone]    = useState('+');
  const [amount,   setAmount]   = useState('');
  const [userImage, setUserImage] = useState<string | null>(null);
  const [theme,    setTheme]    = useState<'dark'|'light'>('dark');
  const [loading,  setLoading]  = useState(true);

  const [showModal,      setShowModal]      = useState(false);
  const [selectedDebt,   setSelectedDebt]   = useState<Qarz | null>(null);
  const [payInput,       setPayInput]       = useState('');
  const [modalType,      setModalType]      = useState<'input'|'success'|'error'|null>(null);
  const [modalMessage,   setModalMessage]   = useState<string | null>(null);

  const loginRef = useRef<string>(
    (() => { try { return JSON.parse(sessionStorage.getItem('currentUser') || '{}')?.login || ''; } catch { return ''; } })()
  );
  const login   = loginRef.current;
  const isDark  = theme === 'dark';

  useEffect(() => {
    if (!login) navigate('/login');
  }, [login, navigate]);

  useEffect(() => {
    const saved = (localStorage.getItem('theme') as 'dark'|'light') || 'dark';
    setTheme(saved);
    document.documentElement.setAttribute('data-theme', saved);
    const img = localStorage.getItem('userImage');
    if (img) setUserImage(img);
  }, []);

  const fetchDebts = useCallback(async () => {
    if (!login) return;
    try {
      const res = await axiosInstance.get(`/debts/${login}`);
      if (res.data) setQarzlar(Array.isArray(res.data) ? res.data : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [login]);

  useEffect(() => { fetchDebts(); }, [fetchDebts]);

  const openPayModal = (q: Qarz) => {
    setSelectedDebt(q); setPayInput('');
    setModalType('input'); setShowModal(true);
  };
  const closeModal = () => {
    setShowModal(false); setModalType(null);
    setModalMessage(null); setSelectedDebt(null); setPayInput('');
  };

  const confirmPayment = async () => {
    if (!selectedDebt) return;
    const amt = Number(payInput);
    if (isNaN(amt) || amt <= 0) {
      setModalType('error');
      setModalMessage('Noto\'g\'ri summa kiritildi');
      return;
    }
    try {
      const res = await axiosInstance.post(`/debts/pay/${login}`, { debtId: selectedDebt.id, paymentAmount: amt });
      if (res.data) {
        const result = res.data;
        if (result.action === 'fully_paid') {
          setModalType('success');
          setModalMessage('Qarz to\'liq to\'landi!');
          setQarzlar(prev => prev.filter(q => q.id !== selectedDebt.id));
        } else {
          setModalType('success');
          setModalMessage(`Qolgan qarz: ${result.amount.toLocaleString()}`);
          setQarzlar(prev => prev.map(q =>
            q.id === selectedDebt.id ? { ...q, amount: result.amount, lastPayment: result.lastPayment } : q
          ));
        }
        toast.success('To\'lov muvaffaqiyatli!');
      }
    } catch {
      setModalType('error');
      setModalMessage('To\'lov xatosi');
    }
  };

  const qarzQoshish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.startsWith('+') || !amount || Number(amount) <= 0) {
      setModalType('error');
      setModalMessage('Barcha maydonlarni to\'g\'ri to\'ldiring');
      setShowModal(true); return;
    }
    try {
      const res = await axiosInstance.post(`/debts/${login}`, { name: name.trim(), phone, amount: Number(amount) });
      if (res.data) {
        const newDebt = res.data;
        setQarzlar(prev => [...prev, newDebt]);
        setName(''); setPhone('+'); setAmount('');
        toast.success('Qarz qo\'shildi!');
      }
    } catch {
      setModalType('error');
      setModalMessage('Qarz qo\'shishda xato');
      setShowModal(true);
    }
  };

  const umumiyQarz = qarzlar.reduce((s, q) => s + q.amount, 0);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const r = new FileReader();
    r.onload = ev => { const s = ev.target?.result as string; setUserImage(s); localStorage.setItem('userImage', s); };
    r.readAsDataURL(file);
  };

  return (
    <>
      <style>{STYLES(isDark)}</style>
      <MainLayout
        theme={theme}
        userImage={userImage}
        handleImageUpload={handleImageUpload}
        title="Dorixona qarzlar"
      >
        <div className="qz-root">

          <div className="qz-stats">
            <div className="qz-stat">
              <div className="qz-stat-top">
                <div className="qz-stat-icon" style={{ background: 'rgba(239,68,68,.15)' }}>
                  <TrendingUp size={18} color="#ef4444" />
                </div>
                <span className="qz-stat-lbl">Umumiy qarz</span>
              </div>
              <div className="qz-stat-val" style={{ color: '#ef4444' }}>{format(umumiyQarz)}</div>
            </div>

            <div className="qz-stat">
              <div className="qz-stat-top">
                <div className="qz-stat-icon" style={{ background: 'rgba(99,102,241,.15)' }}>
                  <Users size={18} color="#818cf8" />
                </div>
                <span className="qz-stat-lbl">Qarzdorlar soni</span>
              </div>
              <div className="qz-stat-val" style={{ color: '#818cf8' }}>{qarzlar.length}</div>
            </div>
          </div>

          <div className="qz-form-card">
            <div className="qz-form-title">Qarz qo'shish</div>
            <form onSubmit={qarzQoshish}>
              <div className="qz-form-grid">
                <div>
                  <label className="qz-inp-lbl">Ism</label>
                  <input
                    className="qz-inp"
                    type="text"
                    placeholder="Qarzdor ismini kiriting"
                    value={name}
                    onChange={e => setName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="qz-inp-lbl">Telefon raqam</label>
                  <input
                    className="qz-inp"
                    type="tel"
                    placeholder="+998..."
                    value={phone}
                    onChange={e => {
                      const v = e.target.value.replace(/[^\d+]/g, '');
                      setPhone(v.startsWith('+') ? v : '+' + v);
                    }}
                  />
                </div>
                <div>
                  <label className="qz-inp-lbl">Qarzdorlik summasi</label>
                  <input
                    className="qz-inp"
                    type="number"
                    placeholder="0 so'm"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    min="0"
                  />
                </div>
              </div>
              <button type="submit" className="qz-add-btn">
                <Plus size={17} />
                Qo'shish
              </button>
            </form>
          </div>

          <div className="qz-list-card">
            <div className="qz-list-title">
              Qarzdorlar ro'yhati
            </div>

            {loading ? (
              <>{[1,2,3].map(i => <div key={i} className="qz-skeleton" />)}</>
            ) : qarzlar.length === 0 ? (
              <div className="qz-empty">
                <div className="qz-empty-icon"><Users size={32} color="#818cf8" /></div>
                <p>Hozircha qarzdorlar yo'q</p>
              </div>
            ) : (
              <>
                <div className="qz-table-wrap">
                  <table className="qz-table">
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left' }}>№</th>
                        <th style={{ textAlign: 'left' }}>Ism</th>
                        <th style={{ textAlign: 'left' }}>Telefon</th>
                        <th style={{ textAlign: 'right' }}>Summa</th>
                        <th style={{ textAlign: 'center' }}>Sana</th>
                        <th style={{ textAlign: 'center' }}>Amal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {qarzlar.map((q, i) => (
                        <tr key={q.id}>
                          <td style={{ color: 'var(--qz-sub)', fontWeight: 600 }}>{i + 1}</td>
                          <td style={{ fontWeight: 600 }}>{q.name}</td>
                          <td style={{ color: 'var(--qz-sub)', fontFamily: 'monospace' }}>{q.phone}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: '#ef4444' }}>{format(q.amount)}</td>
                          <td style={{ textAlign: 'center', color: 'var(--qz-sub)', fontSize: 13 }}>{formatDate(q.lastPayment)}</td>
                          <td style={{ textAlign: 'center' }}>
                            <button className="qz-pay-btn" onClick={() => openPayModal(q)}>
                              To'lov
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="qz-mobile-list">
                  {qarzlar.map((q, i) => (
                    <div key={q.id} className="qz-debt-card">
                      <div className="qz-dc-top">
                        <div className="qz-dc-left">
                          <div className="qz-dc-num">{i + 1}</div>
                          <div className="qz-dc-info">
                            <div className="qz-dc-name">{q.name}</div>
                            <div className="qz-dc-phone">{q.phone}</div>
                          </div>
                        </div>
                        <div className="qz-dc-amount">{format(q.amount)}</div>
                      </div>
                      <div className="qz-dc-footer">
                        <div className="qz-dc-date">
                          <div className="qz-dc-date-dot" />
                          {formatDate(q.lastPayment)}
                        </div>
                        <button className="qz-dc-pay-btn" onClick={() => openPayModal(q)}>
                          To'lov qilish
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

        </div>
      </MainLayout>

      {showModal && (
        <div className="qz-modal-overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="qz-modal">
            <div className="qz-modal-head">
              <h2>
                {modalType === 'input'
                  ? `${selectedDebt?.name} — ${format(selectedDebt?.amount || 0)}`
                  : modalType === 'success'
                    ? 'Muvaffaqiyatli!'
                    : 'Xato'}
              </h2>
              <button className="qz-modal-close" onClick={closeModal}>
                <X size={17} />
              </button>
            </div>
            <div className="qz-modal-body">
              {modalType === 'input' ? (
                <>
                  <input
                    type="number"
                    className="qz-modal-input"
                    placeholder="To'lov summasini kiriting"
                    value={payInput}
                    onChange={e => setPayInput(e.target.value)}
                    autoFocus
                  />
                  <div className="qz-modal-actions">
                    <button className="qz-btn-cancel" onClick={closeModal}>
                      Bekor
                    </button>
                    <button className="qz-btn-confirm" onClick={confirmPayment}>
                      Tasdiqlash
                    </button>
                  </div>
                </>
              ) : (
                <div className="qz-modal-result">
                  {modalType === 'success'
                    ? <CheckCircle size={56} color="#10b981" />
                    : <AlertTriangle size={56} color="#ef4444" />}
                  <p>{modalMessage}</p>
                  <button className="qz-btn-ok" onClick={closeModal}>
                    OK
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <ToastContainer theme={isDark ? 'dark' : 'light'} />
    </>
  );
}

export default function PharmQarzlar() {
  return <PharmQarzlarContent />;
}
