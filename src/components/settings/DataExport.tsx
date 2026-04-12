import React, { useState } from 'react';
import { Download, FileText, X, ChevronRight } from 'lucide-react';
import { exportToExcel, exportToPDF } from '../../utils/exportUtils';
import { api } from '../../utils/api';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function ExportFormatModal({
  isOpen, onClose, onExportExcel, onExportPDF, theme
}: {
  isOpen: boolean; onClose: () => void; onExportExcel: () => void;
  onExportPDF: () => void; theme: 'dark' | 'light';
}) {
  const { t } = useTranslation(['settings', 'common']);
  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(8px)' }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: theme === 'dark' ? 'linear-gradient(135deg, #1a1f2e 0%, #252b3d 100%)' : 'linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%)', borderRadius: '24px', padding: '40px', width: '90%', maxWidth: '500px', border: `1px solid ${theme === 'dark' ? '#2a3144' : '#e2e8f0'}`, boxShadow: '0 20px 60px rgba(0,0,0,0.4)', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 700, color: theme === 'dark' ? '#fff' : '#1a1f2e', margin: 0 }}>
            {t('exportFormatTitle')}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme === 'dark' ? '#8b92a7' : '#64748b' }}>
            <X size={24} />
          </button>
        </div>

        <p style={{ fontSize: '16px', color: theme === 'dark' ? '#8b92a7' : '#64748b', marginBottom: '32px' }}>
          {t('exportQuestion')}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <button onClick={onExportExcel} style={{ padding: '16px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
            <Download size={20} />
            {t('excelFormat')}
          </button>

          <button onClick={onExportPDF} style={{ padding: '16px', background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
            <FileText size={20} />
            {t('pdfFormat')}
          </button>
        </div>
      </div>
    </div>
  );
}

interface DataExportProps {
  theme: 'dark' | 'light';
  hoveredSetting: string | null;
  setHoveredSetting: React.Dispatch<React.SetStateAction<string | null>>;
  idx: string;
}

const DataExport: React.FC<DataExportProps> = ({ theme, hoveredSetting, setHoveredSetting, idx }) => {
  const { t } = useTranslation(['settings', 'common']);
  const [isOpen, setIsOpen] = useState(false);
  const [exportData, setExportData] = useState<{ products: any[], reports: any[], debts: any[] } | null>(null);

  const handleExport = async () => {
    let products: any[] = [];
    let reports: any[] = [];
    let debts: any[] = [];

    try {
        const login = sessionStorage.getItem("currentUser")
          ? JSON.parse(sessionStorage.getItem("currentUser") || "{}").login
          : null;
        if (login) {
        const prodRes = await api(`/api/products/user-products/${login}`);
        if (prodRes.ok) products = await prodRes.json();
      }
      const savedDebts = localStorage.getItem('qarzlar');
      debts = savedDebts ? JSON.parse(savedDebts) : [];

      await new Promise<void>((resolve, reject) => {
        const openReq = indexedDB.open("ShoxPosReports", 2);
        openReq.onerror = () => reject(openReq.error);
        openReq.onsuccess = (e: any) => {
          const db = e.target.result;
          const tx = db.transaction("reports", "readonly");
          const store = tx.objectStore("reports");
          const req = store.getAll();
          req.onsuccess = () => { reports = req.result || []; resolve(); };
          req.onerror = () => reject(req.error);
        };
      });

      setExportData({ products, reports, debts });
      setIsOpen(true);
    } catch (err) {
      toast.error(t('loadDataError'), { theme: theme === 'dark' ? 'dark' : 'light' });
    }
  };

  const handleExportExcel = () => {
    if (exportData) {
      try {
        exportToExcel(exportData.products, exportData.reports, exportData.debts, t);
        toast.success(t('exportExcelSuccess'), { theme: theme === 'dark' ? 'dark' : 'light' });
      } catch (err) {
        toast.error(t('excelExportError'));
      }
    }
    setIsOpen(false);
    setExportData(null);
  };

  const handleExportPDF = () => {
    if (exportData) {
      try {
        exportToPDF(exportData.products, exportData.reports, exportData.debts, t);
        toast.success(t('exportPDFSuccess'), { theme: theme === 'dark' ? 'dark' : 'light' });
      } catch (err) {
        toast.error(t('pdfExportError'));
      }
    }
    setIsOpen(false);
    setExportData(null);
  };

  return (
    <>
      <div
        onMouseEnter={() => setHoveredSetting(idx)}
        onMouseLeave={() => setHoveredSetting(null)}
        onClick={handleExport}
        style={{
          background: theme === 'dark' ? 'linear-gradient(135deg, #1a1f2e 0%, #252b3d 100%)' : 'linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%)',
          borderRadius: '16px', padding: '20px', cursor: 'pointer', transition: 'all 0.3s ease',
          border: hoveredSetting === idx ? '1px solid #667eea' : `1px solid ${theme === 'dark' ? '#2a3144' : '#e2e8f0'}`,
          transform: hoveredSetting === idx ? 'translateY(-2px)' : 'translateY(0)',
          boxShadow: hoveredSetting === idx ? '0 8px 24px rgba(102,126,234,0.2)' : 'none'
        }}
      >
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: theme === 'dark' ? 'rgba(102,126,234,0.1)' : 'rgba(79,70,229,0.1)', color: '#667eea', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Download size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: '19px', fontWeight: 600, color: theme === 'dark' ? '#fff' : '#1a1f2e' }}>{t('export')}</h3>
            <p style={{ fontSize: '13px', color: theme === 'dark' ? '#8b92a7' : '#64748b', marginBottom: 0 }}>{t('exportDescription')}</p>
          </div>
          <ChevronRight size={20} color={theme === 'dark' ? '#8b92a7' : '#64748b'} style={{ flexShrink: 0, marginTop: '10px' }} />
        </div>
      </div>

      <ExportFormatModal isOpen={isOpen} onClose={() => setIsOpen(false)} onExportExcel={handleExportExcel} onExportPDF={handleExportPDF} theme={theme} />
    </>
  );
};

export default DataExport;
