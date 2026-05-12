// ============================================================
//  ippo – public/sw.js  【正規ソース / Canonical SW source】
//
//  【編集はここだけ行う】
//  Vite build 時にこのファイルが dist/sw.js にコピーされ、
//  本番の /sw.js として配信される。
//
//  root/sw.js は旧 GitHub Pages 配信（raw source tree）時代の
//  ミラーコピー。dist deploy 移行後は削除予定。
//  root/sw.js を直接編集しないこと。
//
//  登録元: src/services/push.js
//    navigator.serviceWorker.register('/sw.js', { scope: '/' })
//
//  更新手順: CACHE_VERSION を上げる → PR → main にマージ → deploy
// ============================================================
// 更新時は CACHE_VERSION を上げてください
const CACHE_VERSION = 'v5';
const CACHE_NAME = 'ippo-' + CACHE_VERSION;

// App Shell: 必ずキャッシュするファイル
const APP_SHELL = ['/app.html', '/manifest.json'];

// 任意キャッシュ（存在しなくてもインストール失敗にしない）
const OPTIONAL_ASSETS = ['/images/icon-192.png', '/images/icon-512.png'];

// キャッシュしないドメイン
const BYPASS_DOMAINS = ['supabase.co', 'stripe.com', 'anthropic.com', 'googleapis.com', 'gstatic.com'];

function shouldCacheResponse(response) {
  return !!response && response.status === 200 && response.type !== 'opaque';
}

function cacheResponse(request, response) {
  if (!shouldCacheResponse(response)) return Promise.resolve(false);

  let responseForCache;
  try {
    responseForCache = response.clone();
  } catch (error) {
    console.warn('[ippo-sw] response clone failed; skip cache write', error);
    return Promise.resolve(false);
  }

  return caches.open(CACHE_NAME)
    .then(cache => cache.put(request, responseForCache))
    .then(() => true)
    .catch(error => {
      console.warn('[ippo-sw] cache write failed', error);
      return false;
    });
}

// ========== Install ==========
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.addAll(APP_SHELL).then(() =>
        Promise.allSettled(OPTIONAL_ASSETS.map(url => cache.add(url).catch(() => {})))
      )
    ).then(() => self.skipWaiting())
  );
});

// ========== Activate ==========
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k.startsWith('ippo-') && k !== CACHE_NAME)
            .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ========== Fetch ==========
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith('http')) return;

  const url = new URL(event.request.url);
  if (BYPASS_DOMAINS.some(d => url.hostname.includes(d))) return;

  // app.html: Network-First → キャッシュ fallback → 最低限オフラインHTML
  if (url.pathname.endsWith('app.html') || url.pathname === '/') {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          event.waitUntil(cacheResponse(event.request, res));
          return res;
        })
        .catch(() =>
          caches.match(event.request)
            .then(cached => cached || caches.match('/app.html'))
            .then(cached =>
              cached || new Response(offlineFallbackHTML(), {
                headers: { 'Content-Type': 'text/html; charset=utf-8' }
              })
            )
        )
    );
    return;
  }

  // 静的アセット: Cache-First
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(res => {
        event.waitUntil(cacheResponse(event.request, res));
        return res;
      }).catch(() => new Response('', { status: 503 }));
    })
  );
});

// ========== Push通知 ==========
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'ippo', {
      body: data.body || '今日のからだの記録をしましょう',
      icon: '/images/icon-192.png',
      badge: '/images/icon-192.png',
      data: { url: '/app.html' }
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(wins => {
      const existing = wins.find(w => w.url.includes('app.html'));
      if (existing) return existing.focus();
      return clients.openWindow(event.notification.data.url || '/app.html');
    })
  );
});

// ========== オフライン fallback ==========
function offlineFallbackHTML() {
  return '<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ippo - オフライン</title><style>body{font-family:sans-serif;background:#fdf8f6;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;margin:0;color:#2d1f1a;text-align:center;padding:24px}h1{font-size:20px;margin:16px 0 8px}p{font-size:13px;color:#8a7a70;line-height:1.7;max-width:280px}button{margin-top:20px;padding:12px 28px;background:#c8747b;color:white;border:none;border-radius:50px;font-size:14px;cursor:pointer;font-family:inherit}</style></head><body><div style="font-size:48px">🌸</div><h1>オフラインです</h1><p>インターネットに接続されていません。接続後に再度お試しください。</p><button onclick="location.reload()">再読み込み</button></body></html>';
}
