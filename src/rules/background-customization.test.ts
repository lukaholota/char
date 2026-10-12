import { describe, expect, it } from "vitest";
import { countBackgroundLanguageChoices, findBackgroundCustomizationProblem, isCustomBackground, type BackgroundCustomizationBase } from "./background-customization";

const KNOWN = { skills: ["ARCANA", "HISTORY", "STEALTH", "PERCEPTION"], tools: ["THIEVES_TOOLS", "HERBALISM_KIT", "FORGERY_KIT"] };
const SAGE: BackgroundCustomizationBase = { name: "SAGE", fixedTools: [], languageChoiceCount: 2 };
const FOLK_HERO: BackgroundCustomizationBase = { name: "FOLK_HERO", fixedTools: ["ARTISAN_TOOLS", "VEHICLES_LAND"], languageChoiceCount: 0 };
const CUSTOM: BackgroundCustomizationBase = { name: "CUSTOM", fixedTools: [], languageChoiceCount: 0 };

describe("background customization rule", () => {
  it("recognises the custom background by name", () => {
    expect(isCustomBackground("CUSTOM")).toBe(true);
    expect(isCustomBackground("SAGE")).toBe(false);
  });

  it("lets tools replace languages one for one", () => {
    expect(countBackgroundLanguageChoices(SAGE, undefined)).toBe(2);
    expect(countBackgroundLanguageChoices(SAGE, { skills: ["STEALTH", "PERCEPTION"], tools: ["THIEVES_TOOLS"] })).toBe(1);
    expect(countBackgroundLanguageChoices(SAGE, { skills: ["STEALTH", "PERCEPTION"], tools: ["THIEVES_TOOLS", "HERBALISM_KIT"] })).toBe(0);
  });

  it("splits two proficiencies between tools and languages for a custom background", () => {
    expect(countBackgroundLanguageChoices(CUSTOM, { skills: ["STEALTH", "PERCEPTION"], tools: [] })).toBe(2);
    expect(countBackgroundLanguageChoices(CUSTOM, { skills: ["STEALTH", "PERCEPTION"], tools: ["THIEVES_TOOLS"] })).toBe(1);
  });

  it("accepts any two distinct known skills", () => {
    expect(findBackgroundCustomizationProblem(FOLK_HERO, { skills: ["ARCANA", "HISTORY"], tools: [] }, KNOWN)).toBeNull();
  });

  it.each([
    ["one skill", SAGE, { skills: ["ARCANA"], tools: [] }],
    ["three skills", SAGE, { skills: ["ARCANA", "HISTORY", "STEALTH"], tools: [] }],
    ["a repeated skill", SAGE, { skills: ["ARCANA", "ARCANA"], tools: [] }],
    ["an unknown skill", SAGE, { skills: ["ARCANA", "FLYING"], tools: [] }],
    ["a tool with no language to trade", FOLK_HERO, { skills: ["ARCANA", "HISTORY"], tools: ["THIEVES_TOOLS"] }],
    ["more tools than languages", SAGE, { skills: ["ARCANA", "HISTORY"], tools: ["THIEVES_TOOLS", "HERBALISM_KIT", "FORGERY_KIT"] }],
    ["a repeated tool", SAGE, { skills: ["ARCANA", "HISTORY"], tools: ["THIEVES_TOOLS", "THIEVES_TOOLS"] }],
    ["an unknown tool", SAGE, { skills: ["ARCANA", "HISTORY"], tools: ["SPOON"] }],
    ["a tool the background already gives", { ...SAGE, fixedTools: ["HERBALISM_KIT"] }, { skills: ["ARCANA", "HISTORY"], tools: ["HERBALISM_KIT"] }],
  ])("rejects %s", (_label, base, customization) => {
    expect(findBackgroundCustomizationProblem(base, customization, KNOWN)).toEqual(expect.any(String));
  });
});
