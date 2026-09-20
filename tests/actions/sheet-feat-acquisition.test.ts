/**
 * KR31.13 `L10-sheet-config-01` — риса, додана з листа, набувається повністю (рішення власника
 * 2026-09-13): характеристики, ряткидки, навички, мови, володіння, фічі опцій, хіти, заклинання.
 */

import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), unstable_cache: <T>(fn: T) => fn }));

import { auth } from "@/lib/auth";
import { getSheetFeatAcquisitionContent } from "@/lib/actions/feat-actions";
import { acquire, createFighter, readCharacter } from "../helpers/sheet-feat-fixtures";

vi.setConfig({ testTimeout: 60_000 });

beforeEach(resetUserData);
afterAll(disconnectDatabase);

describe("KR31.13 — риса з листа дає свої надання", () => {
  it("Стійкість 2014: Статура +1 і ряткидок, хіти заднім числом за кожен рівень", async () => {
    const pers = await createFighter({ ruleset: "RULES_2014", level: 6, con: 13 });

    expect(await acquire(pers, "RULES_2014", "RESILIENT", ["Resilient (Constitution)"])).toEqual({ success: true });
    expect(await readCharacter(pers)).toMatchObject({ con: 14, maxHp: 56, currentHp: 56, additionalSaveProficiencies: ["CON"] });
  });

  it("Міцний 2014 на 5-му рівні: +10 хітів", async () => {
    const pers = await createFighter({ ruleset: "RULES_2014", level: 5 });

    await acquire(pers, "RULES_2014", "TOUGH");
    expect(await readCharacter(pers)).toMatchObject({ maxHp: 60, currentHp: 60 });
  });

  it("Експерт у навичках 2024: Інтелект, володіння й експертиза", async () => {
    const pers = await createFighter({ ruleset: "RULES_2024", level: 4 });

    await acquire(pers, "RULES_2024", "SKILL_EXPERT", [
      "Skill Expert 2024 (INT)",
      "Skill Expert 2024 proficiency (HISTORY)",
      "Skill Expert 2024 expertise (HISTORY)",
    ]);
    expect(await readCharacter(pers)).toMatchObject({ int: 13, skills: ["HISTORY:EXPERTISE"] });
  });

  it("Лінгвіст 2014 і Важкі обладунки 2014 дописують мови й володіння в текст", async () => {
    const linguist = await createFighter({ ruleset: "RULES_2014", level: 4 });
    await acquire(linguist, "RULES_2014", "LINGUIST");
    expect(await readCharacter(linguist)).toMatchObject({ int: 13, customLanguagesKnown: "Загальна\nОбери ще 3" });

    const armored = await createFighter({ ruleset: "RULES_2014", level: 4 });
    await acquire(armored, "RULES_2014", "HEAVILY_ARMORED");
    expect(await readCharacter(armored)).toMatchObject({ str: 16, customProficiencies: "Усі обладунки\nВажкі обладунки" });
  });

  it("Бойовий адепт 2014 кладе фічі обраних маневрів, Ремісник 2024 — фічу риси й рядок інструментів", async () => {
    const adept = await createFighter({ ruleset: "RULES_2014", level: 4 });
    await acquire(adept, "RULES_2014", "MARTIAL_ADEPT", ["Riposte (Maneuver)", "Trip Attack (Maneuver)"]);
    expect((await readCharacter(adept)).features).toEqual(["Riposte", "Trip Attack"]);

    const crafter = await createFighter({ ruleset: "RULES_2024", level: 4 });
    await acquire(crafter, "RULES_2024", "CRAFTER");
    expect(await readCharacter(crafter)).toMatchObject({
      features: ["Origin Feat: Crafter (2024)"],
      customProficiencies: "Усі обладунки\nІнструменти на вибір (3)",
    });
  });

  it("Доторк феї 2024: Туманний крок від риси й обране заклинання, без вибору — відмова", async () => {
    const pers = await createFighter({ ruleset: "RULES_2024", level: 4 });
    const command = await prisma.spell.findFirstOrThrow({ where: { ruleset: "RULES_2024", engName: "Command" }, select: { spellId: true } });

    expect(await acquire(pers, "RULES_2024", "FEY_TOUCHED", ["Fey Touched 2024 (CHA)"])).toMatchObject({ success: false });
    expect(await acquire(pers, "RULES_2024", "FEY_TOUCHED", ["Fey Touched 2024 (CHA)"], [command.spellId])).toEqual({ success: true });
    expect(await readCharacter(pers)).toMatchObject({ cha: 9, spells: ["FEAT:Command", "FEAT:Misty Step"] });
  });

  it("каталог листа несе синтетичні id рис 2024 — вміст риси шукається за англійською назвою в редакції персонажа", async () => {
    const fighter2024 = await createFighter({ ruleset: "RULES_2024", level: 4 });
    const skillExpert2024 = await prisma.feat.findFirstOrThrow({ where: { name: "SKILL_EXPERT", ruleset: "RULES_2024" }, select: { featId: true } });
    const content2024 = await getSheetFeatAcquisitionContent(fighter2024, "Skill Expert");
    expect(content2024).toMatchObject({ hasSpellChoice: false, feat: { featId: skillExpert2024.featId, ruleset: "RULES_2024" } });
    expect(content2024?.feat.featChoiceOptions.length).toBeGreaterThan(0);

    const fighter2014 = await createFighter({ ruleset: "RULES_2014", level: 4 });
    expect((await getSheetFeatAcquisitionContent(fighter2014, "Skill Expert"))?.feat.ruleset).toBe("RULES_2014");
    expect(await getSheetFeatAcquisitionContent(fighter2014, "Boon Of Skill")).toBeNull();
  });

  it("неповторювана риса вдруге не береться", async () => {
    const pers = await createFighter({ ruleset: "RULES_2014", level: 4 });

    await acquire(pers, "RULES_2014", "TOUGH");
    expect(await acquire(pers, "RULES_2014", "TOUGH")).toMatchObject({ success: false, error: expect.stringContaining("лише раз") });
    expect(await readCharacter(pers)).toMatchObject({ maxHp: 58, feats: ["TOUGH"] });
  });
});
