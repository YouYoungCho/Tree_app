/* 오프라인 지원: 숲에서는 인터넷이 안 될 수 있으므로 앱 파일을 모두 캐시합니다. */
const CACHE = 'forest-id-v1';
const FILES = ['./', 'index.html', 'css/style.css', 'js/data.js', 'js/icons.js', 'js/app.js', 'manifest.webmanifest', 'icons/icon.svg'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  // 네트워크 우선, 실패하면 캐시 (업데이트가 바로 반영되도록)
  e.respondWith(
    fetch(e.request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copy));
      return res;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match('index.html')))
  );
});
