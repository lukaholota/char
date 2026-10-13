import grantedSpellFile from "../../../data/2014/subclass-granted-spells.json";
import { buildSpellSlug } from "@/lib/spell-link";
import type { AssemblyCatalog } from "./assembly-catalog";
import type { ClassProgress, StepContext } from "./progression-walk-types";

type GrantedSpellOwner = { classKey: string; subclassKey: string | null; classLevel: number };

export function listSubclassGrantedSpellKeys({ classKey, subclassKey, classLevel }: GrantedSpellOwner): string[] {
  const granted = grantedSpellFile.subclasses.find((entry) => entry.className === classKey && entry.subclass === subclassKey);
  return (granted?.spells ?? []).filter((spell) => spell.classLevel <= classLevel).map((spell) => buildSpellSlug(spell.engName));
}

export function listSubclassOptionGrantedSpellKeys({ classKey, optionNames, classLevel }: { classKey: string; optionNames: readonly string[]; classLevel: number }): string[] {
  return grantedSpellFile.options
    .filter((entry) => entry.className === classKey && optionNames.includes(entry.optionNameEng))
    .flatMap((entry) => entry.spells.filter((spell) => spell.classLevel <= classLevel).map((spell) => buildSpellSlug(spell.engName)));
}

export function listSubclassGrantedSpellIds(catalog: AssemblyCatalog, owner: GrantedSpellOwner): number[] {
  return listSubclassGrantedSpellKeys(owner).flatMap((key) => catalog.spellIdsByKey.get(key) ?? []);
}

export function rememberSubclassGrantedSpells({ env, state, progress, step }: StepContext): void {
  const owner = { classKey: step.classKey, subclassKey: progress.subclassKey, classLevel: step.classLevel };
  listSubclassGrantedSpellIds(env.catalog, owner).forEach((spellId) => state.takenSpellIds.add(spellId));
}

export function adoptOwnedSpellsIntoSubclass({ env, progress, step }: StepContext): void {
  const owner = { classKey: step.classKey, subclassKey: progress.subclassKey, classLevel: step.classLevel };
  listSubclassGrantedSpellIds(env.catalog, owner).forEach((spellId) => releaseClassSpellSlot(progress, spellId));
}

export function releaseClassSpellSlot(progress: ClassProgress, spellId: number): void {
  if (progress.ownedCantripIds.includes(spellId)) {
    progress.ownedCantripIds = progress.ownedCantripIds.filter((ownedId) => ownedId !== spellId);
    progress.ownedCantrips -= 1;
  }
  if (progress.ownedLeveledSpellIds.includes(spellId)) {
    progress.ownedLeveledSpellIds = progress.ownedLeveledSpellIds.filter((ownedId) => ownedId !== spellId);
    progress.ownedLeveledSpells -= 1;
  }
}
