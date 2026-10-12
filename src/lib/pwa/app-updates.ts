import { toast } from "sonner";
import { readOfflineQueue } from "@/lib/offline/queue";
import { hasPendingServerActions } from "@/lib/offline/action-guard";
import { findDisplayMode } from "./install-platform";

const CHECK_INTERVAL = 30 * 60 * 1000;
const UPDATE_TOAST_ID = "app-update";
let persistenceRequested = false;
// The menu's manual restart must see edits tracked by the root lifecycle.
let hasEditedFields = false;

export function decideAppUpdate({ hasUpdate, wasOffered, pathname, isProtected }: {
  hasUpdate: boolean;
  wasOffered: boolean;
  pathname: string;
  isProtected: boolean;
}): "none" | "offer" | "reload" {
  if (!hasUpdate) return "none";
  const path = pathname.replace(/^\/no-ai(?=\/|$)/, "").replace(/^\/2024(?=\/|$)/, "") || "/";
  const safeRoute = path === "/" || path === "/char/home" || /^\/char\/[^/]+$/.test(path) && path !== "/char/create"
    || /^\/(spells|magic-items|bestiary|rules|classes|races|feats|backgrounds)(\/|$)/.test(path);
  return wasOffered && safeRoute && !isProtected ? "reload" : "offer";
}

function hasOpenWork(): boolean {
  return hasEditedFields || hasPendingServerActions() || readOfflineQueue().length > 0 || Boolean(document.querySelector(
    '[role="dialog"][data-state="open"], form, [contenteditable="true"]',
  ));
}

export function requestAppRestart(): void {
  if (hasPendingServerActions()) {
    toast.info("Дочекайтеся завершення збереження перед перезапуском.");
    return;
  }
  if (!navigator.onLine || readOfflineQueue().length > 0) {
    toast.info("Спершу дочекайтеся мережі та синхронізації правок.");
    return;
  }
  const protectedRoute = decideAppUpdate({ hasUpdate: true, wasOffered: true, pathname: window.location.pathname, isProtected: false }) !== "reload";
  if ((hasOpenWork() || protectedRoute) && !window.confirm("Перезапустити застосунок? Незбережені зміни на цій сторінці можуть зникнути.")) return;
  window.location.reload();
}

function requestPersistentStorage(): void {
  if (persistenceRequested || findDisplayMode() !== "standalone" || !navigator.storage?.persist) return;
  persistenceRequested = true;
  void navigator.storage.persist().catch((error: unknown) => {
    console.warn("Не вдалося запросити стійке сховище застосунку", error);
  });
}

async function readServerVersion(): Promise<string | null> {
  const response = await fetch("/api/version", { cache: "no-store", signal: AbortSignal.timeout(10_000) });
  if (!response.ok) return null;
  const data: unknown = await response.json();
  return data && typeof data === "object" && "version" in data && typeof data.version === "string" && data.version ? data.version : null;
}

export function startAppUpdates(): () => void {
  const clientVersion = process.env.NEXT_PUBLIC_DEPLOYMENT_VERSION;
  let lastCheck = -Infinity;
  let lastWorkerCheck = -Infinity;
  let offered = false;
  let checking = false;
  hasEditedFields = false;
  let disposed = false;
  let pathname = window.location.pathname;
  const rememberEdit = (event: Event) => {
    if (event.target instanceof Element && event.target.closest('input, textarea, select, [contenteditable="true"]')) hasEditedFields = true;
  };
  const rememberRoute = () => {
    if (pathname !== window.location.pathname) hasEditedFields = false;
    pathname = window.location.pathname;
  };

  const checkVersion = async () => {
    if (!clientVersion || checking || !navigator.onLine || Date.now() - lastCheck < CHECK_INTERVAL) return;
    checking = true;
    lastCheck = Date.now();
    try {
      const version = await readServerVersion();
      if (!version || disposed) return;
      const decision = decideAppUpdate({ hasUpdate: version !== clientVersion, wasOffered: offered, pathname: window.location.pathname, isProtected: hasOpenWork() });
      if (decision === "reload") requestAppRestart();
      if (decision === "offer") {
        offered = true;
        toast.info("Є нова версія застосунку", {
          id: UPDATE_TOAST_ID, duration: Infinity,
          action: { label: "Перезапустити", onClick: requestAppRestart },
        });
      }
    } catch (error) {
      if (!(error instanceof TypeError || error instanceof DOMException || error instanceof SyntaxError)) throw error;
    } finally {
      checking = false;
    }
  };

  const onVisible = () => {
    if (document.visibilityState !== "visible") return;
    requestPersistentStorage();
    if (offered && decideAppUpdate({ hasUpdate: true, wasOffered: true, pathname: window.location.pathname, isProtected: hasOpenWork() }) === "reload") {
      requestAppRestart();
      return;
    }
    if (navigator.onLine && Date.now() - lastWorkerCheck >= CHECK_INTERVAL) {
      lastWorkerCheck = Date.now();
      void navigator.serviceWorker?.getRegistration().then((registration) => registration?.update()).catch((error: unknown) => console.warn("Не вдалося перевірити service worker", error));
    }
    void checkVersion();
  };

  document.addEventListener("visibilitychange", onVisible);
  document.addEventListener("input", rememberEdit, true);
  document.addEventListener("change", rememberEdit, true);
  window.addEventListener("locationchange", rememberRoute);
  window.addEventListener("popstate", rememberRoute);
  onVisible();
  return () => {
    disposed = true;
    hasEditedFields = false;
    document.removeEventListener("visibilitychange", onVisible);
    document.removeEventListener("input", rememberEdit, true);
    document.removeEventListener("change", rememberEdit, true);
    window.removeEventListener("locationchange", rememberRoute);
    window.removeEventListener("popstate", rememberRoute);
    toast.dismiss(UPDATE_TOAST_ID);
  };
}
