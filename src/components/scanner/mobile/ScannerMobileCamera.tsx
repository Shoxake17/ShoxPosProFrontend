import React from 'react';
import { X, RefreshCcw } from 'lucide-react';

interface ScannerMobileCameraProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  cameraDevices: MediaDeviceInfo[];
  t: (key: string) => string;
  onClose: () => void;
  onToggleCamera: () => void;
}

export const mobileCameraStyles = `
  /* ── To'liq ekran kamera rejimi ── */
  .cam-preview-mobile {
    position: fixed;
    inset: 0;
    z-index: 2000;
    background: #000;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .cam-preview-mobile video {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  /* ── Skaner overlay (markazlashtirish) ── */
  .cam-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    z-index: 2050;
  }

  /* ── Skaner kvadrati ── */
  .scan-square {
    width: 260px;
    height: 260px;
    position: relative;
    background: transparent;
    /* Atrofni qorong'u qilish */
    box-shadow: 0 0 0 9999px rgba(0,0,0,0.52);
    border-radius: 20px;
  }

  /* ── Burchak indikatorlari (neon) ── */
  .scan-square::before,
  .scan-square::after {
    content: '';
    position: absolute;
    width: 36px;
    height: 36px;
    border-color: #6366f1;
    border-style: solid;
  }

  /* Yuqori-chap + Pastki-o'ng */
  .scan-square::before {
    top: -2px;
    left: -2px;
    border-width: 4px 0 0 4px;
    border-radius: 14px 0 0 0;
    box-shadow: 0 0 12px rgba(99,102,241,0.8);
  }

  .scan-square::after {
    bottom: -2px;
    right: -2px;
    border-width: 0 4px 4px 0;
    border-radius: 0 0 14px 0;
    box-shadow: 0 0 12px rgba(99,102,241,0.8);
  }

  /* Yuqori-o'ng burchak */
  .scan-corner-tr {
    position: absolute;
    width: 36px;
    height: 36px;
    top: -2px;
    right: -2px;
    border: 4px solid #6366f1;
    border-left: none;
    border-bottom: none;
    border-radius: 0 14px 0 0;
    box-shadow: 0 0 12px rgba(99,102,241,0.8);
  }

  /* Pastki-chap burchak */
  .scan-corner-bl {
    position: absolute;
    width: 36px;
    height: 36px;
    bottom: -2px;
    left: -2px;
    border: 4px solid #6366f1;
    border-right: none;
    border-top: none;
    border-radius: 0 0 0 14px;
    box-shadow: 0 0 12px rgba(99,102,241,0.8);
  }

  /* ── Skaner chizig'i animatsiyasi ── */
  .scan-line-anim {
    position: absolute;
    top: 12px;
    left: 12px;
    right: 12px;
    height: 2px;
    background: linear-gradient(90deg, transparent, #6366f1, transparent);
    box-shadow: 0 0 10px rgba(99,102,241,0.9);
    animation: scan-move 2.4s ease-in-out infinite;
  }

  @keyframes scan-move {
    0%, 100% { top: 12px;  opacity: 0.4; }
    50%       { top: 236px; opacity: 1;   }
  }

  /* ── Hint matni ── */
  .scan-hint {
    margin-top: 28px;
    color: rgba(255,255,255,0.85);
    font-size: 15px;
    font-weight: 500;
    text-align: center;
    text-shadow: 0 2px 8px rgba(0,0,0,0.6);
    letter-spacing: 0.2px;
    padding: 0 32px;
  }

  /* ── Yopish tugmasi ── */
  .cam-close-btn {
    position: absolute;
    top: 48px;
    right: 20px;
    z-index: 2100;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: rgba(0,0,0,0.55);
    border: 1.5px solid rgba(255,255,255,0.15);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: #fff;
    WebkitTapHighlightColor: transparent;
    backdrop-filter: blur(8px);
    transition: background 0.15s;
  }

  .cam-close-btn:active {
    background: rgba(0,0,0,0.75);
  }

  /* ── Kamera almashtirish tugmasi ── */
  .cam-switch-btn {
    position: absolute;
    bottom: 56px;
    right: 24px;
    z-index: 2100;
    width: 50px;
    height: 50px;
    border-radius: 50%;
    background: rgba(0,0,0,0.55);
    border: 1.5px solid rgba(255,255,255,0.15);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: #fff;
    WebkitTapHighlightColor: transparent;
    backdrop-filter: blur(8px);
    transition: background 0.15s;
  }

  .cam-switch-btn:active {
    background: rgba(0,0,0,0.75);
  }
`;

const ScannerMobileCamera: React.FC<ScannerMobileCameraProps> = ({
  videoRef,
  cameraDevices,
  t,
  onClose,
  onToggleCamera,
}) => {

  // ✅ X bosilganda stream DARHOL o'chadi
  const handleClose = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => {
        track.enabled = false;
        track.stop();          // ← kamera chiroqni o'chiradi
      });
      videoRef.current.srcObject = null;
    }
    onClose(); // keyin parent'ga xabar beradi
  };

  return (
    <div className="cam-preview-mobile">
      <video ref={videoRef} autoPlay muted playsInline />

      {/* ✅ onClick={handleClose} — eski onClose emas */}
      <button className="cam-close-btn" onClick={handleClose}>
        <X size={22} />
      </button>

      {cameraDevices.length > 1 && (
        <button className="cam-switch-btn" onClick={onToggleCamera}>
          <RefreshCcw size={22} />
        </button>
      )}

      <div className="cam-overlay">
        <div className="scan-square">
          <div className="scan-corner-tr" />
          <div className="scan-corner-bl" />
          <div className="scan-line-anim" />
        </div>
        <p className="scan-hint">
          {t('scanSquareText') || 'Barkodni ramka ichiga joylashtiring'}
        </p>
      </div>
    </div>
  );
};

export default ScannerMobileCamera;