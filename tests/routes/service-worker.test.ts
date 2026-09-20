import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

const ORIGIN = "https://char.holota.family";
const SERVICE_WORKER_PATH = path.join(process.cwd(), "public", "sw.js");

type FakeRequest = { url: string; method: string; mode?: string };

function toCacheKey(request: FakeRequest | string): string {
  return new URL(typeof request === "string" ? request : request.url, ORIGIN).toString();
}

function createCacheStorage() {
  const stores = new Map<string, Map<string, Response>>();

  const openStore = (name: string) => {
    const existing = stores.get(name);
    if (existing) return existing;

    const created = new Map<string, Response>();
    stores.set(name, created);
    return created;
  };

  return {
    stores,
    async open(name: string) {
      const store = openStore(name);
      return {
        async put(request: FakeRequest | string, response: Response) {
          store.set(toCacheKey(request), response);
        },
        async match(request: FakeRequest | string) {
          return store.get(toCacheKey(request));
        },
        async add(url: string) {
          store.set(toCacheKey(url), new Response("сторінка «немає мережі»"));
        },
        async keys() {
          return [...store.keys()].map((url) => ({ url, method: "GET" }));
        },
        async delete(request: FakeRequest | string) {
          return store.delete(toCacheKey(request));
        },
      };
    },
    async match(request: FakeRequest | string, options: { cacheName: string }) {
      return stores.get(options.cacheName)?.get(toCacheKey(request));
    },
    async keys() {
      return [...stores.keys()];
    },
    async delete(name: string) {
      return stores.delete(name);
    },
  };
}

function startServiceWorker(respondToRequest: (request: FakeRequest) => Promise<Response>) {
  const listeners = new Map<string, (event: unknown) => void>();
  const caches = createCacheStorage();
  const scope = {
    addEventListener: (type: string, handler: (event: unknown) => void) => void listeners.set(type, handler),
    location: new URL(ORIGIN),
    clients: { claim: async () => undefined },
    skipWaiting: async () => undefined,
  };

  const source = fs.readFileSync(SERVICE_WORKER_PATH, "utf8");
  new Function("self", "caches", "fetch", source)(scope, caches, respondToRequest);

  const dispatch = async (type: string, event: Record<string, unknown>) => {
    const waited: unknown[] = [];
    listeners.get(type)?.({ ...event, waitUntil: (value: unknown) => void waited.push(value) });
    await Promise.all(waited);
  };

  return { caches, dispatch, listeners };
}

async function requestPage(
  worker: ReturnType<typeof startServiceWorker>,
  request: FakeRequest,
): Promise<Response | null> {
  let responded: Promise<Response> | null = null;
  worker.listeners.get("fetch")?.({
    request,
    respondWith: (value: Promise<Response>) => void (responded = value),
    waitUntil: () => undefined,
  } as never);

  return responded ? await responded : null;
}

const sheetNavigation: FakeRequest = { url: `${ORIGIN}/char/42`, method: "GET", mode: "navigate" };

async function startWorkerWithCachedSheet(respondToRequest: (request: FakeRequest) => Promise<Response>) {
  const worker = startServiceWorker(respondToRequest);
  await worker.dispatch("install", {});

  const pages = await worker.caches.open("char-pages-v1");
  await pages.put(sheetNavigation, new Response("лист із кешу"));

  return worker;
}

describe("KR22.6 — service worker віддає збережений лист", () => {
  it("кладе сторінку «немає мережі» в кеш при встановленні", async () => {
    const worker = startServiceWorker(async () => new Response("з мережі"));
    await worker.dispatch("install", {});

    expect(worker.caches.stores.get("char-shell-v1")?.has(`${ORIGIN}/offline`)).toBe(true);
  });

  it("з мережею віддає свіжу сторінку і запамʼятовує її", async () => {
    const worker = startServiceWorker(async () => new Response("свіжий лист"));
    const response = await requestPage(worker, sheetNavigation);

    await expect(response?.text()).resolves.toBe("свіжий лист");
    expect(worker.caches.stores.get("char-pages-v1")?.has(`${ORIGIN}/char/42`)).toBe(true);
  });

  it("без мережі віддає збережений лист", async () => {
    const worker = await startWorkerWithCachedSheet(async () => {
      throw new Error("мережі немає");
    });

    await expect((await requestPage(worker, sheetNavigation))?.text()).resolves.toBe("лист із кешу");
  });

  it("без мережі й без збереженої сторінки віддає екран «немає мережі»", async () => {
    const worker = startServiceWorker(async () => {
      throw new Error("мережі немає");
    });
    await worker.dispatch("install", {});

    await expect((await requestPage(worker, sheetNavigation))?.text()).resolves.toBe(
      "сторінка «немає мережі»",
    );
  });

  it("коли сервер живий, а база лягла, віддає збережений лист замість екрана помилки", async () => {
    const worker = await startWorkerWithCachedSheet(async () => new Response("500", { status: 500 }));

    await expect((await requestPage(worker, sheetNavigation))?.text()).resolves.toBe("лист із кешу");
  });

  it("«не знайдено» лишається чесним і не підміняється кешем", async () => {
    const worker = await startWorkerWithCachedSheet(async () => new Response("404", { status: 404 }));
    const response = await requestPage(worker, sheetNavigation);

    expect(response?.status).toBe(404);
  });

  it("не втручається в записи й у синхронізацію черги", async () => {
    const worker = startServiceWorker(async () => new Response("не мало б викликатись"));

    expect(await requestPage(worker, { url: `${ORIGIN}/char/42`, method: "POST", mode: "navigate" })).toBeNull();
    expect(await requestPage(worker, { url: `${ORIGIN}/api/offline-operations`, method: "GET" })).toBeNull();
  });

  it("вихід з акаунта прибирає збережені сторінки", async () => {
    const worker = await startWorkerWithCachedSheet(async () => new Response("свіжий лист"));

    await worker.dispatch("message", { data: "forget-offline-pages" });

    expect(worker.caches.stores.has("char-pages-v1")).toBe(false);
  });
});

describe("Офлайн-аудит 2026-09-18 — картинки листа й каталогів теж кешуються", () => {
  it("ілюстрації з public і з оптимізатора кладуться в кеш медіа й далі віддаються з нього", async () => {
    const served = vi.fn(async () => new Response("картинка"));
    const worker = startServiceWorker(served);

    await requestPage(worker, { url: `${ORIGIN}/images/races/elf.png`, method: "GET" });
    await requestPage(worker, { url: `${ORIGIN}/_next/image?url=%2Fimages%2Fdragon.png&w=640&q=75`, method: "GET" });
    await requestPage(worker, { url: `${ORIGIN}/images/races/elf.png`, method: "GET" });

    expect(served).toHaveBeenCalledTimes(2);
    const media = worker.caches.stores.get("char-media-v1");
    expect(media?.has(`${ORIGIN}/images/races/elf.png`)).toBe(true);
    expect(media?.has(`${ORIGIN}/_next/image?url=%2Fimages%2Fdragon.png&w=640&q=75`)).toBe(true);
  });

  it("портрет із медіа-домену кешується навіть непрозорою відповіддю", async () => {
    const opaque = new Response(null, { status: 200 });
    Object.defineProperty(opaque, "type", { value: "opaque" });
    Object.defineProperty(opaque, "ok", { value: false });
    const worker = startServiceWorker(async () => opaque);

    const portrait = "https://media.char.holota.family/portraits/42/full.webp";
    await requestPage(worker, { url: portrait, method: "GET" });

    expect(worker.caches.stores.get("char-media-v1")?.has(portrait)).toBe(true);
  });

  it("текстури й фізика 3D-кубиків кешуються, щоб кидок працював без мережі", async () => {
    const served = vi.fn(async () => new Response("файл кубиків"));
    const worker = startServiceWorker(served);

    const physics = `${ORIGIN}/assets/dice-box/ammo/ammo.wasm.wasm`;
    const texture = `${ORIGIN}/assets/dice-box/themes/default/diffuse-dark.png`;
    await requestPage(worker, { url: physics, method: "GET" });
    await requestPage(worker, { url: texture, method: "GET" });
    await requestPage(worker, { url: physics, method: "GET" });

    expect(served).toHaveBeenCalledTimes(2);
    const shell = worker.caches.stores.get("char-shell-v1");
    expect(shell?.has(physics)).toBe(true);
    expect(shell?.has(texture)).toBe(true);
  });

  it("інші чужі домени воркер не чіпає", async () => {
    const worker = startServiceWorker(async () => new Response("не мало б викликатись"));
    expect(await requestPage(worker, { url: "https://example.com/x.png", method: "GET" })).toBeNull();
  });
});
