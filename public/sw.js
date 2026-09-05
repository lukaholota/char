const SHELL_CACHE = "char-shell-v1";
const PAGE_CACHE = "char-pages-v1";
const OFFLINE_URL = "/offline";
const MAX_CACHED_PAGES = 60;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.add(OFFLINE_URL))
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names.filter((name) => name !== SHELL_CACHE && name !== PAGE_CACHE).map((name) => caches.delete(name)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "forget-offline-pages") event.waitUntil(caches.delete(PAGE_CACHE));
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(respondToNavigation(request));
    return;
  }

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/fonts/")) {
    event.respondWith(respondFromCacheFirst(request));
  }
});

async function respondToNavigation(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      await rememberPage(request, response.clone());
      return response;
    }

    // Сервер живий, але відповів помилкою — лягла база, іде деплой. Збережений лист кращий за
    // екран помилки. 4xx проходить як є: «не знайдено» й «немає доступу» мають лишатися чесними.
    if (response.status >= 500) return (await findCachedPage(request)) ?? response;

    return response;
  } catch {
    return (await findCachedPage(request)) ?? (await findOfflinePage()) ?? Response.error();
  }
}

async function findCachedPage(request) {
  return (await caches.match(request, { cacheName: PAGE_CACHE, ignoreVary: true })) ?? null;
}

async function findOfflinePage() {
  return (await caches.match(OFFLINE_URL, { cacheName: SHELL_CACHE })) ?? null;
}

async function rememberPage(request, response) {
  const cache = await caches.open(PAGE_CACHE);
  await cache.put(request, response);

  const cached = await cache.keys();
  for (const stale of cached.slice(0, Math.max(0, cached.length - MAX_CACHED_PAGES))) {
    await cache.delete(stale);
  }
}

async function respondFromCacheFirst(request) {
  const cache = await caches.open(SHELL_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) await cache.put(request, response.clone());
  return response;
}
