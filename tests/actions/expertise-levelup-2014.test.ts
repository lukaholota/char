import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { BackgroundCategory, Classes, Races, SkillProficiencyType, Skills } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { minimalForm } from "../helpers/build-form";
import { minimalLevelUpForm } from "../helpers/levelup-form";
import { backgroundByName, classByName, raceByName } from "../helpers/seed-lookup";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), unstable_cache: <T>(fn: T) => fn }));

import { auth } from "@/lib/auth";
import { createCharacter } from "@/lib/actions/character";
import { levelUpCharacter } from "@/lib/actions/levelup";

vi.setConfig({ testTimeout: 120_000 });

beforeEach(resetUserData);
afterAll(disconnectDatabase);

async function signIn(handle: string) {
  const user = await prisma.user.create({ data: { email: `${handle}-${Math.random()}@holota.family`, name: handle } });
  vi.mocked(auth).mockResolvedValue({ user: { email: user.email } } as never);
}

async function createRogueAtLevelFive() {
  const [race, rogue, background] = await Promise.all([raceByName(Races.HUMAN_2014), classByName(Classes.ROGUE_2014), backgroundByName(BackgroundCategory.CRIMINAL)]);
  const created = await createCharacter(minimalForm({
    raceId: race.raceId, classId: rogue.classId, backgroundId: background.backgroundId,
    skills: [Skills.STEALTH, Skills.SLEIGHT_OF_HAND, Skills.PERCEPTION, Skills.ACROBATICS],
    expertiseSchema: { expertises: [Skills.STEALTH, Skills.ACROBATICS] },
  }));
  if ("error" in created) throw new Error(`не створився: ${created.error}`);
  await prisma.pers.update({ where: { persId: created.persId }, data: { level: 5 } });
  return { persId: created.persId, classId: rogue.classId };
}

async function readSkills(persId: number) {
  const rows = await prisma.persSkill.findMany({ where: { persId }, select: { name: true, proficiencyType: true } });
  return {
    expertise: rows.filter((row) => row.proficiencyType === SkillProficiencyType.EXPERTISE).map((row) => row.name).sort(),
    proficientOnly: rows.filter((row) => row.proficiencyType === SkillProficiencyType.PROFICIENT).map((row) => row.name).sort(),
  };
}

describe("Експертиза на підвищенні рівня 2014: сервер перевіряє кількість, володіння й повтори (BUG-O49-EXPERTISE-2014-UNVALIDATED)", () => {
  it("Пройдисвіт 5 → 6 приймає рівно дві нові експертизи в навичках, якими володіє", async () => {
    await signIn("expertise-levelup-2014-rogue");
    const { persId, classId } = await createRogueAtLevelFive();
    const before = await readSkills(persId);
    expect(before.expertise).toEqual([Skills.ACROBATICS, Skills.STEALTH]);
    const [first, second] = before.proficientOnly;
    const levelUp = (expertises: string[]) => levelUpCharacter(persId, minimalLevelUpForm({ classId, expertiseSchema: { expertises } }));

    expect(await levelUp([])).toEqual({ error: "Оберіть рівно 2 навичок для експертизи" });
    expect(await levelUp([first])).toEqual({ error: "Оберіть рівно 2 навичок для експертизи" });
    expect(await levelUp([first, Skills.ARCANA])).toEqual({ error: "Обрані навички не відповідають доступним варіантам експертизи" });
    expect(await levelUp([first, Skills.STEALTH])).toEqual({ error: "Ця навичка вже має експертизу" });
    expect(await levelUp([first, first])).toEqual({ error: "Не можна обрати ту саму експертизу двічі" });
    expect((await prisma.pers.findUniqueOrThrow({ where: { persId } })).level).toBe(5);

    expect(await levelUp([first, second])).not.toHaveProperty("error");
    expect((await readSkills(persId)).expertise).toEqual([Skills.ACROBATICS, Skills.STEALTH, first, second].sort());
  });

  it("рівень без уміння експертизи не приймає експертизу", async () => {
    await signIn("expertise-levelup-2014-none");
    const { persId, classId } = await createRogueAtLevelFive();
    await prisma.pers.update({ where: { persId }, data: { level: 6 } });
    const { proficientOnly } = await readSkills(persId);

    expect(await levelUpCharacter(persId, minimalLevelUpForm({ classId, expertiseSchema: { expertises: [proficientOnly[0]] } })))
      .toEqual({ error: "Оберіть рівно 0 навичок для експертизи" });
  });
});
