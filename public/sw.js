const SHELL_CACHE = "char-shell-v1";
const PAGE_CACHE = "char-pages-v1";
const MEDIA_CACHE = "char-media-v1";
const SPELL_CARD_CACHE = "char-spell-cards-v1";
// Статична, без чанків Next: свіжий кеш воркера чанків сторінки не має, і /offline падав у 500.
const OFFLINE_URL = "/offline.html";
const MAX_CACHED_PAGES = 60;
const MAX_CACHED_SHELL_FILES = 600;
const MAX_CACHED_MEDIA_FILES = 400;
const MAX_CACHED_SPELL_CARDS = 600;
const MEDIA_ORIGINS = ["https://media.char.holota.family"];
// Ледь живий звʼязок не падає, а висить: без межі збережений лист не відкривався зовсім.
const SLOW_NETWORK_WAIT_MS = 4000;
const SLOW_NETWORK_MEMORY_MS = 30_000;
const SLOW_NETWORK = Symbol("slow-network");
let slowNetworkUntil = 0;
const recentlyUsedFiles = new Set();

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
          names
            .filter((name) => ![SHELL_CACHE, PAGE_CACHE, MEDIA_CACHE, SPELL_CARD_CACHE].includes(name))
            .map((name) => caches.delete(name)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "forget-offline-pages") event.waitUntil(caches.delete(PAGE_CACHE));
  if (event.data?.type === "save-for-offline") {
    event.waitUntil(saveForOffline(event.data).then((saved) => event.ports[0]?.postMessage({ saved })));
  }
});

// Сторінка, відкрита до того, як воркер узяв її під контроль, або клієнтським переходом Next,
// повз воркер не проходила: без цього її HTML і вже завантажені чанки офлайн відсутні.
async function saveForOffline({ pages = [], assets = [] }) {
  try {
    const shell = await caches.open(SHELL_CACHE);
    for (const url of assets) {
      if (!(await shell.match(url))) await shell.add(url);
    }
    await dropOldestEntries(shell, MAX_CACHED_SHELL_FILES);
    for (const url of pages) {
      const response = await fetch(url, { headers: { Accept: "text/html" } });
      if (!response.ok || response.redirected) return false;
      await rememberPage(new Request(url), response);
    }
    return true;
  } catch {
    return false;
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (MEDIA_ORIGINS.includes(url.origin)) {
    event.respondWith(respondFromCacheFirst(event, MEDIA_CACHE, MAX_CACHED_MEDIA_FILES));
    return;
  }

  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (url.pathname.startsWith("/spell-cards/")) {
    event.respondWith(respondFromNetworkFirst(event, SPELL_CARD_CACHE, MAX_CACHED_SPELL_CARDS));
    return;
  }

  if (request.headers?.get("RSC") === "1") {
    event.respondWith(respondToRouterRequest(event));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(respondToNavigation(event));
    return;
  }

  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/fonts/") ||
    url.pathname.startsWith("/assets/")
  ) {
    event.respondWith(respondFromCacheFirst(event, SHELL_CACHE, MAX_CACHED_SHELL_FILES));
    return;
  }

  if (url.pathname.startsWith("/images/") || url.pathname.startsWith("/_next/image")) {
    event.respondWith(respondFromCacheFirst(event, MEDIA_CACHE, MAX_CACHED_MEDIA_FILES));
  }
});

async function respondToNavigation(event) {
  const cachedPage = findCachedPage(event.request);
  const freshPage = fetchFreshPage(event, cachedPage);
  event.waitUntil(freshPage);
  const cached = await cachedPage;
  return cached ? raceSlowNetwork(freshPage, cached) : freshPage;
}

// Запис у кеш — фоном: cache.put дочитує відповідь до кінця, і поки він чекає, браузер не
// отримує жодного байта — стрімінг сторінки пропадає.
async function fetchFreshPage(event, cachedPage) {
  const request = event.request;
  try {
    const response = await fetch(request);
    if (response.ok) {
      event.waitUntil(rememberPage(request, response.clone()));
      return response;
    }

    // Сервер живий, але відповів помилкою — лягла база, іде деплой. Збережений лист кращий за
    // екран помилки. 4xx проходить як є: «не знайдено» й «немає доступу» мають лишатися чесними.
    if (response.status >= 500) return (await cachedPage) ?? response;

    return response;
  } catch {
    return (await cachedPage) ?? (await findOfflinePage()) ?? Response.error();
  }
}

// Клієнтський перехід Next: на невдалу відповідь роутер робить звичайне завантаження сторінки,
// а його воркер уже віддасть із кешу.
async function respondToRouterRequest(event) {
  const pageUrl = new URL(event.request.url);
  pageUrl.searchParams.delete("_rsc");
  const fromNetwork = fetch(event.request);
  if (!(await findCachedPage(pageUrl.href))) return fromNetwork;
  return raceSlowNetwork(fromNetwork, new Response(null, { status: 504 }));
}

async function raceSlowNetwork(fromNetwork, fallback) {
  const isRememberedSlow = Date.now() < slowNetworkUntil;
  let timer;
  const slow = new Promise((resolve) => {
    timer = setTimeout(() => resolve(SLOW_NETWORK), isRememberedSlow ? 0 : SLOW_NETWORK_WAIT_MS);
  });
  const winner = await Promise.race([fromNetwork, slow]).finally(() => clearTimeout(timer));
  if (winner !== SLOW_NETWORK) return winner;

  if (!isRememberedSlow) slowNetworkUntil = Date.now() + SLOW_NETWORK_MEMORY_MS;
  return fallback;
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
  await dropOldestEntries(cache, MAX_CACHED_PAGES);
}

// Портрети й ілюстрації з іншого origin приходять непрозорими (status 0) — їх теж кладемо: без
// картинок збережений лист і каталог виглядають зламаними, а не «офлайн».
async function respondFromCacheFirst(event, cacheName, limit) {
  const request = event.request;
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) {
    markRecentlyUsed(event, cache, cached);
    return cached;
  }

  const response = await fetch(request);
  if (response.ok || response.type === "opaque") {
    event.waitUntil(rememberResponse(cache, request, response.clone(), limit));
  }
  return response;
}

// Текст заклинання міняється з деплоєм, тож мережа першою; кеш — лише для листа без звʼязку.
async function respondFromNetworkFirst(event, cacheName, limit) {
  const request = event.request;
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) event.waitUntil(rememberResponse(cache, request, response.clone(), limit));
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw error;
  }
}

// Ліміт викидає найраніше записані файли. CSS, шрифт чи чанк, чий хеш пережив кілька деплоїв,
// інакше зникав першим, хоча збережені сторінки досі на нього посилаються — лист без стилів.
function markRecentlyUsed(event, cache, cached) {
  const request = event.request;
  if (recentlyUsedFiles.has(request.url)) return;
  recentlyUsedFiles.add(request.url);
  event.waitUntil(cache.put(request, cached.clone()));
}

async function rememberResponse(cache, request, response, limit) {
  await cache.put(request, response);
  await dropOldestEntries(cache, limit);
}

async function dropOldestEntries(cache, limit) {
  const cached = await cache.keys();
  for (const stale of cached.slice(0, Math.max(0, cached.length - limit))) {
    await cache.delete(stale);
  }
}
