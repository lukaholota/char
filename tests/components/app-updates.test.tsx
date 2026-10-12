// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { decideAppUpdate, requestAppRestart, startAppUpdates } from "@/lib/pwa/app-updates";

const toast = vi.hoisted(() => ({ info: vi.fn(), dismiss: vi.fn() }));
const queue = vi.hoisted(() => ({ operations: [] as unknown[] }));
const pending = vi.hoisted(() => ({ action: false }));
vi.mock("sonner", () => ({ toast }));
vi.mock("@/lib/offline/queue", () => ({ readOfflineQueue: () => queue.operations }));
vi.mock("@/lib/offline/action-guard", () => ({ hasPendingServerActions: () => pending.action }));
let stop = () => {};
const workerUpdate = vi.fn().mockResolvedValue(undefined);
const tick = async () => { await new Promise((resolve) => setTimeout(resolve, 0)); };
beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_DEPLOYMENT_VERSION", "A");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ version: "B" }))));
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
  Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
  Object.defineProperty(navigator, "standalone", { configurable: true, value: false });
  Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: { getRegistration: vi.fn().mockResolvedValue({ update: workerUpdate }) } });
  Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
  window.history.replaceState({}, "", "/char/create");
  queue.operations = [];
  pending.action = false;
  toast.info.mockClear(); workerUpdate.mockClear();
});
afterEach(() => { stop(); document.body.innerHTML = ""; vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

it.each(["/char/create", "/char/123/levelup", "/homebrew/new", "/homebrew/123/edit", "/2024/char/create", "/no-ai/char/create"])("never silently reloads %s", (pathname) => {
  expect(decideAppUpdate({ hasUpdate: true, wasOffered: true, pathname, isProtected: false })).toBe("offer");
});
it.each(["/char/home", "/char/123", "/spells", "/2024/spells", "/rules/2014", "/no-ai/2024/spells"])("reloads safe %s only on the next return", (pathname) => {
  expect(decideAppUpdate({ hasUpdate: true, wasOffered: false, pathname, isProtected: false })).toBe("offer");
  expect(decideAppUpdate({ hasUpdate: true, wasOffered: true, pathname, isProtected: false })).toBe("reload");
  expect(decideAppUpdate({ hasUpdate: true, wasOffered: true, pathname, isProtected: true })).toBe("offer");
});
it("does nothing for the current build", () => {
  expect(decideAppUpdate({ hasUpdate: false, wasOffered: true, pathname: "/char/home", isProtected: false })).toBe("none");
});
it("offers the new version and throttles both network checks", async () => {
  stop = startAppUpdates(); await tick();
  expect(toast.info).toHaveBeenCalledWith("Є нова версія застосунку", expect.objectContaining({ duration: Infinity }));
  document.dispatchEvent(new Event("visibilitychange")); await tick();
  expect(fetch).toHaveBeenCalledTimes(1); expect(workerUpdate).toHaveBeenCalledTimes(1);
  vi.spyOn(Date, "now").mockReturnValue(Date.now() + 30 * 60 * 1000);
  vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ version: "B" })));
  document.dispatchEvent(new Event("visibilitychange")); await tick();
  expect(fetch).toHaveBeenCalledTimes(2); expect(workerUpdate).toHaveBeenCalledTimes(2);
});
it("does not request reload while offline or with pending edits", async () => {
  queue.operations = [{}];
  stop = startAppUpdates(); await tick();
  const options = toast.info.mock.calls[0][1];
  options.action.onClick();
  expect(toast.info).toHaveBeenLastCalledWith("Спершу дочекайтеся мережі та синхронізації правок.");
});
it("asks before manually reloading a dirty form", async () => {
  document.body.innerHTML = '<form><input /></form>';
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
  stop = startAppUpdates(); await tick();
  toast.info.mock.calls[0][1].action.onClick();
  expect(confirm).toHaveBeenCalledOnce();
});
it("the menu restart asks before interrupting a constructor without a form element", () => {
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
  requestAppRestart();
  expect(confirm).toHaveBeenCalledOnce();
});
it("does not interrupt an active server action, even with an explicit restart", async () => {
  window.history.replaceState({}, "", "/char/home");
  pending.action = true;
  stop = startAppUpdates(); await tick();
  const restart = toast.info.mock.calls[0][1].action.onClick;
  document.dispatchEvent(new Event("visibilitychange")); await tick();
  restart();
  expect(toast.info).toHaveBeenLastCalledWith("Дочекайтеся завершення збереження перед перезапуском.");
});
it("requests persistent storage once in genuine standalone", async () => {
  const persist = vi.fn().mockResolvedValue(true);
  Object.defineProperty(navigator, "storage", { configurable: true, value: { persist } });
  Object.defineProperty(navigator, "standalone", { value: true });
  stop = startAppUpdates(); await tick();
  document.dispatchEvent(new Event("visibilitychange")); await tick();
  expect(persist).toHaveBeenCalledOnce();
});
it.each(['<div role="dialog" data-state="open"></div>', '<form><input /></form>'])("keeps open work on a safe route: %s", async (markup) => {
  window.history.replaceState({}, "", "/char/home");
  document.body.innerHTML = markup;
  stop = startAppUpdates(); await tick();
  document.dispatchEvent(new Event("visibilitychange")); await tick();
  expect(toast.info).toHaveBeenCalledTimes(1);
});
it("remembers edited fields until a real route change", async () => {
  window.history.replaceState({}, "", "/spells");
  document.body.innerHTML = '<input />';
  stop = startAppUpdates(); await tick();
  document.querySelector("input")!.dispatchEvent(new Event("input", { bubbles: true }));
  document.body.innerHTML = "";
  document.dispatchEvent(new Event("visibilitychange")); await tick();
  expect(toast.info).toHaveBeenCalledTimes(1);
});
it("ignores offline checks, invalid responses and callbacks after disposal", async () => {
  Object.defineProperty(navigator, "onLine", { value: false });
  stop = startAppUpdates(); await tick(); expect(fetch).not.toHaveBeenCalled();
  Object.defineProperty(navigator, "onLine", { value: true });
  vi.mocked(fetch).mockResolvedValue(new Response('{"version":42}'));
  document.dispatchEvent(new Event("visibilitychange")); await tick(); expect(toast.info).not.toHaveBeenCalled();
});
