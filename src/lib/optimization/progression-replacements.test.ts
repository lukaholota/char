import { describe, expect, it } from "vitest";
import type { SpecLevel } from "./build-spec-progression";
import { compileSpecWithLevels, readReadySpec } from "./progression-walk-fixture.test-helper";

const HEXBLADE = "warlock-hexblade-2014";
const WIZARD = "wizard-illusion-2014";
const CHAMPION = "fighter-champion-shield-2014";

type Change = Partial<SpecLevel>;

function changeLevel(slug: string, level: number, change: Change): SpecLevel[] {
  return readReadySpec(slug).levels!.map((entry) => (entry.level === level ? { ...entry, ...change } : entry));
}

function listErrors(slug: string, levels: SpecLevel[]): string {
  return compileSpecWithLevels(slug, levels).report.errors.join("\n");
}

const replaceInvocation = (drop: string, add: string): Change => ({ replaceOptions: [{ drop: { optionNameEng: drop }, add: { optionNameEng: add } }] });

describe("levels replace a known spell or an earlier choice", () => {
  it("accepts a known spell replacement and an invocation replacement of a warlock", () => {
    const levels = changeLevel(HEXBLADE, 3, { ...replaceInvocation("Fiendish Vigor", "Improved Pact Weapon"), replaceSpell: { drop: "protection-from-evil-and-good", add: "blur" } });
    expect(listErrors(HEXBLADE, levels)).toBe("");
  });

  it("prints the replacements in the per level summary", () => {
    const levels = changeLevel(HEXBLADE, 9, { replaceSpell: { drop: "wrathful-smite", add: "cone-of-cold" } });
    expect(compileSpecWithLevels(HEXBLADE, levels).report.summary.join("\n")).toContain("заміна: wrathful-smite → cone-of-cold");
  });

  it("lets a dropped spell be learned again later", () => {
    const dropped = changeLevel(HEXBLADE, 3, { replaceSpell: { drop: "protection-from-evil-and-good", add: "blur" } });
    const levels = dropped.map((entry) => (entry.level === 11 ? { level: 11, spells: { cantripKeys: [], knownSpellKeys: ["protection-from-evil-and-good"], spellbookKeys: [] } } : entry));
    expect(listErrors(HEXBLADE, levels)).toBe("");
  });

  it.each([
    ["a spell the character does not know", changeLevel(HEXBLADE, 3, { replaceSpell: { drop: "fireball", add: "blur" } }), "Замінити можна лише заклинання цього класу"],
    ["a new spell outside the class list", changeLevel(HEXBLADE, 3, { replaceSpell: { drop: "hex", add: "magic-missile" } }), "не з вашого списку класу або зависокого рівня"],
    ["a new spell above the level the class casts", changeLevel(HEXBLADE, 3, { replaceSpell: { drop: "hex", add: "wish" } }), "не з вашого списку класу або зависокого рівня"],
    ["a new spell the character already has", changeLevel(HEXBLADE, 3, { replaceSpell: { drop: "hex", add: "wrathful-smite" } }), "Це заклинання вже дає інше джерело"],
    ["a spell that does not exist", changeLevel(HEXBLADE, 3, { replaceSpell: { drop: "hex", add: "blurr" } }), "replaceSpell: немає заклинання blurr"],
  ])("rejects replacing %s", (_name, levels, expected) => {
    expect(listErrors(HEXBLADE, levels)).toContain(expected);
  });

  it("rejects a spell replacement by a class that cannot do it", () => {
    expect(listErrors(WIZARD, changeLevel(WIZARD, 3, { replaceSpell: { drop: "mage-armor", add: "shield" } }))).toContain("не міняє відомі заклинання");
    expect(listErrors(CHAMPION, changeLevel(CHAMPION, 2, { replaceSpell: { drop: "mage-armor", add: "shield" } }))).toContain("не міняє відомі заклинання");
  });

  it.each([
    ["an option the character never took", replaceInvocation("Thirsting Blade", "Improved Pact Weapon"), "персонаж ще не обирав"],
    ["an option for itself", replaceInvocation("Fiendish Vigor", "Fiendish Vigor"), "замінюється на себе"],
    ["an option of another group", replaceInvocation("Fiendish Vigor", "Pact of the Chain"), "не з групи"],
    ["an option that does not exist", replaceInvocation("Fiendish Vigor", "Improved Pact Weapn"), "немає серед виборів класу"],
    ["an option the character already has", replaceInvocation("Fiendish Vigor", "Devil's Sight"), "персонаж уже має"],
    ["an option with a higher level requirement", replaceInvocation("Fiendish Vigor", "Lifedrinker"), "доступне з 12-го рівня класу"],
  ])("rejects replacing %s", (_name, change, expected) => {
    expect(listErrors(HEXBLADE, changeLevel(HEXBLADE, 3, change))).toContain(expected);
  });

  it("rejects an option replacement on a level the class has no replacement for", () => {
    const levels = changeLevel(CHAMPION, 3, replaceInvocation("Dueling", "Archery"));
    expect(listErrors(CHAMPION, levels)).toContain("не дає замінити вибір");
  });
});
