"use server";

import { Prisma, type Classes } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildMediaImageUrl } from "@/lib/media-url";
import {
  buildCreatureStatBlock,
  parseHomebrewCreatureInput,
  parseHomebrewSpellInput,
  readCreatureInputFromStatBlock,
  toHomebrewEdition,
  toStoredRuleset,
  type HomebrewFieldErrors,
  type HomebrewKind,
  type HomebrewRuleset,
} from "@/lib/logic/homebrew-input";
import { buildHomebrewCreatureData, buildHomebrewSpellData, type HomebrewCatalogEntry } from "@/lib/logic/homebrew-view";
import { buildDiscussionTarget, formatPublicAuthorName, type VoteValue } from "@/lib/logic/content-discussion";
import { HOMEBREW_ENTRIES_PER_DAY, findEntryLimitStart } from "@/rules/homebrew-limits";
import { deleteStoredImage, storeSquareImage } from "@/server/media/image-upload";
import { findContentViewer, NOT_SIGNED_IN, type ContentViewer as Viewer } from "@/server/db/content-viewer";
import { deleteHomebrewEntryAsModerator, readImageKey } from "@/server/db/homebrew-removal";

type SaveResult = { success: true; entryId: number } | { success: false; error?: string; fieldErrors?: HomebrewFieldErrors };
type ActionResult = { success: true } | { success: false; error: string };

const MAX_LISTED_ENTRIES = 500;

const ENTRY_INCLUDE = {
  author: { select: { name: true } },
  spell: true,
  creature: true,
} satisfies Prisma.HomebrewEntryInclude;

type LoadedEntry = Prisma.HomebrewEntryGetPayload<{ include: typeof ENTRY_INCLUDE }>;

export async function listHomebrewEntries(input: { kind: HomebrewKind; ruleset: HomebrewRuleset; sort: "TOP" | "NEW" }): Promise<HomebrewCatalogEntry[]> {
  const viewer = await findContentViewer();
  const entries = await prisma.homebrewEntry.findMany({
    where: { kind: input.kind, OR: [{ ruleset: input.ruleset }, { ruleset: null }], deletedAt: null },
    include: ENTRY_INCLUDE,
    orderBy: input.sort === "TOP" ? [{ score: "desc" }, { createdAt: "desc" }] : [{ createdAt: "desc" }],
    take: MAX_LISTED_ENTRIES,
  });
  const targets = entries.map((entry) => buildDiscussionTarget({ kind: "HOMEBREW", entryId: entry.homebrewEntryId }));
  const [myVotes, commentCounts] = await Promise.all([loadMyVotes(viewer.userId, targets), countComments(targets)]);
  return entries.flatMap((entry, index) => toCatalogEntry(entry, input.ruleset, { myVote: myVotes.get(targets[index]) ?? 0, commentCount: commentCounts.get(targets[index]) ?? 0, canEdit: canViewerEdit(viewer, entry) }) ?? []);
}

export async function loadHomebrewEntry(entryId: number, preferredRuleset: HomebrewRuleset = "RULES_2014"): Promise<HomebrewCatalogEntry | null> {
  const viewer = await findContentViewer();
  const entry = await prisma.homebrewEntry.findFirst({ where: { homebrewEntryId: entryId, deletedAt: null }, include: ENTRY_INCLUDE });
  if (!entry) return null;

  const target = buildDiscussionTarget({ kind: "HOMEBREW", entryId });
  const [myVotes, commentCounts] = await Promise.all([loadMyVotes(viewer.userId, [target]), countComments([target])]);
  return toCatalogEntry(entry, preferredRuleset, { myVote: myVotes.get(target) ?? 0, commentCount: commentCounts.get(target) ?? 0, canEdit: canViewerEdit(viewer, entry) });
}

export type HomebrewEditValues =
  | { kind: "SPELL"; entryId: number; values: Record<string, unknown> }
  | { kind: "CREATURE"; entryId: number; values: Record<string, unknown>; imageUrl: string | null };

export async function loadHomebrewEditValues(entryId: number): Promise<HomebrewEditValues | null> {
  const viewer = await findContentViewer();
  if (await findEditError(entryId, viewer, null)) return null;
  const entry = await prisma.homebrewEntry.findUniqueOrThrow({ where: { homebrewEntryId: entryId }, include: { spell: true, creature: true } });

  if (entry.spell) {
    const { homebrewEntryId, ...spell } = entry.spell;
    return { kind: "SPELL", entryId: homebrewEntryId, values: { ...spell, engName: spell.engName ?? "", level: String(spell.level), name: entry.name, ruleset: toHomebrewEdition(entry.ruleset) } };
  }
  if (!entry.creature) return null;
  const statBlock = readStatBlock(entry.creature.statBlock);
  const imageKey = readImageKey(entry.creature.statBlock);
  return {
    kind: "CREATURE",
    entryId,
    values: { ...readCreatureInputFromStatBlock(statBlock), name: entry.name, ruleset: toHomebrewEdition(entry.ruleset) },
    imageUrl: imageKey ? buildMediaImageUrl(imageKey, "full") : null,
  };
}

export async function saveHomebrewSpell(input: { entryId?: number; values: unknown }): Promise<SaveResult> {
  const viewer = await findContentViewer();
  if (!viewer.userId) return { success: false, error: NOT_SIGNED_IN };
  const parsed = parseHomebrewSpellInput(input.values);
  if ("errors" in parsed) return { success: false, fieldErrors: parsed.errors };

  const { ruleset: edition, name, classes, ...spell } = parsed.data;
  const ruleset = toStoredRuleset(edition);
  const spellData = { ...spell, engName: spell.engName || null, classes: classes as Classes[] };

  if (input.entryId) {
    const editError = await findEditError(input.entryId, viewer, "SPELL");
    if (editError) return { success: false, error: editError };
    await prisma.homebrewEntry.update({
      where: { homebrewEntryId: input.entryId },
      data: { name, ruleset, updatedAt: new Date(), spell: { update: spellData } },
    });
    return { success: true, entryId: input.entryId };
  }

  const limitError = await findEntryLimitError(viewer.userId);
  if (limitError) return { success: false, error: limitError };
  const created = await prisma.homebrewEntry.create({
    data: { kind: "SPELL", name, ruleset, authorUserId: viewer.userId, spell: { create: spellData } },
    select: { homebrewEntryId: true },
  });
  return { success: true, entryId: created.homebrewEntryId };
}

export async function saveHomebrewCreature(formData: FormData): Promise<SaveResult> {
  const viewer = await findContentViewer();
  if (!viewer.userId) return { success: false, error: NOT_SIGNED_IN };
  const parsed = parseHomebrewCreatureInput(readJsonField(formData.get("values")));
  if ("errors" in parsed) return { success: false, fieldErrors: parsed.errors };

  const entryId = Number(formData.get("entryId")) || null;
  const previous = entryId ? await prisma.homebrewCreature.findUnique({ where: { homebrewEntryId: entryId }, select: { statBlock: true } }) : null;
  const accessError = entryId ? await findEditError(entryId, viewer, "CREATURE") : await findEntryLimitError(viewer.userId);
  if (accessError) return { success: false, error: accessError };

  const image = await resolveCreatureImage(formData, readImageKey(previous?.statBlock));
  if ("error" in image) return { success: false, error: image.error };

  const statBlock = { ...buildCreatureStatBlock(parsed.data), imageKey: image.key } satisfies Prisma.InputJsonObject;
  const creatureData = { engName: parsed.data.engName || null, size: parsed.data.size, type: parsed.data.type, challenge: parsed.data.challenge, statBlock };
  const saved = entryId
    ? await prisma.homebrewEntry.update({
        where: { homebrewEntryId: entryId },
        data: { name: parsed.data.name, ruleset: toStoredRuleset(parsed.data.ruleset), updatedAt: new Date(), creature: { update: creatureData } },
        select: { homebrewEntryId: true },
      })
    : await prisma.homebrewEntry.create({
        data: { kind: "CREATURE", name: parsed.data.name, ruleset: toStoredRuleset(parsed.data.ruleset), authorUserId: viewer.userId, creature: { create: creatureData } },
        select: { homebrewEntryId: true },
      });

  if (image.replacedKey) await deleteStoredImage(image.replacedKey);
  return { success: true, entryId: saved.homebrewEntryId };
}

export async function deleteHomebrewEntry(entryId: number): Promise<ActionResult> {
  const viewer = await findContentViewer();
  const editError = await findEditError(entryId, viewer, null);
  if (editError) return { success: false, error: editError };

  await deleteHomebrewEntryAsModerator(entryId);
  return { success: true };
}

async function findEditError(entryId: number, viewer: Viewer, kind: HomebrewKind | null): Promise<string | null> {
  if (!viewer.userId) return NOT_SIGNED_IN;
  const entry = await prisma.homebrewEntry.findFirst({ where: { homebrewEntryId: entryId, deletedAt: null }, select: { authorUserId: true, kind: true } });
  if (!entry || (kind && entry.kind !== kind)) return "Запис не знайдено";
  return viewer.isModerator || entry.authorUserId === viewer.userId ? null : "Змінювати можна лише свій запис";
}

async function findEntryLimitError(userId: number): Promise<string | null> {
  const count = await prisma.homebrewEntry.count({ where: { authorUserId: userId, createdAt: { gte: findEntryLimitStart(new Date()) } } });
  return count >= HOMEBREW_ENTRIES_PER_DAY ? `Не більше ${HOMEBREW_ENTRIES_PER_DAY} нових записів на добу` : null;
}

async function loadMyVotes(userId: number | null, targets: string[]): Promise<Map<string, VoteValue>> {
  if (!userId || !targets.length) return new Map();
  const votes = await prisma.contentVote.findMany({ where: { userId, target: { in: targets } }, select: { target: true, value: true } });
  return new Map(votes.map((vote) => [vote.target, vote.value === 1 ? 1 : -1]));
}

async function countComments(targets: string[]): Promise<Map<string, number>> {
  if (!targets.length) return new Map();
  const counts = await prisma.contentComment.groupBy({ by: ["target"], where: { target: { in: targets }, deletedAt: null }, _count: { _all: true } });
  return new Map(counts.map((count) => [count.target, count._count._all]));
}

async function resolveCreatureImage(formData: FormData, previousKey: string | null): Promise<{ key: string | null; replacedKey: string | null } | { error: string }> {
  const file = formData.get("image");
  if (file instanceof Blob && file.size > 0) {
    const stored = await storeSquareImage(file, "homebrew/creatures");
    return "error" in stored ? stored : { key: stored.key, replacedKey: previousKey };
  }
  if (formData.get("removeImage") === "1") return { key: null, replacedKey: previousKey };
  return { key: previousKey, replacedKey: null };
}

function toCatalogEntry(entry: LoadedEntry, viewedRuleset: HomebrewRuleset, activity: { myVote: VoteValue; commentCount: number; canEdit: boolean }): HomebrewCatalogEntry | null {
  const ruleset = (entry.ruleset as HomebrewRuleset | null) ?? viewedRuleset;
  const summary = {
    entryId: entry.homebrewEntryId,
    edition: toHomebrewEdition(entry.ruleset),
    name: entry.name,
    authorName: formatPublicAuthorName(entry.author.name),
    score: entry.score,
    ...activity,
    createdAt: entry.createdAt.toISOString(),
  };
  if (entry.kind === "SPELL" && entry.spell) {
    return { ...summary, kind: "SPELL", spell: buildHomebrewSpellData({ entryId: entry.homebrewEntryId, name: entry.name, ruleset }, entry.spell) };
  }
  if (entry.kind === "CREATURE" && entry.creature) {
    const statBlock = readStatBlock(entry.creature.statBlock);
    const imageKey = readImageKey(entry.creature.statBlock);
    return { ...summary, kind: "CREATURE", creature: buildHomebrewCreatureData({ entryId: entry.homebrewEntryId, ruleset }, statBlock, imageKey ? buildMediaImageUrl(imageKey, "full") : null) };
  }
  return null;
}

function canViewerEdit(viewer: Viewer, entry: LoadedEntry): boolean {
  return viewer.isModerator || (viewer.userId !== null && viewer.userId === entry.authorUserId);
}

function readStatBlock(value: Prisma.JsonValue): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function readJsonField(value: FormDataEntryValue | null): unknown {
  if (typeof value !== "string") return null;
  try {
    return JSON.parse(value);
  } catch (error) {
    if (error instanceof SyntaxError) return null;
    throw error;
  }
}
