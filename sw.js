/* ============================================
   SERVICE WORKER - PWA & Offline Support
   ============================================ */

const CACHE_NAME = 'love-story-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/storage.js',
  '/js/scene.js',
  '/js/animations.js',
  '/js/sections.js',
  '/js/customizer.js',
  '/js/games.js',
  '/js/music.js',
  '/js/app.js',
  '/manifest.json'
];

// Install
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch - Network first, fallback to cache
self.addEventListener('fetch', (event) => {
  // Skip non-GET and cross-origin
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cache the response
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
