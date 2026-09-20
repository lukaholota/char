import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { BackgroundCategory, Classes, Races } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { minimalForm } from "../helpers/build-form";
import { withCreationSpells } from "../helpers/creation-spells";
import { findRequiredClassChoices2024 } from "../helpers/seed-lookup";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), unstable_cache: <T>(fn: T) => fn }));

import { auth } from "@/lib/auth";
import { createCharacter } from "@/lib/actions/character";

vi.setConfig({ testTimeout: 60_000 });

beforeEach(resetUserData);
afterAll(disconnectDatabase);

describe("мови від рис класів 2024 доходять до персонажа", () => {
  it("пройдисвіт знає Жаргон злодіїв, друїд — Друїдську", async () => {
    expect(await createAndReadLanguages(Classes.ROGUE_2024)).toContain("Злодійський жаргон");
    expect(await createAndReadLanguages(Classes.DRUID_2024)).toContain("Друїдська");
  });
});

async function createAndReadLanguages(className: Classes): Promise<string[]> {
  const user = await prisma.user.create({ data: { email: `${className}-${Math.random()}@holota.family`, name: className } });
  vi.mocked(auth).mockResolvedValue({ user: { email: user.email } } as never);

  const [race, characterClass, background] = await Promise.all([
    prisma.race.findFirstOrThrow({ where: { name: Races.HUMAN_2024 } }),
    prisma.class.findFirstOrThrow({ where: { name: className } }),
    prisma.background.findFirstOrThrow({ where: { name: BackgroundCategory.SAGE_2024 } }),
  ]);
  const form = minimalForm({
    name: `Мови ${className}`,
    raceId: race.raceId,
    classId: characterClass.classId,
    backgroundId: background.backgroundId,
    ruleset: "RULES_2024",
    backgroundAsiChoice: { mode: "+2/+1", plusTwo: "INT", plusOne: "WIS" },
    languagesSchema: { languages: ["DWARVISH", "GIANT"] },
    classChoiceSelections: await findRequiredClassChoices2024(characterClass.classId, 1),
    expertiseSchema: { expertises: className === Classes.ROGUE_2024 ? ["ARCANA", "HISTORY"] : [] },
  });
  const created = await createCharacter(await withCreationSpells(form));
  if (!created.persId) throw new Error(`не створився: ${created.error}`);

  const pers = await prisma.pers.findUniqueOrThrow({ where: { persId: created.persId }, select: { customLanguagesKnown: true } });
  return pers.customLanguagesKnown.split("\n");
}
