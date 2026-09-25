"use client";

import { useEffect, useState } from "react";
import { getLevelUpFeatSpellGrowthOffer, getLevelUpFeatSpellOffer, getLevelUpSpellOffer } from "@/lib/actions/levelup";
import type { ClassSpellOffer } from "@/rules/class-spell-choices-2024";
import type { FeatSpellChoiceOffer, FeatSpellGrowthOffer } from "@/rules/feat-spell-choices";

/** Список кроку «Заклинання» залежить від класу, підкласу й орденів цього ж підвищення, тож береться з сервера наживо. */
export function useLevelUpFeatSpellOffer(input: {
  persId: number | undefined;
  hasSpellChoice: boolean;
  featId: number | undefined;
  featChoiceSelections: Record<string, number | number[]> | undefined;
}): FeatSpellChoiceOffer | null {
  const [offer, setOffer] = useState<FeatSpellChoiceOffer | null>(null);
  const optionKey = joinOptionIds(input.featChoiceSelections);
  const { persId, hasSpellChoice, featId } = input;

  useEffect(() => {
    if (!persId || !hasSpellChoice || !featId) return;
    let isCurrent = true;
    getLevelUpFeatSpellOffer(persId, featId, optionKey ? optionKey.split(",").map(Number) : []).then((loaded) => {
      if (isCurrent) setOffer(loaded);
    });
    return () => {
      isCurrent = false;
    };
  }, [persId, hasSpellChoice, featId, optionKey]);

  return hasSpellChoice && featId ? offer : null;
}

export function withoutSpells(offer: ClassSpellOffer, spellIds: readonly number[]): ClassSpellOffer {
  const excluded = new Set(spellIds);
  const keep = (spell: { spellId: number }) => !excluded.has(spell.spellId);
  return { ...offer, cantrips: offer.cantrips.filter(keep), spells: offer.spells.filter(keep), bookSpells: offer.bookSpells.filter(keep) };
}

function splitOptionKey(optionKey: string): number[] {
  return optionKey ? optionKey.split(",").map(Number) : [];
}

function joinOptionIds(selections: Record<string, number | number[]> | undefined): string {
  return Object.values(selections ?? {})
    .flat()
    .map(Number)
    .filter((id) => Number.isInteger(id) && id > 0)
    .sort((a, b) => a - b)
    .join(",");
}

export function useLevelUpSpellOffer(input: {
  persId: number | undefined;
  classId: number | undefined;
  subclassId: number | null;
  classChoiceSelections: Record<string, number | number[]> | undefined;
  subclassChoiceSelections: Record<string, number | number[]> | undefined;
}): ClassSpellOffer | null {
  const [offer, setOffer] = useState<ClassSpellOffer | null>(null);
  const optionKey = joinOptionIds(input.classChoiceSelections);
  const subclassOptionKey = joinOptionIds(input.subclassChoiceSelections);
  const { persId, classId, subclassId } = input;

  useEffect(() => {
    if (!persId || !classId) return;
    let isCurrent = true;
    getLevelUpSpellOffer(persId, classId, subclassId, splitOptionKey(optionKey), splitOptionKey(subclassOptionKey)).then((loaded) => {
      if (isCurrent) setOffer(loaded);
    });
    return () => {
      isCurrent = false;
    };
  }, [persId, classId, subclassId, optionKey, subclassOptionKey]);

  return classId ? offer : null;
}

/** Ritual Caster, узятий раніше: на рівні з більшим бонусом майстерності сервер дає ще порцію. */
export function useLevelUpFeatSpellGrowthOffer(persId: number | undefined, isRules2024: boolean): FeatSpellGrowthOffer | null {
  const [growth, setGrowth] = useState<FeatSpellGrowthOffer | null>(null);

  useEffect(() => {
    if (!persId || !isRules2024) return;
    let isCurrent = true;
    getLevelUpFeatSpellGrowthOffer(persId).then((loaded) => {
      if (isCurrent) setGrowth(loaded);
    });
    return () => {
      isCurrent = false;
    };
  }, [persId, isRules2024]);

  return isRules2024 ? growth : null;
}
