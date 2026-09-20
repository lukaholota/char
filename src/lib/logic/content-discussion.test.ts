import { describe, expect, it } from "vitest";
import { buildDiscussionCommentTree, buildOptimisticVote, buildDiscussionTarget, buildDiscussionTargetHref, findCatalogDiscussionTarget, findReplyRootId, formatPublicAuthorName, parseDiscussionTarget } from "./content-discussion";

const at = new Date("2026-09-15T10:00:00Z");
const comment = (id: number, parentCommentId: number | null, userId: number, deleted = false) => ({
  contentCommentId: id, parentCommentId, userId, authorName: "Олена Петренко", body: `текст ${id}`, score: id, createdAt: at, deletedAt: deleted ? at : null,
});

describe("обговорення запису", () => {
  it("ціль — рядок-ключ, і читається назад лише коректний", () => {
    expect(buildDiscussionTarget({ kind: "CREATURE", ruleset: "RULES_2024", key: "adult-red-dragon" })).toBe("CREATURE:RULES_2024:adult-red-dragon");
    expect(parseDiscussionTarget("SPELL:RULES_2014:fireball")).toEqual({ kind: "SPELL", ruleset: "RULES_2014", key: "fireball" });
    expect(parseDiscussionTarget("HOMEBREW:42")).toEqual({ kind: "HOMEBREW", entryId: 42 });
    expect(buildDiscussionTargetHref({ kind: "CREATURE", ruleset: "RULES_2024", key: "goblin" })).toBe("/2024/bestiary/goblin");
    expect(buildDiscussionTargetHref({ kind: "SPELL", ruleset: "RULES_2014", key: "fireball" })).toBe("/spells/fireball");
    expect(buildDiscussionTargetHref({ kind: "HOMEBREW", entryId: 9 })).toBe("/homebrew/9");
    for (const bad of ["HOMEBREW:0", "SPELL:RULES_2030:fireball", "CREATURE:RULES_2014:Goblin", "SPELL:RULES_2014:", "PERS:1"]) {
      expect(parseDiscussionTarget(bad)).toBeNull();
    }
  });

  it("запис каталогу адресується слагом англійської назви, хоумбрю — своїм номером", () => {
    expect(findCatalogDiscussionTarget("SPELL", { id: 12, engName: "Melf's Acid Arrow", ruleset: "RULES_2024" })).toBe("SPELL:RULES_2024:melfs-acid-arrow");
    expect(findCatalogDiscussionTarget("CREATURE", { id: -7, engName: "", ruleset: "RULES_2014" })).toBe("HOMEBREW:7");
    expect(findCatalogDiscussionTarget("CREATURE", { id: 3, engName: "", ruleset: "RULES_2014" })).toBeNull();
  });

  it("оптимістичний голос одразу враховує новий і знімає попередній", () => {
    expect(buildOptimisticVote({ score: 4, myVote: 0 }, 1)).toEqual({ score: 5, myVote: 1 });
    expect(buildOptimisticVote({ score: 5, myVote: 1 }, -1)).toEqual({ score: 3, myVote: -1 });
    expect(buildOptimisticVote({ score: 3, myVote: -1 }, 0)).toEqual({ score: 4, myVote: 0 });
  });

  it("публічно видно лише імʼя й першу літеру прізвища", () => {
    expect(formatPublicAuthorName("Олена Петренко")).toBe("Олена П.");
    expect(formatPublicAuthorName("Madonna")).toBe("Madonna");
    expect(formatPublicAuthorName("  ")).toBe("Гравець");
  });

  it("відповіді вкладаються під свій коментар, несуть рейтинг і мій голос; видалений лишає місце без тексту", () => {
    const tree = buildDiscussionCommentTree([comment(1, null, 7), comment(2, 1, 8), comment(3, null, 7, true)], { userId: 8, isModerator: false }, new Map([[1, -1]]));
    expect(tree.map((root) => [root.commentId, root.replies.map((reply) => reply.commentId), root.canDelete, root.myVote, root.score])).toEqual([[1, [2], false, -1, 1], [3, [], false, 0, 3]]);
    expect(tree[0].replies[0]).toMatchObject({ canDelete: true, isOwn: true });
    expect(tree[1]).toMatchObject({ isDeleted: true, body: "Коментар видалено", authorName: "" });
    expect(buildDiscussionCommentTree([comment(1, null, 7)], { userId: null, isModerator: true }, new Map())[0].canDelete).toBe(true);
  });

  it("відповідь на відповідь чіпляється до кореневого коментаря — один рівень вкладення", () => {
    expect(findReplyRootId({ contentCommentId: 2, parentCommentId: 1 })).toBe(1);
    expect(findReplyRootId({ contentCommentId: 1, parentCommentId: null })).toBe(1);
  });
});
