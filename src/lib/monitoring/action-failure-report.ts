import * as Sentry from "@sentry/nextjs";

// Sentry JAVASCRIPT-NEXTJS-1A: серверна дія падає за десятки мілісекунд після тапу, з увімкненою
// мережею, після ~29 с тиші на сайті. Гіпотеза — QUIC-зʼєднання, яке роутер забув за простій.
// Ці поля мають її підтвердити або спростувати (docs/o21-user-signals/kr21.1-sentry-triage.md).

type NetworkInformationLike = {
  effectiveType?: string;
  type?: string;
  rtt?: number;
  downlink?: number;
  saveData?: boolean;
};

let lastOriginResponseAt: number | null = null;
let lastOriginProtocol: string | null = null;
let lastHiddenAt: number | null = null;

export function startWatchingOriginActivity(): void {
  watchOriginResources();
  watchPageHiding();
}

export function noteOriginResponse(input: RequestInfo | URL): void {
  if (isSameOrigin(readRequestUrl(input))) lastOriginResponseAt = Date.now();
}

export function reportActionFailure(error: Error, startedAt: number, cause: unknown): void {
  const failure = collectActionFailure(startedAt, cause);
  Sentry.captureException(error, {
    tags: { action_failure_protocol: failure.originProtocol ?? "unknown" },
    contexts: { action_failure: failure },
  });
}

function collectActionFailure(startedAt: number, cause: unknown) {
  const now = Date.now();
  return {
    cause: describeCause(cause),
    msSinceActionStart: now - startedAt,
    msSinceLastOriginResponse: lastOriginResponseAt === null ? null : now - lastOriginResponseAt,
    msSinceLastHidden: lastHiddenAt === null ? null : now - lastHiddenAt,
    visibilityState: document.visibilityState,
    onLine: navigator.onLine,
    originProtocol: lastOriginProtocol,
    documentProtocol: readDocumentProtocol(),
    ...readConnection(),
  };
}

function watchOriginResources(): void {
  if (typeof PerformanceObserver === "undefined") return;
  try {
    new PerformanceObserver((list) => list.getEntries().forEach(noteResourceTiming)).observe({
      type: "resource",
      buffered: true,
    });
  } catch {
    return;
  }
}

function noteResourceTiming(entry: PerformanceEntry): void {
  const timing = entry as PerformanceResourceTiming;
  if (!isSameOrigin(timing.name) || timing.responseEnd === 0) return;
  const respondedAt = Math.round(performance.timeOrigin + timing.responseEnd);
  lastOriginResponseAt = Math.max(lastOriginResponseAt ?? 0, respondedAt);
  if (timing.nextHopProtocol) lastOriginProtocol = timing.nextHopProtocol;
}

function watchPageHiding(): void {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") lastHiddenAt = Date.now();
  });
}

function readDocumentProtocol(): string | null {
  const navigation = performance.getEntriesByType?.("navigation")?.[0] as PerformanceNavigationTiming | undefined;
  return navigation?.nextHopProtocol || null;
}

function readConnection(): NetworkInformationLike {
  const connection = (navigator as Navigator & { connection?: NetworkInformationLike }).connection;
  if (!connection) return {};
  const { effectiveType, type, rtt, downlink, saveData } = connection;
  return { effectiveType, type, rtt, downlink, saveData };
}

function describeCause(cause: unknown): string | null {
  if (cause instanceof Error) return `${cause.name}: ${cause.message}`;
  return cause === null || cause === undefined ? null : String(cause);
}

function readRequestUrl(input: RequestInfo | URL): string {
  if (input instanceof Request) return input.url;
  return input instanceof URL ? input.href : input;
}

function isSameOrigin(url: string): boolean {
  try {
    return new URL(url, window.location.href).origin === window.location.origin;
  } catch {
    return false;
  }
}
