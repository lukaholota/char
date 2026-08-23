import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { BackgroundCategory, Classes, Races } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createCharacter } from "@/lib/actions/character";
import { searchUserPersAndFolders } from "@/server/db/pers-search-actions";
import { minimalForm } from "../helpers/build-form";
import { backgroundByName, classByName, raceByName } from "../helpers/seed-lookup";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { auth } from "@/lib/auth";

beforeEach(resetUserData);
afterAll(disconnectDatabase);

async function createPersAs(email: string, name: string) {
  const user = await prisma.user.create({ data: { email, name: email } });
  vi.mocked(auth).mockResolvedValue({ user: { email } } as never);

  const [race, characterClass, background] = await Promise.all([
    raceByName(Races.HUMAN_2014),
    classByName(Classes.FIGHTER_2014),
    backgroundByName(BackgroundCategory.SOLDIER),
  ]);
  const created = await createCharacter(
    minimalForm({ name, raceId: race.raceId, classId: characterClass.classId, backgroundId: background.backgroundId }),
  );
  if ("error" in created) throw new Error(created.error);

  return { user, persId: created.persId };
}

describe("searchUserPersAndFolders — ізоляція (KR13.4, пункт 7)", () => {
  it("власник і той, кому дали доступ, бачать персонажа; чужий і знімок — ні", async () => {
    const owner = await createPersAs("iskandar-owner@golden.test", "Іскандер Основний");
    const stranger = await createPersAs("iskandar-stranger@golden.test", "Іскандер Чужинець");

    const grantedUser = await prisma.user.create({
      data: { email: "iskandar-granted@golden.test", name: "Granted User" },
    });
    await prisma.persAdditionalUser.create({
      data: { persId: owner.persId, userId: grantedUser.id },
    });

    const snapshot = await prisma.pers.findUniqueOrThrow({ where: { persId: owner.persId } });
    await prisma.pers.create({
      data: {
        ...snapshot,
        persId: undefined,
        name: "Іскандер Основний (Знімок)",
        isSnapshot: true,
        isActive: false,
        parentPersId: owner.persId,
        snapshotLevel: 1,
      },
    });

    vi.mocked(auth).mockResolvedValue({ user: { email: "iskandar-owner@golden.test" } } as never);
    const ownerHits = await searchUserPersAndFolders("Іскандер");
    expect(ownerHits.map((hit) => hit.title)).toEqual(["Іскандер Основний"]);

    vi.mocked(auth).mockResolvedValue({ user: { email: "iskandar-granted@golden.test" } } as never);
    const grantedHits = await searchUserPersAndFolders("Іскандер");
    expect(grantedHits.map((hit) => hit.title)).toEqual(["Іскандер Основний"]);

    vi.mocked(auth).mockResolvedValue({ user: { email: "iskandar-stranger@golden.test" } } as never);
    const strangerHits = await searchUserPersAndFolders("Іскандер");
    expect(strangerHits.map((hit) => hit.title)).toEqual(["Іскандер Чужинець"]);

    void stranger;
  });
});
