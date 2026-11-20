import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PasswordAccount } from "@/server/db/auth";

let account: PasswordAccount | null = null;
const replacePasswordHash = vi.fn(async (_userId: number, checkedHash: string | null, nextHash: string) => {
  if (!account || account.passwordHash !== checkedHash) return false;
  account = { ...account, passwordHash: nextHash };
  return true;
});

vi.mock("@/server/db/auth", () => ({
  findPasswordAccount: vi.fn(async () => account),
  replacePasswordHash: (...args: [number, string | null, string]) => replacePasswordHash(...args),
}));

import { changeAccountPassword } from "./password-change";
import { hashPassword, isPasswordMatch } from "./password-hash";

describe("пароль для наявного акаунта", () => {
  beforeEach(() => {
    account = { email: "kim@holota.family", isEmailVerified: true, passwordHash: null };
    replacePasswordHash.mockClear();
  });

  it("Google-акаунт отримує пароль без поточного", async () => {
    expect(await changeAccountPassword(1, { newPassword: "дракон-123" })).toBeNull();
    expect(await isPasswordMatch("дракон-123", account!.passwordHash!)).toBe(true);
  });

  it("наявний пароль змінюється лише з правильним поточним", async () => {
    account = { ...account!, passwordHash: await hashPassword("старий-пароль") };
    expect(await changeAccountPassword(1, { newPassword: "новий-пароль" })).toBe("wrong_password");
    expect(await changeAccountPassword(1, { currentPassword: "не-той-пароль", newPassword: "новий-пароль" })).toBe("wrong_password");
    expect(replacePasswordHash).not.toHaveBeenCalled();
    expect(await changeAccountPassword(1, { currentPassword: "старий-пароль", newPassword: "новий-пароль" })).toBeNull();
    expect(await isPasswordMatch("новий-пароль", account!.passwordHash!)).toBe(true);
  });

  it("пошта, яку не підтвердив Google, пароля не отримує", async () => {
    account = { ...account!, isEmailVerified: false };
    expect(await changeAccountPassword(1, { newPassword: "дракон-123" })).toBe("not_verified");
    account = null;
    expect(await changeAccountPassword(1, { newPassword: "дракон-123" })).toBe("not_verified");
    expect(replacePasswordHash).not.toHaveBeenCalled();
  });

  it("закороткий пароль відхиляється до бази", async () => {
    expect(await changeAccountPassword(1, { newPassword: "1234567" })).toBe("invalid_input");
    expect(await changeAccountPassword(1, null)).toBe("invalid_input");
  });
});
