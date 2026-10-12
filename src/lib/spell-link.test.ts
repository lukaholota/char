import { describe, expect, it } from "vitest";
import { isCatalogOwningSpellLink, type SpellLink } from "./spell-link";

const catalogSpell: SpellLink = { spellKey: "enhance-ability", ruleset: "RULES_2024" };
const homebrewSpell: SpellLink = { spellKey: "-41", ruleset: "RULES_2024" };

describe("isCatalogOwningSpellLink", () => {
  it.each(["/spells", "/2024/spells", "/no-ai/spells"])("leaves every spell link on %s to the catalog", (pathname) => {
    expect(isCatalogOwningSpellLink(pathname, catalogSpell)).toBe(true);
    expect(isCatalogOwningSpellLink(pathname, homebrewSpell)).toBe(true);
  });

  it.each(["/homebrew", "/2024/homebrew"])("leaves only homebrew spell links on %s to the catalog", (pathname) => {
    expect(isCatalogOwningSpellLink(pathname, homebrewSpell)).toBe(true);
    expect(isCatalogOwningSpellLink(pathname, catalogSpell)).toBe(false);
    expect(isCatalogOwningSpellLink(pathname, { spellKey: "1352", ruleset: "RULES_2014" })).toBe(false);
  });

  it.each(["/char/12", "/homebrew/41", "/spells/fireball", "/bestiary"])("opens the global modal on %s", (pathname) => {
    expect(isCatalogOwningSpellLink(pathname, catalogSpell)).toBe(false);
    expect(isCatalogOwningSpellLink(pathname, homebrewSpell)).toBe(false);
  });
});
