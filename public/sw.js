const CACHE_NAME = 'hunter-fund-pwa-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.svg',
  '/icon-512.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          if (event.request.headers.get('accept')?.includes('text/html')) {
            return caches.match('/index.html');
          }
        });
      })
  );
});

// 1. Remote Web Push Notification event (FCM / APNS / Serverless push)
self.addEventListener('push', (event) => {
  let data = {
    title: '🏍️ Hunter Fund 350',
    body: 'Daily reminder: Keep up your savings pace for your Royal Enfield Hunter 350!',
    icon: '/icon-192.svg',
    badge: '/icon-192.svg',
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icon-192.svg',
    badge: data.badge || '/icon-192.svg',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/',
    },
    actions: [
      { action: 'open', title: 'Open App 🏍️' }
    ]
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// 2. Background Message Handler (Runs in background even after tab is minimized/switched)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SCHEDULE_BACKGROUND_NOTIFICATION') {
    const { delayMs, title, body, icon, badge, data } = event.data;

    setTimeout(() => {
      self.registration.showNotification(title || '🏍️ Hunter Fund: Background Reminder', {
        body: body || 'Daily savings check-in for your Royal Enfield Hunter 350 Graphite Grey!',
        icon: icon || '/icon-192.svg',
        badge: badge || '/icon-192.svg',
        vibrate: [200, 100, 200],
        data: data || { url: '/' },
      });
    }, delayMs || 6000);
  }
});

// 3. Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
