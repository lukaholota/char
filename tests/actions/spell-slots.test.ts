import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { BackgroundCategory, Classes, Races } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createCharacter } from "@/lib/actions/character";
import {
  restorePactSlot,
  restoreSpellSlot,
  spendPactSlot,
  spendSpellSlot,
} from "@/lib/actions/spell-slots";
import { minimalForm } from "../helpers/build-form";
import { withCreationSpells } from "../helpers/creation-spells";
import { backgroundByName, classByName, raceByName } from "../helpers/seed-lookup";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { auth } from "@/lib/auth";

beforeEach(resetUserData);
afterAll(disconnectDatabase);

describe("spell slot actions", () => {
  it("spends standard/Pact slots and restores only the current 2014 maxima", async () => {
    const user = await prisma.user.create({
      data: { email: "spell-slots@golden.test", name: "Spell Slots Test User" },
    });
    vi.mocked(auth).mockResolvedValue({ user: { email: user.email } } as never);

    const [race, characterClass, background] = await Promise.all([
      raceByName(Races.HUMAN_2014),
      classByName(Classes.WARLOCK_2014),
      backgroundByName(BackgroundCategory.SAGE),
    ]);
    const created = await createCharacter(await withCreationSpells(minimalForm({ raceId: race.raceId, classId: characterClass.classId, backgroundId: background.backgroundId })));
    if ("error" in created) throw new Error(created.error);

    await prisma.pers.update({
      where: { persId: created.persId },
      data: { currentSpellSlots: [1, 0, 0, 0, 0, 0, 0, 0, 0], currentPactSlots: 1 },
    });

    await expect(spendSpellSlot(created.persId, 1)).resolves.toEqual({
      success: true,
      currentSpellSlots: [0, 0, 0, 0, 0, 0, 0, 0, 0],
    });
    await expect(restoreSpellSlot(created.persId, 1)).resolves.toEqual({
      success: true,
      currentSpellSlots: [0, 0, 0, 0, 0, 0, 0, 0, 0],
    });
    await expect(spendPactSlot(created.persId)).resolves.toEqual({ success: true, currentPactSlots: 0 });
    await expect(restorePactSlot(created.persId)).resolves.toEqual({ success: true, currentPactSlots: 1 });
  });
});

async function createCaster(email: string, className: Classes) {
  const user = await prisma.user.create({ data: { email, name: email } });
  vi.mocked(auth).mockResolvedValue({ user: { email: user.email } } as never);

  const [race, characterClass, background] = await Promise.all([
    raceByName(Races.HUMAN_2014),
    classByName(className),
    backgroundByName(BackgroundCategory.SAGE),
  ]);
  const created = await createCharacter(await withCreationSpells(minimalForm({ raceId: race.raceId, classId: characterClass.classId, backgroundId: background.backgroundId })));
  if ("error" in created) throw new Error(created.error);
  return created.persId;
}

const slots = (first: number) => [first, 0, 0, 0, 0, 0, 0, 0, 0];

const readSlots = (persId: number) =>
  prisma.pers.findUniqueOrThrow({ where: { persId }, select: { currentSpellSlots: true, currentPactSlots: true } });

describe.each([
  { path: "без ідентифікатора операції", nextOperationId: (): string | undefined => undefined },
  { path: "з ідентифікатором операції", nextOperationId: (): string | undefined => randomUUID() },
])("Комірки з листа $path", ({ nextOperationId }) => {
  it("звичайна комірка витрачається до нуля й відновлюється лише до стелі класу", async () => {
    const persId = await createCaster("slots-wizard@golden.test", Classes.WIZARD_2014);
    await prisma.pers.update({ where: { persId }, data: { currentSpellSlots: slots(1) } });

    const steps = [
      { change: () => spendSpellSlot(persId, 1, nextOperationId()), first: 0 },
      { change: () => spendSpellSlot(persId, 1, nextOperationId()), first: 0 },
      { change: () => restoreSpellSlot(persId, 1, nextOperationId()), first: 1 },
      { change: () => restoreSpellSlot(persId, 1, nextOperationId()), first: 2 },
      { change: () => restoreSpellSlot(persId, 1, nextOperationId()), first: 2 },
    ];
    for (const { change, first } of steps) {
      await expect(change()).resolves.toEqual({ success: true, currentSpellSlots: slots(first) });
      expect((await readSlots(persId)).currentSpellSlots).toEqual(slots(first));
    }

    for (const slotLevel of [0, 10]) {
      await expect(spendSpellSlot(persId, slotLevel, nextOperationId())).resolves.toEqual({ success: false, error: "Некоректний рівень слота" });
      await expect(restoreSpellSlot(persId, slotLevel, nextOperationId())).resolves.toEqual({ success: false, error: "Некоректний рівень слота" });
    }
    expect((await readSlots(persId)).currentSpellSlots).toEqual(slots(2));
  });

  it("комірка пакту витрачається до нуля й відновлюється лише до стелі пакту", async () => {
    const persId = await createCaster("slots-warlock@golden.test", Classes.WARLOCK_2014);
    await prisma.pers.update({ where: { persId }, data: { level: 2, currentPactSlots: 1 } });

    const steps = [
      { change: () => spendPactSlot(persId, nextOperationId()), pact: 0 },
      { change: () => spendPactSlot(persId, nextOperationId()), pact: 0 },
      { change: () => restorePactSlot(persId, nextOperationId()), pact: 1 },
      { change: () => restorePactSlot(persId, nextOperationId()), pact: 2 },
      { change: () => restorePactSlot(persId, nextOperationId()), pact: 2 },
    ];
    for (const { change, pact } of steps) {
      await expect(change()).resolves.toEqual({ success: true, currentPactSlots: pact });
      expect((await readSlots(persId)).currentPactSlots).toBe(pact);
    }
  });

  it("чужий гравець комірок не змінює", async () => {
    const persId = await createCaster("slots-owner@golden.test", Classes.WARLOCK_2014);
    await prisma.pers.update({ where: { persId }, data: { currentSpellSlots: slots(1), currentPactSlots: 1 } });
    await prisma.user.create({ data: { email: "slots-stranger@golden.test", name: "Чужий" } });
    vi.mocked(auth).mockResolvedValue({ user: { email: "slots-stranger@golden.test" } } as never);

    const denied = { success: false, error: "Немає доступу до персонажа" };
    await expect(spendSpellSlot(persId, 1, nextOperationId())).resolves.toEqual(denied);
    await expect(restoreSpellSlot(persId, 1, nextOperationId())).resolves.toEqual(denied);
    await expect(spendPactSlot(persId, nextOperationId())).resolves.toEqual(denied);
    await expect(restorePactSlot(persId, nextOperationId())).resolves.toEqual(denied);
    expect(await readSlots(persId)).toEqual({ currentSpellSlots: slots(1), currentPactSlots: 1 });
  });
});
