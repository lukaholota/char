import { describe, expect, it } from "vitest";
import { isRules2024Allowed } from "@/rules/access";
import { canAccess2024Route } from "@/rules/route-helpers";

/// Передрелізний гейт знято 2026-08-28: реформа виходить назагал. Раніше тут перевірялися
/// пошта власника, ADMIN_EMAIL(S) і ENABLE_RULES_2024 — жодного з цих шляхів більше немає,
/// тому каталоги 2024 не викликають auth() і рендеряться статично.
describe("доступ до правил 2024 — відкритий", () => {
  it("пускає будь-кого, зокрема анонімного відвідувача", () => {
    expect(isRules2024Allowed()).toBe(true);
    expect(canAccess2024Route()).toBe(true);
  });

  it("не залежить від жодної змінної середовища", () => {
    const before = { ...process.env };
    try {
      delete process.env.ENABLE_RULES_2024;
      delete process.env.ADMIN_EMAIL;
      delete process.env.OWNER_EMAIL;
      delete process.env.ADMIN_EMAILS;
      expect(isRules2024Allowed()).toBe(true);
    } finally {
      process.env = before;
    }
  });
});
