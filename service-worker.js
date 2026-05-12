// ippo legacy Service Worker containment
//
// This file is kept only to safely neutralize older registrations that may
// still point at /service-worker.js from the pre-Vite /kenkou-kiroku app.
//
// Current production registration is /sw.js. Do not add app-shell caching here.
// The goal of this legacy worker is to clean old caches, claim clients, and
// avoid intercepting fetches so the current /sw.js can own the app lifecycle.

const LEGACY_CACHE_PREFIXES = ['ippo-v', 'ippo-legacy-', 'kenkou-kiroku'];
const CURRENT_SW_URL = '/sw.js';

function isLegacyCacheName(name) {
  return LEGACY_CACHE_PREFIXES.some(prefix => name.startsWith(prefix));
}

self.addEventListener('install', event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(isLegacyCacheName)
          .map(key => caches.delete(key).catch(() => false))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', () => {
  // Intentionally no respondWith().
  // Let the browser/network/current /sw.js handle requests.
});

self.addEventListener('message', event => {
  if (!event || !event.data) return;
  if (event.data.type === 'IPPO_LEGACY_SW_STATUS') {
    event.source && event.source.postMessage({
      type: 'IPPO_LEGACY_SW_STATUS_RESULT',
      legacy: true,
      currentServiceWorker: CURRENT_SW_URL,
    });
  }
});
