// src/components/HandCursor.tsx
import React from 'react';

interface HandCursorProps {
  pos: { x: number; y: number } | null;
  isFist: boolean;
}

const HandCursor: React.FC<HandCursorProps> = ({ pos, isFist }) => {
  if (!pos) return null;

  return (
    <div
      style={{
        position: 'fixed',
        left: `${pos.x * 100}%`,
        top: `${pos.y * 100}%`,
        width: isFist ? 20 : 24,
        height: isFist ? 20 : 24,
        backgroundColor: isFist ? '#ff4757' : '#00ffc8',
        borderRadius: '50%',
        border: '3px solid white',
        boxShadow: isFist
          ? '0 0 18px rgba(255,71,87,0.8)'
          : '0 0 15px rgba(0,255,200,0.7)',
        transform: 'translate(-50%, -50%)',
        // ✅ Klaviatura zIndex: 99999 dan YUQORI bo'lishi uchun
        zIndex: 2147483647, // maksimal zIndex qiymati
        pointerEvents: 'none',
        transition: 'background-color 0.15s ease, width 0.1s, height 0.1s, box-shadow 0.15s',
      }}
    />
  );
};

export default HandCursor;
