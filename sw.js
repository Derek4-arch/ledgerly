/* Ledgerly service worker: precaches the app shell so it works fully offline.
   Only registered when served over http(s) (e.g. via start.bat); file:// works without it. */
'use strict';
const VERSION = 'ledgerly-v1.0.0';
const ASSETS = [
  './', './index.html',
  './css/base.css', './css/layout.css', './css/components.css', './css/views.css',
  './js/dates.js', './js/library.js', './js/finance.js', './js/insights.js', './js/ics.js',
  './js/util.js', './js/store.js', './js/sample.js', './js/charts.js', './js/notify.js', './js/ui.js',
  './js/views/common.js', './js/views/sheets.js', './js/views/dashboard.js', './js/views/subscriptions.js',
  './js/views/calendar.js', './js/views/documents.js', './js/views/insights.js', './js/views/settings.js',
  './js/views/onboarding.js', './js/app.js',
  './assets/manifest.webmanifest', './assets/icons/icon.svg', './assets/icons/icon-192.png',
  './assets/icons/icon-512.png', './assets/icons/icon-maskable-512.png', './assets/icons/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    // network first for pages so updates arrive, cached shell when offline
    event.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put('./index.html', copy)).catch(() => {});
        return res;
      }).catch(() => caches.match('./index.html', { ignoreSearch: true }))
    );
    return;
  }
  // stale-while-revalidate for static assets
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((cached) => {
      const network = fetch(req).then((res) => {
        if (res && res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)).catch(() => {}); }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) { if ('focus' in c) return c.focus(); }
      return self.clients.openWindow('./index.html#/');
    })
  );
});
