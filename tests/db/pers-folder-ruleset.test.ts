import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Ruleset } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { backgroundByName, classByName, raceByName } from "../helpers/seed-lookup";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { auth } from "@/lib/auth";
import {
  createPersFolder,
  duplicatePersFolder,
  getUserPersHomeData,
  movePersFolder,
  movePersToFolder,
} from "@/server/db/pers-actions";
import { copyFolderByShareToken } from "@/server/db/share-actions";

const OWNER_EMAIL = "folder-ruleset-owner@test.local";
const COPIER_EMAIL = "folder-ruleset-copier@test.local";

beforeEach(resetUserData);
afterAll(disconnectDatabase);

function signInAs(email: string) {
  vi.mocked(auth).mockResolvedValue({ user: { email } } as never);
}

async function createOwner() {
  const user = await prisma.user.create({ data: { email: OWNER_EMAIL, name: "Власник" } });
  signInAs(OWNER_EMAIL);
  return user;
}

async function createPers(userId: number, ruleset: Ruleset) {
  const is2024 = ruleset === "RULES_2024";
  const [cls, race, background] = await Promise.all([
    classByName(is2024 ? "FIGHTER_2024" : "FIGHTER"),
    raceByName(is2024 ? "HUMAN_2024" : "HUMAN"),
    backgroundByName(is2024 ? "SOLDIER_2024" : "SOLDIER"),
  ]);
  return prisma.pers.create({
    data: {
      userId,
      name: `Воїн ${ruleset}`,
      ruleset,
      classId: cls.classId,
      raceId: race.raceId,
      backgroundId: background.backgroundId,
      level: 1,
      currentHp: 10,
      maxHp: 10,
      str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10,
    },
  });
}

describe("папка належить одній редакції", () => {
  it("сторінка редакції бачить лише свої папки", async () => {
    const owner = await createOwner();
    await prisma.persFolder.create({ data: { userId: owner.id, name: "Стара", ruleset: "RULES_2014" } });
    await prisma.persFolder.create({ data: { userId: owner.id, name: "Нова", ruleset: "RULES_2024" } });

    const home2014 = await getUserPersHomeData({ ruleset: "RULES_2014" });
    const home2024 = await getUserPersHomeData({ ruleset: "RULES_2024" });

    expect(home2014.folders.map((folder) => folder.name)).toEqual(["Стара"]);
    expect(home2024.folders.map((folder) => folder.name)).toEqual(["Нова"]);
  });

  it("нова папка отримує редакцію сторінки, а підпапка — лише редакцію батька", async () => {
    await createOwner();

    const created = await createPersFolder({ name: "Кампанія", ruleset: "RULES_2024" });
    if (!created.success) throw new Error(created.error);
    const mismatchedChild = await createPersFolder({
      name: "Підпапка",
      ruleset: "RULES_2014",
      parentFolderId: created.folder.folderId,
    });

    expect(await prisma.persFolder.findUniqueOrThrow({ where: { folderId: created.folder.folderId } }))
      .toMatchObject({ ruleset: "RULES_2024" });
    expect(mismatchedChild.success).toBe(false);
  });

  it("персонажа не кладуть у папку іншої редакції", async () => {
    const owner = await createOwner();
    const pers = await createPers(owner.id, "RULES_2024");
    const folder2014 = await prisma.persFolder.create({ data: { userId: owner.id, name: "Стара", ruleset: "RULES_2014" } });

    const result = await movePersToFolder(pers.persId, folder2014.folderId);

    expect(result.success).toBe(false);
    expect(await prisma.pers.findUniqueOrThrow({ where: { persId: pers.persId } })).toMatchObject({ folderId: null });
  });

  it("папку не вкладають у папку іншої редакції", async () => {
    const owner = await createOwner();
    const folder2014 = await prisma.persFolder.create({ data: { userId: owner.id, name: "Стара", ruleset: "RULES_2014" } });
    const folder2024 = await prisma.persFolder.create({ data: { userId: owner.id, name: "Нова", ruleset: "RULES_2024" } });

    const result = await movePersFolder(folder2024.folderId, folder2014.folderId);

    expect(result.success).toBe(false);
  });

  it("копія папки лишається в редакції оригіналу", async () => {
    const owner = await createOwner();
    const source = await prisma.persFolder.create({ data: { userId: owner.id, name: "Нова", ruleset: "RULES_2024" } });
    await prisma.persFolder.create({
      data: { userId: owner.id, name: "Вкладена", ruleset: "RULES_2024", parentFolderId: source.folderId },
    });
    await prisma.persFolderShareToken.create({ data: { folderId: source.folderId, token: "folder-ruleset-token", canEdit: false } });

    const duplicated = await duplicatePersFolder(source.folderId);
    await prisma.user.create({ data: { email: COPIER_EMAIL, name: "Гість" } });
    signInAs(COPIER_EMAIL);
    const copied = await copyFolderByShareToken("folder-ruleset-token");
    if (!duplicated.success || !("success" in copied)) throw new Error("папку не скопійовано");

    const copies = await prisma.persFolder.findMany({
      where: { NOT: { folderId: source.folderId }, name: { not: "Вкладена" }, parentFolderId: null },
      select: { ruleset: true },
    });
    const nestedCopies = await prisma.persFolder.findMany({ where: { name: "Вкладена" }, select: { ruleset: true } });

    expect(copies).toEqual([{ ruleset: "RULES_2024" }, { ruleset: "RULES_2024" }]);
    expect(nestedCopies).toEqual([{ ruleset: "RULES_2024" }, { ruleset: "RULES_2024" }, { ruleset: "RULES_2024" }]);
  });
});
