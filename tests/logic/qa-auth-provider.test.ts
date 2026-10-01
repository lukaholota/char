import { beforeEach, describe, expect, it, vi } from "vitest";
import { Auth, skipCSRFCheck } from "@auth/core";

vi.mock("@/server/db/auth", () => ({ authAdapter: {}, findOrCreateGoogleUser: vi.fn(), findQaAccountUser: vi.fn() }));
vi.mock("next-auth", () => ({ default: () => ({ auth: vi.fn(), handlers: {}, signIn: vi.fn(), signOut: vi.fn() }) }));
vi.stubEnv("QA_CREDENTIALS_EMAIL", "qa-browser@char.holota.family");

import { findQaAccountUser } from "@/server/db/auth";

const { config } = await import("@/lib/auth");
const qaProvider = config.providers.at(-1) as unknown as {
  options: { id: string; authorize: (credentials: Record<string, unknown>, request: Request) => Promise<{ id: string; email: string | null } | null> };
};
const authorize = qaProvider.options.authorize;

describe("QA bootstrap provider", () => {
  beforeEach(() => {
    vi.mocked(findQaAccountUser).mockReset();
    vi.stubEnv("HOMEBREW_MODERATOR_EMAILS", "");
  });

  it("returns the existing QA account for the ordinary JWT session", async () => {
    vi.mocked(findQaAccountUser).mockResolvedValue({ id: 967, email: "qa-browser@char.holota.family", name: "QA browser", image: null });

    expect(qaProvider.options.id).toBe("qa-bootstrap");
    expect(await authorize({}, {} as never)).toMatchObject({ id: "967", email: "qa-browser@char.holota.family" });
    expect(findQaAccountUser).toHaveBeenCalledWith("qa-browser@char.holota.family");
  });

  it("creates the standard JWT session cookie for the QA user", async () => {
    vi.mocked(findQaAccountUser).mockResolvedValue({ id: 967, email: "qa-browser@char.holota.family", name: "QA browser", image: null });
    const authConfig = { ...config, basePath: "/api/auth", secret: "qa-session-test-secret", skipCSRFCheck } as const;

    const signInResponse = await Auth(new Request("http://localhost/api/auth/callback/qa-bootstrap", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ callbackUrl: "http://localhost/char" }),
    }), authConfig);
    const sessionCookie = signInResponse.headers.get("set-cookie")?.match(/authjs\.session-token=[^;]+/)?.[0];

    expect(sessionCookie).toBeTruthy();
    const sessionResponse = await Auth(new Request("http://localhost/api/auth/session", {
      headers: { cookie: sessionCookie! },
    }), authConfig);

    expect(await sessionResponse.json()).toMatchObject({ user: { id: "967", email: "qa-browser@char.holota.family" } });
  });

  it("rejects a missing QA user and a moderator configuration", async () => {
    vi.mocked(findQaAccountUser).mockResolvedValue(null);
    expect(await authorize({}, {} as never)).toBeNull();

    vi.stubEnv("HOMEBREW_MODERATOR_EMAILS", "qa-browser@char.holota.family");
    expect(await authorize({}, {} as never)).toBeNull();
    expect(findQaAccountUser).toHaveBeenCalledOnce();
  });
});
