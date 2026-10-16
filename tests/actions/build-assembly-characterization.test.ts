import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { createCharacter } from "@/lib/actions/character";
import { disconnectDatabase, resetUserData } from "../user-data";
import { countSnapshots, readSheetState, runManualLevelUpPath } from "../helpers/assembly-manual-path";
import { barbarianScenario, sorcadinScenario, wizardScenario, type AssemblyScenario } from "../helpers/assembly-scenarios";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), unstable_cache: <T>(fn: T) => fn }));
import { auth } from "@/lib/auth";

vi.setConfig({ testTimeout: 120_000 });

beforeEach(async () => {
  await resetUserData();
  const owner = await prisma.user.create({ data: { email: "assembly-characterization@actions.test" } });
  vi.mocked(auth).mockResolvedValue({ user: { email: owner.email } } as never);
});
afterAll(disconnectDatabase);

async function createAndLevelUpManually(scenario: AssemblyScenario) {
  const created = await createCharacter(await scenario.buildStart());
  if ("error" in created) throw new Error(`${created.error} ${JSON.stringify(created.details)}`);
  await runManualLevelUpPath(created.persId, scenario.manualSteps);
  return created.persId;
}

function toSpellRows(state: Awaited<ReturnType<typeof readSheetState>>) {
  return state.spells.map((row) => [row.spell, row.origin, row.sourceName, row.learnedAtLevel, row.isPrepared]);
}

describe("ручний шлях create + levelUp, яким має відтворюватися виконуваний білд", () => {
  it("Варвар Шляху берсерка 1 → 5: підклас на 3-му, ASI на 4-му, лише рівні класу без мультикласу", async () => {
    const persId = await createAndLevelUpManually(barbarianScenario);
    const state = await readSheetState(persId);

    expect(state).toMatchObject({
      level: 5, scores: { str: 18, dex: 14, con: 16, int: 8, wis: 10, cha: 10 }, hp: { current: 55, max: 55 },
      class: "BARBARIAN_2014", subclass: "PATH_OF_THE_BERSERKER", multiclasses: [], feats: [], spellSlots: { pact: 0 },
      features: ["Ability Score Improvement", "Barbarian Extra Attack", "Danger Sense", "Darkvision", "Fast Movement", "Frenzy", "Menacing", "Primal Path", "Rage", "Reckless Attack", "Relentless Endurance", "Savage Attacks", "Unarmored Defense", "Unarmored Defense (Barbarian)"],
    });
    expect(state.spells).toEqual([]);
    expect(await countSnapshots(persId)).toBe(4);
  });

  it("Чарівник школи втілення 1 → 5: школа на 2-му, книга по два заклинання щорівня, замовляння та ASI на 4-му", async () => {
    const persId = await createAndLevelUpManually(wizardScenario);
    const state = await readSheetState(persId);

    expect(state).toMatchObject({
      level: 5, scores: { str: 8, dex: 16, con: 14, int: 18, wis: 12, cha: 8 }, hp: { current: 32, max: 32 },
      class: "WIZARD_2014", subclass: "SCHOOL_OF_EVOCATION", spellSlots: { current: [4, 3, 2, 0, 0, 0, 0, 0, 0], pact: 0 },
      features: ["Arcane Recovery", "Arcane Tradition", "Darkvision", "Elf Weapon Training", "Evocation Savant", "Extra Language", "Fey Ancestry", "High Elf Cantrip", "Keen Senses", "Sculpt Spells", "Spellcasting (Wizard)", "Trance"],
    });
    expect(toSpellRows(state)).toEqual([
      ["Acid Splash", "CLASS", "WIZARD_2014", 1, true], ["Burning Hands", "CLASS", "WIZARD_2014", 1, true], ["Chill Touch", "CLASS", "WIZARD_2014", 1, true],
      ["Comprehend Languages", "CLASS", "WIZARD_2014", 1, false], ["Detect Magic", "CLASS", "WIZARD_2014", 1, true], ["Find Familiar", "CLASS", "WIZARD_2014", 1, false],
      ["Fire Bolt", "CLASS", "WIZARD_2014", 4, true], ["Fireball", "CLASS", "WIZARD_2014", 5, false], ["Flaming Sphere", "CLASS", "WIZARD_2014", 4, false],
      ["Fly", "CLASS", "WIZARD_2014", 5, false], ["Identify", "CLASS", "WIZARD_2014", 2, false], ["Mage Armor", "CLASS", "WIZARD_2014", 1, true],
      ["Magic Missile", "CLASS", "WIZARD_2014", 1, true], ["Misty Step", "CLASS", "WIZARD_2014", 4, false], ["Prestidigitation", "RACE", "ELF_HIGH_2014", 1, true],
      ["Ray of Frost", "CLASS", "WIZARD_2014", 1, true], ["Scorching Ray", "CLASS", "WIZARD_2014", 3, false], ["Shatter", "CLASS", "WIZARD_2014", 3, false],
      ["Shield", "CLASS", "WIZARD_2014", 2, false],
    ]);
    expect(await countSnapshots(persId)).toBe(4);
  });

  it("Паладин 3 / Чародій 4 (соркадін): порядок класів, Бойовий стиль, Метамагія, риса на 4-му рівні Чародія", async () => {
    const persId = await createAndLevelUpManually(sorcadinScenario);
    const state = await readSheetState(persId);

    expect(state).toMatchObject({
      level: 7, scores: { str: 16, dex: 8, con: 15, int: 8, wis: 8, cha: 16 }, hp: { current: 52, max: 52 },
      class: "PALADIN_2014", subclass: "OATH_OF_REDEMPTION", race: "HUMAN_2014", raceVariants: ["HUMAN_VARIANT"],
      multiclasses: [{ class: "SORCERER_2014", subclass: "CLOCKWORK_SOUL", classLevel: 4 }],
      choiceOptions: ["Dueling", "Heightened Spell", "Quickened Spell"],
      feats: [{ name: "POLEARM_MASTER", choices: [] }, { name: "WAR_CASTER", choices: [] }],
      spellSlots: { current: [4, 3, 2, 0, 0, 0, 0, 0, 0] }, additionalSaveProficiencies: ["CHA", "WIS"],
    });
    expect(state.features).toEqual(expect.arrayContaining(["Divine Smite", "Sacred Oath", "Restore Balance", "Font of Magic", "Metamagic", "Heightened Spell", "Quickened Spell", "Clockwork Spells"]));
    expect(toSpellRows(state)).toEqual([
      ["Absorb Elements", "CLASS", "SORCERER_2014", 7, true], ["Aid", "CLASS", "CLOCKWORK_SOUL", 6, true], ["Alarm", "CLASS", "CLOCKWORK_SOUL", 4, true],
      ["Booming Blade", "CLASS", "SORCERER_2014", 4, true], ["Lesser Restoration", "CLASS", "CLOCKWORK_SOUL", 6, true], ["Mage Hand", "CLASS", "SORCERER_2014", 4, true],
      ["Magic Missile", "CLASS", "SORCERER_2014", 4, true], ["Mind Sliver", "CLASS", "SORCERER_2014", 4, true], ["Misty Step", "CLASS", "SORCERER_2014", 6, true],
      ["Prestidigitation", "CLASS", "SORCERER_2014", 4, true], ["Protection From Evil and Good", "CLASS", "CLOCKWORK_SOUL", 4, true], ["Sanctuary", "CLASS", "OATH_OF_REDEMPTION", 3, true],
      ["Shield", "CLASS", "SORCERER_2014", 5, true], ["Silvery Barbs", "CLASS", "SORCERER_2014", 4, true], ["Sleep", "CLASS", "OATH_OF_REDEMPTION", 3, true],
      ["Sword Burst", "CLASS", "SORCERER_2014", 7, true],
    ]);
    expect(await countSnapshots(persId)).toBe(6);
  });

  it("BUG-036: підкласові заклинання нового класу, взятого мультикласом, приходять при вході й не зсуваються наступним підвищенням", async () => {
    const created = await createCharacter(await sorcadinScenario.buildStart());
    if ("error" in created) throw new Error(created.error);
    await runManualLevelUpPath(created.persId, sorcadinScenario.manualSteps.slice(0, 3));
    const atEntry = await readSheetState(created.persId);
    const clockworkSpells = (state: typeof atEntry) => state.spells.filter((row) => row.sourceName === "CLOCKWORK_SOUL").map((row) => [row.spell, row.learnedAtLevel]);
    expect(atEntry.multiclasses).toEqual([{ class: "SORCERER_2014", subclass: "CLOCKWORK_SOUL", classLevel: 1 }]);
    expect(clockworkSpells(atEntry)).toEqual([["Alarm", 4], ["Protection From Evil and Good", 4]]);

    await runManualLevelUpPath(created.persId, sorcadinScenario.manualSteps.slice(3, 4));
    expect(clockworkSpells(await readSheetState(created.persId))).toEqual([["Alarm", 4], ["Protection From Evil and Good", 4]]);
  });

  it("повертає помилку рівня і не змінює персонажа, коли ручне підвищення неповне", async () => {
    const created = await createCharacter(await wizardScenario.buildStart());
    if ("error" in created) throw new Error(created.error);
    const before = await readSheetState(created.persId);

    await expect(runManualLevelUpPath(created.persId, [{ className: wizardScenario.manualSteps[0].className, spellbookNames: ["Identify"] }])).rejects.toThrow("Оберіть заклинань до книги: 2");

    expect(await readSheetState(created.persId)).toEqual(before);
    expect(await countSnapshots(created.persId)).toBe(0);
  });
});
