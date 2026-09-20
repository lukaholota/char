/**
 * KR31.17 — голоси й обговорення на будь-якому записі каталогу (рішення власника 2026-09-15):
 * звичайні істоти й заклинання адресуються слагом, хоумбрю — номером; відповіді й голоси на коментарях; скарги.
 */

import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { disconnectDatabase, resetUserData } from "../user-data";
import { signInAs } from "../helpers/signed-in-users";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), unstable_cache: <T>(fn: T) => fn }));

import { addContentComment, deleteContentComment, loadDiscussion, voteContent, voteContentComment } from "@/lib/actions/content-discussion-actions";
import { listOpenContentReports, reportContent, resolveContentReports } from "@/lib/actions/content-report-actions";
import { saveHomebrewSpell } from "@/lib/actions/homebrew-actions";

vi.setConfig({ testTimeout: 60_000 });

const GOBLIN = "CREATURE:RULES_2014:goblin";
const FIREBALL_2024 = "SPELL:RULES_2024:fireball";

beforeEach(async () => {
  await resetUserData();
});
afterEach(() => vi.unstubAllEnvs());
afterAll(disconnectDatabase);

describe("обговорення запису каталогу", () => {
  it("голос за звичайну істоту рахує рейтинг, повторне натискання знімає; неіснуючий запис — відмова", async () => {
    await signInAs("fan");
    expect(await voteContent(GOBLIN, 1)).toEqual({ success: true, score: 1, myVote: 1 });
    await signInAs("critic");
    expect(await voteContent(GOBLIN, -1)).toEqual({ success: true, score: 0, myVote: -1 });
    expect(await voteContent(GOBLIN, 0)).toEqual({ success: true, score: 1, myVote: 0 });
    expect(await voteContent("CREATURE:RULES_2014:no-such-beast", 1)).toMatchObject({ success: false });
    expect(await loadDiscussion("CREATURE:RULES_2014:no-such-beast")).toBeNull();
    expect(await loadDiscussion(GOBLIN)).toMatchObject({ score: 1, myVote: 0, canVoteTarget: true, canReportTarget: false, comments: [] });
  });

  it("за своє хоумбрю голосувати не можна, чужий голос пише рейтинг у запис для сортування", async () => {
    await signInAs("author");
    const saved = await saveHomebrewSpell({ values: { ruleset: "ANY", name: "Їжак", engName: "", level: 1, school: "Втілення", castingTime: "1 дія", range: "Дотик", components: "В", duration: "Миттєва", isRitual: false, isConcentration: false, classes: [], description: "…" } });
    if (!saved.success) throw new Error("не збережено");
    const target = `HOMEBREW:${saved.entryId}`;

    expect(await voteContent(target, 1)).toMatchObject({ success: false });
    expect(await loadDiscussion(target)).toMatchObject({ canVoteTarget: false, canReportTarget: false });
    await signInAs("fan");
    expect(await voteContent(target, 1)).toMatchObject({ success: true, score: 1 });
    expect((await prisma.homebrewEntry.findUniqueOrThrow({ where: { homebrewEntryId: saved.entryId } })).score).toBe(1);
    expect(await loadDiscussion(target)).toMatchObject({ canVoteTarget: true, canReportTarget: true });
  });

  it("відповідь на відповідь чіпляється до кореня, голос за чужий коментар рахується, за свій — ні", async () => {
    await signInAs("fan");
    expect(await addContentComment({ target: FIREBALL_2024, body: "Сильно" })).toEqual({ success: true });
    const [root] = (await loadDiscussion(FIREBALL_2024))!.comments;
    await signInAs("critic");
    await addContentComment({ target: FIREBALL_2024, body: "Згоден", parentCommentId: root.commentId });
    const reply = (await loadDiscussion(FIREBALL_2024))!.comments[0].replies[0];
    await addContentComment({ target: FIREBALL_2024, body: "Уточнення", parentCommentId: reply.commentId });
    expect(await addContentComment({ target: GOBLIN, body: "Не туди", parentCommentId: root.commentId })).toMatchObject({ success: false });

    expect(await voteContentComment(root.commentId, 1)).toEqual({ success: true, score: 1, myVote: 1 });
    expect(await voteContentComment(reply.commentId, 1)).toMatchObject({ success: false });
    const view = (await loadDiscussion(FIREBALL_2024))!;
    expect(view.comments[0]).toMatchObject({ score: 1, myVote: 1, isOwn: false, canDelete: false });
    expect(view.comments[0].replies.map((comment) => comment.body)).toEqual(["Згоден", "Уточнення"]);
    expect(await deleteContentComment(root.commentId)).toMatchObject({ success: false });

    await signInAs("fan");
    expect(await deleteContentComment(root.commentId)).toEqual({ success: true });
    const afterDelete = (await loadDiscussion(FIREBALL_2024))!;
    expect(afterDelete.comments[0]).toMatchObject({ isDeleted: true, body: "Коментар видалено" });
    expect(afterDelete.commentCount).toBe(2);
  });

  it("скарга на коментар — одна від людини, не на своє й не на офіційний запис; модератор видаляє й закриває", async () => {
    await signInAs("troll");
    await addContentComment({ target: GOBLIN, body: "Образа" });
    const [comment] = (await loadDiscussion(GOBLIN))!.comments;
    expect(await reportContent({ target: GOBLIN, commentId: comment.commentId, reason: "SPAM", details: "" })).toMatchObject({ error: "На свій коментар скаржитися не можна" });

    await signInAs("reader");
    expect(await reportContent({ target: GOBLIN, commentId: null, reason: "SPAM", details: "" })).toMatchObject({ success: false });
    expect(await reportContent({ target: GOBLIN, commentId: comment.commentId, reason: "OFFENSIVE", details: "грубо" })).toEqual({ success: true });
    expect(await reportContent({ target: GOBLIN, commentId: comment.commentId, reason: "SPAM", details: "" })).toMatchObject({ error: "Ви вже поскаржилися на це" });
    expect(await listOpenContentReports()).toBeNull();

    const moderator = await signInAs("moderator");
    vi.stubEnv("HOMEBREW_MODERATOR_EMAILS", ` other@x.y, ${moderator.email!.toUpperCase()} `);
    const [group] = (await listOpenContentReports())!;
    expect(group).toMatchObject({ target: GOBLIN, targetHref: "/bestiary/goblin", commentId: comment.commentId, commentBody: "Образа", reasons: [{ reason: "OFFENSIVE", details: "грубо" }] });

    expect(await resolveContentReports({ target: GOBLIN, commentId: comment.commentId, action: "DELETE" })).toEqual({ success: true });
    expect(await listOpenContentReports()).toEqual([]);
    expect((await loadDiscussion(GOBLIN))!.comments[0].isDeleted).toBe(true);
  });
});
