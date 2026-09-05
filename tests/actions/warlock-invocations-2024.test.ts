import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Classes, Races, BackgroundCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { minimalForm } from "../helpers/build-form";
import { minimalLevelUpForm } from "../helpers/levelup-form";
import { disconnectDatabase, resetUserData } from "../user-data";
import { CHOICE_GROUPS } from "@/lib/logic/choicePoolRules";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), unstable_cache: <T>(fn: T) => fn }));

import { auth } from "@/lib/auth";
import { createCharacter } from "@/lib/actions/character";
import { levelUpCharacter } from "@/lib/actions/levelup";

beforeEach(resetUserData);
afterAll(disconnectDatabase);

const INVOCATIONS = CHOICE_GROUPS.WARLOCK_INVOCATIONS;

describe("KR18.8 — потойбічні виклики Чорнокнижника 2024", () => {
  it("1-й рівень: виклик без передумов дозволено (характеристика заклинань)", async () => {
    const { race, characterClass, background, armorOfShadows } = await loadFixtures();
    const user = await signIn("kr18-8-ok");

    const created = await createCharacter(
      minimalForm({
        raceId: race.raceId,
        classId: characterClass.classId,
        backgroundId: background.backgroundId,
        ruleset: "RULES_2024",
        equipmentSchema: { choiceGroupToId: {}, anyWeaponSelection: {} },
        backgroundAsiChoice: { mode: "+2/+1", plusTwo: "CHA", plusOne: "CON" },
        classChoiceSelections: { [INVOCATIONS]: armorOfShadows.choiceOptionId },
      }),
    );

    expect("error" in created && created.error).toBeFalsy();
    await expectHasInvocation(user.email!, "Armor of Shadows (2024)");
  });

  it("1-й рівень: виклик, що вимагає пакту, якого ще нема, — відхилено", async () => {
    const { race, characterClass, background, investmentOfChainMaster } = await loadFixtures();
    await signIn("kr18-8-no-pact");

    const created = await createCharacter(
      minimalForm({
        raceId: race.raceId,
        classId: characterClass.classId,
        backgroundId: background.backgroundId,
        ruleset: "RULES_2024",
        equipmentSchema: { choiceGroupToId: {}, anyWeaponSelection: {} },
        backgroundAsiChoice: { mode: "+2/+1", plusTwo: "CHA", plusOne: "CON" },
        classChoiceSelections: { [INVOCATIONS]: investmentOfChainMaster.choiceOptionId },
      }),
    );

    expect("error" in created ? created.error : undefined).toBe(
      "Цей виклик вимагає іншого виклику, якого у вас ще немає",
    );
  });

  it("2-й рівень: Pact of the Chain і виклик, що його потребує, в одному пакеті — дозволено", async () => {
    const { race, characterClass, background, armorOfShadows, pactOfTheChain, investmentOfChainMaster } =
      await loadFixtures();
    const user = await signIn("kr18-8-same-batch");

    const created = await createCharacter(
      minimalForm({
        raceId: race.raceId,
        classId: characterClass.classId,
        backgroundId: background.backgroundId,
        ruleset: "RULES_2024",
        equipmentSchema: { choiceGroupToId: {}, anyWeaponSelection: {} },
        backgroundAsiChoice: { mode: "+2/+1", plusTwo: "CHA", plusOne: "CON" },
        classChoiceSelections: { [INVOCATIONS]: armorOfShadows.choiceOptionId },
      }),
    );
    if ("error" in created && created.error) throw new Error(created.error);

    const leveledUp = await levelUpCharacter(
      created.persId!,
      minimalLevelUpForm({
        classId: characterClass.classId,
        classChoiceSelections: {
          [INVOCATIONS]: [pactOfTheChain.choiceOptionId, investmentOfChainMaster.choiceOptionId],
        },
      }),
    );

    expect("error" in leveledUp && leveledUp.error).toBeFalsy();
    await expectHasInvocation(user.email!, "Investment of the Chain Master (2024)");
  });

  it("2-й рівень: виклик, що потребує пакту, без нього в пакеті — відхилено", async () => {
    const { race, characterClass, background, armorOfShadows, investmentOfChainMaster, devilsSight } =
      await loadFixtures();
    await signIn("kr18-8-reject-batch");

    const created = await createCharacter(
      minimalForm({
        raceId: race.raceId,
        classId: characterClass.classId,
        backgroundId: background.backgroundId,
        ruleset: "RULES_2024",
        equipmentSchema: { choiceGroupToId: {}, anyWeaponSelection: {} },
        backgroundAsiChoice: { mode: "+2/+1", plusTwo: "CHA", plusOne: "CON" },
        classChoiceSelections: { [INVOCATIONS]: armorOfShadows.choiceOptionId },
      }),
    );
    if ("error" in created && created.error) throw new Error(created.error);

    const leveledUp = await levelUpCharacter(
      created.persId!,
      minimalLevelUpForm({
        classId: characterClass.classId,
        classChoiceSelections: {
          [INVOCATIONS]: [devilsSight.choiceOptionId, investmentOfChainMaster.choiceOptionId],
        },
      }),
    );

    expect("error" in leveledUp ? leveledUp.error : undefined).toBe(
      "Цей виклик вимагає іншого виклику, якого у вас ще немає",
    );
  });

  it("персонаж 2014 не бачить викликів 2024 і навпаки", async () => {
    const invocations2024 = await prisma.choiceOption.findMany({
      where: { groupName: INVOCATIONS, ruleset: "RULES_2024" },
      select: { optionNameEng: true },
    });
    expect(invocations2024.length).toBe(31);
    expect(invocations2024.every((option) => option.optionNameEng?.endsWith("(2024)"))).toBe(true);

    const invocations2014 = await prisma.choiceOption.findMany({
      where: { groupName: INVOCATIONS, ruleset: "RULES_2014" },
      select: { optionNameEng: true },
    });
    expect(invocations2014.length).toBe(50);
    expect(invocations2014.some((option) => option.optionNameEng?.endsWith("(2024)"))).toBe(false);
  });
});

async function signIn(handle: string) {
  const user = await prisma.user.create({
    data: { email: `${handle}-${Math.random()}@holota.family`, name: handle },
  });
  vi.mocked(auth).mockResolvedValue({ user: { email: user.email } } as never);
  return user;
}

async function loadFixtures() {
  const [race, characterClass, background, armorOfShadows, investmentOfChainMaster, pactOfTheChain, devilsSight] =
    await Promise.all([
      prisma.race.findFirstOrThrow({ where: { name: Races.TIEFLING_2024, ruleset: "RULES_2024" } }),
      prisma.class.findFirstOrThrow({ where: { name: Classes.WARLOCK_2024, ruleset: "RULES_2024" } }),
      prisma.background.findFirstOrThrow({ where: { name: BackgroundCategory.CHARLATAN_2024, ruleset: "RULES_2024" } }),
      prisma.choiceOption.findFirstOrThrow({ where: { optionNameEng: "Armor of Shadows (2024)" } }),
      prisma.choiceOption.findFirstOrThrow({ where: { optionNameEng: "Investment of the Chain Master (2024)" } }),
      prisma.choiceOption.findFirstOrThrow({ where: { optionNameEng: "Pact of the Chain (2024)" } }),
      prisma.choiceOption.findFirstOrThrow({ where: { optionNameEng: "Devil's Sight (2024)" } }),
    ]);
  return { race, characterClass, background, armorOfShadows, investmentOfChainMaster, pactOfTheChain, devilsSight };
}

async function expectHasInvocation(email: string, optionNameEng: string) {
  const pers = await prisma.pers.findFirstOrThrow({
    where: { user: { email } },
    select: { choiceOptions: { select: { optionNameEng: true } } },
  });
  expect(pers.choiceOptions.some((option) => option.optionNameEng === optionNameEng)).toBe(true);
}
