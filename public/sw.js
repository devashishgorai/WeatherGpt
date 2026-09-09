const CACHE_NAME = 'weathergpt-static-v1';
const STATIC_DESTINATIONS = new Set(['style', 'script', 'font', 'image']);

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)),
      )),
      self.clients.claim(),
    ]),
  );
});

self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  if (requestUrl.origin !== self.location.origin || requestUrl.pathname.startsWith('/api/')) {
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/')),
    );
    return;
  }

  if (!STATIC_DESTINATIONS.has(event.request.destination)) {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cachedResponse = await cache.match(event.request);
      const networkResponse = fetch(event.request).then((response) => {
        if (response.ok) cache.put(event.request, response.clone());
        return response;
      }).catch(() => cachedResponse);
      return cachedResponse || networkResponse;
    }),
  );
});

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: 'WeatherGPT', body: event.data?.text() || 'New weather update.' };
  }
  event.waitUntil(self.registration.showNotification(payload.title || 'WeatherGPT', {
    body: payload.body || 'New weather update.',
    icon: payload.icon || '/icons/weatherGPT logo.png',
    badge: payload.badge || '/icons/weatherGPT logo.png',
    tag: payload.tag || 'weathergpt-weather',
    data: payload.data || { url: '/' },
    actions: payload.actions || [{ action: 'view-weather', title: 'View Weather' }, { action: 'dismiss', title: 'Dismiss' }],
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;
  const targetUrl = new URL(event.notification.data?.url || '/', self.location.origin).href;
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
    const existing = clientList.find((client) => 'focus' in client);
    if (existing) return existing.focus();
    return clients.openWindow(targetUrl);
  }));
});
