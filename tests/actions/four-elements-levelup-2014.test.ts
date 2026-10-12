import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { BackgroundCategory, Classes, Races, Subclasses } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createCharacter } from "@/lib/actions/character";
import { levelUpCharacter } from "@/lib/actions/levelup";
import { minimalForm } from "../helpers/build-form";
import { minimalLevelUpForm } from "../helpers/levelup-form";
import { backgroundByName, classByName, raceByName } from "../helpers/seed-lookup";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { auth } from "@/lib/auth";

vi.setConfig({ testTimeout: 120_000 });

beforeEach(resetUserData);
afterAll(disconnectDatabase);

const DISCIPLINES_GROUP = "Дисципліни чотирьох елементів";

async function createMonkAtLevelTwo() {
  const user = await prisma.user.create({ data: { email: `monk-${Math.random()}@holota.family`, name: "Monk" } });
  vi.mocked(auth).mockResolvedValue({ user: { email: user.email } } as never);
  const [race, characterClass, background] = await Promise.all([raceByName(Races.HUMAN_2014), classByName(Classes.MONK_2014), backgroundByName(BackgroundCategory.HERMIT)]);
  const created = await createCharacter(minimalForm({ raceId: race.raceId, classId: characterClass.classId, backgroundId: background.backgroundId }));
  if ("error" in created || !created.persId) throw new Error("error" in created ? created.error : "Character not created");
  await prisma.pers.update({ where: { persId: created.persId }, data: { level: 2 } });
  const subclass = await prisma.subclass.findFirstOrThrow({ where: { name: Subclasses.WAY_OF_THE_FOUR_ELEMENTS }, select: { subclassId: true } });
  const disciplines = await prisma.subclassChoiceOption.findMany({
    where: { subclassId: subclass.subclassId, levelsGranted: { has: 3 }, choiceOption: { groupName: DISCIPLINES_GROUP } },
    select: { choiceOptionId: true },
    orderBy: { choiceOptionId: "asc" },
  });
  return { persId: created.persId, classId: characterClass.classId, subclassId: subclass.subclassId, disciplineIds: disciplines.map((entry) => entry.choiceOptionId) };
}

function buildFourElementsLevelThree(monk: Awaited<ReturnType<typeof createMonkAtLevelTwo>>, disciplineIds: number[]) {
  return minimalLevelUpForm({
    classId: monk.classId,
    subclassId: monk.subclassId,
    subclassChoiceSelections: { [DISCIPLINES_GROUP]: disciplineIds },
  });
}

describe("Шлях чотирьох стихій 2014: на 3-му рівні Співзвуччя зі стихіями дається саме, обирається одна дисципліна", () => {
  it("3-й рівень з однією дисципліною проходить, дає Співзвуччя зі стихіями й обрану дисципліну", async () => {
    const monk = await createMonkAtLevelTwo();
    expect(monk.disciplineIds.length).toBeGreaterThan(1);

    const result = await levelUpCharacter(monk.persId, buildFourElementsLevelThree(monk, [monk.disciplineIds[0]]));
    expect(result).not.toHaveProperty("error");

    const pers = await prisma.pers.findUniqueOrThrow({
      where: { persId: monk.persId },
      select: { level: true, choiceOptions: { select: { choiceOptionId: true } }, features: { select: { feature: { select: { engName: true } } } } },
    });
    expect(pers.level).toBe(3);
    expect(pers.choiceOptions.map((option) => option.choiceOptionId)).toEqual([monk.disciplineIds[0]]);
    expect(pers.features.map((entry) => entry.feature.engName)).toEqual(expect.arrayContaining(["Disciple of the Elements", "Elemental Attunement"]));
  });

  it("3-й рівень з двома дисциплінами або без жодної відхилено, рівень не змінюється", async () => {
    const monk = await createMonkAtLevelTwo();

    expect(await levelUpCharacter(monk.persId, buildFourElementsLevelThree(monk, monk.disciplineIds.slice(0, 2)))).toEqual({ error: "Оберіть 1 опц." });
    expect(await levelUpCharacter(monk.persId, buildFourElementsLevelThree(monk, []))).toHaveProperty("error");
    expect((await prisma.pers.findUniqueOrThrow({ where: { persId: monk.persId }, select: { level: true } })).level).toBe(2);
  });
});
