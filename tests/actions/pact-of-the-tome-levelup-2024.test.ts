/** Pact of the Tome, узятий на 2-му рівні чорнокнижника: Книга тіней обирається тим самим підвищенням. */

import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { BackgroundCategory, Classes, Races } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { minimalForm } from "../helpers/build-form";
import { withCreationSpells, withLevelUpSpells } from "../helpers/creation-spells";
import { minimalLevelUpForm } from "../helpers/levelup-form";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), unstable_cache: <T>(fn: T) => fn }));

import { auth } from "@/lib/auth";
import { createCharacter } from "@/lib/actions/character";
import { getLevelUpClassOptionSpellOffer, levelUpCharacter } from "@/lib/actions/levelup";

vi.setConfig({ testTimeout: 120_000 });

beforeEach(resetUserData);
afterAll(disconnectDatabase);

describe("Pact of the Tome 2024 — Книга тіней на підвищенні", () => {
  it("виклик, узятий на 2-му рівні, просить книгу; уже відоме заклинання в неї не йде; без книги рівня немає", async () => {
    const user = await prisma.user.create({ data: { email: `tome-levelup-${Math.random()}@holota.family`, name: "tome" } });
    vi.mocked(auth).mockResolvedValue({ user: { email: user.email } } as never);
    const warlock = await prisma.class.findFirstOrThrow({ where: { name: Classes.WARLOCK_2024 } });
    const [mind, tome, sight] = await Promise.all(["Eldritch Mind (2024)", "Pact of the Tome (2024)", "Devil's Sight (2024)"].map((name) => findInvocation(warlock.classId, name)));
    const persId = await createWarlock(warlock.classId, mind);

    const offer = await getLevelUpClassOptionSpellOffer(persId, [tome.choiceOptionId, sight.choiceOptionId]);
    expect(offer?.label).toBe("Книга тіней");
    const ownedCantrip = await prisma.persSpell.findFirstOrThrow({ where: { persId, spell: { level: 0 } }, select: { spellId: true } });
    expect(offer?.offer.picks[0].spells.map((spell) => spell.spellId)).not.toContain(ownedCantrip.spellId);

    const book = await findSpellIds(["Light", "Mending", "Guidance", "Detect Magic", "Find Familiar"]);
    const levelTwo = await withLevelUpSpells(
      persId,
      minimalLevelUpForm({ classId: warlock.classId, classChoiceSelections: { [tome.groupName]: [tome.choiceOptionId, sight.choiceOptionId] } }),
    );

    expect(levelTwo.classOptionSpellIds).toHaveLength(5);
    expect(await levelUpCharacter(persId, { ...levelTwo, classOptionSpellIds: [] })).toEqual({ error: "Оберіть 3 замовляння: Книга тіней" });
    expect(await levelUpCharacter(persId, { ...levelTwo, classOptionSpellIds: [ownedCantrip.spellId, ...book.slice(1)] })).toEqual({
      error: "Це заклинання у вас уже є — оберіть інше: Книга тіней",
    });
    expect(await levelUpCharacter(persId, { ...levelTwo, classOptionSpellIds: book })).toEqual({ success: true });

    const rows = await prisma.persSpell.findMany({ where: { persId, sourceName: "Pact of the Tome (2024)" }, select: { spellId: true, excludeFromPreparedCount: true } });
    expect(rows.map((row) => row.spellId).sort()).toEqual([...book].sort());
    expect(rows.every((row) => row.excludeFromPreparedCount)).toBe(true);
  });
});

async function findInvocation(classId: number, optionNameEng: string) {
  const option = await prisma.classChoiceOption.findFirstOrThrow({
    where: { classId, choiceOption: { optionNameEng } },
    select: { choiceOptionId: true, choiceOption: { select: { groupName: true } } },
  });
  return { choiceOptionId: option.choiceOptionId, groupName: option.choiceOption.groupName };
}

async function createWarlock(classId: number, invocation: { choiceOptionId: number; groupName: string }): Promise<number> {
  const [race, background] = await Promise.all([
    prisma.race.findFirstOrThrow({ where: { name: Races.HUMAN_2024 } }),
    prisma.background.findFirstOrThrow({ where: { name: BackgroundCategory.SAGE_2024 } }),
  ]);
  const form = minimalForm({
    name: "Чорнокнижник без книги",
    raceId: race.raceId,
    classId,
    backgroundId: background.backgroundId,
    ruleset: "RULES_2024",
    backgroundAsiChoice: { mode: "+2/+1", plusTwo: "CON", plusOne: "INT" },
    languagesSchema: { languages: ["DWARVISH", "GIANT"] },
    classChoiceSelections: { [invocation.groupName]: invocation.choiceOptionId },
  });
  const created = await createCharacter(await withCreationSpells(form));
  if (!created.persId) throw new Error(`не створився: ${created.error}`);
  return created.persId;
}

async function findSpellIds(engNames: string[]): Promise<number[]> {
  const spells = await prisma.spell.findMany({ where: { ruleset: "RULES_2024", engName: { in: engNames } }, select: { spellId: true, engName: true } });
  return engNames.map((engName) => spells.find((spell) => spell.engName === engName)!.spellId);
}
