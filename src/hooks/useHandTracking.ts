// src/hooks/useHandTracking.ts
import { useEffect, useRef, useState, useCallback } from "react";

export type Gesture =
  | "swipe_left" | "swipe_right" | "swipe_up" | "swipe_down"
  | "fist" | "open_palm" | "point" | "two_finger_scroll" | "none";

export interface HandPoint { x: number; y: number; z: number; }
export interface CursorPos  { x: number; y: number; }

export interface HandTrackingState {
  isActive:  boolean;
  isLoading: boolean;
  gesture:   Gesture;
  landmarks: HandPoint[] | null;
  cursor:    CursorPos | null;
  isFist:    boolean;
  error:     string | null;
  /** Hozir klaviatura ustida turgan barmoq uchi indekslari (4,8,12,16,20) */
  activeFingerTips: number[];
}

interface UseHandTrackingOptions {
  onGesture?:      (gesture: Gesture) => void;
  onSwipeUp?:      () => void;
  onSwipeDown?:    () => void;
  onFistRelease?:  (cursor: CursorPos) => void;
  /** Barmoq uchi klaviatura tugmasiga tekkanda chaqiriladi */
  onFingerTap?:    (fingerIndex: number, x: number, y: number) => void;
  scrollTarget?:   HTMLElement | null;
  scrollSpeed?:    number;
}

// ─── KONSTANTALAR ─────────────────────────────────────────────────────────────
const SMOOTH_FACTOR        = 0.18;
const DETECTION_CONFIDENCE = 0.75;
const TRACKING_CONFIDENCE  = 0.75;
const SENSITIVITY          = 1.4;

const TWO_FINGER_SCROLL_DEADZONE = 0.003;
const TWO_FINGER_SMOOTH          = 0.25;

// Barmoq uchi indekslari (MediaPipe landmark)
// 4=bosh, 8=ko'rsatkich, 12=o'rta, 16=uzuk, 20=jimjiloq
const FINGER_TIPS = [4, 8, 12, 16, 20];

// Barmoq "tik turgan" holati: tip Y < pip Y bo'lsa tik
// Bosh barmoq uchun alohida: tip X < pip X (chapdan qarab)
const FINGER_PIPS = [3, 6, 10, 14, 18];

// Klaviatura "hover zone" — ekran balandligining pastki qancha %
// Bu qiymat VirtualKeyboard balandligiga mos kelishi kerak
// (~220px / screen_height). 0.28 = pastki 28%
const KEYBOARD_ZONE_RATIO = 0.28;

// Tap uchun "debounce" — bir tugma qayta bosilmasin (ms)
const TAP_DEBOUNCE_MS = 320;

// ─────────────────────────────────────────────────────────────────────────────

export function useHandTracking(options: UseHandTrackingOptions = {}) {
  const videoRef  = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const handsRef  = useRef<any>(null);
  const requestRef = useRef<number | undefined>(undefined);

  const optionsRef = useRef(options);
  useEffect(() => { optionsRef.current = options; }, [options]);

  const lastCursorRef      = useRef<CursorPos>({ x: 0.5, y: 0.5 });
  const prevLandmarksRef   = useRef<HandPoint[] | null>(null);
  const wasFistRef         = useRef(false);
  const fistStartCursorRef = useRef<CursorPos | null>(null);
  const lastGestureRef     = useRef<Gesture>("none");
  const gestureTimeoutRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Scroll refs ────────────────────────────────────────────────────────────
  const scrollVelocityRef    = useRef(0);
  const prevTwoFingerYRef    = useRef<number | null>(null);
  const isTwoFingerRef       = useRef(false);
  const scrollRafRef         = useRef<number | undefined>(undefined);

  // ── Finger tap tracking ────────────────────────────────────────────────────
  // Har bir barmoq uchun: klaviatura zone'ga kirdi/chiqdi state'i
  // va oxirgi tap vaqti (debounce uchun)
  const fingerInZoneRef    = useRef<Record<number, boolean>>({});
  const fingerTapTimeRef   = useRef<Record<number, number>>({});
  // Barmoq "pastga bordi" depth tracking (Z axis yoki Y movement)
  const fingerPrevYRef     = useRef<Record<number, number>>({});
  const fingerTappingRef   = useRef<Record<number, boolean>>({});

  const [state, setState] = useState<HandTrackingState>({
    isActive: false, isLoading: false, gesture: "none",
    landmarks: null, cursor: null, isFist: false, error: null,
    activeFingerTips: [],
  });

  // ── Inertia scroll ─────────────────────────────────────────────────────────
  const runInertia = useCallback(() => {
    if (Math.abs(scrollVelocityRef.current) < 0.5) {
      scrollVelocityRef.current = 0;
      return;
    }
    const target = optionsRef.current.scrollTarget;
    if (target) target.scrollBy({ top: scrollVelocityRef.current });
    else window.scrollBy({ top: scrollVelocityRef.current });
    scrollVelocityRef.current *= 0.88;
    scrollRafRef.current = requestAnimationFrame(runInertia);
  }, []);

  // ── 2 barmoq scroll ────────────────────────────────────────────────────────
  const processTwoFingerScroll = useCallback((lms: HandPoint[]) => {
    const speed = optionsRef.current.scrollSpeed ?? 12;
    const avgY  = (lms[8].y + lms[12].y) / 2;
    if (prevTwoFingerYRef.current !== null) {
      const deltaY = avgY - prevTwoFingerYRef.current;
      if (Math.abs(deltaY) > TWO_FINGER_SCROLL_DEADZONE) {
        const targetVelocity = deltaY * speed * 60;
        scrollVelocityRef.current =
          scrollVelocityRef.current * (1 - TWO_FINGER_SMOOTH) +
          targetVelocity * TWO_FINGER_SMOOTH;
        const target = optionsRef.current.scrollTarget;
        if (target) target.scrollBy({ top: scrollVelocityRef.current });
        else window.scrollBy({ top: scrollVelocityRef.current });
      }
    }
    prevTwoFingerYRef.current = avgY;
  }, []);

  // ── Cursor ─────────────────────────────────────────────────────────────────
  const calculateSmoothCursor = (lms: HandPoint[]): CursorPos => {
    let rawX = 1 - lms[9].x;
    let rawY = lms[9].y;
    rawX = (rawX - 0.5) * SENSITIVITY + 0.5;
    rawY = (rawY - 0.5) * SENSITIVITY + 0.5;
    rawX = Math.max(0, Math.min(1, rawX));
    rawY = Math.max(0, Math.min(1, rawY));
    const smoothX = lastCursorRef.current.x + (rawX - lastCursorRef.current.x) * SMOOTH_FACTOR;
    const smoothY = lastCursorRef.current.y + (rawY - lastCursorRef.current.y) * SMOOTH_FACTOR;
    const pos = { x: smoothX, y: smoothY };
    lastCursorRef.current = pos;
    return pos;
  };

  // ── Barmoq uchi klaviatura zone'da ekanligini tekshirish ──────────────────
  // Klaviatura ekranning pastki KEYBOARD_ZONE_RATIO qismida joylashgan
  // Barmoq Y koordinatasi (0..1) > (1 - KEYBOARD_ZONE_RATIO) bo'lsa — zone ichida
  const isInKeyboardZone = (lm: HandPoint): boolean => {
    return lm.y > (1 - KEYBOARD_ZONE_RATIO);
  };

  // ── Barmoq "tap" harakatini aniqlash ─────────────────────────────────────
  // Barmoq klaviatura zone'ga kirgan paytda tap deb hisoblaymiz
  // (pastga kirish = tap boshlandi)
  const processFingerTaps = useCallback((lms: HandPoint[], gesture: Gesture) => {
    // Mushtum yoki ikki barmoq scroll paytida tap ishlamasin
    if (gesture === "fist" || gesture === "two_finger_scroll") {
      return [];
    }

    const activeFingers: number[] = [];
    const now = Date.now();

    FINGER_TIPS.forEach((tipIdx) => {
      const tip = lms[tipIdx];
      const pipIdx = FINGER_PIPS[FINGER_TIPS.indexOf(tipIdx)];
      const pip = lms[pipIdx];

      // Barmoq tik turganini tekshiramiz (bukik barmoqlar tap qilmasin)
      const isExtended = isFingerExtended(lms, tipIdx, pipIdx);
      if (!isExtended) {
        fingerInZoneRef.current[tipIdx] = false;
        fingerTappingRef.current[tipIdx] = false;
        return;
      }

      const inZone = isInKeyboardZone(tip);
      const wasInZone = fingerInZoneRef.current[tipIdx] ?? false;
      const lastTapTime = fingerTapTimeRef.current[tipIdx] ?? 0;

      if (inZone) {
        activeFingers.push(tipIdx);

        // Zone'ga yangi kirdi (leading edge = tap!)
        if (!wasInZone && (now - lastTapTime) > TAP_DEBOUNCE_MS) {
          fingerTapTimeRef.current[tipIdx] = now;

          // Ekran koordinatalarini hisoblash
          // X: mirror qilingan (1 - tip.x), Y: to'g'ridan
          const screenX = (1 - tip.x) * window.innerWidth;
          const screenY = tip.y * window.innerHeight;

          optionsRef.current.onFingerTap?.(tipIdx, screenX, screenY);
        }
      }

      fingerInZoneRef.current[tipIdx] = inZone;
    });

    return activeFingers;
  }, []);

  // ── Barmoq tik turibdimi? ─────────────────────────────────────────────────
  function isFingerExtended(lms: HandPoint[], tipIdx: number, pipIdx: number): boolean {
    if (tipIdx === 4) {
      // Bosh barmoq: X bo'yicha (chapga qarab mirror)
      return lms[tipIdx].x < lms[pipIdx].x;
    }
    // Qolgan barmoqlar: Y bo'yicha (yuqoriga)
    return lms[tipIdx].y < lms[pipIdx].y;
  }

  // ── Asosiy results handler ─────────────────────────────────────────────────
  const handleResults = useCallback((results: any) => {
    const canvas = canvasRef.current;
    const video  = videoRef.current;
    if (!canvas || !video) return;

    if (results.multiHandLandmarks?.length > 0) {
      const lms: HandPoint[] = results.multiHandLandmarks[0];
      const smoothCursor = calculateSmoothCursor(lms);
      const gesture      = detectGesture(lms, prevLandmarksRef.current);

      // ── 2 barmoq scroll ────────────────────────────────────────────────
      const twoFinger = isTwoFingerGesture(lms);
      if (twoFinger) {
        if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current);
        if (!isTwoFingerRef.current) {
          prevTwoFingerYRef.current = null;
          isTwoFingerRef.current = true;
        }
        processTwoFingerScroll(lms);
        setState(prev => ({
          ...prev, landmarks: lms, cursor: smoothCursor,
          gesture: "two_finger_scroll", isFist: false, activeFingerTips: [],
        }));
        drawLandmarks(lms, canvas, video, true, []);
        prevLandmarksRef.current = lms;
        return;
      } else {
        if (isTwoFingerRef.current) {
          isTwoFingerRef.current = false;
          prevTwoFingerYRef.current = null;
          if (Math.abs(scrollVelocityRef.current) > 1) {
            scrollRafRef.current = requestAnimationFrame(runInertia);
          }
        }
      }

      // ── Finger tap detection ──────────────────────────────────────────
      const activeFingerTips = processFingerTaps(lms, gesture);

      // ── Fist click ────────────────────────────────────────────────────
      const isFist = gesture === "fist";
      if (isFist && !wasFistRef.current) {
        fistStartCursorRef.current = smoothCursor;
      }
      if (wasFistRef.current && !isFist) {
        optionsRef.current.onFistRelease?.(fistStartCursorRef.current ?? smoothCursor);
        fistStartCursorRef.current = null;
      }

      if (gesture !== "none" && gesture !== lastGestureRef.current) {
        lastGestureRef.current = gesture;
        optionsRef.current.onGesture?.(gesture);
        if (gesture === "swipe_up")   optionsRef.current.onSwipeUp?.();
        if (gesture === "swipe_down") optionsRef.current.onSwipeDown?.();
        if (gestureTimeoutRef.current) clearTimeout(gestureTimeoutRef.current);
        gestureTimeoutRef.current = setTimeout(() => { lastGestureRef.current = "none"; }, 800);
      }

      wasFistRef.current = isFist;
      prevLandmarksRef.current = lms;
      setState(prev => ({
        ...prev, landmarks: lms, cursor: smoothCursor,
        gesture, isFist, activeFingerTips,
      }));
      drawLandmarks(lms, canvas, video, false, activeFingerTips);

    } else {
      // Qo'l ko'rinmasa
      if (isTwoFingerRef.current) {
        isTwoFingerRef.current = false;
        prevTwoFingerYRef.current = null;
        if (Math.abs(scrollVelocityRef.current) > 1) {
          scrollRafRef.current = requestAnimationFrame(runInertia);
        }
      }
      // Zone state'larni reset
      fingerInZoneRef.current = {};
      fingerTappingRef.current = {};
      prevLandmarksRef.current = null;
      setState(prev => ({
        ...prev, landmarks: null, cursor: null,
        gesture: "none", isFist: false, activeFingerTips: [],
      }));
    }
  }, [processTwoFingerScroll, runInertia, processFingerTaps]);

  // ── Start ──────────────────────────────────────────────────────────────────
  const start = useCallback(async () => {
    if (state.isActive) return;
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      if (!(window as any).Hands) {
        await new Promise<void>((res, rej) => {
          const s = document.createElement("script");
          s.src = "https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js";
          s.crossOrigin = "anonymous";
          s.onload  = () => res();
          s.onerror = () => rej(new Error("MediaPipe yuklanmadi"));
          document.head.appendChild(s);
        });
      }

      const hands = new (window as any).Hands({
        locateFile: (f: string) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`,
      });
      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: DETECTION_CONFIDENCE,
        minTrackingConfidence:  TRACKING_CONFIDENCE,
      });
      hands.onResults(handleResults);
      handsRef.current = hands;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: "user" },
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadeddata = () => {
          videoRef.current?.play();
          const run = async () => {
            if (handsRef.current && videoRef.current && streamRef.current?.active) {
              await handsRef.current.send({ image: videoRef.current });
              requestRef.current = requestAnimationFrame(run);
            }
          };
          run();
          setState(prev => ({ ...prev, isActive: true, isLoading: false }));
        };
      }
    } catch (err: any) {
      setState(prev => ({
        ...prev, isLoading: false,
        error: err.message || "Kamera xatosi",
      }));
    }
  }, [handleResults, state.isActive]);

  // ── Stop ───────────────────────────────────────────────────────────────────
  const stop = useCallback(() => {
    if (requestRef.current)    cancelAnimationFrame(requestRef.current);
    if (scrollRafRef.current)  cancelAnimationFrame(scrollRafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (handsRef.current) {
      handsRef.current.close();
      handsRef.current = null;
    }
    setState(prev => ({
      ...prev, isActive: false, cursor: null,
      landmarks: null, gesture: "none", activeFingerTips: [],
    }));
  }, []);

  useEffect(() => () => stop(), [stop]);

  return { state, videoRef, canvasRef, start, stop };
}

// ─── YORDAMCHI FUNKSIYALAR ────────────────────────────────────────────────────

function isTwoFingerGesture(lms: HandPoint[]): boolean {
  const indexUp  = lms[8].y  < lms[6].y;
  const middleUp = lms[12].y < lms[10].y;
  const ringDown  = lms[16].y > lms[14].y;
  const pinkyDown = lms[20].y > lms[18].y;
  return indexUp && middleUp && ringDown && pinkyDown;
}

function detectGesture(lms: HandPoint[], prev: HandPoint[] | null): Gesture {
  const tips = [4, 8, 12, 16, 20];
  const pips = [3, 6, 10, 14, 18];

  const fingersUp = tips.map((tip, i) => {
    if (i === 0) return lms[tip].x < lms[pips[i]].x;
    return lms[tip].y < lms[pips[i]].y;
  });

  const upCount = fingersUp.filter(Boolean).length;
  if (upCount === 0) return "fist";
  if (upCount >= 4)  return "open_palm";

  if (prev) {
    const dy = lms[0].y - prev[0].y;
    const dx = lms[0].x - prev[0].x;
    if (dy < -0.1) return "swipe_up";
    if (dy > 0.1)  return "swipe_down";
    if (dx < -0.1) return "swipe_right";
    if (dx > 0.1)  return "swipe_left";
  }
  return "none";
}

function drawLandmarks(
  lms: HandPoint[],
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  isTwoFinger: boolean,
  activeFingerTips: number[],
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  canvas.width  = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Klaviatura zone'ni ko'rsatish (debug uchun — yoqish ixtiyoriy)
  // const zoneY = canvas.height * (1 - KEYBOARD_ZONE_RATIO);
  // ctx.strokeStyle = "rgba(59,130,246,0.3)";
  // ctx.setLineDash([8, 4]);
  // ctx.beginPath();
  // ctx.moveTo(0, zoneY);
  // ctx.lineTo(canvas.width, zoneY);
  // ctx.stroke();
  // ctx.setLineDash([]);

  const connections = [
    [0,1],[1,2],[2,3],[3,4],
    [0,5],[5,6],[6,7],[7,8],
    [5,9],[9,10],[10,11],[11,12],
    [9,13],[13,14],[14,15],[15,16],
    [13,17],[17,18],[18,19],[19,20],
    [0,17],
  ];

  ctx.strokeStyle = isTwoFinger ? "#38bdf8" : "#00ffc8";
  ctx.lineWidth   = isTwoFinger ? 3 : 2;

  connections.forEach(([i, j]) => {
    ctx.beginPath();
    ctx.moveTo(lms[i].x * canvas.width, lms[i].y * canvas.height);
    ctx.lineTo(lms[j].x * canvas.width, lms[j].y * canvas.height);
    ctx.stroke();
  });

  lms.forEach((p, i) => {
    const isScrollFinger = isTwoFinger && (i === 8 || i === 12);
    const isActiveTip    = activeFingerTips.includes(i);
    const isTip          = [4, 8, 12, 16, 20].includes(i);

    // Aktiv barmoq uchi — yashil (klaviatura ustida)
    if (isActiveTip) {
      // Tashqi halqa (glow effekti)
      ctx.fillStyle = "rgba(34,197,94,0.3)";
      ctx.beginPath();
      ctx.arc(p.x * canvas.width, p.y * canvas.height, 14, 0, Math.PI * 2);
      ctx.fill();
      // Asosiy nuqta
      ctx.fillStyle = "#22c55e";
      ctx.beginPath();
      ctx.arc(p.x * canvas.width, p.y * canvas.height, 7, 0, Math.PI * 2);
      ctx.fill();
    } else if (isScrollFinger) {
      ctx.fillStyle = "#facc15";
      ctx.beginPath();
      ctx.arc(p.x * canvas.width, p.y * canvas.height, 8, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = isTip ? "#ff5078" : "#ff5078";
      ctx.beginPath();
      ctx.arc(
        p.x * canvas.width, p.y * canvas.height,
        isTip ? 5 : (i % 4 === 0 ? 4 : 3),
        0, Math.PI * 2,
      );
      ctx.fill();
    }
  });
}