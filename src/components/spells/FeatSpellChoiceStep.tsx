"use client";

import { useEffect, useMemo } from "react";
import { SpellChoiceGrid } from "@/components/spells/SpellChoiceGrid";
import { spellSchoolTranslations } from "@/lib/refs/translation";
import { listPickSpellLevels, type FeatSpellChoiceOffer, type FeatSpellChoicePick } from "@/rules/feat-spell-choices";
import type { SpellChoiceOption } from "@/rules/spell-choice-filter";

interface Props {
  featLabel: string;
  offer: FeatSpellChoiceOffer;
  selectedIds: readonly number[];
  onChange: (spellIds: number[]) => void;
  excludedSpellIds?: readonly number[];
  onCompleteChange?: (isComplete: boolean) => void;
}

/** KR31.5 — заклинання, які риса дає обрати гравцеві (Доторк феї, Посвячений у магію): і конструктор, і майстер підвищення. */
export function FeatSpellChoiceStep({ featLabel, offer, selectedIds, onChange, excludedSpellIds, onCompleteChange }: Props) {
  const picks = useMemo(() => withoutExcludedSpells(offer.picks, excludedSpellIds ?? []), [offer.picks, excludedSpellIds]);
  const chosenByPick = picks.map((pick) => keepPickSpells(pick, selectedIds));
  const isComplete = picks.every((pick, index) => chosenByPick[index].length === pick.count);

  useEffect(() => {
    onCompleteChange?.(isComplete);
  }, [isComplete, onCompleteChange]);

  const updatePick = (index: number, spellIds: number[]) => {
    onChange(picks.flatMap((_, pickIndex) => (pickIndex === index ? spellIds : chosenByPick[pickIndex])));
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-400">
        {featLabel}: {describePicks(picks)}. Обране завжди підготоване й не рахується в ліміті.
      </p>
      {picks.length === 1 ? (
        <PickGrid pick={picks[0]} selectedIds={chosenByPick[0]} onChange={(spellIds) => updatePick(0, spellIds)} />
      ) : (
        picks.map((pick, index) => (
          <section key={pick.spellLevel} aria-label={findPickTitle(pick)} className="space-y-3 rounded-2xl border border-white/10 p-4">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-lg font-semibold text-slate-100">{findPickTitle(pick)}</h3>
              <span className="text-sm text-slate-400">
                {chosenByPick[index].length} з {pick.count}
              </span>
            </div>
            <PickGrid pick={pick} selectedIds={chosenByPick[index]} onChange={(spellIds) => updatePick(index, spellIds)} />
          </section>
        ))
      )}
    </div>
  );
}

function PickGrid({ pick, selectedIds, onChange }: { pick: FeatSpellChoicePick; selectedIds: number[]; onChange: (spellIds: number[]) => void }) {
  const findGroupLabel = spansSpellLevels(pick) ? findLevelLabel : findSchoolLabel;
  return <SpellChoiceGrid spells={pick.spells} selectedIds={selectedIds} limit={pick.count} onChange={onChange} findGroupLabel={findGroupLabel} />;
}

function withoutExcludedSpells(picks: readonly FeatSpellChoicePick[], excludedSpellIds: readonly number[]): FeatSpellChoicePick[] {
  const excluded = new Set(excludedSpellIds);
  return picks.map((pick) => ({ ...pick, spells: pick.spells.filter((spell) => !excluded.has(spell.spellId)) }));
}

function keepPickSpells(pick: FeatSpellChoicePick, selectedIds: readonly number[]): number[] {
  const offered = new Set(pick.spells.map((spell) => spell.spellId));
  return selectedIds.filter((spellId) => offered.has(spellId)).slice(0, pick.count);
}

function describePicks(picks: readonly FeatSpellChoicePick[]): string {
  return picks.map((pick) => `${describePickLevels(pick)} — ${pick.count}`).join(", ");
}

function describePickLevels(pick: FeatSpellChoicePick): string {
  if (spansSpellLevels(pick)) return pick.spellLevel === 0 ? `замовлянь або заклинань до ${pick.maxSpellLevel}-го рівня` : `заклинань до ${pick.maxSpellLevel}-го рівня`;
  return pick.spellLevel === 0 ? "замовлянь" : `заклинань ${pick.spellLevel}-го рівня`;
}

function findPickTitle(pick: FeatSpellChoicePick): string {
  if (spansSpellLevels(pick)) return `Заклинання до ${pick.maxSpellLevel}-го рівня`;
  return pick.spellLevel === 0 ? "Замовляння" : `Заклинання ${pick.spellLevel}-го рівня`;
}

function spansSpellLevels(pick: FeatSpellChoicePick): boolean {
  return listPickSpellLevels(pick).length > 1;
}

function findLevelLabel(spell: SpellChoiceOption): string {
  return spell.level === 0 ? "Замовляння" : `${spell.level}-й рівень`;
}

function findSchoolLabel(spell: SpellChoiceOption): string {
  return spellSchoolTranslations[spell.school ?? ""] ?? "Інша школа";
}
