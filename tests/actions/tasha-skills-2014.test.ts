import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { BackgroundCategory, Classes, Races, SkillProficiencyType } from "@prisma/client";
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

const TASHA_PICKS = ["STEALTH", "ATHLETICS", "PERCEPTION"] as const;

async function signIn(handle: string) {
  const user = await prisma.user.create({ data: { email: `${handle}-${Math.random()}@holota.family`, name: handle } });
  vi.mocked(auth).mockResolvedValue({ user: { email: user.email } } as never);
}

async function buildSageForm(race: Races, skillsSchema: PersFormData["skillsSchema"], skills: string[]) {
  const [raceRow, cls, background] = await Promise.all([raceByName(race), classByName(Classes.FIGHTER_2014), backgroundByName(BackgroundCategory.SAGE)]);
  return minimalForm({ raceId: raceRow.raceId, classId: cls.classId, backgroundId: background.backgroundId, skillsSchema, skills } as never);
}

async function readProficientSkills(persId: number) {
  const rows = await prisma.persSkill.findMany({ where: { persId, proficiencyType: { not: SkillProficiencyType.NONE } }, select: { name: true } });
  return rows.map((row) => String(row.name)).sort();
}

describe("Правила Таші на кроці навичок 2014: фіксовані навички походження стають вільним вибором", () => {
  it("Мудрець у режимі Таші має рівно обрані навички, без Магії та Історії передісторії", async () => {
    await signIn("tasha-sage");
    const form = await buildSageForm(
      Races.HUMAN_2014,
      { isTasha: true, tashaChoices: [...TASHA_PICKS], basicChoices: { race: [], selectedClass: [], background: [] }, choiceOptions: {} },
      [...TASHA_PICKS],
    );
    const created = await createCharacter(form);
    expect(created).not.toHaveProperty("error");
    expect(await readProficientSkills((created as { persId: number }).persId)).toEqual(["ATHLETICS", "PERCEPTION", "STEALTH"]);
  });

  it("фіксована навичка раси (Морський ельф MPMM) теж не додається понад вибір, але лишається, якщо гравець сам її обрав", async () => {
    await signIn("tasha-sea-elf");
    const withoutRaceSkill = await buildSageForm(
      Races.SEA_ELF_MPMM,
      { isTasha: true, tashaChoices: ["STEALTH", "ATHLETICS", "ARCANA"], basicChoices: { race: [], selectedClass: [], background: [] }, choiceOptions: {} },
      ["STEALTH", "ATHLETICS", "ARCANA"],
    );
    const first = await createCharacter(withoutRaceSkill);
    expect(first).not.toHaveProperty("error");
    expect(await readProficientSkills((first as { persId: number }).persId)).toEqual(["ARCANA", "ATHLETICS", "STEALTH"]);

    const withRaceSkill = await buildSageForm(
      Races.SEA_ELF_MPMM,
      { isTasha: true, tashaChoices: ["STEALTH", "ATHLETICS", "PERCEPTION"], basicChoices: { race: [], selectedClass: [], background: [] }, choiceOptions: {} },
      ["STEALTH", "ATHLETICS", "PERCEPTION"],
    );
    const second = await createCharacter(withRaceSkill);
    expect(second).not.toHaveProperty("error");
    expect(await readProficientSkills((second as { persId: number }).persId)).toEqual(["ATHLETICS", "PERCEPTION", "STEALTH"]);
  });

  it("без режиму Таші навички Мудреця і вибір класу додаються разом, як і раніше", async () => {
    await signIn("tasha-off-sage");
    const form = await buildSageForm(
      Races.HUMAN_2014,
      { isTasha: false, tashaChoices: [], basicChoices: { race: [], selectedClass: ["ATHLETICS", "PERCEPTION"], background: [] }, choiceOptions: {} },
      [],
    );
    const created = await createCharacter(form);
    expect(created).not.toHaveProperty("error");
    expect(await readProficientSkills((created as { persId: number }).persId)).toEqual(["ARCANA", "ATHLETICS", "HISTORY", "PERCEPTION"]);
  });
});
