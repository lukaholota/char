import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Classes, Races, BackgroundCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { minimalForm } from "../helpers/build-form";
import { findRequiredClassChoices2024 } from "../helpers/seed-lookup";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), unstable_cache: <T>(fn: T) => fn }));

import { auth } from "@/lib/auth";
import { createCharacter } from "@/lib/actions/character";

vi.setConfig({ testTimeout: 60_000 });

beforeEach(resetUserData);
afterAll(disconnectDatabase);

async function signIn(handle: string): Promise<void> {
  const user = await prisma.user.create({ data: { email: `${handle}@holota.family`, name: handle } });
  vi.mocked(auth).mockResolvedValue({ user: { email: user.email } } as never);
}

async function createWith(ruleset: "RULES_2014" | "RULES_2024" | undefined, className: Classes, raceName: Races, background: BackgroundCategory) {
  const [race, characterClass, backgroundRow] = await Promise.all([
    prisma.race.findFirstOrThrow({ where: { name: raceName, ruleset: ruleset ?? undefined } }),
    prisma.class.findFirstOrThrow({ where: { name: className } }),
    prisma.background.findFirstOrThrow({ where: { name: background, ruleset: ruleset ?? undefined } }),
  ]);

  const form = minimalForm({
    name: `Редакція ${ruleset ?? "з класу"}`,
    raceId: race.raceId,
    classId: characterClass.classId,
    backgroundId: backgroundRow.backgroundId,
    ...(ruleset ? { ruleset } : {}),
    ...(className.endsWith("_2024")
      ? {
          backgroundAsiChoice: { mode: "+2/+1" as const, plusTwo: "STR" as const, plusOne: "CON" as const },
          languagesSchema: { languages: ["DWARVISH", "ELVISH"] },
          classChoiceSelections: await findRequiredClassChoices2024(characterClass.classId, 1),
        }
      : {}),
  });
  if (!ruleset) delete (form as Record<string, unknown>).ruleset;

  const created = await createCharacter(form);
  if (!("persId" in created) || !created.persId) throw new Error(`не створився: ${JSON.stringify(created)}`);

  return prisma.pers.findUniqueOrThrow({ where: { persId: created.persId }, select: { ruleset: true, classId: true } });
}

describe("Редакція персонажа доїжджає до бази", () => {
  it("клас 2024 без поля ruleset у запиті дає персонажа RULES_2024", async () => {
    await signIn("creation-ruleset-2024");

    const pers = await createWith(undefined, Classes.FIGHTER_2024, Races.HUMAN_2024, BackgroundCategory.SOLDIER_2024);

    expect(pers.ruleset).toBe("RULES_2024");
  });

  it("клас 2014 без поля ruleset лишається RULES_2014", async () => {
    await signIn("creation-ruleset-2014");

    const pers = await createWith(undefined, Classes.FIGHTER_2014, Races.HUMAN_2014, BackgroundCategory.SOLDIER);

    expect(pers.ruleset).toBe("RULES_2014");
  });
});
