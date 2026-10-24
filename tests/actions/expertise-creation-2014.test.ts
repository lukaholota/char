import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { BackgroundCategory, Classes, Races, SkillProficiencyType, Skills } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { PersFormData } from "@/lib/zod/schemas/persCreateSchema";
import { minimalForm } from "../helpers/build-form";
import { backgroundByName, classByName, raceByName } from "../helpers/seed-lookup";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), unstable_cache: <T>(fn: T) => fn }));

import { auth } from "@/lib/auth";
import { createCharacter } from "@/lib/actions/character";

vi.setConfig({ testTimeout: 120_000 });

beforeEach(resetUserData);
afterAll(disconnectDatabase);

async function signIn(handle: string) {
  const user = await prisma.user.create({ data: { email: `${handle}-${Math.random()}@holota.family`, name: handle } });
  vi.mocked(auth).mockResolvedValue({ user: { email: user.email } } as never);
}

async function buildForm(characterClass: Classes, skills: Skills[], expertises: Skills[], overrides: Partial<PersFormData> = {}) {
  const [race, cls, background] = await Promise.all([raceByName(Races.HUMAN_2014), classByName(characterClass), backgroundByName(BackgroundCategory.CRIMINAL)]);
  return minimalForm({
    raceId: race.raceId, classId: cls.classId, backgroundId: background.backgroundId,
    skills, expertiseSchema: { expertises }, ...overrides,
  });
}

async function readExpertiseNames(persId: number) {
  const rows = await prisma.persSkill.findMany({ where: { persId, proficiencyType: SkillProficiencyType.EXPERTISE }, select: { name: true }, orderBy: { name: "asc" } });
  return rows.map((row) => row.name);
}

const ROGUE_SKILLS = [Skills.STEALTH, Skills.SLEIGHT_OF_HAND, Skills.PERCEPTION, Skills.ACROBATICS];

describe("Експертиза при створенні 2014: сервер перевіряє кількість, володіння й джерело", () => {
  it("Пройдисвіт із двома експертизами в навичках, якими володіє, створюється", async () => {
    await signIn("expertise-rogue-valid");
    const form = await buildForm(Classes.ROGUE_2014, ROGUE_SKILLS, [Skills.STEALTH, Skills.SLEIGHT_OF_HAND]);
    const created = await createCharacter(form);
    expect(created).not.toHaveProperty("error");
    expect(await readExpertiseNames((created as { persId: number }).persId)).toEqual([Skills.SLEIGHT_OF_HAND, Skills.STEALTH]);
  });

  it("Пройдисвіт з однією, з трьома експертизами чи з повтором не створюється, нічого не записано", async () => {
    await signIn("expertise-rogue-count");
    const tooFew = await buildForm(Classes.ROGUE_2014, ROGUE_SKILLS, [Skills.STEALTH]);
    expect(await createCharacter(tooFew)).toMatchObject({ error: "Оберіть рівно 2 навичок для експертизи" });

    const tooMany = await buildForm(Classes.ROGUE_2014, ROGUE_SKILLS, [Skills.STEALTH, Skills.SLEIGHT_OF_HAND, Skills.PERCEPTION]);
    expect(await createCharacter(tooMany)).toMatchObject({ error: "Оберіть рівно 2 навичок для експертизи" });

    const repeated = await buildForm(Classes.ROGUE_2014, ROGUE_SKILLS, [Skills.STEALTH, Skills.STEALTH]);
    expect(await createCharacter(repeated)).toMatchObject({ error: "Не можна обрати ту саму експертизу двічі" });
    expect(await prisma.pers.count()).toBe(0);
  });

  it("Пройдисвіт з експертизою в навичці без володіння не створюється", async () => {
    await signIn("expertise-rogue-not-proficient");
    const form = await buildForm(Classes.ROGUE_2014, ROGUE_SKILLS, [Skills.STEALTH, Skills.ARCANA]);
    expect(await createCharacter(form)).toMatchObject({ error: "Обрані навички не відповідають доступним варіантам експертизи" });
    expect(await prisma.pers.count()).toBe(0);
  });

  it("Воїн без уміння, що дає експертизу, не може її обрати", async () => {
    await signIn("expertise-fighter-no-source");
    const form = await buildForm(Classes.FIGHTER_2014, [Skills.ATHLETICS, Skills.PERCEPTION], [Skills.ATHLETICS]);
    expect(await createCharacter(form)).toMatchObject({ error: "Оберіть рівно 0 навичок для експертизи" });
    expect(await prisma.pers.count()).toBe(0);
  });

  it("Воїн без експертизи створюється, а в рядках навичок її немає", async () => {
    await signIn("expertise-fighter-none");
    const form = await buildForm(Classes.FIGHTER_2014, [Skills.ATHLETICS, Skills.PERCEPTION], []);
    const created = await createCharacter(form);
    expect(created).not.toHaveProperty("error");
    expect(await readExpertiseNames((created as { persId: number }).persId)).toEqual([]);
  });
});
