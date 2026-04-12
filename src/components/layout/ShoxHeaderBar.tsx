import React, { useState, useEffect } from "react";
import { Maximize2, Minimize2 } from "lucide-react";

const FakeHeaderBar = () => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const handleFSChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleFSChange);
    return () => document.removeEventListener("fullscreenchange", handleFSChange);
  }, []);

  const toggleFS = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => console.error(err));
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
    }
  };

  return (
    <div 
      // Sichqoncha butun header maydoniga kirganda logotip paydo bo'ladi
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: 'fixed',
        left: 'env(titlebar-area-x, 0px)',
        top: 'env(titlebar-area-y, 0px)',
        width: 'env(titlebar-area-width, 100%)',
        height: 'env(titlebar-area-height, 33px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'transparent', 
        zIndex: 10000,
        userSelect: 'none',
        appRegion: 'drag', // Dasturni sudrash imkoniyati
      } as any}
    >
      
      {/* 1. Logotip qismi: Hover bo'lganda silliq chiqadi */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'end', 
        gap: '8px', 
        paddingLeft: '10px',
        opacity: isHovered ? 1 : 0, 
        transition: 'opacity 0.3s ease-in-out',
        pointerEvents: isHovered ? 'auto' : 'none'
      }}>
      </div>

      {/* 2. Tugmalar qismi: Bu qism ham hoverda yoki doimiy ko'rinishi mumkin */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center',
        paddingRight: '10px',
        appRegion: 'no-drag' // Tugmani bosganda sudrab ketmaslik uchun
      } as any}>
        <button
          onClick={toggleFS}
          style={{
            background: 'black',
            border: 'none',
            color: '#ffffff',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            transition: 'color 0.2s',
          }}
          onMouseOver={(e) => e.currentTarget.style.color = '#64748b'}
          onMouseOut={(e) => e.currentTarget.style.color = '#ffffff'}
        >
          {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>
      </div>
    </div>
  );
};

export default FakeHeaderBar;
