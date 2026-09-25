import { describe, expect, it } from "vitest";

import {
  findLegacySubclass2024,
  findSpellEngName2024,
  isLegacySubclass2024,
  shiftLegacyLevel,
  shiftLegacyLevels,
} from "./legacy-subclasses-2024";

describe("O43 — зсув рівнів легасі-підкласу", () => {
  it("риса нижче рівня підкласу 2024 приходить на ньому, решта — на своєму рівні", () => {
    expect(shiftLegacyLevel(1, 3)).toBe(3);
    expect(shiftLegacyLevel(2, 3)).toBe(3);
    expect(shiftLegacyLevel(6, 3)).toBe(6);
    expect(shiftLegacyLevel(3, 3)).toBe(3);
  });

  it("рівні підкласу після зсуву не повторюються й ідуть за зростанням", () => {
    expect(shiftLegacyLevels([1, 1, 6, 10, 14], 3)).toEqual([3, 6, 10, 14]);
  });
});

describe("O43 — реєстр легасі-підкласів", () => {
  it("знаходить підклас за класом 2024 і каже, з якої він книги", () => {
    expect(findLegacySubclass2024("WARLOCK_2024", "THE_GENIE")).toMatchObject({ source: "TCOE" });
    expect(isLegacySubclass2024("WARLOCK_2024", "THE_GENIE")).toBe(true);
  });

  it("ключ — клас 2024: той самий підклас під класом 2014 легасі не є", () => {
    expect(findLegacySubclass2024("WARLOCK_2014", "THE_GENIE")).toBeNull();
    expect(isLegacySubclass2024("WARLOCK_2014", "THE_GENIE")).toBe(false);
  });

  it("підклас PHB 2024 легасі не є", () => {
    expect(findLegacySubclass2024("WARLOCK_2024", "FIEND_PATRON")).toBeNull();
  });

  it("заклинання 2014 бере назву 2024, лише коли його перейменовано", () => {
    expect(findSpellEngName2024("Branding Smite")).toBe("Shining Smite");
    expect(findSpellEngName2024("Shield")).toBe("Shield");
  });
});
