// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import SignInDialog from "@/lib/components/auth/SignInDialog";

const auth = vi.hoisted(() => ({ signIn: vi.fn() }));

vi.mock("next-auth/react", () => ({ useSession: () => ({ data: null, status: "unauthenticated" }), signIn: auth.signIn }));
vi.mock("next/navigation", () => ({ usePathname: () => window.location.pathname }));
// Підказка для вбудованого браузера ліниво тягне схеми конструктора; справжні модулі довантажувались уже після кінця тесту й валили CI.
vi.mock("@/lib/stores/persFormStore", () => ({ findLinkableDraft: () => null }));
vi.mock("@/lib/utils/draft-link", () => ({ encodeDraftLink: () => null }));
vi.mock("@/lib/monitoring/posthog-client", () => ({ capturePostHogEvent: vi.fn(), isPostHogEnabled: () => false, configurePostHogBootstrap: vi.fn(), registerPostHogSuperProperties: vi.fn(), findPostHogIds: () => ({ distinctId: null, sessionId: null }), flushPostHogOnExit: vi.fn() }));

const THREADS_IOS = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Barcelona 337.0.0.22.95 (iPhone15,3; iOS 17_5; uk_UA; uk; scale=3.00; 1290x2796; 615203047)";
const DESKTOP = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15";
const assign = vi.fn();

function openDialog(userAgent = DESKTOP) {
  Object.defineProperty(window.navigator, "userAgent", { value: userAgent, configurable: true });
  window.history.replaceState({}, "", "/char/create");
  render(<SignInDialog open onOpenChange={() => {}} />);
}

function fillCredentials(email: string, password: string) {
  fireEvent.change(screen.getByLabelText("Пошта"), { target: { value: email } });
  fireEvent.change(screen.getByLabelText("Пароль"), { target: { value: password } });
}

beforeEach(() => {
  auth.signIn.mockReset();
  assign.mockReset();
  Object.defineProperty(window, "location", { value: { ...window.location, assign, pathname: "/char/create", search: "" }, configurable: true });
});

afterEach(cleanup);

describe("вхід поштою й паролем", () => {
  it("створює акаунт і повертає на ту саму сторінку", async () => {
    auth.signIn.mockResolvedValue({ ok: true, error: undefined });
    openDialog();
    fireEvent.click(screen.getByRole("button", { name: "Створити" }));
    expect(screen.getByText(/Скинути забутий пароль поки не можна/)).toBeTruthy();
    fillCredentials("kim@example.com", "secret-pass");
    fireEvent.click(screen.getByRole("button", { name: "Створити акаунт" }));

    await waitFor(() => expect(assign).toHaveBeenCalledWith("/char/create"));
    expect(auth.signIn).toHaveBeenCalledWith("password", { mode: "register", email: "kim@example.com", password: "secret-pass", redirect: false });
  });

  it("зайнята пошта перемикає на вхід і пояснює, що робити", async () => {
    auth.signIn.mockResolvedValue({ ok: false, error: "CredentialsSignin", code: "email_taken" });
    openDialog();
    fireEvent.click(screen.getByRole("button", { name: "Створити" }));
    fillCredentials("kim@example.com", "secret-pass");
    fireEvent.click(screen.getByRole("button", { name: "Створити акаунт" }));

    expect((await screen.findByRole("alert")).textContent).toContain("Ця пошта вже має акаунт");
    expect(screen.getByRole("button", { name: "Увійти" })).toBeTruthy();
    expect(assign).not.toHaveBeenCalled();
  });

  it("невірний пароль не пускає й підказує про Google", async () => {
    auth.signIn.mockResolvedValue({ ok: false, error: "CredentialsSignin", code: "wrong_credentials" });
    openDialog();
    fillCredentials("kim@example.com", "secret-pass");
    fireEvent.click(screen.getByRole("button", { name: "Увійти" }));
    expect((await screen.findByRole("alert")).textContent).toContain("через Google");
  });

  it("у вбудованому браузері пошта йде першою, Google — запасним шляхом", () => {
    openDialog(THREADS_IOS);
    const form = screen.getByLabelText("Пошта");
    const google = screen.getByRole("button", { name: "Все одно спробувати Google" });
    expect(form.compareDocumentPosition(google) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
