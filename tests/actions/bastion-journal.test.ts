import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  addTurn,
  createBastionForPers,
  loadBastion,
  removeTurn,
  saveTurn,
} from "@/lib/actions/bastion-actions";
import { findNextTurnNumber } from "@/rules/bastions";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { auth } from "@/lib/auth";

beforeEach(resetUserData);
afterAll(disconnectDatabase);

function signInAs(email: string) {
  vi.mocked(auth).mockResolvedValue({ user: { email } } as never);
}

async function createPlayerWithBastion(email: string) {
  const [characterClass, race, background] = await Promise.all([
    prisma.class.findFirstOrThrow({ where: { ruleset: "RULES_2024" } }),
    prisma.race.findFirstOrThrow({ where: { ruleset: "RULES_2024" } }),
    prisma.background.findFirstOrThrow({ where: { ruleset: "RULES_2024" } }),
  ]);

  const user = await prisma.user.create({ data: { email, name: "Тестовий гравець" } });
  const pers = await prisma.pers.create({
    data: {
      userId: user.id,
      name: "Власник бастіону",
      ruleset: "RULES_2024",
      classId: characterClass.classId,
      raceId: race.raceId,
      backgroundId: background.backgroundId,
      level: 5,
      currentHp: 30,
      maxHp: 30,
      str: 14,
      dex: 12,
      con: 14,
      int: 14,
      wis: 12,
      cha: 10,
    },
  });

  signInAs(email);
  const created = await createBastionForPers({ persId: pers.persId, name: "Стара вежа" });
  if (!created.ok) throw new Error(created.error);

  return { user, pers };
}

async function readTurns(persId: number) {
  const loaded = await loadBastion(persId);
  if (!loaded.ok) throw new Error(loaded.error);
  return loaded.standing.bastion?.turns ?? [];
}

describe("журнал ходів — серверні дії", () => {
  it("запис створюється, читається, редагується й видаляється", async () => {
    const { pers } = await createPlayerWithBastion("bastion-journal-crud@example.test");

    const added = await addTurn({
      persId: pers.persId,
      turnNumber: 4,
      entry: "Бібліотека дослідила руїни",
    });
    if (!added.ok) throw new Error(added.error);
    expect(added.standing.bastion?.turns).toMatchObject([
      { turnNumber: 4, entry: "Бібліотека дослідила руїни" },
    ]);

    const turnId = added.standing.bastion!.turns[0].turnId;
    expect(await readTurns(pers.persId)).toMatchObject([{ turnId, turnNumber: 4 }]);

    const saved = await saveTurn({
      persId: pers.persId,
      turnId,
      turnNumber: 5,
      entry: "Кузня закінчила лати",
    });
    if (!saved.ok) throw new Error(saved.error);
    expect(saved.standing.bastion?.turns).toMatchObject([
      { turnId, turnNumber: 5, entry: "Кузня закінчила лати" },
    ]);

    const removed = await removeTurn({ persId: pers.persId, turnId });
    if (!removed.ok) throw new Error(removed.error);
    expect(removed.standing.bastion?.turns).toEqual([]);
    expect(await readTurns(pers.persId)).toEqual([]);
  });

  it("текст записується без обрамляючих пробілів, а порожній запис не приймається", async () => {
    const { pers } = await createPlayerWithBastion("bastion-journal-entry@example.test");

    await expect(
      addTurn({ persId: pers.persId, turnNumber: 1, entry: "   " })
    ).resolves.toEqual({ ok: false, error: "Запис ходу не може бути порожнім" });

    const added = await addTurn({ persId: pers.persId, turnNumber: 1, entry: "  Хід перший  " });
    if (!added.ok) throw new Error(added.error);
    expect(added.standing.bastion?.turns[0].entry).toBe("Хід перший");

    await expect(
      saveTurn({
        persId: pers.persId,
        turnId: added.standing.bastion!.turns[0].turnId,
        turnNumber: 1,
        entry: "",
      })
    ).resolves.toEqual({ ok: false, error: "Запис ходу не може бути порожнім" });
  });

  it("нульовий, відʼємний і дробовий номер ходу дають людську помилку, а не падіння бази", async () => {
    const { pers } = await createPlayerWithBastion("bastion-journal-number@example.test");

    for (const turnNumber of [0, -3, 2.5]) {
      await expect(addTurn({ persId: pers.persId, turnNumber, entry: "Хід" })).resolves.toEqual({
        ok: false,
        error: "Номер ходу — ціле число, не менше 1",
      });
    }
    expect(await readTurns(pers.persId)).toEqual([]);
  });

  it("номер ходу лишається за гравцем: підказка не навʼязується, прогалини й повтори приймаються", async () => {
    const { pers } = await createPlayerWithBastion("bastion-journal-number-free@example.test");

    const tenth = await addTurn({ persId: pers.persId, turnNumber: 10, entry: "Десятий" });
    if (!tenth.ok) throw new Error(tenth.error);
    expect(findNextTurnNumber(tenth.standing.bastion!.turns)).toBe(11);

    const second = await addTurn({ persId: pers.persId, turnNumber: 2, entry: "Другий" });
    if (!second.ok) throw new Error(second.error);
    const repeated = await addTurn({ persId: pers.persId, turnNumber: 2, entry: "Другий, продовження" });
    if (!repeated.ok) throw new Error(repeated.error);

    expect(repeated.standing.bastion?.turns.map((turn) => turn.turnNumber)).toEqual([2, 2, 10]);
  });

  it("чужий запис дія не читає, не редагує й не видаляє", async () => {
    const own = await createPlayerWithBastion("bastion-journal-own@example.test");
    const other = await createPlayerWithBastion("bastion-journal-other@example.test");

    signInAs(other.user.email!);
    const foreign = await addTurn({
      persId: other.pers.persId,
      turnNumber: 1,
      entry: "Чужий запис",
    });
    if (!foreign.ok) throw new Error(foreign.error);
    const foreignTurnId = foreign.standing.bastion!.turns[0].turnId;

    signInAs(own.user.email!);
    await expect(
      saveTurn({
        persId: own.pers.persId,
        turnId: foreignTurnId,
        turnNumber: 1,
        entry: "Перехоплення",
      })
    ).resolves.toEqual({ ok: false, error: "Цей запис не належить журналу персонажа" });
    await expect(
      removeTurn({ persId: own.pers.persId, turnId: foreignTurnId })
    ).resolves.toEqual({ ok: false, error: "Цей запис не належить журналу персонажа" });
    await expect(addTurn({ persId: other.pers.persId, turnNumber: 2, entry: "Не своє" })).resolves.toEqual(
      { ok: false, error: "Немає доступу до персонажа" }
    );

    signInAs(other.user.email!);
    expect(await readTurns(other.pers.persId)).toMatchObject([
      { turnId: foreignTurnId, entry: "Чужий запис" },
    ]);
  });

  it("статі персонажа після створення, редагування й видалення запису не змінюються жодного разу", async () => {
    const { pers } = await createPlayerWithBastion("bastion-journal-stats@example.test");

    const before = await prisma.pers.findUniqueOrThrow({ where: { persId: pers.persId } });

    const added = await addTurn({
      persId: pers.persId,
      turnNumber: 1,
      entry: "Кузня закінчила лати",
    });
    if (!added.ok) throw new Error(added.error);
    const afterAdd = await prisma.pers.findUniqueOrThrow({ where: { persId: pers.persId } });
    expect(afterAdd).toEqual(before);

    const turnId = added.standing.bastion!.turns[0].turnId;
    const saved = await saveTurn({
      persId: pers.persId,
      turnId,
      turnNumber: 2,
      entry: "Бібліотека дослідила руїни",
    });
    if (!saved.ok) throw new Error(saved.error);
    const afterSave = await prisma.pers.findUniqueOrThrow({ where: { persId: pers.persId } });
    expect(afterSave).toEqual(before);

    const removed = await removeTurn({ persId: pers.persId, turnId });
    if (!removed.ok) throw new Error(removed.error);
    const afterRemove = await prisma.pers.findUniqueOrThrow({ where: { persId: pers.persId } });
    expect(afterRemove).toEqual(before);
  });
});
