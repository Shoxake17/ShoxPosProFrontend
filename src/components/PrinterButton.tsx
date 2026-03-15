// ============================================
// ShoxPosPro Frontend: PrinterButton.tsx
// ============================================

import React, { useState, useRef } from 'react';
import { Printer, PrinterCheck, PrinterX, ChevronRight } from 'lucide-react';
import QRCode from 'qrcode';

interface PrinterButtonProps {
  sales: any[];
  totalPrice: number;
  theme: 'dark' | 'light';
  t: (key: string) => string;
  finalizeSale: () => Promise<void>;
  setResultText: (text: string) => void;
  setResultStatus: (status: 'info' | 'success' | 'error') => void;
  socket?: any;
}

function generateReceiptId(): string {
  const timestamp = Date.now().toString().slice(-8);
  const random    = Math.floor(Math.random() * 9000 + 1000).toString();
  return timestamp + random; // 12 raqam
}

function formatPrice(price: number): string {
  return Math.round(price)
    .toLocaleString('uz-UZ', { useGrouping: true })
    .replace(/,/g, ' ');
}

// ── Canvas QR → ESC/POS bitmap ──────────────
async function qrToBitmap(text: string, printWidth = 300): Promise<Uint8Array> {
  const canvas = document.createElement('canvas');
  canvas.width  = printWidth;
  canvas.height = printWidth;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, printWidth, printWidth);

  await QRCode.toCanvas(canvas, text, {
    width: printWidth,
    margin: 2,
    color: { dark: '#000000', light: '#FFFFFF' },
    errorCorrectionLevel: 'M',
  });

  const imageData = ctx.getImageData(0, 0, printWidth, printWidth);
  const pixels    = imageData.data;
  const byteWidth = Math.ceil(printWidth / 8);
  const commands: number[] = [];

  for (let y = 0; y < printWidth; y++) {
    commands.push(0x1D, 0x76, 0x30, 0x00);
    commands.push(byteWidth & 0xFF, (byteWidth >> 8) & 0xFF);
    commands.push(1 & 0xFF, 0);

    for (let x = 0; x < byteWidth; x++) {
      let byte = 0;
      for (let bit = 0; bit < 8; bit++) {
        const px = x * 8 + bit;
        if (px < printWidth) {
          const idx = (y * printWidth + px) * 4;
          const brightness = (pixels[idx] + pixels[idx + 1] + pixels[idx + 2]) / 3;
          if (brightness < 128) byte |= (0x80 >> bit);
        }
      }
      commands.push(byte);
    }
  }

  return new Uint8Array(commands);
}

async function registerCashback(
  receiptId: string,
  totalAmount: number,
  storeName = 'ShoxPosPro'
): Promise<void> {
  try {
    const res = await fetch('http://localhost:3000/api/cashback/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ receiptId, totalAmount, storeName }),
    });
    const data = await res.json();
    if (!data.success) console.warn('Cashback register xatosi:', data.message);
    else console.log('✅ Cashback ro\'yxatga olindi:', receiptId);
  } catch (err) {
    console.warn('Cashback register ulanish xatosi:', err);
  }
}

const PrinterButton: React.FC<PrinterButtonProps> = ({
  sales, totalPrice, theme, t, finalizeSale, setResultText, setResultStatus,
}) => {
  const [isPrinting, setIsPrinting] = useState(false);
  const [status, setStatus]         = useState<'idle' | 'success' | 'error'>('idle');
  const cachedDevice                = useRef<any>(null);

  const handlePrint = async () => {
    if (sales.length === 0 || isPrinting) return;
    setIsPrinting(true);
    setStatus('idle');
    setResultText('Printerga ulanmoqda...');
    setResultStatus('info');

    const receiptId  = generateReceiptId();
    const now        = new Date();
    const sana       = now.toLocaleString('uz-UZ');

    // ✅ QR ichiga receiptId + sana + vaqt
    // Format: "ID:517260956441|2026-03-11T17:29:40"
    const isoDate = now.toISOString().slice(0, 19); // "2026-03-11T17:29:40"
    const qrPayload = `ID:${receiptId}|${isoDate}`;

    try {
      // ── 1. USB printer ─────────────────────
      let device = cachedDevice.current;
      if (!device || !device.opened) {
        const paired = await (navigator as any).usb.getDevices();
        device = paired[0] || await (navigator as any).usb.requestDevice({ filters: [] });
        await device.open();
        if (device.configuration === null) await device.selectConfiguration(1);
        await device.claimInterface(0);
        cachedDevice.current = device;
      }

      setResultText('Chek tayyorlanmoqda...');

      // ── 2. ESC/POS ─────────────────────────
      const encoder = new TextEncoder();
      const esc  = '\x1B';
      const line = '--------------------------------\n';
      const parts: Uint8Array[] = [];
      const t2b  = (s: string) => encoder.encode(s);

      parts.push(t2b(`${esc}@`));

      // Sarlavha
      parts.push(t2b(`${esc}a\x01${esc}!\x30SHOXPOSPRO\n${esc}!\x00`));

      // Sana + ID
      parts.push(t2b(
        `Sana:    ${sana}\n` +
        `Chek ID: ${receiptId}\n` +
        line
      ));

      // Mahsulotlar
      for (const item of sales) {
        parts.push(t2b(
          `${item.name.substring(0, 30)}\n` +
          `  ${item.count} x ${formatPrice(item.price)} = ${formatPrice(item.count * item.price)} so'm\n`
        ));
      }

      // Jami
      const cashback = Math.round(totalPrice * 0.01);
      parts.push(t2b(
        `${line}` +
        `${esc}a\x02${esc}E\x01JAMI: ${formatPrice(totalPrice)} so'm\n${esc}E\x00`
      ));

      // ── 3. QR bo'limi ──────────────────────
      parts.push(t2b(
        `\n${esc}a\x01` +
        `${line}` +
        `  1% CASHBACK: ${formatPrice(cashback)} so'm\n` +
        `  ShoxPay ilovasida scan qiling:\n\n`
      ));

      // ✅ QR ichida receiptId + sana/vaqt
      const qrBitmap = await qrToBitmap(qrPayload, 280);
      parts.push(qrBitmap);

      parts.push(t2b(
        `\n\n  Chiqarildi: ${sana}\n` +
        `  Muddat: 24 soat\n` +
        `${line}`
      ));

      parts.push(t2b(`\n${esc}a\x01Xaridingiz uchun rahmat!\n\n\n\n`));
      parts.push(new Uint8Array([0x1D, 0x56, 0x41, 0x00]));

      // ── 4. Merge va print ──────────────────
      const totalLen = parts.reduce((s, p) => s + p.length, 0);
      const merged   = new Uint8Array(totalLen);
      let offset = 0;
      for (const p of parts) { merged.set(p, offset); offset += p.length; }

      await device.transferOut(1, merged);

      // ── 5. Cashback + Sotuv ────────────────
      registerCashback(receiptId, totalPrice);
      await finalizeSale();

      setResultText('Chek chop etildi ✓');
      setResultStatus('success');
      setStatus('success');
      setTimeout(() => setStatus('idle'), 2800);

    } catch (err: any) {
      console.error('Printer xatosi:', err);
      setResultText(`Xato: ${err.message || 'Ulanib bo\'lmadi'}`);
      setResultStatus('error');
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3200);
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <>
      <style>{`
        .printer-container {
          position: relative; width: 40px; height: 40px;
          border-radius: 10px; background: rgba(102,126,234,0.1);
          color: #667eea; display: flex; align-items: center;
          justify-content: center; overflow: hidden;
        }
        .receipt-paper {
          position: absolute; bottom: -100%; left: 50%;
          transform: translateX(-50%); width: 26px; height: 120px;
          background: #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          animation: paper-feed 3.2s cubic-bezier(0.25,0.1,0.25,1) forwards; z-index: 1;
        }
        @keyframes paper-feed {
          0%   { bottom: -100%; opacity: 0.7; }
          30%  { bottom: -15%;  opacity: 1;   }
          100% { bottom: 0%;    opacity: 1;   }
        }
      `}</style>

      <div
        onClick={handlePrint}
        style={{
          background:    theme === 'dark' ? '#091020' : '#fff',
          borderRadius:  16, padding: 20,
          cursor:        isPrinting ? 'wait' : 'pointer',
          border:        '1px solid #2a3144',
          transition:    'all 0.3s ease',
          opacity:       sales.length === 0 ? 0.5 : 1,
          pointerEvents: sales.length === 0 ? 'none' : 'auto',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <div className="printer-container">
              {status === 'idle' && !isPrinting && <Printer size={20} />}
              {isPrinting           && <div className="receipt-paper" />}
              {status === 'success' && <PrinterCheck size={22} color="#22c55e" />}
              {status === 'error'   && <PrinterX     size={22} color="#ef4444" />}
            </div>
            <div>
              <h4 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: theme === 'dark' ? '#fff' : '#1a1f2e' }}>
                {isPrinting ? 'Chop etilmoqda...' : status === 'success' ? 'Tayyor' : 'Chek Chop Etish'}
              </h4>
              <p style={{ fontSize: 13, color: '#8b92a7', margin: '4px 0 0 0' }}>
                {isPrinting ? 'Iltimos kuting' : 'QR cashback bilan chek'}
              </p>
            </div>
          </div>
          <ChevronRight size={20} color="#8b92a7" />
        </div>
      </div>
    </>
  );
};

export default PrinterButton;