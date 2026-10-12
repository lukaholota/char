import { describe, expect, it } from "vitest";
import { getAllSpells } from "@/lib/spellsData";
import { classTranslations, spellSchoolTranslations } from "@/lib/refs/translation";
import { findCommonSpellLists2014, findFeatSpellRule2014, findFeatSpellSelectionProblem2014, listFeatSpellFilters2014 } from "./feat-spells-2014";
import { isSpellChoiceCandidate } from "./spell-choice-filter";

const schoolKey = (school: string | null) => Object.entries(spellSchoolTranslations).find(([, name]) => name === school)?.[0] ?? school;
const candidates = getAllSpells("RULES_2014").map((spell) => ({ spellId: spell.spellId, engName: spell.engName, name: spell.name, level: spell.level,
  school: schoolKey(spell.school), isRitual: spell.hasRitual === "так", spellLists: spell.spellClasses.map((entry) => entry.className) }));
const ids = (...engNames: string[]) => engNames.map((engName) => candidates.find((spell) => spell.engName === engName)!.spellId);
const rule = (featName: string) => findFeatSpellRule2014(featName)!;

describe("2014 spells that feats give at creation", () => {
  it("knows exactly the feats whose book text names or lets the player choose spells", () => {
    for (const featName of ["MAGIC_INITIATE", "RITUAL_CASTER", "ARTIFICER_INITIATE", "FEY_TOUCHED", "SHADOW_TOUCHED", "TELEKINETIC", "TELEPATHIC"]) expect(findFeatSpellRule2014(featName)).not.toBeNull();
    for (const featName of ["TOUGH", "ALERT", "SPELL_SNIPER", "STRIXHAVEN_INITIATE_QUANDRIX", null, undefined]) expect(findFeatSpellRule2014(featName)).toBeNull();
  });

  it("accepts Magic Initiate spells from one class list and rejects a mix of lists", () => {
    expect(findFeatSpellSelectionProblem2014(rule("MAGIC_INITIATE"), ids("Guidance", "Light", "Bless"), candidates)).toBeNull();
    expect(findFeatSpellSelectionProblem2014(rule("MAGIC_INITIATE"), ids("Guidance", "Mage Hand", "Bless"), candidates)).toContain("з одного списку");
  });

  it("requires two cantrips and one 1st-level spell, each exactly once", () => {
    const magicInitiate = rule("MAGIC_INITIATE");
    expect(findFeatSpellSelectionProblem2014(magicInitiate, ids("Guidance", "Bless"), candidates)).not.toBeNull();
    expect(findFeatSpellSelectionProblem2014(magicInitiate, ids("Guidance", "Light", "Thaumaturgy"), candidates)).not.toBeNull();
    expect(findFeatSpellSelectionProblem2014(magicInitiate, ids("Guidance", "Guidance", "Bless"), candidates)).not.toBeNull();
    expect(findFeatSpellSelectionProblem2014(magicInitiate, [], candidates)).not.toBeNull();
  });

  it("limits Ritual Caster to 1st-level spells with the ritual tag from one list", () => {
    expect(findFeatSpellSelectionProblem2014(rule("RITUAL_CASTER"), ids("Find Familiar", "Detect Magic"), candidates)).toBeNull();
    expect(findFeatSpellSelectionProblem2014(rule("RITUAL_CASTER"), ids("Find Familiar", "Magic Missile"), candidates)).not.toBeNull();
    expect(findFeatSpellSelectionProblem2014(rule("RITUAL_CASTER"), ids("Find Familiar", "Alarm", "Detect Magic"), candidates)).not.toBeNull();
  });

  it("limits Fey Touched and Shadow Touched to their schools", () => {
    expect(findFeatSpellSelectionProblem2014(rule("FEY_TOUCHED"), ids("Charm Person"), candidates)).toBeNull();
    expect(findFeatSpellSelectionProblem2014(rule("FEY_TOUCHED"), ids("False Life"), candidates)).not.toBeNull();
    expect(findFeatSpellSelectionProblem2014(rule("SHADOW_TOUCHED"), ids("False Life"), candidates)).toBeNull();
    expect(findFeatSpellSelectionProblem2014(rule("SHADOW_TOUCHED"), ids("Charm Person"), candidates)).not.toBeNull();
  });

  it("names the spell Telekinetic, Telepathic, Fey Touched and Shadow Touched give, and lets the player choose nothing more for the first two", () => {
    expect(rule("TELEKINETIC").namedSpellEngNames).toEqual(["Mage Hand"]);
    expect(rule("TELEPATHIC").namedSpellEngNames).toEqual(["Detect Thoughts"]);
    expect(rule("FEY_TOUCHED").namedSpellEngNames).toEqual(["Misty Step"]);
    expect(rule("SHADOW_TOUCHED").namedSpellEngNames).toEqual(["Invisibility"]);
    expect(findFeatSpellSelectionProblem2014(rule("TELEKINETIC"), [], candidates)).toBeNull();
    expect(findFeatSpellSelectionProblem2014(rule("TELEKINETIC"), ids("Guidance"), candidates)).not.toBeNull();
  });

  it("takes Artificer Initiate spells only from the Artificer list", () => {
    expect(findFeatSpellSelectionProblem2014(rule("ARTIFICER_INITIATE"), ids("Mending", "Cure Wounds"), candidates)).toBeNull();
    expect(findFeatSpellSelectionProblem2014(rule("ARTIFICER_INITIATE"), ids("Mending", "Bless"), candidates)).not.toBeNull();
  });

  it("finds the lists that hold every chosen spell", () => {
    const chosen = candidates.filter((spell) => ids("Guidance", "Light", "Bless").includes(spell.spellId));
    expect(findCommonSpellLists2014(rule("MAGIC_INITIATE"), chosen)).toEqual([classTranslations.CLERIC_2014]);
    expect(findCommonSpellLists2014(rule("FEY_TOUCHED"), chosen)).toEqual([]);
  });

  it("offers candidates for a shared-list feat from all six caster lists", () => {
    const filters = listFeatSpellFilters2014(rule("MAGIC_INITIATE"));
    const offered = candidates.filter((spell) => filters.some((filter) => isSpellChoiceCandidate(filter, spell)));
    expect(offered.map((spell) => spell.engName)).toEqual(expect.arrayContaining(["Guidance", "Mage Hand", "Eldritch Blast", "Bless", "Magic Missile"]));
    expect(offered.every((spell) => spell.level <= 1)).toBe(true);
  });
});
