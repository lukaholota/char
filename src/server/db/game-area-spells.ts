import { prisma } from "@/lib/prisma";
import type { Ruleset } from "@/lib/prisma-enums";
import { findMembership } from "@/server/db/game-sessions";

export type MemberSpellbook = { ruleset: Ruleset; knownEngNames: Set<string> };

export async function findMemberSpellbook(sessionId: number, userId: number): Promise<MemberSpellbook | null> {
  const membership = await findMembership(sessionId, userId);
  if (!membership) return null;
  const heroes = await prisma.gameSessionMember.findMany({
    where: { gameSessionId: sessionId, userId, persId: { not: null } },
    orderBy: { heroSlot: "asc" },
    select: { pers: { select: { ruleset: true, persSpells: { select: { spell: { select: { engName: true } } } } } } },
  });
  return {
    ruleset: heroes[0]?.pers?.ruleset ?? "RULES_2014",
    knownEngNames: new Set(heroes.flatMap(({ pers }) => pers?.persSpells.map(({ spell }) => spell.engName) ?? [])),
  };
}
