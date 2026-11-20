import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { backgroundByName, classByName, raceByName } from "../helpers/seed-lookup";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { auth } from "@/lib/auth";
import { setItemState } from "@/server/db/pers-effects";
import { getPersById } from "@/server/db/pers-actions";
import { shortRest } from "@/server/db/rest-actions";
import { applyActiveStates, findRollState } from "@/lib/logic/active-states";

const EMAIL = "magic-item-states@test.local";

beforeEach(resetUserData);
afterAll(disconnectDatabase);

const findItem = (engName: string) =>
  prisma.magicItem.findUniqueOrThrow({ where: { engName_ruleset: { engName, ruleset: "RULES_2014" } } });

async function createRogueWithItems(engNames: string[]) {
  const [rogue, race, background, ...items] = await Promise.all([
    classByName("ROGUE_2014"),
    raceByName("HUMAN_2014"),
    backgroundByName("ACOLYTE"),
    ...engNames.map(findItem),
  ]);
  const user = await prisma.user.create({ data: { email: EMAIL, name: "Тестовий гравець" } });
  const pers = await prisma.pers.create({
    data: {
      userId: user.id,
      name: "Злодій у плащі",
      classId: rogue.classId,
      raceId: race.raceId,
      backgroundId: background.backgroundId,
      level: 3,
      currentHp: 20,
      maxHp: 20,
      str: 10, dex: 16, con: 12, int: 10, wis: 12, cha: 10,
      magicItems: { create: items.map((item) => ({ magicItemId: item.magicItemId, isEquipped: true, isAttuned: true })) },
    },
  });
  vi.mocked(auth).mockResolvedValue({ user: { email: EMAIL } } as never);
  return { persId: pers.persId, itemIds: items.map((item) => item.magicItemId) };
}

const stealthMode = async (persId: number) =>
  findRollState(applyActiveStates((await getPersById(persId))!), { kind: "check", ability: "DEX", skill: "STEALTH" }).mode;

describe("стани магічних предметів на сервері", () => {
  it("каптур ельфійського плаща вмикається, дає перевагу на Непомітність і гасне на короткому відпочинку", async () => {
    const { persId, itemIds: [cloakId] } = await createRogueWithItems(["Cloak of Elvenkind"]);
    expect(await setItemState({ persId, magicItemId: cloakId, isActive: true })).toEqual({ success: true });
    expect(await setItemState({ persId, magicItemId: cloakId, isActive: true })).toEqual({ success: true });
    expect(await stealthMode(persId)).toBe("ADVANTAGE");

    expect((await shortRest(persId, [])).success).toBe(true);
    expect(await prisma.persEffect.count({ where: { persId } })).toBe(0);
    expect(await stealthMode(persId)).toBe("NORMAL");
  });

  it("не вмикає стан чужого чи пасивного предмета", async () => {
    const { persId, itemIds: [protectionId] } = await createRogueWithItems(["Cloak of Protection"]);
    const cloak = await findItem("Cloak of Elvenkind");
    expect(await setItemState({ persId, magicItemId: protectionId, isActive: true })).toMatchObject({ success: false });
    expect(await setItemState({ persId, magicItemId: cloak.magicItemId, isActive: true })).toMatchObject({ success: false });
    expect(await prisma.persEffect.count({ where: { persId } })).toBe(0);
  });
});
