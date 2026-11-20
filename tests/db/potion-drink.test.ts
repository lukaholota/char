import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { backgroundByName, classByName, raceByName } from "../helpers/seed-lookup";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { auth } from "@/lib/auth";
import { drinkPotion } from "@/lib/actions/magic-item-actions";

const EMAIL = "potion-drink@test.local";

beforeEach(resetUserData);
afterAll(disconnectDatabase);

const findPotion = (engName: string) => prisma.magicItem.findUniqueOrThrow({ where: { engName_ruleset: { engName, ruleset: "RULES_2014" } } });

async function createPersWithPotions(engNames: string[], currentHp = 5) {
  const [fighter, race, background, ...potions] = await Promise.all([
    classByName("FIGHTER_2014"),
    raceByName("HUMAN_2014"),
    backgroundByName("ACOLYTE"),
    ...engNames.map(findPotion),
  ]);
  const user = await prisma.user.create({ data: { email: EMAIL, name: "Тестовий гравець" } });
  const pers = await prisma.pers.create({
    data: {
      userId: user.id,
      name: "Поранений воїн",
      classId: fighter.classId,
      raceId: race.raceId,
      backgroundId: background.backgroundId,
      level: 3,
      currentHp,
      maxHp: 30,
      deathSaveFailures: 1,
      str: 10, dex: 14, con: 14, int: 10, wis: 10, cha: 10,
      magicItems: { create: potions.map((potion) => ({ magicItemId: potion.magicItemId })) },
    },
    include: { magicItems: { orderBy: { persMagicItemId: "asc" } } },
  });
  vi.mocked(auth).mockResolvedValue({ user: { email: EMAIL } } as never);
  return { persId: pers.persId, links: pers.magicItems };
}

const readPers = (persId: number) =>
  prisma.pers.findUniqueOrThrow({
    where: { persId },
    select: { currentHp: true, tempHp: true, deathSaveFailures: true, magicItems: { select: { persMagicItemId: true } }, effects: { select: { effectKey: true, magicItemId: true } } },
  });

describe("випити зілля", () => {
  it("лікування додає ХП, прибирає саме цю пляшку, а повтор нічого не робить", async () => {
    const { persId, links } = await createPersWithPotions(["Potion of Healing", "Potion of Healing"]);
    const result = await drinkPotion(links[0].persMagicItemId);
    expect(result).toMatchObject({ success: true, stateLabel: null });
    const healing = result.success ? result.roll.healing : 0;
    expect(result).toMatchObject({ healed: healing });
    expect(healing).toBeGreaterThanOrEqual(4);
    expect(healing).toBeLessThanOrEqual(10);

    expect(await readPers(persId)).toEqual({
      currentHp: 5 + healing,
      tempHp: 0,
      deathSaveFailures: 0,
      magicItems: [{ persMagicItemId: links[1].persMagicItemId }],
      effects: [],
    });
    expect(await drinkPotion(links[0].persMagicItemId)).toMatchObject({ success: false });
    expect((await readPers(persId)).currentHp).toBe(5 + healing);
  });

  it("за повних ХП лікування не додає нічого, і результат каже про це", async () => {
    const { persId, links } = await createPersWithPotions(["Potion of Healing"], 28);
    const result = await drinkPotion(links[0].persMagicItemId);
    expect(result).toMatchObject({ success: true, healed: 2 });
    expect((await readPers(persId)).currentHp).toBe(30);
  });

  it("героїзм дає тимчасові ХП і стан, що лишається після зникнення пляшки", async () => {
    const { persId, links } = await createPersWithPotions(["Potion of Heroism"]);
    expect(await drinkPotion(links[0].persMagicItemId)).toMatchObject({ success: true, stateLabel: "Випито", healed: 0, roll: { tempHp: 10 } });
    expect(await readPers(persId)).toMatchObject({
      currentHp: 5,
      tempHp: 10,
      magicItems: [],
      effects: [{ effectKey: `ITEM:${links[0].magicItemId}`, magicItemId: links[0].magicItemId }],
    });
  });

  it("чужий персонаж і не-зілля не п'ються", async () => {
    const { links } = await createPersWithPotions(["Potion of Healing"]);
    vi.mocked(auth).mockResolvedValue({ user: { email: "stranger@test.local" } } as never);
    expect(await drinkPotion(links[0].persMagicItemId)).toMatchObject({ success: false });

    vi.mocked(auth).mockResolvedValue({ user: { email: EMAIL } } as never);
    const ring = await prisma.magicItem.findUniqueOrThrow({ where: { engName_ruleset: { engName: "Ring of Protection", ruleset: "RULES_2014" } } });
    const ringLink = await prisma.persMagicItem.create({ data: { persId: links[0].persId, magicItemId: ring.magicItemId } });
    expect(await drinkPotion(ringLink.persMagicItemId)).toEqual({ success: false, error: "Це не зілля" });
    expect(await prisma.persMagicItem.count({ where: { persId: links[0].persId } })).toBe(2);
  });
});
