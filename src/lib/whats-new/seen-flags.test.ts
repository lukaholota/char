import { describe, expect, it } from "vitest";

import {
  type FlagStorage,
  hasReturningVisitorSignal,
  isFlagSeen,
  markFlagSeen,
} from "./seen-flags";

function buildStorage(entries: Record<string, string> = {}): FlagStorage {
  const map = new Map(Object.entries(entries));
  return {
    get length() {
      return map.size;
    },
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
    key: (index: number) => [...map.keys()][index] ?? null,
  };
}

const THROWING_STORAGE: FlagStorage = {
  get length(): number {
    throw new Error("приватне вікно");
  },
  getItem: () => {
    throw new Error("приватне вікно");
  },
  setItem: () => {
    throw new Error("приватне вікно");
  },
  key: () => {
    throw new Error("приватне вікно");
  },
};

describe("прапорець «показано один раз»", () => {
  it("непозначений прапорець не вважається показаним", () => {
    expect(isFlagSeen(buildStorage(), "whats-new:2026-09")).toBe(false);
  });

  it("позначений прапорець лишається показаним", () => {
    const storage = buildStorage();
    markFlagSeen(storage, "whats-new:2026-09");
    expect(isFlagSeen(storage, "whats-new:2026-09")).toBe(true);
  });

  it("прапорці різних релізів не плутаються", () => {
    const storage = buildStorage();
    markFlagSeen(storage, "whats-new:2026-09");
    expect(isFlagSeen(storage, "whats-new:2027-01")).toBe(false);
  });

  it("сховища немає — нічого не падає і нічого не показано", () => {
    expect(isFlagSeen(null, "whats-new:2026-09")).toBe(false);
    expect(() => markFlagSeen(null, "whats-new:2026-09")).not.toThrow();
  });

  it("сховище кидає помилку — поводимось як без сховища", () => {
    expect(isFlagSeen(THROWING_STORAGE, "whats-new:2026-09")).toBe(false);
    expect(() => markFlagSeen(THROWING_STORAGE, "whats-new:2026-09")).not.toThrow();
    expect(hasReturningVisitorSignal(THROWING_STORAGE)).toBe(false);
  });
});

describe("ознака, що людина тут не вперше", () => {
  it("порожнє сховище — новачок", () => {
    expect(hasReturningVisitorSignal(buildStorage())).toBe(false);
  });

  it("чужі ключі новачка не скасовують", () => {
    expect(hasReturningVisitorSignal(buildStorage({ "ga:session": "1" }))).toBe(false);
  });

  it("наші ключі означають, що людина вже користувалася сайтом", () => {
    expect(hasReturningVisitorSignal(buildStorage({ "char:offline-queue:v1": "[]" }))).toBe(true);
    expect(hasReturningVisitorSignal(buildStorage({ "catalog-homebrew:spells": "1" }))).toBe(true);
    expect(hasReturningVisitorSignal(buildStorage({ pers_details_open: "1" }))).toBe(true);
  });
});
