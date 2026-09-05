const SERVICE_WORKER_URL = "/sw.js";

function findServiceWorkerContainer(): ServiceWorkerContainer | null {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return null;
  return navigator.serviceWorker;
}

export function registerOfflineServiceWorker(): void {
  const container = findServiceWorkerContainer();
  container?.register(SERVICE_WORKER_URL).catch(() => undefined);
}

export async function forgetOfflinePages(): Promise<void> {
  const container = findServiceWorkerContainer();
  if (!container) return;

  const registration = await container.getRegistration().catch(() => null);
  registration?.active?.postMessage("forget-offline-pages");
}
