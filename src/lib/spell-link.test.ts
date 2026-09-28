import { describe, expect, it } from "vitest";
import { isCatalogOwningSpellParam } from "./spell-link";

describe("isCatalogOwningSpellParam", () => {
  it.each(["/spells", "/2024/spells", "/no-ai/spells", "/homebrew", "/2024/homebrew"])("leaves %s to the catalog modal", (pathname) => {
    expect(isCatalogOwningSpellParam(pathname)).toBe(true);
  });
  it.each(["/char/12", "/homebrew/41", "/spells/fireball", "/bestiary"])("opens the global modal on %s", (pathname) => {
    expect(isCatalogOwningSpellParam(pathname)).toBe(false);
  });
});
