import React from 'react';
import { Search, Trash2, Plus, Minus } from 'lucide-react';

// ─── MobileBottomBar: bottom=25px, height=80px → top edge = 105px ────────────
// ScannerMobileBar.tsx dagi qiymatlar bilan bir xil bo'lishi kerak!
const MAIN_NAV_HEIGHT    = 105; // px — MobileBottomBar top edge (25 + 80)
const SCANNER_BAR_HEIGHT = 108; // px — total + tugmalar satri

export const mobileCartStyles = `
  /* ── Desktop: cart wrapper yashirilgan ── */
  .mobile-cart-wrapper {
    display: none;
  }

  @media (max-width: 900px) {
    .mobile-cart-wrapper {
      display: flex;
      flex-direction: column;
      width: 100%;
      margin-top: 10px;
      padding: 0 6px;
      padding-bottom: ${MAIN_NAV_HEIGHT + SCANNER_BAR_HEIGHT + 16}px;
    }

    /* ── Status blok ── */
    .mobile-status-block {
      border-radius: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 11px 14px;
      font-size: 13px;
      font-weight: 500;
      margin-bottom: 10px;
      border: 1px solid rgba(255,255,255,0.08);
    }
    .mobile-status-info  {
      background: rgba(102,126,234,0.1);
      color: #667eea;
      border-color: rgba(102,126,234,0.2);
    }
    .mobile-status-ok {
      background: rgba(16,185,129,0.1);
      color: #10b981;
      border-color: rgba(16,185,129,0.2);
    }
    .mobile-status-error {
      background: rgba(239,68,68,0.1);
      color: #ef4444;
      border-color: rgba(239,68,68,0.2);
    }

    /* ── Savat konteyneri ── */
    .mobile-cart-container {
      background: #111827;
      border-radius: 20px;
      border: 1px solid #1e293b;
      overflow: hidden;
      overflow-y: auto;
      max-height: calc(100vh - 56px - 52px - 48px - ${MAIN_NAV_HEIGHT + SCANNER_BAR_HEIGHT + 40}px);
      min-height: 80px;
    }

    [data-theme="light"] .mobile-cart-container {
      background: #fff;
      border-color: #e5e7eb;
    }

    /* ── Savat elementi ── */
    .mobile-cart-item {
      padding: 14px 16px;
      border-bottom: 1px solid rgba(255,255,255,0.05);
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .mobile-cart-item:last-child {
      border-bottom: none;
    }

    [data-theme="light"] .mobile-cart-item {
      border-bottom: 1px solid #f3f4f6;
    }

    /* ── Element yuqori qatori: nom + o'chirish ── */
    .item-top-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 10px;
    }

    .item-name {
      font-size: 15px;
      font-weight: 600;
      color: #f1f5f9;
      line-height: 1.3;
      flex: 1;
      word-break: break-word;
    }

    [data-theme="light"] .item-name {
      color: #111827;
    }

    /* ── Element pastki qatori: narx + stepper ── */
    .item-controls-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
    }

    .item-price-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .item-total-price {
      font-size: 15px;
      font-weight: 700;
      color: #818cf8;
    }

    [data-theme="light"] .item-total-price {
      color: #4f46e5;
    }

    .item-unit-price {
      font-size: 11px;
      color: #475569;
    }

    /* ── Stepper: − [son] + ── */
    .stepper-wrap {
      display: flex;
      align-items: center;
      background: #1e293b;
      border-radius: 12px;
      padding: 3px;
      gap: 10px;
      flex-shrink: 0;
    }

    [data-theme="light"] .stepper-wrap {
      background: #f3f4f6;
    }

    .step-btn {
      width: 30px;
      height: 30px;
      border-radius: 9px;
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #3b82f6;
      color: white;
      cursor: pointer;
      flex-shrink: 0;
      WebkitTapHighlightColor: transparent;
      transition: background 0.15s;
    }

    .step-btn:active {
      background: #2563eb;
    }

    .step-value {
      font-size: 15px;
      font-weight: 700;
      color: #f1f5f9;
      min-width: 22px;
      text-align: center;
      font-family: monospace;
    }

    [data-theme="light"] .step-value {
      color: #111827;
    }

    /* ── Bo'sh savat holati ── */
    .cart-empty-mobile {
      padding: 50px 20px;
      text-align: center;
      color: #475569;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
    }

    .cart-empty-mobile svg {
      opacity: 0.12;
    }

    .cart-empty-mobile p {
      font-size: 14px;
      margin: 0;
      color: #475569;
    }
  }
`;

interface MobileCartProps {
  sales: any[];
  resultText: string;
  resultStatus: 'info' | 'success' | 'error';
  format: (val: number) => string;
  updateCount: (barcode: string, value: number) => void;
  t: (key: string) => string;
}

const ScannerMobileCart: React.FC<MobileCartProps> = ({
  sales,
  resultText,
  resultStatus,
  format,
  updateCount,
  t,
}) => {
  const statusClass =
    resultStatus === 'success'
      ? 'mobile-status-ok'
      : resultStatus === 'error'
      ? 'mobile-status-error'
      : 'mobile-status-info';

  const StatusIcon =
    resultStatus === 'success' ? '✓' : resultStatus === 'error' ? '✕' : 'ℹ';

  return (
    <div className="mobile-cart-wrapper">

      {/* ── Status bloki ── */}
      <div className={`mobile-status-block ${statusClass}`}>
        <span style={{ fontSize: 14, lineHeight: 1, flexShrink: 0 }}>{StatusIcon}</span>
        <span style={{ fontSize: 13 }}>{resultText}</span>
      </div>

      {/* ── Savat konteyner ── */}
      <div className="mobile-cart-container">
        {sales.length === 0 ? (
          <div className="cart-empty-mobile">
            <Search size={44} />
            <p>{t('cartEmpty')}</p>
          </div>
        ) : (
          sales.map(item => (
            <div key={item.barcode} className="mobile-cart-item">

              {/* Yuqori qator: Nomi + O'chirish */}
              <div className="item-top-row">
                <span className="item-name">{item.name}</span>
                <button
                  onClick={() => updateCount(item.barcode, 0)}
                  style={{
                    background: 'rgba(239,68,68,0.1)',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#ef4444',
                    padding: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {/* Pastki qator: Narx + Stepper */}
              <div className="item-controls-row">
                <div className="item-price-info">
                  <span className="item-total-price">
                    {format(item.price * item.count)}
                  </span>
                  <span className="item-unit-price">
                    {format(item.price)} x {item.count}
                  </span>
                </div>

                <div className="stepper-wrap">
                  <button
                    className="step-btn"
                    onClick={() => updateCount(item.barcode, item.count - 1)}
                  >
                    <Minus size={15} strokeWidth={3} />
                  </button>
                  <span className="step-value">{item.count}</span>
                  <button
                    className="step-btn"
                    onClick={() => updateCount(item.barcode, item.count + 1)}
                  >
                    <Plus size={15} strokeWidth={3} />
                  </button>
                </div>
              </div>

            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ScannerMobileCart;