import React from 'react';
import { CreditCard, ScanLine, Printer, Wallet, Package } from 'lucide-react';

interface ScannerMobileBarProps {
  totalPrice: number;
  format: (val: number) => string;
  showCamera: boolean;
  clr: { textMuted: string; totalColor: string };
  t: (key: string) => string;
  finalizeSale: (method: string) => void;
  handleCameraToggle: () => void;
  addToSales: (product: any, count?: number) => void;
}

// ─── MobileBottomBar: bottom=25px, height=80px → top edge = 105px ────────────
// ScannerMobileBar shu chegaradan tepaga joylashadi.
const MAIN_NAV_HEIGHT = 105; // px — MobileBottomBar top edge (25 + 80)

// Scanner bar (total + tugmalar) umumiy balandligi
const SCANNER_BAR_HEIGHT = 108; // px

export const mobileBottomBarStyles = `
  /* ── Mobile bottom bar — faqat ≤900px da ko'rinadi ── */
  .mobile-bottom-bar-root {
    display: none;
  }

  @media (max-width: 900px) {
    .mobile-bottom-bar-root {
      display: block !important;
    }

    /*
      Sahifa kontenti pastki ikkita barning balandligi qadar
      bo'sh joy qoldirishi kerak, aks holda kontent ularning
      ostiga kirib ketadi va ko'rinmaydi.
    */
    .pos-root {
      padding-bottom: ${MAIN_NAV_HEIGHT + SCANNER_BAR_HEIGHT + 24}px !important;
    }
  }
`;

const NAV_BTN: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'none',
  border: 'none',
  outline: 'none',
  boxShadow: 'none',
  cursor: 'pointer',
  gap: 4,
  padding: '6px 0',
  minWidth: 0,
  WebkitTapHighlightColor: 'transparent',
};

const NAV_LABEL: React.CSSProperties = {
  fontSize: 9,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  whiteSpace: 'nowrap',
  fontFamily: "'DM Sans', sans-serif",
};

const ScannerMobileBar: React.FC<ScannerMobileBarProps> = ({
  totalPrice,
  format,
  showCamera,
  clr,
  t,
  finalizeSale,
  handleCameraToggle,
  addToSales,
}) => {
  const handleAddBag = () => {
    addToSales(
      {
        barcode: 'BAG-001',
        name: t('bag') || 'Paket',
        price: 400,
        source: 'user',
        category: 'other',
      },
      1,
    );
  };

  return (
    <div className="mobile-bottom-bar-root">
      {/*
        ══════════════════════════════════════════════════════
        YECHIM:
          bottom = MAIN_NAV_HEIGHT (105px)
          → Scanner bar MobileBottomBar navining TEPASIDA turadi.

          Tartib (pastdan yuqoriga):
            0px    — ekran pastki chegarasi
            25px   — MobileBottomBar boshi (bottom: 25)
            105px  — MobileBottomBar yuqori chegarasi (25 + 80)
            105px  — Scanner bar boshi  ← shu yerdan boshlanadi
            213px  — Scanner bar yuqori chegarasi (105 + 108)
        ══════════════════════════════════════════════════════
      */}
      <div
        style={{
          position: 'fixed',
          bottom: MAIN_NAV_HEIGHT,      // ← MobileBottomBar ustida
          left: 0,
          right: 0,
          zIndex: 200,                  // MobileBottomBar z-index (1000) dan PAST,
                                        // lekin sahifa kontentidan YUQORI
          background: '#0a0f1a',
          borderTop: '1px solid rgba(255,255,255,0.07)',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
        }}
      >
        {/* ── Total summa qatori ── */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'baseline',
            gap: 6,
            padding: '7px 20px 6px',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          <span style={{ fontSize: 12, color: clr.textMuted }}>{t('total')}:</span>
          <span
            style={{
              fontSize: 17,
              fontWeight: 800,
              color: clr.totalColor,
              fontFamily: 'monospace',
              letterSpacing: '0.5px',
            }}
          >
            {format(totalPrice)}
          </span>
        </div>

        {/* ── To'lov tugmalari qatori ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '4px 8px 6px',
            height: 70,
            overflow: 'visible',
            position: 'relative',
          }}
        >
          {/* 1. Naqd */}
          <button style={NAV_BTN} onClick={() => finalizeSale('naqd')}>
            <Wallet size={22} color="#10b981" />
            <span style={{ ...NAV_LABEL, color: '#10b981' }}>Naqd</span>
          </button>

          {/* 2. Plastik */}
          <button style={NAV_BTN} onClick={() => finalizeSale('plastik')}>
            <CreditCard size={22} color="#3b82f6" />
            <span style={{ ...NAV_LABEL, color: '#3b82f6' }}>Plastik</span>
          </button>

          {/* 3. Markaziy SCAN tugmasi — tepaga chiqadi */}
          <div
            style={{
              flex: '0 0 72px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              position: 'relative',
              marginTop: -28,
            }}
          >
            <button
              onClick={handleCameraToggle}
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: showCamera
                  ? 'linear-gradient(135deg, #4f46e5, #7c3aed)'
                  : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '3px solid #0a0f1a',
                boxShadow: showCamera
                  ? '0 0 0 3px rgba(99,102,241,0.5), 0 8px 24px rgba(99,102,241,0.6)'
                  : '0 8px 24px rgba(99,102,241,0.45)',
                cursor: 'pointer',
                outline: 'none',
                WebkitTapHighlightColor: 'transparent',
                transition: 'all 0.2s',
              }}
            >
              <ScanLine size={24} color="white" strokeWidth={2.5} />
            </button>
            <span style={{ ...NAV_LABEL, color: '#818cf8', marginTop: 2 }}>
              {showCamera ? t('close') || 'Yopish' : 'Scan'}
            </span>
          </div>

          {/* 4. Chek */}
          <button
            style={NAV_BTN}
            onClick={() => window.dispatchEvent(new CustomEvent('pos:chek'))}
          >
            <Printer size={22} color="#06b6d4" />
            <span style={{ ...NAV_LABEL, color: '#06b6d4' }}>Chek</span>
          </button>

          {/* 5. Paket */}
          <button style={NAV_BTN} onClick={handleAddBag}>
            <Package size={22} color="#f59e0b" />
            <span style={{ ...NAV_LABEL, color: '#f59e0b' }}>Paket</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScannerMobileBar;