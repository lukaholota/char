/**
 * KR37.3 — Коло землі 2024 наскрізно: обрана на 3-му земля кладе свої заклинання завжди
 * підготовленими поза лімітом, а вищі рядки таблиці приходять на 5-му без нового вибору.
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { findCreatorContent, type CreatorContent } from "@/server/db/creator-content-query";
import { minimalForm } from "../helpers/build-form";
import { withCreationSpells, withLevelUpSpells } from "../helpers/creation-spells";
import { minimalLevelUpForm } from "../helpers/levelup-form";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), unstable_cache: <T>(fn: T) => fn }));
vi.mock("@/lib/content/creator-content", async importOriginal => ({
  ...await importOriginal<typeof import("@/lib/content/creator-content")>(),
  findCharacterCreatorOptions: vi.fn(),
}));

import { auth } from "@/lib/auth";
import { findCharacterCreatorOptions } from "@/lib/content/creator-content";
import { createCharacter } from "@/lib/actions/character";
import { levelUpCharacter } from "@/lib/actions/levelup";

const LAND_GROUP = "Коло землі";

let content: CreatorContent;

beforeAll(async () => {
  content = await findCreatorContent(prisma, "RULES_2024");
  vi.mocked(findCharacterCreatorOptions).mockReturnValue(content);
});
beforeEach(resetUserData);
afterAll(disconnectDatabase);

function druid() {
  return content.classes.find((candidate) => candidate.name === "DRUID_2024")!;
}

function landOption(optionNameEng: string) {
  const subclass = druid().subclasses.find((candidate) => candidate.name === "CIRCLE_OF_THE_LAND")!;
  const link = subclass.subclassChoiceOptions.find((candidate) => candidate.choiceOption.optionNameEng === optionNameEng)!;
  return { subclass, choiceOptionId: link.choiceOptionId as number };
}

async function createDruid(handle: string) {
  const user = await prisma.user.create({ data: { email: `${handle}@holota.family`, name: handle } });
  vi.mocked(auth).mockResolvedValue({ user: { email: user.email } } as never);

  const characterClass = druid();
  const magician = characterClass.classChoiceOptions.find((link) => link.choiceOption.optionNameEng === "Primal Order: Magician (2024)")!;
  const created = await createCharacter(await withCreationSpells(minimalForm({
    classId: characterClass.classId,
    raceId: content.races.find((candidate) => candidate.name === "DWARF_2024")!.raceId,
    backgroundId: content.backgrounds.find((candidate) => candidate.name === "SOLDIER_2024")!.backgroundId,
    ruleset: "RULES_2024",
    backgroundAsiChoice: { mode: "+2/+1", plusTwo: "STR", plusOne: "CON" },
    languagesSchema: { languages: ["DWARVISH", "ELVISH"] },
    classChoiceSelections: { "Первісний орден": magician.choiceOptionId },
  })));
  if ("error" in created && created.error) throw new Error(created.error);
  return created.persId!;
}

async function levelUp(persId: number, form: Partial<Parameters<typeof minimalLevelUpForm>[0]> = {}) {
  const result = await levelUpCharacter(persId, await withLevelUpSpells(persId, minimalLevelUpForm({ classId: druid().classId, ...form })));
  if ("error" in result && result.error) throw new Error(result.error);
}

async function listSpellsFrom(persId: number, sourceName: string) {
  const rows = await prisma.persSpell.findMany({
    where: { persId, sourceName },
    select: { isPrepared: true, excludeFromPreparedCount: true, learnedAtLevel: true, spell: { select: { engName: true } } },
  });
  return rows.sort((a, b) => a.spell.engName.localeCompare(b.spell.engName));
}

describe("KR37.3 — Коло землі 2024 дає заклинання обраної землі", () => {
  it("Полярна земля на 3-му: Fog Cloud, Hold Person і замовляння Ray of Frost поза лімітом; Завірюха — на 5-му", async () => {
    const persId = await createDruid("land-polar");
    await prisma.pers.update({ where: { persId }, data: { level: 2 } });
    const polar = landOption("Circle of the Land: Polar (2024)");

    await levelUp(persId, { subclassId: polar.subclass.subclassId, subclassChoiceSelections: { [LAND_GROUP]: polar.choiceOptionId } });

    const atThree = await listSpellsFrom(persId, "Circle of the Land: Polar (2024)");
    expect(atThree.map((row) => row.spell.engName)).toEqual(["Fog Cloud", "Hold Person", "Ray of Frost"]);
    expect(atThree.every((row) => row.isPrepared && row.excludeFromPreparedCount && row.learnedAtLevel === 3)).toBe(true);

    await levelUp(persId);
    expect((await listSpellsFrom(persId, "Circle of the Land: Polar (2024)")).map((row) => row.spell.engName)).toEqual(["Fog Cloud", "Hold Person", "Ray of Frost"]);

    await levelUp(persId);
    const atFive = await listSpellsFrom(persId, "Circle of the Land: Polar (2024)");
    expect(atFive.map((row) => row.spell.engName)).toEqual(["Fog Cloud", "Hold Person", "Ray of Frost", "Sleet Storm"]);
    expect(atFive.find((row) => row.spell.engName === "Sleet Storm")?.learnedAtLevel).toBe(5);

    const other = await prisma.persSpell.count({ where: { persId, sourceName: { startsWith: "Circle of the Land:", not: "Circle of the Land: Polar (2024)" } } });
    expect(other).toBe(0);
  }, 60_000);

  it("вибрана земля — єдине джерело: Помірна земля не дає нічого Полярному друїду, а її замовляння приходить своєму", async () => {
    const persId = await createDruid("land-temperate");
    await prisma.pers.update({ where: { persId }, data: { level: 2 } });
    const temperate = landOption("Circle of the Land: Temperate (2024)");

    await levelUp(persId, { subclassId: temperate.subclass.subclassId, subclassChoiceSelections: { [LAND_GROUP]: temperate.choiceOptionId } });

    const rows = await listSpellsFrom(persId, "Circle of the Land: Temperate (2024)");
    expect(rows.map((row) => row.spell.engName)).toEqual(["Misty Step", "Shocking Grasp", "Sleep"]);
    expect(await prisma.persSpell.count({ where: { persId, sourceName: "Circle of the Land: Polar (2024)" } })).toBe(0);
  }, 60_000);
});
