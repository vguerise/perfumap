const CACHE_NAME = 'perfumap-v2';
const BASE = '/perfumap';

const STATIC_ASSETS = [
  BASE + '/perfumap.html',
  BASE + '/manifest.json',
  BASE + '/icon-192.png',
  BASE + '/icon-512.png'
];

const NO_CACHE = ['supabase.co', 'vercel.app', 'googleapis.com', 'cdnjs.cloudflare.com', 'jsdelivr.net'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.allSettled(STATIC_ASSETS.map(a => cache.add(a).catch(() => {})))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (!e.request.url.startsWith('http')) return;
  if (NO_CACHE.some(p => e.request.url.includes(p))) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) {
        fetch(e.request).then(r => {
          if (r && r.status === 200)
            caches.open(CACHE_NAME).then(c => c.put(e.request, r));
        }).catch(() => {});
        return cached;
      }
      return fetch(e.request).then(r => {
        if (r && r.status === 200)
          caches.open(CACHE_NAME).then(c => c.put(e.request, r.clone()));
        return r;
      }).catch(() => caches.match(BASE + '/perfumap.html'));
    })
  );
});

self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});
