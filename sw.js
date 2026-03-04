// Service Worker do Perfumap — v6
// Suporta: cache offline + Web Push

const CACHE_NAME = 'perfumap-v6';
const BASE = '/perfumap';

// Arquivos para cache offline
const PRECACHE = [BASE + '/', BASE + '/index.html', BASE + '/manifest.json'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(c => c.addAll(PRECACHE).catch(() => {}))
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});

// ══ PUSH HANDLER ══
self.addEventListener('push', e => {
  let data = {};
  try { data = e.data?.json() || {}; } catch (_) {}

  const title = data.title || '🎯 Missão da Semana — Perfumap';
  const options = {
    body: data.body || 'Você tem uma nova missão olfativa!',
    icon: data.icon || BASE + '/icon-192.png',
    badge: data.badge || BASE + '/icon-192.png',
    tag: data.tag || 'missao-semanal',
    renotify: false,
    data: { url: data.url || BASE + '/' }
  };

  e.waitUntil(self.registration.showNotification(title, options));
});

// Clique na notificação → abre o app na aba análise
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data?.url || BASE + '/';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cls => {
      const existing = cls.find(c => c.url.includes('/perfumap'));
      if (existing) return existing.focus();
      return clients.openWindow(url);
    })
  );
});
