import { isHomebrewCatalogId } from "@/lib/logic/homebrew-view";
import { buildSpellLinkForSpell, type SpellLink } from "@/lib/spell-link";

type PersSpellRowLike = { spellId?: unknown; spell?: { spellId?: unknown; engName?: unknown; ruleset?: unknown } | null };

export function getPersSpellId(persSpell: PersSpellRowLike | null | undefined): number | null {
  const spellId = Number(persSpell?.spellId ?? persSpell?.spell?.spellId);
  return Number.isFinite(spellId) ? spellId : null;
}

export function listCatalogSpellLinks(persSpells: PersSpellRowLike[]): SpellLink[] {
  return persSpells
    .map(getPersSpellId)
    .filter((spellId): spellId is number => spellId !== null && !isHomebrewCatalogId(spellId))
    .map((spellId) => buildPersSpellLink(persSpells, spellId));
}

/** Заклинання 2024 на листі відкривається за слагом: номер бази в каталозі 2024 не значить нічого. */
export function buildPersSpellLink(persSpells: PersSpellRowLike[], spellId: number): SpellLink {
  const spell = persSpells.find((ps) => getPersSpellId(ps) === spellId)?.spell;
  if (typeof spell?.engName !== "string") return { spellKey: String(spellId), ruleset: "RULES_2014" };
  return buildSpellLinkForSpell({
    spellId,
    engName: spell.engName,
    ruleset: spell.ruleset === "RULES_2024" ? "RULES_2024" : "RULES_2014",
  });
}
