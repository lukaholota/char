import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { BackgroundCategory, Classes, Prisma, Races } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createCharacter } from "@/lib/actions/character";
import { applyHpChange } from "@/lib/actions/combat-actions";
import { restoreFeatureUse, spendFeatureUse } from "@/lib/actions/feature-uses";
import { stepMagicItemCharges } from "@/lib/actions/magic-item-actions";
import { longRest, shortRest } from "@/lib/actions/rest-actions";
import { restorePactSlot, restoreSpellSlot, spendPactSlot, spendSpellSlot } from "@/lib/actions/spell-slots";
import type { OfflineOperation } from "@/lib/offline/operations";
import { applyOwnedOfflineOperation } from "@/server/db/offline-operations";
import { minimalForm } from "../helpers/build-form";
import { withCreationSpells } from "../helpers/creation-spells";
import { backgroundByName, classByName, raceByName } from "../helpers/seed-lookup";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { auth } from "@/lib/auth";

beforeEach(resetUserData);
afterAll(disconnectDatabase);

type Sheet = { userId: number; persId: number; classId: number; featureId: number; persMagicItemId: number };

type SheetChange = {
  kind: string;
  prepare: () => Promise<Sheet>;
  sendDirectly: (sheet: Sheet, operationId: string) => Promise<{ success: boolean }>;
  buildOperation: (sheet: Sheet, operationId: string) => OfflineOperation;
  readState: (sheet: Sheet) => Promise<unknown>;
  repeatedReplyChanges?: Record<string, unknown>;
};

async function createSheet(className: Classes, data: (classId: number) => Prisma.PersUpdateInput): Promise<Sheet> {
  const email = `replay-${randomUUID()}@golden.test`;
  const user = await prisma.user.create({ data: { email, name: email } });
  vi.mocked(auth).mockResolvedValue({ user: { email } } as never);

  const [race, characterClass, background] = await Promise.all([
    raceByName(Races.HUMAN_2014),
    classByName(className),
    backgroundByName(BackgroundCategory.SOLDIER),
  ]);
  const created = await createCharacter(await withCreationSpells(minimalForm({ raceId: race.raceId, classId: characterClass.classId, backgroundId: background.backgroundId })));
  if ("error" in created) throw new Error(created.error);
  await prisma.pers.update({ where: { persId: created.persId }, data: data(characterClass.classId) });

  return { userId: user.id, persId: created.persId, classId: characterClass.classId, featureId: 0, persMagicItemId: 0 };
}

async function createRager(usesRemaining: number): Promise<Sheet> {
  const sheet = await createSheet(Classes.BARBARIAN_2014, () => ({}));
  const rage = await prisma.feature.findFirstOrThrow({
    where: { engName: "Rage", classFeatures: { some: { class: { name: Classes.BARBARIAN_2014 } } } },
    select: { featureId: true },
  });
  const where = { persId_featureId: { persId: sheet.persId, featureId: rage.featureId } };
  await prisma.persFeature.upsert({ where, create: { ...where.persId_featureId, usesRemaining }, update: { usesRemaining } });
  return { ...sheet, featureId: rage.featureId };
}

async function createWandBearer(): Promise<Sheet> {
  const sheet = await createSheet(Classes.FIGHTER_2014, () => ({}));
  const magicItem = await prisma.magicItem.findFirstOrThrow({ where: { ruleset: "RULES_2014" }, select: { magicItemId: true } });
  const wand = await prisma.persMagicItem.create({
    data: { persId: sheet.persId, magicItemId: magicItem.magicItemId, chargesMax: 5, chargesCurrent: 5 },
    select: { persMagicItemId: true },
  });
  return { ...sheet, persMagicItemId: wand.persMagicItemId };
}

function stamp(sheet: Sheet, operationId: string, body: Omit<OfflineOperation, "operationId" | "persId" | "createdAt">): OfflineOperation {
  return { ...body, operationId, persId: sheet.persId, createdAt: new Date().toISOString() } as OfflineOperation;
}

const readHp = (sheet: Sheet) =>
  prisma.pers.findUniqueOrThrow({ where: { persId: sheet.persId }, select: { currentHp: true, tempHp: true } });
const readSlots = (sheet: Sheet) =>
  prisma.pers.findUniqueOrThrow({ where: { persId: sheet.persId }, select: { currentSpellSlots: true, currentPactSlots: true } });
const readRage = (sheet: Sheet) =>
  prisma.persFeature.findUniqueOrThrow({
    where: { persId_featureId: { persId: sheet.persId, featureId: sheet.featureId } },
    select: { usesRemaining: true },
  });
const readCharges = (sheet: Sheet) =>
  prisma.persMagicItem.findUniqueOrThrow({ where: { persMagicItemId: sheet.persMagicItemId }, select: { chargesCurrent: true } });
const readRest = (sheet: Sheet) =>
  prisma.pers.findUniqueOrThrow({ where: { persId: sheet.persId }, select: { currentHp: true, currentHitDice: true } });

const readLongRest = (sheet: Sheet) =>
  prisma.pers.findUniqueOrThrow({
    where: { persId: sheet.persId },
    select: { currentHp: true, currentHitDice: true, exhaustionLevel: true },
  });

const firstLevelSlots = (count: number) => [count, 0, 0, 0, 0, 0, 0, 0, 0];

const SHEET_CHANGES: SheetChange[] = [
  {
    kind: "шкода",
    prepare: () => createSheet(Classes.FIGHTER_2014, () => ({ currentHp: 10, maxHp: 10, tempHp: 0 })),
    sendDirectly: (sheet, operationId) => applyHpChange({ persId: sheet.persId, mode: "damage", amount: 3, operationId }),
    buildOperation: (sheet, operationId) => stamp(sheet, operationId, { kind: "hp", mode: "damage", amount: 3 }),
    readState: readHp,
  },
  {
    kind: "лікування",
    prepare: () => createSheet(Classes.FIGHTER_2014, () => ({ currentHp: 2, maxHp: 10, tempHp: 0 })),
    sendDirectly: (sheet, operationId) => applyHpChange({ persId: sheet.persId, mode: "heal", amount: 3, operationId }),
    buildOperation: (sheet, operationId) => stamp(sheet, operationId, { kind: "hp", mode: "heal", amount: 3 }),
    readState: readHp,
  },
  {
    kind: "витрата комірки",
    prepare: () => createSheet(Classes.WIZARD_2014, () => ({ currentSpellSlots: firstLevelSlots(2) })),
    sendDirectly: (sheet, operationId) => spendSpellSlot(sheet.persId, 1, operationId),
    buildOperation: (sheet, operationId) => stamp(sheet, operationId, { kind: "spend-spell-slot", slotLevel: 1 }),
    readState: readSlots,
  },
  {
    kind: "відновлення комірки",
    prepare: () => createSheet(Classes.WIZARD_2014, () => ({ currentSpellSlots: firstLevelSlots(0) })),
    sendDirectly: (sheet, operationId) => restoreSpellSlot(sheet.persId, 1, operationId),
    buildOperation: (sheet, operationId) => stamp(sheet, operationId, { kind: "restore-spell-slot", slotLevel: 1 }),
    readState: readSlots,
  },
  {
    kind: "витрата комірки пакту",
    prepare: () => createSheet(Classes.WARLOCK_2014, () => ({ level: 2, currentPactSlots: 2 })),
    sendDirectly: (sheet, operationId) => spendPactSlot(sheet.persId, operationId),
    buildOperation: (sheet, operationId) => stamp(sheet, operationId, { kind: "spend-pact-slot" }),
    readState: readSlots,
  },
  {
    kind: "відновлення комірки пакту",
    prepare: () => createSheet(Classes.WARLOCK_2014, () => ({ level: 2, currentPactSlots: 0 })),
    sendDirectly: (sheet, operationId) => restorePactSlot(sheet.persId, operationId),
    buildOperation: (sheet, operationId) => stamp(sheet, operationId, { kind: "restore-pact-slot" }),
    readState: readSlots,
  },
  {
    kind: "витрата ресурсу риси",
    prepare: () => createRager(2),
    sendDirectly: (sheet, operationId) => spendFeatureUse({ persId: sheet.persId, featureId: sheet.featureId, operationId }),
    buildOperation: (sheet, operationId) => stamp(sheet, operationId, { kind: "feature-use", featureId: sheet.featureId, direction: "spend" }),
    readState: readRage,
  },
  {
    kind: "відновлення ресурсу риси",
    prepare: () => createRager(0),
    sendDirectly: (sheet, operationId) => restoreFeatureUse({ persId: sheet.persId, featureId: sheet.featureId, operationId }),
    buildOperation: (sheet, operationId) => stamp(sheet, operationId, { kind: "feature-use", featureId: sheet.featureId, direction: "restore" }),
    readState: readRage,
  },
  {
    kind: "крок зарядів",
    prepare: createWandBearer,
    sendDirectly: (sheet, operationId) => stepMagicItemCharges(sheet.persMagicItemId, -2, operationId),
    buildOperation: (sheet, operationId) => stamp(sheet, operationId, { kind: "magic-item-charges", persMagicItemId: sheet.persMagicItemId, step: -2 }),
    readState: readCharges,
  },
  {
    kind: "короткий відпочинок",
    prepare: () => createSheet(Classes.FIGHTER_2014, (classId) => ({ level: 2, currentHp: 3, maxHp: 20, currentHitDice: { [classId]: 2 } })),
    sendDirectly: (sheet, operationId) => shortRest(sheet.persId, [{ classId: sheet.classId, count: 1 }], 3, operationId),
    buildOperation: (sheet, operationId) =>
      stamp(sheet, operationId, { kind: "short-rest", hitDiceSpent: [{ classId: sheet.classId, count: 1 }], restoredHitPoints: 3 }),
    readState: readRest,
    repeatedReplyChanges: { hpRestored: 0, featuresRestored: 0 },
  },
  {
    kind: "тривалий відпочинок",
    prepare: () =>
      createSheet(Classes.FIGHTER_2014, (classId) => ({ level: 4, currentHp: 5, maxHp: 30, currentHitDice: { [classId]: 0 }, exhaustionLevel: 2 })),
    sendDirectly: (sheet, operationId) => longRest(sheet.persId, operationId),
    buildOperation: (sheet, operationId) => stamp(sheet, operationId, { kind: "long-rest" }),
    readState: readLongRest,
    repeatedReplyChanges: { featuresRestored: 0 },
  },
];

describe.each(SHEET_CHANGES)("Обірваний звʼязок: $kind з листа застосовується рівно один раз", (change) => {
  it("пряма відправка дійшла, а клієнт поставив ту саму операцію в чергу", async () => {
    const sheet = await change.prepare();
    const operationId = randomUUID();
    const before = await change.readState(sheet);

    await expect(change.sendDirectly(sheet, operationId)).resolves.toMatchObject({ success: true });
    const once = await change.readState(sheet);
    expect(once).not.toEqual(before);

    await expect(applyOwnedOfflineOperation(sheet.userId, change.buildOperation(sheet, operationId))).resolves.toEqual({ ok: true, duplicate: true });
    expect(await change.readState(sheet)).toEqual(once);
  });

  it("черга застосувала операцію раніше, ніж дійшла запізніла пряма відправка", async () => {
    const sheet = await change.prepare();
    const operationId = randomUUID();
    const before = await change.readState(sheet);

    await expect(applyOwnedOfflineOperation(sheet.userId, change.buildOperation(sheet, operationId))).resolves.toEqual({ ok: true, duplicate: false });
    const once = await change.readState(sheet);
    expect(once).not.toEqual(before);

    await expect(change.sendDirectly(sheet, operationId)).resolves.toMatchObject({ success: true });
    expect(await change.readState(sheet)).toEqual(once);
  });

  it("повторна пряма відправка нічого не змінює й повертає поточний стан", async () => {
    const sheet = await change.prepare();
    const operationId = randomUUID();

    const first = await change.sendDirectly(sheet, operationId);
    const once = await change.readState(sheet);
    const repeated = await change.sendDirectly(sheet, operationId);

    expect(await change.readState(sheet)).toEqual(once);
    expect(repeated).toEqual({ ...first, ...change.repeatedReplyChanges });
  });
});
