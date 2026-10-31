// Hunter Fund - Service Worker v3 with Hourly Background Reminder Engine
const CACHE_NAME = 'hunter-fund-pwa-v3';
const META_CACHE_NAME = 'hunter-fund-meta-v1';
const STATE_URL = '/hourly-reminder-state';

const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.svg',
  '/icon-512.svg'
];

// 1. Installation
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(() => {});
    })
  );
  self.skipWaiting();
});

// 2. Activation & Cache cleanup
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key !== META_CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. Network / Cache Fetch
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  
  // Don't intercept internal state calls
  if (event.request.url.includes('/hourly-reminder-state')) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200 && event.request.url.startsWith('http')) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone).catch(() => {});
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

// --- HOURLY REMINDER STATE HELPERS (Cache API for persistence across SW restarts) ---
async function saveReminderState(state) {
  try {
    const metaCache = await caches.open(META_CACHE_NAME);
    const body = JSON.stringify({ ...state, updatedAt: Date.now() });
    await metaCache.put(
      new Request(STATE_URL),
      new Response(body, { headers: { 'Content-Type': 'application/json' } })
    );
  } catch (err) {
    console.warn('[SW] Could not save reminder state:', err);
  }
}

async function getReminderState() {
  try {
    const metaCache = await caches.open(META_CACHE_NAME);
    const res = await metaCache.match(new Request(STATE_URL));
    if (res) {
      return await res.json();
    }
  } catch (err) {
    console.warn('[SW] Could not read reminder state:', err);
  }
  return null;
}

// Check and trigger hourly notification if deposit is pending
async function triggerHourlyNotificationIfPending(stateOverride) {
  const state = stateOverride || (await getReminderState());
  if (!state || !state.enabled) return;

  const neededToday = Number(state.neededToday) || 0;
  // If neededToday <= 0, today's deposit is completed! Do NOT disturb.
  if (neededToday <= 0) {
    console.log('[SW] Today target is already met or deposited. Skipping hourly notification.');
    return;
  }

  // Quiet hours check (e.g. 11 PM to 8 AM)
  if (state.quietHoursEnabled) {
    const currentHour = new Date().getHours();
    const startHour = state.quietHoursStart ?? 23; // 11 PM
    const endHour = state.quietHoursEnd ?? 8;      // 8 AM

    let isQuiet = false;
    if (startHour > endHour) {
      // e.g. 23 to 8
      isQuiet = currentHour >= startHour || currentHour < endHour;
    } else {
      isQuiet = currentHour >= startHour && currentHour < endHour;
    }

    if (isQuiet) {
      console.log('[SW] Currently in quiet hours. Skipping notification.');
      return;
    }
  }

  const planned = Number(state.todayPlannedSavings) || neededToday;
  const actual = Number(state.todayActualSavings) || 0;
  const bikeName = state.bikeModel || 'Royal Enfield Hunter 350';

  let title = `🏍️ ${bikeName}: ₹${neededToday.toLocaleString('en-IN')} Save Karna Baki Hai!`;
  let body = `Aaj ka target ₹${planned.toLocaleString('en-IN')} hai. 10 Jan 2027 tak apni bike lene ke liye abhi deposit add karein!`;

  if (actual > 0) {
    title = `🏍️ ${bikeName}: ₹${neededToday.toLocaleString('en-IN')} Aur Save Karein!`;
    body = `Aaj ₹${actual.toLocaleString('en-IN')} save ho chuke hain. Baaki ₹${neededToday.toLocaleString('en-IN')} deposit karke aaj ka goal complete karein!`;
  }

  await self.registration.showNotification(title, {
    body,
    icon: '/icon-192.svg',
    badge: '/icon-192.svg',
    tag: 'hourly-deposit-reminder',
    renotify: true, // Forces phone to buzz and sound even if previous notification is present!
    requireInteraction: false,
    vibrate: [250, 100, 250, 100, 250],
    data: {
      url: '/?action=quick-deposit',
      neededToday,
      todayPlannedSavings: planned,
      timestamp: Date.now(),
    },
    actions: [
      { action: 'quick-deposit', title: '💰 Save Now' },
      { action: 'open', title: 'Open App 🏍️' }
    ]
  });

  // Save last notification timestamp
  state.lastNotifiedAt = Date.now();
  await saveReminderState(state);
}

// Background Recurring Timer
let hourlyTimerId = null;

function startHourlyTimerLoop(intervalMinutes = 60) {
  if (hourlyTimerId) {
    clearTimeout(hourlyTimerId);
    hourlyTimerId = null;
  }

  const intervalMs = Math.max(1, intervalMinutes) * 60 * 1000;

  function scheduleNext() {
    hourlyTimerId = setTimeout(async () => {
      try {
        await triggerHourlyNotificationIfPending();
      } catch (err) {
        console.error('[SW] Hourly check error:', err);
      }
      scheduleNext();
    }, intervalMs);
  }

  scheduleNext();
}

// 4. Remote Web Push Notification event
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
    tag: 'hunter-push-notification',
    renotify: true,
    vibrate: [200, 100, 200],
    data: { url: data.url || '/?action=quick-deposit' },
    actions: [
      { action: 'quick-deposit', title: '💰 Save Now' },
      { action: 'open', title: 'Open App 🏍️' }
    ]
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// 5. Periodic Background Sync (PWA Android / Chrome background wakeup)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'hourly-deposit-reminder' || event.tag === 'hourly-savings-reminder') {
    event.waitUntil(triggerHourlyNotificationIfPending());
  }
});

// 6. Message Listener from App / Context
self.addEventListener('message', async (event) => {
  if (!event.data) return;

  const { type } = event.data;

  // A. SYNC HOURLY REMINDER STATE (Called on every financial state change)
  if (type === 'SYNC_HOURLY_REMINDER') {
    const newState = event.data.state;
    await saveReminderState(newState);

    if (newState && newState.enabled) {
      startHourlyTimerLoop(newState.intervalMinutes || 60);
    } else if (hourlyTimerId) {
      clearTimeout(hourlyTimerId);
      hourlyTimerId = null;
    }
  }

  // B. SCHEDULE ONE-SHOT BACKGROUND TEST (Delay test e.g. 5s or 10s)
  if (type === 'SCHEDULE_BACKGROUND_NOTIFICATION') {
    const { delayMs, title, body, icon, badge, data } = event.data;

    setTimeout(async () => {
      await self.registration.showNotification(title || '🏍️ Hunter Fund: Reminder', {
        body: body || 'Savings reminder for your Royal Enfield Hunter 350!',
        icon: icon || '/icon-192.svg',
        badge: badge || '/icon-192.svg',
        tag: 'hourly-deposit-reminder',
        renotify: true,
        vibrate: [250, 100, 250, 100, 250],
        data: data || { url: '/?action=quick-deposit' },
        actions: [
          { action: 'quick-deposit', title: '💰 Save Now' },
          { action: 'open', title: 'Open App 🏍️' }
        ]
      });
    }, delayMs || 6000);
  }

  // C. IMMEDIATE HOURLY TEST
  if (type === 'TRIGGER_HOURLY_NOTIFICATION_NOW') {
    event.waitUntil(triggerHourlyNotificationIfPending(event.data.state));
  }

  // D. CANCEL REMINDER
  if (type === 'CANCEL_HOURLY_REMINDER') {
    if (hourlyTimerId) {
      clearTimeout(hourlyTimerId);
      hourlyTimerId = null;
    }
    const state = await getReminderState();
    if (state) {
      state.enabled = false;
      await saveReminderState(state);
    }
  }
});

// 7. Notification Click Handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = new URL(event.notification.data?.url || '/?action=quick-deposit', self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it and tell it to open the quick add deposit modal
      for (const client of clientList) {
        if ('focus' in client) {
          client.postMessage({ type: 'OPEN_QUICK_ADD' });
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
