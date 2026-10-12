import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { BackgroundCategory, Classes, Races, SpellOrigin } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { PersFormData } from "@/lib/zod/schemas/persCreateSchema";
import { minimalForm } from "../helpers/build-form";
import { withCreationSpells } from "../helpers/creation-spells";
import { backgroundByName, classByName, raceByName } from "../helpers/seed-lookup";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), unstable_cache: <T>(fn: T) => fn }));

import { auth } from "@/lib/auth";
import { createCharacter } from "@/lib/actions/character";
import { getCreationRaceSpellOffer } from "@/lib/actions/class-actions";
import { findRaceSpellGrants2014, saveRaceSpellGrants2014 } from "@/server/db/race-spell-grants-2014";

vi.setConfig({ testTimeout: 120_000 });

beforeEach(resetUserData);
afterAll(disconnectDatabase);

const HALF_ELF_CHOICE_GROUP = "Універсальність напівельфа";

let spellIdByName: Map<string, number>;
let halfElfOptionIds: Map<string, number>;

beforeAll(async () => {
  const rows = await prisma.spell.findMany({ where: { ruleset: "RULES_2014" }, select: { spellId: true, engName: true } });
  spellIdByName = new Map(rows.map((row) => [row.engName, row.spellId]));
  const halfElf = await raceByName(Races.HALF_ELF_2014);
  const options = await prisma.raceChoiceOption.findMany({ where: { raceId: halfElf.raceId, choiceGroupName: HALF_ELF_CHOICE_GROUP }, select: { optionId: true, optionName: true } });
  halfElfOptionIds = new Map(options.map((option) => [option.optionName, option.optionId]));
});

const spellId = (engName: string) => {
  const id = spellIdByName.get(engName);
  if (!id) throw new Error(`немає заклинання 2014 «${engName}»`);
  return id;
};

async function signIn(handle: string) {
  const user = await prisma.user.create({ data: { email: `${handle}-${Math.random()}@holota.family`, name: handle } });
  vi.mocked(auth).mockResolvedValue({ user: { email: user.email } } as never);
}

async function buildHalfElfForm(optionName: string, overrides: Partial<PersFormData> = {}) {
  const [race, characterClass, background] = await Promise.all([raceByName(Races.HALF_ELF_2014), classByName(Classes.FIGHTER_2014), backgroundByName(BackgroundCategory.ACOLYTE)]);
  const optionId = halfElfOptionIds.get(optionName);
  if (!optionId) throw new Error(`немає расового вибору «${optionName}»`);
  const form = minimalForm({
    raceId: race.raceId, classId: characterClass.classId, backgroundId: background.backgroundId,
    raceChoiceSelections: { [HALF_ELF_CHOICE_GROUP]: optionId },
    racialBonusChoiceSchema: { basic: ["STR", "DEX"] }, ...overrides,
  } as Partial<PersFormData> & Pick<PersFormData, "raceId" | "classId" | "backgroundId">);
  return withCreationSpells(form);
}

async function readRaceSpellNames(persId: number) {
  const rows = await prisma.persSpell.findMany({ where: { persId, origin: SpellOrigin.RACE }, select: { spell: { select: { engName: true } }, badgeText: true } });
  return rows.map((row) => row.spell.engName).sort();
}

describe("Напівельф зі спадком Місячного або Сонячного ельфа (SCAG): замовляння чарівника", () => {
  it("варіант «Замовляння» пропонує замовляння чарівника і записує обране рядком раси", async () => {
    await signIn("half-elf-cantrip-create");
    const halfElf = await raceByName(Races.HALF_ELF_2014);
    const offer = await getCreationRaceSpellOffer(halfElf.raceId, null, [halfElfOptionIds.get("Замовляння")!], []);
    expect(offer?.label).toBe("Замовляння напівельфа");
    expect(offer?.offer.picks[0].spells.map((spell) => spell.engName)).toContain("Fire Bolt");
    expect(offer?.offer.picks[0].spells.map((spell) => spell.engName)).not.toContain("Sacred Flame");

    const form = await buildHalfElfForm("Замовляння");
    const created = await createCharacter({ ...form, raceSpellIds: [spellId("Booming Blade")] });
    expect(created).not.toHaveProperty("error");
    const persId = (created as { persId: number }).persId;
    expect(await readRaceSpellNames(persId)).toEqual(["Booming Blade"]);
    const row = await prisma.persSpell.findFirstOrThrow({ where: { persId, origin: SpellOrigin.RACE } });
    expect(row).toMatchObject({ badgeText: "Напівельф", excludeFromKnownCount: true, learnedAtLevel: 1 });
  });

  it("без вибору, із заклинанням 1-го рівня чи не зі списку чарівника персонаж не створюється, нічого не записано", async () => {
    await signIn("half-elf-cantrip-refuse");
    const form = await buildHalfElfForm("Замовляння");

    expect(await createCharacter({ ...form, raceSpellIds: [] })).toEqual({ error: "Оберіть 1 замовляння: Замовляння напівельфа" });
    expect(await createCharacter({ ...form, raceSpellIds: [spellId("Magic Missile")] })).toEqual({ error: "Обране заклинання не підходить: Замовляння напівельфа" });
    expect(await createCharacter({ ...form, raceSpellIds: [spellId("Sacred Flame")] })).toEqual({ error: "Обране заклинання не підходить: Замовляння напівельфа" });
    expect(await prisma.pers.count()).toBe(0);
    expect(await prisma.persSpell.count()).toBe(0);
  });

  it("решта виборів Напівельфа замовляння не пропонує, а залишок вибору сервер не приймає", async () => {
    await signIn("half-elf-other-options");
    const halfElf = await raceByName(Races.HALF_ELF_2014);
    for (const option of ["Універсальність навичок", "Ельфійське бойове навчання", "Магія дроу"]) {
      expect(await getCreationRaceSpellOffer(halfElf.raceId, null, [halfElfOptionIds.get(option)!], [])).toBeNull();
    }

    const form = await buildHalfElfForm("Універсальність навичок", { skills: ["ATHLETICS", "STEALTH"] });
    expect(await createCharacter({ ...form, raceSpellIds: [spellId("Fire Bolt")] })).toEqual({ error: "Раса не дає обрати заклинання" });
    expect(await prisma.pers.count()).toBe(0);
  });
});

describe("Напівельф зі спадком дроу (SCAG): Магія дроу", () => {
  it("на 1-му рівні дає Танцюючі вогники рядком раси, Вогні фей і Темряву лише з рівнем персонажа 3 і 5", async () => {
    await signIn("half-elf-drow-magic");
    const form = await buildHalfElfForm("Магія дроу", { skills: [] });
    const created = await createCharacter(form);
    expect(created).not.toHaveProperty("error");
    const persId = (created as { persId: number }).persId;
    expect(await readRaceSpellNames(persId)).toEqual(["Dancing Lights"]);
    const row = await prisma.persSpell.findFirstOrThrow({ where: { persId, origin: SpellOrigin.RACE } });
    expect(row).toMatchObject({ badgeText: "Напівельф", learnedAtLevel: 1 });

    const input = { persId, race: "HALF_ELF_2014", subrace: null };
    const grantsAtLevel3 = await findRaceSpellGrants2014(prisma, { ...input, characterLevel: 3 });
    expect(grantsAtLevel3.created.map((spell) => spell.spellId)).toEqual([spellId("Faerie Fire")]);
    await prisma.$transaction((tx) => saveRaceSpellGrants2014(tx, { ...input, characterLevel: 3, learnedAtLevel: 3 }));
    const grantsAtLevel5 = await findRaceSpellGrants2014(prisma, { ...input, characterLevel: 5 });
    expect(grantsAtLevel5.created.map((spell) => spell.spellId)).toEqual([spellId("Darkness")]);
    await prisma.$transaction((tx) => saveRaceSpellGrants2014(tx, { ...input, characterLevel: 5, learnedAtLevel: 5 }));
    expect(await readRaceSpellNames(persId)).toEqual(["Dancing Lights", "Darkness", "Faerie Fire"]);
  });

  it("другий вибір Напівельфа (Універсальність навичок) заклинань дроу не дає навіть на 5-му рівні", async () => {
    await signIn("half-elf-no-drow-magic");
    const form = await buildHalfElfForm("Універсальність навичок", { skills: ["ATHLETICS", "STEALTH"] });
    const created = await createCharacter(form);
    expect(created).not.toHaveProperty("error");
    const persId = (created as { persId: number }).persId;
    expect(await readRaceSpellNames(persId)).toEqual([]);
    expect(await findRaceSpellGrants2014(prisma, { persId, race: "HALF_ELF_2014", subrace: null, characterLevel: 5 })).toEqual({ created: [], adopted: [] });
  });
});
