// src/admin/adminUtils/notificationUtils.ts

let _audioUnlocked = false;
let _audioContext: AudioContext | null = null;

function _getAudioContext(): AudioContext {
  if (!_audioContext) {
    _audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return _audioContext;
}

function _unlockAudio(): void {
  if (_audioUnlocked) return;
  const ctx = _getAudioContext();
  if (ctx.state === 'suspended') {
    ctx.resume();
  }
  
  // Qisqa tovush chiqarib ko'ramiz (ba'zi brauzerlar uchun kerak)
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  gain.gain.value = 0;
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(0);
  osc.stop(0.1);
  
  _audioUnlocked = true;
}

if (typeof window !== "undefined") {
  const _doUnlock = () => {
    _unlockAudio();
    window.removeEventListener("click",      _doUnlock);
    window.removeEventListener("touchstart", _doUnlock);
    window.removeEventListener("keydown",    _doUnlock);
  };
  window.addEventListener("click",      _doUnlock, { once: true });
  window.addEventListener("touchstart", _doUnlock, { once: true });
  window.addEventListener("keydown",    _doUnlock, { once: true });
}

// ─── Brauzer ruxsati ───────────────────────────────────────────────────────

export async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission !== "denied") {
    return (await Notification.requestPermission()) === "granted";
  }
  return false;
}

// ─── Asosiy funksiya ───────────────────────────────────────────────────────

/**
 * Bildirishnoma ko'rsatish.
 */
export function showBrowserNotification(
  title: string,
  body: string,
  icon: string = "/ondexmerchant-192.png"
): void {
  // 1. Ovoz
  playNotificationSound();

  // 2. OS darajasidagi bildirishnoma
  if (!("Notification" in window)) return;

  if (Notification.permission === "granted") {
    navigator.serviceWorker.ready.then((registration) => {
      registration.showNotification(title, {
        body,
        icon,
        badge: icon,
        data: { url: window.location.origin + (document.location.pathname.startsWith('/admin') ? "/admin-chat" : "/chat") },
        tag: "shoxpos-msg",
        requireInteraction: false,
        silent: true 
      });
    }).catch(err => {
      new Notification(title, { body, icon });
    });
  } else if (Notification.permission !== "denied") {
    Notification.requestPermission().then(permission => {
      if (permission === "granted") {
        new Notification(title, { body, icon });
      }
    });
  }
}

// ─── Ovoz ─────────────────────────────────────────────────────────────────

/**
 * Qisqa ping ovozi chaladi.
 */
export function playNotificationSound(url?: string): void {
  const src = url || "/sounds/notification.mp3";
  const audio = new Audio(src);
  audio.volume = 0.6;
  
  // AudioContext orqali ovozni kafolatlash
  if (_audioUnlocked) {
    const ctx = _getAudioContext();
    if (ctx.state === 'suspended') ctx.resume();
  }

  audio.play().catch(() => {
    console.warn("Audio autoplay blocked, trying fallback beep...");
    _playBeep();
  });
}

/** Internet yo'qda yoki brauzer bloklasa Web Audio beep */
function _playBeep(): void {
  try {
    const ctx = _getAudioContext();
    if (ctx.state === 'suspended') {
      // Agar hali unlock bo'lmagan bo'lsa, hech narsa qilolmaymiz
      if (!_audioUnlocked) return;
      ctx.resume();
    }
    
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
  } catch (err) {
    console.error("Beep xatosi:", err);
  }
}

/**
 * Text-to-Speech.
 * @param text   O'qiladigan matn
 * @param lang   'uz-UZ' | 'ru-RU' | 'en-US'
 */
export function playVoiceNotification(text: string, lang = "ru-RU"): void {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang   = lang;
  u.rate   = 1.0;
  u.pitch  = 1.1;
  u.volume = 0.9;
  window.speechSynthesis.speak(u);
}

// ─── Sozlamalar ────────────────────────────────────────────────────────────

export const notificationStorage = {
  isEnabled: () => {
    const val = localStorage.getItem("adminNotifications");
    // Agar hali o'rnatilmagan bo'lsa (null), sukut bo'yicha true qilamiz
    return val === null ? true : val === "true";
  },
  setEnabled: (v: boolean) => localStorage.setItem("adminNotifications", String(v)),
};
