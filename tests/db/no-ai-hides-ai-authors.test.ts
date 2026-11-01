/**
 * Режим «без ШІ»: хоумбрю й коментарі акаунтів, що публікують згенерований ШІ вміст, не показуються (запит власника 2026-11-01).
 */

import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { AI_AUTHOR_USER_IDS } from "@/lib/no-ai/ai-authors";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn(async () => null) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), unstable_cache: <T>(fn: T) => fn }));

import { listHomebrewEntries, loadHomebrewEntry } from "@/lib/actions/homebrew-actions";
import { loadDiscussion } from "@/lib/actions/content-discussion-actions";
import { searchHomebrewEntries } from "@/server/db/homebrew-search-actions";

vi.setConfig({ testTimeout: 60_000 });

beforeEach(resetUserData);
afterAll(disconnectDatabase);

async function seedSpell(authorUserId: number, name: string) {
  return prisma.homebrewEntry.create({
    data: {
      kind: "SPELL", name, ruleset: null, authorUserId,
      spell: { create: { level: 1, school: "EVOCATION", castingTime: "1 дія", range: "30 футів", components: "В", duration: "Миттєво", description: "Тест" } },
    },
  });
}

async function seedAuthors() {
  const ai = await prisma.user.create({ data: { id: AI_AUTHOR_USER_IDS[0], email: "ai@holota.family", name: "ostap_chatgpt" } });
  const human = await prisma.user.create({ data: { email: "human@holota.family", name: "Людина" } });
  return { ai, human };
}

describe("режим «без ШІ» ховає авторів-ШІ", () => {
  it("хоумбрю автора-ШІ зникає зі списку, пошуку й власної сторінки лише в режимі «без ШІ»", async () => {
    const { ai, human } = await seedAuthors();
    const aiEntry = await seedSpell(ai.id, "Хмарний їжак");
    await seedSpell(human.id, "Хмарний пес");

    const listed = async (hideAiAuthors: boolean) => (await listHomebrewEntries({ kind: "SPELL", ruleset: "RULES_2014", sort: "NEW", hideAiAuthors })).map((entry) => entry.name).sort();
    expect(await listed(false)).toEqual(["Хмарний пес", "Хмарний їжак"]);
    expect(await listed(true)).toEqual(["Хмарний пес"]);

    expect((await searchHomebrewEntries("хмарний", "RULES_2014")).length).toBe(2);
    expect((await searchHomebrewEntries("хмарний", "RULES_2014", true)).map((hit) => hit.title)).toEqual(["Хмарний пес"]);

    expect(await loadHomebrewEntry(aiEntry.homebrewEntryId)).not.toBeNull();
    expect(await loadHomebrewEntry(aiEntry.homebrewEntryId, "RULES_2014", true)).toBeNull();
  });

  it("коментарі автора-ШІ не показуються й не рахуються, відповідь людини на них лишається", async () => {
    const { ai, human } = await seedAuthors();
    const entry = await seedSpell(human.id, "Їжак");
    const target = `HOMEBREW:${entry.homebrewEntryId}`;
    const aiComment = await prisma.contentComment.create({ data: { target, userId: ai.id, body: "Згенеровано" } });
    await prisma.contentComment.create({ data: { target, userId: human.id, body: "Відповідь", parentCommentId: aiComment.contentCommentId } });

    expect((await loadDiscussion(target))!.commentCount).toBe(2);
    const hidden = (await loadDiscussion(target, true))!;
    expect(hidden.commentCount).toBe(1);
    expect(hidden.comments.map((comment) => comment.body)).toEqual(["Відповідь"]);

    const commentCount = async (hideAiAuthors: boolean) => (await listHomebrewEntries({ kind: "SPELL", ruleset: "RULES_2014", sort: "NEW", hideAiAuthors }))[0].commentCount;
    expect(await commentCount(false)).toBe(2);
    expect(await commentCount(true)).toBe(1);
  });
});
