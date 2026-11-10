import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { BackgroundCategory, Classes, Races } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createCharacter } from "@/lib/actions/character";
import { canEditPers, deletePers, duplicatePers, getPersForSheet, movePersToFolder, setPersPinned } from "@/server/db/pers-actions";
import { applyOwnedOfflineOperation } from "@/server/db/offline-operations";
import { minimalForm } from "../helpers/build-form";
import { backgroundByName, classByName, raceByName } from "../helpers/seed-lookup";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { auth } from "@/lib/auth";

beforeEach(resetUserData);
afterAll(disconnectDatabase);

function signInAs(user: { id: number; email: string }) {
  vi.mocked(auth).mockResolvedValue({ user: { id: String(user.id), email: user.email } } as never);
}

async function createUser(email: string) {
  return prisma.user.create({ data: { email, name: email } });
}

async function createPersFor(user: { id: number; email: string }, name: string) {
  signInAs(user);
  const [race, characterClass, background] = await Promise.all([raceByName(Races.HUMAN_2014), classByName(Classes.FIGHTER_2014), backgroundByName(BackgroundCategory.SOLDIER)]);
  const created = await createCharacter(minimalForm({ name, raceId: race.raceId, classId: characterClass.classId, backgroundId: background.backgroundId }));
  if ("error" in created) throw new Error(created.error);
  return created.persId;
}

async function createRoom(gmUserId: number, members: { userId: number; persId: number | null }[], archivedAt: Date | null = null) {
  const room = await prisma.gameSession.create({
    data: { ownerUserId: gmUserId, name: "Стіл", inviteToken: `token-${gmUserId}-${members.length}-${Number(archivedAt)}`, archivedAt, members: { create: { userId: gmUserId, role: "GM" } } },
  });
  await prisma.gameSessionMember.createMany({ data: members.map((member) => ({ gameSessionId: room.id, userId: member.userId, persId: member.persId, role: "PLAYER" as const })) });
  return room;
}

async function createTable() {
  const [gm, player, otherPlayer] = await Promise.all([createUser("room-gm@golden.test"), createUser("room-player@golden.test"), createUser("room-other@golden.test")]);
  const persId = await createPersFor(player, "Торин");
  return { gm, player, otherPlayer, persId };
}

describe("майстер кімнати має доступ до листів своїх гравців", () => {
  it("майстер активної кімнати бачить і редагує лист гравця, зокрема через офлайн-чергу", async () => {
    const { gm, player, persId } = await createTable();
    await createRoom(gm.id, [{ userId: player.id, persId }]);
    signInAs(gm);

    await expect(canEditPers(persId, gm.id)).resolves.toBe(true);
    expect((await getPersForSheet(persId))?.persId).toBe(persId);

    const hpBefore = (await prisma.pers.findUniqueOrThrow({ where: { persId }, select: { currentHp: true } })).currentHp;
    const applied = await applyOwnedOfflineOperation(gm.id, { kind: "hp", mode: "damage", amount: 1, operationId: "op-room-gm-0001", persId, createdAt: new Date().toISOString() });
    expect(applied).toEqual({ ok: true, duplicate: false });
    expect((await prisma.pers.findUniqueOrThrow({ where: { persId }, select: { currentHp: true } })).currentHp).toBe(hpBefore - 1);
  });

  it("сусід за столом не отримує доступу до чужого листа", async () => {
    const { gm, player, otherPlayer, persId } = await createTable();
    await createRoom(gm.id, [{ userId: player.id, persId }, { userId: otherPlayer.id, persId: null }]);
    signInAs(otherPlayer);

    await expect(canEditPers(persId, otherPlayer.id)).resolves.toBe(false);
    await expect(getPersForSheet(persId)).resolves.toBeNull();
    expect((await applyOwnedOfflineOperation(otherPlayer.id, { kind: "hp", mode: "damage", amount: 1, operationId: "op-room-other-01", persId, createdAt: new Date().toISOString() })).ok).toBe(false);
  });

  it("майстер іншої кімнати, архівної кімнати або кімнати без цього персонажа доступу не має", async () => {
    const { gm, player, otherPlayer, persId } = await createTable();
    await createRoom(otherPlayer.id, [{ userId: player.id, persId: null }]);
    await createRoom(gm.id, [{ userId: player.id, persId }], new Date());

    await expect(canEditPers(persId, otherPlayer.id)).resolves.toBe(false);
    await expect(canEditPers(persId, gm.id)).resolves.toBe(false);
  });

  it("майстер не може видалити, скопіювати, перенести чи закріпити персонажа гравця", async () => {
    const { gm, player, persId } = await createTable();
    await createRoom(gm.id, [{ userId: player.id, persId }]);
    signInAs(gm);

    expect(await deletePers(persId)).toEqual({ success: false, error: "Немає доступу до персонажа" });
    expect(await duplicatePers(persId)).toMatchObject({ success: false });
    expect(await movePersToFolder(persId, null)).toMatchObject({ success: false });
    expect(await setPersPinned(persId, true)).toMatchObject({ success: false });
    await expect(prisma.pers.count({ where: { persId } })).resolves.toBe(1);
  });
});
