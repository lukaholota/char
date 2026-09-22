import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { BackgroundCategory, Classes, Races, Subclasses } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createCharacter } from "@/lib/actions/character";
import { levelUpCharacter } from "@/lib/actions/levelup";
import { minimalForm } from "../helpers/build-form";
import { withCreationSpells, withLevelUpSpells } from "../helpers/creation-spells";
import { minimalLevelUpForm } from "../helpers/levelup-form";
import { backgroundByName, classByName, raceByName, subclassByName } from "../helpers/seed-lookup";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

beforeEach(resetUserData);
afterAll(disconnectDatabase);

describe("Чорнокнижник 2014 — Дар і виклик у тому самому піднятті рівня", () => {
  it("дозволяє замінити виклик на Покращену зброю пакту при виборі Дару клинка", async () => {
    const user = await prisma.user.create({ data: { email: `pact-${Math.random()}@holota.family`, name: "Pact" } });
    vi.mocked(auth).mockResolvedValue({ user: { email: user.email } } as never);

    const [race, warlock, background, blade, improvedWeapon, armorOfShadows] = await Promise.all([
      raceByName(Races.HUMAN_2014),
      classByName(Classes.WARLOCK_2014),
      backgroundByName(BackgroundCategory.HERMIT),
      prisma.choiceOption.findFirstOrThrow({ where: { optionNameEng: "Pact of the Blade", ruleset: "RULES_2014" } }),
      prisma.choiceOption.findFirstOrThrow({ where: { optionNameEng: "Improved Pact Weapon", ruleset: "RULES_2014" } }),
      prisma.choiceOption.findFirstOrThrow({ where: { optionNameEng: "Armor of Shadows", ruleset: "RULES_2014" } }),
    ]);
    const fiend = await subclassByName(warlock.classId, Subclasses.FIEND);
    const created = await createCharacter(await withCreationSpells(minimalForm({
      raceId: race.raceId,
      classId: warlock.classId,
      subclassId: fiend.subclassId,
      backgroundId: background.backgroundId,
    })));
    if ("error" in created && created.error) throw new Error(created.error);

    await prisma.pers.update({
      where: { persId: created.persId! },
      data: { level: 2, choiceOptions: { connect: { choiceOptionId: armorOfShadows.choiceOptionId } } },
    });
    const replacement = await prisma.classOptionalFeature.findFirstOrThrow({
      where: { classId: warlock.classId, replacesInvocation: true, grantedOnLevels: { has: 3 } },
    });

    const leveledUp = await levelUpCharacter(created.persId!, await withLevelUpSpells(
      created.persId!,
      minimalLevelUpForm({
        classId: warlock.classId,
        classChoiceSelections: { "Дар пакту": blade.choiceOptionId },
        classOptionalFeatureSelections: { [replacement.optionalFeatureId]: true },
        classOptionalFeatureReplacementSelections: {
          [replacement.optionalFeatureId]: {
            removeChoiceOptionId: armorOfShadows.choiceOptionId,
            addChoiceOptionId: improvedWeapon.choiceOptionId,
          },
        },
      }),
    ));

    expect("error" in leveledUp ? leveledUp.error : undefined).toBeUndefined();
    expect(revalidatePath).toHaveBeenCalledWith(`/char/${created.persId}`);
    expect(revalidatePath).toHaveBeenCalledWith(`/char/${created.persId}/levelup`);
    const pers = await prisma.pers.findUniqueOrThrow({
      where: { persId: created.persId! },
      select: { level: true, choiceOptions: { select: { optionNameEng: true } } },
    });
    expect(pers.level).toBe(3);
    expect(pers.choiceOptions.map((choice) => choice.optionNameEng)).toEqual(expect.arrayContaining([
      "Pact of the Blade", "Improved Pact Weapon",
    ]));
  });
});
