import { findSelectionLimits, type ClassSpellOffer, type ClassSpellSelection } from "@/rules/class-spell-choices-2024";
import { isSwapStarted, type SpellSwap } from "@/rules/class-spell-swaps-2024";
import type { SpellChoiceOption } from "@/rules/spell-choice-filter";

export function keepOfferedSpells(selection: ClassSpellSelection, offer: ClassSpellOffer): ClassSpellSelection {
  const limits = findSelectionLimits(offer.quota, offer.catchUp, offer.canSkipPrepared);
  const cantrips = new Set(offer.cantrips.map((spell) => spell.spellId));
  const spells = new Set(offer.spells.map((spell) => spell.spellId));
  const spellbookIds = limits.spellbook.max ? selection.spellbookIds.filter((id) => spells.has(id)).slice(0, limits.spellbook.max) : [];
  const preparable = new Set(findPreparableSpells(offer, { ...selection, spellbookIds }).map((spell) => spell.spellId));

  return {
    cantripIds: selection.cantripIds.filter((id) => cantrips.has(id)).slice(0, limits.cantrips.max),
    spellbookIds,
    preparedIds: selection.preparedIds.filter((id) => preparable.has(id)).slice(0, limits.prepared.max),
    ...withSwap("cantripSwap", keepOfferedSwap(selection.cantripSwap, offer.swap?.droppableCantrips ?? [], cantrips)),
    ...withSwap("preparedSwap", keepOfferedSwap(selection.preparedSwap, offer.swap?.droppableSpells ?? [], spells)),
  };
}

function withSwap(key: "cantripSwap" | "preparedSwap", swap: SpellSwap | null): Partial<ClassSpellSelection> {
  return swap ? { [key]: swap } : {};
}

function keepOfferedSwap(swap: SpellSwap | null | undefined, droppable: SpellChoiceOption[], candidateIds: Set<number>): SpellSwap | null {
  if (!isSwapStarted(swap)) return null;
  const dropId = droppable.some((spell) => spell.spellId === swap.dropId) ? swap.dropId : null;
  const addId = dropId !== null && swap.addId !== null && candidateIds.has(swap.addId) ? swap.addId : null;
  return dropId === null ? null : { dropId, addId };
}

export function findPreparableSpells(offer: ClassSpellOffer, selection: ClassSpellSelection): SpellChoiceOption[] {
  if (offer.quota.spellbook === 0 && offer.bookSpells.length === 0) return offer.spells;
  const book = new Set(selection.spellbookIds);
  const bookOnly = new Set(offer.bookOnlySpellIds);
  return [...offer.bookSpells, ...offer.spells.filter((spell) => book.has(spell.spellId) && !bookOnly.has(spell.spellId))];
}
