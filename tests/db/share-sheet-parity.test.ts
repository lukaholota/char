/**
 * KR31.7 / L12-secondary-flows-05 — спільна сторінка листа вантажить персонажа так само, як власний
 * лист, окрім даних власника.
 */

import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { backgroundByName, classByName, raceByName } from "../helpers/seed-lookup";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { auth } from "@/lib/auth";
import { getPersById } from "@/server/db/pers-actions";
import { getFolderByShareToken, getPersByShareToken } from "@/server/db/share-actions";

const EMAIL = "share-sheet-parity@test.local";

beforeEach(resetUserData);
afterAll(disconnectDatabase);

async function createFighter2024WithMasteryAndOptions() {
  const [cls, race, background, longsword, optionalFeature, choiceOption] = await Promise.all([
    classByName("FIGHTER_2024"),
    raceByName("HUMAN_2024"),
    backgroundByName("SOLDIER"),
    prisma.weapon.findUniqueOrThrow({ where: { name_ruleset: { name: "LONGSWORD", ruleset: "RULES_2024" } } }),
    prisma.classOptionalFeature.findFirstOrThrow({ where: { feature: { isNot: null } } }),
    prisma.choiceOption.findFirstOrThrow({ where: { ruleset: "RULES_2024", features: { some: {} } } }),
  ]);
  const user = await prisma.user.create({ data: { email: EMAIL, name: "Власник" } });
  const pers = await prisma.pers.create({
    data: {
      userId: user.id,
      name: "Воїн",
      ruleset: "RULES_2024",
      shareToken: "share-sheet-parity-token",
      classId: cls.classId,
      raceId: race.raceId,
      backgroundId: background.backgroundId,
      level: 3,
      currentHp: 28,
      maxHp: 28,
      str: 16, dex: 12, con: 14, int: 10, wis: 10, cha: 10,
      weapons: { create: [{ weaponId: longsword.weaponId }] },
      pers_weapon_mastery: { create: [{ weapon_id: longsword.weaponId }] },
      classOptionalFeatures: { connect: [{ optionalFeatureId: optionalFeature.optionalFeatureId }] },
      choiceOptions: { connect: [{ choiceOptionId: choiceOption.choiceOptionId }] },
    },
  });
  vi.mocked(auth).mockResolvedValue({ user: { email: EMAIL } } as never);
  return pers;
}

describe("спільний лист дорівнює власному", () => {
  it("майстерність зброї, опційні класові фічі й фічі виборів доїжджають на спільну сторінку", async () => {
    const pers = await createFighter2024WithMasteryAndOptions();

    const own = await getPersById(pers.persId);
    const shared = await getPersByShareToken("share-sheet-parity-token");
    if (!own || !shared.pers) throw new Error("персонажа не завантажено");
    const { user: _owner, ...ownWithoutOwner } = own;

    expect(shared.pers).toEqual(ownWithoutOwner);
    expect(shared.pers).not.toHaveProperty("user");
  });

  it("L12-secondary-flows-12 — спільна тека віддає редакцію й мультиклас персонажа", async () => {
    const pers = await createFighter2024WithMasteryAndOptions();
    const wizard = await classByName("WIZARD_2024");
    await prisma.persMulticlass.create({ data: { persId: pers.persId, classId: wizard.classId, classLevel: 1 } });
    const folder = await prisma.persFolder.create({ data: { userId: pers.userId, name: "Тека" } });
    await prisma.pers.update({ where: { persId: pers.persId }, data: { folderId: folder.folderId } });
    await prisma.persFolderShareToken.create({ data: { folderId: folder.folderId, token: "folder-parity-token", canEdit: false } });

    const shared = await getFolderByShareToken("folder-parity-token");
    const listed = shared?.folder.perses.find((entry) => entry.persId === pers.persId);

    expect(listed?.ruleset).toBe("RULES_2024");
    expect(listed?.multiclasses.map((multiclass) => multiclass.class.name)).toEqual(["WIZARD_2024"]);
  });
});
