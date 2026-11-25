// Offline support for Dojo Tactics Forger.
// The app's own files are fetched from the network when there is one and served from the cache
// when there isn't. Board images, sounds and fonts rarely change, so they come from the cache
// first (the app fetches sounds whole, so no byte-range requests reach here). Puzzle files are
// cached as you open them, or all at once with "Download for offline".
// VERSION is filled in by scripts/export_to_site.sh; each version keeps its own cache.
const VERSION = '2e621011e5';
const CACHE = `tactics-forger-${VERSION}`;
const SHELL = [
  './', 'index.html', 'app.js', 'icons.js', 'styles.css', 'board.css',
  'vendor/chess.js/chess.js',
  'vendor/chessground/chessground.base.css', 'vendor/chessground/chessground.brown.css',
  'vendor/chessground/chessground.cburnett.css',
  ...['chessground', 'api', 'anim', 'autoPieces', 'board', 'config', 'drag', 'draw', 'drop', 'events',
    'explosion', 'fen', 'premove', 'render', 'state', 'svg', 'sync', 'types', 'util', 'wrap']
    .map((f) => `vendor/chessground/${f}.js`),
  'data/index.json', 'data/openings/index.json', 'data/endgames/index.json',
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // One missing file shouldn't stop the rest from being cached.
    await Promise.all(SHELL.map((u) => cache.add(u).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    // Older versions' caches belong to pages that are gone. A download made under an older
    // version has to be made again (puzzle files can change between versions).
    for (const n of await caches.keys()) {
      if (n.startsWith('tactics-forger-') && n !== CACHE) await caches.delete(n);
    }
    await self.clients.claim();
  })());
});

const isLongLived = (url) =>
  /\/(static\/board|assets)\//.test(url.pathname) ||
  url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || req.headers.has('range')) return;
  const url = new URL(req.url);
  const inApp = url.href.startsWith(self.registration.scope);
  if (!inApp && !isLongLived(url)) return; // site API calls and everything else: leave alone

  if (isLongLived(url)) {
    // Cache first.
    e.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const hit = await cache.match(url.href);
      if (hit) return hit;
      const res = await fetch(url.href, { mode: url.origin === self.location.origin ? 'same-origin' : 'cors' });
      if (res.ok || res.type === 'opaque') cache.put(url.href, res.clone()).catch(() => {});
      return res;
    })());
    return;
  }

  // The app's own files and puzzles: network first, cache when offline.
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const key = url.origin + url.pathname; // ignore ?query
    try {
      const res = await fetch(req);
      if (res.ok) cache.put(key, res.clone()).catch(() => {});
      return res;
    } catch (err) {
      const hit = (await cache.match(key)) || (req.mode === 'navigate' && (await cache.match(new URL('index.html', self.registration.scope).href)));
      if (hit) return hit;
      throw err;
    }
  })());
});
