"use client";

import { useEffect, useMemo } from "react";
import clsx from "clsx";
import { Check, Info, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { spellSchoolTranslations } from "@/lib/refs/translation";
import { buildSpellLinkForSpell, openSpellLink } from "@/lib/spell-link";
import { usePersFormStore } from "@/lib/stores/persFormStore";
import type { FeatSpellChoiceOffer, FeatSpellOption } from "@/rules/feat-spell-choices";

interface Props {
  featLabel: string;
  offer: FeatSpellChoiceOffer;
  onNextDisabledChange?: (disabled: boolean) => void;
}

/** Риса дає обрати заклинання самому гравцеві: «Choose one level 1 spell from the Divination or Enchantment school». */
export function LevelUpFeatSpellStep({ featLabel, offer, onNextDisabledChange }: Props) {
  const { formData, updateFormData } = usePersFormStore();

  const selected = useMemo(() => {
    const offered = new Set(offer.spells.map((spell) => spell.spellId));
    return (formData.featSpellIds ?? []).filter((spellId) => offered.has(spellId));
  }, [formData.featSpellIds, offer.spells]);

  const spellsBySchool = useMemo(() => groupSpellsBySchool(offer.spells), [offer.spells]);

  useEffect(() => {
    onNextDisabledChange?.(selected.length !== offer.count);
  }, [selected.length, offer.count, onNextDisabledChange]);

  const toggleSpell = (spellId: number) => {
    if (selected.includes(spellId)) {
      updateFormData({ featSpellIds: selected.filter((id) => id !== spellId) });
      return;
    }
    const kept = offer.count === 1 ? [] : selected;
    if (kept.length >= offer.count) return;
    updateFormData({ featSpellIds: [...kept, spellId] });
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle>Заклинання риси</CardTitle>
        <p className="text-sm text-slate-400">
          {featLabel}: оберіть {offer.count} з {offer.spells.length}. Обране завжди підготоване й не рахується в ліміті.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {spellsBySchool.map(([school, spells]) => (
          <section key={school} aria-label={school}>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{school}</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {spells.map((spell) => (
                <FeatSpellOptionRow
                  key={spell.spellId}
                  spell={spell}
                  isSelected={selected.includes(spell.spellId)}
                  isDisabled={offer.count > 1 && !selected.includes(spell.spellId) && selected.length >= offer.count}
                  onToggle={toggleSpell}
                />
              ))}
            </div>
          </section>
        ))}
      </CardContent>
    </Card>
  );
}

function FeatSpellOptionRow({
  spell,
  isSelected,
  isDisabled,
  onToggle,
}: {
  spell: FeatSpellOption;
  isSelected: boolean;
  isDisabled: boolean;
  onToggle: (spellId: number) => void;
}) {
  return (
    <div
      className={clsx(
        "flex items-center gap-2 rounded-lg border transition",
        isSelected ? "border-violet-400/50 bg-violet-500/10" : "border-white/10 bg-white/5 hover:bg-white/10",
        isDisabled && "opacity-40",
      )}
    >
      <button
        type="button"
        onClick={() => onToggle(spell.spellId)}
        disabled={isDisabled}
        aria-pressed={isSelected}
        className="flex min-w-0 flex-1 items-center gap-3 p-3 text-left disabled:cursor-not-allowed"
      >
        <Sparkles className="h-4 w-4 shrink-0 text-violet-300" />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold text-slate-100">{spell.name}</span>
          <span className="block truncate text-xs text-slate-400">{spell.engName}</span>
        </span>
        {isSelected && <Check className="h-4 w-4 shrink-0 text-violet-300" />}
      </button>
      <button
        type="button"
        onClick={() => openSpellLink(buildSpellLinkForSpell({ ...spell, ruleset: "RULES_2024" }))}
        className="mr-2 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:text-violet-300"
        aria-label={`Опис: ${spell.name}`}
      >
        <Info className="h-4 w-4" />
      </button>
    </div>
  );
}

function groupSpellsBySchool(spells: readonly FeatSpellOption[]): Array<[string, FeatSpellOption[]]> {
  const groups = new Map<string, FeatSpellOption[]>();
  for (const spell of spells) {
    const school = spellSchoolTranslations[spell.school ?? ""] ?? "Інша школа";
    groups.set(school, [...(groups.get(school) ?? []), spell]);
  }
  return Array.from(groups.entries());
}

export default LevelUpFeatSpellStep;
