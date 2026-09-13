import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { findCreatorContent, type CreatorContent } from "@/server/db/creator-content-query";
import { disconnectDatabase, resetUserData } from "../user-data";
import { minimalForm } from "../helpers/build-form";
import { minimalLevelUpForm } from "../helpers/levelup-form";

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

let content: CreatorContent;

beforeAll(async () => {
  content = await findCreatorContent(prisma, "RULES_2024");
  vi.mocked(findCharacterCreatorOptions).mockImplementation(ruleset => {
    expect(ruleset).toBe("RULES_2024");
    return content;
  });
});
beforeEach(resetUserData);
afterAll(disconnectDatabase);

function toolChoices(className: string) {
  const characterClass = content.classes.find(entry => entry.name === className);
  if (!characterClass) throw new Error(`Немає класу ${className}`);
  return characterClass.classChoiceOptions.filter(
    link => link.choiceOption.groupName === "Класові інструменти",
  );
}

async function baseForm(className: string, ids: number[]) {
  const characterClass = content.classes.find(entry => entry.name === className)!;
  const dwarf = content.races.find(race => race.name === "DWARF_2024")!;
  const soldier = content.backgrounds.find(background => background.name === "SOLDIER_2024")!;
  return minimalForm({
    classId: characterClass.classId,
    raceId: dwarf.raceId,
    backgroundId: soldier.backgroundId,
    ruleset: "RULES_2024",
    backgroundAsiChoice: { mode: "+2/+1", plusTwo: "STR", plusOne: "CON" },
    languagesSchema: { languages: ["DWARVISH", "ELVISH"] },
    classChoiceSelections: { "Класові інструменти": ids },
  });
}

describe("KR31.2 — класові інструменти під час створення", () => {
  it("Бард мусить обрати три різні інструменти, які зберігаються в профілях", async () => {
    const user = await prisma.user.create({ data: { email: "bard-tools@holota.family", name: "Bard Tools" } });
    vi.mocked(auth).mockResolvedValue({ user: { email: user.email } } as never);
    const options = toolChoices("BARD_2024");

    const rejected = await createCharacter(await baseForm("BARD_2024", [options[0].choiceOptionId]));
    expect(rejected).toHaveProperty("error", "Оберіть 3 опц.");

    const selected = options.slice(0, 3);
    const created = await createCharacter(await baseForm(
      "BARD_2024",
      selected.map(option => option.choiceOptionId),
    ));
    expect(created).not.toHaveProperty("error");

    const character = await prisma.pers.findUniqueOrThrow({
      where: { persId: created.persId! },
      include: { choiceOptions: true },
    });
    expect(character.choiceOptions.map(option => option.choiceOptionId)).toEqual(
      expect.arrayContaining(selected.map(option => option.choiceOptionId)),
    );
    for (const option of selected) {
      expect(character.customProficiencies).toContain(option.choiceOption.optionName);
    }
  });

  it("Артифайсер зберігає два фіксовані інструменти й один обраний", async () => {
    const user = await prisma.user.create({ data: { email: "artificer-tools@holota.family", name: "Artificer Tools" } });
    vi.mocked(auth).mockResolvedValue({ user: { email: user.email } } as never);
    const selected = toolChoices("ARTIFICER_2024")[0];
    const created = await createCharacter(await baseForm("ARTIFICER_2024", [selected.choiceOptionId]));
    expect(created).not.toHaveProperty("error");

    const character = await prisma.pers.findUniqueOrThrow({ where: { persId: created.persId! } });
    expect(character.customProficiencies).toContain("Інструменти злодія");
    expect(character.customProficiencies).toContain("Інструменти лудильника");
    expect(character.customProficiencies).toContain(selected.choiceOption.optionName);
  });

  it("перший рівень Барда в мультикласі приймає та зберігає три інструменти", async () => {
    const user = await prisma.user.create({ data: { email: "multiclass-bard-tools@holota.family", name: "Multiclass Bard" } });
    vi.mocked(auth).mockResolvedValue({ user: { email: user.email } } as never);
    const rogue = content.classes.find(entry => entry.name === "ROGUE_2024")!;
    const created = await createCharacter({
      ...await baseForm("ROGUE_2024", []),
      // Пройдисвіт 2024 бере компетентність уже на створенні — Солдат дає саме ці дві навички.
      expertiseSchema: { expertises: ["ATHLETICS", "INTIMIDATION"] },
      asi: [
        { ability: "STR", value: 10 },
        { ability: "DEX", value: 15 },
        { ability: "CON", value: 13 },
        { ability: "INT", value: 12 },
        { ability: "WIS", value: 10 },
        { ability: "CHA", value: 14 },
      ],
    });
    expect(created).not.toHaveProperty("error");

    const bard = content.classes.find(entry => entry.name === "BARD_2024")!;
    const selected = toolChoices("BARD_2024").slice(0, 3);
    const raised = await levelUpCharacter(created.persId!, minimalLevelUpForm({
      classId: bard.classId,
      levelUpPath: "MULTICLASS",
      classChoiceSelections: {
        "Класові інструменти": selected.map(option => option.choiceOptionId),
      },
    }));
    expect(raised).not.toHaveProperty("error");

    const character = await prisma.pers.findUniqueOrThrow({
      where: { persId: created.persId! },
      include: { multiclasses: true, choiceOptions: true },
    });
    expect(character.multiclasses).toEqual([
      expect.objectContaining({ classId: bard.classId, classLevel: 1 }),
    ]);
    expect(character.choiceOptions.map(option => option.choiceOptionId)).toEqual(
      expect.arrayContaining(selected.map(option => option.choiceOptionId)),
    );
    expect(rogue.classId).not.toBe(bard.classId);
  });
});
