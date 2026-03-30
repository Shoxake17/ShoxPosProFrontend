// src/admin/adminUtils/notificationUtils.ts

let _audioUnlocked = false;

function _unlockAudio(): void {
  if (_audioUnlocked) return;
  _audioUnlocked = true;
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const buf = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(0);
    ctx.close();
  } catch (_) {}
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
 * HAR DOIM custom UI ishlatadi (focus sharti yo'q).
 *
 * ⚠️  icon yo'li:
 *   - public/ShoxPosPro.png bo'lsa → icon = "/ShoxPosPro.png"
 *   - src/assets/ da bo'lsa:
 *       import logo from '../../assets/ShoxPosPro.png'
 *       showBrowserNotification(title, body, logo)
 */
export function showBrowserNotification(
  title: string,
  body: string,
  icon: string = "/shoxpospro.png"
): void {
  // 1. Ovoz (Ilova ochiqligida ovoz chiqadi)
  playNotificationSound();

  // 2. OS darajasidagi bildirishnoma (PWA uchun)
  if (!("Notification" in window)) return;

  // Agar ruxsat berilmagan bo'lsa, so'raymiz
  if (Notification.permission === "default") {
    Notification.requestPermission();
  }

  if (Notification.permission === "granted") {
    // Service Worker orqali yuborish (Async ishlaydi)
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
      // SW tayyor bo'lmasa oddiy Notification
      new Notification(title, { body, icon });
    });
  }
}

// ─── Ovoz ─────────────────────────────────────────────────────────────────

/**
 * Qisqa ping ovozi chaladi.
 * @param url   Ixtiyoriy: o'z audio faylingiz, masalan "/sounds/ping.mp3"
 */
export function playNotificationSound(url?: string): void {
  const src = url || "/sounds/notification.mp3";
  const audio = new Audio(src);
  audio.volume = 0.55;
  audio.play().catch(() => _playBeep());
}

/** Internet yo'qda yoki CDN ishlamasa Web Audio beep */
function _playBeep(): void {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
    osc.onended = () => ctx.close();
  } catch (_) {}
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