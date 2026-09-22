/** Робота, без якої сторінка вже показана й живе: у вільний час головного потоку, не пізніше `timeoutMs`. */
export function runWhenIdle(run: () => void, timeoutMs: number): () => void {
  if (typeof window === "undefined") return () => undefined;
  if (typeof window.requestIdleCallback === "function") {
    const handle = window.requestIdleCallback(run, { timeout: timeoutMs });
    return () => window.cancelIdleCallback(handle);
  }
  const handle = setTimeout(run, Math.min(timeoutMs, 300));
  return () => clearTimeout(handle);
}
