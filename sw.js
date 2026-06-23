/* =====================================================
   PAINT PRO — Service Worker v2.0
   Provides offline support via cache-first strategy
   ===================================================== */

const CACHE_NAME    = 'paint-pro-v2';
const STATIC_ASSETS = [
    './',
    './index.html',
    './css/style.css',
    './js/paint.js',
    './manifest.json',
    './icons/icon-192.png',
    './icons/icon-512.png',
];

// ── Install: pre-cache all static assets ──────────────
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Pre-caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => self.skipWaiting())
            .catch((err) => console.warn('[SW] Pre-cache failed:', err))
    );
});

// ── Activate: clean up old caches ─────────────────────
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(
                keys
                    .filter((key) => key !== CACHE_NAME)
                    .map((key) => {
                        console.log('[SW] Deleting old cache:', key);
                        return caches.delete(key);
                    })
            ))
            .then(() => self.clients.claim())
    );
});

// ── Fetch: cache-first for static, network-first for others ──
self.addEventListener('fetch', (event) => {
    // Only handle GET requests
    if (event.request.method !== 'GET') return;

    // Skip cross-origin requests
    const url = new URL(event.request.url);
    if (url.origin !== self.location.origin) return;

    event.respondWith(
        caches.match(event.request)
            .then((cached) => {
                if (cached) {
                    // Return cached, and update in background (stale-while-revalidate)
                    const networkFetch = fetch(event.request)
                        .then((response) => {
                            if (response && response.status === 200) {
                                const clone = response.clone();
                                caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
                            }
                            return response;
                        })
                        .catch(() => {/* ignore network errors in background */});
                    return cached;
                }
                // Not in cache: fetch from network and cache it
                return fetch(event.request)
                    .then((response) => {
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
                        return response;
                    })
                    .catch(() => {
                        // Offline fallback
                        if (event.request.destination === 'document') {
                            return caches.match('./index.html');
                        }
                    });
            })
    );
});

// ── Background Sync (optional future use) ─────────────
self.addEventListener('sync', (event) => {
    console.log('[SW] Background sync:', event.tag);
});

// ── Push (optional future use) ────────────────────────
self.addEventListener('push', (event) => {
    const data = event.data ? event.data.json() : {};
    const title   = data.title   || 'Paint Pro';
    const options = {
        body: data.body || 'Yeni güncelleme mevcut!',
        icon: './icons/icon-192.png',
        badge: './icons/icon-192.png',
    };
    event.waitUntil(self.registration.showNotification(title, options));
});
