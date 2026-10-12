const SERVICE_WORKER_URL = "/sw.js";
const CONTROLLER_WAIT_MS = 15_000;
const SAVE_REPLY_WAIT_MS = 60_000;
const SHELL_ASSET_PREFIXES = ["/_next/static/", "/fonts/", "/assets/"];

const initialPageUrl = typeof window === "undefined" ? null : window.location.href;
const wasControlledAtLoad = typeof navigator !== "undefined" && Boolean(navigator.serviceWorker?.controller);
const pageSaves = new Map<string, Promise<boolean>>();

function findServiceWorkerContainer(): ServiceWorkerContainer | null {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return null;
  return navigator.serviceWorker;
}

export function registerOfflineServiceWorker(): void {
  const container = findServiceWorkerContainer();
  container?.register(SERVICE_WORKER_URL).catch(() => undefined);
  if (container && !wasControlledAtLoad && initialPageUrl) void savePageForOffline(initialPageUrl);
}

export async function forgetOfflinePages(): Promise<void> {
  const container = findServiceWorkerContainer();
  if (!container) return;

  const registration = await container.getRegistration().catch(() => null);
  registration?.active?.postMessage("forget-offline-pages");
}

/** Resolves once the worker controls this page, so later chunk and card requests land in its cache. */
export function waitForOfflineController(): Promise<ServiceWorker | null> {
  const container = findServiceWorkerContainer();
  if (!container) return Promise.resolve(null);
  if (container.controller) return Promise.resolve(container.controller);

  return new Promise((resolve) => {
    const finish = () => {
      clearTimeout(timer);
      container.removeEventListener("controllerchange", finish);
      resolve(container.controller);
    };
    const timer = setTimeout(finish, CONTROLLER_WAIT_MS);
    container.addEventListener("controllerchange", finish);
  });
}

/** A page served through the worker is already cached; only a refresh after edits fetches it again. */
export function savePageForOffline(pageUrl: string, { refresh = false } = {}): Promise<boolean> {
  const isCachedOnLoad = pageUrl === initialPageUrl && wasControlledAtLoad;
  if (isCachedOnLoad && !refresh) return Promise.resolve(true);

  const pending = pageSaves.get(pageUrl);
  if (pending) return pending;

  const saving = requestSave(pageUrl).finally(() => pageSaves.delete(pageUrl));
  pageSaves.set(pageUrl, saving);
  return saving;
}

async function requestSave(pageUrl: string): Promise<boolean> {
  const controller = await waitForOfflineController();
  if (!controller) return false;

  const assets = wasControlledAtLoad ? [] : listLoadedShellAssets();
  return postSaveRequest(controller, { type: "save-for-offline", pages: [pageUrl], assets });
}

function listLoadedShellAssets(): string[] {
  return performance
    .getEntriesByType("resource")
    .map((entry) => new URL(entry.name))
    .filter((url) => url.origin === window.location.origin && SHELL_ASSET_PREFIXES.some((prefix) => url.pathname.startsWith(prefix)))
    .map((url) => url.pathname + url.search);
}

function postSaveRequest(worker: ServiceWorker, message: { type: string; pages: string[]; assets: string[] }): Promise<boolean> {
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    const timer = setTimeout(() => resolve(false), SAVE_REPLY_WAIT_MS);
    channel.port1.onmessage = (event) => {
      clearTimeout(timer);
      resolve(event.data?.saved === true);
    };
    worker.postMessage(message, [channel.port2]);
  });
}
