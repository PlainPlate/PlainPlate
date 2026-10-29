/* Plain Plate service worker: caches the app so it works offline. Bump VERSION on every release. */
const VERSION = 'pp-v0.1.0';
const SHELL = [
  './', 'index.html', 'styles.css', 'app.js', 'foods.json', 'manifest.webmanifest',
  'icons/icon.svg', 'icons/favicon.svg', 'icons/favicon-32.png', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
  "fonts/commissioner-greek-400-normal.woff2",  "fonts/commissioner-greek-500-normal.woff2",  "fonts/commissioner-greek-600-normal.woff2",  "fonts/commissioner-greek-700-normal.woff2",  "fonts/commissioner-latin-400-normal.woff2",  "fonts/commissioner-latin-500-normal.woff2",  "fonts/commissioner-latin-600-normal.woff2",  "fonts/commissioner-latin-700-normal.woff2",  "fonts/commissioner-latin-ext-400-normal.woff2",  "fonts/commissioner-latin-ext-500-normal.woff2",  "fonts/commissioner-latin-ext-600-normal.woff2",  "fonts/commissioner-latin-ext-700-normal.woff2",  "fonts/jetbrains-mono-greek-400-normal.woff2",  "fonts/jetbrains-mono-greek-500-normal.woff2",  "fonts/jetbrains-mono-latin-400-normal.woff2",  "fonts/jetbrains-mono-latin-500-normal.woff2",
];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return; // Open Food Facts etc. go straight to the network
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(r => r || fetch(e.request).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); }
    return res;
  }).catch(() => caches.match('index.html'))));
});
