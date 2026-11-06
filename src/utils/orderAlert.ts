// Yangi buyurtma signali: ovoz, tizim bildirishnomasi va sarlavha miltillashi.
//
// BRAUZER QOIDASI: ovoz (AudioContext) va bildirishnoma ruxsati faqat FOYDALANUVCHI HARAKATIDAN
// (bosish/tugma) KEYIN ishlaydi. Shuning uchun birinchi bosishda ovoz "ochiladi" (`unlockAudio`);
// u ochilmasa signal jim o'tadi — sahifa buni ko'rsatib, "yoqish" tugmasini beradi.

let ctx: AudioContext | null = null;
let ringTimer: ReturnType<typeof setTimeout> | null = null;
let titleTimer: ReturnType<typeof setInterval> | null = null;
let baseTitle = '';

type WinWithAudio = Window & { webkitAudioContext?: typeof AudioContext; __orderRings?: number };

function audioCtor(): typeof AudioContext | undefined {
  const w = window as WinWithAudio;
  return window.AudioContext || w.webkitAudioContext;
}

// OnDex ilovalaridagi (restaurant_panel) bilan BIR XIL qo'ng'iroq: `ding.mp3` qabul qilinmagan
// buyurtma qolmaguncha to'xtamay takrorlanadi (qisqa signal qulog'iga tegmay qolishi mumkin).
const SOUND_URL = '/sounds/ding.mp3';
const SOUND_KEY = 'merchant.newOrderSound';
let loopEl: HTMLAudioElement | null = null;
let loopUnlocked = false;

function loopAudio(): HTMLAudioElement {
  if (!loopEl) {
    loopEl = new Audio(SOUND_URL);
    loopEl.loop = true;
    loopEl.preload = 'auto';
  }
  return loopEl;
}

/** "Yangi buyurtma ovozi" sozlamasi (standart: yoqiq). */
export function isSoundEnabled(): boolean {
  try { return localStorage.getItem(SOUND_KEY) !== 'off'; } catch { return true; }
}

export function setSoundEnabled(on: boolean): void {
  try { localStorage.setItem(SOUND_KEY, on ? 'on' : 'off'); } catch { /* xotira yopiq */ }
  if (!on) stopLoop();
}

/** Ovoz ishlashga tayyormi (foydalanuvchi sahifa bilan o'zaro ishlagan). */
export function isAudioReady(): boolean {
  return loopUnlocked || (ctx !== null && ctx.state === 'running');
}

/** Ovozni "ochadi". Faqat foydalanuvchi harakati ichida chaqiriladi. */
export function unlockAudio(): boolean {
  let ok = false;
  try {
    const a = loopAudio();
    if (!loopUnlocked) {
      a.muted = true;
      a.play().then(() => { a.pause(); a.currentTime = 0; a.muted = false; loopUnlocked = true; }).catch(() => { a.muted = false; });
    }
    ok = true;
  } catch { /* quyidagi AudioContext ham sinab ko'riladi */ }
  try {
    const Ctor = audioCtor();
    if (!Ctor) return ok;
    if (!ctx) ctx = new Ctor();
    if (ctx.state === 'suspended') void ctx.resume();
    return ok || ctx.state !== 'closed';
  } catch {
    return ok;
  }
}

/** Qo'ng'iroqni TO'XTAMAY boshlaydi (qabul qilinmagan buyurtma bor). `false` — brauzer bloklagan. */
export async function startLoop(): Promise<boolean> {
  if (!isSoundEnabled()) return false;
  try {
    const a = loopAudio();
    a.muted = false;
    if (!a.paused) return true;
    await a.play();
    loopUnlocked = true;
    return true;
  } catch {
    return false; // foydalanuvchi sahifani hali bosmagan — "Yoqish" ko'rsatiladi
  }
}

export function stopLoop(): void {
  if (loopEl) { loopEl.pause(); loopEl.currentTime = 0; }
  stopRing();
}

/** Birinchi bosish/teginishda ovozni ochadi (bir marta). Qaytaradi: tinglovchilarni olib tashlash. */
export function attachAudioUnlock(onUnlocked?: () => void): () => void {
  const events: (keyof WindowEventMap)[] = ['pointerdown', 'keydown', 'touchstart'];
  const handler = () => {
    if (unlockAudio()) {
      detach();
      onUnlocked?.();
    }
  };
  const detach = () => events.forEach((e) => window.removeEventListener(e, handler, true));
  events.forEach((e) => window.addEventListener(e, handler, true));
  return detach;
}

function beepOnce(c: AudioContext, freq: number, at: number): void {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  const t0 = c.currentTime + at;
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(0.5, t0 + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.3);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + 0.32);
}

/**
 * Qo'ng'iroq: ikki tonli signal, `times` marta (do'kon ovozni eshitishi uchun takrorlanadi).
 * Ovoz ochilmagan bo'lsa `false` qaytaradi (hech narsa chalinmaydi).
 */
export function ring(times = 3): boolean {
  const w = window as WinWithAudio;
  w.__orderRings = (w.__orderRings || 0) + 1; // sinov/diagnostika uchun
  if (!ctx || ctx.state !== 'running') {
    if (!unlockAudio() || !ctx || ctx.state !== 'running') return false;
  }
  stopRing();
  let n = 0;
  const play = () => {
    if (!ctx || ctx.state !== 'running') return;
    beepOnce(ctx, 880, 0);
    beepOnce(ctx, 1175, 0.34);
    n += 1;
    if (n < times) ringTimer = setTimeout(play, 1500);
  };
  play();
  return true;
}

export function stopRing(): void {
  if (ringTimer) clearTimeout(ringTimer);
  ringTimer = null;
}

// ── Tizim bildirishnomasi ────────────────────────────────────────────

export function notificationPermission(): NotificationPermission | 'unsupported' {
  return 'Notification' in window ? Notification.permission : 'unsupported';
}

/** Ruxsat so'raydi (foydalanuvchi harakati ichida). */
export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission !== 'default') return Notification.permission;
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

/**
 * Tizim bildirishnomasini ko'rsatadi (ruxsat berilgan bo'lsa). Service worker bo'lsa u orqali
 * (telefonda ham ishlaydi), aks holda oddiy `Notification`.
 */
export async function showSystemNotification(title: string, body: string, tag: string, url = '/orders'): Promise<boolean> {
  if (notificationPermission() !== 'granted') return false;
  const options: NotificationOptions & { renotify?: boolean; vibrate?: number[] } = {
    body,
    tag,
    icon: '/ondexmerchant-192.png',
    badge: '/ondexmerchant-192.png',
    requireInteraction: true,
    renotify: true,
    vibrate: [200, 100, 200, 100, 400],
    data: { url },
  };
  try {
    const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
    if (reg) {
      await reg.showNotification(title, options);
      return true;
    }
    const n = new Notification(title, options);
    n.onclick = () => { window.focus(); window.location.assign(url); n.close(); };
    return true;
  } catch {
    return false;
  }
}

// ── Sarlavha miltillashi ─────────────────────────────────────────────

/** Brauzer sarlavhasi "🔔 Yangi buyurtma" bilan miltillaydi (oyna fokus olguncha). */
export function flashTitle(text: string): void {
  if (titleTimer) return;
  baseTitle = document.title;
  let on = false;
  titleTimer = setInterval(() => {
    on = !on;
    document.title = on ? text : baseTitle;
  }, 1000);
  const stop = () => {
    if (titleTimer) clearInterval(titleTimer);
    titleTimer = null;
    document.title = baseTitle;
    window.removeEventListener('focus', stop);
  };
  window.addEventListener('focus', stop);
  if (document.hasFocus()) setTimeout(stop, 6000); // allaqachon qarab turibdi — uzoq miltillamasin
}
