import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
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
import { getLevelUpInfo, levelUpCharacter } from "@/lib/actions/levelup";

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

it.each([2, 10, 17])("метамагія на %i рівні зберігає рівно дві нові різні опції", async level => {
  const user = await prisma.user.create({ data: { email: `metamagic-${level}@holota.family`, name: "Metamagic" } });
  vi.mocked(auth).mockResolvedValue({ user: { email: user.email } } as never);
  const sorcerer = content.classes.find(cls => cls.name === "SORCERER_2024")!;
  const dwarf = content.races.find(race => race.name === "DWARF_2024")!;
  const soldier = content.backgrounds.find(background => background.name === "SOLDIER_2024")!;
  const created = await createCharacter(minimalForm({
    classId: sorcerer.classId, raceId: dwarf.raceId, backgroundId: soldier.backgroundId,
    ruleset: "RULES_2024", backgroundAsiChoice: { mode: "+2/+1", plusTwo: "STR", plusOne: "CON" },
    languagesSchema: { languages: ["DWARVISH", "ELVISH"] },
  }));
  expect(created).not.toHaveProperty("error");
  const persId = created.persId!;
  const options = sorcerer.classChoiceOptions.filter(link => link.choiceOption.groupName === "Метамагія");
  expect(options).toHaveLength(10);
  const knownCount = level === 2 ? 0 : level === 10 ? 2 : 4;
  const known = options.slice(0, knownCount).map(link => ({ choiceOptionId: link.choiceOptionId }));
  await prisma.pers.update({ where: { persId }, data: {
    level: level - 1, subclassId: level > 2 ? sorcerer.subclasses[0].subclassId : null,
    choiceOptions: { connect: known },
  } });
  expect(await getLevelUpInfo(persId)).not.toHaveProperty("error");
  const picks = options.slice(knownCount, knownCount + 2).map(link => link.choiceOptionId);
  const rejected = await levelUpCharacter(persId, minimalLevelUpForm({
    classId: sorcerer.classId, classChoiceSelections: { "Метамагія": picks.slice(0, 1) },
  }));
  expect(rejected).toHaveProperty("error", "Оберіть 2 опц.");
  const accepted = await levelUpCharacter(persId, minimalLevelUpForm({
    classId: sorcerer.classId, classChoiceSelections: { "Метамагія": picks },
  }));
  expect(accepted).not.toHaveProperty("error");
  const saved = await prisma.pers.findUniqueOrThrow({ where: { persId }, include: { choiceOptions: true } });
  expect(saved.level).toBe(level);
  expect(saved.choiceOptions.map(option => option.choiceOptionId).sort((a, b) => a - b))
    .toEqual([...known.map(option => option.choiceOptionId), ...picks].sort((a, b) => a - b));
}, 30_000);
