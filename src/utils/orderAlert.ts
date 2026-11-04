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

/** Ovoz ishlashga tayyormi (foydalanuvchi sahifa bilan o'zaro ishlagan). */
export function isAudioReady(): boolean {
  return ctx !== null && ctx.state === 'running';
}

/** Ovozni "ochadi". Faqat foydalanuvchi harakati ichida chaqiriladi. */
export function unlockAudio(): boolean {
  try {
    const Ctor = audioCtor();
    if (!Ctor) return false;
    if (!ctx) ctx = new Ctor();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx.state !== 'closed';
  } catch {
    return false;
  }
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
