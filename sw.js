const scope = new URL(self.registration.scope);
const prefix = 'urozhay:' + scope.href + ':';
const cacheName = prefix + 'v12';
const assets = ['./', 'index.html', 'style.css', 'app.js', 'model.mjs',
  'manifest.webmanifest', 'house.svg', 'icon-192.png', 'icon-512.png'];
const assetUrls = new Set(assets.map(asset => new URL(asset, scope).href));

self.addEventListener('install', event => {
  event.waitUntil(caches.open(cacheName).then(cache => cache.addAll(assets)));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(key => key.startsWith(prefix) && key !== cacheName)
      .map(key => caches.delete(key))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (request.mode === 'navigate') {
    url.hash = '';
    url.search = '';
  }
  if (!assetUrls.has(url.href)) return;
  event.respondWith(caches.open(cacheName).then(async cache => {
    return (await cache.match(url.href)) || fetch(request);
  }));
});
