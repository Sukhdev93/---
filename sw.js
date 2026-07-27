const CACHE_NAME = 'collectorate-pwa-v9';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  './offline.html',
  'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'
];

// Install Service Worker - cache resources but don't fail whole install if some assets fail
self.addEventListener('install', (e) => {
  self.skipWaiting(); // नया वर्कर तुरंत एक्टिवेट करें
  e.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await Promise.all(ASSETS.map(async (url) => {
        try {
          await cache.add(url);
        } catch (err) {
          // Don't fail installation for individual asset failures (e.g., cross-origin CDN failures)
          console.warn('Failed to cache', url, err);
        }
      }));
    })
  );
});

// Remove old caches on activation
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Old Cache Deleted:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Logic with network-first for API-like requests and cache-first with offline fallback for navigation/static
self.addEventListener('fetch', (e) => {
  const req = e.request;

  // Let spreadsheet requests bypass cache (always try network)
  if (req.url.includes('spreadsheets')) {
    e.respondWith(fetch(req).catch(() => caches.match('./offline.html')));
    return;
  }

  e.respondWith((async () => {
    // Try cache first
    const cached = await caches.match(req);
    if (cached) return cached;

    try {
      const response = await fetch(req);
      // Cache GET responses for future use
      if (req.method === 'GET' && response && response.status === 200) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, response.clone());
      }
      return response;
    } catch (err) {
      // Fallbacks for navigation and other requests
      const fallback = await caches.match('./offline.html') || await caches.match('./index.html');
      return fallback;
    }
  })());
});
