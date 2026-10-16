// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import GoogleAuthDialog from "@/lib/components/auth/GoogleAuthDialog";

const auth = vi.hoisted(() => ({ signIn: vi.fn() }));
const analytics = vi.hoisted(() => ({
  captureAuthRequested: vi.fn(),
  captureAuthFailed: vi.fn(),
  prepareGoogleAuthRedirect: vi.fn((path: string) => `${path}?ph_ctx=ctx`),
}));

vi.mock("next-auth/react", () => ({ signIn: auth.signIn, useSession: () => ({ data: null, status: "unauthenticated" }) }));
vi.mock("next/navigation", () => ({ usePathname: () => "/char/create" }));
vi.mock("@/lib/utils/isEmbeddedWebView", () => ({ isEmbeddedWebView: () => false }));
vi.mock("@/lib/monitoring/funnel-analytics", () => analytics);

function openDialogAndSignIn() {
  render(<GoogleAuthDialog open onOpenChange={() => undefined} callbackUrl="/char/create" analyticsTrigger="creator_submit" />);
  fireEvent.click(screen.getByRole("button", { name: /Продовжити з Google/ }));
}

beforeEach(() => {
  auth.signIn.mockReset();
  Object.values(analytics).forEach((spy) => spy.mockClear());
});
afterEach(cleanup);

describe("GoogleAuthDialog — події входу", () => {
  it("рахує запит входу й передає в Google адресу з контекстом аналітики", async () => {
    auth.signIn.mockResolvedValue({ url: null });
    openDialogAndSignIn();

    expect(analytics.captureAuthRequested).toHaveBeenCalledWith("creator_submit");
    await waitFor(() => expect(auth.signIn).toHaveBeenCalledWith("google", { redirect: false, callbackUrl: "/char/create?ph_ctx=ctx" }));
    expect(analytics.prepareGoogleAuthRedirect).toHaveBeenCalledWith("/char/create", "creator_submit");
    expect(analytics.captureAuthFailed).not.toHaveBeenCalled();
  });

  it.each([
    ["помилка Google", () => auth.signIn.mockResolvedValue({ error: "OAuthSignin" }), "provider_error"],
    ["обрив мережі", () => auth.signIn.mockRejectedValue(new TypeError("Failed to fetch")), "network"],
  ])("%s дає auth_failed з причиною", async (_label, arrange, reason) => {
    arrange();
    openDialogAndSignIn();

    await waitFor(() => expect(analytics.captureAuthFailed).toHaveBeenCalledWith("google_redirect", reason));
  });
});
