import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { buildSpellSlug } from "@/lib/spell-link";
import { getAllSpells } from "@/lib/spellsData";
import { buildPresetSpellOptions, buildPresetSpellSelection, findPresetSpellPreparation, findPresetSpellProblem, type ReadyPresetSpells } from "./ready-preset-spells";

const candidates = getAllSpells("RULES_2014").map((spell) => ({ spellId: spell.spellId, engName: spell.engName, name: spell.name, level: spell.level,
  school: spell.school, ruleset: "RULES_2014" as const, spellLists: spell.spellClasses.map((entry) => entry.className) }));
const highElf = { race: "ELF_2014", subrace: "ELF_HIGH_2014", chosenRaceOptionNames: [] };
const wizardOptions = buildPresetSpellOptions("WIZARD_2014", highElf, candidates);
const wizardPreset: ReadyPresetSpells = { classCantripKeys: ["acid-splash", "chill-touch", "ray-of-frost"], knownSpellKeys: [],
  spellbookKeys: ["burning-hands", "comprehend-languages", "detect-magic", "find-familiar", "mage-armor", "magic-missile"],
  raceSpellKeys: ["prestidigitation"], preparedSpellKeys: [], sectionId: "section-levels", explanation: "Author level-one list; race assignment chosen by platform." };

describe("ready preset spell selections", () => {
  // The raw rpgbot.net HTML stays out of git, so CI has no source to compare against.
  it.skipIf(!existsSync("data/rpgbot/source"))("matches the exact cantrips and book entries in the author English level-one row", () => {
    const document = JSON.parse(readFileSync("data/rpgbot/uk/rpgbot-wizard-2014.json", "utf8"));
    const source = document.sourceRevisions.find((revision: { revisionId: string }) => revision.revisionId === document.translations.at(-1).sourceRevisionId);
    const html = readFileSync(`data/rpgbot/${source.sourceFile}`, "utf8");
    const levelSection = html.slice(html.indexOf('id="levels"'));
    const rows = [...levelSection.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g)].map((row) => [...row[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/g)].map((cell) => cell[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()));
    const authorList = rows.find((row) => row[0] === "1")![1];
    const [cantrips, book] = authorList.split("Cantrips Known:")[1].split("Spells Known:");
    const parseKeys = (text: string) => text.split("&#8211;").slice(1).map((name) => buildSpellSlug(name.replace(/\(R\)/g, "").trim()));
    const preset = JSON.parse(readFileSync("data/rpgbot/ready-builds/wizard-evocation-2014.json", "utf8"));
    expect([...preset.spells.classCantripKeys, ...preset.spells.raceSpellKeys].sort()).toEqual(parseKeys(cantrips).sort());
    expect(preset.spells.spellbookKeys.sort()).toEqual(parseKeys(book).sort());
    expect(preset.spells.preparedSpellKeys.every((key: string) => preset.spells.spellbookKeys.includes(key))).toBe(true);
  });
  it("resolves the authored high-elf wizard list into three class cantrips, one racial cantrip and six book spells", () => {
    const selection = buildPresetSpellSelection(wizardPreset, wizardOptions);
    expect(selection.classSpells?.cantripIds).toHaveLength(3);
    expect(selection.classSpells?.spellbookIds).toHaveLength(6);
    expect(selection.classSpells?.preparedIds).toEqual([]);
    expect(selection.raceSpellIds).toHaveLength(1);
    expect(selection.raceSpellIds).toEqual([candidates.find((spell) => spell.engName === "Prestidigitation")!.spellId]);
    expect(findPresetSpellProblem(selection, wizardOptions)).toBeNull();
  });
  it("rejects missing, duplicate, wrong-level and wrong-list spell keys", () => {
    expect(() => buildPresetSpellSelection({ ...wizardPreset, classCantripKeys: ["missing", "chill-touch", "ray-of-frost"] }, wizardOptions)).toThrow("Missing preset spell");
    expect(() => buildPresetSpellSelection({ ...wizardPreset, classCantripKeys: ["chill-touch", "chill-touch", "ray-of-frost"] }, wizardOptions)).toThrow("Incomplete preset spells");
    expect(() => buildPresetSpellSelection({ ...wizardPreset, spellbookKeys: ["fireball", ...wizardPreset.spellbookKeys.slice(1)] }, wizardOptions)).toThrow("Missing preset spell");
    expect(() => buildPresetSpellSelection({ ...wizardPreset, classCantripKeys: ["guidance", "chill-touch", "ray-of-frost"] }, wizardOptions)).toThrow("Missing preset spell");
  });
  it("requires every class and racial pick instead of accepting a partial preset", () => {
    expect(() => buildPresetSpellSelection(undefined, wizardOptions)).toThrow("Incomplete preset spells");
    expect(() => buildPresetSpellSelection({ ...wizardPreset, raceSpellKeys: [] }, wizardOptions)).toThrow("Incomplete preset spells");
    expect(() => buildPresetSpellSelection({ ...wizardPreset, raceSpellKeys: ["chill-touch"] }, wizardOptions)).toThrow("Incomplete preset spells");
  });
  it("rejects injected IDs, duplicates and swaps in a restored draft", () => {
    const selection = buildPresetSpellSelection(wizardPreset, wizardOptions);
    const original = selection.classSpells!;
    expect(findPresetSpellProblem({ ...selection, classSpells: { ...original, cantripIds: [999999, ...original.cantripIds.slice(1)] } }, wizardOptions)).not.toBeNull();
    expect(findPresetSpellProblem({ ...selection, raceSpellIds: [original.cantripIds[0]] }, wizardOptions)).not.toBeNull();
    expect(findPresetSpellProblem({ ...selection, classSpells: { ...original, cantripSwap: { dropId: null, addId: original.cantripIds[0] } } }, wizardOptions)).not.toBeNull();
  });
  it("keeps noncasters empty and prevents the 2024 spell edition entering 2014 selections", () => {
    const options = buildPresetSpellOptions("MONK_2014", { race: "HUMAN_2014", subrace: null, chosenRaceOptionNames: [] }, candidates);
    expect(buildPresetSpellSelection(undefined, options)).toEqual({});
    expect(findPresetSpellProblem({ raceSpellIds: [candidates[0].spellId] }, options)).not.toBeNull();
    const otherEdition = buildPresetSpellOptions("WIZARD_2014", highElf, candidates.map((spell) => ({ ...spell, ruleset: "RULES_2024" })));
    expect(otherEdition.candidates).toEqual([]);
    expect(() => buildPresetSpellSelection(wizardPreset, otherEdition)).toThrow("Missing preset spell");
  });
  it("uses bard known-spell and druid cantrip quotas from the existing 2014 rules", () => {
    const human = { race: "HUMAN_2014", subrace: null, chosenRaceOptionNames: [] };
    const bard = buildPresetSpellOptions("BARD_2014", human, candidates);
    const selection = buildPresetSpellSelection({ classCantripKeys: ["prestidigitation", "vicious-mockery"], knownSpellKeys: ["detect-magic", "healing-word", "heroism", "sleep"], spellbookKeys: [], raceSpellKeys: [], preparedSpellKeys: [], sectionId: "section-levels", explanation: "Author list" }, bard);
    expect(selection.classSpells?.preparedIds).toHaveLength(4);
    const druid = buildPresetSpellOptions("DRUID_2014", human, candidates);
    expect(buildPresetSpellSelection({ classCantripKeys: ["guidance", "produce-flame"], knownSpellKeys: [], spellbookKeys: [], raceSpellKeys: [], preparedSpellKeys: [], sectionId: "section-levels", explanation: "Author list" }, druid).classSpells?.cantripIds).toHaveLength(2);
  });
  describe("every class kind", () => {
    const human = { race: "HUMAN_2014", subrace: null, chosenRaceOptionNames: [] };
    const author = { sectionId: "section-levels", explanation: "Author list", knownSpellKeys: [], spellbookKeys: [], raceSpellKeys: [], preparedSpellKeys: [] };
    const slug = (name: string) => candidates.find((spell) => spell.engName === name)!.spellId;

    it("classifies how each class chooses spells at level one", () => {
      const kinds = Object.fromEntries(["WIZARD_2014", "BARD_2014", "SORCERER_2014", "WARLOCK_2014", "CLERIC_2014", "DRUID_2014", "ARTIFICER_2014", "PALADIN_2014", "RANGER_2014", "FIGHTER_2014"].map((name) => [name, findPresetSpellPreparation(name, null)]));
      expect(kinds).toEqual({ WIZARD_2014: "spellbook", BARD_2014: "known", SORCERER_2014: "known", WARLOCK_2014: "known", CLERIC_2014: "list", DRUID_2014: "list", ARTIFICER_2014: "list", PALADIN_2014: "none", RANGER_2014: "none", FIGHTER_2014: "none" });
    });
    it("takes the Cleric's three cantrips and rejects a missing or foreign one", () => {
      const cleric = buildPresetSpellOptions("CLERIC_2014", { race: "DWARF_2014", subrace: "DWARF_HILL_2014", chosenRaceOptionNames: [] }, candidates, "LIFE_DOMAIN");
      expect(buildPresetSpellSelection({ ...author, classCantripKeys: ["guidance", "sacred-flame", "thaumaturgy"] }, cleric).classSpells?.cantripIds).toHaveLength(3);
      expect(() => buildPresetSpellSelection({ ...author, classCantripKeys: ["guidance", "sacred-flame"] }, cleric)).toThrow("Incomplete preset spells");
      expect(() => buildPresetSpellSelection({ ...author, classCantripKeys: ["guidance", "sacred-flame", "fire-bolt"] }, cleric)).toThrow("Missing preset spell");
      expect(cleric.preparation).toBe("list");
    });
    it("offers the Fiend patron list to a Warlock only when the subclass is known", () => {
      const preset = { ...author, classCantripKeys: ["eldritch-blast", "mage-hand"], knownSpellKeys: ["burning-hands", "hellish-rebuke"] };
      const fiend = buildPresetSpellOptions("WARLOCK_2014", human, candidates, "FIEND");
      expect(buildPresetSpellSelection(preset, fiend).classSpells?.preparedIds).toEqual([slug("Burning Hands"), slug("Hellish Rebuke")]);
      const noPatron = buildPresetSpellOptions("WARLOCK_2014", human, candidates);
      expect(() => buildPresetSpellSelection(preset, noPatron)).toThrow("Missing preset spell: burning-hands");
    });
    it("limits a Sorcerer to four cantrips and two known spells", () => {
      const sorcerer = buildPresetSpellOptions("SORCERER_2014", human, candidates, "DRACONIC_BLOODLINE");
      const preset = { ...author, classCantripKeys: ["chill-touch", "mage-hand", "prestidigitation", "ray-of-frost"], knownSpellKeys: ["shield", "sleep"] };
      expect(buildPresetSpellSelection(preset, sorcerer).classSpells).toMatchObject({ cantripIds: expect.any(Array), preparedIds: [slug("Shield"), slug("Sleep")] });
      expect(() => buildPresetSpellSelection({ ...preset, knownSpellKeys: ["shield", "sleep", "burning-hands"] }, sorcerer)).toThrow("Incomplete preset spells");
      expect(() => buildPresetSpellSelection({ ...preset, classCantripKeys: preset.classCantripKeys.slice(1) }, sorcerer)).toThrow("Incomplete preset spells");
    });
    it("keeps classes that learn spells later empty and refuses spells for them", () => {
      for (const name of ["PALADIN_2014", "RANGER_2014", "FIGHTER_2014"]) {
        const options = buildPresetSpellOptions(name, human, candidates, null);
        expect(buildPresetSpellSelection(undefined, options)).toEqual({});
        expect(findPresetSpellProblem({ classSpells: { cantripIds: [slug("Light")], preparedIds: [], spellbookIds: [] } }, options)).toBe("Клас не дає обрати стартові заклинання");
      }
    });
    it.each([
      ["NATURE_DOMAIN", "CLERIC_2014", ["druidcraft"], ["fire-bolt"], "Послідовник природи"],
      ["DEATH_DOMAIN", "CLERIC_2014", ["chill-touch"], ["druidcraft"], "Жнець"],
      ["ARCANA_DOMAIN", "CLERIC_2014", ["fire-bolt", "mage-hand"], ["fire-bolt", "druidcraft"], "Арканний адепт"],
      ["DIVINE_SOUL", "SORCERER_2014", ["bless"], ["shield"], "Божественна магія"],
    ])("resolves the %s first-level spell choice and rejects spells outside it", (subclass, className, valid, invalid, label) => {
      const options = buildPresetSpellOptions(className, human, candidates, subclass);
      expect(options.classOptionChoice?.label).toBe(label);
      const base = className === "CLERIC_2014" ? { ...author, classCantripKeys: ["guidance", "sacred-flame", "thaumaturgy"] } : { ...author, classCantripKeys: ["chill-touch", "mage-hand", "prestidigitation", "ray-of-frost"], knownSpellKeys: ["shield", "sleep"] };
      const chosen = buildPresetSpellSelection({ ...base, classOptionSpellKeys: valid }, options);
      expect(chosen.classOptionSpellIds).toEqual(valid.map((key) => candidates.find((spell) => spell.engName.toLowerCase().replace(/ /g, "-") === key)!.spellId));
      expect(findPresetSpellProblem(chosen, options)).toBeNull();
      expect(() => buildPresetSpellSelection({ ...base, classOptionSpellKeys: invalid }, options)).toThrow(/Missing preset spell|Incomplete preset spells/);
      expect(() => buildPresetSpellSelection(base, options)).toThrow("Incomplete preset spells");
    });
    it("does not accept a spell choice for a subclass that grants none, nor the same spell twice", () => {
      const life = buildPresetSpellOptions("CLERIC_2014", human, candidates, "LIFE_DOMAIN");
      const selection = buildPresetSpellSelection({ ...author, classCantripKeys: ["guidance", "sacred-flame", "thaumaturgy"] }, life);
      expect(findPresetSpellProblem({ ...selection, classOptionSpellIds: [slug("Druidcraft")] }, life)).toBe("Підклас не дає обрати стартові заклинання");
      const nature = buildPresetSpellOptions("CLERIC_2014", human, candidates, "NATURE_DOMAIN");
      expect(findPresetSpellProblem({ ...selection, classOptionSpellIds: [selection.classSpells!.cantripIds[0]] }, nature)).not.toBeNull();
    });
  });
});
