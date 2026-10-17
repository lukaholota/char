// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const analytics = vi.hoisted(() => ({ capture: vi.fn() }));
const offer = vi.hoisted(() => ({ continueWithLinkedDraft: null as null | (() => void) }));

vi.mock("next-auth/react", () => ({ useSession: () => ({ data: null, status: "unauthenticated" }), signIn: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: () => window.location.pathname }));
vi.mock("@/lib/monitoring/posthog-client", () => ({ capturePostHogEvent: analytics.capture, isPostHogEnabled: () => false, configurePostHogBootstrap: vi.fn(), registerPostHogSuperProperties: vi.fn(), findPostHogIds: () => ({ distinctId: null, sessionId: null }), flushPostHogOnExit: vi.fn() }));
vi.mock("@/lib/components/characterCreator/offer-linked-draft", () => ({ offerLinkedDraft: (accept: () => void) => void (offer.continueWithLinkedDraft = accept) }));

const IOS = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1";
const ANDROID = "Mozilla/5.0 (Linux; Android 14; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.7204.63 Mobile Safari/537.36";

type TelegramWindow = Window & { TelegramWebviewProxy?: unknown; TelegramWebview?: unknown };
type Store = typeof import("@/lib/stores/persFormStore");
type Codec = typeof import("@/lib/utils/draft-link");

let store: Store;
let codec: Codec;

const localDraft = { formData: { raceId: 3, classId: 7 }, currentStep: 3, totalSteps: 9 };
const linkedDraft = { scope: "CREATOR_2014" as const, formData: { raceId: 5, classId: 2, name: "Оля" }, currentStep: 5, totalSteps: 9 };

function createStorageStub() {
  const entries = new Map<string, string>();
  return {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => void entries.set(key, value),
    removeItem: (key: string) => void entries.delete(key),
    clear: () => entries.clear(),
    key: (index: number) => [...entries.keys()][index] ?? null,
    get length() {
      return entries.size;
    },
  };
}

function openPage(path: string, userAgent = IOS, telegram?: "ios" | "android") {
  Object.defineProperty(window.navigator, "userAgent", { value: userAgent, configurable: true });
  (window as TelegramWindow).TelegramWebviewProxy = telegram === "ios" ? {} : undefined;
  (window as TelegramWindow).TelegramWebview = telegram === "android" ? {} : undefined;
  window.history.replaceState({}, "", path);
}

async function loadModules() {
  vi.resetModules();
  store = await import("@/lib/stores/persFormStore");
  codec = await import("@/lib/utils/draft-link");
}

// The store reads its draft once on import, as on a real page load.
async function saveLocalDraft() {
  localStorage.setItem("dnd-pers-form", JSON.stringify({ state: localDraft, version: 1 }));
  await loadModules();
}

function CreatorProbe() {
  const isActive = store.useCreatorDraftStorage("RULES_2014");
  const step = store.usePersFormStore((state) => state.currentStep);
  const raceId = store.usePersFormStore((state) => state.formData.raceId);
  return <p data-testid="creator">{isActive ? `step ${step} race ${raceId}` : "loading"}</p>;
}

function findRestoredEvent() {
  return analytics.capture.mock.calls.find(([event]) => event === "inapp_draft_restored");
}

beforeEach(async () => {
  vi.stubGlobal("localStorage", createStorageStub());
  vi.stubGlobal("sessionStorage", createStorageStub());
  analytics.capture.mockReset();
  offer.continueWithLinkedDraft = null;
  await loadModules();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("посилання з вбудованого браузера несе чернетку", () => {
  it("Telegram на iPhone: Safari, Chrome і поле копіювання ведуть на той самий крок", async () => {
    await saveLocalDraft();
    openPage("/char/create", IOS, "ios");
    const { default: GoogleAuthDialog } = await import("@/lib/components/auth/GoogleAuthDialog");
    render(<><CreatorProbe /><GoogleAuthDialog open onOpenChange={() => {}} /></>);

    const safari = screen.getByRole("link", { name: /Відкрити в Safari/ });
    await waitFor(() => expect(safari.getAttribute("href")).toContain("#draft="));
    expect(screen.getByText(/ви продовжите з того самого кроку/)).toBeTruthy();
    const encoded = safari.getAttribute("href")!.split("#draft=")[1];
    expect(await codec.decodeDraftLink(encoded)).toEqual({ scope: "CREATOR_2014", ...localDraft });
    expect(screen.getByRole("link", { name: /Відкрити в Chrome/ }).getAttribute("href")).toMatch(/^googlechromes?:\/\/localhost:3000\/char\/create\?.*#draft=/);
    const writeText = vi.fn(async () => {});
    Object.defineProperty(window.navigator, "clipboard", { value: { writeText }, configurable: true });
    fireEvent.click(screen.getByRole("button", { name: "Скопіювати посилання" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(`http://localhost:3000/char/create?entry_source=telegram&entry_medium=inapp_handoff#draft=${encoded}`));
  });

  it("Telegram на Android: адреса в intent зберігає чернетку перед #Intent", async () => {
    await saveLocalDraft();
    openPage("/char/create", ANDROID, "android");
    const { default: GoogleAuthDialog } = await import("@/lib/components/auth/GoogleAuthDialog");
    render(<><CreatorProbe /><GoogleAuthDialog open onOpenChange={() => {}} /></>);

    const chrome = screen.getByRole("link", { name: /Відкрити в Chrome/ });
    await waitFor(() => expect(chrome.getAttribute("href")).toMatch(/^intent:\/\/localhost:3000\/char\/create\?[^#]*#draft=[A-Za-z0-9_-]+#Intent;/));
  });

  it("без вибраного кроку посилання лишається звичайним", async () => {
    openPage("/char/create", IOS, "ios");
    const { default: GoogleAuthDialog } = await import("@/lib/components/auth/GoogleAuthDialog");
    render(<><CreatorProbe /><GoogleAuthDialog open onOpenChange={() => {}} /></>);

    await screen.findByText("step 1 race undefined");
    expect(screen.getByRole("link", { name: /Відкрити в Safari/ }).getAttribute("href")).not.toContain("#draft=");
    expect(screen.getByText(/незбережені вибори туди не перенесуться/)).toBeTruthy();
  });
});

describe("відкриття посилання з #draft у звичайному браузері", () => {
  it("тихо відновлює крок, прибирає чернетку з адреси й повідомляє аналітику без вмісту", async () => {
    openPage(`/char/create?entry_source=telegram#draft=${await codec.encodeDraftLink(linkedDraft)}`);
    render(<CreatorProbe />);

    expect(window.location.hash).toBe("");
    expect(window.location.href).toBe("http://localhost:3000/char/create?entry_source=telegram");
    expect(screen.getByTestId("creator").textContent).toBe("loading");
    await screen.findByText("step 5 race 5");
    expect(JSON.parse(localStorage.getItem("dnd-pers-form")!).state.formData).toEqual(linkedDraft.formData);
    expect(findRestoredEvent()?.[1]).toMatchObject({ creation_path: "manual", edition: "2014", replaced_local: false });
    expect(JSON.stringify(analytics.capture.mock.calls)).not.toContain("draft=");
    expect(offer.continueWithLinkedDraft).toBeNull();
  });

  it("перепитує, коли тут уже є своя чернетка, і замінює лише після згоди", async () => {
    await saveLocalDraft();
    openPage(`/char/create#draft=${await codec.encodeDraftLink(linkedDraft)}`);
    render(<CreatorProbe />);

    await screen.findByText("step 3 race 3");
    expect(offer.continueWithLinkedDraft).toBeTypeOf("function");
    expect(findRestoredEvent()).toBeUndefined();

    act(() => offer.continueWithLinkedDraft!());
    expect(screen.getByTestId("creator").textContent).toBe("step 5 race 5");
    expect(findRestoredEvent()?.[1]).toMatchObject({ replaced_local: true });
  });

  it("ігнорує чернетку іншої редакції й зіпсоване посилання", async () => {
    await saveLocalDraft();
    openPage(`/char/create#draft=${await codec.encodeDraftLink({ ...linkedDraft, scope: "CREATOR_2024" })}`);
    render(<CreatorProbe />);
    await screen.findByText("step 3 race 3");
    cleanup();

    openPage("/char/create#draft=garbage!!");
    render(<CreatorProbe />);
    await screen.findByText("step 3 race 3");

    expect(window.location.hash).toBe("");
    expect(offer.continueWithLinkedDraft).toBeNull();
    expect(findRestoredEvent()).toBeUndefined();
  });
});
