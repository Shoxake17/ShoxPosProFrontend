// ShoxPosPro Frontend: PrinterButton.tsx
import React, { useState, useRef } from 'react';
import { Printer, PrinterCheck, PrinterX, ChevronRight } from 'lucide-react';

interface PrinterButtonProps {
  sales: any[];
  totalPrice: number;
  theme: 'dark' | 'light';
  t: (key: string) => string;
  finalizeSale: () => Promise<void>;
  setResultText: (text: string) => void;
  setResultStatus: (status: 'info' | 'success' | 'error') => void;
  socket?: any;
  listenF8?: boolean;
  customContent?: React.ReactNode;
  printerConnected?: boolean | null;
  printerModel?: string;
  checkingPrinter?: boolean;
}

/**
 * 12 raqamli noyob Chek ID generatsiyasi
 */
function generateReceiptId(): string {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 9000 + 1000).toString();
  return timestamp + random;
}

function formatPrice(price: number): string {
  return Math.round(price)
    .toLocaleString('uz-UZ', { useGrouping: true })
    .replace(/,/g, ' ');
}

const PrinterButton: React.FC<PrinterButtonProps> = ({
  sales, totalPrice, theme, t, finalizeSale, setResultText, setResultStatus,
  customContent, printerConnected, printerModel, checkingPrinter, listenF8
}) => {
  const [isPrinting, setIsPrinting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const cachedDevice = useRef<any>(null);

  // Status text for the printer
  const printerStatusText = checkingPrinter
    ? 'Tekshirilmoqda...'
    : printerConnected
      ? `(OK) ${printerModel || 'Printer ulangan'}`
      : 'Printer ulanmagan';

  const printerStatusColor = printerConnected ? '#10b981' : '#8b92a7';

  // --- Listen for F8 or Mobile Print Event ---
  React.useEffect(() => {
    if (listenF8) {
      const handlePrintEvent = () => handlePrint();
      window.addEventListener('pos:chek', handlePrintEvent);
      return () => window.removeEventListener('pos:chek', handlePrintEvent);
    }
  }, [listenF8, sales, totalPrice]); // Re-bind if sales/price change

  const handlePrint = async () => {
    if (sales.length === 0 || isPrinting) return;
    setIsPrinting(true);
    setStatus('idle');
    setResultText(t('printerConnecting'));
    setResultStatus('info');

    const receiptId = generateReceiptId();

    try {
      const printedAt = new Date();

      // --- 1. USB printerga ulanish (WebUSB API) ---
      let device = cachedDevice.current;
      if (!device || !device.opened) {
        const paired = await (navigator as any).usb.getDevices();
        device = paired[0] || await (navigator as any).usb.requestDevice({ filters: [] });
        await device.open();
        if (device.configuration === null) await device.selectConfiguration(1);
        await device.claimInterface(0);
        cachedDevice.current = device;
      }

      setResultText(t('receiptPreparing'));

      // --- 2. ESC/POS buyruqlarini shakllantirish ---
      const encoder = new TextEncoder();
      const esc = '\x1B', line = '--------------------------------\n';
      const parts: Uint8Array[] = [];
      const t2b = (s: string) => encoder.encode(s);
      
      // Chekda chiroyli ko'rinishi uchun lokal sana
      const sanaLokal = printedAt.toLocaleString('uz-UZ');

      parts.push(t2b(`${esc}@`)); // Reset printer
      parts.push(t2b(`${esc}a\x01${esc}!\x30ONDEX MERCHANT\n${esc}!\x00`)); // Center align + Double height
      parts.push(t2b(`Sana:    ${sanaLokal}\nChek ID: ${receiptId}\n${line}`));

      // Mahsulotlar ro'yxati
      for (const item of sales) {
        parts.push(t2b(
          `${item.name.substring(0, 30)}\n` +
          `  ${item.count} x ${formatPrice(item.price)} = ${formatPrice(item.count * item.price)} so'm\n`
        ));
      }

      parts.push(t2b(`${line}${esc}a\x02${esc}E\x01JAMI: ${formatPrice(totalPrice)} so'm\n${esc}E\x00`));
      parts.push(t2b(`\n${esc}a\x01${line}Xaridingiz uchun rahmat!\n\n\n\n`));
      parts.push(new Uint8Array([0x1D, 0x56, 0x41, 0x00])); // Paper cut

      // Barcha qismlarni bitta massivga yig'ish
      const totalLen = parts.reduce((s, p) => s + p.length, 0);
      const merged = new Uint8Array(totalLen);
      let offset = 0;
      for (const p of parts) { merged.set(p, offset); offset += p.length; }

      // Printerga yuborish
      await device.transferOut(1, merged);

      // --- 3. Sotuvni ma'lumotlar bazasida yakunlash ---
      await finalizeSale();

      setResultText(t('receiptPrinted'));
      setResultStatus('success');
      setStatus('success');
      setTimeout(() => setStatus('idle'), 2800);

    } catch (err: any) {
      console.error('Printer xatosi:', err);
      setStatus('error');
      setResultStatus('error');
      setResultText(`${t('errorPrefix')}: ${err.message}`);
      setTimeout(() => setStatus('idle'), 3200);
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <>
      <style>{`
        .printer-container { position: relative; width: 40px; height: 40px; border-radius: 10px; background: rgba(102,126,234,0.1); color: #667eea; display: flex; align-items: center; justify-content: center; overflow: hidden; }
        .receipt-paper { position: absolute; bottom: -100%; left: 50%; transform: translateX(-50%); width: 26px; height: 120px; background: #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.15); animation: paper-feed 3.2s cubic-bezier(0.25,0.1,0.25,1) forwards; z-index: 1; }
        @keyframes paper-feed { 0% { bottom: -100%; opacity: 0.7; } 30% { bottom: -15%; opacity: 1; } 100% { bottom: 0%; opacity: 1; } }
      `}</style>
      
      <div 
        onClick={handlePrint} 
        style={{ 
          background: theme === 'dark' ? '#091020' : '#fff', 
          borderRadius: 16, 
          padding: 20, 
          cursor: isPrinting ? 'wait' : 'pointer', 
          border: '1px solid #2a3144', 
          transition: 'all 0.3s ease', 
          opacity: sales.length === 0 ? 0.5 : 1, 
          pointerEvents: sales.length === 0 ? 'none' : 'auto' 
        }}
      >
        {customContent ? customContent : (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <div className="printer-container">
                {status === 'idle' && !isPrinting && <Printer size={20} />}
                {isPrinting && <div className="receipt-paper" />}
                {status === 'success' && <PrinterCheck size={22} color="#22c55e" />}
                {status === 'error' && <PrinterX size={22} color="#ef4444" />}
              </div>
              <div>
                <h4 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: theme === 'dark' ? '#fff' : '#1a1f2e' }}>
                  {isPrinting ? t('printing') : status === 'success' ? t('ready') : t('printReceiptTitle')}
                </h4>
                <p style={{ 
                  fontSize: 13, 
                  color: printerStatusColor, 
                  margin: '4px 0 0 0',
                  fontWeight: printerConnected ? '600' : '400'
                }}>
                  {isPrinting ? t('pleaseWait') : printerStatusText}
                </p>
              </div>
            </div>
            <ChevronRight size={20} color="#8b92a7" />
          </div>
        )}
      </div>
    </>
  );
};

export default PrinterButton;
