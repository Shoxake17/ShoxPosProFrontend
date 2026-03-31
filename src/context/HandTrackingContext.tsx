import React, { createContext, useContext, ReactNode, useEffect, useState, useRef } from "react";
import { useHandTracking, HandTrackingState, CursorPos } from "../hooks/useHandTracking";
import HandCursor from "../components/HandCursor";
// import VirtualKeyboard from "../components/VirtualKeyboard";
// ✅ 1. Eski getTranslation importini o'rniga o'zimizning asosiy useTranslation'ni olamiz
import { useTranslation } from "../components/languages/Settings"; 

interface HandTrackingContextType {
  state: HandTrackingState;
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  start: () => Promise<void>;
  stop: () => void;
}

const HandTrackingContext = createContext<HandTrackingContextType | null>(null);

function getElementAt(x: number, y: number): HTMLElement | null {
  let node = document.elementFromPoint(x, y);
  let depth = 0;
  while (node && depth < 10) {
    if (node instanceof HTMLElement) return node;
    node = node.parentElement;
    depth++;
  }
  return null;
}

function simulateClick(element: HTMLElement, x: number, y: number) {
  const eventInit: MouseEventInit = { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0, buttons: 1 };
  element.dispatchEvent(new MouseEvent("mousedown", eventInit));
  element.dispatchEvent(new MouseEvent("mouseup", { ...eventInit, buttons: 0 }));
  element.dispatchEvent(new MouseEvent("click", eventInit));

  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    element.focus();
    const len = element.value.length;
    element.setSelectionRange(len, len);
  }
}

export function HandTrackingProvider({ children }: { children: ReactNode }) {
  // ✅ 2. Hookdan foydalanamiz. Til o'zgarishi bilan bu komponent avtomatik render bo'ladi!
  const { t } = useTranslation(); 

  const [isVisualControlEnabled, setIsVisualControlEnabled] = useState(() => {
    return localStorage.getItem('handControlEnabled') === 'true';
  });

  const [panelPos, setPanelPos] = useState({ x: window.innerWidth - 200, y: window.innerHeight - 150 });
  const [isDragging, setIsDragging] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const syncStatus = () => {
      const status = localStorage.getItem('handControlEnabled') === 'true';
      setIsVisualControlEnabled(status);
    };
    window.addEventListener('handControlUpdate', syncStatus);
    window.addEventListener('storage', syncStatus);
    return () => {
      window.removeEventListener('handControlUpdate', syncStatus);
      window.removeEventListener('storage', syncStatus);
    };
  }, []);

  const tracking = useHandTracking({
    onFistRelease: (cursor: CursorPos) => {
      if (!isVisualControlEnabled) return;
      if (isDragging) {
        setIsDragging(false);
        return;
      }

      const xPx = cursor.x * window.innerWidth;
      const yPx = cursor.y * window.innerHeight;
      const element = getElementAt(xPx, yPx);
      if (!element) return;

      try {
        simulateClick(element, xPx, yPx);
      } catch (err) {
        // ✅ 3. Dinamik tarjima
        console.warn(t('clickError'), err); 
      }
    },
  });

  const { state, videoRef, canvasRef, start, stop } = tracking;

  useEffect(() => {
    if (!isVisualControlEnabled || !state.cursor) return;
    const xPx = state.cursor.x * window.innerWidth;
    const yPx = state.cursor.y * window.innerHeight;

    if (state.isFist) {
      const buffer = 120;
      const dx = Math.abs(xPx - (panelPos.x + 90));
      const dy = Math.abs(yPx - (panelPos.y + 50));

      if (!isDragging && dx < buffer && dy < buffer) {
        setIsDragging(true);
      }

      if (isDragging) {
        setPanelPos({ x: xPx - 90, y: yPx - 50 });
      }
    } else {
      if (isDragging) setIsDragging(false);
    }
  }, [state.cursor, state.isFist, isDragging, panelPos, isVisualControlEnabled]);

  useEffect(() => {
    if (!isVisualControlEnabled && state.isActive) {
      stop();
    }
  }, [isVisualControlEnabled, state.isActive, stop]);

  const isDark = !document.documentElement.classList.contains("light");

  return (
    <HandTrackingContext.Provider value={tracking}>
      {children}
      {isVisualControlEnabled && (
        <>
          <HandCursor pos={state.cursor} isFist={state.isFist} />
          {/* <VirtualKeyboard theme={isDark ? "dark" : "light"} /> */}
          
          <div 
            ref={panelRef}
            style={{
              position: "fixed", left: panelPos.x, top: panelPos.y, 
              width: 180, aspectRatio: "16/9", borderRadius: "12px", 
              border: `2px solid ${isDragging ? "#facc15" : (state.isActive ? "#00ffc8" : "#334155")}`,
              background: "#000", overflow: "hidden", zIndex: 1000, 
              boxShadow: isDragging ? "0 20px 50px rgba(0,0,0,0.7)" : "0 10px 25px rgba(0,0,0,0.5)",
              transition: isDragging ? "none" : "all 0.3s ease",
              cursor: isDragging ? "grabbing" : "grab", touchAction: "none"
            }}
          >
            <video ref={videoRef} style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }} />
            <canvas ref={canvasRef} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }} />
            
            <button 
              onClick={(e) => {
                e.stopPropagation();
                state.isActive ? stop() : start();
              }} 
              style={{
                position: "absolute", bottom: 5, left: "50%", transform: "translateX(-50%)",
                padding: "4px 10px", borderRadius: "20px", border: "none",
                backgroundColor: state.isActive ? "#ef4444" : "#3b82f6", 
                color: "white", fontSize: "10px", fontWeight: "bold",
                cursor: "pointer", zIndex: 1001
              }}
            >
              {/* ✅ 4. t() funksiyasi orqali dinamik matnlar */}
              {state.isLoading 
                ? t('loading') 
                : state.isActive 
                  ? t('stop') 
                  : t('start')
              }
            </button>
          </div>
        </>
      )}
    </HandTrackingContext.Provider>
  );
}

export function useHandTrackingContext() {
  const { t } = useTranslation(); // ✅ Dinamik xatolik xabari
  const ctx = useContext(HandTrackingContext);
  if (!ctx) throw new Error(t('errorContext'));
  return ctx;
}