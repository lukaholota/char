# Журнал дотиків з телефона

Діагностика, якою 2026-10-12 знайшли мертвий перший тап на iPhone (див.
[аудит](mobile-ux-audit-2026-10-11.md#причина-знайдена-журналом-дотиків)). З коду прибрано; щоб
повторити — поверни три частини нижче, збери `NEXT_PUBLIC_TAP_DEBUG=1 bun run phone:prod` і читай
`.next/tap-log.jsonl`. Журнал пише touch/pointer/mouse/click (і чи скасовано click), навігацію історії,
RSC/prefetch/action-запити та розриви кадрів понад 150 мс.

У `src/app/layout.tsx`, у `<head>`:

```tsx
import { IS_TAP_DEBUG, TAP_DEBUG_SCRIPT } from "@/lib/debug/tap-debug-script";
{IS_TAP_DEBUG ? <script dangerouslySetInnerHTML={{ __html: TAP_DEBUG_SCRIPT }} /> : null}
```

`src/app/api/debug/tap-log/route.ts`:

```ts
import { appendFile } from "node:fs/promises";
import { IS_TAP_DEBUG } from "@/lib/debug/tap-debug-script";

export const runtime = "nodejs";

const TAP_LOG_FILE = process.env.TAP_LOG_FILE ?? ".next/tap-log.jsonl";
const MAX_BODY_LENGTH = 200_000;

export async function POST(request: Request) {
  if (!IS_TAP_DEBUG) return new Response(null, { status: 404 });
  const body = await request.text();
  if (body.length > MAX_BODY_LENGTH) return new Response(null, { status: 413 });
  await appendFile(TAP_LOG_FILE, `${JSON.stringify({ receivedAt: new Date().toISOString(), ...JSON.parse(body) })}\n`);
  return new Response(null, { status: 204 });
}
```

`src/lib/debug/tap-debug-script.ts`:

```ts
// shortcut: temporary diagnostics for the owner's phone build (NEXT_PUBLIC_TAP_DEBUG=1), remove once the lost first tap is understood.
export const IS_TAP_DEBUG = process.env.NEXT_PUBLIC_TAP_DEBUG === "1";

export const TAP_DEBUG_SCRIPT = `(() => {
  const session = Math.random().toString(36).slice(2, 8);
  const events = [];
  const now = () => Math.round(performance.now());
  const describe = (target) => {
    if (!(target instanceof Element)) return String(target && target.nodeName);
    const link = target.closest('a');
    if (link) return 'a ' + link.getAttribute('href');
    const button = target.closest('button');
    if (button) return 'button ' + (button.getAttribute('aria-label') || button.textContent || '').trim().slice(0, 30);
    return target.tagName.toLowerCase() + '.' + String(target.className).slice(0, 40);
  };
  const log = (type, details) => events.push({ t: now(), type, path: location.pathname, ...details });
  let touch = null;
  addEventListener('touchstart', (event) => {
    const point = event.touches[0];
    touch = { x: point.clientX, y: point.clientY, t: now() };
    log('touchstart', { target: describe(event.target), touches: event.touches.length, force: point.force, radius: Math.round(point.radiusX || 0) });
  }, { capture: true, passive: true });
  for (const type of ['touchend', 'touchcancel']) addEventListener(type, (event) => {
    const point = event.changedTouches[0];
    log(type, { target: describe(event.target), heldMs: touch ? now() - touch.t : null, movedPx: touch && point ? Math.round(Math.hypot(point.clientX - touch.x, point.clientY - touch.y)) : null });
  }, { capture: true, passive: true });
  for (const type of ['pointercancel', 'mouseover', 'mousedown', 'mouseup', 'click', 'contextmenu', 'dragstart'])
    addEventListener(type, (event) => log(type, { target: describe(event.target) }), { capture: true, passive: true });
  addEventListener('click', (event) => log('click-after-handlers', { target: describe(event.target), prevented: event.defaultPrevented }));
  for (const method of ['pushState', 'replaceState']) {
    const original = history[method].bind(history);
    history[method] = (state, title, url) => { log(method, { url: String(url) }); return original(state, title, url); };
  }
  addEventListener('popstate', () => log('popstate', {}), { capture: true });
  addEventListener('pageshow', (event) => log('pageshow', { persisted: event.persisted }));
  addEventListener('visibilitychange', () => { log('visibility', { state: document.visibilityState }); if (document.visibilityState === 'hidden') flush(); });
  addEventListener('error', (event) => log('error', { message: String(event.message).slice(0, 200) }));
  const originalFetch = window.fetch.bind(window);
  window.fetch = (input, init) => {
    const headers = new Headers(init && init.headers);
    const url = String(input && input.url || input);
    const kind = headers.get('next-action') ? 'action' : headers.get('rsc') ? (headers.get('next-router-prefetch') ? 'prefetch' : 'rsc') : null;
    if (!kind) return originalFetch(input, init);
    const startedAt = now();
    log(kind + '-start', { url: url.slice(0, 120) });
    return originalFetch(input, init).then((response) => { log(kind + '-end', { url: url.slice(0, 120), status: response.status, ms: now() - startedAt }); return response; },
      (error) => { log(kind + '-fail', { url: url.slice(0, 120), ms: now() - startedAt, message: String(error).slice(0, 120) }); throw error; });
  };
  let lastFrame = now();
  const watchFrames = () => { const t = now(); if (document.visibilityState === 'visible' && t - lastFrame > 150) log('frame-gap', { ms: t - lastFrame }); lastFrame = t; requestAnimationFrame(watchFrames); };
  requestAnimationFrame(watchFrames);
  const flush = () => {
    if (!events.length) return;
    const body = JSON.stringify({ session, ua: navigator.userAgent, standalone: matchMedia('(display-mode: standalone)').matches, events: events.splice(0) });
    navigator.sendBeacon('/api/debug/tap-log', new Blob([body], { type: 'application/json' }));
  };
  setInterval(flush, 3000);
  addEventListener('pagehide', flush);
  log('boot', { url: location.href });
})();`;
```
