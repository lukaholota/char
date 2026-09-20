import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { searchHomebrewEntries } from "@/server/db/homebrew-search-actions";
import { disconnectDatabase, resetUserData } from "../user-data";

beforeEach(resetUserData);
afterAll(disconnectDatabase);

async function seedAuthor(): Promise<number> {
  const user = await prisma.user.create({ data: { email: "homebrew-search@holota.family", name: "Тестовий автор" } });
  return user.id;
}

async function seedSpell(authorUserId: number, name: string, ruleset: "RULES_2014" | "RULES_2024" | null, deletedAt: Date | null = null) {
  return prisma.homebrewEntry.create({
    data: {
      kind: "SPELL",
      name,
      ruleset,
      authorUserId,
      deletedAt,
      spell: { create: { level: 1, school: "EVOCATION", castingTime: "1 дія", range: "30 футів", components: "В", duration: "Миттєво", description: "Тест" } },
    },
  });
}

describe("O36 — хоумбрю спільноти в омні-пошуку (серверна фаза)", () => {
  it("знаходить запис за назвою, з г↔х, і не показує видалених", async () => {
    const author = await seedAuthor();
    const kept = await seedSpell(author, "Бехолдерів погляд", "RULES_2014");
    await seedSpell(author, "Бехолдерів стогін", "RULES_2014", new Date());

    const hits = await searchHomebrewEntries("беголдер", "RULES_2014");

    expect(hits.map((hit) => hit.entryId)).toEqual([kept.homebrewEntryId]);
    expect(hits[0]).toMatchObject({ kind: "SPELL", title: "Бехолдерів погляд", badge: "Заклинання", href: `/homebrew/${kept.homebrewEntryId}` });
  });

  it("запис редакції 2024 видно лише в 2024, запис без редакції — в обох", async () => {
    const author = await seedAuthor();
    const only2024 = await seedSpell(author, "Хобітова хитрість", "RULES_2024");
    const any = await seedSpell(author, "Хобітова пісня", null);

    const hits2014 = await searchHomebrewEntries("хобіт", "RULES_2014");
    const hits2024 = await searchHomebrewEntries("хобіт", "RULES_2024");

    expect(hits2014.map((hit) => hit.entryId)).toEqual([any.homebrewEntryId]);
    expect(hits2024.map((hit) => hit.entryId).sort()).toEqual([only2024.homebrewEntryId, any.homebrewEntryId].sort());
    expect(hits2024.every((hit) => hit.href.endsWith("?edition=2024"))).toBe(true);
  });

  it("запит коротший за два символи нічого не питає", async () => {
    expect(await searchHomebrewEntries("х", "RULES_2014")).toEqual([]);
  });
});
