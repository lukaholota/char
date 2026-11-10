import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { BackgroundCategory, Classes, Races } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createCharacter } from "@/lib/actions/character";
import {
  deleteCustomFeatureAction,
  deleteCustomSkillAction,
  saveCustomFeatureAction,
  saveCustomSkillAction,
  stepCustomFeatureUseAction,
} from "@/lib/actions/pers-custom-content-actions";
import { longRest, shortRest } from "@/server/db/rest-actions";
import { applyOwnedOfflineOperation } from "@/server/db/offline-operations";
import { duplicatePers } from "@/server/db/pers-actions";
import { MAX_CUSTOM_SKILLS } from "@/rules/pers-custom-content";
import { minimalForm } from "../helpers/build-form";
import { backgroundByName, classByName, raceByName } from "../helpers/seed-lookup";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { auth } from "@/lib/auth";

beforeEach(resetUserData);
afterAll(disconnectDatabase);

const skillDraft = { name: "Екстрасенсорика", ability: "WIS", proficiencyType: "PROFICIENT", bonus: "1" };
const resourceDraft = { name: "Подих", description: "", rollFormula: "2к6+СИЛ", usesMax: "2", restoredOn: "SHORT_REST" };

function signInAs(user: { id: number; email: string }) {
  vi.mocked(auth).mockResolvedValue({ user: { id: String(user.id), email: user.email } } as never);
}

async function createOwner(email = "custom-owner@golden.test") {
  const user = await prisma.user.create({ data: { email, name: email } });
  signInAs(user);
  const [race, characterClass, background] = await Promise.all([raceByName(Races.HUMAN_2014), classByName(Classes.FIGHTER_2014), backgroundByName(BackgroundCategory.SOLDIER)]);
  const created = await createCharacter(minimalForm({ name: "Торин", raceId: race.raceId, classId: characterClass.classId, backgroundId: background.backgroundId }));
  if ("error" in created) throw new Error(created.error);
  return { user, persId: created.persId };
}

async function addResource(persId: number, draft: Partial<typeof resourceDraft> = {}) {
  const saved = await saveCustomFeatureAction(persId, null, { ...resourceDraft, ...draft });
  if (!saved.success) throw new Error(saved.error ?? JSON.stringify(saved.errors));
  return saved.features.at(-1)!;
}

function readUses(featureId: number) {
  return prisma.persCustomFeature.findUniqueOrThrow({ where: { id: featureId } }).then((feature) => feature.usesRemaining);
}

describe("власні навички", () => {
  it("зберігає, редагує й видаляє навичку", async () => {
    const { persId } = await createOwner();
    const added = await saveCustomSkillAction(persId, null, skillDraft);
    expect(added).toMatchObject({ success: true, skills: [{ name: "Екстрасенсорика", ability: "WIS", proficiencyType: "PROFICIENT", bonus: 1 }] });

    const skillId = added.success ? added.skills[0].id : 0;
    await expect(saveCustomSkillAction(persId, skillId, { ...skillDraft, name: "Флірт", ability: "CHA" })).resolves.toMatchObject({ success: true, skills: [{ id: skillId, name: "Флірт", ability: "CHA" }] });
    await expect(deleteCustomSkillAction(persId, skillId)).resolves.toEqual({ success: true, skills: [] });
  });

  it("не приймає дубль назви, неправильні поля й навичку понад межу", async () => {
    const { persId } = await createOwner();
    await saveCustomSkillAction(persId, null, skillDraft);
    await expect(saveCustomSkillAction(persId, null, skillDraft)).resolves.toEqual({ success: false, error: "Навичка з такою назвою вже є." });
    await expect(saveCustomSkillAction(persId, null, { ...skillDraft, name: " " })).resolves.toMatchObject({ success: false, errors: { name: expect.any(String) } });

    await prisma.persCustomSkill.createMany({ data: Array.from({ length: MAX_CUSTOM_SKILLS - 1 }, (_, index) => ({ persId, name: `Навичка ${index}`, ability: "WIS" as const })) });
    await expect(saveCustomSkillAction(persId, null, { ...skillDraft, name: "Зайва" })).resolves.toMatchObject({ success: false, error: expect.stringContaining(String(MAX_CUSTOM_SKILLS)) });
  });
});

describe("власні ресурси", () => {
  it("новий ресурс повний, витрата не йде нижче нуля, а повернення не вище максимуму", async () => {
    const { persId } = await createOwner();
    const { id, usesRemaining } = await addResource(persId);
    expect(usesRemaining).toBe(2);

    await stepCustomFeatureUseAction(persId, id, "restore");
    expect(await readUses(id)).toBe(2);
    await Promise.all([stepCustomFeatureUseAction(persId, id, "spend"), stepCustomFeatureUseAction(persId, id, "spend"), stepCustomFeatureUseAction(persId, id, "spend")]);
    expect(await readUses(id)).toBe(0);
  });

  it("повтор тієї самої офлайн-операції витрачає один раз", async () => {
    const { persId } = await createOwner();
    const { id } = await addResource(persId);
    await stepCustomFeatureUseAction(persId, id, "spend", "op-custom-use-0001");
    await expect(stepCustomFeatureUseAction(persId, id, "spend", "op-custom-use-0001")).resolves.toEqual({ success: true });
    expect(await readUses(id)).toBe(1);
  });

  it("зміна максимуму зберігає вже витрачене", async () => {
    const { persId } = await createOwner();
    const { id } = await addResource(persId, { usesMax: "3" });
    await stepCustomFeatureUseAction(persId, id, "spend");
    await saveCustomFeatureAction(persId, id, { ...resourceDraft, usesMax: "5" });
    expect(await readUses(id)).toBe(4);
    await saveCustomFeatureAction(persId, id, { ...resourceDraft, usesMax: "1" });
    expect(await readUses(id)).toBe(1);
  });

  it("короткий відпочинок відновлює лише короткі, довгий ще й довгі, ручні лишаються", async () => {
    const { persId } = await createOwner();
    const [short, long, manual] = [await addResource(persId, { name: "Короткий" }), await addResource(persId, { name: "Довгий", restoredOn: "LONG_REST" }), await addResource(persId, { name: "Ручний", restoredOn: "" })];
    await Promise.all([short, long, manual].map((feature) => stepCustomFeatureUseAction(persId, feature.id, "spend")));

    await shortRest(persId, [], undefined, "op-custom-rest-0001");
    expect([await readUses(short.id), await readUses(long.id), await readUses(manual.id)]).toEqual([2, 1, 1]);

    await longRest(persId, "op-custom-rest-0002");
    expect([await readUses(short.id), await readUses(long.id), await readUses(manual.id)]).toEqual([2, 2, 1]);
  });

  it("офлайн-черга витрачає ресурс і не витрачає двічі при повторі", async () => {
    const { user, persId } = await createOwner();
    const { id } = await addResource(persId);
    const queued = { kind: "custom-feature-use" as const, customFeatureId: id, direction: "spend" as const, operationId: "op-custom-offline-1", persId, createdAt: "2026-11-09T00:00:00.000Z" };
    await applyOwnedOfflineOperation(user.id, queued);
    await applyOwnedOfflineOperation(user.id, queued);
    expect(await readUses(id)).toBe(1);
  });

  it("копія персонажа забирає навички й здібності разом із витраченим", async () => {
    const { persId } = await createOwner();
    await saveCustomSkillAction(persId, null, skillDraft);
    const { id } = await addResource(persId);
    await stepCustomFeatureUseAction(persId, id, "spend");

    const copied = await duplicatePers(persId);
    if (!copied.success) throw new Error(copied.error);
    await expect(prisma.persCustomSkill.count({ where: { persId: copied.pers.persId } })).resolves.toBe(1);
    await expect(prisma.persCustomFeature.findFirstOrThrow({ where: { persId: copied.pers.persId } })).resolves.toMatchObject({ name: "Подих", usesRemaining: 1, usesMax: 2 });
  });

  it("видалення прибирає ресурс", async () => {
    const { persId } = await createOwner();
    const { id } = await addResource(persId);
    await expect(deleteCustomFeatureAction(persId, id)).resolves.toEqual({ success: true, features: [] });
  });
});

describe("доступ", () => {
  it("чужий гравець не читає й не змінює власний вміст персонажа", async () => {
    const { persId } = await createOwner();
    const { id } = await addResource(persId);
    signInAs(await prisma.user.create({ data: { email: "custom-stranger@golden.test", name: "Чужий" } }));

    await expect(saveCustomSkillAction(persId, null, skillDraft)).resolves.toEqual({ success: false, error: "Немає доступу до персонажа" });
    await expect(saveCustomFeatureAction(persId, id, resourceDraft)).resolves.toEqual({ success: false, error: "Немає доступу до персонажа" });
    await expect(stepCustomFeatureUseAction(persId, id, "spend")).resolves.toEqual({ success: false, error: "Немає доступу до персонажа" });
    await expect(deleteCustomFeatureAction(persId, id)).resolves.toEqual({ success: false, error: "Немає доступу до персонажа" });
    expect(await readUses(id)).toBe(2);
  });

  it("власник не може змінити чужий ресурс через свого персонажа", async () => {
    const victim = await createOwner();
    const { id } = await addResource(victim.persId);
    const attacker = await createOwner("custom-attacker@golden.test");

    await stepCustomFeatureUseAction(attacker.persId, id, "spend");
    await expect(saveCustomFeatureAction(attacker.persId, id, resourceDraft)).resolves.toEqual({ success: false, error: "Здібність не знайдено." });
    await deleteCustomFeatureAction(attacker.persId, id);
    expect(await readUses(id)).toBe(2);
  });
});
