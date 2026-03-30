import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';

declare let self: ServiceWorkerGlobalScope;

// Precache assets
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// Service Worker for ShoxPosPro PWA Notifications
const CACHE_NAME = 'shoxpospro-cache-v1';

// Install event - caching basic assets if needed
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle push notifications
self.addEventListener('push', (event) => {
  let data: any = { title: 'ShoxPosPro', body: 'Yangi xabar keldi!', icon: '/shoxpospro.png' };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/shoxpospro.png',
    badge: '/shoxpospro.png', // Small icon for notification bar
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/'
    },
    actions: [
      { action: 'open', title: 'Ochish' },
      { action: 'close', title: 'Yopish' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
      .then(() => console.log('OS Notification shown successfully'))
      .catch(err => console.error('Failed to show OS Notification:', err))
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') return;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it
      for (const client of clientList) {
        if (client.url === event.notification.data.url && 'focus' in client) {
          return client.focus();
        }
      }
      // If no window is open, open a new one
      if (self.clients.openWindow) {
        return self.clients.openWindow(event.notification.data.url || '/');
      }
    })
  );
});
