import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { BackgroundCategory, Classes, Races } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { createCharacter } from "@/lib/actions/character";
import type { OfflineOperation } from "@/lib/offline/operations";
import { applyOwnedOfflineOperation } from "@/server/db/offline-operations";
import { minimalForm } from "../helpers/build-form";
import { backgroundByName, classByName, raceByName } from "../helpers/seed-lookup";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { auth } from "@/lib/auth";

beforeEach(resetUserData);
afterAll(disconnectDatabase);

async function createOwnedCharacter(email: string) {
  const user = await prisma.user.create({ data: { email, name: email } });
  vi.mocked(auth).mockResolvedValue({ user: { email: user.email } } as never);

  const [race, characterClass, background] = await Promise.all([
    raceByName(Races.HUMAN_2014),
    classByName(Classes.FIGHTER_2014),
    backgroundByName(BackgroundCategory.SOLDIER),
  ]);
  const created = await createCharacter(
    minimalForm({ raceId: race.raceId, classId: characterClass.classId, backgroundId: background.backgroundId }),
  );
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
