import { beforeEach, describe, expect, it, vi } from "vitest";

const claimEmailVerifiedByGoogle = vi.fn();
vi.mock("next-auth", () => ({ default: () => ({}) }));
vi.mock("@/server/db/auth", () => ({
  authAdapter: {},
  claimEmailVerifiedByGoogle: (userId: number) => claimEmailVerifiedByGoogle(userId),
  findOrCreateGoogleUser: vi.fn(),
  findQaAccountUser: vi.fn(),
}));

const { config } = await import("@/lib/auth");
type SignInEvent = Parameters<NonNullable<typeof config.events.signIn>>[0];
const signIn = (provider: string) => config.events.signIn({ user: { id: "42" }, account: { provider, type: "oauth", providerAccountId: "g" } } as SignInEvent);

describe("вхід через Google підтверджує пошту", () => {
  beforeEach(() => claimEmailVerifiedByGoogle.mockClear());

  it.each(["google", "google-onetap"])("%s — і для старого акаунта, що вже привʼязаний", async (provider) => {
    await signIn(provider);
    expect(claimEmailVerifiedByGoogle).toHaveBeenCalledWith(42);
  });

  it("вхід паролем пошту не підтверджує", async () => {
    await signIn("password");
    expect(claimEmailVerifiedByGoogle).not.toHaveBeenCalled();
  });
});
