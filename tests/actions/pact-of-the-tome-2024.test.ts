/**
 * Pact of the Tome 2024 — Книга тіней: три замовляння й два ритуали 1-го рівня з будь-якого списку,
 * завжди підготовані, поза лімітом. Кейс — QA-персонаж №001 (Тифлінг · Прислужник · Чорнокнижник 5).
 */

import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { BackgroundCategory, Classes, Races, SpellOrigin } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { minimalForm } from "../helpers/build-form";
import { withCreationSpells } from "../helpers/creation-spells";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), unstable_cache: <T>(fn: T) => fn }));

import { auth } from "@/lib/auth";
import { createCharacter } from "@/lib/actions/character";
import { getCreationClassOptionSpellOffer } from "@/lib/actions/class-actions";

vi.setConfig({ testTimeout: 120_000 });

beforeEach(resetUserData);
afterAll(disconnectDatabase);

const BOOK = ["Light", "Mage Hand", "Mending", "Detect Magic", "Find Familiar"];

describe("Pact of the Tome 2024 — Книга тіней у конструкторі", () => {
  it("виклик пропонує замовляння й ритуали з чужих списків, а обране лягає завжди підготованим поза лімітом", async () => {
    await signIn("tome-creation");
    const tome = await findTomeOption();

    const offer = await getCreationClassOptionSpellOffer([tome.choiceOptionId], []);
    expect(offer?.label).toBe("Книга тіней");
    expect(offer?.offer.picks.map((pick) => [pick.count, pick.spellLevel])).toEqual([[3, 0], [2, 1]]);
    expect(offer?.offer.picks[0].spells.map((spell) => spell.engName)).toContain("Light");
    expect(offer?.offer.picks[1].spells.map((spell) => spell.engName)).toEqual(expect.arrayContaining(["Detect Magic", "Find Familiar"]));
    expect(offer?.offer.picks[1].spells.map((spell) => spell.engName)).not.toContain("Magic Missile");

    const persId = await createWarlock(tome, await findSpellIds(BOOK));
    const rows = await prisma.persSpell.findMany({
      where: { persId, sourceName: "Pact of the Tome (2024)" },
      select: { origin: true, isPrepared: true, excludeFromPreparedCount: true, badgeText: true, spell: { select: { engName: true } } },
    });
    expect(rows.map((row) => row.spell.engName).sort()).toEqual([...BOOK].sort());
    expect(new Set(rows.map(({ spell, ...row }) => JSON.stringify(row)))).toEqual(
      new Set([JSON.stringify({ origin: SpellOrigin.CLASS, isPrepared: true, excludeFromPreparedCount: true, badgeText: "Книга тіней" })]),
    );
  });

  it("без повної книги й із неритуальним заклинанням персонаж не створюється", async () => {
    await signIn("tome-creation-invalid");
    const tome = await findTomeOption();

    await expect(createWarlock(tome, await findSpellIds(BOOK.slice(0, 4)))).rejects.toThrow("Оберіть 2 заклинання: Книга тіней");
    await expect(createWarlock(tome, await findSpellIds([...BOOK.slice(0, 4), "Magic Missile"]))).rejects.toThrow("Обране заклинання не підходить: Книга тіней");
  });
});

async function signIn(handle: string) {
  const user = await prisma.user.create({ data: { email: `${handle}-${Math.random()}@holota.family`, name: handle } });
  vi.mocked(auth).mockResolvedValue({ user: { email: user.email } } as never);
}

async function findTomeOption() {
  const warlock = await prisma.class.findFirstOrThrow({ where: { name: Classes.WARLOCK_2024 } });
  const option = await prisma.classChoiceOption.findFirstOrThrow({
    where: { classId: warlock.classId, choiceOption: { optionNameEng: "Pact of the Tome (2024)" } },
    select: { choiceOptionId: true, choiceOption: { select: { groupName: true } } },
  });
  return { classId: warlock.classId, choiceOptionId: option.choiceOptionId, groupName: option.choiceOption.groupName };
}

async function createWarlock(tome: Awaited<ReturnType<typeof findTomeOption>>, classOptionSpellIds: number[]): Promise<number> {
  const [race, background] = await Promise.all([
    prisma.race.findFirstOrThrow({ where: { name: Races.HUMAN_2024 } }),
    prisma.background.findFirstOrThrow({ where: { name: BackgroundCategory.SAGE_2024 } }),
  ]);
  const form = minimalForm({
    name: "Книга тіней",
    raceId: race.raceId,
    classId: tome.classId,
    backgroundId: background.backgroundId,
    ruleset: "RULES_2024",
    backgroundAsiChoice: { mode: "+2/+1", plusTwo: "CON", plusOne: "INT" },
    languagesSchema: { languages: ["DWARVISH", "GIANT"] },
    classChoiceSelections: { [tome.groupName]: tome.choiceOptionId },
  });
  const created = await createCharacter({ ...(await withCreationSpells(form, { cantrips: ["Eldritch Blast", "Prestidigitation"] })), classOptionSpellIds });
  if (!created.persId) throw new Error(`не створився: ${created.error}`);
  return created.persId;
}

async function findSpellIds(engNames: string[]): Promise<number[]> {
  const spells = await prisma.spell.findMany({ where: { ruleset: "RULES_2024", engName: { in: engNames } }, select: { spellId: true, engName: true } });
  return engNames.map((engName) => spells.find((spell) => spell.engName === engName)!.spellId);
}
