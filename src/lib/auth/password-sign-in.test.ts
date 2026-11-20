import { beforeEach, describe, expect, it, vi } from "vitest";

const users = new Map<string, { id: number; passwordHash: string }>();

vi.mock("@/server/db/auth", () => ({
  createPasswordUser: vi.fn(async (email: string, passwordHash: string) => {
    if (users.has(email)) return null;
    users.set(email, { id: users.size + 1, passwordHash });
    return { id: users.size, email, name: email.split("@")[0], image: null };
  }),
  findPasswordHash: vi.fn(async (email: string) => {
    const user = users.get(email);
    return user ? { user: { id: user.id, email, name: null, image: null }, passwordHash: user.passwordHash } : null;
  }),
}));

import { authorizePasswordUser } from "./password-sign-in";
import { hashPassword, isPasswordMatch } from "./password-hash";

async function readErrorCode(promise: Promise<unknown>): Promise<string | undefined> {
  return promise.then(() => undefined, (error: { code?: string }) => error.code);
}

describe("хеш пароля", () => {
  it("збігається лише з тим самим паролем, а сіль робить хеші різними", async () => {
    const first = await hashPassword("дракон-123");
    const second = await hashPassword("дракон-123");
    expect(first).not.toBe(second);
    expect(await isPasswordMatch("дракон-123", first)).toBe(true);
    expect(await isPasswordMatch("дракон-124", first)).toBe(false);
    expect(await isPasswordMatch("дракон-123", "bcrypt$bad")).toBe(false);
  });
});

describe("вхід поштою й паролем", () => {
  beforeEach(() => users.clear());

  it("реєструє з пошти в будь-якому регістрі й пускає з тим самим паролем", async () => {
    const created = await authorizePasswordUser({ mode: "register", email: " Kim@Example.com ", password: "secret-pass" });
    expect(created.email).toBe("kim@example.com");
    const signedIn = await authorizePasswordUser({ mode: "sign_in", email: "kim@example.com", password: "secret-pass" });
    expect(signedIn.id).toBe(created.id);
  });

  it("не дає зареєструвати зайняту пошту й не пускає з чужим паролем", async () => {
    await authorizePasswordUser({ mode: "register", email: "kim@example.com", password: "secret-pass" });
    expect(await readErrorCode(authorizePasswordUser({ mode: "register", email: "kim@example.com", password: "other-pass" }))).toBe("email_taken");
    expect(await readErrorCode(authorizePasswordUser({ mode: "sign_in", email: "kim@example.com", password: "other-pass" }))).toBe("wrong_credentials");
    expect(await readErrorCode(authorizePasswordUser({ mode: "sign_in", email: "nobody@example.com", password: "secret-pass" }))).toBe("wrong_credentials");
  });

  it("відхиляє короткий пароль і не пошту", async () => {
    expect(await readErrorCode(authorizePasswordUser({ mode: "register", email: "kim@example.com", password: "short" }))).toBe("invalid_input");
    expect(await readErrorCode(authorizePasswordUser({ mode: "register", email: "kim", password: "secret-pass" }))).toBe("invalid_input");
  });
});
