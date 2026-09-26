import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { BackgroundCategory, Classes, Races, SpellOrigin, Subraces } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { minimalForm } from "../helpers/build-form";
import { withCreationSpells, withLevelUpSpells } from "../helpers/creation-spells";
import { minimalLevelUpForm } from "../helpers/levelup-form";
import { backgroundByName, classByName, raceByName, subraceByName } from "../helpers/seed-lookup";
import { disconnectDatabase, resetUserData } from "../user-data";
import { findRaceSpellGrants2014, writeRaceSpellGrants2014 } from "@/server/db/race-spell-grants-2014";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), unstable_cache: <T>(fn: T) => fn }));

import { auth } from "@/lib/auth";
import { createCharacter } from "@/lib/actions/character";
import { levelUpCharacter } from "@/lib/actions/levelup";

vi.setConfig({ testTimeout: 120_000 });

beforeEach(resetUserData);
afterAll(disconnectDatabase);

/**
 * O48, KR48.3 — раса 2014 сама кладе свої заклинання за рівнем ПЕРСОНАЖА: тифлінг — Thaumaturgy з 1-го,
 * Hellish Rebuke з 3-го, Darkness з 5-го; дроу — Dancing Lights, Faerie Fire, Darkness. Рядок раси —
 * поза лімітами класу; взяте гравцем раса перемічає як своє (Р53).
 */

let spellIdByName: Map<string, number>;

beforeAll(async () => {
  const rows = await prisma.spell.findMany({ where: { ruleset: "RULES_2014" }, select: { spellId: true, engName: true } });
  spellIdByName = new Map(rows.map((row) => [row.engName, row.spellId]));
});

async function signIn(handle: string) {
  const user = await prisma.user.create({ data: { email: `${handle}-${Math.random()}@holota.family`, name: handle } });
  vi.mocked(auth).mockResolvedValue({ user: { email: user.email } } as never);
}

async function createCharacter2014(raceName: Races, className: Classes, subraceName?: Subraces) {
  const [race, characterClass, background] = await Promise.all([raceByName(raceName), classByName(className), backgroundByName(BackgroundCategory.SOLDIER)]);
  const subraceId = subraceName ? (await subraceByName(subraceName)).subraceId : undefined;
  const form = minimalForm({ raceId: race.raceId, subraceId, classId: characterClass.classId, backgroundId: background.backgroundId });
  const created = await createCharacter(await withCreationSpells(form));
  if ("error" in created) throw new Error(`не створився: ${created.error}`);
  return { persId: created.persId, classId: characterClass.classId };
}

async function readRaceRows(persId: number) {
  const rows = await prisma.persSpell.findMany({
    where: { persId, origin: SpellOrigin.RACE },
    select: { badgeText: true, isPrepared: true, excludeFromPreparedCount: true, excludeFromKnownCount: true, learnedAtLevel: true, spell: { select: { engName: true } } },
  });
  return rows.sort((left, right) => left.spell.engName.localeCompare(right.spell.engName));
}

const names = (rows: { spell: { engName: string } }[]) => rows.map((row) => row.spell.engName);

describe("O48 — раса 2014 кладе свої заклинання", () => {
  it("тифлінг-воїн 1-го рівня знає Thaumaturgy — рядок раси поза лімітами", async () => {
    await signIn("o48-tiefling-create");
    const { persId } = await createCharacter2014(Races.TIEFLING_2014, Classes.FIGHTER_2014);

    const rows = await readRaceRows(persId);
    expect(names(rows)).toEqual(["Thaumaturgy"]);
    expect(rows[0]).toMatchObject({ badgeText: "Тифлінг", isPrepared: true, excludeFromPreparedCount: true, excludeFromKnownCount: true, learnedAtLevel: 1 });
  });

  it("на 3-му рівні персонажа тифлінг дістає Hellish Rebuke, а не наперед і не Darkness", async () => {
    await signIn("o48-tiefling-levelup");
    const { persId, classId } = await createCharacter2014(Races.TIEFLING_2014, Classes.FIGHTER_2014);

    const second = await levelUpCharacter(persId, await withLevelUpSpells(persId, minimalLevelUpForm({ classId })));
    expect(second).not.toHaveProperty("error");
    expect(names(await readRaceRows(persId))).toEqual(["Thaumaturgy"]);

    const third = await levelUpCharacter(persId, await withLevelUpSpells(persId, minimalLevelUpForm({ classId })));
    expect(third).not.toHaveProperty("error");
    const rows = await readRaceRows(persId);
    expect(names(rows)).toEqual(["Hellish Rebuke", "Thaumaturgy"]);
    expect(rows.find((row) => row.spell.engName === "Hellish Rebuke")?.learnedAtLevel).toBe(3);
  });

  it("дроу, що вже тримав Dancing Lights руками, на ремонті 5-го рівня дістає Faerie Fire і Darkness, а ручний рядок стає рядком раси", async () => {
    await signIn("o48-drow-repair");
    const { persId } = await createCharacter2014(Races.ELF_2014, Classes.FIGHTER_2014, Subraces.ELF_DARK_DROW_2014);
    await prisma.persSpell.deleteMany({ where: { persId } });
    await prisma.pers.update({ where: { persId }, data: { level: 5 } });
    await prisma.persSpell.create({ data: { persId, spellId: spellIdByName.get("Dancing Lights")!, learnedAtLevel: 1, origin: SpellOrigin.MANUAL, badgeText: "Раса" } });

    const input = { persId, race: "ELF_2014", subrace: "ELF_DARK_DROW_2014", characterLevel: 5 };
    const grants = await findRaceSpellGrants2014(prisma, input);
    expect(grants.adopted.map((spell) => spell.spellId)).toEqual([spellIdByName.get("Dancing Lights")]);
    expect(grants.created.map((spell) => spell.spellId).sort()).toEqual([spellIdByName.get("Darkness"), spellIdByName.get("Faerie Fire")].sort());

    await prisma.$transaction((tx) => writeRaceSpellGrants2014(tx, { persId, grants, learnedAtLevel: 5 }));
    const rows = await readRaceRows(persId);
    expect(names(rows)).toEqual(["Dancing Lights", "Darkness", "Faerie Fire"]);
    expect(rows.every((row) => row.badgeText === "Темний ельф (Дроу)")).toBe(true);
    expect(await findRaceSpellGrants2014(prisma, input)).toEqual({ created: [], adopted: [] });
  });

  it("людина нічого від раси не отримує", async () => {
    await signIn("o48-human-create");
    const { persId } = await createCharacter2014(Races.HUMAN_2014, Classes.FIGHTER_2014);
    expect(await readRaceRows(persId)).toEqual([]);
  });
});
