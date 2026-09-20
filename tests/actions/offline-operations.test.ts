import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { BackgroundCategory, Classes, Races } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { createCharacter } from "@/lib/actions/character";
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

async function createOwnedCharacter(email: string, className: Classes = Classes.FIGHTER_2014) {
  const user = await prisma.user.create({ data: { email, name: email } });
  vi.mocked(auth).mockResolvedValue({ user: { email: user.email } } as never);

  const [race, characterClass, background] = await Promise.all([
    raceByName(Races.HUMAN_2014),
    classByName(className),
    backgroundByName(BackgroundCategory.SOLDIER),
  ]);
  const created = await createCharacter(await withCreationSpells(minimalForm({ raceId: race.raceId, classId: characterClass.classId, backgroundId: background.backgroundId })));
  if ("error" in created) throw new Error(created.error);

  await prisma.pers.update({
    where: { persId: created.persId },
    data: { currentHp: 10, maxHp: 10, tempHp: 0, currentSpellSlots: [2, 1], currentPactSlots: 1 },
  });

  return { userId: user.id, persId: created.persId };
}

function damage(persId: number, operationId: string, amount: number): OfflineOperation {
  return { kind: "hp", mode: "damage", amount, operationId, persId, createdAt: new Date().toISOString() };
}

describe("KR22.6 — синхронізація офлайн-черги з базою", () => {
  it("повторна відправка тієї самої операції не застосовує її двічі", async () => {
    const { userId, persId } = await createOwnedCharacter("offline-idempotent@golden.test");
    const operation = damage(persId, "op-idempotent-0001", 7);

    await expect(applyOwnedOfflineOperation(userId, operation)).resolves.toEqual({ ok: true, duplicate: false });
    await expect(applyOwnedOfflineOperation(userId, operation)).resolves.toEqual({ ok: true, duplicate: true });

    const pers = await prisma.pers.findUniqueOrThrow({ where: { persId }, select: { currentHp: true } });
    expect(pers.currentHp).toBe(3);
  });

  it("різні операції з черги застосовуються всі", async () => {
    const { userId, persId } = await createOwnedCharacter("offline-sequence@golden.test");

    await applyOwnedOfflineOperation(userId, damage(persId, "op-sequence-00001", 3));
    await applyOwnedOfflineOperation(userId, damage(persId, "op-sequence-00002", 2));
    await applyOwnedOfflineOperation(userId, {
      kind: "spend-spell-slot",
      slotLevel: 1,
      operationId: "op-sequence-00003",
      persId,
      createdAt: new Date().toISOString(),
    });
    await applyOwnedOfflineOperation(userId, {
      kind: "details",
      patch: { notes: "офлайн-нотатка", gp: "12" },
      operationId: "op-sequence-00004",
      persId,
      createdAt: new Date().toISOString(),
    });

    const pers = await prisma.pers.findUniqueOrThrow({
      where: { persId },
      select: { currentHp: true, currentSpellSlots: true, notes: true, gp: true, personalityTraits: true },
    });
    expect(pers.currentHp).toBe(5);
    expect(pers.currentSpellSlots.slice(0, 2)).toEqual([1, 1]);
    expect(pers.notes).toBe("офлайн-нотатка");
    expect(pers.gp).toBe("12");
  });

  it("чужого персонажа офлайн-черга не чіпає", async () => {
    const owner = await createOwnedCharacter("offline-owner@golden.test");
    const stranger = await createOwnedCharacter("offline-stranger@golden.test");

    const result = await applyOwnedOfflineOperation(stranger.userId, damage(owner.persId, "op-foreign-000001", 7));

    expect(result.ok).toBe(false);
    const pers = await prisma.pers.findUniqueOrThrow({ where: { persId: owner.persId }, select: { currentHp: true } });
    expect(pers.currentHp).toBe(10);
  });

  it("невдала операція не займає ідентифікатор — його можна застосувати після виправлення доступу", async () => {
    const owner = await createOwnedCharacter("offline-retry-owner@golden.test");
    const stranger = await createOwnedCharacter("offline-retry-stranger@golden.test");

    await applyOwnedOfflineOperation(stranger.userId, damage(owner.persId, "op-retry-00000001", 7));
    await expect(
      applyOwnedOfflineOperation(owner.userId, damage(owner.persId, "op-retry-00000001", 7)),
    ).resolves.toEqual({ ok: true, duplicate: false });

    const pers = await prisma.pers.findUniqueOrThrow({ where: { persId: owner.persId }, select: { currentHp: true } });
    expect(pers.currentHp).toBe(3);
  });
});

describe("KR31.3 — Героїчне натхнення з офлайн-черги доїжджає до бази", () => {
  it("офлайн натхнення записується в межах налаштування стакання", async () => {
    const { userId, persId } = await createOwnedCharacter("offline-inspiration@golden.test");
    const setCount = (operationId: string, heroicInspirationCount: number): OfflineOperation => ({
      kind: "heroic-inspiration",
      heroicInspirationCount,
      operationId,
      persId,
      createdAt: new Date().toISOString(),
    });
    const readCount = async () =>
      (await prisma.pers.findUniqueOrThrow({ where: { persId }, select: { heroicInspirationCount: true } })).heroicInspirationCount;

    await expect(applyOwnedOfflineOperation(userId, setCount("op-inspiration-0001", 2))).resolves.toEqual({ ok: true, duplicate: false });
    expect(await readCount()).toBe(1);

    await applyOwnedOfflineOperation(userId, setCount("op-inspiration-0002", 0));
    expect(await readCount()).toBe(0);

    await prisma.pers.update({ where: { persId }, data: { canStackHeroicInspiration: true } });
    await applyOwnedOfflineOperation(userId, setCount("op-inspiration-0003", 2));
    expect(await readCount()).toBe(2);
  });
});

function stamp(persId: number, operationId: string, body: Omit<OfflineOperation, "operationId" | "persId" | "createdAt">): OfflineOperation {
  return { ...body, operationId, persId, createdAt: new Date().toISOString() } as OfflineOperation;
}

describe("Офлайн-аудит 2026-09-18 — нові види операцій доїжджають до бази", () => {
  it("відновлення комірки впирається в стелю з графа класів, а не в те, що прислав клієнт", async () => {
    const wizard = await createOwnedCharacter("offline-restore-wizard@golden.test", Classes.WIZARD_2014);
    await prisma.pers.update({ where: { persId: wizard.persId }, data: { currentSpellSlots: [0, 0, 0, 0, 0, 0, 0, 0, 0] } });

    for (const index of [1, 2, 3]) {
      await applyOwnedOfflineOperation(wizard.userId, stamp(wizard.persId, `op-restore-wiz-000${index}`, { kind: "restore-spell-slot", slotLevel: 1 }));
    }
    const restored = await prisma.pers.findUniqueOrThrow({ where: { persId: wizard.persId }, select: { currentSpellSlots: true } });
    expect(restored.currentSpellSlots[0]).toBe(2);

    const fighter = await createOwnedCharacter("offline-restore-fighter@golden.test");
    await applyOwnedOfflineOperation(fighter.userId, stamp(fighter.persId, "op-restore-fig-0001", { kind: "restore-spell-slot", slotLevel: 1 }));
    const untouched = await prisma.pers.findUniqueOrThrow({ where: { persId: fighter.persId }, select: { currentSpellSlots: true } });
    expect(untouched.currentSpellSlots[0]).toBe(2);
  });

  it("ресурс риси витрачається й відновлюється тим самим правилом, що й дія з листа, без подвоєння", async () => {
    const { userId, persId } = await createOwnedCharacter("offline-feature-use@golden.test");
    const secondWind = await prisma.feature.findFirstOrThrow({
      where: { engName: "Second Wind", classFeatures: { some: { class: { name: Classes.FIGHTER_2014 } } } },
      select: { featureId: true },
    });
    const readUses = async () =>
      (await prisma.persFeature.findUnique({ where: { persId_featureId: { persId, featureId: secondWind.featureId } }, select: { usesRemaining: true } }))?.usesRemaining;

    const spend = stamp(persId, "op-feature-spend-01", { kind: "feature-use", featureId: secondWind.featureId, direction: "spend" });
    await expect(applyOwnedOfflineOperation(userId, spend)).resolves.toEqual({ ok: true, duplicate: false });
    expect(await readUses()).toBe(0);

    await expect(applyOwnedOfflineOperation(userId, spend)).resolves.toEqual({ ok: true, duplicate: true });
    expect(await readUses()).toBe(0);

    await applyOwnedOfflineOperation(userId, stamp(persId, "op-feature-spend-02", { kind: "feature-use", featureId: secondWind.featureId, direction: "spend" }));
    expect(await readUses()).toBe(0);

    await applyOwnedOfflineOperation(userId, stamp(persId, "op-feature-rest-01", { kind: "feature-use", featureId: secondWind.featureId, direction: "restore" }));
    await applyOwnedOfflineOperation(userId, stamp(persId, "op-feature-rest-02", { kind: "feature-use", featureId: secondWind.featureId, direction: "restore" }));
    expect(await readUses()).toBe(1);
  });

  it("заряди предмета крокують лише у власника предмета", async () => {
    const owner = await createOwnedCharacter("offline-charges-owner@golden.test");
    const other = await createOwnedCharacter("offline-charges-other@golden.test");
    const magicItem = await prisma.magicItem.findFirstOrThrow({ where: { ruleset: "RULES_2014" }, select: { magicItemId: true } });
    const wand = await prisma.persMagicItem.create({
      data: { persId: owner.persId, magicItemId: magicItem.magicItemId, chargesMax: 7, chargesCurrent: 7 },
      select: { persMagicItemId: true },
    });

    await applyOwnedOfflineOperation(owner.userId, stamp(owner.persId, "op-charges-000001", { kind: "magic-item-charges", persMagicItemId: wand.persMagicItemId, step: -2 }));
    await applyOwnedOfflineOperation(owner.userId, stamp(owner.persId, "op-charges-000002", { kind: "magic-item-charges", persMagicItemId: wand.persMagicItemId, step: 9 }));
    const charged = await prisma.persMagicItem.findUniqueOrThrow({ where: { persMagicItemId: wand.persMagicItemId }, select: { chargesCurrent: true } });
    expect(charged.chargesCurrent).toBe(7);

    const foreign = await applyOwnedOfflineOperation(other.userId, stamp(other.persId, "op-charges-000003", { kind: "magic-item-charges", persMagicItemId: wand.persMagicItemId, step: -1 }));
    expect(foreign).toMatchObject({ ok: false, retry: false });
    expect(await prisma.pers_offline_operation.count({ where: { operation_id: "op-charges-000003" } })).toBe(0);
  });

  it("підготовка заклинання й хіт-дайси записуються, а неможливий залишок відхиляється без займання ідентифікатора", async () => {
    const { userId, persId } = await createOwnedCharacter("offline-prepared@golden.test", Classes.WIZARD_2014);
    const spell = await prisma.spell.findFirstOrThrow({ where: { ruleset: "RULES_2014", level: 1 }, select: { spellId: true } });
    await prisma.persSpell.create({ data: { persId, spellId: spell.spellId, isPrepared: false, learnedAtLevel: 1 } });

    await applyOwnedOfflineOperation(userId, stamp(persId, "op-prepared-000001", { kind: "spell-prepared", spellId: spell.spellId, isPrepared: true }));
    const row = await prisma.persSpell.findUniqueOrThrow({ where: { persId_spellId: { persId, spellId: spell.spellId } }, select: { isPrepared: true } });
    expect(row.isPrepared).toBe(true);

    const pers = await prisma.pers.findUniqueOrThrow({ where: { persId }, select: { classId: true } });
    const unknownClass = await applyOwnedOfflineOperation(userId, stamp(persId, "op-hitdice-000001", { kind: "hit-dice", remainingByClass: { 999999: 1 } }));
    expect(unknownClass).toMatchObject({ ok: false, retry: false });

    await expect(
      applyOwnedOfflineOperation(userId, stamp(persId, "op-hitdice-000001", { kind: "hit-dice", remainingByClass: { [pers.classId]: 5 } })),
    ).resolves.toEqual({ ok: true, duplicate: false });
    const dice = await prisma.pers.findUniqueOrThrow({ where: { persId }, select: { currentHitDice: true } });
    expect(dice.currentHitDice).toEqual({ [pers.classId]: 1 });
  });
});

describe("Відпочинок з офлайн-черги відтворюється тим самим ядром, що й кнопка", () => {
  async function prepareTiredFighter(email: string) {
    const owned = await createOwnedCharacter(email);
    const pers = await prisma.pers.findUniqueOrThrow({ where: { persId: owned.persId }, select: { classId: true } });
    const secondWind = await prisma.feature.findFirstOrThrow({
      where: { engName: "Second Wind", classFeatures: { some: { class: { name: Classes.FIGHTER_2014 } } } },
      select: { featureId: true },
    });
    await prisma.pers.update({
      where: { persId: owned.persId },
      data: { currentHp: 3, tempHp: 2, deathSaveFailures: 2, currentHitDice: { [pers.classId]: 0 } },
    });
    await prisma.persFeature.update({
      where: { persId_featureId: { persId: owned.persId, featureId: secondWind.featureId } },
      data: { usesRemaining: 0 },
    });

    const readState = async () => {
      const [row, feature] = await Promise.all([
        prisma.pers.findUniqueOrThrow({
          where: { persId: owned.persId },
          select: { currentHp: true, tempHp: true, deathSaveFailures: true, currentHitDice: true },
        }),
        prisma.persFeature.findUniqueOrThrow({
          where: { persId_featureId: { persId: owned.persId, featureId: secondWind.featureId } },
          select: { usesRemaining: true },
        }),
      ]);
      return { ...row, secondWind: feature.usesRemaining };
    };
    const spendSecondWind = () =>
      prisma.persFeature.update({
        where: { persId_featureId: { persId: owned.persId, featureId: secondWind.featureId } },
        data: { usesRemaining: 0 },
      });

    return { ...owned, classId: pers.classId, readState, spendSecondWind };
  }

  it("довгий відпочинок повертає хіти, половину кубиків 2014 і ресурси — і лише один раз", async () => {
    const fighter = await prepareTiredFighter("offline-long-rest@golden.test");
    const rest = stamp(fighter.persId, "op-long-rest-00001", { kind: "long-rest" });

    await expect(applyOwnedOfflineOperation(fighter.userId, rest)).resolves.toEqual({ ok: true, duplicate: false });
    expect(await fighter.readState()).toEqual({
      currentHp: 10,
      tempHp: 0,
      deathSaveFailures: 0,
      currentHitDice: { [fighter.classId]: 1 },
      secondWind: 1,
    });

    await fighter.spendSecondWind();
    await expect(applyOwnedOfflineOperation(fighter.userId, rest)).resolves.toEqual({ ok: true, duplicate: true });
    expect((await fighter.readState()).secondWind).toBe(0);
  });

  it("короткий відпочинок бере кинуті на клієнті хіти, списує кубик і не списує його вдруге", async () => {
    const fighter = await prepareTiredFighter("offline-short-rest@golden.test");
    await prisma.pers.update({ where: { persId: fighter.persId }, data: { currentHitDice: { [fighter.classId]: 1 } } });
    const rest = stamp(fighter.persId, "op-short-rest-0001", {
      kind: "short-rest",
      hitDiceSpent: [{ classId: fighter.classId, count: 1 }],
      restoredHitPoints: 4,
    });

    await expect(applyOwnedOfflineOperation(fighter.userId, rest)).resolves.toEqual({ ok: true, duplicate: false });
    await expect(applyOwnedOfflineOperation(fighter.userId, rest)).resolves.toEqual({ ok: true, duplicate: true });

    expect(await fighter.readState()).toEqual({
      currentHp: 7,
      tempHp: 2,
      deathSaveFailures: 2,
      currentHitDice: { [fighter.classId]: 0 },
      secondWind: 1,
    });
  });

  it("короткий відпочинок без кубиків відхиляється й не займає ідентифікатор", async () => {
    const fighter = await prepareTiredFighter("offline-short-rest-empty@golden.test");
    const rest = stamp(fighter.persId, "op-short-rest-0002", {
      kind: "short-rest",
      hitDiceSpent: [{ classId: fighter.classId, count: 1 }],
      restoredHitPoints: 4,
    });

    await expect(applyOwnedOfflineOperation(fighter.userId, rest)).resolves.toMatchObject({ ok: false, retry: false });
    expect(await prisma.pers_offline_operation.count({ where: { operation_id: "op-short-rest-0002" } })).toBe(0);
    expect((await fighter.readState()).currentHp).toBe(3);
  });
});
