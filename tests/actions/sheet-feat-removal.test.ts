/**
 * KR31.13 — видалення риси з листа відкочує її надання (рішення власника 2026-09-14). Риса, набута
 * з листа, несе знімок у pers_feat.grants; давніша відкочується з обраних опцій.
 */

import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), unstable_cache: <T>(fn: T) => fn }));

import { getFeatRemovalPreview, removeFeatFromPers } from "@/lib/actions/feat-actions";
import { acquire, createFighter, readCharacter } from "../helpers/sheet-feat-fixtures";

vi.setConfig({ testTimeout: 60_000 });

beforeEach(resetUserData);
afterAll(disconnectDatabase);

describe("KR31.13 — відкат риси з листа", () => {
  it("Стійкість 2014: Статура, ряткидок і хіти за кожен рівень повертаються до стану до риси", async () => {
    const persId = await createFighter({ ruleset: "RULES_2014", level: 6, con: 13 });
    const before = await readCharacter(persId);
    await acquire(persId, "RULES_2014", "RESILIENT", ["Resilient (Wisdom)"]);

    const featId = await findFeatId("RESILIENT", "RULES_2014");
    expect(await getFeatRemovalPreview(persId, featId)).toEqual({ isExact: true, changes: ["Мудрість −1", "Володіння ряткидком: Мудрість"] });
    expect(await removeFeatFromPers({ persId, featId })).toEqual({ success: true });
    expect(await readCharacter(persId)).toEqual(before);
  });

  it("Експерт у навичках 2024: нова навичка зникає, експертиза на наявній навичці знижується до володіння", async () => {
    const persId = await createFighter({ ruleset: "RULES_2024", level: 4 });
    await prisma.persSkill.create({ data: { persId, name: "ATHLETICS", skillId: 1, proficiencyType: "PROFICIENT" } });
    const before = await readCharacter(persId);

    await acquire(persId, "RULES_2024", "SKILL_EXPERT", [
      "Skill Expert 2024 (INT)",
      "Skill Expert 2024 proficiency (HISTORY)",
      "Skill Expert 2024 expertise (ATHLETICS)",
    ]);
    expect((await readCharacter(persId)).skills).toEqual(["ATHLETICS:EXPERTISE", "HISTORY:PROFICIENT"]);

    await removeFeatFromPers({ persId, featId: await findFeatId("SKILL_EXPERT", "RULES_2024") });
    expect(await readCharacter(persId)).toEqual(before);
  });

  it("Доторк феї 2024 забирає свої заклинання, Лінгвіст — свій рядок мов", async () => {
    const fey = await createFighter({ ruleset: "RULES_2024", level: 4 });
    const command = await prisma.spell.findFirstOrThrow({ where: { ruleset: "RULES_2024", engName: "Command" }, select: { spellId: true } });
    const feyBefore = await readCharacter(fey);
    await acquire(fey, "RULES_2024", "FEY_TOUCHED", ["Fey Touched 2024 (CHA)"], [command.spellId]);
    await removeFeatFromPers({ persId: fey, featId: await findFeatId("FEY_TOUCHED", "RULES_2024") });
    expect(await readCharacter(fey)).toEqual(feyBefore);

    const linguist = await createFighter({ ruleset: "RULES_2014", level: 4 });
    const linguistBefore = await readCharacter(linguist);
    await acquire(linguist, "RULES_2014", "LINGUIST");
    await removeFeatFromPers({ persId: linguist, featId: await findFeatId("LINGUIST", "RULES_2014") });
    expect(await readCharacter(linguist)).toEqual(linguistBefore);
  });

  it("риса без знімка: Міцний знімає 2 хіти за рівень, ряткидок класу не чіпається, навички лишаються", async () => {
    const persId = await createFighter({ ruleset: "RULES_2014", level: 5, con: 16 });
    const resilient = await prisma.feat.findFirstOrThrow({
      where: { name: "RESILIENT", ruleset: "RULES_2014" },
      select: { featId: true, featChoiceOptions: { select: { choiceOptionId: true, choiceOption: { select: { optionNameEng: true } } } } },
    });
    const constitution = resilient.featChoiceOptions.find((link) => link.choiceOption.optionNameEng === "Resilient (Constitution)")!;
    await prisma.pers.update({ where: { persId }, data: { con: 17, maxHp: 60, currentHp: 60, additionalSaveProficiencies: ["STR", "CON"] } });
    await prisma.persFeat.create({ data: { persId, featId: resilient.featId, choices: { create: { choiceOptionId: constitution.choiceOptionId } } } });
    await prisma.persFeat.create({ data: { persId, featId: await findFeatId("TOUGH", "RULES_2014") } });

    expect(await getFeatRemovalPreview(persId, resilient.featId)).toMatchObject({ isExact: false, changes: ["Статура −1"] });
    await removeFeatFromPers({ persId, featId: resilient.featId });
    expect(await readCharacter(persId)).toMatchObject({ con: 16, maxHp: 60, additionalSaveProficiencies: ["STR", "CON"] });

    await removeFeatFromPers({ persId, featId: await findFeatId("TOUGH", "RULES_2014") });
    expect(await readCharacter(persId)).toMatchObject({ maxHp: 50, currentHp: 50, feats: [] });
  });
});

async function findFeatId(name: "RESILIENT" | "SKILL_EXPERT" | "FEY_TOUCHED" | "LINGUIST" | "TOUGH", ruleset: "RULES_2014" | "RULES_2024") {
  return (await prisma.feat.findFirstOrThrow({ where: { name, ruleset }, select: { featId: true } })).featId;
}
