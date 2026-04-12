// src/utils/pushNotification.ts

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

// Base64 ni Uint8Array ga o'tkazish
const urlBase64ToUint8Array = (base64String: string): ArrayBuffer => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; i++) {
    view[i] = rawData.charCodeAt(i);
  }
  return buffer;
};

// ✅ Push Notification ga subscribe qilish
export const subscribeToPushNotifications = async (): Promise<void> => {
  try {
    // Browser qo'llab-quvvatlashini tekshirish
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.log('Push notifications qo\'llab-quvvatlanmaydi');
      return;
    }

    // Ruxsat so'rash
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('Push notification ruxsati berilmadi');
      return;
    }

    // Service Worker tayyor bo'lishini kutish
    const registration = await navigator.serviceWorker.ready;

    // Mavjud subscriptionni tekshirish
    let subscription = await registration.pushManager.getSubscription();

    // Yangi subscription yaratish
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }

    // Backendga yuborish
    const res = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ subscription }),
    });

    if (res.ok) {
      console.log('✅ Push notification subscribe bo\'lindi');
    }
  } catch (err) {
    console.error('Push subscribe xatosi:', err);
  }
};

// ✅ Push Notification dan unsubscribe qilish
export const unsubscribeFromPush = async (): Promise<void> => {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
      await fetch('/api/push/unsubscribe', {
        method: 'POST',
        credentials: 'include',
      });
      console.log('✅ Push notification unsubscribe bo\'lindi');
    }
  } catch (err) {
    console.error('Unsubscribe xatosi:', err);
  }
};
