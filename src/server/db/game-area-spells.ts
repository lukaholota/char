import { prisma } from "@/lib/prisma";
import type { Ruleset } from "@/lib/prisma-enums";
import { findMembership } from "@/server/db/game-sessions";

export type MemberSpellbook = { ruleset: Ruleset; knownEngNames: Set<string> };

export async function findMemberSpellbook(sessionId: number, userId: number): Promise<MemberSpellbook | null> {
  const membership = await findMembership(sessionId, userId);
  if (!membership) return null;
  if (membership.persId === null) return { ruleset: "RULES_2014", knownEngNames: new Set() };
  const [pers, persSpells] = await Promise.all([
    prisma.pers.findUnique({ where: { persId: membership.persId }, select: { ruleset: true } }),
    prisma.persSpell.findMany({ where: { persId: membership.persId }, select: { spell: { select: { engName: true } } } }),
  ]);
  return { ruleset: pers?.ruleset ?? "RULES_2014", knownEngNames: new Set(persSpells.map(({ spell }) => spell.engName)) };
}
