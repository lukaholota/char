// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { RESERVE_INSTALL_PROMPT_SCRIPT } from "@/lib/pwa/install-bootstrap";
import { requestAppInstall, type DeferredInstallPrompt } from "@/lib/pwa/install-prompt";
import { recordInstallBannerVisit, dismissInstallBanner, shouldOfferInstallBanner } from "@/lib/pwa/install-banner";
import { InstallAppEntry } from "@/components/pwa/InstallAppEntry";
import { InstallAppInstructions } from "@/components/pwa/InstallAppInstructions";
import { clearOfflineQueue, queueOfflineOperation } from "@/lib/offline/queue";

const capture = vi.hoisted(() => vi.fn());
vi.mock("@/lib/monitoring/posthog-client", () => ({ capturePostHogEvent: capture }));
vi.mock("next/dynamic", () => ({ default: () => () => null }));
const standalone = { matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() };

beforeEach(() => {
  capture.mockClear();
  standalone.matches = false;
  vi.stubGlobal("matchMedia", () => standalone);
  Object.defineProperty(navigator, "userAgent", { configurable: true, value: "Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/128.0 Mobile Safari/537.36" });
  Object.defineProperty(navigator, "standalone", { configurable: true, value: false });
  Object.defineProperty(navigator, "maxTouchPoints", { configurable: true, value: 0 });
  delete window.__deferredInstallPrompt;
  delete window.__pwaInstalled;
  const stored = new Map<string, string>();
  const storage = { getItem: vi.fn((key: string) => stored.get(key) ?? null), setItem: vi.fn((key: string, value: string) => { stored.set(key, value); }) };
  Object.defineProperty(window, "localStorage", { configurable: true, value: storage });
  vi.stubGlobal("localStorage", storage);
  clearOfflineQueue();
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); clearOfflineQueue(); });

function reservePrompt(outcome: "accepted" | "dismissed" = "accepted") {
  const prompt = vi.fn().mockResolvedValue(undefined);
  window.__deferredInstallPrompt = Object.assign(new Event("beforeinstallprompt"), { prompt, userChoice: Promise.resolve({ outcome }) });
  return prompt;
}

it.each([
  ["Windows Chrome", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0 Safari/537.36", 0],
  ["touchscreen Windows", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0 Safari/537.36", 10],
  ["Mac Safari", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Version/18.0 Safari/605.1.15", 0],
  ["Linux Chrome", "Mozilla/5.0 (X11; Linux x86_64) Chrome/128.0 Safari/537.36", 0],
])("never promotes installation on %s, even with a native prompt", (_name, userAgent, maxTouchPoints) => {
  Object.defineProperty(navigator, "userAgent", { value: userAgent });
  Object.defineProperty(navigator, "maxTouchPoints", { value: maxTouchPoints });
  reservePrompt();
  recordInstallBannerVisit();
  render(<><InstallAppEntry placement="menu" /><InstallAppEntry placement="banner" /></>);
  expect(screen.queryByRole("button", { name: "Встановити застосунок" })).toBeNull();
  expect(screen.queryByRole("complementary")).toBeNull();
  expect(capture).not.toHaveBeenCalled();
  expect(shouldOfferInstallBanner()).toBe(false);
});

it.each([
  ["iPhone", "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Version/18.0 Mobile Safari/604.1", 5],
  ["iPad desktop UA", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Version/18.0 Safari/605.1.15", 5],
  ["Android tablet", "Mozilla/5.0 (Linux; Android 14; SM-X710) Chrome/128.0 Safari/537.36", 5],
])("promotes installation on %s", (_name, userAgent, maxTouchPoints) => {
  Object.defineProperty(navigator, "userAgent", { value: userAgent });
  Object.defineProperty(navigator, "maxTouchPoints", { value: maxTouchPoints });
  recordInstallBannerVisit();
  render(<><InstallAppEntry placement="menu" /><InstallAppEntry placement="banner" /></>);
  expect(screen.getAllByRole("button", { name: "Встановити застосунок" })).toHaveLength(2);
  expect(screen.getByRole("complementary").textContent).toContain("планшета");
});

it("does not offer installation inside standalone", () => {
  standalone.matches = true;
  render(<InstallAppEntry placement="menu" />);
  expect(screen.queryByRole("button", { name: "Встановити застосунок" })).toBeNull();
  expect(capture).not.toHaveBeenCalled();
});
it("recognizes iOS navigator.standalone too", () => {
  Object.defineProperty(navigator, "standalone", { value: true });
  render(<InstallAppEntry placement="menu" />);
  expect(screen.queryByRole("button")).toBeNull();
});
it.each(["accepted", "dismissed"] as const)("opens native prompt and records %s", async (outcome) => {
  const prompt = reservePrompt(outcome);
  render(<InstallAppEntry placement="menu" />);
  fireEvent.click(screen.getByRole("button", { name: "Встановити застосунок" }));
  expect(prompt).toHaveBeenCalledTimes(1);
  await waitFor(() => expect(capture).toHaveBeenCalledWith("app_install_prompt_result", { outcome }));
  expect(window.__deferredInstallPrompt).toBeUndefined();
});
it("consumes the prompt once even with two immediate requests", async () => {
  const prompt = reservePrompt();
  await Promise.all([requestAppInstall(), requestAppInstall()]);
  expect(prompt).toHaveBeenCalledTimes(1);
});
it("survives menu unmount and opens instructions in its parent", () => {
  const onInstructions = vi.fn();
  let unmount = () => {};
  ({ unmount } = render(<InstallAppEntry placement="menu" onActivate={() => unmount()} onInstructions={onInstructions} />));
  fireEvent.click(screen.getByRole("button", { name: "Встановити застосунок" }));
  expect(onInstructions).toHaveBeenCalledWith("android-menu");
});
it("retains an install event dispatched before React mounts", async () => {
  const target = new EventTarget() as EventTarget & { __deferredInstallPrompt?: DeferredInstallPrompt; __pwaInstalled?: boolean };
  new Function("window", "Event", RESERVE_INSTALL_PROMPT_SCRIPT)(target, Event);
  const prompt = vi.fn().mockResolvedValue(undefined);
  const event = Object.assign(new Event("beforeinstallprompt", { cancelable: true }), { prompt, userChoice: Promise.resolve({ outcome: "accepted" as const }) });
  target.dispatchEvent(event);
  expect(event.defaultPrevented).toBe(true);
  expect(target.__deferredInstallPrompt).toBe(event);
  target.dispatchEvent(new Event("appinstalled"));
  expect(target.__deferredInstallPrompt).toBeUndefined();
  expect(target.__pwaInstalled).toBe(true);
});
it("hides immediately when appinstalled updates the shared state", () => {
  render(<InstallAppEntry placement="menu" />);
  act(() => { window.__pwaInstalled = true; window.dispatchEvent(new Event("pwa-install-state-changed")); });
  expect(screen.queryByRole("button")).toBeNull();
});
it("offers the banner from the second visit, and again after 30 days", () => {
  vi.spyOn(Date, "now").mockReturnValue(100_000);
  recordInstallBannerVisit();
  expect(shouldOfferInstallBanner()).toBe(false);
  recordInstallBannerVisit();
  expect(shouldOfferInstallBanner()).toBe(true);
  dismissInstallBanner();
  recordInstallBannerVisit();
  expect(shouldOfferInstallBanner()).toBe(false);
  vi.spyOn(Date, "now").mockReturnValue(100_000 + 30 * 24 * 60 * 60 * 1000);
  recordInstallBannerVisit();
  expect(shouldOfferInstallBanner()).toBe(true);
});
it("keeps the menu usable when storage is blocked", () => {
  vi.spyOn(localStorage, "getItem").mockImplementation(() => { throw new DOMException("blocked", "SecurityError"); });
  recordInstallBannerVisit();
  expect(shouldOfferInstallBanner()).toBe(false);
  render(<InstallAppEntry placement="menu" />);
  expect(screen.getByRole("button", { name: "Встановити застосунок" })).toBeTruthy();
});
it("copies the current in-app URL and reports success", async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
  render(<InstallAppInstructions path="in-app-browser" onClose={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Скопіювати посилання" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Посилання скопійовано" })).toBeTruthy());
  expect(writeText).toHaveBeenCalledWith(window.location.href);
});
it("provides a selectable URL when clipboard access fails", async () => {
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: vi.fn().mockRejectedValue(new DOMException("blocked", "NotAllowedError")) } });
  render(<InstallAppInstructions path="in-app-browser" onClose={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Скопіювати посилання" }));
  await waitFor(() => expect(screen.getByRole("textbox", { name: "Посилання на сторінку" })).toBeTruthy());
});
it("warns iOS users about unsent edits", () => {
  queueOfflineOperation({ operationId: "pending", kind: "details", persId: 1, createdAt: new Date().toISOString(), patch: { notes: "test" } });
  render(<InstallAppInstructions path="ios-safari" onClose={vi.fn()} />);
  expect(screen.getByRole("status").textContent).toContain("ненадіслані зміни: 1");
});

it("falls back to instructions if the browser refuses the prompt", async () => {
  const prompt = reservePrompt();
  prompt.mockRejectedValue(new DOMException("already consumed", "InvalidStateError"));
  const onInstructions = vi.fn();
  render(<InstallAppEntry placement="menu" onInstructions={onInstructions} />);
  fireEvent.click(screen.getByRole("button", { name: "Встановити застосунок" }));
  await waitFor(() => expect(onInstructions).toHaveBeenCalledWith("android-menu"));
  expect(capture.mock.calls.some(([event]) => event === "app_install_prompt_result")).toBe(false);
});

it("counts only the visible menu variant as an offered installation", () => {
  vi.spyOn(HTMLElement.prototype, "getClientRects").mockImplementation(function (this: HTMLElement) {
    const rectangles = this.closest("[hidden]") ? [] : [new DOMRect(0, 0, 200, 40)];
    return Object.assign(rectangles, { item: (index: number) => rectangles[index] ?? null });
  });
  render(<><div hidden><InstallAppEntry placement="menu" /></div><InstallAppEntry placement="menu" /></>);
  expect(capture.mock.calls.filter(([event]) => event === "app_install_offered")).toEqual([["app_install_offered", { path: "android-menu", placement: "menu" }]]);
});
