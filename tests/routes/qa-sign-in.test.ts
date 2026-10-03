import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn(), signIn: vi.fn() }));

import { auth, signIn } from "@/lib/auth";
import { GET } from "@/app/qa-sign-in/route";

const request = () => new Request("https://0.0.0.0:3000/qa-sign-in", { headers: { host: "char.holota.family" } });

describe("GET /qa-sign-in", () => {
  beforeEach(() => {
    vi.stubEnv("QA_CREDENTIALS_EMAIL", "qa-browser@char.holota.family");
    vi.mocked(auth).mockReset();
    vi.mocked(signIn).mockReset();
    vi.mocked(signIn).mockResolvedValue("/char" as never);
  });

  it("boots an anonymous browser into the normal QA sign-in flow", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);

    const response = await GET(request());

    expect(signIn).toHaveBeenCalledWith("qa-bootstrap", { redirectTo: "/char", redirect: false });
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("/char");
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
  });

  it("reuses an existing QA session", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "967", email: "qa-browser@char.holota.family" } } as never);

    const response = await GET(request());

    expect(response.headers.get("location")).toBe("/char");
    expect(signIn).not.toHaveBeenCalled();
  });

  it("boots again when an expired cookie does not authenticate", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);

    const response = await GET(new Request("https://char.holota.family/qa-sign-in", { headers: { cookie: "authjs.session-token=expired" } }));

    expect(response.status).toBe(307);
    expect(signIn).toHaveBeenCalledOnce();
  });

  it("does not replace an authenticated player's session", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "12", email: "player@example.test" } } as never);

    const response = await GET(request());

    expect(response.headers.get("location")).toBe("/char");
    expect(signIn).not.toHaveBeenCalled();
  });

  it("fails safely for invalid configuration or a missing QA account", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    vi.stubEnv("QA_CREDENTIALS_EMAIL", "player@example.test");
    expect((await GET(request())).status).toBe(503);
    expect(signIn).not.toHaveBeenCalled();

    vi.stubEnv("QA_CREDENTIALS_EMAIL", "qa-browser@char.holota.family");
    vi.mocked(signIn).mockResolvedValue("/api/auth/error?error=CredentialsSignin" as never);
    expect((await GET(request())).status).toBe(503);
  });
});
