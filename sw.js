// ══════════════════════════════════════════════
// Perfumap — Service Worker v1.0
// Estratégia: Cache First para assets estáticos,
//             Network First para API calls
// ══════════════════════════════════════════════

const CACHE_NAME = 'perfumap-v1';

// Assets que ficam em cache offline
const STATIC_ASSETS = [
  './perfumap.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// URLs que nunca devem ser cacheadas (APIs externas)
const NO_CACHE_PATTERNS = [
  'supabase.co',
  'vercel.app',
  'googleapis.com',
  'cdnjs.cloudflare.com',
  'jsdelivr.net'
];

// ── INSTALL: pré-cacheia os assets estáticos ──
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        // Tenta cachear cada asset individualmente para não falhar tudo
        return Promise.allSettled(
          STATIC_ASSETS.map(asset =>
            cache.add(asset).catch(err =>
              console.warn('[SW] Não cacheou:', asset, err)
            )
          )
        );
      })
      .then(() => self.skipWaiting())
  );
});

// ── ACTIVATE: limpa caches antigos ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => {
            console.log('[SW] Removendo cache antigo:', key);
            return caches.delete(key);
          })
      ))
      .then(() => self.clients.claim())
  );
});

// ── FETCH: estratégia por tipo de request ──
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // Ignora requisições não-GET
  if (event.request.method !== 'GET') return;

  // Ignora APIs externas — nunca cacheia
  if (NO_CACHE_PATTERNS.some(pattern => url.includes(pattern))) return;

  // Ignora chrome-extension e outros esquemas não-http
  if (!url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          // Cache hit — retorna cache e atualiza em background
          fetch(event.request)
            .then(networkResponse => {
              if (networkResponse && networkResponse.status === 200) {
                caches.open(CACHE_NAME)
                  .then(cache => cache.put(event.request, networkResponse.clone()));
              }
            })
            .catch(() => {}); // Silencia erros de rede em background
          return cachedResponse;
        }

        // Cache miss — busca na rede e cacheia
        return fetch(event.request)
          .then(networkResponse => {
            if (!networkResponse || networkResponse.status !== 200) {
              return networkResponse;
            }
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then(cache => cache.put(event.request, responseToCache));
            return networkResponse;
          })
          .catch(() => {
            // Offline e não tem cache — retorna página principal como fallback
            if (event.request.destination === 'document') {
              return caches.match('./perfumap.html');
            }
          });
      })
  );
});

// ── MENSAGENS do cliente ──
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data === 'CLEAR_CACHE') {
    caches.delete(CACHE_NAME)
      .then(() => event.ports[0]?.postMessage({ cleared: true }));
  }
});
