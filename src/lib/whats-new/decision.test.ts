import { describe, expect, it } from "vitest";

import { decideWhatsNew } from "./decision";
import { type FlagStorage, markFlagSeen } from "./seen-flags";
import { CURRENT_RELEASE_FLAG } from "./release-notes";

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

const RETURNING = { "catalog-homebrew:spells": "1" };

describe("рішення, чи показувати «що нового»", () => {
  it("свій на головній — показуємо", () => {
    const decision = decideWhatsNew({ pathname: "/", isAuthenticated: false, storage: buildStorage(RETURNING) });
    expect(decision).toEqual({ isOnSurface: true, shouldShow: true });
  });

  it("авторизований без жодного ключа — теж свій", () => {
    const decision = decideWhatsNew({ pathname: "/char/home", isAuthenticated: true, storage: buildStorage() });
    expect(decision.shouldShow).toBe(true);
  });

  it("новачок — не показуємо", () => {
    const decision = decideWhatsNew({ pathname: "/", isAuthenticated: false, storage: buildStorage() });
    expect(decision).toEqual({ isOnSurface: true, shouldShow: false });
  });

  it("уже бачив — не показуємо", () => {
    const storage = buildStorage(RETURNING);
    markFlagSeen(storage, CURRENT_RELEASE_FLAG);
    expect(decideWhatsNew({ pathname: "/", isAuthenticated: true, storage }).shouldShow).toBe(false);
  });

  it("не та сторінка — рішення не прийняте, на іншій спробуємо знову", () => {
    const decision = decideWhatsNew({ pathname: "/spells/1246", isAuthenticated: true, storage: buildStorage(RETURNING) });
    expect(decision).toEqual({ isOnSurface: false, shouldShow: false });
  });

  it("сховища немає — анонім лишається новачком, авторизований бачить", () => {
    expect(decideWhatsNew({ pathname: "/", isAuthenticated: false, storage: null }).shouldShow).toBe(false);
    expect(decideWhatsNew({ pathname: "/", isAuthenticated: true, storage: null }).shouldShow).toBe(true);
  });
});
