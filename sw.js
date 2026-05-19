const CACHE = 'dev-hub-v1';
const OFFLINE_URLS = [
    './',
    './index.html',
    './tools.json',
    'https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap'
];

// Install: cache core files
self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE).then(cache => {
            // Cache what we can — fonts might fail cross-origin, that's OK
            return Promise.allSettled(
                OFFLINE_URLS.map(url => cache.add(url).catch(() => null))
            );
        }).then(() => self.skipWaiting())
    );
});

// Activate: clean up old caches
self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
        ).then(() => self.clients.claim())
    );
});

// Fetch: cache-first for local assets, network-first for everything else
self.addEventListener('fetch', e => {
    const url = new URL(e.request.url);

    // Only handle GET
    if (e.request.method !== 'GET') return;

    // Cache-first strategy for same-origin + fonts
    if (url.origin === self.location.origin || url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
        e.respondWith(
            caches.match(e.request).then(cached => {
                if (cached) return cached;
                return fetch(e.request).then(resp => {
                    if (resp && resp.status === 200) {
                        const clone = resp.clone();
                        caches.open(CACHE).then(c => c.put(e.request, clone));
                    }
                    return resp;
                }).catch(() => caches.match('./index.html'));
            })
        );
        return;
    }

    // Network-only for favicons and external APIs (don't cache)
    if (url.hostname === 'www.google.com') return;

    // Default: network first with cache fallback
    e.respondWith(
        fetch(e.request).catch(() => caches.match(e.request))
    );
});
