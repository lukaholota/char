"use server";

import type { AreaShape } from "@/rules/game-areas";
import type { Ruleset } from "@/lib/prisma-enums";
import { findMemberSpellbook } from "@/server/db/game-area-spells";
import { isId, runAsUser } from "@/server/game-sessions/game-action";
import { listAreaSpells } from "@/server/game-sessions/area-spells";

export type AreaSpellOption = { name: string; engName: string; shape: AreaShape; sizeFeet: number; isKnown: boolean };
export type AreaSpellList = { ruleset: Ruleset; spells: AreaSpellOption[] };

export async function listAreaSpellsAction(sessionId: number) {
  return runAsUser<AreaSpellList>(async (userId) => {
    if (!isId(sessionId)) return { ok: false, error: "not_found" };
    const spellbook = await findMemberSpellbook(sessionId, userId);
    if (!spellbook) return { ok: false, error: "not_found" };
    const spells = listAreaSpells(spellbook.ruleset).map((spell) => ({ ...spell, isKnown: spellbook.knownEngNames.has(spell.engName) }));
    return { ok: true, value: { ruleset: spellbook.ruleset, spells: [...spells.filter((spell) => spell.isKnown), ...spells.filter((spell) => !spell.isKnown)] } };
  });
}
