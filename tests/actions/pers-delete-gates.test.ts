import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { BackgroundCategory, Classes, Races } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createCharacter } from "@/lib/actions/character";
import { deletePers } from "@/server/db/pers-actions";
import { minimalForm } from "../helpers/build-form";
import { backgroundByName, classByName, raceByName } from "../helpers/seed-lookup";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { auth } from "@/lib/auth";

beforeEach(resetUserData);
afterAll(disconnectDatabase);

function signInAs(email: string): void {
  vi.mocked(auth).mockResolvedValue({ user: { email } } as never);
}

async function createFighter(ownerEmail: string) {
  signInAs(ownerEmail);
  const [race, characterClass, background] = await Promise.all([
    raceByName(Races.HUMAN_2014),
    classByName(Classes.FIGHTER_2014),
    backgroundByName(BackgroundCategory.SOLDIER),
  ]);
  const created = await createCharacter(
    minimalForm({ raceId: race.raceId, classId: characterClass.classId, backgroundId: background.backgroundId }),
  );
  if ("error" in created || !created.persId) {
    throw new Error("error" in created ? created.error : "Character not created");
  }
  return created.persId;
}

describe("KR31.9 — видалення персонажа доступне лише власнику (L12-secondary-flows-11)", () => {
  it("власник видаляє власного персонажа", async () => {
    const owner = await prisma.user.create({ data: { email: `owner-${Math.random()}@holota.family`, name: "Owner" } });
    const persId = await createFighter(owner.email);

    signInAs(owner.email);
    const result = await deletePers(persId);

    expect(result).toEqual({ success: true });
    await expect(prisma.pers.findUnique({ where: { persId } })).resolves.toBeNull();
  });

  it("співвласник за посиланням на редагування не може знищити персонажа власника — лише відвʼязується сам", async () => {
    const owner = await prisma.user.create({ data: { email: `owner-${Math.random()}@holota.family`, name: "Owner" } });
    const coOwner = await prisma.user.create({ data: { email: `co-owner-${Math.random()}@holota.family`, name: "Co-owner" } });
    const persId = await createFighter(owner.email);

    await prisma.persAdditionalUser.create({ data: { persId, userId: coOwner.id } });

    signInAs(coOwner.email);
    const result = await deletePers(persId);

    expect(result).toEqual({ success: true, unlinked: true });
    await expect(prisma.pers.findUnique({ where: { persId } })).resolves.not.toBeNull();
    await expect(
      prisma.persAdditionalUser.findUnique({ where: { persId_userId: { persId, userId: coOwner.id } } }),
    ).resolves.toBeNull();
  });

  it("сторонній без доступу не може видалити чужого персонажа", async () => {
    const owner = await prisma.user.create({ data: { email: `owner-${Math.random()}@holota.family`, name: "Owner" } });
    const stranger = await prisma.user.create({ data: { email: `stranger-${Math.random()}@holota.family`, name: "Stranger" } });
    const persId = await createFighter(owner.email);

    signInAs(stranger.email);
    const result = await deletePers(persId);

    expect(result).toEqual({ success: false, error: "Немає доступу до персонажа" });
    await expect(prisma.pers.findUnique({ where: { persId } })).resolves.not.toBeNull();
  });

  it("видалення власником прибирає знімки за parentPersId навіть якщо їхній userId розходиться з власником", async () => {
    const owner = await prisma.user.create({ data: { email: `owner-${Math.random()}@holota.family`, name: "Owner" } });
    const otherUser = await prisma.user.create({ data: { email: `other-${Math.random()}@holota.family`, name: "Other" } });
    const persId = await createFighter(owner.email);

    const pers = await prisma.pers.findUniqueOrThrow({ where: { persId } });
    const { persId: _omit, createdAt: _createdAt, updatedAt: _updatedAt, ...rest } = pers;
    const snapshot = await prisma.pers.create({
      data: {
        ...rest,
        userId: otherUser.id,
        isSnapshot: true,
        isActive: false,
        parentPersId: persId,
        name: `${pers.name} (Рівень 1)`,
      },
    });

    signInAs(owner.email);
    const result = await deletePers(persId);

    expect(result).toEqual({ success: true });
    await expect(prisma.pers.findUnique({ where: { persId: snapshot.persId } })).resolves.toBeNull();
  });
});
