import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { BackgroundCategory, Classes, Races } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { disconnectDatabase, resetUserData } from "../user-data";
import { minimalForm } from "../helpers/build-form";
import { backgroundByName, classByName, raceByName } from "../helpers/seed-lookup";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { auth } from "@/lib/auth";
import { updateBonus } from "@/lib/actions/bonus-actions";
import { createCharacter } from "@/lib/actions/character";

beforeEach(resetUserData);
afterAll(disconnectDatabase);

async function createOwnedFighter(): Promise<number> {
  const user = await prisma.user.create({ data: { email: "passive-bonuses@test.local", name: "Passive" } });
  vi.mocked(auth).mockResolvedValue({ user: { email: user.email } } as never);
  const [race, fighter, soldier] = await Promise.all([
    raceByName(Races.HUMAN_2014),
    classByName(Classes.FIGHTER_2014),
    backgroundByName(BackgroundCategory.SOLDIER),
  ]);
  const created = await createCharacter(minimalForm({ raceId: race.raceId, classId: fighter.classId, backgroundId: soldier.backgroundId }));
  if ("error" in created || !created.persId) throw new Error("персонажа не створено");
  return created.persId;
}

const readPassiveBonuses = (persId: number) =>
  prisma.pers.findUniqueOrThrow({ where: { persId }, select: { passiveBonuses: true } }).then((row) => row.passiveBonuses);

describe("ручний бонус до пасивних значень", () => {
  it("зберігає бонус окремо для кожного пасивного значення", async () => {
    const persId = await createOwnedFighter();

    await updateBonus(persId, "passive", "PERCEPTION", 3);
    await updateBonus(persId, "passive", "INSIGHT", -1);

    expect(await readPassiveBonuses(persId)).toEqual({ PERCEPTION: 3, INSIGHT: -1 });
  });

  it("нульовий бонус прибирає ключ, а порожня мапа стає NULL у базі, а не JSON null", async () => {
    const persId = await createOwnedFighter();
    await updateBonus(persId, "passive", "PERCEPTION", 3);

    await updateBonus(persId, "passive", "PERCEPTION", 0);

    const [row] = await prisma.$queryRaw<Array<{ is_sql_null: boolean }>>`select passive_bonuses is null as is_sql_null from pers where pers_id = ${persId}`;
    expect(row.is_sql_null).toBe(true);
  });

  it("навичка без пасивного значення не приймається", async () => {
    const persId = await createOwnedFighter();

    const result = await updateBonus(persId, "passive", "ATHLETICS", 2);

    expect(result.success).toBe(false);
    expect(await readPassiveBonuses(persId)).toBeNull();
  });
});
