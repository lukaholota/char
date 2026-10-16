import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { BackgroundCategory, Classes, Races } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createCharacter } from "@/lib/actions/character";
import { applyHpChange, setDeathSaves } from "@/lib/actions/combat-actions";
import { minimalForm } from "../helpers/build-form";
import { backgroundByName, classByName, raceByName } from "../helpers/seed-lookup";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { auth } from "@/lib/auth";

beforeEach(resetUserData);
afterAll(disconnectDatabase);

async function createFighter(email: string) {
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
  return created.persId;
}

describe("combat actions", () => {
  it("uses temporary HP first and stabilizes after three death-save successes", async () => {
    const persId = await createFighter("combat-actions@golden.test");

    await prisma.pers.update({
      where: { persId },
      data: { currentHp: 10, maxHp: 10, tempHp: 4 },
    });

    await expect(applyHpChange({ persId, mode: "damage", amount: 6 }))
      .resolves.toMatchObject({ success: true, currentHp: 8, tempHp: 0 });
    await expect(setDeathSaves({ persId, successes: 3, failures: 1 }))
      .resolves.toMatchObject({
        success: true,
        currentHp: 1,
        deathSaveSuccesses: 0,
        deathSaveFailures: 0,
        isDead: false,
      });
  });
});

const COMBAT_STATE = {
  currentHp: true,
  maxHp: true,
  tempHp: true,
  deathSaveSuccesses: true,
  deathSaveFailures: true,
  isDead: true,
  heroicInspirationCount: true,
  canStackHeroicInspiration: true,
} as const;

const HEALTHY = { currentHp: 10, maxHp: 10, tempHp: 0, deathSaveSuccesses: 0, deathSaveFailures: 0, isDead: false };

type CombatFields = typeof HEALTHY;
type HpCase = {
  name: string;
  before: Partial<CombatFields>;
  change: { mode: "damage" | "heal" | "temp"; amount: number };
  after: Partial<CombatFields>;
};

const HP_CASES: HpCase[] = [
  { name: "шкода спершу знімає тимчасові хіти", before: { tempHp: 4 }, change: { mode: "damage", amount: 6 }, after: { currentHp: 8, tempHp: 0 } },
  {
    name: "шкода до нуля лишає кидки смерті",
    before: { currentHp: 3, deathSaveSuccesses: 1, deathSaveFailures: 2 },
    change: { mode: "damage", amount: 10 },
    after: { currentHp: 0 },
  },
  {
    name: "лікування з нуля скидає кидки смерті й смерть",
    before: { currentHp: 0, deathSaveSuccesses: 1, deathSaveFailures: 3, isDead: true },
    change: { mode: "heal", amount: 4 },
    after: { currentHp: 4, deathSaveSuccesses: 0, deathSaveFailures: 0, isDead: false },
  },
  { name: "лікування не піднімає понад максимум", before: { currentHp: 8 }, change: { mode: "heal", amount: 5 }, after: { currentHp: 10 } },
  { name: "менші тимчасові хіти не замінюють більших", before: { tempHp: 5 }, change: { mode: "temp", amount: 3 }, after: { tempHp: 5 } },
  { name: "більші тимчасові хіти замінюють менші", before: { tempHp: 5 }, change: { mode: "temp", amount: 7 }, after: { tempHp: 7 } },
];

describe.each([
  { path: "без ідентифікатора операції", nextOperationId: (): string | undefined => undefined },
  { path: "з ідентифікатором операції", nextOperationId: (): string | undefined => randomUUID() },
])("Хіти з листа $path", ({ nextOperationId }) => {
  it("шкода, лікування й тимчасові хіти змінюють стан і повертають увесь бойовий стан", async () => {
    const persId = await createFighter("combat-hp-cases@golden.test");
    const readState = () => prisma.pers.findUniqueOrThrow({ where: { persId }, select: COMBAT_STATE });

    for (const { name, before, change, after } of HP_CASES) {
      await prisma.pers.update({ where: { persId }, data: { ...HEALTHY, ...before } });

      const result = await applyHpChange({ persId, ...change, operationId: nextOperationId() });
      const state = await readState();

      expect(state, name).toMatchObject({ ...HEALTHY, ...before, ...after });
      expect(result, name).toEqual({ success: true, ...state });
    }
  });

  it("невідомий режим і чужий гравець нічого не змінюють", async () => {
    const persId = await createFighter("combat-hp-owner@golden.test");
    await prisma.pers.update({ where: { persId }, data: HEALTHY });

    await expect(applyHpChange({ persId, mode: "poison" as never, amount: 3, operationId: nextOperationId() }))
      .resolves.toEqual({ success: false, error: "Невідомий режим" });

    await prisma.user.create({ data: { email: "combat-hp-stranger@golden.test", name: "Чужий" } });
    vi.mocked(auth).mockResolvedValue({ user: { email: "combat-hp-stranger@golden.test" } } as never);
    await expect(applyHpChange({ persId, mode: "damage", amount: 3, operationId: nextOperationId() }))
      .resolves.toEqual({ success: false, error: "Немає доступу до персонажа" });

    expect(await prisma.pers.findUniqueOrThrow({ where: { persId }, select: COMBAT_STATE })).toMatchObject(HEALTHY);
  });
});
