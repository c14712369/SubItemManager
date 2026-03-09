const CACHE_NAME = 'submanager-cache-v4'; // Bumped: CSS modularized from style.css → css/main.css

const urlsToCache = [
    './',
    './index.html',
    './css/main.css',
    './css/tokens.css',
    './css/base.css',
    './css/header.css',
    './css/animations.css',
    './css/buttons.css',
    './css/cards.css',
    './css/dashboard.css',
    './css/forms.css',
    './css/feedback.css',
    './css/life.css',
    './css/hero.css',
    './css/rwd.css',
    './css/nav.css',
    './css/life-sidebar.css',
    './css/wealth.css',
    './css/wealth-result.css',
    './css/identity.css',
    './css/analysis.css',
    './css/mobile-touch.css',
    './js/main.js',
    './js/state.js',
    './js/ui-fixed.js',
    './js/ui-life.js',
    './js/ui-analysis.js',
    './js/ui-wealth.js',
    './js/ui-projects.js',
    './js/ui-annual.js',
    './js/supabase-sync.js',
    './manifest.json'
];

self.addEventListener('install', event => {
    self.skipWaiting(); // Force the waiting service worker to become the active service worker.
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim()) // Claim clients immediately so the new SW takes over.
    );
});

self.addEventListener('fetch', event => {
    // Network-First Strategy
    event.respondWith(
        fetch(event.request)
            .then(response => {
                // If network request succeeds, cache the latest response and return it
                if (response && response.status === 200 && response.type === 'basic') {
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return response;
            })
            .catch(() => {
                // If network request fails (offline), fallback to cache
                return caches.match(event.request);
            })
    );
});
