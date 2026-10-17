// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import GoogleAuthDialog from "@/lib/components/auth/GoogleAuthDialog";
import { CharacterCreateHeader } from "@/lib/components/characterCreator/CharacterCreateHeader";

const auth = vi.hoisted(() => ({ session: null as null | { user: { email: string } }, signIn: vi.fn() }));
const analytics = vi.hoisted(() => ({ capture: vi.fn() }));

vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: auth.session, status: auth.session ? "authenticated" : "unauthenticated" }),
  signIn: auth.signIn,
}));
vi.mock("next/navigation", () => ({ usePathname: () => window.location.pathname }));
vi.mock("@/lib/monitoring/posthog-client", () => ({ capturePostHogEvent: analytics.capture, isPostHogEnabled: () => false, configurePostHogBootstrap: vi.fn(), registerPostHogSuperProperties: vi.fn(), findPostHogIds: () => ({ distinctId: null, sessionId: null }), flushPostHogOnExit: vi.fn() }));

const IOS_SAFARI = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1";
const THREADS_IOS = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Barcelona 337.0.0.22.95 (iPhone15,3; iOS 17_5; uk_UA; uk; scale=3.00; 1290x2796; 615203047)";
const THREADS_ANDROID = "Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/AP2A.240705.005; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/126.0.6478.134 Mobile Safari/537.36 Barcelona 340.0.0.29.109 Android (34/14; 420dpi; 1080x2400; Google/google; Pixel 8; shiba; shiba; uk_UA; 618324011)";

type TelegramWindow = Window & { TelegramWebviewProxy?: unknown; TelegramWebview?: unknown };

function openPage(userAgent: string, path = "/char/create", options: { telegram?: "ios" | "android" } = {}) {
  Object.defineProperty(window.navigator, "userAgent", { value: userAgent, configurable: true });
  (window as TelegramWindow).TelegramWebviewProxy = options.telegram === "ios" ? {} : undefined;
  (window as TelegramWindow).TelegramWebview = options.telegram === "android" ? {} : undefined;
  window.history.replaceState({}, "", path);
}

function setClipboard(writeText: (text: string) => Promise<void>) {
  Object.defineProperty(window.navigator, "clipboard", { value: { writeText }, configurable: true });
}

function findEvent(name: string) {
  return analytics.capture.mock.calls.find(([event]) => event === name)?.[1];
}

beforeEach(() => {
  auth.session = null;
  auth.signIn.mockReset().mockResolvedValue({ url: null });
  analytics.capture.mockReset();
  window.sessionStorage.clear();
  document.execCommand = vi.fn(() => false);
});

afterEach(cleanup);

describe("вхід через Google у звичайному браузері", () => {
  it("показує звичайну кнопку без попередження", () => {
    openPage(IOS_SAFARI);
    render(<GoogleAuthDialog open onOpenChange={() => {}} />);
    expect(screen.queryByText("Google може не пустити в цьому браузері")).toBeNull();
    expect((screen.getByRole("button", { name: /Продовжити з Google/ }) as HTMLButtonElement).disabled).toBe(false);
    expect(findEvent("inapp_warning_shown")).toBeUndefined();
  });
});

describe("вхід у вбудованому браузері за замовчуванням", () => {
  it("Telegram на iPhone: відкрити в Safari чи Chrome одним дотиком і Google як запасна", () => {
    openPage(IOS_SAFARI, "/2024/char?from=abc", { telegram: "ios" });
    render(<GoogleAuthDialog open onOpenChange={() => {}} />);

    expect(screen.getByText(/усередині Telegram/)).toBeTruthy();
    expect(screen.getByText(/Відкрийте сторінку у Safari/)).toBeTruthy();
    const page = "http://localhost:3000/2024/char?from=abc&entry_source=telegram&entry_medium=inapp_handoff";
    expect(screen.getByRole("link", { name: /Відкрити в Safari/ }).getAttribute("href")).toBe(`x-safari-${page}`);
    expect(screen.getByRole("link", { name: /Відкрити в Chrome/ }).getAttribute("href")).toBe("googlechrome://localhost:3000/2024/char?from=abc&entry_source=telegram&entry_medium=inapp_handoff");
    const fallback = screen.getByRole("button", { name: "Все одно спробувати Google" }) as HTMLButtonElement;
    expect(fallback.disabled).toBe(false);
    expect(findEvent("inapp_warning_shown")).toMatchObject({ placement: "auth_dialog", variant: "contextual" });
  });

  it("Telegram на Android з очищеним UA: розпізнаний і має кнопку Chrome без експерименту", () => {
    openPage("Mozilla/5.0 (Linux; Android 14; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.7204.63 Mobile Safari/537.36", "/char/create", { telegram: "android" });
    render(<GoogleAuthDialog open onOpenChange={() => {}} />);
    expect(screen.getByText(/усередині Telegram/)).toBeTruthy();
    expect(screen.getByRole("link", { name: /Відкрити в Chrome/ }).getAttribute("href")).toMatch(/^intent:\/\/localhost:3000\/char\/create\?entry_source=telegram/);
    expect(findEvent("inapp_warning_shown")).toMatchObject({ variant: "contextual" });
  });

  it("запасна кнопка таки запускає вхід через Google на поточну сторінку", async () => {
    openPage(THREADS_IOS, "/char/create?preset=wizard");
    render(<GoogleAuthDialog open onOpenChange={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Все одно спробувати Google" }));
    await waitFor(() => expect(auth.signIn).toHaveBeenCalledWith("google", { redirect: false, callbackUrl: "/char/create?preset=wizard" }));
    expect(findEvent("inapp_warning_dismissed")).toMatchObject({ placement: "auth_dialog", action: "continue_here" });
  });

  it("копіює поточну адресу з позначкою джерела", async () => {
    const writeText = vi.fn(async () => {});
    setClipboard(writeText);
    openPage(THREADS_IOS, "/2024/char?from=abc");
    render(<GoogleAuthDialog open onOpenChange={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Скопіювати посилання" }));

    await screen.findByRole("button", { name: "Посилання скопійовано" });
    expect(writeText).toHaveBeenCalledWith("http://localhost:3000/2024/char?from=abc&entry_source=threads&entry_medium=inapp_handoff");
    expect(findEvent("inapp_link_copied")).toMatchObject({ placement: "auth_dialog", ok: true });
  });

  it("коли буфер обміну заборонено, показує адресу для ручного копіювання", async () => {
    setClipboard(async () => { throw new DOMException("denied", "NotAllowedError"); });
    openPage(THREADS_IOS, "/char/create");
    render(<GoogleAuthDialog open onOpenChange={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Скопіювати посилання" }));

    const field = (await screen.findByRole("textbox", { name: "Посилання на цю сторінку" })) as HTMLInputElement;
    expect(field.value).toContain("/char/create");
    expect(field.readOnly).toBe(true);
    expect(findEvent("inapp_link_copied")).toMatchObject({ ok: false });
  });

  it("закриття діалогу рахується як відмова", () => {
    const onOpenChange = vi.fn();
    openPage(THREADS_IOS);
    render(<GoogleAuthDialog open onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Закрити" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(findEvent("inapp_warning_dismissed")).toMatchObject({ action: "close" });
  });
});

describe("варіант з переходом у браузер", () => {
  it("на Android дає посилання intent у Chrome і чесний запасний шлях", () => {
    openPage(THREADS_ANDROID, "/char/create?inapp_variant=contextual-handoff&preset=x");
    render(<GoogleAuthDialog open onOpenChange={() => {}} />);

    const link = screen.getByRole("link", { name: /Відкрити в Chrome/ });
    expect(link.getAttribute("href")).toMatch(/^intent:\/\/localhost:3000\/char\/create\?preset=x&entry_source=threads&entry_medium=inapp_handoff#Intent;scheme=http;package=com\.android\.chrome;S\.browser_fallback_url=/);
    link.addEventListener("click", (event) => event.preventDefault());
    fireEvent.click(link);
    expect(screen.getByText(/Chrome не відкрився\?/)).toBeTruthy();
    expect(findEvent("inapp_external_browser_selected")).toMatchObject({ method: "android_intent", variant: "contextual-handoff" });
    expect(screen.getByText(/«⋮»/)).toBeTruthy();
  });

  it("у Threads на iPhone не дає мертвої кнопки Safari, а веде через меню, Chrome чи копіювання", () => {
    openPage(THREADS_IOS, "/char/create");
    render(<GoogleAuthDialog open onOpenChange={() => {}} />);
    expect(screen.queryByRole("link", { name: /Відкрити в Safari/ })).toBeNull();
    const chrome = screen.getByRole("link", { name: /Відкрити в Chrome/ });
    chrome.addEventListener("click", (event) => event.preventDefault());
    fireEvent.click(chrome);
    expect(screen.getByText(/Chrome не відкрився\?/)).toBeTruthy();
    expect(findEvent("inapp_external_browser_selected")).toMatchObject({ method: "ios_chrome_scheme" });
    expect(screen.getByRole("button", { name: "Скопіювати посилання" })).toBeTruthy();
    expect(screen.getByText(/«Відкрити в Safari»/)).toBeTruthy();
  });
});

describe("контрольний варіант", () => {
  it("лишає попередню поведінку з вимкненою кнопкою", () => {
    openPage(THREADS_IOS, "/char/create?inapp_variant=control");
    render(<GoogleAuthDialog open onOpenChange={() => {}} />);
    expect((screen.getByRole("button", { name: "Відкрийте у Safari/Chrome" }) as HTMLButtonElement).disabled).toBe(true);
    expect(findEvent("inapp_warning_shown")).toMatchObject({ variant: "control" });
  });
});

describe("варіант протягом візиту", () => {
  it("не змінюється, коли параметр зникає з адреси після переходу", () => {
    openPage(THREADS_IOS, "/char/create?inapp_variant=control");
    const first = render(<GoogleAuthDialog open onOpenChange={() => {}} />);
    first.unmount();

    openPage(THREADS_IOS, "/char/create");
    analytics.capture.mockReset();
    render(<GoogleAuthDialog open onOpenChange={() => {}} />);
    expect((screen.getByRole("button", { name: "Відкрийте у Safari/Chrome" }) as HTMLButtonElement).disabled).toBe(true);
    expect(findEvent("inapp_warning_shown")).toMatchObject({ variant: "control" });
  });

  it("невідоме значення в адресі не скидає обраний варіант", () => {
    openPage(THREADS_IOS, "/char/create?inapp_variant=control");
    render(<GoogleAuthDialog open onOpenChange={() => {}} />).unmount();

    openPage(THREADS_IOS, "/char/create?inapp_variant=bogus");
    analytics.capture.mockReset();
    render(<GoogleAuthDialog open onOpenChange={() => {}} />);
    expect(findEvent("inapp_warning_shown")).toMatchObject({ variant: "control" });
  });
});

describe("підказка в шапці конструктора", () => {
  it("видна гостю у вбудованому браузері й відкриває вхід", () => {
    const onOpenAuth = vi.fn();
    openPage(THREADS_IOS);
    render(<CharacterCreateHeader onReset={() => {}} onOpenAuth={onOpenAuth} />);
    expect(screen.getByRole("note").textContent).toContain("вбудований браузер");
    fireEvent.click(screen.getByRole("button", { name: "Як увійти" }));
    expect(onOpenAuth).toHaveBeenCalled();
    expect(findEvent("inapp_warning_shown")).toMatchObject({ placement: "creator" });
  });

  it("не видна у звичайному браузері, у контрольному варіанті й після входу", () => {
    openPage(IOS_SAFARI);
    const { rerender } = render(<CharacterCreateHeader onReset={() => {}} onOpenAuth={() => {}} />);
    expect(screen.queryByRole("note")).toBeNull();

    openPage(THREADS_IOS, "/char/create?inapp_variant=control");
    rerender(<CharacterCreateHeader onReset={() => {}} onOpenAuth={() => {}} />);
    expect(screen.queryByRole("note")).toBeNull();

    rerender(<CharacterCreateHeader onReset={() => {}} onOpenAuth={() => {}} isAuthenticated />);
    expect(screen.queryByRole("note")).toBeNull();
  });
});
