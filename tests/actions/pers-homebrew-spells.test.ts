/**
 * KR31.17 — заклинання спільноти на листі персонажа (рішення власника 2026-09-15): додається з каталогу
 * чи сторінки запису, на листі підготовка, мітка й видалення працюють як у звичайного, друкується.
 */

import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { disconnectDatabase, resetUserData } from "../user-data";
import { signInAs } from "../helpers/signed-in-users";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), unstable_cache: <T>(fn: T) => fn }));

import { getUserPersesSpellIndex } from "@/lib/actions/pers";
import { setHomebrewSpellPresence } from "@/lib/actions/pers-homebrew-spells";
import { removeSpellFromPers, setSpellPrepared, updateSpellBadgeForPers } from "@/lib/actions/spell-actions";
import { deleteHomebrewEntry } from "@/lib/actions/homebrew-actions";
import { loadPrintableSpells } from "@/server/db/print-content";
import { createFighter } from "../helpers/sheet-feat-fixtures";

vi.setConfig({ testTimeout: 60_000 });

beforeEach(resetUserData);
afterAll(disconnectDatabase);

describe("KR31.17 — хоумбрю-заклинання на листі", () => {
  it("«обидві редакції» додається будь-кому, запис 2024 — лише персонажу 2024, чужому — ні", async () => {
    const both = await createHomebrewSpell(null);
    const only2024 = await createHomebrewSpell("RULES_2024");
    const persId = await createFighter({ ruleset: "RULES_2014", level: 3 });

    expect(await setHomebrewSpellPresence({ persId, entryId: both, present: true })).toEqual({ success: true, present: true, spellId: -both });
    expect(await setHomebrewSpellPresence({ persId, entryId: only2024, present: true })).toMatchObject({ success: false, error: "Це заклинання належить іншій редакції правил" });
    expect((await getUserPersesSpellIndex("RULES_2014"))[0].spellKeys).toContain(`homebrew:${both}`);

    await signInAs("stranger");
    expect(await setHomebrewSpellPresence({ persId, entryId: both, present: false })).toMatchObject({ success: false });
    expect(await prisma.persHomebrewSpell.count({ where: { persId } })).toBe(1);
  });

  it("підготовка, мітка й видалення листа йдуть у рядок хоумбрю за відʼємним номером", async () => {
    const entryId = await createHomebrewSpell(null);
    const persId = await createFighter({ ruleset: "RULES_2024", level: 3 });
    await setHomebrewSpellPresence({ persId, entryId, present: true });

    expect(await setSpellPrepared({ persId, spellId: -entryId, isPrepared: true })).toEqual({ success: true, isPrepared: true });
    expect(await updateSpellBadgeForPers({ persId, spellId: -entryId, badgeText: "Сувій", badgeColor: "#34d399", excludeFromKnownCount: true })).toMatchObject({ success: true, badgeText: "Сувій", excludeFromKnownCount: true });
    expect(await prisma.persHomebrewSpell.findFirstOrThrow({ where: { persId } })).toMatchObject({ isPrepared: true, badgeText: "Сувій", badgeColor: "#34d399", excludeFromKnownCount: true });

    expect(await removeSpellFromPers({ persId, spellId: -entryId })).toEqual({ success: true });
    expect(await prisma.persHomebrewSpell.count({ where: { persId } })).toBe(0);
  });

  it("друк бере текст запису разом зі звичайними; видалений автором запис лишається на листі, але не друкується", async () => {
    const entryId = await createHomebrewSpell(null);
    const fireball = await prisma.spell.findFirstOrThrow({ where: { engName: "Fireball", ruleset: "RULES_2014" }, select: { spellId: true } });

    expect((await loadPrintableSpells([-entryId, fireball.spellId])).map((spell) => [spell.name, spell.isHomebrew, spell.source])).toEqual([
      ["Вогнекуля [Fireball]", false, "Книга Гравця (2014)"],
      ["Їжак <b>сміливий</b>", true, "Хоумбрю"],
    ]);

    const persId = await createFighter({ ruleset: "RULES_2014", level: 3 });
    await setHomebrewSpellPresence({ persId, entryId, present: true });
    await signInAs("author");
    await deleteHomebrewEntry(entryId);
    expect(await loadPrintableSpells([-entryId])).toEqual([]);
    expect(await prisma.persHomebrewSpell.count({ where: { persId } })).toBe(1);
  });
});

async function createHomebrewSpell(ruleset: "RULES_2024" | null): Promise<number> {
  const author = await signInAs("author");
  const entry = await prisma.homebrewEntry.create({
    data: {
      kind: "SPELL", authorUserId: author.id, ruleset, name: "Їжак <b>сміливий</b>",
      spell: { create: { level: 3, school: "Втілення", castingTime: "1 дія", range: "Дотик", components: "В", duration: "Миттєва", description: "<img src=x onerror=alert(1)>" } },
    },
  });
  return entry.homebrewEntryId;
}
